-- =====================================================================
-- Sprint 31 fix-forward: verify_skills_on_challenge_pass (from
-- 20260924000000_sprint31_security_fixes.sql) targeted
-- `on conflict (profile_id, lower(skill_name))`, which matched the
-- unique INDEX created in 20260726220130 — but that index was dropped
-- and replaced by a plain-column unique CONSTRAINT
-- (skills_profile_id_skill_name_key, on (profile_id, skill_name), no
-- lower()) in 20260727000500_skills_unique_fix.sql, specifically so
-- PostgREST's own onConflict targeting could reach it. Missed this
-- during Sprint 31 by only grepping "skills_unique_per_profile" and not
-- catching its later removal.
--
-- Found via live verification, not by inspection: every real challenge
-- pass was throwing "42P10 no unique or exclusion constraint matching
-- the ON CONFLICT specification" and failing the INSERT into
-- challenge_submissions itself (the trigger runs inside the same
-- transaction) — i.e. this bug didn't just fail to verify skills, it
-- was actively breaking every coding-challenge submission end to end.
-- Fixed by retargeting the ON CONFLICT clause at the constraint that
-- actually exists today.
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
    insert into skills (profile_id, skill_name, verified, source, verified_at)
    values (new.profile_id, v_tag, true, 'challenge', now())
    on conflict (profile_id, skill_name)
    do update set verified = true, source = 'challenge', verified_at = now()
    where skills.verified is distinct from true;
  end loop;

  return new;
end;
$$;
