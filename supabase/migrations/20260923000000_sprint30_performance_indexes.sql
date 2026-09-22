-- =====================================================================
-- Sprint 30: Production engineering — targeted indexes.
--
-- Every index here is justified by a real, currently-shipping query
-- (grepped from src/lib/*-client.ts and src/lib/payments.server.ts),
-- not added speculatively. Existing single-column FK indexes on these
-- tables (see prior migrations) don't cover the sort/filter combination
-- actually used, so Postgres falls back to a full index scan + sort
-- (or a sequential scan) that gets slower as each table grows with
-- real usage. All idempotent (IF NOT EXISTS) and additive only — no
-- existing index, column, or RLS policy is touched.
-- =====================================================================

-- src/lib/jobs-client.ts: the public job board and a company's own job
-- list both filter status='open' then sort by posted_at desc. The
-- existing jobs_status_idx (status alone) doesn't cover the sort.
create index if not exists jobs_status_posted_at_idx on jobs (status, posted_at desc);
create index if not exists jobs_company_status_posted_at_idx on jobs (company_id, status, posted_at desc);

-- src/lib/college-client.ts: a drive's applicant list is sorted by
-- ai_fit_score desc; a student's own application list by applied_at
-- desc. drive_applications_drive_idx / _student_idx are single-column
-- only.
create index if not exists drive_applications_drive_fit_score_idx on drive_applications (drive_id, ai_fit_score desc);
create index if not exists drive_applications_student_applied_at_idx on drive_applications (student_id, applied_at desc);

-- src/lib/notifications-client.ts: the unread-badge count
-- (recipient_id = X AND is_read = false) runs on a short poll interval
-- for every signed-in user. notifications_recipient_idx is
-- (recipient_id, created_at desc) — doesn't help an is_read filter, so
-- this becomes a full per-user index scan as notification history
-- grows. A partial index keeps the index itself small (only unread
-- rows) since is_read flips to true and stays there.
create index if not exists notifications_recipient_unread_idx on notifications (recipient_id) where is_read = false;

-- src/lib/payments-client.ts + payments.server.ts: the premium/
-- entitlement check (profile_id = X AND status IN (...)) runs on
-- nearly every gated action. subscriptions_profile_id_idx is
-- single-column.
create index if not exists subscriptions_profile_id_status_idx on subscriptions (profile_id, status);

-- ---------------------------------------------------------------------
-- Payment-duplication fix. src/lib/payments.server.ts's credit-pack
-- checkout has no uniqueness guard at all today: a double-click, a
-- retried request after a client-side timeout, or (for the mock
-- provider specifically, which activates synchronously with no
-- webhook) two concurrent tabs can each insert a `payments` row and
-- call grant_ai_credits(), double-charging/double-granting. This
-- mirrors the same idempotency-key pattern payment_webhook_events
-- already uses (a unique event_id) rather than inventing a new one.
-- Nullable + partial unique index — every other payment path
-- (subscriptions, course purchases) is already protected by its own
-- table's unique constraint and doesn't need this column.
-- ---------------------------------------------------------------------
alter table payments add column if not exists idempotency_key text;
create unique index if not exists payments_idempotency_key_idx on payments (idempotency_key) where idempotency_key is not null;
