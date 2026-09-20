-- =====================================================================
-- Sprint 27: Course purchases & AI credits
--
-- Extends 20260808000000_payments_subscriptions.sql (subscription_plans/
-- subscriptions/payments/invoices/coupons/payment_webhook_events, already
-- live) with the two concepts that schema didn't cover: one-time course
-- purchases and a metered AI-credits wallet. Both reuse `payments` as the
-- shared transaction ledger (payments.subscription_id is already nullable,
-- so a course/credit-pack purchase is just a payments row with no
-- subscription attached) rather than inventing a second ledger.
--
-- Courses are a commerce layer only (catalog + purchase + access check),
-- not an LMS — content is an external video_url, matching this app's
-- existing convention of never hosting video itself.
--
-- AI credits use a SECURITY DEFINER function for spend (not a plain
-- read-then-write from server code) so concurrent spends can't race past
-- a zero balance — same atomicity concern, different mechanism, as this
-- codebase's has_college_role/has_company_role SECURITY DEFINER pattern.
-- =====================================================================

-- ---------------------------------------------------------------------
-- courses / course_purchases
-- ---------------------------------------------------------------------
create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  description text,
  price_cents integer not null,
  currency text not null default 'INR',
  video_url text,
  thumbnail_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists course_purchases (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  payment_id uuid references payments (id) on delete set null,
  purchased_at timestamptz not null default now(),
  unique (course_id, profile_id)
);

create index if not exists course_purchases_profile_idx on course_purchases (profile_id);

-- ---------------------------------------------------------------------
-- credit_packs / ai_credit_balances / ai_credit_transactions
-- ---------------------------------------------------------------------
create table if not exists credit_packs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  credits integer not null,
  price_cents integer not null,
  currency text not null default 'INR',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists ai_credit_balances (
  profile_id uuid primary key references profiles (id) on delete cascade,
  balance integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table ai_credit_balances drop constraint if exists ai_credit_balances_balance_check;
alter table ai_credit_balances add constraint ai_credit_balances_balance_check
  check (balance >= 0);

create table if not exists ai_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  delta integer not null,
  reason text not null,
  reference_type text,
  reference_id uuid,
  balance_after integer not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_credit_transactions_profile_idx
  on ai_credit_transactions (profile_id, created_at desc);

-- ---------------------------------------------------------------------
-- Atomic spend/grant functions — SECURITY DEFINER so the row lock +
-- balance check + decrement + ledger insert happen as one privileged,
-- race-safe unit regardless of caller. Never exposed to write RLS
-- directly; called only via supabase.rpc() from server code.
-- ---------------------------------------------------------------------
create or replace function public.consume_ai_credits(
  p_profile_id uuid,
  p_amount integer,
  p_reason text,
  p_reference_type text default null,
  p_reference_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  -- auth.uid() is null when called via the service-role/admin client
  -- (trusted server code); when called by a real authenticated user (the
  -- ai-chat.server.ts reference integration), they may only spend their
  -- own balance, never an arbitrary p_profile_id.
  if auth.uid() is not null and auth.uid() <> p_profile_id then
    raise exception 'Not authorized to spend credits for another profile.';
  end if;

  insert into ai_credit_balances (profile_id, balance)
    values (p_profile_id, 0)
    on conflict (profile_id) do nothing;

  select balance into v_balance from ai_credit_balances
    where profile_id = p_profile_id
    for update;

  if v_balance < p_amount then
    return false;
  end if;

  update ai_credit_balances
    set balance = balance - p_amount, updated_at = now()
    where profile_id = p_profile_id;

  insert into ai_credit_transactions (profile_id, delta, reason, reference_type, reference_id, balance_after)
    values (p_profile_id, -p_amount, p_reason, p_reference_type, p_reference_id, v_balance - p_amount);

  return true;
end;
$$;

create or replace function public.grant_ai_credits(
  p_profile_id uuid,
  p_amount integer,
  p_reason text,
  p_reference_type text default null,
  p_reference_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance integer;
begin
  -- Only server code (service-role/admin client, auth.uid() null) or a
  -- platform admin may grant credits — never a plain authenticated user
  -- granting themselves free credits.
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Not authorized to grant credits.';
  end if;

  insert into ai_credit_balances (profile_id, balance)
    values (p_profile_id, p_amount)
    on conflict (profile_id) do update
      set balance = ai_credit_balances.balance + excluded.balance, updated_at = now()
    returning balance into v_new_balance;

  insert into ai_credit_transactions (profile_id, delta, reason, reference_type, reference_id, balance_after)
    values (p_profile_id, p_amount, p_reason, p_reference_type, p_reference_id, v_new_balance);

  return v_new_balance;
end;
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table courses enable row level security;
alter table course_purchases enable row level security;
alter table credit_packs enable row level security;
alter table ai_credit_balances enable row level security;
alter table ai_credit_transactions enable row level security;

drop policy if exists courses_authenticated_select on courses;
create policy courses_authenticated_select on courses for select to authenticated
  using (is_active = true or public.is_admin());
drop policy if exists courses_admin_write on courses;
create policy courses_admin_write on courses for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- No insert/update/delete policy for authenticated: purchases are written
-- only by payments.server.ts via the admin client, same reasoning as
-- subscriptions/payments in the prior migration.
drop policy if exists course_purchases_visible on course_purchases;
create policy course_purchases_visible on course_purchases for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());

drop policy if exists credit_packs_authenticated_select on credit_packs;
create policy credit_packs_authenticated_select on credit_packs for select to authenticated
  using (is_active = true or public.is_admin());
drop policy if exists credit_packs_admin_write on credit_packs;
create policy credit_packs_admin_write on credit_packs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- No write policy for authenticated: balance only ever changes via the
-- consume_ai_credits/grant_ai_credits SECURITY DEFINER functions above.
drop policy if exists ai_credit_balances_visible on ai_credit_balances;
create policy ai_credit_balances_visible on ai_credit_balances for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());

drop policy if exists ai_credit_transactions_visible on ai_credit_transactions;
create policy ai_credit_transactions_visible on ai_credit_transactions for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------
-- Seed starter courses + credit packs (idempotent). video_url is left
-- null — no real video content exists yet; an admin adds the real link
-- via `courses_admin_write` once content is ready, rather than seeding a
-- placeholder URL that would misleadingly look like real content.
-- ---------------------------------------------------------------------
insert into courses (title, description, price_cents, currency, is_active, sort_order)
values
  ('DSA Interview Crash Course', 'A focused walkthrough of the data structures and algorithms patterns that come up most in technical interviews.', 149900, 'INR', true, 0),
  ('System Design Fundamentals', 'Core system design concepts — scaling, caching, databases, and how to structure an interview answer.', 199900, 'INR', true, 1),
  ('Resume & LinkedIn Masterclass', 'Turn your resume and LinkedIn profile into something recruiters actually respond to.', 99900, 'INR', true, 2)
on conflict (title) do nothing;

insert into credit_packs (code, name, credits, price_cents, currency, sort_order)
values
  ('credits_50', '50 AI Credits', 50, 9900, 'INR', 0),
  ('credits_200', '200 AI Credits', 200, 29900, 'INR', 1),
  ('credits_500', '500 AI Credits', 500, 59900, 'INR', 2)
on conflict (code) do update set
  name = excluded.name,
  credits = excluded.credits,
  price_cents = excluded.price_cents,
  currency = excluded.currency,
  sort_order = excluded.sort_order;
