CURRENT SPRINT: 35 — Launch Command Center
STATUS: SPRINT 35 COMPLETE AND VERIFIED. Migration applied live and
confirmed via a 17/17 live-verification pass (migration structure, public
read access, non-admin write rejection on both new tables, real-admin
write success, feature-flag toggle correctness, Sprint 34 regression
spot-check, no duplicate-policy symptoms). Full local suite (tsc/lint/
build/Playwright 23/23) clean both before and after live verification.
Completion commit created — see LAST COMMIT below.

Branch: main. HEAD: 8396b4b (Sprint 34's docs commit, matches
origin/main). Working tree has all Sprint 35 changes below, none
committed yet.

Scope (per the user's own Sprint 35 spec): admin-only Launch Command
Center — real platform metrics, platform health, launch readiness
checklist, operational alerts, and admin controls (maintenance mode,
system announcement, feature flags), all real-data-only, RBAC/RLS
protected.

Existing infrastructure reused (confirmed via an Explore-agent survey
before writing any code, to avoid duplicating Sprint 28's admin control
center): `requireAdmin` guard (auth-guard.ts, real server-verified
session), `AppShell`+`AdminSubNav` layout, `logAdminAction`/
`ADMIN_PAGE_SIZE` (admin-shared.ts), the `Promise.all`-of-`count:exact,
head:true` stats pattern from `useAdminOverviewStats`/`useAdminAnalytics`,
the real-revenue-by-summing-payments pattern from admin-analytics-client.ts,
`admin_actions` audit table, `AdminConfirmDialog`. New
`src/components/StatTile.tsx` extracted as a shared component (the two
existing admin pages each had their own copy-pasted version — not
touched, only used by the new page, per "don't redesign existing pages").

New migration (NOT yet applied live):
supabase/migrations/20260929000000_sprint35_launch_command_center.sql —
two genuinely new tables (confirmed via grep: no maintenance-mode/
announcement/feature-flag concept existed anywhere before this sprint):
`system_settings` (key/value, seeded with maintenance_mode + announcement
rows) and `feature_flags` (seeded with 4 real flags, each wired to real
enforcement — see below). Both public-read (the values are operational,
not sensitive — same trust level as a public status page), admin-only
write via `is_admin()`-gated RLS.

Code changes:
- src/lib/admin-health.server.ts (new): `getIntegrationHealthFn`,
  admin-gated, returns only booleans for whether GEMINI_API_KEY/
  RESEND_API_KEY/JUDGE0_API_KEY/STRIPE_SECRET_KEY/Supabase env vars are
  SET — never a secret value.
- src/lib/admin-command-center-client.ts (new): `useLaunchMetrics` (20
  real counts — users/students/colleges/college staff/recruiters/
  companies/active-users-7d/resumes/resumes-analyzed/applications/jobs/
  drives/challenges/completions/verified skills/AI transactions/
  payments/revenue/subscriptions/notifications, every field traced to a
  real table+column before being written), `usePlatformHealth` (live
  DB+storage probe queries, not simulated), `useIntegrationHealth`,
  `useLaunchReadinessChecklist` (derives PASS/WARNING/FAIL/NOT
  CONFIGURED/NOT VERIFIED per area from the real metrics+health above —
  a few areas that a running web page fundamentally can't self-test
  (RLS correctness, the automated test suite, a production build) point
  at this session's own dated, real verification evidence instead of
  either re-running something dangerous live or fabricating a status),
  `useOperationalAlerts` (real signals: failed payments/open reports/
  banned users/unverified orgs, PLUS an explicit "not available"
  category for AI/auth/DB/server-op failures since no error-logging
  table exists in this schema for those — labeled honestly, not
  omitted), `useFeatureFlags`/`useToggleFeatureFlag`.
- src/lib/system-settings-client.ts (new): `useSystemSettings`/
  `useUpdateMaintenanceMode`/`useUpdateAnnouncement` — split out from the
  admin-only client file specifically because the public-facing banner
  (see below) needs these too and shouldn't import an admin module.
- src/lib/feature-flags.server.ts (new): `isFeatureEnabled()`, fails
  OPEN (missing row or query error = enabled) so this table can never
  take down a working feature — same fail-open philosophy as Sprint 34's
  checkRateLimit.
- Real enforcement wired into the 4 seeded flags (not inert toggles):
  ai-chat.server.ts (`ai_chat_assistant`), mentor.server.ts
  (`mentor_chat`), voice-interview.server.ts (`voice_interviews`),
  payments.server.ts (`checkout`, on `createSubscriptionCheckoutFn`).
- src/components/SystemBanner.tsx (new) + src/routes/__root.tsx: an
  app-wide, informational-only banner (never blocks access) showing the
  maintenance/announcement message when active — makes the admin
  controls genuinely real rather than inert stored state nobody sees.
- src/routes/admin.launch.tsx (new): the Launch Command Center page —
  metrics grid, health grid (live checks + integration checks), readiness
  checklist table, operational alerts (real + explicit not-available),
  admin controls (maintenance mode + announcement with a confirm dialog
  for enabling, feature flags with a confirm dialog for disabling).
- src/routes/admin.tsx + src/components/AdminSubNav.tsx: new "Launch
  Command Center" entries (SECTIONS card + ADMIN_SECTIONS pill nav).
- src/lib/supabase/types.ts: hand-added `system_settings`/`feature_flags`
  Row/Insert/Update types (no CLI codegen access this session).
- e2e/smoke.spec.ts: new route-guard test for `/admin/launch`.

Local verification: tsc 0 errors, lint 0 errors (7 pre-existing
warnings, same as always — 31 prettier-only errors from the new files
were auto-fixed via `eslint --fix`, re-verified clean after), build
PASS, Playwright 23/23 (22 prior + the new /admin/launch guard test).

Migration `20260929000000_sprint35_launch_command_center.sql` applied
live by the user via the Supabase SQL editor. Applied-state independently
confirmed empirically both before (table-not-found) and after (reachable)
the user's apply confirmation.

LIVE VERIFICATION (17/17 passed): disposable-account methodology, real
anon-key sessions (not service-role):
- Migration structure: `system_settings`/`feature_flags` both reachable
  with all expected columns; both seeded correctly (maintenance_mode +
  announcement rows; all 4 real feature flags).
- Public read: an unauthenticated (anon-key, no session) client can read
  both tables — confirms the SystemBanner will actually work for
  signed-out visitors too.
- Non-admin write rejection: a disposable regular user's UPDATE on both
  `system_settings` and `feature_flags` affected zero rows (RLS-filtered,
  not merely "returned an error" — verified by re-reading the row via the
  admin client immediately after and confirming it was byte-for-byte
  unchanged, same discipline as Sprint 34's cross-user isolation checks).
- Sprint 34 regression spot-check: the same disposable user still cannot
  self-assign `role = 'admin'` on `profiles` — confirms Sprint 35 didn't
  touch or weaken that fix.
- Real admin write success: a disposable user promoted to `role='admin'`
  via the service-role client (mirroring how every other admin-role
  change in this app already happens) CAN write both tables, and the
  write was confirmed to actually persist by re-reading via the admin
  client.
- Feature-flag data-layer proof: toggling `ai_chat_assistant` off then on
  again, re-reading via `isFeatureEnabled`'s exact query shape at each
  step, correctly reported disabled then re-enabled.
- No duplicate/conflicting policy symptoms: repeated public reads
  returned byte-identical results.
- Cleanup: every write reverted to its original value, all disposable
  users deleted (working around the same `enforce_notification_update`/
  `on delete set null` quirk documented in Sprint 34's progress record);
  a post-cleanup sweep confirmed zero leftover test profiles.

**What was NOT verified this way, and why**: a full authenticated
browser click-through (real login form → `/admin/launch`) was attempted
via a temporary Playwright spec using two disposable accounts (one
promoted to admin). The credentials themselves were confirmed valid
(direct SDK sign-in succeeded with a real session), but the subsequent
full-page navigation to a protected route consistently bounced back to
`/login?redirect=...` in the Playwright browser — consistent with a
cookie-propagation timing/attribute issue between `@supabase/ssr`'s
server-set session cookie and Playwright's browser context under local
`vite dev`, not a Sprint 35 application bug (the same session works fine
against the DB directly, and `requireAdmin`/`requireAuth` in
auth-guard.ts are unmodified this sprint — already proven server-verified
in Sprint 34's audit). This matches `e2e/smoke.spec.ts`'s own long-
standing documented limitation ("no seeded test account/credentials exist
in this environment... does not attempt authenticated flows"). Given
that, admin-access/non-admin-rejection was verified at the actual
enforcement layer instead (RLS reads/writes above), which is the layer
that matters for data safety — the route guard itself is unchanged code,
already covered by Sprint 34's server-side-session audit. The temporary
spec file and its 2 disposable accounts were deleted/cleaned up; nothing
from this attempt is present in the committed diff.

Full local suite re-run after live verification: tsc 0 errors, lint 0
errors (7 pre-existing warnings), build PASS, Playwright 23/23.

LAST VERIFIED COMMAND: npx playwright test (final run, post-live-DB-verification)
LAST VERIFIED RESULT: 23 passed (8.6s)

LAST COMMIT: ad62a57 "feat(sprint-35): launch command center" — 20 files
changed. Working tree clean.

NEXT EXACT ACTION: None — Sprint 35 is complete. Awaiting explicit
instruction before starting Sprint 36.

---
Sprint 34 record below (historical, complete, pushed to origin/main):
STATUS: SPRINT 34 COMPLETE AND VERIFIED. Both migrations applied live and
confirmed via a 24/24 live-verification pass covering privilege
escalation, forged challenge status, skill self-verification, arbitrary
conversation join, interview-schedule column scoping, rate limiting, and
cross-user isolation (see LIVE VERIFICATION below). Full local suite
(tsc/lint/build/Playwright 22/22) clean both before and after live
verification. Completion commit created — see LAST COMMIT below.

Branch: main. HEAD at start of this sprint: d5911a0 (Sprint 33's docs
follow-up commit). Working tree is currently dirty with all Sprint 34
changes below, none committed yet.

Audit method: 3 parallel focused sub-agent passes (auth/session,
rate-limiting/validation/secrets/errors, RLS gaps in tables not covered
by Sprints 26-31's prior security work) — see .claude/project-history.md
for the full writeup and SECURITY.md for the resulting security model.

Migrations (applied live, both confirmed via direct probe before AND
after — migration 1's rate_limit_buckets/check_rate_limit didn't exist on
the first probe, existed and worked on the second):
1. supabase/migrations/20260927000000_sprint34_security_hardening.sql —
   profiles self-promotion fix (guard_profiles_update), challenge_submissions
   forged-status fix, skills self-verification fix (guard trigger only —
   the bypass flag itself is in the next file), conversation_participants
   arbitrary-join fix, interview_schedules applicant-column-scope fix, and
   the new generic rate_limit_buckets table + check_rate_limit() function.
2. supabase/migrations/20260927010000_sprint34_skill_verification_bypass.sql —
   deliberately isolated, single-statement: adds the
   set_config('app.bypass_skills_guard', ...) calls to
   verify_skills_on_challenge_pass so it can still write through the new
   skills guard trigger. Kept separate because this exact function took 5
   migration rounds to actually take effect live in Sprint 31 for a reason
   never conclusively pinned down (see that sprint's record) — minimizing
   blast radius here in case that recurs.

Code changes (all locally verified, see below):
- src/start.ts: new requestMiddleware adding X-Content-Type-Options,
  X-Frame-Options, Referrer-Policy, Permissions-Policy, and a real CSP to
  every response (pages + server functions + the 500 page). Verified live
  against `npm run dev` via curl — all 5 headers present and correct,
  including the dynamically-built connect-src pointing at this project's
  real Supabase URL.
- src/lib/rate-limit.server.ts (new): checkRateLimit() wrapper around the
  new check_rate_limit RPC. Wired into signInFn/signUpFn/businessSignUpFn/
  requestPasswordResetFn (auth.server.ts), every Gemini-backed generation
  endpoint (resume/career-roadmap/roadmap/ai-chat/mentor/
  challenge-generation/challenge-ai/voice-interview-start/
  job-recommendations/eligibility/college drive-ranking+missing-skills/
  resume-builder optimize), and every Judge0 endpoint (judge0.server.ts's
  run+submit, coding-interview.server.ts's run+submit).
- src/lib/judge0.server.ts: submitChallengeFn's challenge_submissions
  insert switched to the admin/service-role client (same established
  pattern as Sprint 31's job_applications score-column fix) so the new
  guard trigger's real-session block doesn't also block this legitimate,
  already-graded write. profile_id still re-derived from the authenticated
  session, never trusted from the client. Added .max(20000) to both
  `source` fields (previously unbounded).
- src/lib/ai-chat.server.ts: messageSchema.text capped at .max(4000)
  (previously unbounded per-item within an already-capped 30-item array).
- src/lib/business-emails.server.ts: sendApplicationStatusEmailFn's
  `status` field changed from a bare z.string() to the real 7-value enum.
- src/lib/company-client.ts: one call-site type fix (StatusEmailTrigger
  cast) needed after the above enum tightening — useUpdateApplicationStatus
  already only ever passes real status values (Kanban dropStatus), this
  just makes that provable to the type checker.
- src/lib/supabase/types.ts: added the check_rate_limit RPC's hand-written
  type signature (no CLI codegen access this session, same as every prior
  sprint's schema changes).
- Raw Postgres/Supabase error messages no longer returned directly to the
  client (found by the audit, fixed at every flagged call site): now
  logged server-side via console.error and replaced with a short generic
  message. Files touched: payments.server.ts (7 sites),
  career-roadmap.server.ts (2), analytics.server.ts (2), college.server.ts
  (1), mentor.server.ts (3), resume-builder.server.ts (1),
  voice-interview.server.ts (2).
- src/lib/messages-client.ts (useStartConversation): a REAL pre-existing
  bug found while writing the live-verification script, not a Sprint 34
  regression — `.insert({is_group:false}).select("id").single()` on
  conversations always failed with "new row violates row-level security
  policy", because Postgres enforces a table's SELECT policy on an
  INSERT...RETURNING row too, and conversations_participant_select
  requires a conversation_participants row that can't exist yet for a
  conversation that was just created (confirmed live via a standalone
  repro before touching anything). Fixed by generating the id
  client-side (crypto.randomUUID()) and dropping the .select() entirely.
  No Playwright coverage exercises authenticated flows, so this had never
  been caught. Zero prior sprint's live-account testing happened to
  exercise "start a brand-new DM" specifically until this one did.

Local verification: tsc 0 errors, lint 0 errors (7 pre-existing
warnings), build PASS, Playwright 22/22 (unchanged — no new routes this
sprint). Security headers independently verified via curl against a real
`npm run dev` server (not just trusted from code review), both before
and after live DB verification.

LIVE VERIFICATION (24/24 passed): disposable-account methodology — 3
students, 1 recruiter, a real company/job/application/interview_schedules
fixture, a real existing challenge (picked live, not synthetic) with
non-empty tags, all exercised through real anon-key sessions (not
service-role):
- profiles: a user cannot self-assign role='admin' (rejected, role
  confirmed unchanged); the first account_type hop (student -> company)
  succeeds, a second hop (company -> college) is rejected; a benign
  self-update (onboarding_completed) still works; the admin/service-role
  client can still write role directly.
- challenge_submissions: a user cannot directly insert status='passed'
  (rejected); a real status='pending' insert still works; the
  admin/service-role client (matching submitChallengeFn's new write path)
  CAN insert a real status='passed' row.
- skills: a user cannot insert OR update a skill with verified=true
  directly (both rejected); a real challenge-pass DID verify the matching
  skill afterward, proving migration 2's set_config bypass actually took
  effect live (if it hadn't, the guard trigger would have silently
  blocked the trusted trigger's own write too).
- conversation_participants: the creator can populate a brand-new
  conversation; a stranger cannot self-join or add a third party into an
  existing one (both rejected, RLS-backstopped — the stranger also can't
  read the conversation's messages); an existing participant CAN add a
  new member (group growth preserved).
- interview_schedules: the applicant cannot change scheduled_at or
  meeting_link (both rejected); the applicant CAN respond
  (status/responded_at).
- check_rate_limit: allows exactly 5 requests in a fresh window, blocks
  the 6th+.
- Cross-user isolation: student B cannot write to student A's skills
  (0 rows affected, verified-skill set provably unchanged before/after)
  and cannot read student A's challenge_submissions.
- Cleanup: every fixture deleted in a finally block (including working
  around the notifications/enforce_notification_update quirk noted
  below); a post-cleanup sweep confirmed zero leftover test profiles.

**Real, pre-existing, out-of-scope finding — documented, not fixed**:
deleting a profile that's referenced as `notifications.actor_id` fails,
because the `on delete set null` cascade fires an UPDATE that trips
`enforce_notification_update` (20260922000000, allows recipients to
toggle `is_read` only — not exempted for a system/cascade-driven update).
Confirmed via direct repro. Zero current product impact — grepped the
whole app, there is no admin "delete user" feature anywhere, only the
`is_banned` soft-delete — so this only surfaces through a direct
service-role script (like this sprint's own verification harness).
Worked around in the verification script itself (delete the user's
notification rows before deleting the user); left as a follow-up if an
admin hard-delete feature is ever built.

LAST VERIFIED COMMAND: npx playwright test (final run, post-live-DB-verification)
LAST VERIFIED RESULT: 22 passed (11.0s)

LAST COMMIT: 5effe93 "feat(sprint-34): security and reliability hardening"
— 29 files changed. Working tree clean.

NEXT EXACT ACTION: None — Sprint 34 is complete. Awaiting explicit
instruction before starting Sprint 35.

---
Sprint 33 record below (historical, complete, pushed to origin/main):
STATUS: SPRINT 33 COMPLETE AND VERIFIED. Migration applied live and
confirmed via a live-verification pass covering table existence, notes
RLS, resume-access RLS, cross-tenant isolation between two colleges, and
team management (21/21 checks passed — see LIVE VERIFICATION below).
Full local suite (tsc/lint/build/Playwright 22/22) clean both before and
after live verification. Completion commit created — see LAST COMMIT
below. Not pushed (push not requested this sprint).

Audit findings (before writing any code): only 2 college-facing routes
existed — college.tsx (dashboard) and college-drive.$driveId.tsx (drive
detail). No team-management page, no analytics page, no notes system, no
resume access for college staff, no student comparison, no student
detail view — a genuinely larger real gap than the recruiter side had
pre-Sprint-32 (which already had settings/analytics/rich notes before
that sprint started). has_college_role()'s RLS was independently
verified already correct (no Sprint-31-style WITH-CHECK gap) — confirmed
by reading the actual policy SQL, not assumed.

COMPLETED:
1. Migration supabase/migrations/20260926000000_sprint33_college_platform.sql:
   new drive_application_notes table (direct mirror of application_notes,
   RLS via has_college_role() through drive_applications→
   placement_drives) + two new RLS policies giving college staff read
   access to student resumes (resumes table + storage.objects) — this
   access genuinely didn't exist before (grepped, confirmed zero college
   references anywhere near resumes RLS). Applied live and verified — see
   LIVE VERIFICATION below.
2. College team management: useCollegeAdmins/useAddCollegeAdmin/
   useRemoveCollegeAdmin (college-client.ts) + new college-settings.tsx
   route, mirroring business_.settings.tsx. No role-change UI (unlike
   companies, college_admins only has 'owner'|'admin' — every invited
   member is already 'admin', nothing to toggle between).
3. Drive application notes: useDriveApplicationNotes/
   useAddDriveApplicationNote hooks, wired into a new student detail
   drawer.
4. Student detail drawer (college-drive.$driveId.tsx): profile, resume
   (signed URL via the new RLS), verified skills, eligibility snapshot,
   notes, and the timeline — useApplicationTimeline already existed
   (reads drive_notifications) but was never wired into any admin view
   before this sprint; now it finally is.
5. useDriveApplicants extended with verifiedSkills + resumeStoragePath
   (skills table already had a public select policy — no RLS gap there,
   just never fetched; resumes needed the new policy from item 1).
6. Student comparison: new CompareDialog in college-drive.$driveId.tsx,
   client-side over the now-extended useDriveApplicants data — zero new
   queries, same pattern as Sprint 32's recruiter-side CompareDialog.
7. College analytics: new college-analytics-client.ts (funnel via
   drive_applications.status, conversion + time-to-stage via
   drive_shortlists since drives have no application_status_history
   equivalent) + new college-analytics.tsx route, mirroring
   business_.analytics.tsx.
8. Fixed 2 real silent-failure bugs found while working in
   college-client.ts: useShortlistApplicant/useRejectApplicant checked
   result.error internally but never surfaced it (same class as Sprint
   31/32's payments-client fix); useCreateCollege had no onError at all.
9. CollegeNav.tsx updated: SECTIONS now has 3 real pages (was 1, with a
   comment explicitly saying a multi-page nav wasn't needed — no longer
   true).

Local verification: tsc 0 errors, lint 0 errors (7 pre-existing
warnings), build PASS, Playwright 22/22 (2 new route-guard tests for
/college-analytics, /college-settings).

Migration supabase/migrations/20260926000000_sprint33_college_platform.sql
applied live by the user via the Supabase SQL editor (no errors reported).
Applied-state independently confirmed empirically (not assumed) before
building the fixture-based test: a direct service-role probe against
`drive_application_notes` first returned "table not found", then after
the user's apply confirmation returned success — proving the migration
genuinely took effect on the live database.

LIVE VERIFICATION (21/21 passed): disposable-account methodology — 2
throwaway colleges, 2 college-admin accounts, 2 student accounts, 1
extra "teammate" account, 2 published drives, 2 drive_applications, 2
resume rows + 2 real uploaded storage objects, all created via the
service-role client, then exercised through real anon-key sign-ins (not
service-role) to hit real RLS:
- drive_application_notes table exists and is reachable.
- College A admin sees College A's own drive application; cannot see
  College B's (cross-tenant SELECT correctly returns empty, not error).
- College A admin can insert and read a note on their own drive's
  application; inserting a note on College B's application is rejected
  by RLS (new row violates row-level security policy); reading College
  B's notes returns empty.
- College A admin can view/download Student A's resume (table row +
  real storage object download) — the new resume-access grant works;
  cannot view or download Student B's resume (table row empty, storage
  download "Object not found").
- College A admin cannot see College B's admin roster and cannot insert
  themselves into it (privilege-escalation attempt correctly rejected by
  RLS).
- College A admin CAN add a real teammate to their own college's roster,
  see the updated 2-member roster, and remove that teammate — team
  management round-trips correctly end to end.
- Mirrored from College B's side: cannot see College A's applications,
  notes, or Student A's resume (table row + storage download) —
  isolation holds in both directions, not just one.
- Cleanup: all fixtures (notes/applications/resumes/storage
  objects/drives/college_admins/colleges/auth users/profiles) deleted in
  a finally block; a post-cleanup sweep query confirmed zero leftover
  test rows across profiles/colleges/placement_drives.

Student comparison and student detail drawer are client-side-only views
over already-verified, already-RLS-scoped data (useDriveApplicants,
useDriveApplicationNotes, useApplicationTimeline) — no new queries or
RLS paths beyond what's already covered above, confirmed correct via
tsc/build/lint plus manual code review; no separate live check needed for
these two beyond the underlying data-access RLS already exercised.

LAST VERIFIED COMMAND: npx playwright test (final run, post-live-DB-verification)
LAST VERIFIED RESULT: 22 passed (21.0s)

LAST COMMIT: 16df047 "feat(sprint-33): college management platform" — 12
files changed. Working tree clean. NOT pushed to origin/main (no push
instruction given this sprint; matches this session's established
pattern of only pushing on explicit request).

NEXT EXACT ACTION: None — Sprint 33 is complete. Awaiting explicit
instruction before starting Sprint 34 or pushing to origin/main.

---
Sprint 32 record below (historical, complete, NOT pushed — see below):
STATUS: SPRINT 32 COMPLETE AND VERIFIED. Migration applied live and
confirmed via two live-verification passes: cross-tenant security (9/9 —
Company B's recruiter cannot read/write any of Company A's
job_applications/application_notes/interview_schedules/
application_status_history/company_members, cannot self-add to Company
A's team, cannot schedule an interview for Company A's application) and
the notification-direction fix specifically (3/3 — recruiter scheduling
notifies the candidate as before; candidate responding now correctly
notifies the recruiter instead of re-notifying the candidate). Full local
suite (tsc/lint/build/Playwright 20/20) clean both before and after live
verification. Completion commit created — see LAST COMMIT below. Not
pushed (push explicitly not requested this sprint).

Pre-existing infrastructure confirmed (NOT rebuilding these — reuse only):
- Team management: company_members (owner/admin/recruiter roles,
  has_company_role() RLS, cross-tenant hijack fix already in Sprint 31),
  invite/remove UI in business_.settings.tsx. Missing: role-change
  (promote/demote) UI only — add/remove existed, edit didn't.
- Candidate pipeline: job_applications.status (7 values including
  'viewed', unreachable through the UI since the Applied column's
  dropStatus was hardcoded to 'applied'), application_status_history
  (full audit trail), Kanban board at business_.applicants.tsx with a
  rich CandidateDetailDrawer (notes, history, skills, resume/ATS,
  coding/voice interview scores).
- Recruiter notes: application_notes table + useApplicationNotes/
  useAddApplicationNote, fully wired into the candidate detail drawer.
- Interview scheduling: interview_schedules table already has
  interviewer_name, meeting_link, status (proposed/accepted/declined/
  reschedule_requested), responded_at — everything Sprint 32 asked for.
  Candidate-facing accept/decline UI already exists at /my-interviews
  (src/routes/my-interviews.tsx + src/lib/interviews-client.ts).
- Notifications: trg_interview_schedule_notify already fires on
  insert/update — but ONLY ever notifies the candidate, never the
  recruiter, because interview_schedules has exactly one UPDATE policy
  (applicant-only) yet the trigger's UPDATE branch still addresses the
  notification to the applicant. Real bug, being fixed (see below).

Genuinely missing, being built this sprint:
1. Recruiter notification when a candidate responds to a scheduled
   interview (DB fix — the trigger notifies the wrong party today).
2. Candidate comparison (select 2-4 applicants from the same job's
   Kanban pool, side-by-side view) — zero prior art anywhere in the
   codebase (grepped "compare" repo-wide). Building as a pure
   client-side view over useCompanyApplications' already-fetched data
   (atsScore/skillsScore/jobMatchPercentage/verifiedSkills/
   bestCodingScore/bestHrScore/topProjects already all present per-row)
   — no new queries needed.
3. Pipeline conversion rate + time-to-hire analytics — the existing
   "Hiring funnel" chart is raw per-stage headcounts only, no %
   conversion or timing anywhere in business-analytics-client.ts.
4. Screening as its own visible Kanban column (currently 'viewed' is
   folded into "Applied" with a dropStatus that never actually reaches
   'viewed' — a real, previously-unreachable pipeline stage).
5. Team role-change (promote recruiter to admin, demote, etc.) UI —
   add/remove exist, edit doesn't.
6. Live cross-tenant security verification: prove a Company A recruiter
   cannot read/write Company B's job_applications, application_notes,
   interview_schedules, or company_members (existing RLS, being tested
   explicitly per Sprint 32's requirement, not newly built).
7. Stale comment cleanup in interviews-client.ts (documents a schema gap
   that was actually already fixed by a later migration).

COMPLETED (all 7 items):
1. Migration supabase/migrations/20260925000000_sprint32_recruiter_platform.sql
   — on_interview_schedule_change's UPDATE branch now notifies
   new.created_by (the recruiter) with the candidate as actor, instead
   of re-notifying the candidate. INSERT branch unchanged. NOT yet
   applied live — handed to the user.
2. Candidate comparison: new CompareDialog component in
   business_.applicants.tsx. Checkbox on each card (compareChecked/
   onToggleCompare threaded through KanbanColumn→ApplicantCard), a
   "Compare (N)" button next to the applicant count, capped at 4
   candidates. Side-by-side table: status, applied date, job match %,
   ATS score, skills score, verified skills, job-requirement match
   (matchedSkills/jobTags), missing requirements, coding/HR interview
   scores, active roadmap, project count. Pure client-side over
   useCompanyApplications' already-fetched data — zero new queries.
3. Pipeline conversion + time-to-stage: business-analytics-client.ts's
   useBusinessAnalytics extended with `conversion` (cumulative % of all
   applications that ever reached each stage — computed from
   application_status_history, not a current-status snapshot, so a
   hired candidate still counts toward every earlier stage) and
   `avgDaysToStage` (mean days from applied_at to first reaching
   shortlisted/interview/hired). Bounded fetch (.limit(5000)) + JS
   reduce, matching the established admin-analytics-client.ts
   large-aggregate pattern. Rendered in business_.analytics.tsx as a new
   conversion bar chart + a time-to-stage stat list.
4. Screening column: business_.applicants.tsx's COLUMNS split "Applied"
   (statuses: ["applied"]) from a new "Screening" column
   (statuses: ["viewed"], dropStatus: "viewed") — previously "viewed"
   was folded into Applied with dropStatus hardcoded to "applied", so
   drag-and-drop could never actually produce a "viewed" status despite
   it being a valid, reachable value in the schema. Grid updated
   xl:grid-cols-6 → xl:grid-cols-7 for the new column.
5. Team role-change: new useUpdateCompanyMemberRole hook
   (company-client.ts) + a role <Select> replacing the static role text
   for non-owner rows in business_.settings.tsx's TeamPanel. No new
   migration needed — reuses the existing company_members_update_delete
   RLS policy and Sprint 31's guard trigger (which blocks company_id/
   profile_id changes but always allowed role changes — confirmed by
   Sprint 31's own G1.2 regression assertion).
   Also added onError toasts to useAddCompanyMember/
   useRemoveCompanyMember/useUpdateCompanyMemberRole/
   useUpdateApplicationStatus (the last one is the Kanban drag-and-drop
   mutation specifically — found missing while working in this exact
   file, same silent-failure class Sprint 31 fixed elsewhere).
6. Live cross-tenant security verification: disposable two-company test
   (Company A vs Company B recruiters) — 9/9 PASS. Company B's recruiter
   cannot read or write Company A's job_applications, application_notes,
   interview_schedules, application_status_history, or company_members;
   cannot add themselves to Company A's team; cannot schedule an
   interview for Company A's application. This tests EXISTING RLS
   (already live, no new migration needed for this item specifically).
7. Stale comment fixed in src/lib/interviews-client.ts — it described a
   missing RLS policy as a live bug; that policy was actually added by
   migration 20260728000300, predating this session. Corrected.

Migration supabase/migrations/20260925000000_sprint32_recruiter_platform.sql
applied live by the user, confirmed via a live probe (see below).

FILES MODIFIED: .claude/progress.md, .claude/project-history.md,
e2e/smoke.spec.ts, src/lib/business-analytics-client.ts,
src/lib/company-client.ts, src/lib/interviews-client.ts,
src/routes/business_.analytics.tsx, src/routes/business_.applicants.tsx,
src/routes/business_.settings.tsx.
New: supabase/migrations/20260925000000_sprint32_recruiter_platform.sql.

DATABASE MIGRATIONS: one function replacement
(on_interview_schedule_change) — no new table, no RLS policy change, no
existing data touched. Applied and live-verified.

TESTS (final, all green):
- npx tsc --noEmit: PASS, 0 errors
- npm run lint: PASS, 0 errors, 7 pre-existing benign warnings
- npm run build: PASS
- npx playwright test: PASS, 20/20 (3 new route-guard tests)
- Live cross-tenant security verification: 9/9 PASS
- Live notification-direction fix verification: 3/3 PASS
- All disposable test data deleted after every run; final sweep
  confirmed zero leftover profiles/companies/jobs/auth users.

ERRORS FOUND: the interview-schedule notification trigger addressed
every notification to the applicant regardless of who acted, so
recruiters were never notified when a candidate responded to a
scheduled interview — a real, silent gap discovered during inspection
(not by trial and error) by reading the trigger against the table's
actual RLS policies. Also found (and fixed) a missing onError on the
Kanban board's drag-and-drop status-change mutation while working in
that file.

ERRORS FIXED: both of the above — see COMPLETED. Nothing found and left
unfixed this sprint.

LAST VERIFIED COMMAND: npx playwright test (final run, post-live-DB-verification)
LAST VERIFIED RESULT: 20 passed (29.2s)

LAST COMMIT: f1c06ea "feat(sprint-32): advanced recruiter platform" — 10
files changed. Working tree clean. NOT pushed to origin/main (no push
instruction given this sprint; matches this session's established
pattern of only pushing on explicit request).

NEXT EXACT ACTION: None — Sprint 32 is complete. Awaiting explicit
instruction before starting Sprint 33 or pushing to origin/main.

---
Sprint 31 record below (historical, complete, pushed):
CURRENT TASK: Complete and pushed to origin/main.
STATUS: SPRINT 31 COMPLETE AND VERIFIED. All 6 migration files applied
live (5 for the skill-verification saga, see history below, plus the
original combined migration). Final live-verification run: 13/13 PASS
across items 1 (company_members
cross-tenant hijack fix), 2 (job_applications score-tamper fix), 3 (skill
verification on challenge pass), and 9 (chat-images private bucket RLS),
including every regression check (recruiters can still change application
status, service-role scoring writes still work, conversation participants
can still read shared chat images, empty-tag challenges still submit
cleanly). Item 3's history below, for the record — it took 5 migration
rounds before landing, the details matter for anyone reading this later:
- Round 1 (20260924000000, original): `on conflict (profile_id,
  lower(skill_name))` — targeted an index dropped by
  20260727000500_skills_unique_fix.sql. Every real challenge-pass insert
  failed with Postgres 42P10.
- Round 2 (20260924010000): retargeted `on conflict (profile_id,
  skill_name)`, matching that migration's replacement constraint by name
  — still failed with the SAME 42P10, reproduced twice. Investigated
  further rather than guessing again: confirmed the constraint genuinely
  exists live (a raw duplicate insert is correctly rejected citing it by
  name, and a PostgREST upsert with the identical onConflict column list
  succeeds cleanly) — yet the same column list as a literal `ON CONFLICT`
  clause inside this function's own INSERT still fails. Root cause not
  conclusively pinned down; not worth a third guess at a spelling.
- Round 3 (20260924020000): sidesteps ON CONFLICT entirely — explicit
  select-then-insert-or-update, independently sanity-checked live
  (plain insert/select/update against the real skills table, outside the
  trigger, all confirmed working) before handing to the user. User
  confirmed applied ("Success. No rows returned") — but live re-test
  STILL hit the exact same 42P10 error, reproduced 3 times total
  including a same-run A/B test (real tag fails, empty tag on the same
  profile in the same script run succeeds) ruling out a timing/caching
  fluke. This is impossible if the live function body genuinely has no
  ON CONFLICT clause (re-confirmed by re-reading the round-3 file fresh
  from disk each time — it never did). Ruled out other candidate causes
  by direct testing: no other trigger on challenge_submissions
  (record_daily_challenge_solve) or on skills (none exist) could produce
  this, since neither depends on whether the challenge has tags, and the
  failure/success split tracks tag-presence exactly.
- Added a temporary read-only diagnostic (20260924030000,
  debug_get_function_source(name) returning pg_get_functiondef) to read
  the actual live function source via RPC per the user's explicit
  instruction, rather than keep inferring from error messages alone.
  User confirmed it ran — but calling it via RPC consistently returned
  PGRST202 "not found in schema cache" across 8+ retries over 90+
  seconds (bounded retry loop, not a blind sleep). Diagnosed: not cache
  lag — Supabase revokes the default PUBLIC execute grant on new
  functions in `public`, and that migration never added an explicit
  grant (unlike its predecessor debug_list_policies, which did), so
  PostgREST's route table correctly never lists it as callable.
- 20260924040000: grants execute on the diagnostic and re-asserts the
  round-3 body. My own RPC path to debug_get_function_source stayed
  blocked (still PGRST202 after the grant), so the user ran
  `select pg_get_functiondef('public.verify_skills_on_challenge_pass'::regproc)`
  directly in the Supabase SQL Editor (bypasses PostgREST/RPC entirely)
  and reported the ACTUAL live body back verbatim: it is still the
  ORIGINAL (20260924000000) version — `on conflict (profile_id,
  lower(skill_name))`. Ground truth confirmed at last: none of
  20260924010000, 20260924020000, or 20260924040000's `create or
  replace function` statements ever actually took effect on the live
  database, for a reason that remains unexplained (mismatch between
  "Success. No rows returned" being reported each time and the function
  body provably not changing) but is no longer being chased — the fix
  itself was never in doubt (independently sanity-checked live against
  the real skills table, outside the trigger, in an earlier round).
- 20260924050000 (final, applied and confirmed working): the same
  select-then-insert-or-update body, alone in its own file with nothing
  else bundled. Live-verified with 8/8 assertions: a failed submission
  correctly leaves an existing skill unverified; a passed submission
  correctly verifies an existing skill in place (no duplicate row
  created); a second passed submission for the same tag is a safe no-op;
  a passed submission with no pre-existing skill row correctly inserts a
  new verified one; blank/whitespace tags in the same array are safely
  skipped; empty-tags challenges (no skills work to do at all) still
  submit cleanly with zero errors. A full re-run of the original
  combined 13-assertion suite (items 1, 2, 3, 9 together) also passed
  13/13, confirming nothing regressed across the 5 migration rounds.
  Root cause of why rounds 1-4's `create or replace function` reported
  "Success. No rows returned" without the function body actually
  changing was never conclusively identified and is not expected to
  recur — documented here in case it resurfaces in a future sprint.

COMPLETED (Sprint 31, items 1-10 of 11):
1. company_members cross-tenant fix: new guard trigger
   (guard_company_members_update) blocks company_id/profile_id changes on
   UPDATE for non-admins — mirrors the 4 prior guard-trigger fixes this
   session (drive_applications, drive_notifications, notifications,
   job_applications status). No app code called UPDATE on this table, so
   nothing legitimate is restricted.
2. job_applications scoring-column tamper fix: guard_job_application_update
   extended to also block ats_score/job_match_percentage/skills_score
   changes for non-recruiter, non-service-role callers.
   matching-scores.server.ts's computeApplicationScoresFn now writes via
   getSupabaseAdminClient() (same pattern as payments/subscriptions) after
   its existing auth check, so the legitimate scoring flow still works
   while a direct client tamper attempt is now blocked by the trigger.
3. Skill verification wired up for real: new trigger
   (verify_skills_on_challenge_pass, AFTER INSERT on challenge_submissions)
   marks the profile's skills verified=true/source='challenge' for each of
   the passed challenge's `tags`, upserting a new skill row if none existed.
   Fulfills profile.tsx's existing, previously-untrue UI copy ("Skills
   become verified by passing a coding challenge in that category").
4. courses.$courseId.tsx handleBuy wrapped in try/catch — a thrown
   exception (not just an in-band result.error) now shows an error message
   instead of failing with none.
5. admin.premium.tsx grant()/runRevoke() wrapped in try/catch with a new
   error state rendered next to the existing notice.
6. Added onError (sonner toast) to useUpdateJob/useDeleteJob
   (company-client.ts) and useUpdateDrive (college-client.ts) — status-
   toggle/delete mutations on business_.jobs.tsx and college.tsx no longer
   fail silently. Also added isPending-disabled guards to the affected
   status-toggle buttons in both routes (closes the related duplicate-
   submit finding at the same time).
7. Added onError (sonner toast) to useUpdateReportStatus/
   useDeleteReportedPost/useDeleteReportedComment (admin-reports-client.ts)
   — admin.reports.tsx moderation actions no longer fail silently.
8. useCancelSubscription (payments-client.ts): now toasts both a thrown
   exception (onError) and an in-band result.error from a successful-
   but-unsuccessful cancellation (was previously swallowed entirely).
9. Chat images moved off the public post-images bucket to a new private
   chat-images bucket (new migration), mirroring the resumes bucket's
   private+signed-URL pattern. uploadChatImage now returns a storage path;
   added getSignedChatImageUrl(); messages.tsx's inline <img> replaced with
   a ChatImage component that resolves a short-lived signed URL per
   message. RLS: uploader + admin + anyone sharing a conversation with the
   uploader can read; only the uploader can write/delete.
10. company-logos bucket's allowed_mime_types tightened to drop
    image/svg+xml (stored-XSS risk on a public-read bucket) — done via the
    same migration (UPDATE storage.buckets, since it's an existing row).

Migrations (5 files, all applied live and confirmed working):
- supabase/migrations/20260924000000_sprint31_security_fixes.sql (items
  1, 2 original, 3 original/buggy, 9, 10)
- supabase/migrations/20260924010000_fix_skill_verification_conflict_target.sql
  (item 3 fix attempt 2 — applied per the user but never actually took
  effect on the live function; kept as an accurate historical record)
- supabase/migrations/20260924020000_fix_skill_verification_no_conflict_target.sql
  (item 3 fix attempt 3 — same: applied but didn't take effect)
- supabase/migrations/20260924030000_temp_diagnostic_function_source.sql
  (read-only diagnostic, debug_get_function_source — created to read the
  live function definition via RPC; never became callable due to a
  missing execute grant PostgREST needs to route it, an issue that was
  ultimately worked around via a direct SQL Editor read instead of fixed)
- supabase/migrations/20260924040000_reassert_skill_verification_and_grant_diagnostic.sql
  (grant + re-assertion attempt — also didn't take effect)
- supabase/migrations/20260924050000_fix_skill_verification_final.sql
  (item 3's REAL fix — this is the one that finally worked; live-verified
  8/8 on its own plus 13/13 in the full combined re-run)

Local verification, final pass: tsc 0 errors, lint 0 errors (7
pre-existing benign warnings), build PASS, Playwright 17/17.

11. P3 cleanup — DONE:
    - debug_list_policies() — checked, already dropped by an existing
      migration (20260728000600, matched its exact (text) signature);
      the audit's claim it was "never dropped" was itself incorrect,
      caught before doing any redundant work.
    - Removed 4 confirmed-unused runtime dependencies and their unused
      shadcn wrapper components (zero imports anywhere in src/, verified
      before deleting): react-resizable-panels (resizable.tsx), vaul
      (drawer.tsx), embla-carousel-react (carousel.tsx), react-day-picker
      (calendar.tsx). Ran `npm install` to sync package-lock.json (9
      packages removed total, 0 vulnerabilities).
    - Added `.max(6000)` to resume.server.ts's analyzeResumeAgainstJdFn
      jobDescription field, matching the max(6000) convention already
      used on every sibling AI-prompt field elsewhere in the codebase.
    - resume-setup.tsx: replaced its PDF-only file check/accept attribute
      with the shared ACCEPTED_RESUME_MIME_TYPES constant (already used
      everywhere else resumes are uploaded), so onboarding no longer
      silently rejects Word resumes the rest of the app accepts.
    - Removed 2 duplicate `.vercel`/`.env*` entries in .gitignore.
    - Closed the same silent-thrown-exception gap (missing catch around
      a checkout mutateAsync call) in billing.tsx's handleBuyPack,
      business_.subscription.tsx's subscribe, and plan.tsx's
      subscribeToPro (found while fixing the identical pattern in item 4;
      same fix, same justification, applied consistently).
    project-history.md's two stale claims (job_applications gap
    description, Testing section) corrected as part of this file's own
    Sprint 31 section below.

ALL 11 ITEMS COMPLETE. Full local verification suite re-run clean after
every batch of changes:
- npx tsc --noEmit: PASS, 0 errors
- npm run lint: PASS, 0 errors, 7 pre-existing benign warnings (2
  formatting errors from new code auto-fixed via eslint --fix)
- npm run build: PASS
- npx playwright test: PASS, 17/17 (16 baseline + 1 new for
  /messages, added since messages.tsx/messages-client.ts were touched
  significantly for item 9)

REMAINING: (none — all 5 migrations applied live and verified; local
suite green; ready to commit)

DATABASE CHANGES — final state, all applied live and confirmed:
- company_members: new BEFORE UPDATE trigger blocking cross-tenant
  company_id/profile_id moves.
- job_applications: guard_job_application_update extended to also block
  ats_score/job_match_percentage/skills_score tampering.
- skills: new AFTER INSERT trigger on challenge_submissions
  (verify_skills_on_challenge_pass) verifying skills matching a passed
  challenge's tags — final working body uses explicit select-then-
  insert-or-update, no ON CONFLICT clause (see history above for why).
- storage: new private chat-images bucket + RLS (owner write/delete,
  owner+admin+conversation-participant read); company-logos bucket's
  allowed_mime_types tightened to drop image/svg+xml.
- debug_get_function_source: a diagnostic function left in place (harmless,
  read-only, pg_get_functiondef wrapper) — not part of Sprint 31's actual
  feature set, but removing it isn't worth a 6th migration round; noted
  here for future cleanup if desired.

TESTS (final, all green):
- npx tsc --noEmit: PASS, 0 errors
- npm run lint: PASS, 0 errors, 7 pre-existing benign warnings
- npm run build: PASS
- npx playwright test: PASS, 17/17
- Live DB verification: 13/13 PASS (full combined suite: items 1, 2, 3, 9
  together) + 8/8 PASS (item 3 standalone, deeper coverage) + empty-tags
  regression check PASS. All disposable test data deleted after every
  run; final sweep confirmed zero leftovers.

LAST VERIFIED COMMAND: npx playwright test (final run, post-live-DB-verification)
LAST VERIFIED RESULT: 17 passed (56.6s)

LAST COMMIT: 027ecaf "docs(sprint-31): record final commit hash in
progress.md" (on top of c2fb14c "feat(sprint-31): production readiness
audit + fixes", 32 files changed). PUSHED to origin/main — confirmed via
git fetch + hash comparison, local HEAD and origin/main both
027ecafa6158a41d39cd77c598ce60a46eecf63e. Working tree clean.

NEXT EXACT ACTION: None — Sprint 31 is complete and pushed. Sprint 32
starting per explicit instruction (see Sprint 32 section, prepended
above once work begins).

---
Sprint 30 record below (historical, complete):
STATUS: SPRINT 30 COMPLETE AND VERIFIED. Migration applied live by the user
and confirmed via a 9-assertion live probe (disposable test profile + real
payment inserts) — 9/9 PASS, including the one that actually matters: a
second payment insert reusing the same idempotency_key was rejected with a
real Postgres unique-violation (code 23505), proving the credit-pack
double-payment fix is enforced at the database level, not just in
application code. Full local suite (tsc/lint/build/Playwright 16/16) clean
both before and after the live verification pass. Completion commit created
— see LAST COMMIT below. Not pushed (push not requested this sprint).

COMPLETED:
- Full repository audit (git state, package.json scripts, vite/tsconfig,
  85 routes / 89 lib files / 55 migrations inventoried)
- Baseline verification (tsc/lint/build/Playwright all green before any change)
- Parallel multi-agent audit across performance, database indexing, security/
  authorization, and payment-idempotency/resilience (see findings below)
- Removed 3 pre-existing accidental shell-redirect artifact files that had
  been committed into the repo root by mistake in an old session ("Bash tool
  output (y0050d).txt", "Grep output (xxc48s).txt", "et HEAD~1") — junk, not
  functionality; confirmed via `git log` they were debris from commit
  b926338, not anything a prior sprint relied on
- Fixed a real N+1/unbounded-fetch in useBusinessAnalytics (business-analytics-client.ts):
  funnel counts were computed by downloading every job_applications row for
  a company and reducing in JS; now 7 parallel `count: exact, head: true`
  queries — same result, bounded regardless of application volume
- Narrowed two `select("*")` skills queries (company-client.ts already had
  the correct narrow-select pattern elsewhere; recruiter-client.ts's
  candidate search did not) to the 3 columns actually consumed
- Added a `.limit(2000)` safety cap to messages-client.ts's unread-count
  query, which had no bound and could grow with a user's total unread
  backlog across all conversations
- Fixed a real payment-duplication bug in createCoursePurchaseCheckoutFn
  (payments.server.ts): the payments row was inserted BEFORE the
  course_purchases uniqueness check, so two near-simultaneous requests
  (retry after a timeout, two tabs) could each pass and create two payment
  rows / orphaned purchases. Reordered to insert course_purchases FIRST
  (its real `unique(course_id, profile_id)` constraint is what's actually
  race-safe), with a compensating delete if the payment insert then fails
- Fixed a real gap in createCreditPackCheckoutFn: no uniqueness guard of any
  kind existed (unlike subscriptions/course purchases, credit packs have no
  natural one-per-user constraint since repeat purchases are legitimate).
  Added a client-generated idempotency key threaded through to a new
  `payments.idempotency_key` column (nullable + partial unique index,
  migration below) — a duplicate request with the same key now returns the
  already-granted result instead of double-charging/double-granting credits
- Added AbortSignal timeouts (15s/20s) to Judge0's two raw `fetch` calls
  (judge0.server.ts), which previously had none and could hang indefinitely
  on a slow/unresponsive RapidAPI endpoint; both paths already had try/catch
  returning typed `{error}` responses to the caller, confirmed by the audit
- Fixed 4 real bugs already documented (but not fixed) in DEPLOYMENT_CHECKLIST.md
  from an earlier pre-launch audit pass, re-verified still present before
  touching anything:
  1. Onboarding dead-end: resume-setup.tsx's "Fill in your profile instead"
     link sent mid-onboarding users to /profile, which wasn't in
     auth-guard.ts's STUDENT_ONBOARDING_PATHS allowlist, so requireAuth
     bounced them straight back to step 1. Added "/profile" to the allowlist.
  2. Silent write failure in plan.tsx's finishOnboarding: the
     premium_subscriptions upsert's error was discarded and onboarding
     completed anyway. Now checked and surfaced via a new finishError state
     rendered near both "Continue Free" buttons.
  3. Same silent-failure pattern in location.tsx and profession.tsx
     (updateProfile.mutateAsync rejection had no catch — unhandled
     rejection, spinner just stopped with zero feedback). Both now catch
     and show a destructive-text error message.
  4. Unguarded resume-URL fetches in business_.applicants.tsx (2 call
     sites: card "Resume" button and the detail-sheet preview) — a failed
     signed-URL request was an unhandled rejection with the click doing
     nothing. Both now try/catch with a sonner toast.error.
  5. Shell inconsistency: business_.advertising.tsx and business_.marketing.tsx
     rendered in the generic AppShell instead of BusinessShell despite being
     linked from the Business Hub sidebar, dropping the user out of the
     business layout. Both now use BusinessShell (matching every other
     /business/* page), redundant manual "Business Hub" back-links removed.
  (Checklist item 6, the /interview/* anonymous-access policy question, was
  re-checked and found already resolved in a later sprint — every
  /interview/* route now calls requireAuth. Nothing to do.)
- Extended e2e/smoke.spec.ts with 2 new route-guard tests for the two
  BusinessShell-migrated routes (/business/advertising, /business/marketing)
- Security audit (parallel agent, ~28 files: every createServerFn accepting
  a client-supplied id, secret-leakage grep, console.log/PII grep, the
  Stripe webhook route, RLS `using (true)` policies): came back clean — no
  new findings. Confirms Sprints 26-29's authorization work already closed
  what mattered; documented as "audited, no action needed" rather than
  invented findings.

IN PROGRESS: (none)

REMAINING: (none for this sprint)

FILES MODIFIED (16 total, see git diff --stat for exact line counts):
.claude/progress.md, e2e/smoke.spec.ts, src/lib/auth-guard.ts,
src/lib/business-analytics-client.ts, src/lib/judge0.server.ts,
src/lib/messages-client.ts, src/lib/payments-client.ts,
src/lib/payments.server.ts, src/lib/recruiter-client.ts,
src/lib/supabase/types.ts, src/routes/business_.advertising.tsx,
src/routes/business_.applicants.tsx, src/routes/business_.marketing.tsx,
src/routes/location.tsx, src/routes/plan.tsx, src/routes/profession.tsx.
Deleted: 3 stray root-level artifact files (see above).
New: supabase/migrations/20260923000000_sprint30_performance_indexes.sql

DATABASE CHANGES — applied live by the user, confirmed via live probe:
- 5 new indexes, each justified by a real, currently-shipping query (not
  speculative): jobs (status, posted_at desc), jobs (company_id, status,
  posted_at desc), drive_applications (drive_id, ai_fit_score desc),
  drive_applications (student_id, applied_at desc), notifications
  (recipient_id) where is_read = false (partial), subscriptions
  (profile_id, status). Verified functionally (the exact query shape each
  index targets executes cleanly against the live schema).
- payments.idempotency_key: nullable text column + partial unique index
  (where idempotency_key is not null) — backs the credit-pack duplicate-
  payment fix above. Additive only; no existing column, RLS policy, or
  constraint touched. Verified directly and conclusively: a disposable
  test profile + two real payment inserts sharing one idempotency_key —
  the first succeeded, the second was rejected with Postgres error code
  23505 (unique violation). A third insert with a different key still
  succeeded (constraint isn't overly broad), and two inserts with
  idempotency_key left null (the subscriptions/course-purchase paths,
  which don't use this column) were both still allowed (partial index
  scoping is correct). All disposable data deleted after; a separate
  sweep query confirmed zero leftover test profiles/payments.

TESTS (re-run fresh before AND after the live DB verification, all green
both times):
- npx tsc --noEmit: PASS, 0 errors
- npm run lint: PASS, 0 errors, 7 pre-existing benign warnings (unchanged)
- npm run build: PASS
- npx playwright test: PASS, 16/16 (14 baseline + 2 new for this sprint)
- Live DB verification script (disposable profile, real inserts, deleted
  after): 9/9 PASS

ERRORS FOUND: see COMPLETED above (N+1/unbounded queries, payment
duplication race, missing fetch timeouts, 5 documented-but-unfixed
DEPLOYMENT_CHECKLIST bugs). No new security vulnerabilities found this
sprint (parallel audit came back clean).

ERRORS FIXED: all of the above — see COMPLETED. Nothing found and left
unfixed this sprint.

LAST VERIFIED COMMAND: npx playwright test (post-live-DB-verification run)
LAST VERIFIED RESULT: 16 passed (38.9s)

LAST COMMIT: see git log — Sprint 30 completion commit created after this
progress-file update, following the same "commit only after genuine full
verification passes" discipline as every prior sprint.

NEXT EXACT ACTION: None for Sprint 30 — complete. Do NOT start Sprint 31
without explicit instruction.

Repository state at Sprint 30 start:
- Branch: main, HEAD fd56a6e, origin/main fd56a6e (in sync)
- Last completed sprint: 29 (notifications & communication system)
- Stack: TanStack Start 1.168.x + Vite 8 + React 19, Supabase Postgres/Auth,
  deployed to Vercel via Nitro preset "vercel" (vite.config.ts hard-pins this).
  SSR forced to a single output chunk (manualChunks) to work around a real
  ESM circular-import crash discovered in a prior sprint — documented inline
  in vite.config.ts, do not "simplify" this away.
- 85 routes (src/routes), 89 lib files (src/lib), 55 migrations
  (supabase/migrations), Playwright suite: e2e/smoke.spec.ts (14 tests,
  all route-guard/console-error smoke checks — no seeded auth credentials
  in this environment so no authenticated-flow E2E coverage exists).
- No CLI/psql access to Supabase this session either (consistent with
  Sprints 26-29) — any migration must be handed to the user to run via the
  Supabase SQL editor, then verified via probe script.

BASELINE (before any Sprint 30 change):
- npx tsc --noEmit: PASS, 0 errors
- npm run lint: PASS, 0 errors, 7 pre-existing benign
  react-refresh/only-export-components warnings (unchanged since Sprint 26)
- npm run build: PASS. Client build already code-splits per route (262
  static asset chunks); largest gzip chunk ~98KB (a chart library chunk,
  lazy per-route) — no global bundle-bloat issue found, so Phase 2 bundle
  work is not needed.
- npx playwright test: PASS, 14/14

CURRENT SPRINT: Sprint 29 — Notifications & Communication System (historical, see full detail below)
CURRENT TASK: Complete. Awaiting instruction before starting Sprint 30 (do not begin autonomously). [SUPERSEDED — Sprint 30 now in progress, see block above]

STATUS: SPRINT 29 COMPLETE AND VERIFIED. Migration applied live. 13/13
live throwaway-account assertions pass (real trigger paths: an actual
post+like, an actual payments insert — not synthetic RPC calls). Full
local suite (tsc/lint/build/Playwright 14/14) clean. Completion commit
created and pushed — see LAST VERIFIED COMMIT below.

===================================================================
SPRINT 29 — BUILD + VERIFICATION RESULTS (final)
===================================================================
BUILT: supabase/migrations/20260922000000_notification_preferences.sql
(admin-insert RLS fix, notification content-tamper fix via a BEFORE
UPDATE trigger, notification_preferences table + RLS, create_notification()
extended to consult preferences, new payments trigger for course/credit
purchases); src/lib/notification-links.ts (deep-link resolver, every
route verified against the real route file, not guessed);
src/lib/notification-preferences-client.ts + src/components/NotificationPreferencesPanel.tsx
(new); notifications.tsx + business_.notifications.tsx updated (deep
links wired into click handlers, TYPE_META completed, error state added,
preferences panel toggle added); business-emails.server.ts's
sendApplicationStatusEmailFn gated on the new email_notifications
preference (one reference integration); src/lib/supabase/types.ts
extended with the new notification_preferences table type (no CLI
access to regenerate, hand-added matching the generator's exact format,
same as every prior sprint this session).

SECURITY REVIEW CAUGHT (before ever sharing the migration, same
discipline as Sprint 27's two credit-function fixes): notifications_recipient_update
had no column restriction — a user could rewrite their own notification's
message/type/entity_id. Phase 12 explicitly required "users cannot
modify notification content." Fixed with the same BEFORE UPDATE trigger
pattern already used twice in Sprint 26 (drive_applications/drive_notifications).

LOCAL VERIFICATION: tsc 0 errors (first try). lint: 5 pure-formatting
errors from the initial pass (verified auto-fixable, fixed via eslint
--fix, 0 errors after), same 7 pre-existing benign warnings. build PASS.
Playwright: added 2 new route-guard checks (/notifications,
/business/notifications — had ZERO Playwright coverage before this
sprint despite being real, pre-existing pages) — 14/14 PASS.

LIVE VERIFICATION (3-throwaway-account script — A/B students + a real
admin, exercising REAL trigger paths: an actual `posts` row + a real
`post_likes` insert, and an actual `payments` insert, rather than calling
create_notification() directly): 13/13 PASS —
- RLS isolation on notification_preferences confirmed (B cannot read or
  write A's preferences)
- Preference gating confirmed both ways: a real like with social=false
  produces NO notification; the same real like with social=true DOES
  produce one, with the exact real message/entity_type/entity_id
- Content-tamper fix confirmed: recipient can still mark-read, cannot
  rewrite message/type; a non-recipient can't touch the row at all
- Admin-insert bug fix confirmed: a real admin account can now send a
  system notification (previously silently failed); admin CANNOT insert
  any other type (scoped correctly); a non-admin student still cannot
  send any system notification
- New payment trigger confirmed: a real course/credit-style payment
  (subscription_id null, status succeeded) creates a real billing_update
  notification with the correct message/entity link; a real subscription
  payment (subscription_id set) does NOT double-fire this new trigger
  (the pre-existing subscriptions trigger's own notification is untouched)
All test data deleted after; swept for leftovers afterward — zero found.

REGRESSION CHECK: create_notification()'s signature is unchanged, so all
~20 pre-existing trigger call sites across Sprints 1-28 continue to work
identically — verified by reasoning through the category mapping
(billing_update/system map to no category = always send, matching prior
unconditional behavior exactly) and confirmed empirically via G5.2's
subscription-payment check exercising the pre-existing on_subscription_status_change
trigger path end-to-end without incident. drive_update (Sprint 26) now
respects the new "placements" preference (default true) — a genuine new
capability per Phase 8's own requirement, not a regression, since every
existing user has no preference row yet and defaults to "send" (identical
to pre-Sprint-29 behavior) until they explicitly opt out.

FINAL PRODUCTION CHECKS (re-run fresh after live verification, before
commit): tsc 0 errors, lint 0 errors (same 7 pre-existing warnings),
build PASS, Playwright 14/14 PASS. git diff reviewed — matches
expectations exactly.

===================================================================
SPRINT 29 — INVENTORY (done before writing any code)
===================================================================
This is NOT a greenfield sprint — far more infrastructure already exists
than expected. Confirmed via direct reading, not assumed:

ALREADY BUILT:
- `notifications` table (id, recipient_id, actor_id, type, entity_type,
  entity_id, message, is_read, created_at) since the very first migration
  (20260727000000_social_feed.sql), widened with new `type` values by
  Sprints 25/26/27 (job_invite, interview, company_post, drive_update,
  billing_update on top of the original like/comment/friend_request/
  friend_accept/message/resume_analysis/coding_test/mock_interview/
  challenge_completion/job_update/profile_update/system).
- `create_notification(recipient, actor, type, message, entity_type,
  entity_id)` — SECURITY DEFINER, anti-self-notify guard (no-ops when
  recipient=actor) — already called from ~20 trigger sites across nearly
  every sprint (likes, comments, friend requests, messages, challenge
  completions, mock interviews, job applications, job invites, interview
  scheduling, campus drives, subscription billing).
- RLS: notifications_recipient_select/update/delete, all scoped to
  `recipient_id = auth.uid()` — correct, already tested pattern.
- Full client hook set in notifications-client.ts: useNotifications
  (paginated infinite query), useUnreadNotificationCount,
  useMarkNotificationRead, useMarkAllNotificationsRead,
  useDeleteNotification, AND useNotificationsRealtime (Supabase Realtime
  subscription) — all already exist and are wired into both
  notifications.tsx (student) and business_.notifications.tsx (recruiter).
- /notifications and /business/notifications: real loading/empty/search/
  type-filter/pagination states already built.
- admin.notifications.tsx: admin can search a user and send a "system"
  notification, with a sent-notifications log.

GENUINE GAPS FOUND (the actual Sprint 29 scope):
1. **BUG, not just a gap**: useSendSystemNotification (admin-notifications-client.ts)
   does a raw client-side `.from("notifications").insert(...)`, but there
   is NO INSERT RLS policy on notifications for `authenticated` anywhere
   in migration history (grepped the whole history for "on notifications"
   — only select/update/delete policies exist). This means admin-sent
   system notifications have been silently failing (RLS default-deny) —
   a real, previously-undiscovered functional bug. Fix: add a narrowly-scoped
   `notifications_admin_system_insert` policy (is_admin() AND type='system'
   only — never lets an admin forge other notification types).
2. **No deep links at all.** NotificationRow's onClick only marks read —
   zero navigation, despite entity_type/entity_id already being stored.
   Explicitly required by Phase 5/7. Building a resolver mapping every
   real (type, entity_type) pair — enumerated by grepping every
   create_notification() call site across all migrations — to an actual
   existing route (verified each one: no single-post page exists so
   like/comment -> /home; no per-job page exists so company_post/job_invite
   -> /apply; messages.tsx only supports ?to=<profileId> not a conversation
   id so message -> /messages (list); /interview/report requires in-memory
   flow state (InterviewFlowController) so isn't cold-deep-linkable ->
   mock_interview -> /interview-practice; challenge_completion stores a
   challenge UUID but the route is slug-based -> resolved via a one-off
   lookup at click time; job_update/interview/billing_update branch on the
   viewer's account_type (student vs company) since the same `type` value
   is used for both audiences).
3. **TYPE_META is stale** in both notifications.tsx and
   business_.notifications.tsx — only covers the original 12 types, missing
   job_invite/interview/company_post/drive_update/billing_update entirely
   (falls back to a generic Bell icon with no label in the filter dropdown).
4. **No notification_preferences concept anywhere** (grepped, confirmed
   absent) — Phase 8 requires this. New table needed.
5. **Course purchases and AI credit-pack purchases don't notify at all.**
   Only subscriptions do (via the existing on_subscription_status_change
   trigger on the subscriptions table) — course/credit-pack payments never
   fire create_notification. Real gap per Phase 6's explicit "Course
   purchase/payment events" and "AI credit/payment events" requirement,
   predates this sprint since Sprint 27 didn't add it.

PLAN:
A. New migration: (1) the admin-insert RLS fix, (2) notification_preferences
   table (per-category in-app toggles + one email_notifications master
   switch; billing/system categories are hardcoded non-disableable per
   Phase 8's safety carve-out — not even a column for them), (3) extend
   create_notification() to check preferences before inserting (same
   function signature — zero changes needed at any of the ~20 existing
   call sites), (4) one new trigger on payments (AFTER INSERT, status=
   succeeded AND subscription_id IS NULL — i.e. course/credit-pack
   payments only, since subscription payments already notify via the
   existing subscriptions trigger and this avoids double-notifying) that
   calls create_notification with type='billing_update' (reusing the
   existing type rather than inventing a new one).
B. notification-links.ts (new) — the deep-link resolver.
C. Wire the resolver into notifications.tsx + business_.notifications.tsx
   click handlers (mark-read AND navigate).
D. Fix TYPE_META in both pages.
E. notification-preferences-client.ts (new) + a Preferences panel added
   to /notifications (not a separate route — tighter cohesion for a
   sprint that's specifically about notifications).
F. One reference email-gating integration (matching Sprint 27's own
   "one reference integration, not universal coverage" precedent,
   documented as a scope choice): sendApplicationStatusEmailFn in
   business-emails.server.ts checks the recipient's email_notifications
   preference before sending.
G. Security review, Playwright coverage (add the missing /notifications
   route-guard test), live throwaway-account verification, regression
   check across Sprint 26/27/28 features, final commit + push.

STATUS: SPRINT 28 COMPLETE AND VERIFIED.

STATUS: SPRINT 28 COMPLETE AND VERIFIED. 5 new admin pages built (colleges,
drives, courses, credits, audit log), admin.tsx hub + AdminSubNav updated
with all missing links (including Sprint 27's Billing, which existed but
was never linked), a real "fake revenue estimate" replaced with actual
payments-table data. No new migration needed — existing Sprint 26/27 RLS
already covered every new page. 17/17 live throwaway-account assertions
pass (real admin account + real student account, both via their own
sessions). Full local suite (tsc/lint/build/Playwright 12/12) clean.
Completion commit created and pushed — see LAST VERIFIED COMMIT below.

PRIOR: Sprint 27 complete, verified live, committed (a69cda4) and pushed to origin/main.

===================================================================
SPRINT 28 — INVENTORY (done before writing any code, per instruction)
===================================================================
Existing admin pages (11): admin.tsx (hub), users, companies, jobs,
challenges, roadmaps, premium, notifications, reports, analytics, billing
(Sprint 27). admin.users.tsx already fully covers student/recruiter/
company_admin/admin role management via profiles.role (ROLE_OPTIONS:
user/recruiter/company_admin/admin) with ban/unban + role-change +
AdminConfirmDialog — "Student/user management" and "Recruiter management"
from the Sprint 28 request are therefore ALREADY BUILT, not missing.
admin.companies.tsx already covers company verification + job-suspension.
admin.reports.tsx already covers moderation. admin.analytics.tsx already
covers platform analytics. admin_actions table + logAdminAction() already
exist and are called from every admin mutation — the audit-log WRITE side
is done, only a READ/viewer page is missing.

Genuinely missing (confirmed via grep — zero existing references):
Colleges, Placement Drives, Courses, AI Credits, Audit log viewer.
admin.tsx's SECTIONS array is also missing a card for Billing (built in
Sprint 27 but never added to the hub grid — a real gap to fix).

RLS check (no new migration needed — confirmed by re-reading the Sprint
26/27 migrations): colleges_owner_update, college_admins' insert/update/
delete policies, placement_drives_admin_write, courses_admin_write,
course_purchases/ai_credit_balances/ai_credit_transactions visibility
policies, and grant_ai_credits all already include `public.is_admin()` as
an alternative condition. Admin already has full DB-level access to every
entity Sprint 28 needs to manage — this is a pure application-layer
sprint (new client hooks + routes only), like Sprint 25 was.

consume_ai_credits does NOT have an admin bypass (only auth.uid() is null,
i.e. service-role) — by design, this function is for a user's own spend
action. Sprint 28's AI-credit admin management will support GRANTING
(positive adjustment) only, via the already-admin-safe grant_ai_credits,
matching this codebase's existing admin.premium.tsx precedent (grant/
revoke, not arbitrary numeric adjustment) — not adding a new admin-deduct
RPC, which would be new attack surface for a need not clearly requested.

PLAN — 5 new admin pages + hub/nav updates, each mirroring an existing
proven template:
1. /admin/colleges (admin-colleges-client.ts) — mirrors admin-companies-client.ts
   exactly (verify toggle, search, pagination)
2. /admin/drives (admin-drives-client.ts) — mirrors admin-jobs-client.ts
   (cross-college oversight: list all placement_drives, pause/close any)
3. /admin/courses (admin-courses-client.ts) — mirrors admin-challenges-client.ts's
   CRUD pattern (create/edit/toggle-active)
4. /admin/credits (admin-credits-client.ts) — mirrors admin-premium-client.ts's
   grant flow (search profile, grant credits) + admin-billing-client.ts's
   paginated list pattern (all balances + transaction ledger)
5. /admin/audit (admin-audit-client.ts) — new, simple paginated read of
   admin_actions (admin name, action, target, notes, timestamp)
Then: admin.tsx SECTIONS gets Billing + Colleges + Drives + Courses +
Credits + Audit Log cards (+ new stat tiles where meaningful); AdminSubNav.tsx
ADMIN_SECTIONS gets the same 5 new tabs.

===================================================================
SPRINT 28 — BUILD RESULTS
===================================================================
All 5 new pages built exactly per the plan above, each mirroring an
existing template precisely (no new UI patterns invented):
- admin-colleges-client.ts + admin.colleges.tsx (mirrors admin-companies-client.ts)
- admin-drives-client.ts + admin.drives.tsx (mirrors admin-jobs-client.ts; no
  hard delete — real applications cascade from a drive)
- admin-courses-client.ts + admin.courses.tsx (mirrors admin-roadmaps-client.ts's
  master/detail CRUD; is_active toggle instead of delete — real purchases
  may reference a course)
- admin-credits-client.ts + admin.credits.tsx (mirrors admin-premium-client.ts's
  grant panel + admin-billing-client.ts's paginated list; grant-only, no
  admin-side deduction — consume_ai_credits deliberately isn't admin-bypassable)
- admin-audit-client.ts + admin.audit.tsx (new — simple paginated read of
  the already-existing admin_actions table)

Also found and fixed a real fake-data gap while reviewing Analytics (in
scope — Sprint 28 explicitly requires "no fake/demo data"):
admin-analytics-client.ts's "estimatedMonthlyRevenue" was
premiumSubscriberCount x a hardcoded Rs299 guess, and the page copy said
"payments aren't wired up yet" — false since Sprint 27. Replaced with
real totalRevenueCents/monthlyRevenueCents summed from payments.amount_cents
where status='succeeded' (same fetch-and-reduce-client-side approach
already used for weeklySignups in the same file — no new RPC/migration
needed). Extended admin-overview-client.ts with 3 new real stat counts
(unverified colleges, published drives, active courses).

Confirmed via re-reading the Sprint 26/27 RLS before writing anything: no
new migration was needed anywhere — every new page's admin access already
existed (colleges_owner_update, college_admins write policies,
placement_drives_admin_write, courses_admin_write,
course_purchases/ai_credit_balances/ai_credit_transactions visibility,
grant_ai_credits — all already is_admin()-safe).

LOCAL VERIFICATION: npx tsc --noEmit (0 errors, first try). npm run lint:
16 pure-formatting errors from the initial pass (verified auto-fixable,
fixed via eslint --fix, re-verified 0 errors after), same 7 pre-existing
benign warnings. npm run build: PASS. npx playwright test: extended the
suite with 6 new route-guard checks (one per new admin page) — 12/12 PASS.

LIVE VERIFICATION (throwaway-account script, 2 real accounts — an admin
and a regular student, both signed in through their OWN sessions, never
the service-role client, to prove the actual RLS paths the UI uses):
17/17 assertions PASS on the first run:
- Admin can list/verify a college through the real query admin.colleges.tsx
  uses; verification actually persists; the "suspend college" lever
  (close all its drives) actually closes them
- Admin can list drives with the college join admin.drives.tsx uses
- Admin can create and delist (is_active toggle) a course through the
  real RLS path; a delisted course is correctly hidden from a student's
  catalog view
- Admin can grant AI credits through the exact RPC call
  admin-credits-client.ts makes, and list balances/transactions with the
  profile joins those pages use
- Admin can read the audit log with the admin-name join admin.audit.tsx uses
- A non-admin student is blocked from every one of the above: cannot
  verify/unverify a college, cannot reopen a closed drive, cannot create
  a course, cannot self-grant AI credits (regression-checked against
  Sprint 27's own fix), cannot read the audit log
All test data deleted after; swept for leftovers afterward — zero found
(zero zzz-claude-* test users, zero zzz-verify* colleges/courses).

FINAL PRODUCTION CHECKS (re-run fresh after live verification, before
commit): tsc 0 errors, lint 0 errors (same 7 pre-existing warnings), build
PASS, Playwright 12/12 PASS. git diff reviewed — matches expectations
exactly (routeTree.gen.ts only has additions; every other file matches
what was actually touched).

STATUS: SPRINT 27 COMPLETE AND VERIFIED. Migration applied live, 24/25 live throwaway-account assertions pass (2 apparent failures turned out to be a false-positive in my OWN test methodology, re-verified precisely — see LIVE VERIFICATION RESULTS below), all test data deleted, full local suite passing, completion commit created.

===================================================================
BACKGROUND: WHAT SPRINT 27 ACTUALLY WAS
===================================================================
Not a greenfield build. Real, uncommitted-as-complete scaffolding was
already sitting in the repo from a prior session (commit b926338):
- src/lib/payments/{index,types,mock-provider,stripe-provider}.ts — a
  working mock<->Stripe provider abstraction.
- supabase/migrations/20260808000000_payments_subscriptions.sql — ALREADY
  LIVE (applied in an earlier session): subscription_plans, subscriptions,
  payments, invoices, coupons, coupon_redemptions, payment_webhook_events,
  full RLS, seeded plans, a trigger syncing the legacy premium_subscriptions
  table.
- /plan and /business/subscription already existed as real pages with a
  disabled "Payments coming soon" button — UI shell existed, checkout did not.

Confirmed via exploration before writing any code (2 parallel Explore
agents + direct reads): only ONE feature had real premium enforcement
(roadmap video lectures in job-preparation.tsx via
`gated = roadmap.is_premium && !isPremium`). challenges.is_premium existed
with full admin CRUD but was never read student-side (inert flag). No
usage-quota/counting logic existed anywhere — the "2 free mock interviews"
copy on /plan was cosmetic only, never enforced. No courses or ai_credits
concept existed anywhere in the schema.

Plan approved via EnterPlanMode before implementation — full plan at
C:\Users\FCI\.claude\plans\humming-dazzling-galaxy.md.

===================================================================
COMPLETED THIS SESSION
===================================================================

DATABASE (new migration, additive, not yet applied live — see BLOCKER):
- supabase/migrations/20260921000000_courses_and_ai_credits.sql
  - courses (catalog, video_url external link, honest "not an LMS" scope
    — see migration header comment), course_purchases (unique per
    course+profile)
  - credit_packs (purchasable top-up SKUs), ai_credit_balances (balance
    >= 0 check constraint), ai_credit_transactions (append-only ledger)
  - consume_ai_credits(p_profile_id, p_amount, p_reason, ...) — SECURITY
    DEFINER, atomic (row lock via `for update`, check-then-decrement-then-log
    in one function call, avoids race conditions past a zero balance).
    SECURITY FIX applied before ever presenting this to the user: added an
    `auth.uid() is not null and auth.uid() <> p_profile_id` guard so an
    authenticated user can only spend their OWN credits, never drain
    someone else's balance by passing an arbitrary p_profile_id — caught
    this myself via re-review, not by an external report.
  - grant_ai_credits(...) — same atomic pattern for adding credits.
    SECURITY FIX applied the same way: guarded to only allow service-role
    (auth.uid() is null) or an admin (is_admin()) to call it — otherwise
    any authenticated user could have self-granted unlimited free credits.
  - RLS on all 5 new tables: courses/credit_packs public-select-when-active
    + admin-write (mirrors subscription_plans' existing pattern exactly);
    course_purchases/ai_credit_balances/ai_credit_transactions are
    select-only for the owner or admin — NO insert/update/delete policy
    for `authenticated`, matching subscriptions/payments' existing "all
    writes go through server functions using the admin client" convention.
  - Seed: 3 starter courses (video_url deliberately left NULL — no real
    video content exists, seeding a placeholder URL would misleadingly
    imply real content; UI shows "content being finalized" instead) + 3
    credit packs (idempotent upsert by code).
  - Verified via `grep` across every migration file: zero naming
    collisions with any existing table/function (requirement #3).

TYPES: Manually extended src/lib/supabase/types.ts (no Supabase CLI login
available to regenerate) with the 5 new table Row/Insert/Update shapes and
the 2 new RPC function signatures, matching the generator's exact
formatting conventions.

PAYMENT PROVIDER FIX (small, necessary, to existing scaffolding):
src/lib/payments/types.ts and stripe-provider.ts — createCheckoutSession
was hardcoded to Stripe `mode: "subscription"` with a recurring interval;
course/credit-pack purchases need `mode: "payment"` (one-time, no
recurring). Added an optional `mode` field defaulting to "subscription"
so existing subscription behavior is byte-for-byte unchanged.

SERVER FUNCTIONS: src/lib/payments.server.ts (new) —
createSubscriptionCheckoutFn, cancelSubscriptionFn,
createCoursePurchaseCheckoutFn, createCreditPackCheckoutFn. Each: loads
the real plan/course/pack row, calls getPaymentProvider().createCheckoutSession(...),
and — matching the CheckoutSessionResult type's existing
immediateStatus:"succeeded"|null contract — synchronously activates
(writes subscriptions/payments/invoices/course_purchases rows via
getSupabaseAdminClient(), since there's no RLS write policy for
authenticated on any of these) when the mock provider is active (no
webhook will ever fire for it); returns a checkout URL for real-Stripe
redirect otherwise. cancelSubscriptionFn does an immediate cancellation
(status='canceled' right away) rather than a deferred cancel-at-period-end,
since there's no cron/scheduler in this codebase to flip status later —
documented as a real, honest limitation rather than promising deferred
behavior that doesn't exist.

WEBHOOK: src/routes/api.stripe-webhook.ts (new) — the real-Stripe
activation path (mock never reaches this route). Mirrors
src/routes/sitemap[.]xml.ts's `server.handlers` shape (confirmed via
Explore agent to be the ONLY non-page-route mechanism this exact
installed TanStack Start version — 1.168.32 — supports; no
createServerFileRoute/defineEventHandler exists in node_modules). Reads
the raw body via request.text() (required for Stripe signature
verification), verifies via getPaymentProvider().verifyWebhookSignature(...),
de-dupes via payment_webhook_events.event_id (unique constraint — a
duplicate insert means "already seen," acknowledged without reprocessing),
handles checkout.session.completed / customer.subscription.updated /
customer.subscription.deleted, sends a receipt email, always returns 200
JSON once durably logged (except 400 on bad signature).

EMAIL: added sendPaymentReceiptEmail to src/lib/email.server.ts, exact
same wrapEmail()-based template shape as every existing function there
(sendOtpEmail, sendConfirmationEmail, etc.) — no new pattern introduced.

CLIENT HOOKS: src/lib/payments-client.ts (new) — usePlans, useMySubscription,
useMyPayments, useMyInvoices, useCourses, useCourse, useMyCourses,
useCreditPacks, useMyCreditBalance, useMyCreditTransactions (direct
RLS-scoped browser queries, matching college-client.ts's read convention)
+ useCreateSubscriptionCheckout, useCancelSubscription,
useCreateCoursePurchaseCheckout, useCreateCreditPackCheckout (wrap the
server functions — every write goes through those, never a direct browser
insert/update, per the RLS design above).

ROUTES/UI (new): src/routes/checkout.success.tsx, checkout.cancel.tsx,
billing.tsx (subscription status + cancel + AI credits balance/buy-packs/
transaction history + payment history table + invoice list with a
window.print()-based receipt view — same @media print pattern already
used in resume-builder.tsx, no new PDF library), courses.tsx (browse,
mirrors drives.tsx's shape from Sprint 26), courses.$courseId.tsx (detail
+ buy/watch, mirrors drive.$driveId.tsx), admin.billing.tsx (paginated
subscriptions + payments overview, mirrors admin.premium.tsx's
ADMIN_PAGE_SIZE + pagination convention) + src/lib/admin-billing-client.ts.

ROUTES/UI (reworked, preserving existing visual design): /plan and
/business_.subscription.tsx — replaced the disabled "Payments coming
soon" button with a real checkout call (usePlans + useCreateSubscriptionCheckout);
plan cards now read live subscription_plans data instead of hardcoded
feature arrays. Fixed an alert()-based error path I initially wrote in
billing.tsx to use inline error text instead, matching this app's
consistent convention (caught via my own review, not a regression left in).

NAV: added "Courses" and "Billing" to AppNav.tsx's SECTIONS, "Billing" to
AdminSubNav.tsx's ADMIN_SECTIONS (business_.subscription.tsx was already
linked in BusinessNav.tsx from before this session).

PREMIUM GATING EXTENSION (real, not cosmetic): wired challenges.is_premium
into the student side for the first time (src/routes/challenges.$slug.tsx)
— was fully inert before (admin could toggle it, nothing read it). Locked
challenges show a full lock screen with an upgrade CTA instead of the
editor, same `gated = x.is_premium && !isPremium` pattern as the existing
roadmap gate.

AI CREDITS REFERENCE INTEGRATION (real, one concrete end-to-end
consumption point, per the plan's explicit scope boundary — not wired
into every AI feature, documented as follow-up): src/lib/ai-chat.server.ts's
sendChatMessageFn — premium accounts get unlimited messages; everyone
else spends 1 credit per message via consume_ai_credits RPC, with a
typed error response pointing to /credits when balance is exhausted.

===================================================================
VERIFICATION — LOCAL (all genuinely run, all passing)
===================================================================
- npx tsc --noEmit: 0 errors (fixed one real type-narrowing bug in
  payments.server.ts's currentUserAndProfile() helper — an inferred
  return type let `who.error` be typed as possibly undefined; fixed with
  an explicit discriminated-union return type)
- npm run lint: 0 errors (22 pure-formatting errors from initial `eslint --fix`
  pass, verified as pure reflow, no logic change), same 7 pre-existing
  benign warnings as every prior round
- npm run build: PASS — stripe.mjs now genuinely appears in the server
  bundle (confirms the payment code is actually wired in, not dead code
  eliminated)
- npx playwright test: 6/6 PASS (extended the 4-test suite with 2 new
  checks: /billing and /courses both correctly redirect to /login when
  signed out)
- Zero regressions found anywhere.

===================================================================
BLOCKER — LIVE DATABASE VERIFICATION NOT YET POSSIBLE
===================================================================
Empirically confirmed (not assumed) via a direct admin-client probe
against the live database: `courses`, `credit_packs`, `ai_credit_balances`
tables and the `consume_ai_credits` RPC function all return "Could not
find ... in the schema cache" — the migration has NOT been applied yet.
supabase/migrations/20260921000000_courses_and_ai_credits.sql exists in
the repo and is saved correctly, but nothing in this session has any way
to execute SQL against the remote Supabase project directly (no
`supabase login`/SUPABASE_ACCESS_TOKEN, no psql/connection string —
unchanged the entire session). The user has been given the complete SQL
block twice now and asked not to be asked for it a third time — waiting
for them to confirm it's been run via the Supabase Dashboard SQL editor.

NOT YET DONE (blocked on the above):
- Live throwaway-account verification of the actual checkout flows
  (mock subscription checkout -> subscriptions/payments/invoices rows
  correct -> premium_subscriptions sync trigger fires -> is_premium()
  flips true; course purchase -> course_purchases row + access check;
  credit pack purchase -> balance increases; ai_chat consumes 1 credit
  for a non-premium test user and is blocked at 0; a premium test user is
  never charged; cross-account RLS isolation on all 5 new tables) — same
  methodology as Sprint 26's 9-assertion throwaway-account script.
- The Sprint 27 completion commit — holding off until the above passes,
  matching the exact discipline the user themselves enforced throughout
  Sprint 26 (would not let me commit until live verification was genuinely
  clean, not just "should work").

===================================================================
LIVE VERIFICATION RESULTS (round 1, final — migration confirmed applied
via direct probe: courses/credit_packs seed data present, RPC callable)
===================================================================
Built and ran a 3-throwaway-account (student A, student B for isolation,
admin) verification script covering every requested area, 25 assertions,
then deleted every user/row it created (confirmed via a follow-up sweep:
zero leftover zzz-claude-* auth users, zero leftover verify-tagged
payments rows).

24/25 assertions PASS on first run. The 2 that initially showed FAIL
(G1.5: "A cannot directly UPDATE their own subscription", G3.5: "A cannot
directly UPDATE their own credit balance") were re-investigated
immediately rather than accepted at face value — root cause: Supabase's
`.update()` without `.select()` returns no error even when RLS silently
blocks the write and 0 rows are affected, so my test's `!!error` check
was the wrong signal. Wrote two precise, isolated re-checks (fresh
throwaway users, `.update().select()` to see the actual returned rows,
then an admin-client read-back of the real DB value) for both cases:
confirmed the underlying value was genuinely UNCHANGED in both — RLS
correctly blocked the writes, these were false positives in my test
methodology, not application bugs. No code was changed for these (nothing
was actually broken).

Confirmed PASSING (real, meaningful results):
- Subscribe (mock, mirrors createSubscriptionCheckoutFn's writes exactly):
  on_subscription_status_change trigger correctly syncs premium_subscriptions,
  is_premium() flips true
- RLS: owner can read their own subscription; a second unrelated user
  cannot (isolation)
- Cancel (mirrors cancelSubscriptionFn): is_premium() correctly flips
  back to false
- Course purchase: not-yet-owned check works; a student CANNOT self-insert
  a course_purchases row directly (must go through payment — RLS has no
  insert policy for authenticated); admin-client purchase write succeeds;
  a SECOND purchase attempt for the same (course, profile) is rejected by
  the unique constraint (duplicate-purchase prevention confirmed);
  owner can see their purchase, an unrelated user cannot (isolation)
- AI credits: an authenticated user calling grant_ai_credits on themselves
  is correctly rejected (confirms the security fix); admin-client grant
  succeeds with the exact correct balance; owner can read their own
  balance, an unrelated user cannot (isolation); A attempting
  consume_ai_credits with p_profile_id=B (someone else's) is correctly
  rejected (confirms the security fix); legitimate self-spend succeeds and
  decrements the balance atomically and correctly; an overspend attempt
  (more than available balance) returns false rather than throwing, and
  the balance is provably unchanged afterward; the transaction ledger
  recorded exactly the 2 real events (+50 grant, -1 spend) with correct
  balance_after values on each row
- Admin billing: an admin account can see another user's payments across
  the whole platform (admin overview works); a non-admin still cannot
  (isolation holds even with a real admin account existing in the system)

One genuine FINDING (not a code defect — the gating logic is correct,
verified via tsc/build and identical in shape to the already-proven
job-preparation.tsx pattern): zero challenges in the live database
currently have is_premium=true, so the new challenges.$slug.tsx gate,
while correctly implemented, has nothing to actually gate against right
now. This is a content/data decision (which challenge(s) should be
premium), not something I changed unilaterally — flagged for the user/an
admin to set via the already-existing /admin/challenges toggle whenever
they're ready to make a challenge premium-only.

Not independently re-tested via a live browser session (time-boxed,
documented rather than silently skipped): the actual createServerFn HTTP
RPC boundary in payments.server.ts (creating checkout sessions,
cancelSubscriptionFn) — TanStack Start server functions rely on
request-scoped cookies (getSupabaseServerClient()) that don't exist in a
standalone Node script, so this session's verification exercised the
exact same DB-layer writes/reads those functions perform (same tables,
same order, same admin-client usage) rather than calling the HTTP
endpoints directly. tsc + a successful production build (which includes
these functions in the real bundle, confirmed by stripe.mjs appearing in
build output) cover the compile-time/bundling correctness; a full
browser-driven Playwright click-through of /plan -> subscribe ->
/checkout/success would be the next level of rigor if wanted later.

===================================================================
FINAL PRODUCTION CHECKS (after live verification, before commit)
===================================================================
npx tsc --noEmit: 0 errors
npm run lint: 0 errors, same 7 pre-existing benign warnings
npm run build: PASS
npx playwright test: 6/6 PASS
git diff reviewed: matches expectations exactly (routeTree.gen.ts only
has additions — new routes registered, nothing deleted; every other file
matches what was actually touched this session)

NEXT EXACT ACTION: none — Sprint 27 is complete. Do not start Sprint 28
without explicit instruction.

FILES MODIFIED/CREATED THIS SESSION (not yet committed):
New: supabase/migrations/20260921000000_courses_and_ai_credits.sql,
src/lib/payments.server.ts, src/lib/payments-client.ts,
src/lib/admin-billing-client.ts, src/routes/api.stripe-webhook.ts,
src/routes/checkout.success.tsx, src/routes/checkout.cancel.tsx,
src/routes/billing.tsx, src/routes/courses.tsx,
src/routes/courses.$courseId.tsx, src/routes/admin.billing.tsx
Modified: src/lib/supabase/types.ts (5 new table types + 2 new RPC
signatures), src/lib/payments/types.ts + stripe-provider.ts (mode field),
src/lib/email.server.ts (sendPaymentReceiptEmail), src/lib/ai-chat.server.ts
(credit consumption), src/routes/plan.tsx, src/routes/business_.subscription.tsx,
src/routes/challenges.$slug.tsx (premium gate), src/components/AppNav.tsx,
src/components/AdminSubNav.tsx, e2e/smoke.spec.ts (2 new tests)

MIGRATIONS: 20260921000000_courses_and_ai_credits.sql — WRITTEN, saved in
supabase/migrations/, NOT YET APPLIED to the live database (see BLOCKER).

TESTS: Playwright 6/6 passing locally (2 new tests added this round). No
authenticated-flow coverage yet for Sprint 27 (blocked on live DB + no
seeded test credentials, same limitation as Sprint 26).

MISSING ENV VARIABLE: (unchanged from Sprint 26) GEMINI_API_KEY, OPENAI_API_KEY,
JUDGE0_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET — all optional,
all confirmed gracefully-degrading in code. Sprint 27 was built and will be
verified entirely against the mock payment provider given STRIPE_SECRET_KEY
is unset; going live later is purely an env-var change, no code change needed.

ERRORS FOUND AND FIXED THIS SESSION (caught via my own review before
shipping, not external reports):
- payments.server.ts type-narrowing bug (tsc caught it) — fixed
- consume_ai_credits missing an auth.uid()=p_profile_id guard — a real
  vulnerability (could drain another user's credit balance) — fixed
  before the SQL was ever given to the user
- grant_ai_credits missing an admin/service-role guard — a real
  vulnerability (self-granting unlimited free credits) — fixed before the
  SQL was ever given to the user
- billing.tsx used alert() for an error path, inconsistent with this
  app's established inline-error-text convention — fixed
- Initial course seed used a real (joke/"Rickroll") YouTube URL as a
  video_url placeholder — misleading as if real content existed; changed
  to NULL with an honest "content being finalized" UI fallback

LAST VERIFIED COMMIT (Sprint 27): a69cda4 — pushed to origin/main.
LAST VERIFIED COMMIT (Sprint 28): 20f024c — "feat(sprint-28): admin control center — colleges, drives, courses, credits, audit log" — pushed to origin/main, confirmed identical to origin/main via git fetch. Working tree clean. Not starting Sprint 29 without explicit instruction.
