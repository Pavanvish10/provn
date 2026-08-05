-- =====================================================================
-- Real streak system for Daily Challenges.
--
-- Rules: a streak day is only earned once a profile has solved (first
-- `passed` submission of) at least 2 DISTINCT challenges on the same
-- calendar day, from the user's own local-timezone perspective. Solving
-- a 3rd+ challenge that day does not bump the streak further. Missing a
-- day (not reaching 2 solves) breaks the streak back to 0.
--
-- This intentionally replaces the old "streak" semantics on `profiles`
-- (which used to bump on ANY first XP event of the day, via award_xp()
-- in 20260729000000_challenges_v2.sql) with new, purpose-built columns —
-- `streak`/`longest_streak`/`last_activity_date` are left in place
-- (still used for XP/level bookkeeping elsewhere) but are no longer
-- surfaced as "the streak" in the UI.
--
-- "Local timezone" is handled by having the CLIENT tell the server what
-- calendar date it is from the user's perspective (`local_date`, sent
-- with every submission and every progress read) rather than storing an
-- IANA timezone per profile. This is a deliberate simplification: it's a
-- gamification feature, not a security boundary, so trusting the
-- client's own clock for date-bucketing is an acceptable tradeoff and
-- avoids a much larger timezone-storage project.
-- =====================================================================

alter table profiles
  add column if not exists daily_streak_current int not null default 0,
  add column if not exists daily_streak_highest int not null default 0,
  add column if not exists daily_streak_last_date date,
  add column if not exists daily_solved_today int not null default 0,
  add column if not exists daily_challenges_total_solved int not null default 0;

alter table challenge_submissions add column if not exists local_date date;

-- One row per (profile, local calendar day, challenge) the profile has
-- ever gotten an Accepted submission for. The unique constraint is what
-- makes re-submitting an already-solved-today challenge a no-op instead
-- of inflating "today's" count — duplicate submissions can't increase it.
create table if not exists profile_daily_solves (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  local_date date not null,
  challenge_id uuid not null references challenges (id) on delete cascade,
  submission_id uuid references challenge_submissions (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (profile_id, local_date, challenge_id)
);
create index if not exists profile_daily_solves_profile_date_idx
  on profile_daily_solves (profile_id, local_date);

alter table profile_daily_solves enable row level security;
drop policy if exists profile_daily_solves_owner_select on profile_daily_solves;
create policy profile_daily_solves_owner_select on profile_daily_solves for select
  to authenticated using (profile_id = auth.uid() or public.is_admin());
-- No client insert/update policy: only written by the trigger below
-- (security definer), same pattern as daily_challenge_completions.

create or replace function public.record_daily_challenge_solve()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_local_date date := coalesce(new.local_date, current_date);
  v_inserted_id uuid;
  v_today_count int;
  v_last_date date;
  v_streak int;
begin
  -- Only Accepted submissions count, and only on the transition INTO
  -- 'passed' (matches the existing on_challenge_submission_passed guard)
  -- so retrying/re-viewing an already-passed submission never re-fires.
  if new.status <> 'passed' or (tg_op = 'UPDATE' and old.status = 'passed') then
    return new;
  end if;

  insert into profile_daily_solves (profile_id, local_date, challenge_id, submission_id)
  values (new.profile_id, v_local_date, new.challenge_id, new.id)
  on conflict (profile_id, local_date, challenge_id) do nothing
  returning id into v_inserted_id;

  -- Same challenge already recorded for this local day (duplicate
  -- submission, e.g. re-submitting after already passing) — ignore.
  if v_inserted_id is null then
    return new;
  end if;

  update profiles set daily_challenges_total_solved = daily_challenges_total_solved + 1
  where id = new.profile_id;

  select count(*) into v_today_count
  from profile_daily_solves
  where profile_id = new.profile_id and local_date = v_local_date;

  select daily_streak_current, daily_streak_last_date into v_streak, v_last_date
  from profiles where id = new.profile_id;

  if v_today_count = 2 then
    -- Goal just met for this day (this insert was the 2nd distinct
    -- challenge) — bump the streak exactly once for this day.
    if v_last_date = v_local_date - 1 then
      v_streak := v_streak + 1;
    else
      v_streak := 1;
    end if;
    update profiles
    set daily_streak_current = v_streak,
        daily_streak_highest = greatest(daily_streak_highest, v_streak),
        daily_streak_last_date = v_local_date,
        daily_solved_today = v_today_count
    where id = new.profile_id;
  else
    -- 1st solve of the day, or 3rd+: no streak change, just keep the
    -- cached display counter in sync.
    update profiles set daily_solved_today = v_today_count where id = new.profile_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_record_daily_challenge_solve on challenge_submissions;
create trigger trg_record_daily_challenge_solve
  after insert or update on challenge_submissions
  for each row execute function public.record_daily_challenge_solve();

-- Authoritative read: `daily_streak_current` on the profile row can be
-- stale (it's only corrected the next time the user solves something),
-- so a missed day is reflected here immediately rather than waiting for
-- their next solve to notice the gap. solved_today is computed live from
-- profile_daily_solves for the given local date, so it's always exactly
-- right (and implicitly "resets" at local midnight: a new date just has
-- no rows yet).
create or replace function public.get_my_daily_progress(p_local_date date default current_date)
returns table(solved_today int, current_streak int, highest_streak int, total_solved int)
language sql
security definer
set search_path = public
stable
as $$
  select
    (select count(*)::int from profile_daily_solves
      where profile_id = auth.uid() and local_date = p_local_date),
    case
      when p.daily_streak_last_date is null then 0
      when p.daily_streak_last_date >= p_local_date - 1 then p.daily_streak_current
      else 0
    end,
    p.daily_streak_highest,
    p.daily_challenges_total_solved
  from profiles p where p.id = auth.uid();
$$;
