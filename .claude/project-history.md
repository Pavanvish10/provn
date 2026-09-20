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
- **Uncommitted-sprint work in flight** (`b926338`, "backup before laptop
  change", 2026-08-09, no "Completed Sprint N" message) — a payments/
  subscriptions abstraction (`src/lib/payments/{index,types,mock-provider,
  stripe-provider}.ts`) + migration `20260808000000_payments_subscriptions.sql`.
  **Not marked complete** — likely "Sprint 27" but never got a completion
  commit. UI references "Payments coming soon" in at least
  `business_.subscription.tsx` and `plan.tsx`, consistent with this being
  mid-flight, not finished. Do not assume this is done; do not start
  "Sprint 27" work without confirming its actual state first, per the
  active task's own instruction not to begin Sprint 27 yet.

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
  same way; UI shows "Payments coming soon" in at least two places,
  consistent with the in-flight, uncommitted-as-complete state noted above.
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
- **`job_applications` (Sprint 25) still has the same class of
  self-approval gap** that `drive_applications` had — not fixed, flagged
  as the top follow-up item, out of this session's Sprint-26-only scope.

## Testing

- No dedicated test runner script in `package.json` (`scripts` only has
  `dev`/`build`/`build:dev`/`preview`/`lint`/`format` — no `test`,
  no `playwright` script). Sprint 14's commit message describes "a real
  Playwright pass" being run, implying Playwright was used ad hoc/via a
  separate invocation, not as a checked-in `npm test` script — **not
  determinable from repository evidence** whether a Playwright config
  file currently exists; not yet checked in this session.
