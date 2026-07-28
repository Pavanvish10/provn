-- =====================================================================
-- PROVN Daily Challenges v2: topic-selection flow, session-based daily
-- goals, XP tiers + bonuses, coins, badges, streak history/heatmap,
-- hints/editorial, discussions, and richer submission tracking.
-- =====================================================================

-- ---------------------------------------------------------------------
-- New topic categories (additive; existing 29 untouched)
-- ---------------------------------------------------------------------
insert into challenge_categories (name, slug) values
  ('Greedy', 'greedy'),
  ('Recursion', 'recursion'),
  ('Backtracking', 'backtracking'),
  ('Hash Maps', 'hash-maps'),
  ('Stacks', 'stacks'),
  ('Queues', 'queues'),
  ('Binary Search', 'binary-search'),
  ('Sliding Window', 'sliding-window'),
  ('Two Pointers', 'two-pointers'),
  ('Artificial Intelligence', 'artificial-intelligence')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- profiles: coins + longest streak (current streak/xp already existed)
-- ---------------------------------------------------------------------
alter table profiles
  add column if not exists coins int not null default 0,
  add column if not exists longest_streak int not null default 0;

-- ---------------------------------------------------------------------
-- challenges: hints (progressive), editorial (shown after solving)
-- ---------------------------------------------------------------------
alter table challenges
  add column if not exists hints jsonb not null default '[]'::jsonb,
  add column if not exists editorial text;

-- ---------------------------------------------------------------------
-- challenge_submissions: time spent + whether a hint was used (both feed
-- bonus-XP eligibility)
-- ---------------------------------------------------------------------
alter table challenge_submissions
  add column if not exists time_taken_seconds int,
  add column if not exists hint_used boolean not null default false;

-- ---------------------------------------------------------------------
-- Daily activity log: one row per user per day they did something —
-- the source of truth for the calendar heatmap and for accurately
-- computing longest/weekly/monthly streaks (rather than fragile counters).
-- ---------------------------------------------------------------------
create table if not exists daily_activity (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  activity_date date not null default current_date,
  challenges_solved int not null default 0,
  xp_earned int not null default 0,
  unique (profile_id, activity_date)
);
create index if not exists daily_activity_profile_idx on daily_activity (profile_id, activity_date desc);

-- ---------------------------------------------------------------------
-- Coin ledger (mirrors xp_events)
-- ---------------------------------------------------------------------
create table if not exists coin_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  amount int not null,
  reason text not null,
  created_at timestamptz not null default now()
);
create index if not exists coin_events_profile_idx on coin_events (profile_id, created_at desc);

create or replace function public.award_coins(p_profile_id uuid, p_amount int, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into coin_events (profile_id, amount, reason) values (p_profile_id, p_amount, p_reason);
  update profiles set coins = coins + p_amount, updated_at = now() where id = p_profile_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Badges
-- ---------------------------------------------------------------------
create table if not exists badge_definitions (
  code text primary key,
  name text not null,
  description text,
  icon text
);

create table if not exists user_badges (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  badge_code text not null references badge_definitions (code) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (profile_id, badge_code)
);
create index if not exists user_badges_profile_idx on user_badges (profile_id);

insert into badge_definitions (code, name, description, icon) values
  ('first_solve', 'First Blood', 'Solved your first challenge', 'Trophy'),
  ('streak_7', 'Week Warrior', '7-day streak', 'Flame'),
  ('streak_30', 'Month Master', '30-day streak', 'Flame'),
  ('streak_100', 'Centurion', '100-day streak', 'Flame'),
  ('daily_complete_1', 'Daily Champion', 'Completed your first Daily Challenge', 'Sparkles'),
  ('daily_complete_10', 'Consistency Pro', 'Completed 10 Daily Challenges', 'Sparkles'),
  ('topic_master', 'Topic Master', 'Solved every question in a topic''s bank', 'Award')
on conflict (code) do nothing;

create or replace function public.grant_badge(p_profile_id uuid, p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  insert into user_badges (profile_id, badge_code) values (p_profile_id, p_code)
  on conflict (profile_id, badge_code) do nothing;
  if found then
    select name into v_name from badge_definitions where code = p_code;
    perform public.create_notification(p_profile_id, p_profile_id, 'challenge_completion',
      'Badge earned: ' || coalesce(v_name, p_code), 'badge', null);
    perform public.award_coins(p_profile_id, 20, 'badge:' || p_code);
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Challenge discussions (per-problem comment thread)
-- ---------------------------------------------------------------------
create table if not exists challenge_discussions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenges (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists challenge_discussions_challenge_idx on challenge_discussions (challenge_id, created_at);

-- ---------------------------------------------------------------------
-- Daily challenge SESSIONS: replaces the old "2 adaptive challenges"
-- model with user-selected topics, 5 questions per topic, goal = solve 2.
-- (Old `daily_challenge_assignments` table is left in place, unused by
-- new code, so no historical data is destroyed.)
-- ---------------------------------------------------------------------
create table if not exists daily_challenge_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  session_date date not null default current_date,
  completed boolean not null default false,
  completed_at timestamptz,
  reward_claimed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (profile_id, session_date)
);
create index if not exists daily_sessions_profile_idx on daily_challenge_sessions (profile_id, session_date desc);

create table if not exists daily_session_topics (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references daily_challenge_sessions (id) on delete cascade,
  category_id uuid not null references challenge_categories (id) on delete cascade,
  required_solved int not null default 2,
  solved_count int not null default 0,
  completed boolean not null default false,
  completed_at timestamptz,
  unique (session_id, category_id)
);
create index if not exists daily_session_topics_session_idx on daily_session_topics (session_id);

create table if not exists daily_session_questions (
  id uuid primary key default gen_random_uuid(),
  session_topic_id uuid not null references daily_session_topics (id) on delete cascade,
  challenge_id uuid not null references challenges (id) on delete cascade,
  started_at timestamptz,
  solved boolean not null default false,
  solved_at timestamptz,
  unique (session_topic_id, challenge_id)
);
create index if not exists daily_session_questions_topic_idx on daily_session_questions (session_topic_id);

-- ---------------------------------------------------------------------
-- View: live acceptance rate per challenge (no stale cached column)
-- ---------------------------------------------------------------------
create or replace view challenge_stats as
select
  c.id as challenge_id,
  count(s.id) as total_attempts,
  count(s.id) filter (where s.status = 'passed') as total_passed,
  case when count(s.id) = 0 then null
    else round(100.0 * count(s.id) filter (where s.status = 'passed') / count(s.id), 1)
  end as acceptance_rate
from challenges c
left join challenge_submissions s on s.challenge_id = c.id
group by c.id;

-- ---------------------------------------------------------------------
-- Rework XP awarding for challenge submissions: fixed tiers
-- (easy=20, medium=50, hard=100) + bonuses, coins, daily_activity,
-- longest_streak, and daily-session progress — replaces the previous
-- "just add challenges.xp_reward" trigger body.
-- ---------------------------------------------------------------------
create or replace function public.award_xp(
  p_profile_id uuid,
  p_amount int,
  p_reason text,
  p_source_type text default null,
  p_source_id uuid default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last_activity date;
  v_new_streak int;
begin
  insert into xp_events (profile_id, amount, reason, source_type, source_id)
  values (p_profile_id, p_amount, p_reason, p_source_type, p_source_id);

  select last_activity_date into v_last_activity from profiles where id = p_profile_id;

  v_new_streak := case
    when v_last_activity = current_date then (select streak from profiles where id = p_profile_id)
    when v_last_activity = current_date - 1 then (select streak from profiles where id = p_profile_id) + 1
    else 1
  end;

  update profiles
  set xp = xp + p_amount,
      streak = v_new_streak,
      longest_streak = greatest(longest_streak, v_new_streak),
      last_activity_date = current_date,
      updated_at = now()
  where id = p_profile_id;

  insert into daily_activity (profile_id, activity_date, xp_earned)
  values (p_profile_id, current_date, p_amount)
  on conflict (profile_id, activity_date) do update
    set xp_earned = daily_activity.xp_earned + excluded.xp_earned;

  if v_new_streak = 7 then perform public.grant_badge(p_profile_id, 'streak_7'); end if;
  if v_new_streak = 30 then perform public.grant_badge(p_profile_id, 'streak_30'); end if;
  if v_new_streak = 100 then perform public.grant_badge(p_profile_id, 'streak_100'); end if;
end;
$$;

create or replace function public.on_challenge_submission_passed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
  v_difficulty text;
  v_already_passed boolean;
  v_base_xp int;
  v_bonus_xp int := 0;
  v_total_xp int;
  v_estimated_minutes int;
  v_solved_count_ever int;
  v_session_topic_id uuid;
begin
  if new.status = 'passed' and (tg_op = 'INSERT' or old.status <> 'passed') then
    select exists (
      select 1 from challenge_submissions
      where challenge_id = new.challenge_id and profile_id = new.profile_id
        and status = 'passed' and id <> new.id
    ) into v_already_passed;

    select title, difficulty, estimated_minutes into v_title, v_difficulty, v_estimated_minutes
    from challenges where id = new.challenge_id;

    if not v_already_passed then
      v_base_xp := case v_difficulty when 'easy' then 20 when 'medium' then 50 when 'hard' then 100 else 20 end;

      -- Fast-solve bonus: finished within half the estimated time, and no hints used.
      if new.time_taken_seconds is not null and v_estimated_minutes is not null
         and new.time_taken_seconds <= (v_estimated_minutes * 60) / 2 then
        v_bonus_xp := v_bonus_xp + 10;
      end if;
      if not new.hint_used then
        v_bonus_xp := v_bonus_xp + 10;
      end if;

      v_total_xp := v_base_xp + v_bonus_xp;
      perform public.award_xp(new.profile_id, v_total_xp, 'challenge_passed', 'challenge', new.challenge_id);

      select count(*) into v_solved_count_ever
      from challenge_submissions where profile_id = new.profile_id and status = 'passed';
      if v_solved_count_ever = 1 then
        perform public.grant_badge(new.profile_id, 'first_solve');
      end if;
    end if;

    perform public.create_notification(new.profile_id, new.profile_id, 'challenge_completion',
      'You solved "' || coalesce(v_title, 'a challenge') || '"', 'challenge', new.challenge_id);

    -- Legacy adaptive-assignment bookkeeping (kept for any old rows).
    update daily_challenge_assignments
    set completed = true, completed_at = now()
    where profile_id = new.profile_id and challenge_id = new.challenge_id and completed = false;

    -- New session-based bookkeeping: mark this question solved within
    -- today's session (if it's part of one) and bump the topic's progress.
    update daily_session_questions dsq
    set solved = true, solved_at = now()
    from daily_session_topics dst, daily_challenge_sessions dcs
    where dsq.session_topic_id = dst.id
      and dst.session_id = dcs.id
      and dcs.profile_id = new.profile_id
      and dcs.session_date = current_date
      and dsq.challenge_id = new.challenge_id
      and dsq.solved = false
    returning dst.id into v_session_topic_id;

    if v_session_topic_id is not null then
      update daily_session_topics
      set solved_count = solved_count + 1
      where id = v_session_topic_id;

      update daily_session_topics
      set completed = true, completed_at = now()
      where id = v_session_topic_id and solved_count >= required_solved and not completed;

      -- If every topic in today's session is now complete, complete the
      -- session and grant the daily reward exactly once.
      update daily_challenge_sessions dcs
      set completed = true, completed_at = now()
      where dcs.id = (select session_id from daily_session_topics where id = v_session_topic_id)
        and not dcs.completed
        and not exists (
          select 1 from daily_session_topics t
          where t.session_id = dcs.id and not t.completed
        );

      if exists (
        select 1 from daily_challenge_sessions
        where id = (select session_id from daily_session_topics where id = v_session_topic_id)
          and completed and not reward_claimed
      ) then
        update daily_challenge_sessions
        set reward_claimed = true
        where id = (select session_id from daily_session_topics where id = v_session_topic_id);

        perform public.award_coins(new.profile_id, 50, 'daily_challenge_completed');
        perform public.create_notification(new.profile_id, new.profile_id, 'challenge_completion',
          'Daily Challenge completed! +50 coins', 'daily_session',
          (select session_id from daily_session_topics where id = v_session_topic_id));

        select count(*) into v_solved_count_ever
        from daily_challenge_sessions where profile_id = new.profile_id and completed;
        if v_solved_count_ever = 1 then perform public.grant_badge(new.profile_id, 'daily_complete_1'); end if;
        if v_solved_count_ever = 10 then perform public.grant_badge(new.profile_id, 'daily_complete_10'); end if;
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Streak/heatmap helper RPCs
-- ---------------------------------------------------------------------
create or replace function public.compute_weekly_monthly_streak(p_profile_id uuid)
returns table(weekly_streak int, monthly_streak int)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_week int := 0;
  v_month int := 0;
  v_cursor date;
begin
  v_cursor := date_trunc('week', current_date)::date;
  loop
    exit when not exists (
      select 1 from daily_activity
      where profile_id = p_profile_id
        and activity_date >= v_cursor and activity_date < v_cursor + 7
    );
    v_week := v_week + 1;
    v_cursor := v_cursor - 7;
  end loop;

  v_cursor := date_trunc('month', current_date)::date;
  loop
    exit when not exists (
      select 1 from daily_activity
      where profile_id = p_profile_id
        and activity_date >= v_cursor and activity_date < (v_cursor + interval '1 month')::date
    );
    v_month := v_month + 1;
    v_cursor := (v_cursor - interval '1 month')::date;
  end loop;

  return query select v_week, v_month;
end;
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table daily_activity enable row level security;
alter table coin_events enable row level security;
alter table badge_definitions enable row level security;
alter table user_badges enable row level security;
alter table challenge_discussions enable row level security;
alter table daily_challenge_sessions enable row level security;
alter table daily_session_topics enable row level security;
alter table daily_session_questions enable row level security;

drop policy if exists daily_activity_owner_select on daily_activity;
create policy daily_activity_owner_select on daily_activity for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());

drop policy if exists coin_events_owner_select on coin_events;
create policy coin_events_owner_select on coin_events for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());

drop policy if exists badge_definitions_select_all on badge_definitions;
create policy badge_definitions_select_all on badge_definitions for select to authenticated using (true);

drop policy if exists user_badges_select_all on user_badges;
create policy user_badges_select_all on user_badges for select to authenticated using (true);

drop policy if exists challenge_discussions_select_all on challenge_discussions;
create policy challenge_discussions_select_all on challenge_discussions for select to authenticated using (true);
drop policy if exists challenge_discussions_author_insert on challenge_discussions;
create policy challenge_discussions_author_insert on challenge_discussions for insert to authenticated
  with check (author_id = auth.uid());
drop policy if exists challenge_discussions_author_delete on challenge_discussions;
create policy challenge_discussions_author_delete on challenge_discussions for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

drop policy if exists daily_sessions_owner_all on daily_challenge_sessions;
create policy daily_sessions_owner_all on daily_challenge_sessions for all to authenticated
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid());

drop policy if exists daily_session_topics_owner_all on daily_session_topics;
create policy daily_session_topics_owner_all on daily_session_topics for all to authenticated
  using (exists (
    select 1 from daily_challenge_sessions dcs where dcs.id = daily_session_topics.session_id
      and (dcs.profile_id = auth.uid() or public.is_admin())
  ))
  with check (exists (
    select 1 from daily_challenge_sessions dcs where dcs.id = daily_session_topics.session_id
      and dcs.profile_id = auth.uid()
  ));

drop policy if exists daily_session_questions_owner_all on daily_session_questions;
create policy daily_session_questions_owner_all on daily_session_questions for all to authenticated
  using (exists (
    select 1 from daily_session_topics dst
    join daily_challenge_sessions dcs on dcs.id = dst.session_id
    where dst.id = daily_session_questions.session_topic_id
      and (dcs.profile_id = auth.uid() or public.is_admin())
  ))
  with check (exists (
    select 1 from daily_session_topics dst
    join daily_challenge_sessions dcs on dcs.id = dst.session_id
    where dst.id = daily_session_questions.session_topic_id
      and dcs.profile_id = auth.uid()
  ));

-- Realtime for live leaderboard/session updates.
do $$
declare
  t text;
begin
  foreach t in array array['daily_challenge_sessions', 'daily_session_topics', 'profiles']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;
