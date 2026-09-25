-- =====================================================================
-- Sprint 35: Launch Command Center.
--
-- Two genuinely new tables — confirmed via grep that no maintenance-mode,
-- announcement, or feature-flag concept exists anywhere in this schema
-- before now. Everything else the Launch Command Center shows (metrics,
-- health, readiness checklist, operational alerts) is derived live from
-- tables that already exist; no other migration is needed for those.
--
-- Both tables are intentionally public-read (authenticated + anon): the
-- values themselves (a maintenance banner message, an announcement, a
-- feature's on/off state) are operational, not sensitive — the same
-- trust level as a public status page. Writes are admin-only.
-- =====================================================================

create table if not exists system_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table system_settings enable row level security;

drop policy if exists system_settings_select_all on system_settings;
create policy system_settings_select_all on system_settings for select to authenticated, anon
  using (true);
drop policy if exists system_settings_admin_write on system_settings;
create policy system_settings_admin_write on system_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

insert into system_settings (key, value) values
  ('maintenance_mode', '{"enabled": false, "message": ""}'::jsonb),
  ('announcement', '{"active": false, "message": ""}'::jsonb)
on conflict (key) do nothing;

create table if not exists feature_flags (
  key text primary key,
  enabled boolean not null default true,
  description text,
  updated_by uuid references profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table feature_flags enable row level security;

drop policy if exists feature_flags_select_all on feature_flags;
create policy feature_flags_select_all on feature_flags for select to authenticated, anon
  using (true);
drop policy if exists feature_flags_admin_write on feature_flags;
create policy feature_flags_admin_write on feature_flags for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Seeded with the 4 real features this migration also wires up live
-- enforcement for (see src/lib/ai-chat.server.ts, mentor.server.ts,
-- voice-interview.server.ts, payments.server.ts) — not a placeholder
-- list, every row here actually gates something real.
insert into feature_flags (key, enabled, description) values
  ('ai_chat_assistant', true, 'The floating AI chat assistant widget (sendChatMessageFn).'),
  ('mentor_chat', true, 'AI mentor chat conversations (sendMentorMessageFn).'),
  ('voice_interviews', true, 'Starting a new AI voice interview session (startVoiceInterviewFn).'),
  ('checkout', true, 'Starting a new subscription checkout (createSubscriptionCheckoutFn).')
on conflict (key) do nothing;
