-- =====================================================================
-- Sprint 34: let verify_skills_on_challenge_pass through the new
-- trg_guard_skills_write trigger (20260927000000).
--
-- Deliberately the only statement in this file, alone, nothing bundled —
-- matching the precedent recorded in 20260924050000's changelog, where
-- `create or replace function` on this exact function silently failed to
-- take effect live three times in a row for a reason never conclusively
-- pinned down, and only a single-statement, standalone migration
-- eventually landed correctly. Logic is byte-for-byte identical to
-- 20260924050000's body except for the two added `perform
-- set_config(...)` calls, one per write path (existing-skill update,
-- new-skill insert), each scoped local-to-transaction (`true` as the
-- third arg) so it can never leak into an unrelated request.
-- =====================================================================
create or replace function public.verify_skills_on_challenge_pass()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tags text[];
  v_tag text;
  v_skill_id uuid;
  v_already_verified boolean;
begin
  if new.status is distinct from 'passed' then
    return new;
  end if;

  select tags into v_tags from challenges where id = new.challenge_id;
  if v_tags is null then
    return new;
  end if;

  foreach v_tag in array v_tags loop
    if coalesce(trim(v_tag), '') = '' then
      continue;
    end if;

    select id, verified into v_skill_id, v_already_verified
      from skills
      where profile_id = new.profile_id and skill_name = v_tag
      limit 1;

    if v_skill_id is not null then
      if not v_already_verified then
        perform set_config('app.bypass_skills_guard', 'on', true);
        update skills set verified = true, source = 'challenge', verified_at = now()
          where id = v_skill_id;
      end if;
    else
      perform set_config('app.bypass_skills_guard', 'on', true);
      insert into skills (profile_id, skill_name, verified, source, verified_at)
      values (new.profile_id, v_tag, true, 'challenge', now());
    end if;
  end loop;

  return new;
end;
$$;
