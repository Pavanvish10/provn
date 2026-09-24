-- =====================================================================
-- The debug_get_function_source diagnostic (20260924030000) is
-- unreachable via RPC: PGRST202 "not found in schema cache", persisting
-- across repeated retries and a 60s+ wait. Root cause, not cache lag:
-- Supabase revokes the default PUBLIC execute grant on new functions in
-- the public schema, and that migration never added an explicit grant
-- (unlike its predecessor debug_list_policies, which did) — so
-- PostgREST's route table correctly never lists it as callable.
--
-- This migration (a) grants execute so the diagnostic can finally be
-- read via RPC as the user asked, and (b) re-asserts
-- verify_skills_on_challenge_pass with the exact same round-3 body
-- (20260924020000) unchanged, in case THAT create-or-replace is what
-- silently didn't take — belt and suspenders, since both are cheap and
-- safe to run together.
-- =====================================================================
grant execute on function public.debug_get_function_source(text) to authenticated, service_role;

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
