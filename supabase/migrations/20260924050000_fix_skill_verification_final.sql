-- =====================================================================
-- Sprint 31: the real, final fix for verify_skills_on_challenge_pass.
--
-- Confirmed via `select pg_get_functiondef('public.verify_skills_on_challenge_pass'::regproc)`
-- run directly in the Supabase SQL Editor that the live function still
-- contained the ORIGINAL (20260924000000) body — `on conflict
-- (profile_id, lower(skill_name))`, targeting a unique INDEX that
-- 20260727000500_skills_unique_fix.sql dropped and replaced with a
-- plain-column unique CONSTRAINT. None of the three intermediate
-- `create or replace function` migrations (20260924010000, 20260924020000,
-- 20260924040000) ever actually took effect on the live function, for a
-- reason that's no longer relevant now that the true live state is
-- confirmed directly rather than inferred.
--
-- This migration is deliberately the only statement in the file: one
-- `create or replace function`, nothing bundled with it, to remove any
-- possible ambiguity about what ran.
--
-- Logic (unchanged from the version already sanity-checked live against
-- the real skills table outside the trigger): no ON CONFLICT clause at
-- all — explicit select-then-insert-or-update. skills.skill_name has no
-- reliably-targetable unique constraint from raw SQL in this database
-- (the PostgREST-only upsert path works; a literal ON CONFLICT clause in
-- this function's own INSERT does not, root cause not pinned down and no
-- longer being chased) — this sidesteps that entirely.
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
