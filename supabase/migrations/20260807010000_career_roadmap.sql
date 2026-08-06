-- =====================================================================
-- Sprint 15: AI Career Intelligence & Personalized Learning Roadmap
--
-- Distinct from the existing roadmap_templates/roadmap_steps/user_roadmaps
-- system (admin-curated, one shared template per role). career_roadmaps
-- is generated per-candidate from their real resume analysis, interview
-- history, target company/role, and job description.
-- =====================================================================

create table if not exists career_roadmaps (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  target_company text,
  target_role text not null,
  job_description_text text,
  duration_months int not null,
  start_date date not null default current_date,
  resume_id uuid references resumes (id) on delete set null,
  voice_interview_session_id uuid references voice_interview_sessions (id) on delete set null,
  company_readiness_score int not null default 50,
  role_readiness_score int not null default 50,
  hiring_readiness_score int not null default 50,
  skill_gap jsonb not null default '{"matched":[],"missing":[],"priority":[]}'::jsonb,
  recommended_projects jsonb not null default '[]'::jsonb,
  coding_practice_plan jsonb not null default '[]'::jsonb,
  hr_prep_plan jsonb not null default '[]'::jsonb,
  interview_prep_plan jsonb not null default '[]'::jsonb,
  summary text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table career_roadmaps drop constraint if exists career_roadmaps_duration_check;
alter table career_roadmaps add constraint career_roadmaps_duration_check
  check (duration_months >= 1 and duration_months <= 24);
alter table career_roadmaps drop constraint if exists career_roadmaps_status_check;
alter table career_roadmaps add constraint career_roadmaps_status_check
  check (status in ('active', 'completed', 'archived'));

create index if not exists career_roadmaps_profile_idx
  on career_roadmaps (profile_id, status, created_at desc);

create table if not exists career_roadmap_tasks (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references career_roadmaps (id) on delete cascade,
  granularity text not null,
  period_index int not null,
  task_date date,
  title text not null,
  description text,
  category text,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table career_roadmap_tasks drop constraint if exists career_roadmap_tasks_granularity_check;
alter table career_roadmap_tasks add constraint career_roadmap_tasks_granularity_check
  check (granularity in ('daily', 'weekly', 'monthly'));

create index if not exists career_roadmap_tasks_roadmap_idx
  on career_roadmap_tasks (roadmap_id, granularity, period_index);
create index if not exists career_roadmap_tasks_date_idx
  on career_roadmap_tasks (roadmap_id, task_date) where task_date is not null;

alter table career_roadmaps enable row level security;
alter table career_roadmap_tasks enable row level security;

drop policy if exists career_roadmaps_owner_all on career_roadmaps;
create policy career_roadmaps_owner_all on career_roadmaps for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists career_roadmap_tasks_owner_all on career_roadmap_tasks;
create policy career_roadmap_tasks_owner_all on career_roadmap_tasks for all to authenticated
  using (exists (
    select 1 from career_roadmaps cr where cr.id = career_roadmap_tasks.roadmap_id and cr.profile_id = auth.uid()
  ))
  with check (exists (
    select 1 from career_roadmaps cr where cr.id = career_roadmap_tasks.roadmap_id and cr.profile_id = auth.uid()
  ));
