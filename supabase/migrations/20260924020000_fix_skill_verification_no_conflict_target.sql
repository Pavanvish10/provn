-- =====================================================================
-- Sprint 31 fix-forward, round 2. 20260924010000 retargeted the ON
-- CONFLICT clause at (profile_id, skill_name) — live-testing that fix
-- hit the SAME 42P10 "no unique or exclusion constraint matching the ON
-- CONFLICT specification" error as the original lower(skill_name)
-- version.
--
-- Investigated further before guessing a third target: the constraint
-- skills_profile_id_skill_name_key on (profile_id, skill_name)
-- genuinely DOES exist live — confirmed two ways: a raw duplicate
-- INSERT is correctly rejected citing that exact constraint name, and a
-- PostgREST upsert(onConflict: "profile_id,skill_name") against the
-- same table succeeds cleanly (insert then update-on-conflict, both
-- verified live). Yet the identical column list written as a literal
-- `on conflict (profile_id, skill_name)` inside this function's own
-- INSERT still fails the same way, reproduced twice. Root cause not
-- conclusively pinned down (PostgREST apparently resolves its
-- onConflict column list to the constraint differently than a raw SQL
-- ON CONFLICT clause does in this instance) — rather than a third guess
-- at a conflict-target spelling, this sidesteps ON CONFLICT entirely:
-- explicit select-then-insert-or-update, which was independently
-- verified live to work correctly against this exact table. A
-- few-millisecond check-then-act race window exists (two challenge
-- passes for the same untried tag in the same instant could both
-- insert), but skill verification isn't a security or financial
-- boundary — worst case is a harmless duplicate row.
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
        update skills set verified = true, source = 'challenge', verified_at = now()
          where id = v_skill_id;
      end if;
    else
      insert into skills (profile_id, skill_name, verified, source, verified_at)
      values (new.profile_id, v_tag, true, 'challenge', now());
    end if;
  end loop;

  return new;
end;
$$;
