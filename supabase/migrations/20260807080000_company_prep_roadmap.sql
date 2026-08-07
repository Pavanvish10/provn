-- =====================================================================
-- Sprint 22: AI Company Preparation Roadmaps
--
-- Deepens career_roadmaps (Sprint 15) rather than building a fifth
-- parallel "prepare for a target company/role" system — the concept
-- (personalized, multi-month, task-tracked plan) is identical; what's
-- new is a certifications plan, a revision plan, a mock-interview
-- schedule, and a predicted-readiness estimate. Roadmap history already
-- exists (archived rows are never deleted) — this sprint surfaces it in
-- the UI rather than duplicating the data model.
-- =====================================================================

alter table career_roadmaps
  add column if not exists certifications_plan jsonb not null default '[]'::jsonb,
  add column if not exists revision_plan jsonb not null default '[]'::jsonb,
  add column if not exists mock_interview_schedule jsonb not null default '[]'::jsonb,
  add column if not exists predicted_readiness_weeks int,
  add column if not exists coding_interview_session_id uuid references coding_interview_sessions (id) on delete set null,
  add column if not exists hr_interview_session_id uuid references voice_interview_sessions (id) on delete set null,
  add column if not exists eligibility_report_id uuid references eligibility_reports (id) on delete set null;
