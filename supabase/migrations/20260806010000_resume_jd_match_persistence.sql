-- =====================================================================
-- Sprint 13: persist JD-match analysis results (previously computed by
-- analyzeResumeAgainstJdFn and returned to the client but never saved,
-- so a candidate lost their report on refresh) and record the real MIME
-- type of an uploaded resume so analyzeResumeFn/analyzeResumeAgainstJdFn
-- can send Gemini the correct inlineData.mimeType instead of always
-- assuming application/pdf.
-- =====================================================================

alter table resumes
  add column if not exists jd_match jsonb,
  add column if not exists jd_match_updated_at timestamptz,
  add column if not exists mime_type text;
