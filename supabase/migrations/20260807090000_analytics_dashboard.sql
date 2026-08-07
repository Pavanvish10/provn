-- =====================================================================
-- Sprint 23: AI Interview Analytics Dashboard
--
-- No new interview/score tables — the dashboard is a read-side
-- aggregation over data that already exists: coding_interview_sessions,
-- voice_interview_sessions, eligibility_reports, resumes, career_roadmaps,
-- career_roadmap_tasks, and challenge_submissions. This migration adds
-- exactly one new table, and it stores neither raw scores nor interview
-- content — just a per-profile cache of the AI-synthesized insights
-- (so the dashboard doesn't re-call Gemini on every page view) plus the
-- optional public-share flag/token for the "shareable report link"
-- requirement. One row per profile, upserted on regenerate.
-- =====================================================================

create table if not exists analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  metrics jsonb not null default '{}'::jsonb,
  insights jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  share_token uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists analytics_snapshots_profile_id_key
  on analytics_snapshots (profile_id);
create unique index if not exists analytics_snapshots_share_token_key
  on analytics_snapshots (share_token) where share_token is not null;

alter table analytics_snapshots enable row level security;
drop policy if exists analytics_snapshots_owner_all on analytics_snapshots;
create policy analytics_snapshots_owner_all on analytics_snapshots for all
  to authenticated using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid());

-- No public RLS policy: the shared-report route reads by token through a
-- server function using the service-role client (getSupabaseAdminClient),
-- which returns only a stripped-down subset of columns — never a client-
-- side query against this table, so a public row can never be enumerated
-- by scanning is_public=true without already knowing its token.
