-- ===========================================================================
-- Sprint 27: Payments & Subscription System
--
-- Why new tables instead of extending `premium_subscriptions`: that table
-- (added in 20260727000200_companies_jobs_admin.sql) is a single-row
-- entitlement flag per profile ("is this person premium right now") with no
-- concept of a plan catalog, payment history, invoices, coupons, or
-- multi-seat recruiter billing. This sprint adds a real billing system
-- (subscription_plans/subscriptions/payments/invoices/coupons/
-- coupon_redemptions/payment_webhook_events) covering both student premium
-- plans and recruiter/company subscriptions, and keeps `premium_subscriptions`
-- in sync via a trigger below so every existing call site that already reads
-- it (usePremiumStatus, is_premium(), admin.premium.tsx) keeps working
-- unmodified.
-- ===========================================================================

-- ---------------------------------------------------------------------
-- subscription_plans — the plan catalog (seeded below)
-- ---------------------------------------------------------------------
create table if not exists subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  audience text not null,
  price_cents integer not null default 0,
  currency text not null default 'INR',
  billing_interval text not null default 'month',
  seat_count integer not null default 1,
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  stripe_price_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table subscription_plans drop constraint if exists subscription_plans_audience_check;
alter table subscription_plans add constraint subscription_plans_audience_check
  check (audience in ('student', 'recruiter'));

alter table subscription_plans drop constraint if exists subscription_plans_billing_interval_check;
alter table subscription_plans add constraint subscription_plans_billing_interval_check
  check (billing_interval in ('month', 'year'));

create index if not exists subscription_plans_audience_idx on subscription_plans (audience);

-- ---------------------------------------------------------------------
-- subscriptions — one row per active/historical subscription.
-- `profile_id` is always the billing owner (the person who manages
-- billing); `company_id` is set additionally for recruiter/company plans
-- so seats and billing are shared across the company's members.
-- ---------------------------------------------------------------------
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  company_id uuid references companies (id) on delete cascade,
  plan_id uuid not null references subscription_plans (id),
  status text not null default 'active',
  seats integer not null default 1,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  payment_provider text not null default 'mock',
  provider_customer_id text,
  provider_subscription_id text,
  coupon_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table subscriptions drop constraint if exists subscriptions_status_check;
alter table subscriptions add constraint subscriptions_status_check
  check (status in ('trialing', 'active', 'past_due', 'canceled', 'expired'));

alter table subscriptions drop constraint if exists subscriptions_payment_provider_check;
alter table subscriptions add constraint subscriptions_payment_provider_check
  check (payment_provider in ('mock', 'stripe'));

create index if not exists subscriptions_profile_id_idx on subscriptions (profile_id);
create index if not exists subscriptions_company_id_idx on subscriptions (company_id);
create index if not exists subscriptions_plan_id_idx on subscriptions (plan_id);

-- Only one active (trialing/active/past_due) subscription per student /
-- per company at a time — new subscriptions must supersede the old one.
create unique index if not exists subscriptions_one_active_per_profile
  on subscriptions (profile_id)
  where company_id is null and status in ('trialing', 'active', 'past_due');
create unique index if not exists subscriptions_one_active_per_company
  on subscriptions (company_id)
  where company_id is not null and status in ('trialing', 'active', 'past_due');

-- ---------------------------------------------------------------------
-- payments — one row per payment attempt (mock or Stripe)
-- ---------------------------------------------------------------------
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references subscriptions (id) on delete set null,
  profile_id uuid not null references profiles (id) on delete cascade,
  company_id uuid references companies (id) on delete cascade,
  plan_id uuid references subscription_plans (id) on delete set null,
  amount_cents integer not null,
  currency text not null default 'INR',
  status text not null default 'succeeded',
  provider text not null default 'mock',
  provider_payment_id text,
  coupon_id uuid,
  description text,
  created_at timestamptz not null default now()
);

alter table payments drop constraint if exists payments_status_check;
alter table payments add constraint payments_status_check
  check (status in ('pending', 'succeeded', 'failed', 'refunded'));

alter table payments drop constraint if exists payments_provider_check;
alter table payments add constraint payments_provider_check
  check (provider in ('mock', 'stripe'));

create index if not exists payments_profile_id_idx on payments (profile_id);
create index if not exists payments_company_id_idx on payments (company_id);
create index if not exists payments_subscription_id_idx on payments (subscription_id);

-- ---------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references payments (id) on delete set null,
  subscription_id uuid references subscriptions (id) on delete set null,
  profile_id uuid not null references profiles (id) on delete cascade,
  company_id uuid references companies (id) on delete cascade,
  invoice_number text not null unique,
  amount_cents integer not null,
  currency text not null default 'INR',
  status text not null default 'paid',
  line_items jsonb not null default '[]'::jsonb,
  issued_at timestamptz not null default now(),
  due_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table invoices drop constraint if exists invoices_status_check;
alter table invoices add constraint invoices_status_check
  check (status in ('draft', 'open', 'paid', 'void', 'uncollectible'));

create index if not exists invoices_profile_id_idx on invoices (profile_id);
create index if not exists invoices_company_id_idx on invoices (company_id);
create index if not exists invoices_subscription_id_idx on invoices (subscription_id);

-- Backing sequence for human-readable invoice numbers (INV-2026-000001).
create sequence if not exists invoice_number_seq;

create or replace function public.generate_invoice_number()
returns text
language sql
as $$
  select 'INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('invoice_number_seq')::text, 6, '0');
$$;

-- ---------------------------------------------------------------------
-- coupons + coupon_redemptions
-- ---------------------------------------------------------------------
create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  discount_type text not null,
  discount_value integer not null,
  applicable_plans text[] not null default '{}'::text[],
  max_redemptions integer,
  redemption_count integer not null default 0,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  is_active boolean not null default true,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table coupons drop constraint if exists coupons_discount_type_check;
alter table coupons add constraint coupons_discount_type_check
  check (discount_type in ('percent', 'fixed'));

create table if not exists coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references coupons (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  subscription_id uuid references subscriptions (id) on delete set null,
  payment_id uuid references payments (id) on delete set null,
  redeemed_at timestamptz not null default now(),
  unique (coupon_id, profile_id)
);

create index if not exists coupon_redemptions_coupon_id_idx on coupon_redemptions (coupon_id);

alter table subscriptions
  add constraint subscriptions_coupon_id_fkey foreign key (coupon_id) references coupons (id) on delete set null;
alter table payments
  add constraint payments_coupon_id_fkey foreign key (coupon_id) references coupons (id) on delete set null;

-- ---------------------------------------------------------------------
-- payment_webhook_events — raw event log for idempotency + auditability
-- ---------------------------------------------------------------------
create table if not exists payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'stripe',
  event_id text not null unique,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processed boolean not null default false,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists payment_webhook_events_event_type_idx on payment_webhook_events (event_type);

-- ---------------------------------------------------------------------
-- Widen notifications.type for billing events (same idempotent
-- drop/re-add pattern used by every prior sprint that added a type).
-- ---------------------------------------------------------------------
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in (
    'like', 'comment', 'friend_request', 'friend_accept', 'message',
    'resume_analysis', 'coding_test', 'mock_interview', 'challenge_completion',
    'job_update', 'profile_update', 'system', 'job_invite', 'interview', 'company_post',
    'drive_update', 'billing_update'
  ));

-- ---------------------------------------------------------------------
-- Trigger: keep the legacy `premium_subscriptions` entitlement row in
-- sync for student subscriptions, and notify the billing owner on
-- meaningful status changes. Uses a null actor_id (system-generated
-- event, no human actor) rather than passing profile_id as both
-- recipient and actor — create_notification() silently no-ops when
-- recipient = actor (the exact bug fixed in Sprint 25's
-- on_job_application_status_change), so null is used deliberately here.
-- ---------------------------------------------------------------------
create or replace function public.on_subscription_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan record;
  v_message text;
begin
  select code, audience, name into v_plan from subscription_plans where id = new.plan_id;

  if v_plan.audience = 'student' then
    insert into premium_subscriptions (
      profile_id, plan, status, current_period_end, payment_provider, external_reference, updated_at
    )
    values (
      new.profile_id,
      case when v_plan.code = 'free' then 'free' else 'premium' end,
      case when new.status in ('active', 'trialing', 'past_due') then 'active' else 'canceled' end,
      new.current_period_end,
      new.payment_provider,
      new.id::text,
      now()
    )
    on conflict (profile_id) do update set
      plan = excluded.plan,
      status = excluded.status,
      current_period_end = excluded.current_period_end,
      payment_provider = excluded.payment_provider,
      external_reference = excluded.external_reference,
      updated_at = now();
  end if;

  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and old.status is distinct from new.status) then
    v_message := case new.status
      when 'active' then 'Your ' || coalesce(v_plan.name, 'plan') || ' subscription is now active.'
      when 'trialing' then 'Your trial of ' || coalesce(v_plan.name, 'the plan') || ' has started.'
      when 'canceled' then 'Your subscription has been canceled.'
      when 'past_due' then 'Your last payment failed — please update your billing details.'
      when 'expired' then 'Your subscription has expired.'
      else 'Your subscription status changed to ' || new.status || '.'
    end;
    perform public.create_notification(new.profile_id, null, 'billing_update', v_message, 'subscription', new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_subscription_status_change on subscriptions;
create trigger trg_subscription_status_change
  after insert or update on subscriptions
  for each row execute function public.on_subscription_status_change();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table subscription_plans enable row level security;
alter table subscriptions enable row level security;
alter table payments enable row level security;
alter table invoices enable row level security;
alter table coupons enable row level security;
alter table coupon_redemptions enable row level security;
alter table payment_webhook_events enable row level security;

-- Plan catalog is readable by any signed-in user (pricing page); only
-- admins can write it directly (seeding/admin tooling uses the service role).
drop policy if exists subscription_plans_authenticated_select on subscription_plans;
create policy subscription_plans_authenticated_select on subscription_plans for select to authenticated
  using (is_active = true or public.is_admin());
drop policy if exists subscription_plans_admin_write on subscription_plans;
create policy subscription_plans_admin_write on subscription_plans for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Subscriptions/payments/invoices: readers are the billing owner, company
-- owners/admins (for recruiter subscriptions), or platform admins. All
-- writes go through server functions using the admin client (payment
-- state must never be mutated directly from the browser), so there are
-- deliberately no insert/update/delete policies for `authenticated` here.
drop policy if exists subscriptions_visible on subscriptions;
create policy subscriptions_visible on subscriptions for select to authenticated
  using (
    profile_id = auth.uid()
    or (company_id is not null and public.has_company_role(company_id, array['owner', 'admin']))
    or public.is_admin()
  );

drop policy if exists payments_visible on payments;
create policy payments_visible on payments for select to authenticated
  using (
    profile_id = auth.uid()
    or (company_id is not null and public.has_company_role(company_id, array['owner', 'admin']))
    or public.is_admin()
  );

drop policy if exists invoices_visible on invoices;
create policy invoices_visible on invoices for select to authenticated
  using (
    profile_id = auth.uid()
    or (company_id is not null and public.has_company_role(company_id, array['owner', 'admin']))
    or public.is_admin()
  );

-- Coupons are validated server-side only (avoids leaking discount codes /
-- terms to the client); only admins can browse the coupon table directly.
drop policy if exists coupons_admin_all on coupons;
create policy coupons_admin_all on coupons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists coupon_redemptions_visible on coupon_redemptions;
create policy coupon_redemptions_visible on coupon_redemptions for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());

drop policy if exists payment_webhook_events_admin_all on payment_webhook_events;
create policy payment_webhook_events_admin_all on payment_webhook_events for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Seed starter plans (idempotent upsert by code)
-- ---------------------------------------------------------------------
insert into subscription_plans (code, name, audience, price_cents, currency, billing_interval, seat_count, features, sort_order)
values
  ('free', 'Free', 'student', 0, 'INR', 'month', 1,
    '["Daily coding challenges","2 AI mock interviews","2 coding tests","2 ATS / resume analyses","AI roadmap (no video lectures)"]'::jsonb, 0),
  ('pro_student', 'Pro Student', 'student', 29900, 'INR', 'month', 1,
    '["Daily coding challenges","Unlimited AI mock interviews","Unlimited coding tests","ATS rating & resume AI analysis","Full AI roadmap with video lectures"]'::jsonb, 1),
  ('pro_plus', 'Pro+', 'student', 59900, 'INR', 'month', 1,
    '["Everything in Pro Student","Priority interview scheduling","1:1 AI mentor sessions","Verified badge on profile","Early access to new features"]'::jsonb, 2),
  ('recruiter_basic', 'Recruiter Basic', 'recruiter', 199900, 'INR', 'month', 3,
    '["Up to 3 active job postings","Applicant tracking & pipeline","AI match scoring","3 recruiter seats"]'::jsonb, 3),
  ('recruiter_growth', 'Recruiter Growth', 'recruiter', 499900, 'INR', 'month', 10,
    '["Unlimited job postings","Best Matching Students recommendations","Advanced analytics & exports","Priority verified badge review","10 recruiter seats","Priority support"]'::jsonb, 4)
on conflict (code) do update set
  name = excluded.name,
  audience = excluded.audience,
  price_cents = excluded.price_cents,
  currency = excluded.currency,
  billing_interval = excluded.billing_interval,
  seat_count = excluded.seat_count,
  features = excluded.features,
  sort_order = excluded.sort_order,
  updated_at = now();
