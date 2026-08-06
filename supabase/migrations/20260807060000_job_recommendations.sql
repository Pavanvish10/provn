-- =====================================================================
-- Sprint 20: AI Job Recommendation & Company Matching Engine
--
-- Recommends against the REAL jobs board (`jobs`/`companies`, already
-- live and posted by real business accounts) — never fabricated
-- listings. Each row is one "run" of the recommendation engine: the
-- filters used plus the enriched, AI-scored results and next-step
-- suggestions at that point in time (append-only history, same pattern
-- as eligibility_reports).
-- =====================================================================

create table if not exists job_recommendations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  preferred_location text,
  min_salary int,
  experience_level text,
  remote_only boolean not null default false,
  internship_only boolean not null default false,
  full_time_only boolean not null default false,
  target_role text,
  recommendations jsonb not null default '[]'::jsonb,
  next_steps jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists job_recommendations_profile_idx
  on job_recommendations (profile_id, created_at desc);

alter table job_recommendations enable row level security;

drop policy if exists job_recommendations_owner_all on job_recommendations;
create policy job_recommendations_owner_all on job_recommendations for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
