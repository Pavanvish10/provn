-- =====================================================================
-- Self-contained email OTP (one-time code) storage for passwordless
-- "sign in with a code" auth, sent via Resend rather than Supabase's
-- built-in auth email system. Codes are hashed at rest; only the
-- server-side admin/secret-key client (which bypasses RLS) ever reads or
-- writes this table — there is no auth.uid() to scope a policy to anyway,
-- since these requests happen before the user has a session.
-- =====================================================================

create table if not exists email_otps (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists email_otps_email_created_idx on email_otps (email, created_at desc);

alter table email_otps enable row level security;
-- Intentionally no policies — default-deny for anon/authenticated roles.
