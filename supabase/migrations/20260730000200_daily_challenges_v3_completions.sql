-- =====================================================================
-- Daily Challenges v3 — completion + skip tracking.
--
-- `daily_challenge_completions` is the source of truth for the "calendar
-- showing completed challenge days" widget: one row per user per day they
-- solved THAT day's global challenge (as opposed to `daily_activity`,
-- which logs any XP-earning activity, including practice/mock interviews).
-- `daily_challenge_skips` backs the "Skipped" analytics metric.
-- =====================================================================

create table if not exists daily_challenge_completions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  challenge_date date not null,
  challenge_id uuid not null references challenges (id),
  completed_at timestamptz not null default now(),
  unique (profile_id, challenge_date)
);
create index if not exists daily_challenge_completions_profile_idx
  on daily_challenge_completions (profile_id, challenge_date desc);

alter table daily_challenge_completions enable row level security;
drop policy if exists daily_challenge_completions_owner_select on daily_challenge_completions;
create policy daily_challenge_completions_owner_select on daily_challenge_completions for select
  to authenticated using (profile_id = auth.uid() or public.is_admin());
-- No client insert/update policy: only written by the trigger below
-- (security definer), matching how challenge_submissions drives it.

create table if not exists daily_challenge_skips (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  challenge_date date not null default current_date,
  challenge_id uuid not null references challenges (id),
  skipped_at timestamptz not null default now(),
  unique (profile_id, challenge_date)
);
create index if not exists daily_challenge_skips_profile_idx
  on daily_challenge_skips (profile_id, challenge_date desc);

alter table daily_challenge_skips enable row level security;
drop policy if exists daily_challenge_skips_owner_all on daily_challenge_skips;
create policy daily_challenge_skips_owner_all on daily_challenge_skips for all
  to authenticated using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid());

-- Re-declare on_challenge_submission_passed with everything it already did
-- (v2 base XP/bonus, first_solve badge, legacy assignment bookkeeping,
-- session/topic/reward bookkeeping) plus: if the passed challenge is TODAY's
-- global daily challenge, record the completion and clear any skip.
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
  v_todays_daily_challenge_id uuid;
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

      if new.time_taken_seconds is not null and v_estimated_minutes is not null
         and new.time_taken_seconds <= (v_estimated_minutes * 60) / 2 then
        v_bonus_xp := v_bonus_xp + 10;
      end if;
      if not new.hint_used then
        v_bonus_xp := v_bonus_xp + 10;
      end if;

      v_total_xp := v_base_xp + v_bonus_xp;
      perform public.award_xp(new.profile_id, v_total_xp, 'challenge_passed', 'challenge', new.challenge_id);

      insert into daily_activity (profile_id, activity_date, challenges_solved)
      values (new.profile_id, current_date, 1)
      on conflict (profile_id, activity_date) do update
        set challenges_solved = daily_activity.challenges_solved + 1;

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

    -- New session-based bookkeeping (legacy topic-picker model, table kept
    -- for historical data — no longer driven by the current UI).
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

    -- New single-global-daily-challenge bookkeeping: if this is today's
    -- assigned challenge, record the completion (drives the calendar +
    -- streak-of-daily-completions display) and clear any earlier skip.
    select challenge_id into v_todays_daily_challenge_id
    from daily_challenges where challenge_date = current_date;

    if v_todays_daily_challenge_id is not null and v_todays_daily_challenge_id = new.challenge_id then
      insert into daily_challenge_completions (profile_id, challenge_date, challenge_id)
      values (new.profile_id, current_date, new.challenge_id)
      on conflict (profile_id, challenge_date) do nothing;

      delete from daily_challenge_skips
      where profile_id = new.profile_id and challenge_date = current_date;

      select count(*) into v_solved_count_ever
      from daily_challenge_completions where profile_id = new.profile_id;
      if v_solved_count_ever = 1 then perform public.grant_badge(new.profile_id, 'daily_complete_1'); end if;
      if v_solved_count_ever = 10 then perform public.grant_badge(new.profile_id, 'daily_complete_10'); end if;
    end if;
  end if;
  return new;
end;
$$;
