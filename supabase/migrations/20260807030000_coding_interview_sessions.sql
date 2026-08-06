-- =====================================================================
-- Sprint 17: AI Coding Interview Engine
--
-- Distinct from challenges/challenge_submissions (Sprint pre-13's daily
-- practice bank of admin-authored, reusable problems). Each row here is
-- a one-off, AI-generated problem grounded in a target company/role/
-- difficulty and the candidate's real resume/roadmap context — not
-- reusable across candidates, so it's a self-contained session row
-- (same shape as voice_interview_sessions) rather than a normalized
-- problem/test-case table pair.
-- =====================================================================

create table if not exists coding_interview_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  target_company text,
  target_role text not null,
  difficulty text not null,
  title text not null,
  description text not null,
  constraints text,
  examples jsonb not null default '[]'::jsonb,
  test_cases jsonb not null default '[]'::jsonb,
  language text,
  source_code text,
  status text not null default 'in_progress',
  passed_count int,
  total_count int,
  runtime_ms int,
  stdout text,
  stderr text,
  correctness_score int,
  time_complexity_score int,
  space_complexity_score int,
  code_quality_score int,
  edge_case_score int,
  optimization_score int,
  overall_score int,
  mistakes text[] not null default '{}',
  better_solution text,
  optimization_suggestions text[] not null default '{}',
  learning_resources text[] not null default '{}',
  resume_id uuid references resumes (id) on delete set null,
  career_roadmap_id uuid references career_roadmaps (id) on delete set null,
  roadmap_progress_percent int,
  ats_score int,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table coding_interview_sessions drop constraint if exists coding_interview_sessions_difficulty_check;
alter table coding_interview_sessions add constraint coding_interview_sessions_difficulty_check
  check (difficulty in ('easy', 'medium', 'hard'));
alter table coding_interview_sessions drop constraint if exists coding_interview_sessions_status_check;
alter table coding_interview_sessions add constraint coding_interview_sessions_status_check
  check (status in ('in_progress', 'evaluated', 'abandoned'));

create index if not exists coding_interview_sessions_profile_idx
  on coding_interview_sessions (profile_id, created_at desc);

alter table coding_interview_sessions enable row level security;

drop policy if exists coding_interview_sessions_owner_all on coding_interview_sessions;
create policy coding_interview_sessions_owner_all on coding_interview_sessions for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
