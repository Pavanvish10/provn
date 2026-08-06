-- =====================================================================
-- Sprint 21: AI Skill Gap Analysis & Personalized Learning Recommendations
--
-- Deepens eligibility_reports (Sprint 16) rather than building a fourth
-- parallel "run it against a target company/role" system — the concept
-- (repeatable, historical, target-company/role-scoped analysis) is
-- identical; what's new is a soft/technical skill split, four
-- additional scored dimensions, and a structured per-skill learning
-- breakdown (why it matters, difficulty, time, priority, order,
-- resources) instead of a flat recommendations list.
-- =====================================================================

alter table eligibility_reports
  add column if not exists missing_soft_skills text[] not null default '{}',
  add column if not exists communication_level int,
  add column if not exists problem_solving_level int,
  add column if not exists dsa_level int,
  add column if not exists system_design_readiness int,
  add column if not exists overall_hiring_probability int,
  add column if not exists skill_breakdown jsonb not null default '[]'::jsonb,
  add column if not exists coding_interview_session_id uuid references coding_interview_sessions (id) on delete set null,
  add column if not exists hr_interview_session_id uuid references voice_interview_sessions (id) on delete set null;
