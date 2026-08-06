-- =====================================================================
-- Sprint 19: AI Resume Builder & AI Resume Optimizer
--
-- Distinct from `resumes` (Sprint 13 — one uploaded PDF/DOCX per user,
-- `is_current` singleton, read-only ATS analysis). This is authored,
-- structured resume content: a candidate can hold several versions at
-- once (fresher/experienced/internship/ATS-friendly/company-specific),
-- edit them directly, and re-run AI optimization against a target
-- company/role/JD any number of times. resume_versions is the mutable
-- document; resume_optimizations is an append-only history of every
-- optimization run against it (same history pattern as
-- eligibility_reports).
-- =====================================================================

create table if not exists resume_versions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  title text not null,
  resume_type text not null,
  target_company text,
  target_role text,
  job_description_text text,
  source_resume_id uuid references resumes (id) on delete set null,
  content jsonb not null default '{}'::jsonb,
  ats_optimization_score int,
  resume_quality_score int,
  keyword_match_score int,
  section_feedback jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table resume_versions drop constraint if exists resume_versions_type_check;
alter table resume_versions add constraint resume_versions_type_check
  check (resume_type in ('fresher', 'experienced', 'internship', 'ats_friendly', 'company_specific'));
alter table resume_versions drop constraint if exists resume_versions_status_check;
alter table resume_versions add constraint resume_versions_status_check
  check (status in ('draft', 'optimized'));

create index if not exists resume_versions_profile_idx
  on resume_versions (profile_id, updated_at desc);

create table if not exists resume_optimizations (
  id uuid primary key default gen_random_uuid(),
  resume_version_id uuid not null references resume_versions (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  target_company text,
  target_role text,
  job_description_text text,
  ats_optimization_score int not null default 0,
  resume_quality_score int not null default 0,
  keyword_match_score int not null default 0,
  section_feedback jsonb not null default '{}'::jsonb,
  missing_skills text[] not null default '{}',
  recommended_certifications text[] not null default '{}',
  rewritten_summary text,
  rewritten_experience jsonb not null default '[]'::jsonb,
  rewritten_projects jsonb not null default '[]'::jsonb,
  keyword_suggestions text[] not null default '{}',
  formatting_suggestions text[] not null default '{}',
  applied boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists resume_optimizations_version_idx
  on resume_optimizations (resume_version_id, created_at desc);
create index if not exists resume_optimizations_profile_idx
  on resume_optimizations (profile_id, created_at desc);

alter table resume_versions enable row level security;
alter table resume_optimizations enable row level security;

drop policy if exists resume_versions_owner_all on resume_versions;
create policy resume_versions_owner_all on resume_versions for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists resume_optimizations_owner_all on resume_optimizations;
create policy resume_optimizations_owner_all on resume_optimizations for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
