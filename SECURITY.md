# Provn security model

This document describes the security architecture actually implemented in
this codebase, as of Sprint 34 (Security & Reliability hardening). It is
kept factual and reflects the real code — see `.claude/project-history.md`
for the audit that produced each fix.

## Authentication

- Supabase Auth (email/password + Google OAuth), cookie-based sessions via
  `@supabase/ssr` (`src/lib/supabase/server.ts`, `client.ts`).
- `getCurrentUserFn` (`src/lib/auth.server.ts`) calls `supabase.auth.getUser()`,
  which validates the JWT against Supabase Auth server-side — never just
  decodes it. An expired/invalid session returns `null`, and every route
  guard treats that as "signed out" (redirect to `/login`), never an
  unhandled error.
- Logout (`signOutFn`) calls `supabase.auth.signOut()` — a real session
  invalidation, not just clearing client state.
- Password reset (`requestPasswordResetFn`/`updatePasswordFn`) uses Supabase's
  own `resetPasswordForEmail`/`updateUser`, which don't reveal whether an
  email exists in the system. The UI copy is intentionally generic
  ("if an account exists…").
- Signup issues the confirmation email itself via Resend
  (`createAccountAndSendConfirmation`) rather than Supabase's own limited
  default mailer — this is a reliability fix from an earlier sprint, not a
  security one, kept here because it's adjacent to the auth flow.
- Google OAuth never influences `account_type`/`role` — those are only ever
  set from `profiles`, populated server-side by `handle_new_user()` at
  account-creation time (reading `raw_user_meta_data`, which the client
  only ever sets for the business/college signup flows, never for OAuth).

## Authorization / RBAC

Two independent axes, both stored on `profiles`:

- `account_type`: `student | company | college` — gates which app shell /
  dashboard a user sees (`requireBusinessAccount`, `requireCollegeAccount`
  in `src/lib/auth-guard.ts`).
- `role`: `user | recruiter | company_admin | admin` — `role = 'admin'` is
  what `is_admin()` (a `SECURITY DEFINER` SQL function) checks, and that
  function gates almost every admin-bypass clause across the schema's RLS
  policies, plus the `requireAdmin` route guard.

**Real, row-level data access for company/college users does not come from
either of these columns** — it comes from `company_members`/`college_admins`
membership rows, checked via `has_company_role()`/`has_college_role()`
(`SECURITY DEFINER` functions, same pattern as `is_admin()`). `account_type`
only decides which dashboard shell renders; a user with the "company" shell
but no `company_members` row sees an empty dashboard, nothing more.

**Sprint 34 fix**: `profiles`' own UPDATE policy (`profiles_update_own`) had
no `WITH CHECK` at all — any signed-in user could set their own `role` to
`'admin'` directly from the browser. A `BEFORE UPDATE` guard trigger
(`guard_profiles_update`) now blocks a non-admin session from ever setting
`role = 'admin'`, and restricts `account_type` to changing at most once, away
from `'student'` (the one legitimate self-service transition, used by
`useCreateCompany`/`useCreateCollege` right after a user creates their first
company/college). Admins and service-role writes bypass the trigger, same as
every other guard trigger in this schema.

## Row-Level Security (RLS) strategy

Every user-facing table has RLS enabled. The recurring patterns:

- **Organization RLS**: `<org>_members`/`<org>_admins` tables +
  `has_<org>_role()` helper, mirrored for `companies`/`colleges`.
- **Guard triggers for "USING-only" gaps**: Postgres RLS `WITH CHECK` can't
  express "this specific column may not change" on an `UPDATE` — `USING`
  alone only evaluates the OLD row. Anywhere a table lets an owner update
  their own row but has one or more columns that must stay off-limits (a
  role, a score, a verification flag, another party's scheduling details),
  a `BEFORE UPDATE`/`BEFORE INSERT` trigger compares OLD vs NEW and raises
  an exception. This pattern has been applied, cumulatively, to:
  `company_members`, `job_applications` (score columns), `profiles`
  (role/account_type), `challenge_submissions` (status on insert), `skills`
  (verified/source/verified_at), `interview_schedules` (recruiter-only
  columns).
- **`auth.uid() is null` as the service-role signal**: a handful of writes
  are legitimately privileged (payment activation, AI credit grants, score
  computation, graded challenge submissions) and run via
  `getSupabaseAdminClient()` *after* the calling server function has already
  authenticated the user and re-derived their id from the session — never
  from client input. The service-role client has no user JWT, so
  `auth.uid()` is `null` for that write, which guard triggers use to let the
  legitimate path through while still blocking the same column for a real
  browser session.
- **Session-local bypass flag for same-session trusted triggers**: one case
  (`skills.verified`) can't use the `auth.uid() is null` trick, because the
  trusted writer is itself a `SECURITY DEFINER` trigger running inside the
  *same* authenticated session that a client attacker would also be using.
  It instead calls `set_config('app.bypass_skills_guard', 'on', true)`
  (transaction-local) immediately before its own write; the guard trigger
  checks that setting.
- **Recursion avoidance**: a policy must never subquery the same table it's
  defined on directly — Postgres reports `42P17` (this table hit that once,
  `conversation_participants`, fixed in `20260805000000`). Any
  self-referential check goes through a small `SECURITY DEFINER` helper
  function instead (`is_conversation_participant`,
  `conversation_has_any_participants`), which runs outside the calling
  policy's own evaluation.

**Sprint 34 additions to this list**: `challenge_submissions` (blocked a
forged `status = 'passed'` insert — the actual grading now writes via the
admin client), `skills` (blocked direct self-verification, bypassing the
real Sprint 31 challenge-based verification), `conversation_participants`
(blocked joining/adding into an already-populated conversation you're not
part of — the insert policy was `with check (true)`), `interview_schedules`
(scoped the applicant's own UPDATE to `status`/`responded_at` only).

## Storage security

Buckets and their access model (unchanged this sprint — audited, no new gaps
found beyond Sprint 31's fixes):

- `resumes` — private. Owner read/write; recruiter/college-staff read scoped
  through `job_applications`/`drive_applications` to only applicants they
  actually recruit for.
- `chat-images` — private (moved off the public `post-images` bucket in
  Sprint 31, which had a guessable-URL leak). Read scoped to the uploader,
  an admin, or a shared-conversation participant.
- `company-logos` — public-read (intentional), `image/svg+xml` dropped from
  allowed MIME types in Sprint 31 (an SVG can carry `<script>`; this bucket
  is public, so that was a stored-XSS vector).
- `avatars`, `post-images` — owner-write, public-read (intentional; profile
  pictures and feed images are meant to be public).

## API / server-function security

- Every `createServerFn` that returns anything privileged re-derives the
  caller's identity from `supabase.auth.getUser()` — never trusts a
  client-supplied user/profile id for an authorization decision.
- Every `getSupabaseAdminClient()` (service-role, bypasses RLS) call site
  was re-audited this sprint: each one re-derives identity from an
  authenticated session (or a verified Stripe webhook signature, or a
  brand-new account being created) before writing — none trusts a
  client-supplied id directly. See `.claude/project-history.md` for the
  file:line inventory.
- Input validation is zod-based, consistently applied across sampled
  `createServerFn`s. Sprint 34 closed a few specific missing-`.max()` gaps
  (Judge0 `source` code, AI chat history items, application-status email's
  `status` field — now a real enum instead of a bare string).
- Error responses: server functions log the real Postgres/Supabase error via
  `console.error` and return a short, generic, user-safe message instead of
  forwarding `error.message` to the browser (fixed across
  `payments.server.ts`, `career-roadmap.server.ts`, `analytics.server.ts`,
  `college.server.ts`, `mentor.server.ts`, `resume-builder.server.ts`,
  `voice-interview.server.ts` this sprint). The 500 error page
  (`src/lib/error-page.ts`) is static and never touches `error.message`/
  `error.stack`.

## Secrets

- `SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, `GEMINI_API_KEY`, `RAPIDAPI_KEY`
  (Judge0), `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` are only ever read
  in `*.server.ts` files or `src/lib/supabase/server.ts` — audited this
  sprint, confirmed no reference in any client/route/component file.
- `.env.example` documents every required variable with placeholder values
  only; `.gitignore` covers `.env`/`.env.*`.
- Only `VITE_`-prefixed variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
  are exposed to the browser — both are meant to be public (the anon key is
  designed to be, backed entirely by RLS).

## Rate limiting

A generic, DB-backed fixed-window limiter (`check_rate_limit` Postgres
function + `rate_limit_buckets` table, migration
`20260927000000_sprint34_security_hardening.sql`; TS wrapper
`src/lib/rate-limit.server.ts`) was added this sprint — no app-level rate
limiting existed before, beyond a bespoke per-email OTP cooldown
(`email-otp.server.ts`, left as-is). It's DB-backed rather than in-memory
because the app deploys as serverless functions, so per-process memory
doesn't persist across invocations.

Applied to: authentication (`signInFn`, `signUpFn`, `businessSignUpFn`,
`requestPasswordResetFn`), every Gemini-backed AI generation endpoint
(resume analysis/JD-match, career roadmap, role roadmap, mock-interview
start, voice-interview start, AI chat, mentor chat, challenge-draft
generation, submission explanations, job recommendations, eligibility
report, drive-ranking insights, missing-skill suggestions, resume
optimization), and every Judge0 code-execution endpoint (sample run,
challenge submit, coding-interview sample run/submit).

**Known limitation, not fixed this sprint**: interview/voice-interview
*continuation* turns (`respondToInterviewFn`, `finishInterviewFn`,
`respondToVoiceInterviewFn`, `finishVoiceInterviewFn`) are not individually
rate-limited — only the `start*` endpoint that begins a session is. General
messaging (`messages-client.ts`) and job applications (`jobs-client.ts`)
call Supabase directly from the browser rather than through a
`createServerFn`, so they aren't wrapped by this mechanism either; they're
still fully protected by RLS (no unauthorized data access), the residual
risk is spam volume, not a security boundary. Flagged as follow-up work.

## Security headers

Set globally in `src/start.ts` via a `requestMiddleware` that wraps every
response (pages, server functions, and the 500 error page alike):
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`, a `Permissions-Policy`
that disables `geolocation`/`payment`/`usb`/`magnetometer`/`gyroscope`/
`accelerometer` (camera/microphone deliberately left available — the
voice/video interview feature genuinely uses `getUserMedia`), and a
`Content-Security-Policy` scoped to what the app actually loads client-side
(confirmed by grep: no non-`.server.ts` file fetches an external host —
every AI/Judge0/Stripe call happens server-side):
`connect-src` is `'self'` plus this app's own Supabase project (REST +
Realtime `wss://`), `style-src`/`font-src` allow Google Fonts, `img-src`
allows `https:` broadly (company logos can be arbitrary external URLs,
confirmed via `companies.logo`), and `object-src`/`frame-ancestors` are
fully locked down.

**Known limitation**: `script-src`/`style-src` include `'unsafe-inline'`.
TanStack Router injects inline hydration `<script>` tags
(`ScriptOnce`/`Asset`, confirmed by reading `@tanstack/react-router`'s
source) with no nonce mechanism available in the installed version, so a
strict `script-src 'self'` would break hydration on every page load. This
CSP still blocks the highest-value attack surface — loading an
attacker-controlled external script, framing, base-tag hijack, and
(via `connect-src`) exfiltrating data to an attacker-controlled host from
injected JS — but does not fully prevent an injected inline `<script>` from
running. Verified live: all 22 Playwright smoke tests pass, including a
console-error check on page load, with these headers active.

## Known limitations / follow-ups

- Rate limiting doesn't cover interview-continuation turns or the two
  browser-direct (non-`createServerFn`) write paths (messaging, job
  applications) — see "Rate limiting" above.
- CSP allows `'unsafe-inline'` scripts/styles — see "Security headers"
  above. A future TanStack Start version with nonce support would let this
  tighten to a strict `script-src 'self' 'nonce-...'`.
- IP-based rate limiting isn't implemented (keyed by email/profile id
  instead) — sufficient for the abuse patterns this sprint targeted
  (credential stuffing against one account, runaway AI/Judge0 spend by one
  signed-in user), but doesn't slow a distributed attacker rotating emails.
