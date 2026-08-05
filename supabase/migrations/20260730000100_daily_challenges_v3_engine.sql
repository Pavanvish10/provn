-- =====================================================================
-- Daily Challenges v3 — the single global daily challenge.
--
-- Replaces the user-picked-topics "session" model as the primary Daily
-- Challenges experience: every user gets the exact same challenge each
-- day, rotating through the active question bank without repeats until
-- it's exhausted, then wrapping around (least-recently-used first).
--
-- The old `daily_challenge_sessions` / `daily_session_topics` /
-- `daily_session_questions` tables and their trigger bookkeeping are left
-- untouched (no data loss) but are no longer driven by the new UI.
-- =====================================================================

create table if not exists daily_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge_date date not null unique,
  challenge_id uuid not null references challenges (id),
  created_at timestamptz not null default now()
);
create index if not exists daily_challenges_date_idx on daily_challenges (challenge_date desc);

alter table daily_challenges enable row level security;
drop policy if exists daily_challenges_select_all on daily_challenges;
create policy daily_challenges_select_all on daily_challenges for select to authenticated using (true);
-- No insert/update/delete policy: rows are only ever written by
-- get_or_assign_daily_challenge() below, which runs as security definer.

-- Idempotent: calling this multiple times on the same day always returns
-- the same challenge. Picks the least-recently-used active challenge
-- (nulls, i.e. never used, first) so every challenge in the pool gets used
-- once before any repeats — a natural round-robin with no separate
-- "cycle" bookkeeping needed.
create or replace function public.get_or_assign_daily_challenge(p_date date default current_date)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_challenge_id uuid;
begin
  select challenge_id into v_challenge_id from daily_challenges where challenge_date = p_date;
  if v_challenge_id is not null then
    return v_challenge_id;
  end if;

  select id into v_challenge_id from challenges
  where is_active = true and question_format = 'coding'
  order by last_daily_used_at asc nulls first, random()
  limit 1;

  if v_challenge_id is null then
    return null;
  end if;

  insert into daily_challenges (challenge_date, challenge_id)
  values (p_date, v_challenge_id)
  on conflict (challenge_date) do nothing;

  update challenges set last_daily_used_at = p_date where id = v_challenge_id;

  select challenge_id into v_challenge_id from daily_challenges where challenge_date = p_date;
  return v_challenge_id;
end;
$$;

grant execute on function public.get_or_assign_daily_challenge(date) to authenticated;
