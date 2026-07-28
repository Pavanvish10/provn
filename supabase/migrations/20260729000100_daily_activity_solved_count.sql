-- daily_activity.challenges_solved was added but never incremented anywhere —
-- award_xp only ever wrote xp_earned. Bump the solved counter specifically
-- when a challenge submission passes (award_xp is also used by mock
-- interviews, which aren't "challenges solved").
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

    update daily_challenge_assignments
    set completed = true, completed_at = now()
    where profile_id = new.profile_id and challenge_id = new.challenge_id and completed = false;

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
  end if;
  return new;
end;
$$;
