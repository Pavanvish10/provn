-- =====================================================================
-- Founder-specific onboarding fields on profiles. "Founder" is one of the
-- personas selectable on /profession (profiles.persona = 'founder') for an
-- individual (accountType stays 'student') describing their own startup —
-- distinct from the `companies` table used by the separate Business/HR
-- recruiter registration flow (accountType = 'company').
-- =====================================================================

alter table profiles
  add column if not exists founder_company_name text,
  add column if not exists founder_company_website text,
  add column if not exists founder_company_linkedin text,
  add column if not exists founder_startup_stage text,
  add column if not exists founder_industry text,
  add column if not exists founder_company_description text;
