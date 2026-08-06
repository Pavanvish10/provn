-- =====================================================================
-- Sprint 16: ATS Engine & Company Eligibility AI
--
-- A repeatable, historical "run it anytime" assessment against a target
-- company/role/JD — distinct from career_roadmaps (Sprint 15's single
-- active multi-month plan). Each run inserts a new row so a candidate
-- can track their eligibility score trend over time as they complete
-- roadmap tasks / retake interviews / update their resume.
-- =====================================================================

create table if not exists eligibility_reports (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  target_company text,
  target_role text not null,
  job_description_text text,
  resume_id uuid references resumes (id) on delete set null,
  voice_interview_session_id uuid references voice_interview_sessions (id) on delete set null,
  career_roadmap_id uuid references career_roadmaps (id) on delete set null,
  roadmap_progress_percent int,
  ats_score int not null default 50,
  company_eligibility_score int not null default 50,
  role_match_score int not null default 50,
  skill_match_percent int,
  estimated_interview_readiness int not null default 50,
  missing_skills text[] not null default '{}',
  missing_projects text[] not null default '{}',
  missing_certifications text[] not null default '{}',
  score_rationale jsonb not null default '{}'::jsonb,
  recommendations jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists eligibility_reports_profile_idx
  on eligibility_reports (profile_id, created_at desc);
create index if not exists eligibility_reports_profile_target_idx
  on eligibility_reports (profile_id, target_company, target_role, created_at desc);

alter table eligibility_reports enable row level security;

drop policy if exists eligibility_reports_owner_all on eligibility_reports;
create policy eligibility_reports_owner_all on eligibility_reports for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
