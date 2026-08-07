-- =====================================================================
-- Sprint 25: AI Recruiter & Startup Hiring Portal
--
-- Research before writing this migration found that "a recruiter-facing
-- hiring portal" already exists almost entirely as the Business Hub
-- (companies / company_members / jobs / job_applications /
-- interview_schedules, all RLS-gated via has_company_role, wired into
-- /business/jobs and /business/applicants). Recruiter auth+role checking
-- is already requireBusinessAccount + has_company_role; job CRUD with
-- draft/open/paused/closed is already business.jobs.tsx; AI match scoring
-- is already matching-scores.server.ts + matching.ts; student application
-- tracking is already /applied-jobs. This migration adds ONLY the pieces
-- that genuinely don't exist yet: recruiter notes on a candidate, a
-- status-change audit trail, and recruiter bookmarking of a candidate
-- independent of pipeline status — plus the recruiter-visibility read
-- policies needed for the "interview completed" / "roadmap active"
-- candidate filters, which were flagged as a known gap in
-- company-client.ts's existing comments (resumes already has this same
-- policy; coding/voice interview sessions and career_roadmaps did not).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Recruiter notes on a candidate's application
-- ---------------------------------------------------------------------
create table if not exists application_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references job_applications (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists application_notes_application_idx
  on application_notes (application_id, created_at asc);

alter table application_notes enable row level security;
drop policy if exists application_notes_recruiter_all on application_notes;
create policy application_notes_recruiter_all on application_notes for all to authenticated
  using (exists (
    select 1 from job_applications ja
    join jobs j on j.id = ja.job_id
    where ja.id = application_notes.application_id
      and public.has_company_role(j.company_id, array['owner', 'admin', 'recruiter'])
  ) or public.is_admin())
  with check (exists (
    select 1 from job_applications ja
    join jobs j on j.id = ja.job_id
    where ja.id = application_notes.application_id
      and public.has_company_role(j.company_id, array['owner', 'admin', 'recruiter'])
  ));

-- ---------------------------------------------------------------------
-- Application status history — audit trail. job_applications.status has
-- always been a live value with no history; this adds the trail via a
-- trigger, additive to (not replacing) the existing notification trigger.
-- ---------------------------------------------------------------------
create table if not exists application_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references job_applications (id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists application_status_history_application_idx
  on application_status_history (application_id, created_at asc);

alter table application_status_history enable row level security;
drop policy if exists application_status_history_visible on application_status_history;
create policy application_status_history_visible on application_status_history for select to authenticated
  using (exists (
    select 1 from job_applications ja
    join jobs j on j.id = ja.job_id
    where ja.id = application_status_history.application_id
      and (ja.applicant_id = auth.uid() or public.has_company_role(j.company_id, array['owner', 'admin', 'recruiter']))
  ) or public.is_admin());
-- Insert only ever happens via the trigger below (security definer), so no
-- direct-insert policy is granted to any role.

create or replace function public.log_application_status_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.status <> old.status then
    insert into application_status_history (application_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_application_status_history on job_applications;
create trigger trg_application_status_history after update on job_applications
  for each row execute function public.log_application_status_history();

-- ---------------------------------------------------------------------
-- Recruiter bookmark of a candidate — independent of any specific job's
-- pipeline status (distinct from job_saves, which is a student bookmarking
-- a job). A recruiter can bookmark a candidate sourced from Best Matches
-- before they've even applied anywhere.
-- ---------------------------------------------------------------------
create table if not exists candidate_bookmarks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (company_id, profile_id)
);
create index if not exists candidate_bookmarks_company_idx on candidate_bookmarks (company_id);

alter table candidate_bookmarks enable row level security;
drop policy if exists candidate_bookmarks_recruiter_all on candidate_bookmarks;
create policy candidate_bookmarks_recruiter_all on candidate_bookmarks for all to authenticated
  using (public.has_company_role(company_id, array['owner', 'admin', 'recruiter']) or public.is_admin())
  with check (public.has_company_role(company_id, array['owner', 'admin', 'recruiter']) or public.is_admin());

-- ---------------------------------------------------------------------
-- Recruiter-visibility read policies for candidate-detail signals, mirroring
-- the existing resumes_recruiter_view policy exactly (companies_jobs_admin.sql).
-- Scoped strictly to candidates who applied to one of the recruiter's own
-- company's jobs — not a blanket "recruiters can see all students" grant.
-- ---------------------------------------------------------------------
drop policy if exists career_roadmaps_recruiter_view on career_roadmaps;
create policy career_roadmaps_recruiter_view on career_roadmaps for select to authenticated
  using (
    exists (
      select 1 from job_applications ja
      join jobs j on j.id = ja.job_id
      where ja.applicant_id = career_roadmaps.profile_id
        and public.has_company_role(j.company_id, array['owner', 'admin', 'recruiter'])
    )
    or public.is_admin()
  );

drop policy if exists coding_interview_sessions_recruiter_view on coding_interview_sessions;
create policy coding_interview_sessions_recruiter_view on coding_interview_sessions for select to authenticated
  using (
    exists (
      select 1 from job_applications ja
      join jobs j on j.id = ja.job_id
      where ja.applicant_id = coding_interview_sessions.profile_id
        and public.has_company_role(j.company_id, array['owner', 'admin', 'recruiter'])
    )
    or public.is_admin()
  );

drop policy if exists voice_interview_sessions_recruiter_view on voice_interview_sessions;
create policy voice_interview_sessions_recruiter_view on voice_interview_sessions for select to authenticated
  using (
    exists (
      select 1 from job_applications ja
      join jobs j on j.id = ja.job_id
      where ja.applicant_id = voice_interview_sessions.profile_id
        and public.has_company_role(j.company_id, array['owner', 'admin', 'recruiter'])
    )
    or public.is_admin()
  );

-- ---------------------------------------------------------------------
-- Fix: on_job_application_status_change (companies_jobs_admin.sql) calls
-- create_notification(new.applicant_id, new.applicant_id, ...) — recipient
-- and actor are the same value, and create_notification early-returns
-- when p_recipient_id = p_actor_id (social_feed.sql's anti-self-notify
-- guard), so this call has always silently no-op'd. Sprint 25 explicitly
-- requires shortlist notifications to actually reach the candidate, so
-- this fixes the actor to whoever performed the update (the recruiter),
-- which also happens to be more accurate than the previous value.
-- ---------------------------------------------------------------------
create or replace function public.on_job_application_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
begin
  if tg_op = 'UPDATE' and new.status <> old.status then
    select title into v_title from jobs where id = new.job_id;
    perform public.create_notification(new.applicant_id, auth.uid(), 'job_update',
      'Your application for "' || coalesce(v_title, 'a role') || '" is now ' || new.status,
      'job_application', new.id);
  end if;
  return new;
end;
$$;
