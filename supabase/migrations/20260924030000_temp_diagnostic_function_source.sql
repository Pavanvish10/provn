-- =====================================================================
-- TEMPORARY diagnostic only — not a Sprint 31 feature. Round 3
-- (20260924020000) removed every ON CONFLICT clause from
-- verify_skills_on_challenge_pass, yet live testing still hits
-- "42P10 no unique or exclusion constraint matching the ON CONFLICT
-- specification" specifically when the trigger's loop body actually
-- runs (a challenge with real tags) — and does NOT error when the loop
-- body is a no-op (empty tags), which rules out every OTHER trigger on
-- challenge_submissions as the source. That combination should be
-- impossible if the live function body genuinely has no ON CONFLICT
-- clause, so before guessing a 4th time: read back what's actually live.
-- Dropped again once the real fix is confirmed working — see the
-- immediately-following migration.
-- =====================================================================
create or replace function public.debug_get_function_source(p_name text)
returns text
language sql
security definer
set search_path = public
as $$
  select pg_get_functiondef(p_name::regproc);
$$;
