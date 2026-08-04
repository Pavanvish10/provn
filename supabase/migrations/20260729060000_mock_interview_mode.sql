-- =====================================================================
-- Adds a `mode` to mock_interviews so a candidate can take a soft-skills /
-- behavioral practice interview separate from the technical mock interview
-- used to satisfy the 3-step job application verification gate (/apply).
-- Existing rows default to 'technical' so current verification behavior
-- (latest technical interview completed) is unaffected.
-- =====================================================================

alter table mock_interviews
  add column if not exists mode text not null default 'technical';

alter table mock_interviews drop constraint if exists mock_interviews_mode_check;
alter table mock_interviews
  add constraint mock_interviews_mode_check check (mode in ('technical', 'soft_skills'));
