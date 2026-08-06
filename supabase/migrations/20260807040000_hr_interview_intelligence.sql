-- =====================================================================
-- Sprint 18: AI HR Interview Intelligence
--
-- Deepens the existing voice_interview_sessions engine (Sprint 14)
-- rather than building a parallel HR-only table — "hr"/"manager" were
-- already first-class interview_type values with a real Gemini-backed
-- question/evaluation pipeline and a working voice+text UI; what was
-- missing was: a "behavioral" type, three HR-relevant evaluation
-- dimensions, an HR-specific composite readiness score, and grounding
-- in the candidate's roadmap progress + prior interview performance.
-- =====================================================================

alter table voice_interview_sessions drop constraint if exists voice_interview_sessions_interview_type_check;
alter table voice_interview_sessions add constraint voice_interview_sessions_interview_type_check
  check (interview_type in ('hr', 'technical', 'manager', 'startup', 'faang', 'behavioral'));

alter table voice_interview_sessions
  add column if not exists teamwork_score int,
  add column if not exists adaptability_score int,
  add column if not exists culture_fit_score int,
  add column if not exists hr_readiness_score int,
  add column if not exists roadmap_progress_percent int,
  add column if not exists previous_session_id uuid references voice_interview_sessions (id) on delete set null;
