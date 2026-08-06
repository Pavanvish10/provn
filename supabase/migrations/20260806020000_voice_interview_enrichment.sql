-- =====================================================================
-- Sprint 14: real AI mock interview engine. `voice_interview_sessions`
-- already had the right shape for this (7 score columns, a questions
-- jsonb array) — it just needed a couple more fields:
--   - context_block: the JD/resume grounding text built once at
--     startVoiceInterviewFn and reused by every later Gemini call in the
--     session (respond/finish), so it isn't re-derived or re-sent by the
--     client every turn.
--   - missing_skills / matched_skills: the final report's skill-gap
--     breakdown, inferred by Gemini from the same context_block.
-- Per-answer feedback (score/strengths/weaknesses/idealAnswer/
-- suggestions) is stored inside the existing `questions` jsonb array
-- element-by-element — jsonb is already unstructured, so no schema
-- change is needed for that part; it's a contract change in
-- voice-interview.server.ts only.
-- =====================================================================

alter table voice_interview_sessions
  add column if not exists context_block text,
  add column if not exists missing_skills text[],
  add column if not exists matched_skills text[];
