-- =====================================================================
-- Sprint 34: Security & Reliability hardening.
--
-- Found by a 3-way parallel audit (auth/session, rate-limiting/validation/
-- secrets/errors, RLS gaps in tables not covered by Sprints 26-31's prior
-- security passes). Every fix below closes a REAL, verified gap — nothing
-- speculative. See .claude/project-history.md for the full audit writeup.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. profiles self-promotion — the most severe finding this sprint.
--
-- profiles_update_own (20260726220130) is `using (id = auth.uid())` with
-- NO with check and no column restriction. Any authenticated user can
-- run `update profiles set role = 'admin' where id = auth.uid()` directly
-- from the browser — is_admin() (used across nearly every RLS policy and
-- the requireAdmin route guard) just checks `profiles.role = 'admin'`, so
-- this is a full, one-request privilege escalation to platform admin.
--
-- account_type is lower-severity (real authorization for company/college
-- access runs off company_members/college_admins membership, not this
-- column — confirmed by reading company-client.ts's own comment: "access
-- control itself runs off company_members, not this field") but is still
-- tightened as defense in depth, and because the task explicitly asks to
-- test an `account_type = 'college_role=owner'`-style escalation attempt.
--
-- Legitimate self-service flows that must keep working, confirmed by
-- reading their call sites before writing this trigger:
--   - useCreateCompany (company-client.ts): sets own role -> 'company_admin'
--     once, right after creating the company. Allowed (never touches 'admin').
--   - useCreateCollege (college-client.ts): sets own account_type ->
--     'college' once. Allowed (old.account_type = 'student').
--   - admin-users-client.ts: an admin changing another profile's role.
--     Runs under profiles_admin_update (using is_admin()); this trigger
--     bypasses entirely for is_admin() sessions, same as every other
--     guard trigger in this schema.
-- ---------------------------------------------------------------------
create or replace function public.guard_profiles_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() or auth.uid() is null then
    return new;
  end if;
  if new.role is distinct from old.role and new.role = 'admin' then
    raise exception 'Cannot self-assign the admin role.';
  end if;
  if new.account_type is distinct from old.account_type and old.account_type <> 'student' then
    raise exception 'Account type can only be changed once, from a student account.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_profiles_update on profiles;
create trigger trg_guard_profiles_update before update on profiles
  for each row execute function public.guard_profiles_update();

-- ---------------------------------------------------------------------
-- 2. challenge_submissions forged 'passed' status.
--
-- challenge_submissions_owner_insert (20260727000100) is `with check
-- (profile_id = auth.uid())` only — no restriction on `status`. Any user
-- can `insert into challenge_submissions (profile_id, challenge_id,
-- status) values (auth.uid(), <any>, 'passed')` directly, which fires
-- trg_verify_skills_on_challenge_pass (self-verifying skills) plus the
-- badge/streak/XP triggers keyed off status='passed'. The Sprint 31
-- comment calling this table "not client-forgeable" was wrong — that was
-- only true of the app's own UI, not of the table's actual RLS.
--
-- Same fix pattern as job_applications' ats_score tamper (Sprint 31):
-- block the sensitive column for real client sessions; the one
-- legitimate writer (judge0.server.ts's submitChallengeFn, which already
-- re-derives profile_id from the authenticated session and computes
-- `status` from a real Judge0 grading run) switches to the admin/
-- service-role client so auth.uid() is null for its own insert.
-- ---------------------------------------------------------------------
create or replace function public.guard_challenge_submission_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and new.status is distinct from 'pending' then
    raise exception 'Submission results can only be recorded by the grading system.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_challenge_submission_insert on challenge_submissions;
create trigger trg_guard_challenge_submission_insert before insert on challenge_submissions
  for each row execute function public.guard_challenge_submission_insert();

-- ---------------------------------------------------------------------
-- 3. skills self-verification.
--
-- skills_owner_insert/skills_owner_update (20260726220130) let a user
-- insert or update their own skill row with verified=true, source=
-- 'challenge' directly — completely bypassing the real challenge-based
-- verification Sprint 31 built. Fixed via the same session-local
-- set_config bypass flag used to distinguish "the trusted
-- verify_skills_on_challenge_pass trigger doing this write" from "the
-- client doing this write directly" — both happen inside the SAME
-- authenticated session (a security-definer trigger doesn't change
-- auth.uid()), so the auth.uid()-is-null trick used elsewhere in this
-- migration doesn't distinguish them here.
--
-- verify_skills_on_challenge_pass's own body is deliberately NOT touched
-- by this statement — seeing 20260924050000's changelog, that exact
-- function took 5 migration rounds to actually take effect live last
-- time for reasons never conclusively pinned down. The bypass-flag call
-- is added around its two write statements in a separate, single-
-- statement follow-up migration file instead, matching the lesson
-- recorded there ("alone in its own file with nothing else bundled").
-- ---------------------------------------------------------------------
create or replace function public.guard_skills_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() or coalesce(current_setting('app.bypass_skills_guard', true), '') = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.verified is true then
      raise exception 'Skills can only be verified by passing a real challenge.';
    end if;
    return new;
  end if;
  if new.verified is distinct from old.verified
     or new.source is distinct from old.source
     or new.verified_at is distinct from old.verified_at
  then
    raise exception 'Skills can only be verified by passing a real challenge.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_skills_write on skills;
create trigger trg_guard_skills_write before insert or update on skills
  for each row execute function public.guard_skills_write();

-- ---------------------------------------------------------------------
-- 4. conversation_participants — arbitrary join/add.
--
-- conversation_participants_insert (20260727000000) is `with check
-- (true)` — any authenticated user can insert a participant row for ANY
-- conversation_id + ANY profile_id, letting them silently self-join and
-- read someone else's existing DM, or add a victim into their own
-- conversation. Fixed to allow only: (a) populating a brand-new, still-
-- empty conversation (the real useStartConversation flow, which inserts
-- both participant rows for a conversation it just created), or (b) an
-- existing participant adding someone else (legitimate group-chat growth
-- for is_group conversations). Both self-referential checks go through
-- SECURITY DEFINER helpers to avoid the exact 42P17 recursion class
-- already hit and fixed once on this table (20260805000000).
-- ---------------------------------------------------------------------
create or replace function public.conversation_has_any_participants(p_conversation_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from conversation_participants where conversation_id = p_conversation_id);
$$;

drop policy if exists conversation_participants_insert on conversation_participants;
create policy conversation_participants_insert on conversation_participants for insert to authenticated
  with check (
    public.is_admin()
    or public.is_conversation_participant(conversation_id, auth.uid())
    or not public.conversation_has_any_participants(conversation_id)
  );

-- ---------------------------------------------------------------------
-- 5. interview_schedules applicant update — column scope.
--
-- interview_schedules_applicant_update (20260728000300) is `using (...)`
-- with no `with check`, so a real USING-only UPDATE policy lets the
-- applicant rewrite every column on their own interview row, not just
-- respond to it — scheduled_at, meeting_link, interviewer_name, notes,
-- even application_id. There's no separate recruiter UPDATE policy on
-- this table today (only an INSERT one), so this only needs to scope the
-- one real UPDATE path down to the columns an applicant response
-- actually touches (status, responded_at).
-- ---------------------------------------------------------------------
create or replace function public.guard_interview_schedule_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_recruiter boolean;
begin
  select public.is_admin() or exists (
    select 1 from job_applications ja
    join jobs j on j.id = ja.job_id
    where ja.id = new.application_id
      and public.has_company_role(j.company_id, array['owner', 'admin', 'recruiter'])
  ) into v_is_recruiter;

  if not v_is_recruiter and (
    new.scheduled_at is distinct from old.scheduled_at
    or new.mode is distinct from old.mode
    or new.notes is distinct from old.notes
    or new.interviewer_name is distinct from old.interviewer_name
    or new.meeting_link is distinct from old.meeting_link
    or new.application_id is distinct from old.application_id
  ) then
    raise exception 'Only the recruiter can change interview scheduling details.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_interview_schedule_update on interview_schedules;
create trigger trg_guard_interview_schedule_update before update on interview_schedules
  for each row execute function public.guard_interview_schedule_update();

-- ---------------------------------------------------------------------
-- 6. Generic, DB-backed rate limiter.
--
-- No app-level rate limiting existed anywhere except a bespoke per-email
-- cooldown in email-otp.server.ts. This app deploys as serverless
-- functions (see .vercel/output), so an in-memory counter wouldn't
-- persist across invocations/instances — a DB-backed atomic counter is
-- the correct mechanism here, same category of choice as the existing
-- OTP cooldown, just generalized so every high-risk endpoint can reuse
-- one small table + function instead of hand-rolling its own.
--
-- Fixed-window counter, one UPSERT per check (atomic — concurrent calls
-- for the same key serialize on the row's primary key, no race). RLS
-- enabled with zero policies for `authenticated`/`anon` (default deny) —
-- this table is only ever touched through the SECURITY DEFINER function
-- below, never queried directly by the client.
-- ---------------------------------------------------------------------
create table if not exists rate_limit_buckets (
  key text primary key,
  window_start timestamptz not null default now(),
  request_count int not null default 0
);
alter table rate_limit_buckets enable row level security;

create or replace function public.check_rate_limit(p_key text, p_max_requests int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into rate_limit_buckets (key, window_start, request_count)
  values (p_key, now(), 1)
  on conflict (key) do update set
    request_count = case
      when rate_limit_buckets.window_start <= now() - make_interval(secs => p_window_seconds)
        then 1
      else rate_limit_buckets.request_count + 1
    end,
    window_start = case
      when rate_limit_buckets.window_start <= now() - make_interval(secs => p_window_seconds)
        then now()
      else rate_limit_buckets.window_start
    end
  returning request_count into v_count;

  return v_count <= p_max_requests;
end;
$$;

grant execute on function public.check_rate_limit(text, int, int) to authenticated, anon;
