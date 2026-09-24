# Provn — Project History (reconstructed from Git, 2026-09-20)

This document is reconstructed entirely from `git log`, migration files, and
source code. Nothing here is invented; anything not determinable from the
repository is marked as such.

## Current state (as of reconstruction)

- **Branch:** `main`, HEAD `73c8a9e` ("chore: keep Claude Code local settings
  out of version control"), tracking `origin/main`, clean working tree at
  time of writing.
- **Remote:** `https://github.com/Pavanvish10/provn.git`
- No tags exist in the repository.

## Tech stack (verify against package.json before trusting blindly)

- **Not Next.js.** Framework is **TanStack Start** on **Vite 8** + **React 19**,
  scaffolded/maintained via `@lovable.dev/vite-tanstack-config`.
- Router: `@tanstack/react-router` (file-based routes in `src/routes/`,
  generated tree in `src/routeTree.gen.ts`).
- Data: `@tanstack/react-query`.
- Backend: **Supabase** (`@supabase/supabase-js` + `@supabase/ssr`) — Postgres
  + Auth + Storage, RLS-gated throughout.
- AI: Google Gemini via `@google/genai` (current SDK; migrated off the
  deprecated `@google/generative-ai`). OpenAI Realtime for voice interviews.
  Judge0 (RapidAPI) for code execution.
- Email: Resend.
- Payments: Stripe (`src/lib/payments/`), in-progress as of the last commit —
  see "Uncommitted-sprint work in flight" below.
- Deploy target: **Vercel** (pinned explicitly in `vite.config.ts` via
  `nitro: { preset: "vercel" }`, overriding Nitro's default Cloudflare
  auto-detection).
- Styling: Tailwind CSS v4, shadcn/radix-based component library
  (`src/components/ui`).
- Package manager: both `package-lock.json` and `bun.lock` are present —
  not determinable from repository evidence which one is authoritative for
  this environment; `package.json` scripts assume `vite`/`eslint` are
  resolvable (npm or bun both work).

## Database / auth architecture

- Supabase Postgres, schema managed via `supabase/migrations/*.sql`
  (no ORM). Types generated to `src/lib/supabase/types.ts`.
- **Actor model:** three account types on `profiles.account_type`: `student`,
  `company`, `college` (college added in Sprint 26). Organization-owned data
  follows one consistent convention throughout the codebase:
  `<org>` + `<org>_members`/`<org>_admins` tables, a
  `has_<org>_role(org_id, roles[])` SECURITY DEFINER helper, and RLS
  policies gated through that helper. Companies (Sprint 25) and colleges
  (Sprint 26) both follow this pattern exactly.
- Auth: Supabase Auth. Company/college signup uses
  `admin.createUser()` + `admin.generateLink()` + Resend delivery rather
  than Supabase's public `signUp()`, because the public flow bundles a
  rate-limited default mailer (see "Fix company registration/login..."
  commit below). OAuth (Google) is present; a debug-logging leak of the
  authorize URL/redirect was removed pre-launch (`6813091`).
- Global route guards in `src/lib/auth-guard.ts`: `requireAuth`,
  `requireBusinessAccount`, `requireCollegeAccount`, `requireGuest`,
  `requireAdmin` (name inferred from usage — verify directly if depended
  on), each redirecting based on `context.user.accountType` /
  `onboardingCompleted`.
- Known past RLS bug (fixed): infinite recursion in
  `conversation_participants`' SELECT policy, self-referencing its own
  USING clause — fixed via a SECURITY DEFINER helper (`d60c527`).
- **Known current RLS gap (found in this audit, partially fixed — see
  Sprint 26 section below):** `<x>_applications` UPDATE policies
  (`job_applications`, `drive_applications`) authorize by row ownership
  only (`applicant_id = auth.uid()` / `student_id = auth.uid()`) with no
  `WITH CHECK` restricting which columns/values a non-privileged caller
  may write. Combined with this codebase's convention of calling Supabase
  directly from the browser under RLS (no server-side re-check — confirmed
  in `company-client.ts`'s `useUpdateApplicationStatus`), this means an
  applicant can self-approve/self-shortlist by calling the Supabase client
  directly with `status: 'selected'`. **Fixed for `drive_applications` /
  `drive_notifications` in this session** (see below). **`job_applications`
  (Sprint 25) has the identical shape of gap and has NOT been fixed** — out
  of scope for this Sprint-26-focused session; flagged as the top item of
  technical debt.

## Major product modules (by area, not sprint order)

- **Student core:** profile, resume upload/analysis, resume builder
  (multi-version), job board + applications, friends/messages,
  notifications.
- **Daily Challenges:** admin-curated coding practice bank, Judge0-graded,
  v3 gamification (streaks, XP/levels, badges, leaderboard, AI-generated
  questions).
- **Mock interviews:** voice (OpenAI Realtime transport + Gemini-generated
  questions) and text mode; technical/HR/behavioral/managerial types;
  full scoring + report pipeline.
- **Coding interview engine:** Gemini-generated, Judge0-graded one-off
  problems distinct from the Daily Challenges bank.
- **Career intelligence:** eligibility reports (ATS/company/role fit),
  career roadmaps (generic + company-specific prep plans), skill-gap
  analysis, job recommendations, interview analytics dashboard, AI mentor
  chat.
- **Business Hub (companies):** company accounts, job postings, applicant
  pipeline, recruiter notes/audit trail, candidate bookmarking/detail
  drawer, AI match scoring.
- **Campus placement drives (colleges)** — Sprint 26, see below.
- **Payments/subscriptions** — in progress, see below.
- Global AI chatbox widget (ephemeral, non-persistent, distinct from the
  Mentor's persisted multi-conversation chat).

## Sprint history (reconstructed from commit messages)

Sprints 1–10: **not determinable as discrete numbered units from repository
evidence.** The "Completed Sprint N" commit-message convention only starts
at Sprint 11. Pre-Sprint-11 history exists as unnumbered commits, the
largest being `df99509` ("Complete Provnn Business HR module, Live Resume
and AI recruitment") which appears to be the bulk of the original
Business Hub / resume / recruitment foundation, followed by a string of
production-hardening fixes (secrets removal, Gemini SDK migration through
three model deprecations, company signup/email fixes, JWT-leak fix, SSR
circular-chunk crash fix, RLS recursion fix, Daily Challenges v3, streak
system). Treat any "Sprint 1–10" framing as informal, not a documented
engineering unit.

- **Sprint 11** (`50f7a4c`) — no commit body. Content not determinable
  from the commit message alone; would require a full diff read to
  characterize (not done in this pass — low priority, pre-dates every
  later sprint's dependencies).
- **Sprint 12** (`bc8c187`) — Finished Job Description Analysis: added
  `/interview/job-description` route, wired resume-upload → JD analysis →
  interview setup pre-fill.
- **Sprint 13** (`63ca1cb`) — Real Resume Analysis AI: replaced the mock
  session-only resume analysis in the interview flow with the real
  Gemini-backed, DB-persisted pipeline already used by `/profile` and
  `/resume-analyse`. Added `requireAuth` to `/interview/*` (closed a
  pre-existing access-control gap).
- **Sprint 14** (`f7ce6ca`) — Real AI Mock Interview Engine: connected
  `/interview/setup → room → report` to the real
  `voice-interview.server.ts` / `voice_interview_sessions` engine,
  replacing a hardcoded question bank + fake transcript scoring. Added
  text-mode interviews. Verified via a real Playwright pass.
- **Sprint 15** (`643cae6`) — AI Career Roadmaps: `career_roadmaps` +
  `career_roadmap_tasks`, Gemini-generated skill gap/milestones, `/career-roadmap` route.
- **Sprint 16** (`7e48729`) — ATS Engine & Company Eligibility AI:
  `eligibility_reports` (append-only history), `/eligibility` route.
- **Sprint 17** (`493b9a0`) — AI Coding Interview Engine:
  `coding_interview_sessions`, Judge0-graded, Gemini-generated problems +
  6-dimension evaluation, `/coding-interview` route. Hidden test cases are
  never selected client-side (separate `sample_test_cases` column).
- **Sprint 18** (`f7bf1ce`) — AI HR Interview Intelligence: extended
  `voice_interview_sessions` with a `behavioral` type + HR-specific score
  columns, `/hr-interview` landing page.
- **Sprint 19** (`cd1c4e1`) — AI Resume Builder & Optimizer:
  `resume_versions` + `resume_optimizations`, `/resume-builder` route,
  browser-native print-to-PDF export.
- **Sprint 20** (`e7c301c`) — AI Job Recommendation Engine:
  `job_recommendations` (append-only), recommends only against real
  jobs/companies data with a Gemini qualitative overlay, `/job-recommendations` route.
- **Sprint 21** (`a2dcd52`) — Skill Gap Analysis: deepened
  `eligibility_reports` with soft-skill/DSA/system-design scores +
  structured per-skill learning breakdown. No fabricated resource URLs.
- **Sprint 22** (`15ff467`) — Company Prep Roadmaps: extended
  `career_roadmaps` with certification/revision/mock-interview-schedule
  plans; added CRED, Meesho to the company knowledge base.
- **Sprint 23** (`0622bf3`) — Interview Analytics Dashboard: read-side
  aggregation over Sprints 13–22's data, one new table
  (`analytics_snapshots`) for cached AI insights + public share links
  (service-role read path).
- **Sprint 24** (`1b8cb04`) — AI Mentor Chat: persisted multi-conversation
  `mentor_conversations`/`mentor_messages`, `/mentor` route, context-aware
  via Sprint 23's analytics aggregation.
- **Sprint 25** (`243aac9`) — AI Recruiter & Startup Hiring Portal:
  extended the existing Business Hub with recruiter notes, status-change
  audit trail, candidate bookmarking, candidate detail drawer, 3 new
  filters. **Fixed a routing bug affecting 11 `/business/*` sub-routes**
  (parent route never rendered `<Outlet/>`, so nested URLs silently showed
  the dashboard instead — fixed via the `business_.foo.tsx` parent-escape
  naming convention) and a notification bug (status-change trigger passed
  the applicant as both recipient and actor, so the anti-self-notify guard
  silently ate every notification).
- **Sprint 26** (`517f965`) — AI Campus Placement Drive System. See
  dedicated section below.
- **Sprint 27 (Payments & Premium)** — the `b926338` scaffolding
  (`src/lib/payments/` provider abstraction + migration
  `20260808000000_payments_subscriptions.sql`) turned out to be genuine
  in-progress Sprint 27 work, now being actively completed. See the
  dedicated Sprint 27 section below for full detail and current status.

## Sprint 26 — AI Campus Placement Drive System (detailed)

**Commit:** `517f965532974fed1bc3814ec9976ce42795f88f1` (parent: `243aac9`
Sprint 25; children: `b926338` payments-in-flight, `73c8a9e` gitignore
chore — nothing after Sprint 26 touches campus-drive files, so `517f965`'s
tree is still current for this feature, modulo the fix applied in this
session).

**New actor type:** `college`, added to `profiles.account_type` check
constraint. `profiles.cgpa` added.

**New tables** (`supabase/migrations/20260807120000_campus_placement_drives.sql`):
`colleges`, `college_admins` (+ `has_college_role()` SECURITY DEFINER
helper mirroring Sprint 25's `has_company_role`), `placement_drives`,
`drive_applications`, `drive_shortlists` (per-round shortlist history,
distinct from `drive_applications.status`'s single current state),
`drive_notifications` (drive-scoped log, fans out into the existing
generic `notifications` table via trigger — `notifications_type_check`
widened with `'drive_update'`).

**Triggers:** `on_drive_application_status_change` (submitted/shortlisted/
rejected/interview_scheduled → notification), `on_drive_closed` (notifies
every applicant when a drive's status flips to `closed`).

**Server functions** (`src/lib/college.server.ts`): `checkDriveEligibilityFn`
(deterministic, no Gemini dependency — CGPA/branch/graduation-year/
year-of-study criteria + a fit score blending eligibility 50% / resume ATS
score 30% / interview performance 20%), `applyToDriveFn` (checks drive is
published, deadline not passed, eligible, under `max_applicants`),
`withdrawDriveApplicationFn`, `shortlistApplicantFn` (stages: shortlisted
→ interview_scheduled → selected, also writes a `drive_shortlists` row),
`rejectApplicantFn`, `generateDriveRankingInsightsFn` (Gemini, optional),
`generateMissingSkillSuggestionsFn` (Gemini, optional, only for rejected
applications).

**Routes** (all flat top-level files, deliberately avoiding the
Outlet-less-parent bug from Sprint 25): `college.tsx` (admin dashboard —
`requireCollegeAccount` guard), `college-drive.$driveId.tsx` (single-drive
admin view — `requireCollegeAccount`), `drives.tsx` (student browse —
`requireAuth`), `drive.$driveId.tsx` (student single-drive view —
`requireAuth`), `my-drives.tsx` (student application tracker —
`requireAuth`). **Verified in this audit session:** all 5 routes correctly
wire their guard via `beforeLoad`; none branch top-level structure on
`isLoading` (explicit comments confirm this was deliberate, consistent
with the commit message's claim of applying Sprint 25's hydration-mismatch
fix).

**Verified in this audit session — RLS/authorization:**
- `placement_drives`, `colleges`, `college_admins` policies: correctly
  scoped, no issues found.
- `drive_shortlists` insert policy: correctly requires
  `has_college_role` on the *specific drive's* college (properly scoped
  per-college, not just "any college admin").
- **`drive_applications` UPDATE policy: had no `WITH CHECK`, allowing a
  student to update any column on their own row** — i.e. self-approve
  (`status: 'selected'`) or forge their own `ai_fit_score` by calling
  Supabase directly from the browser, completely bypassing
  `shortlistApplicantFn`/`rejectApplicantFn`. `rejectApplicantFn` itself
  also had no explicit role check (consistent with this codebase's
  convention of RLS-as-sole-authorization — see `useUpdateApplicationStatus`
  in `company-client.ts` for the established pattern), so it silently
  relied on this same broken policy.
  **Fixed in this session** via
  `supabase/migrations/20260920000000_fix_drive_application_self_approval.sql`
  — a `BEFORE UPDATE` trigger (chosen over a `WITH CHECK` self-subquery
  because trigger `OLD`/`NEW` access is unambiguous) that lets
  non-privileged callers (not an admin, not a college admin of the drive's
  college) only flip `status` to `'withdrawn'` and touch no other column.
  College admins/platform admins are unaffected.
  **Status as of 2026-09-20: FULLY FIXED AND CONFIRMED LIVE (round 5 of
  live verification, 9/9 assertions passing).** The
  `drive_applications`/`drive_notifications` triggers were confirmed live
  and correct via 4 independent rounds of throwaway-account exploit
  testing (self-approval blocked, forged fit score blocked, legitimate
  withdraw/shortlist/notification-read all still work).

  The `college_admins` takeover exploit, however, reproduced identically
  across all 4 rounds — including after the old `college_admins_owner_write`
  policy was confirmed absent via a direct `pg_policy` query and the
  correct 4 replacement policies were confirmed present. The actual root
  cause (found by re-deriving the policy logic by hand, not by more
  database queries): `college_admins_bootstrap_or_admin_insert`'s
  "does this college already have an admin" check was a raw subquery on
  `college_admins` itself, which is subject to that table's OWN SELECT
  policy (`college_admins_visible`) — so an outside attacker, who can't
  see rows they don't own, always sees the college as "empty of admins"
  regardless of whether it actually has one. Same class of bug as this
  codebase's own prior "infinite recursion in conversation_participants
  RLS policy" incident. Fix (matching the same has_college_role/
  has_company_role SECURITY DEFINER pattern already used throughout this
  schema): `supabase/migrations/20260920010000_fix_college_admins_bootstrap_rls_blindspot.sql`,
  adding `public.college_has_any_admin()` and redefining the insert
  policy to use it. Applied to the live database and confirmed via a
  throwaway-account exploit test: a random unaffiliated user can no
  longer self-insert as owner into an existing college, while legitimate
  first-time bootstrap and existing-admin-adds-a-member both still work.

  Both migrations (`20260920000000_fix_drive_application_self_approval.sql`
  and `20260920010000_fix_college_admins_bootstrap_rls_blindspot.sql`)
  are applied live and committed to the repository.
- `drive_notifications` UPDATE policy had the identical shape of gap
  (recipient could rewrite `message`/`type`, not just `is_read`) — fixed
  in the same migration. Lower severity (no privilege gained, just
  defacing a notification only the recipient can see).
- **A second, more severe bug found reading `college-client.ts`'s
  `useCreateCollege`:** `college_admins_owner_write` was a blanket
  `for all` policy whose `WITH CHECK` accepted `profile_id = auth.uid()`
  unconditionally — any authenticated user could INSERT themselves as
  `owner`/`admin` into an **existing** college's `college_admins` (full
  takeover of that college's drives + CSV export of real students' PII +
  shortlist/reject power), or UPDATE their own row to reassign
  `college_id`/`role`. **Fixed in the same migration**: replaced with
  three scoped policies — self-insert now only permitted as a genuine
  bootstrap (the college has zero existing admins yet, and `role = 'owner'`
  only); update/delete require an existing college admin or platform
  admin.
- **Minor, not fixed (documented only):** `applyToDriveFn` /
  `drive_applications_student_insert` don't check `profiles.account_type`
  — a company or college account could technically self-insert a
  "student" drive application. Data-integrity issue, not a privilege
  escalation (no cross-account data exposure results).
- **Not yet fixed, out of this session's scope:** `job_applications`
  (Sprint 25) has the identical vulnerability shape to the first
  `drive_applications` bug above. See "Known current RLS gap" above.

**Not independently re-verified in this session** (time-boxed; flagged for
the next pass): `college.tsx`'s create/edit/publish/pause/close drive UI,
CSV export, ranked-applicant view; `college-client.ts` (454 lines, not yet
read); `drives.tsx`/`drive.$driveId.tsx`/`my-drives.tsx` UI bodies beyond
the guard/hydration check already done; whether `CollegeNav.tsx` links are
all live; whether `college_admins` onboarding (how a college account
actually gets `joined_at` set / becomes an "owner") has a real, reachable
UI flow or only exists at the DB/type level.

## Sprint 27 — Payments & Premium (in progress, 2026-09-21)

Not a greenfield build. Real scaffolding was already sitting in the repo
from an earlier, never-completed session (commit `b926338`, "backup before
laptop change"): the `src/lib/payments/` provider abstraction (mock ⇄
Stripe) and `supabase/migrations/20260808000000_payments_subscriptions.sql`
(already live: `subscription_plans`/`subscriptions`/`payments`/`invoices`/
`coupons`/`coupon_redemptions`/`payment_webhook_events`, full RLS, seeded
plans, a trigger syncing the legacy `premium_subscriptions` table). `/plan`
and `/business/subscription` already existed with a disabled "Payments
coming soon" button — UI shell existed, checkout did not.

Confirmed before writing code: only roadmap video lectures had real
premium enforcement; `challenges.is_premium` existed with full admin CRUD
but was inert (never read student-side); no usage-quota logic existed
anywhere (free-tier "2 mock interviews" copy was cosmetic); no `courses`
or AI-credits concept existed at all. Plan approved via `EnterPlanMode`
before implementation.

**New migration:** `supabase/migrations/20260921000000_courses_and_ai_credits.sql`
— `courses`/`course_purchases` (one-time purchases, external `video_url`,
explicitly not an LMS), `credit_packs`/`ai_credit_balances`/
`ai_credit_transactions` (a generic AI-credits wallet), `consume_ai_credits`/
`grant_ai_credits` SECURITY DEFINER functions (atomic via row locking,
same pattern as `has_college_role`). Two real vulnerabilities were caught
and fixed during my own review *before* ever giving this SQL to the user
(not found by an external report): `consume_ai_credits` originally let an
authenticated caller spend an arbitrary `p_profile_id`'s balance (fixed
with an `auth.uid() = p_profile_id` guard, bypassed only when
`auth.uid()` is null i.e. called via the service-role/admin client);
`grant_ai_credits` originally let any authenticated user self-grant
unlimited free credits (fixed, admin/service-role only).

**Status as of 2026-09-21: COMPLETE AND VERIFIED LIVE.** Migration applied
to the live database and confirmed via a 3-throwaway-account verification
run (25 assertions: subscribe/cancel lifecycle + `premium_subscriptions`
trigger sync, course purchase + duplicate-purchase prevention, AI-credit
grant/spend atomicity, both security fixes (cross-user credit theft,
self-granting) confirmed blocked, cross-account RLS isolation on every
new table, admin billing visibility) — 24/25 passed outright; the
remaining 2 "failures" were re-investigated immediately and found to be a
false positive in the *test script's* error-checking (Supabase's
`.update()` returns no error on an RLS-blocked 0-row write unless you
chain `.select()`), not application bugs — confirmed via a precise
read-back that the underlying values were genuinely unchanged in both
cases. All test data deleted and swept for leftovers (zero found). Full
local suite (tsc/lint/build/Playwright) re-run clean after live
verification. See `.claude/progress.md` for the complete file list,
feature breakdown (checkout server functions, the `/api/stripe-webhook`
route mirroring `sitemap[.]xml.ts`'s `server.handlers` shape,
`payments-client.ts`, the billing/courses/admin-billing UI, the
`challenges.is_premium` gating extension, and the AI-credits reference
integration in `sendChatMessageFn`), and the full verification transcript.

One genuine finding from verification (not a defect — the gating code is
correct and structurally identical to the already-proven
`job-preparation.tsx` pattern): zero challenges in the live database
currently have `is_premium = true`, so the new gate has nothing to
actually gate yet. A content/product decision for whoever manages
`/admin/challenges`, not something changed unilaterally here.

Known deliberate scope boundary (documented in the approved plan, not an
oversight): AI-credit metering is wired into exactly one feature
(`ai-chat.server.ts`, the simplest single-call AI feature) as a reference
implementation, not into every AI feature — extending it further is real,
separate follow-up work. `cancelSubscriptionFn` cancels immediately
(no deferred cancel-at-period-end) since this codebase has no
cron/scheduler to flip status later automatically — an honest limitation,
not a hidden one.

## Sprint 28 — Admin Control Center (complete, 2026-09-21)

Requested as a broad checklist (dashboard, user/college/recruiter/company/
job/drive/course/billing/credit management, analytics, reports, moderation,
roles, audit log, RLS, real data). Inventoried first rather than assumed:
11 admin pages already existed (`admin.tsx` hub, users, companies, jobs,
challenges, roadmaps, premium, notifications, reports, analytics, billing
— billing from Sprint 27). `admin.users.tsx` already fully covers
**student/user AND recruiter management** via `profiles.role` (`user` /
`recruiter` / `company_admin` / `admin`) with search, ban/unban, role
change (including granting/revoking admin — **admin permissions/roles**
was already built), and audit logging via the existing `admin_actions`
table + `logAdminAction()` helper (used by every admin mutation already —
the audit-log *write* side was complete, only a *viewer* page was
missing). `admin.companies.tsx`, `admin.reports.tsx` (moderation), and
`admin.analytics.tsx` (platform analytics) were already built.

Genuinely missing, confirmed via grep (zero prior references): **colleges,
placement drives, courses, AI credits, and an audit-log viewer** — plus
`admin.tsx`'s section grid was missing a card for Billing (built in
Sprint 27, never linked from the hub — a real gap, fixed).

**No new migration** — re-verified the Sprint 26/27 RLS before writing any
code: `colleges_owner_update`, `college_admins`' write policies,
`placement_drives_admin_write`, `courses_admin_write`, and the
`course_purchases`/`ai_credit_balances`/`ai_credit_transactions`
visibility policies all already include `public.is_admin()` as an
alternative condition, and `grant_ai_credits` was already admin-safe from
Sprint 27's own security fix. Admin already had full DB-level access to
everything Sprint 28 needed to manage — this was a pure application-layer
sprint, like Sprint 25.

**5 new admin pages**, each built by mirroring an existing proven
template rather than inventing new patterns: `/admin/colleges` (mirrors
`admin.companies.tsx` exactly — verify toggle, "suspend" by closing the
org's open drives instead of a nonexistent `suspended` column, same as
companies do for jobs), `/admin/drives` (mirrors `admin.jobs.tsx` —
cross-college oversight, pause/reopen/close; deliberately no hard delete,
since real student applications cascade from a drive), `/admin/courses`
(mirrors `admin.roadmaps.tsx`'s master/detail CRUD — deliberately
delist/relist via `is_active` instead of hard delete, since real
`course_purchases` may reference a course), `/admin/credits` (mirrors
`admin.premium.tsx`'s search-and-grant panel + `admin.billing.tsx`'s
paginated-list pattern — grant only, no admin-side deduction, matching
the existing grant/revoke-only convention and avoiding new attack surface
on `consume_ai_credits`, which is deliberately not admin-bypassable),
`/admin/audit` (new, simple paginated read of `admin_actions`).

Also fixed a real "fake data" gap found while reviewing Analytics for
Sprint 28 (explicitly in scope — "no fake/demo data"): `estimatedMonthlyRevenue`
was `premiumSubscriberCount × ₹299`, a guess, and the page's own copy
admitted *"payments aren't wired up yet, so this isn't billed revenue"* —
no longer true since Sprint 27 built a real `payments` table.
`admin-analytics-client.ts` now sums real `payments.amount_cents` for
`status = 'succeeded'` (all-time and trailing-30-day), same
fetch-and-reduce-client-side approach already used for `weeklySignups` in
the same file (no new RPC needed). Extended `admin-overview-client.ts`
with 3 new real stat counts (unverified colleges, published drives,
active courses) and added matching tiles to the hub.

**Live-verified** with a 2-throwaway-account script (a real admin account
+ a real student account, both signed in through their own sessions, not
the service-role client) — 17/17 assertions pass: admin can verify a
college / suspend its drives / manage placement drives / create and
delist a course / grant AI credits / read the audit log, all through the
exact RLS-scoped queries the new pages use; a non-admin student is
blocked from every one of those same actions (college verification,
drive reopening, course creation, AI-credit self-granting, audit-log
reads) — confirming isolation, not just the route guard. All test data
deleted and swept for leftovers (zero found).

Full local suite (tsc/lint/build/Playwright, 12/12 — extended with 6 new
route-guard checks for the new admin pages) clean.

## Sprint 29 — Notifications & Communication System (complete, 2026-09-21)

Requested as a broad checklist (in-app notifications, notification center,
read/unread, categories, preferences, email integration, deep links,
event coverage for student/recruiter/college/admin, RLS, tests). Far more
already existed than expected: the `notifications` table, `create_notification()`
(SECURITY DEFINER, anti-self-notify guard), ~20 real trigger call sites
across nearly every prior sprint, full recipient-scoped RLS, and a
complete client hook set (paginated infinite query, unread count,
mark-read, mark-all-read, delete, **and Supabase Realtime, already
wired into both notifications.tsx and business_.notifications.tsx**) —
all predated this sprint.

Genuine gaps found by inventorying first, confirmed by reading code
directly rather than assumed:
1. **A real, previously-undiscovered bug**: `useSendSystemNotification`
   (admin-notifications-client.ts, from an earlier sprint) does a raw
   client-side insert into `notifications`, but no INSERT policy for
   `authenticated` has ever existed on that table (confirmed by grepping
   every migration) — admin-sent system notifications have been silently
   failing under RLS default-deny. Fixed with a policy scoped to
   `is_admin() and type = 'system'` only, so an admin session can never
   forge any other notification type.
2. **Zero deep links** — clicking a notification only marked it read,
   despite `entity_type`/`entity_id` already being stored. Built
   `src/lib/notification-links.ts`, a resolver mapping every real
   `(type, entity_type)` pair (enumerated by grepping every
   `create_notification()` call site in migration history) to an actual
   existing route — verified each target, not guessed: no single-post
   page exists so like/comment → `/home`; no single-job page exists so
   company_post/job_invite → `/apply`; `/messages` only accepts
   `?to=<profileId>` (not a conversation id) so message → `/messages`;
   `/interview/report` requires in-memory flow state
   (`InterviewFlowController`) and can't be cold-deep-linked, so
   mock_interview → `/interview-practice`; challenge_completion stores a
   challenge UUID but the route is slug-based, resolved via a one-off
   lookup at click time; job_update/interview/billing_update branch on
   the viewer's account type since the same `type` serves both audiences
   (each page passes a literal "student"/"company", no runtime lookup
   needed — the two pages already are separate student/business routes).
3. **`TYPE_META` was stale** in both notification pages — missing
   job_invite/interview/company_post/drive_update/billing_update entirely.
4. **No `notification_preferences` concept anywhere.** New table:
   per-category in-app toggles (social/jobs/placements/learning) + one
   `email_notifications` master switch. Billing/system categories have
   **no column at all** (not just defaulted true) — Phase 8's "critical
   notifications must not be disableable" enforced structurally.
   `create_notification()` extended to consult preferences before
   inserting — same function signature, zero changes needed at any of
   the ~20 existing call sites.
5. **Course purchases and AI credit-pack purchases never notified** —
   only subscriptions did (via the pre-existing `on_subscription_status_change`
   trigger). Added one new trigger on `payments` (`AFTER INSERT`,
   `status = 'succeeded' AND subscription_id IS NULL`) reusing the
   existing `billing_update` type — scoped by the data itself (subscription
   payments always carry a `subscription_id`; course/credit-pack payments
   never do) so it can never double-notify a subscription purchase.

**A second real vulnerability caught during my own security review**
before ever sharing the migration (same discipline as Sprint 27's two
credit-function fixes): `notifications_recipient_update` had no column
restriction — a user could rewrite their own notification's `message`/
`type`/`entity_id`, not just `is_read`. Phase 12 of the task explicitly
required "users cannot modify notification content." Fixed with the
same `BEFORE UPDATE` trigger pattern already used twice in Sprint 26
(`drive_applications`/`drive_notifications`) — restricts non-admin
updates to `is_read` only.

Migration: `supabase/migrations/20260922000000_notification_preferences.sql`.
Applied live and verified with a 3-throwaway-account script exercising
**real trigger paths** (an actual post + a real like, a real payments
insert) rather than calling `create_notification()` directly — 13/13
assertions pass: preference gating suppresses/allows notifications
correctly, the content-tamper fix blocks rewriting while still allowing
mark-as-read, the admin-insert fix works and stays scoped to `system`
only, the new payment trigger fires for course/credit purchases and
correctly does not double-fire for subscription payments. All test data
deleted and swept for leftovers (zero found).

One reference email-gating integration (matching Sprint 27's own "one
reference call site, not universal coverage" scope choice, documented
rather than silently narrow): `sendApplicationStatusEmailFn` in
business-emails.server.ts now checks the recipient's `email_notifications`
preference before sending.

Full local suite (tsc/lint/build/Playwright 14/14 — added 2 new
route-guard checks for `/notifications` and `/business/notifications`,
which had no Playwright coverage at all before this sprint) clean.

## Sprint 30 — Production Engineering, Performance & Reliability (complete, 2026-09-22)

Not a feature sprint — explicitly scoped to making the existing platform
faster, more reliable, and safer to run in production, without removing or
weakening anything. Audited via 4 parallel focused passes (performance,
database indexing, security/authorization, payment-idempotency/resilience)
rather than a single linear read-through, each grounded in grep evidence
against real call sites before any fix was written.

**Performance** — 4 real, verified findings fixed:
1. `useBusinessAnalytics` (business-analytics-client.ts) downloaded every
   `job_applications` row for a company and reduced funnel counts in JS —
   unbounded as application history grows. Replaced with 7 parallel
   `count: exact, head: true` queries (one per funnel stage + total).
2. Two `skills` queries used `select("*")` when only `profile_id`/
   `skill_name`/`verified` were consumed downstream (company-client.ts
   already had the correct narrow-select version elsewhere in the same
   file — recruiter-client.ts's candidate search didn't; narrowed to match).
3. messages-client.ts's unread-count query had no bound — a user's total
   unread backlog across all conversations was fetched in full just to
   count it in JS. Added a `.limit(2000)` safety cap.
4. `useCompanyApplications` (company-client.ts) independently re-fetches
   `jobs` by `company_id` when `useCompanyJobs` already fetched the same
   table on the same page (business_.applicants.tsx uses both) —
   documented but deliberately **not** fixed: the duplication is one small,
   bounded query per page load (a company's own job count), not a
   scaling risk, and de-duplicating it would mean threading fetched data
   through a hook signature change across multiple call sites for
   marginal gain — judged disproportionate for this sprint.

**Database indexing** — 5 new indexes, each justified by a real,
currently-shipping query (grepped from every `.eq()`/`.order()` call in
`src/lib/*-client.ts` against what's actually indexed in all 55 prior
migrations, not proposed speculatively):
`jobs (status, posted_at desc)`, `jobs (company_id, status, posted_at
desc)` — the public job board and a company's own list both sort what
they filter, existing indexes were single-column only.
`drive_applications (drive_id, ai_fit_score desc)`, `drive_applications
(student_id, applied_at desc)` — same gap, a drive's applicant ranking
and a student's own application history.
`notifications (recipient_id) where is_read = false` (partial) — the
unread-badge count polls this exact filter for every signed-in user; a
partial index keeps it small since `is_read` only ever flips one way.
`subscriptions (profile_id, status)` — the premium-entitlement check
(`profile_id = X and status in (...)`) runs on nearly every gated action.
New migration: `supabase/migrations/20260923000000_sprint30_performance_indexes.sql`.
Applied live by the user via the Supabase SQL editor (no CLI/psql access
this session, same constraint as every prior sprint) and confirmed via a
live probe script: each index's target query shape executes cleanly, and
— the assertion that actually matters — a disposable test profile's
second payment insert reusing the same `idempotency_key` was rejected
with a real Postgres unique-violation (code 23505), proving the new
partial unique index enforces the fix at the database level. All test
data deleted after and swept for leftovers (zero found).

**A real payment-duplication bug**, exactly the kind Phase 11 of the task
called out by name ("payments must never be accidentally duplicated"),
found by a focused agent pass reading `api.stripe-webhook.ts` and
`payments.server.ts` in full:
- Confirmed safe: the Stripe webhook's idempotency check is backed by a
  real DB-level `unique` constraint on `payment_webhook_events.event_id`
  (migration 20260808000000), not a racy SELECT-then-INSERT — two
  concurrent deliveries of the same event genuinely can't double-process.
  Subscription checkout is likewise protected by a pre-existing partial
  unique index (`subscriptions_one_active_per_profile`).
- **Not safe, and fixed**: `createCoursePurchaseCheckoutFn` inserted the
  `payments` row BEFORE checking/creating `course_purchases`, so two
  near-simultaneous calls (a retried request after a client timeout, two
  open tabs) could each pass the earlier non-atomic `existing` SELECT and
  both insert a payment row, leaving an orphaned duplicate. Reordered to
  insert `course_purchases` first — its real `unique(course_id,
  profile_id)` constraint is what's actually race-safe — with a
  compensating delete of that row if the subsequent payment insert fails,
  so a user is never left with course access and no payment record.
- **Not safe, and fixed**: `createCreditPackCheckoutFn` had no uniqueness
  guard of any kind — unlike subscriptions/courses, repeat credit-pack
  purchases are legitimate, so there's no natural one-row-per-user
  constraint to lean on. Added a client-generated idempotency key
  (`crypto.randomUUID()`, generated once per checkout attempt) threaded
  through to a new `payments.idempotency_key` column (nullable + partial
  unique index). A duplicate submission with the same key now hits the
  unique constraint and returns the already-granted result instead of
  double-charging or double-granting credits. Scoped only to this one
  path — subscriptions and course purchases already have their own
  table-level protection and didn't need the extra column.
- Both fixes are structurally scoped to the mock payment provider's
  synchronous-activation path specifically (real Stripe only ever writes
  these rows from the webhook, which was already confirmed idempotent) —
  but the mock provider is also what actually runs whenever
  `STRIPE_SECRET_KEY` isn't configured, including in production per
  `.env.example`'s own documented fallback behavior, so this isn't a
  dev-only fix.

**Resilience**: Judge0's two raw `fetch()` calls (judge0.server.ts) had no
timeout and could hang indefinitely on a slow/unresponsive RapidAPI
endpoint. Added `AbortSignal.timeout()` (15s for the language list, 20s
for code execution) — both call sites already had try/catch returning a
typed `{error}` response to the caller (confirmed by the audit before
touching anything), so this only bounds the failure case, no change to
the success path.

**Security audit**: a parallel pass read every `createServerFn` accepting
a client-supplied id (~86 across the codebase) for authorization gaps,
grepped for secret-leakage into client bundles, reviewed the Stripe
webhook route, and checked every `using (true)` RLS policy. Came back
clean — no new findings. Confirms Sprints 26-29's authorization work
already closed what mattered here; recorded as "audited, nothing found"
rather than manufacturing a finding to justify the pass.

**5 real, previously-documented-but-unfixed bugs** from
`DEPLOYMENT_CHECKLIST.md`'s Sprint-12-era pre-launch audit, each
re-verified still present in the current code before being touched:
1. Onboarding dead-end — resume-setup.tsx's "Fill in your profile
   instead" link sent a mid-onboarding user to `/profile`, which wasn't
   in `auth-guard.ts`'s `STUDENT_ONBOARDING_PATHS` allowlist, so
   `requireAuth` bounced them straight back to step 1. Fixed by adding
   `/profile` to the allowlist.
2. Silent write failure — `plan.tsx`'s `finishOnboarding` discarded the
   `premium_subscriptions` upsert's error and completed onboarding
   anyway. Now checked and surfaced via a `finishError` state.
3. Same silent-failure shape in `location.tsx`/`profession.tsx` — a
   failed profile write had no `catch`, so it became an unhandled
   rejection with the spinner just stopping and zero user feedback. Both
   now catch and render a destructive-text error message.
4. Two unguarded resume signed-URL fetches in `business_.applicants.tsx`
   (the card "Resume" button and the detail-sheet preview) — a failed
   request did nothing visibly. Both now try/catch with a `sonner`
   `toast.error`.
5. Shell inconsistency — `business_.advertising.tsx` and
   `business_.marketing.tsx` rendered in the generic `AppShell` instead
   of `BusinessShell` despite being linked from the Business Hub sidebar,
   dropping the user out of the business nav/layout. Both migrated to
   `BusinessShell`, matching every other `/business/*` page; the now-
   redundant manual "Business Hub" back-links were removed since
   `BusinessShell`'s own sidebar already provides that.
(Checklist item 6 — the `/interview/*` flow having no auth guard — was
re-checked and found already resolved in a later sprint: every
`/interview/*` route now calls `requireAuth`. No action needed.)

Also removed 3 stray files that had been accidentally committed into the
repo root in an old session (`"Bash tool output (y0050d).txt"`,
`"Grep output (xxc48s).txt"`, `"et HEAD~1"` — shell-redirect debris,
confirmed via `git log` to trace to commit `b926338`, not anything any
sprint relied on).

Full local suite (tsc/lint/build/Playwright 16/16 — added 2 new
route-guard checks for the two BusinessShell-migrated routes) clean, both
before and after the live database verification pass. Sprint complete.

## Sprint 31 — Production Readiness Audit + Fixes (complete, 2026-09-24)

Two-phase sprint: a full audit (report delivered, approved by the user)
followed by implementing the approved fix list in the user's mandated
priority order. Every fix reused an established pattern from Sprints
26-30 rather than inventing a new one.

**Audit method**: 4 parallel focused sub-agent passes (application flows
split student-facing vs. company/college/admin-facing, database/RLS,
security deep-dive) plus direct manual verification of every high-severity
claim before it was trusted — this caught one sub-agent overstatement
(`courses.$courseId.tsx`'s Buy-button bug was real but not as severe as
first reported: react-query resets `isPending` on any settled mutation
regardless of whether the caller catches the rejection, so the button was
never actually stuck — the real defect was just a missing error message)
and one flatly incorrect finding (`debug_list_policies()` was claimed
still-granted; it was in fact already dropped by migration
`20260728000600`, confirmed by matching the exact function signature).

**Two real, verified security findings**, both closed with the same
guard-trigger pattern already used 4 times in prior sprints (compare
OLD vs NEW inside a `BEFORE UPDATE` trigger, since a Postgres RLS
`WITH CHECK` clause alone can't express an OLD-vs-NEW column-level
restriction):
1. `company_members` cross-tenant hijack — the UPDATE policy
   (`company_members_update_delete`, migration `20260728000400`) had a
   `USING` clause but no `WITH CHECK`; since `USING` on UPDATE only
   evaluates the OLD row, an owner/admin of one company could UPDATE
   their own membership row and set `company_id` to a different company
   (with `role='owner'`), hijacking that tenant's recruiter dashboard.
   New trigger `guard_company_members_update` blocks `company_id`/
   `profile_id` changes for non-admins. No app code currently calls
   UPDATE on this table at all (grepped every client/server file), so
   nothing legitimate was restricted — only the attack surface closed.
2. `job_applications` scoring-column tamper — `status` was already
   guarded (pre-existing trigger, predates Sprint 26), but
   `ats_score`/`job_match_percentage`/`skills_score` had no restriction,
   letting an applicant directly overwrite their own application's match
   score, bypassing `matching-scores.server.ts`'s real computation.
   `guard_job_application_update` extended to also block those columns
   for non-recruiter, non-service-role sessions; `matching-scores.server.ts`
   switched to write via the admin/service-role client after its existing
   auth check (same pattern as payments/subscriptions/AI credits), so the
   legitimate scoring flow still works while a direct client write is now
   rejected by the trigger.

**Real skill-verification feature gap closed** (found by an audit
sub-agent, independently confirmed via schema read + full-tree grep
before trusting it): the `skills` table schema (`source` column with a
check constraint allowing `'challenge'`, a `verified_at` timestamp) was
explicitly built for a verification pipeline that was never wired up —
`profile.tsx` has told users "Skills become verified by passing a coding
challenge in that category" with no code path that ever made it true.
New trigger `verify_skills_on_challenge_pass` (`AFTER INSERT` on
`challenge_submissions`, the table exclusively written by
`judge0.server.ts`'s real Judge0-graded `submitChallengeFn` — not
client-forgeable) marks each of the passed challenge's `tags` as a
verified skill for that profile, upserting a new skill row if none
existed. Reuses the same tag vocabulary `jobs.tags`/matching-scores
already use — a direct implementation of already-scoped product intent,
not a new concept.

**The skill-verification trigger took 5 migration rounds to actually
land, and the reason is worth recording for future sessions.** Round 1
(bundled into the main `20260924000000_sprint31_security_fixes.sql`)
targeted `on conflict (profile_id, lower(skill_name))`, matching a unique
INDEX created in `20260726220130` — but that index had been dropped and
replaced by a plain-column unique CONSTRAINT
(`skills_profile_id_skill_name_key`) in
`20260727000500_skills_unique_fix.sql`, missed during the original audit.
Every real challenge-pass insert failed with Postgres `42P10`. Round 2
(`20260924010000`) retargeted the conflict clause at the correct
constraint by name — same `42P10` error, reproduced. Investigated rather
than guessing a third spelling: confirmed live that the constraint
genuinely exists (a raw duplicate insert is correctly rejected citing it,
and a PostgREST `.upsert()` with the identical `onConflict` column list
succeeds cleanly) — yet the identical column list as a literal `ON
CONFLICT` clause inside this specific function's own `INSERT` still
failed, for a reason never conclusively pinned down. Round 3
(`20260924020000`) sidestepped `ON CONFLICT` entirely with an explicit
select-then-insert-or-update, independently sanity-checked live against
the real table outside the trigger before being handed over — reported
as applied ("Success. No rows returned"), but the exact same `42P10`
persisted, reproduced via a same-run A/B test (a real-tag challenge fails,
an empty-tag challenge on the same profile in the same script run
succeeds), ruling out a timing fluke and ruling out every other trigger on
`challenge_submissions`/`skills` as the source (none of them depend on
tag presence). A temporary read-only diagnostic
(`20260924030000_temp_diagnostic_function_source.sql`,
`debug_get_function_source`, a thin `pg_get_functiondef` wrapper) was
added to read the live function definition via RPC rather than keep
inferring from error text — it was never reachable through PostgREST
(`PGRST202`, persisting across 8+ retries over 90+ seconds and a
follow-up migration that added an explicit `grant execute`, round 4,
`20260924040000`). The actual ground truth only came from the user
running `select pg_get_functiondef('public.verify_skills_on_challenge_pass'::regproc)`
directly in the Supabase SQL Editor (bypassing PostgREST/RPC entirely):
the live function still contained the **original round-1 body**. None of
rounds 2, 3, or 4's `create or replace function` statements had ever
actually taken effect, despite each one being reported as applied
successfully — the mismatch was never conclusively explained. Round 5
(`20260924050000_fix_skill_verification_final.sql`, one statement, alone
in its own file with nothing else bundled) finally landed and was
live-verified: 8/8 assertions on its own (existing skill verified in
place, new skill inserted when none existed, repeat submissions safe,
blank tags skipped, empty-tags challenges unaffected) plus a full 13/13
re-run of the combined items-1/2/3/9 suite confirming nothing regressed
across the 5 rounds. **If a future session sees a `create or replace
function` reported as successful in the Supabase SQL Editor but the
function's actual behavior doesn't change, this is precedent that it can
happen — verify via a direct `pg_get_functiondef` read in the SQL Editor
itself, not by inference from application-level test results alone, and
not by trusting a PostgREST/RPC round-trip (which has its own, separate,
unresolved schema-cache/grant visibility issue in this project — see
`debug_get_function_source`, left in place, harmless and unused).**

**Reliability fixes** — a recurring "mutation has no `onError`, fails
completely silently" pattern found across 6+ files, fixed at the mutation-
hook level (one `sonner` `toast.error` per hook) rather than patching
every call site individually: `useUpdateJob`/`useDeleteJob`
(`company-client.ts`), `useUpdateDrive` (`college-client.ts`),
`useUpdateReportStatus`/`useDeleteReportedPost`/`useDeleteReportedComment`
(`admin-reports-client.ts`), `useCancelSubscription`
(`payments-client.ts`, which also needed its in-band `result.error` case
toasted, not just a thrown exception). Also added `isPending`-disabled
guards to the status-toggle buttons in `business_.jobs.tsx`/`college.tsx`
(duplicate-submit prevention, found alongside the missing-`onError` bug).
Separately, a missing-`try/catch`-around-a-checkout-mutation pattern
(distinct from the above — these already had in-band error handling, just
no `catch` for a genuinely thrown exception) was found and fixed in
`courses.$courseId.tsx`, `admin.premium.tsx`, `billing.tsx`,
`business_.subscription.tsx`, and `plan.tsx`'s `subscribeToPro`.

**Chat images moved to private storage** (`src/lib/messages-client.ts`,
`src/routes/messages.tsx`): DM attachments previously reused the
public-read `post-images` bucket with a guessable path — anyone who
obtained/guessed the URL could view a private image without auth. New
private `chat-images` bucket mirrors the `resumes` bucket's pattern
exactly: `uploadChatImage` now returns a storage path, not a URL; a new
`getSignedChatImageUrl` resolves a 10-minute signed URL on render via a
new small `ChatImage` component (replacing the old inline `<img
src={m.image_url}>`). RLS grants read to the uploader, an admin, or
anyone sharing any conversation with the uploader (same coarser-join
precedent as `resumes_recruiter_read`).

**`company-logos` bucket tightened**: dropped `image/svg+xml` from
`allowed_mime_types` (an SVG can embed `<script>`; the bucket is
public-read, so this was a stored-XSS vector via any company's logo URL).

Migrations: `20260924000000_sprint31_security_fixes.sql` (items 1, 2, 9,
10, and the original/buggy item 3), `20260924010000`, `20260924020000`,
`20260924030000`, `20260924040000` (all fix-forward attempts for item 3
that were applied but never actually took effect — kept as an accurate
record, see the skill-verification history above), `20260924050000`
(item 3's real, working fix).

**P3 cleanup** (done only after all P1/P2 items, per the user's explicit
ordering): removed 4 confirmed-zero-import runtime dependencies and their
unused shadcn wrapper components (`react-resizable-panels`, `vaul`,
`embla-carousel-react`, `react-day-picker`); added the missing `.max(6000)`
to `resume.server.ts`'s one AI-prompt field that lacked it (every sibling
field already had this cap); fixed `resume-setup.tsx`'s PDF-only
validation to use the shared `ACCEPTED_RESUME_MIME_TYPES` constant already
used everywhere else resumes are uploaded; removed 2 duplicate
`.gitignore` entries.

Full local suite (tsc/lint/build/Playwright 17/17 — 1 new route-guard test
for `/messages`, touched significantly by the chat-images change) clean
after every batch of changes.

Committed as `c2fb14c` (32 files) plus a small follow-up `027ecaf`
(recording the commit hash back into `progress.md`). Pushed to
`origin/main` — confirmed via `git fetch` + hash comparison, local
`HEAD` and `origin/main` both `027ecafa6158a41d39cd77c598ce60a46eecf63e`.

## Sprint 32 — Advanced Recruiter Platform (complete, 2026-09-25)

Requested as a large 10-area feature set (team management, candidate
pipeline, candidate management, comparison, interview scheduling,
analytics, permissions, UI/UX, database, integration). The inspection
phase (mandatory before any coding, per the task's own instructions)
found most of it already built by prior sprints — this sprint's actual
work is the genuinely missing slice, not a rebuild.

**Already existed, confirmed by direct code reading before assuming
otherwise** (matches this session's established discipline of auditing
before building): `company_members` already provides full team
management (owner/admin/recruiter roles, `has_company_role()` RLS,
cross-tenant hijack already closed in Sprint 31), with invite/remove UI
in `business_.settings.tsx`. `application_notes` already provides
recruiter notes, fully wired into `business_.applicants.tsx`'s candidate
detail drawer. `application_status_history` already logs every pipeline
transition. `interview_schedules` already has `interviewer_name`,
`meeting_link`, `status` (proposed/accepted/declined/
reschedule_requested), `responded_at` — everything the task asked for —
and a complete candidate-facing accept/decline UI already existed at
`/my-interviews` (`src/routes/my-interviews.tsx` +
`src/lib/interviews-client.ts`), predating this sprint entirely.

**Genuinely missing pieces, built this sprint:**
1. **A real notification-direction bug**, found by reading
   `on_interview_schedule_change` against `interview_schedules`' actual
   RLS: that table has exactly one UPDATE policy
   (`interview_schedules_applicant_update`, applicant-only), so every
   UPDATE the trigger ever sees is the candidate responding — yet the
   UPDATE branch still addressed the notification to the applicant. The
   recruiter who scheduled the interview was never notified when a
   candidate accepted, declined, or asked to reschedule. Fixed by
   flipping the UPDATE branch's recipient/actor
   (`supabase/migrations/20260925000000_sprint32_recruiter_platform.sql`);
   the INSERT branch (recruiter scheduling → candidate notified) was
   already correct and is unchanged.
2. **Candidate comparison** — zero prior art anywhere in the codebase
   (grepped "compare" repo-wide, confirmed clean). Built as a pure
   client-side `CompareDialog` in `business_.applicants.tsx` over
   `useCompanyApplications`' already-fetched per-candidate data (ATS/
   skills/job-match scores, verified skills, job-requirement match,
   coding/voice interview scores, active roadmap, project count) — zero
   new queries. A checkbox on each Kanban card selects up to 4
   candidates; a "Compare (N)" button opens a side-by-side table.
3. **Pipeline conversion rate + time-to-stage analytics** — the
   pre-existing "Hiring funnel" chart was raw per-stage headcounts only
   (a snapshot of who's currently sitting in each status), not a
   genuine conversion funnel. `useBusinessAnalytics` extended with
   `conversion` (cumulative % of all applications that ever reached
   each stage, derived from `application_status_history` so a hired
   candidate still counts toward every earlier stage) and
   `avgDaysToStage` (mean days from `applied_at` to first reaching
   shortlisted/interview/hired). Bounded fetch (`.limit(5000)`) + JS
   reduce — PostgREST has no `COUNT(DISTINCT ...)`, so this mirrors the
   same "bounded fetch, reduce client-side" pattern already established
   for `admin-analytics-client.ts`'s large aggregates, not a new one.
4. **A previously-unreachable pipeline stage made real**: `viewed` was
   a valid status in the schema's own check constraint, but the Kanban
   board's "Applied" column had its `dropStatus` hardcoded to `applied`,
   so no drag-and-drop action could ever actually produce a `viewed`
   application — the status existed on paper only. Split into its own
   "Screening" column (`dropStatus: "viewed"`), making it genuinely
   reachable for the first time.
5. **Team role-change (promote/demote) UI** — add and remove already
   existed; changing an existing member's role didn't. New
   `useUpdateCompanyMemberRole` hook needed no new migration at all: the
   existing `company_members_update_delete` RLS policy plus Sprint 31's
   own guard trigger (which blocks moving a row to a different
   `company_id`/`profile_id` but always allowed role changes — confirmed
   by that sprint's own `G1.2` regression assertion) already fully cover
   it. Also added `onError` toasts to `useAddCompanyMember`/
   `useRemoveCompanyMember`/`useUpdateCompanyMemberRole`, plus
   `useUpdateApplicationStatus` (the Kanban drag-and-drop mutation
   itself, found missing while working in the same file — same
   silent-failure class Sprint 31 fixed elsewhere, not previously
   caught because Sprint 31's audit sampled different files).
6. **Live cross-tenant security verification** (explicitly required by
   the task, not just implied): a disposable two-company test proving
   Company B's recruiter cannot read or write any of Company A's
   `job_applications`, `application_notes`, `interview_schedules`,
   `application_status_history`, or `company_members`, cannot add
   themselves to Company A's team, and cannot schedule an interview for
   Company A's application. This tests RLS that already existed from
   Sprints 26-31 — no new migration needed for this item specifically —
   9/9 assertions passed.
7. A stale comment in `interviews-client.ts` describing a missing RLS
   policy as a live bug was corrected — that policy (migration
   `20260728000300`) predates this session entirely.

Live-verified end to end with disposable accounts: 9/9 on cross-tenant
isolation, plus 3/3 specifically on the notification-direction fix
(recruiter scheduling still notifies the candidate; candidate responding
now correctly notifies the recruiter instead of re-notifying the
candidate). All test data deleted after every run; final sweep confirmed
zero leftover profiles/companies/jobs/auth users.

Full local suite (tsc/lint/build/Playwright 20/20 — 3 new route-guard
tests for `/business/applicants`, `/business/analytics`,
`/business/settings`) clean both before and after live verification.

## Sprint 33 — College Management Platform (complete, 2026-09-24)

Scope was user-selected ("College Management Platform") rather than
task-specified in detail, so this sprint opened with the same audit-
before-build discipline as Sprint 32: read every college-facing route and
RLS policy before writing anything.

**Audit findings**: the college side had only 2 routes total —
`college.tsx` (dashboard) and `college-drive.$driveId.tsx` (drive
detail) — versus the recruiter side's much richer pre-Sprint-32 baseline.
No team-management page, no analytics page, no notes system, **no RLS
grant of any kind for college staff to view a student's resume**, no
student comparison, no student detail view. `has_college_role()`/
`college_admins_admin_update`'s `WITH CHECK` was independently re-read
and confirmed already correct (evaluated against the `NEW` row, blocking
a `college_id`/`profile_id` hijack) — `college_admins` never had the
Sprint-31-class `company_members` bug, confirmed rather than assumed.

**Built this sprint** (`supabase/migrations/20260926000000_sprint33_college_platform.sql`
plus code):
1. `drive_application_notes` table — direct mirror of `application_notes`
   (job_applications' recruiter-notes table), RLS via `has_college_role()`
   joined through `drive_applications` → `placement_drives`.
2. Two new RLS policies giving college staff read access to a drive
   applicant's resume — the `resumes` table and the `resumes` storage
   bucket had **zero** college-side grant before this sprint (grepped,
   confirmed); mirrors the existing `resumes_recruiter_view`/
   `resumes_recruiter_read` recruiter-side policies exactly, scoped
   through `drive_applications`/`placement_drives` instead of
   `job_applications`/`jobs`.
3. College team management — `useCollegeAdmins`/`useAddCollegeAdmin`/
   `useRemoveCollegeAdmin` + new `college-settings.tsx` route, mirroring
   `business_.settings.tsx`. No role-change UI: unlike `company_members`'
   three roles, `college_admins` only has `owner`/`admin`, and every
   invited member is added as `admin` directly.
4. A student detail drawer (`college-drive.$driveId.tsx`) showing
   profile, resume (via the new RLS, signed URL), verified skills,
   eligibility snapshot, notes, and the application timeline —
   `useApplicationTimeline` already existed (reads `drive_notifications`)
   but had never been wired into any admin-facing view before this
   sprint.
5. `useDriveApplicants` extended with `verifiedSkills` and
   `resumeStoragePath` (skills already had a public select policy — no
   RLS gap, just never fetched; resumes needed the new policy from #2).
6. Student comparison — a client-side `CompareDialog` in
   `college-drive.$driveId.tsx` over the now-extended
   `useDriveApplicants` data, zero new queries, same pattern as Sprint
   32's recruiter-side `CompareDialog`.
7. College analytics — new `college-analytics-client.ts` (funnel from
   `drive_applications.status`; conversion + time-to-stage from
   `drive_shortlists`, since drives have no `application_status_history`
   equivalent — a deliberate architectural adaptation, not a gap) + new
   `college-analytics.tsx` route mirroring `business_.analytics.tsx`.
8. Two real silent-failure bugs fixed in `college-client.ts`:
   `useShortlistApplicant`/`useRejectApplicant` checked `result.error`
   internally but never surfaced it to the user (same bug class as
   Sprint 31/32's payments-client fix); `useCreateCollege` had no
   `onError` handler at all.
9. `CollegeNav.tsx`: `SECTIONS` grew from 1 entry to 3 (Dashboard,
   Analytics, Settings) — a stale comment claiming a multi-page nav
   wasn't needed was corrected.

**Deliberately not built**: a per-student interview-scheduling system
mirroring `interview_schedules`. Campus placement drives conventionally
interview the whole shortlisted batch on one shared date, already
captured by `placement_drives.test_date`/`interview_date` — a documented
design difference from the recruiter side, not an overlooked gap.

**Live-verified end to end** with disposable accounts (2 colleges, 2
college-admin accounts, 2 students, 1 extra teammate account, 2 published
drives, 2 applications, 2 resumes with real uploaded storage objects),
signed in via real anon-key sessions to exercise actual RLS: 21/21
assertions passed — drive-application visibility and notes are correctly
scoped per college in both directions; a cross-college note insert and a
cross-college admin-roster insert (privilege escalation) are both
rejected by RLS; a college admin can view/download only their own
applicants' resumes (table row and real storage download both checked);
team add/list/remove round-trips correctly. All fixtures deleted after
the run; a post-cleanup sweep confirmed zero leftover
profiles/colleges/drives.

Full local suite (tsc/lint/build/Playwright 22/22 — 2 new route-guard
tests for `/college-analytics`, `/college-settings`) clean both before
and after live verification.

## Known technical debt / TODOs (repository-wide, not just Sprint 26)

- Every AI feature is gated behind `GEMINI_API_KEY` and degrades
  gracefully when unset (`TODO(API_KEY)` comments in ~20 files) — this is
  intentional, documented gating, not neglected work.
- `src/lib/future-features.ts` — explicitly documented, unimplemented
  *type contracts* for planned work (contests, on-demand AI hints,
  company-branded challenge sets, mock-interview↔challenge linking).
  Nothing in it is wired into the app; not a bug, a deliberate placeholder
  file.
- Stripe payments (`STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`) gated the
  same way — as of Sprint 27, checkout runs for real against the mock
  provider end-to-end; going live with real Stripe is purely setting
  those two env vars, no code change needed. The old "Payments coming
  soon" disabled buttons on `/plan` and `/business/subscription` were
  replaced with real checkout calls in Sprint 27.
- **`job_applications` self-approval RLS gap** (see above) — highest-
  priority follow-up, same fix pattern as the Sprint 26 fix already
  written.
- Two accidental debris files are tracked in git history and currently
  live on GitHub: `Bash tool output (y0050d).txt` (an npm warning) and
  `Grep output (xxc48s).txt` (grep line output) — both harmless (no
  secrets) but should be `git rm`'d as cleanup. Untracked local-only
  debris also present (`et HEAD~1`, captured `git log` output) — safe to
  delete, never made it into git.
- This session found `SUPABASE_SECRET_KEY` and `RESEND_API_KEY` were
  accidentally echoed into a prior conversation turn's tool output by a
  bad grep pattern (not committed to git, not sent anywhere external) —
  rotating both is recommended out of caution since they appeared in a
  session transcript.

## Production-readiness status (as reconstructed)

- Prior production-hardening pass exists (`6813091`, "Prepare project for
  production deployment") — README/deployment checklist expanded, stale
  doc comment fixed, OAuth debug logging removed.
- Multiple real production incidents were found and fixed post-launch:
  SSR circular-chunk crash (`fccb524`, full site down, all routes 500),
  two rounds of Gemini model retirement (`eba4794`, `64909c6`, `c87bb3f`),
  company signup/email domain misconfiguration (`4a6bb6d`), a JWT-leak in
  the URL bar (`87522d3`), RLS infinite recursion (`d60c527`).
- **As of 2026-09-20:** Node.js installed, and `npm run build` / `npx tsc
  --noEmit` / `npm run lint` / `npx playwright test` all genuinely run
  and pass (see .claude/progress.md for full output). A Playwright smoke
  suite was added (previously completely absent from the repo).
- Sprint 26's two RLS/authorization bugs (drive_applications self-approval
  and college_admins takeover) are **fixed and confirmed live** via
  round-5 throwaway-account testing (9/9 assertions pass, zero
  regressions to legitimate flows). Sprint 26 is production-safe.
- ~~`job_applications` (Sprint 25) still has the same class of
  self-approval gap that `drive_applications` had~~ — **[Corrected in
  Sprint 31]** this was stale even before Sprint 31: `status` was already
  guarded by a trigger (`guard_job_application_update`, migration
  `20260728000700`, predates Sprint 26). The real remaining gap, found by
  Sprint 31's audit, was narrower — the same table's `ats_score`/
  `job_match_percentage`/`skills_score` columns had no restriction at all,
  letting an applicant fabricate their own match score. Fixed in Sprint 31
  (`20260924000000_sprint31_security_fixes.sql`).

## Testing

- **[Corrected in Sprint 31]** ~~No dedicated test runner script...not yet
  checked in this session~~ — stale as of Sprint 26: `playwright.config.ts`
  exists, `package.json` has a `test:e2e` script, and `e2e/smoke.spec.ts`
  has grown to 17 tests as of Sprint 31 (started at 0 before Sprint 26).
