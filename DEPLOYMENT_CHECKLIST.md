# Production Readiness Checklist — Provn

Last verified: 2026-08-06, against commit `bc8c187` (Completed Sprint 12) plus the production-readiness pass on top of it. Re-verify anything below whose underlying commit has changed since.

## Build & code quality

- [x] `npx tsc --noEmit` — clean, whole project
- [x] `npm run build` — clean, no errors/warnings
- [x] No hardcoded secrets, API keys, or test credentials in tracked source (scanned for key-pattern literals, hardcoded Supabase URLs, dummy credentials — none found; both Supabase client wrappers read exclusively from env)
- [x] No stray debug `console.log`/`console.debug` statements (removed leftover OAuth-URL debug logging in `login.tsx`/`signup.tsx`; the one remaining `console.log` in `auth.server.ts` is an intentional success-log paired with its neighboring `console.error` failure logs, not debug scaffolding)
- [x] No `debugger` statements, `alert()` calls, or commented-out dead code blocks in `src/`
- [ ] `npm run lint` — **not** clean project-wide (~3,000 pre-existing issues, almost entirely CRLF line-ending mismatches from Windows-based development, e.g. `vite.config.ts`, generated `src/lib/supabase/types.ts`). Out of scope for this pass — fixing it means touching thousands of lines in unrelated files. Recommend a dedicated `prettier --write .` + review pass before or shortly after launch, on a clean branch.

## Environment & secrets

- [x] `.env.example` documents every environment variable the app reads (cross-checked via `grep -r process.env / import.meta.env` against the file — all 9 vars present, required vs optional clearly marked)
- [x] Fixed a stale doc comment: `.env.example` claimed the Gemini default model was `gemini-2.5-flash`; the code (since commit `c87bb3f`) actually defaults to `gemini-3.5-flash`
- [x] `.env`, `.env.*` gitignored; only `.env.example` (placeholder values) is tracked
- [ ] Production Supabase project provisioned
- [ ] Production values set for the three **required** vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY`) in the hosting platform
- [ ] Decide which **optional** integrations ship at launch (Gemini, OpenAI Realtime, Judge0, Resend) and provision those keys — every one degrades to a clear "not configured" message when absent, so launching without any of them is safe, just feature-limited

## Database

- [ ] All migrations in `supabase/migrations/` (35 files) applied to the production project via `npx supabase db push`
- [ ] RLS policies spot-checked against the production project, not just local — several past commits (e.g. "Fix infinite recursion in conversation_participants RLS policy") show this has bitten the project before

## Deployment target

- [x] Deploy target pinned to **Vercel** (`vite.config.ts` → `nitro.preset: "vercel"`), not left to Nitro's auto-detection
- [x] A prior production incident (circular ESM import between two SSR vendor chunks → every route 500ing) is root-caused, fixed via a forced single-chunk SSR build, and the fix is documented in `vite.config.ts` — don't revert that `manualChunks` override without re-verifying `_ssr/ssr.mjs` directly
- [ ] Production environment variables configured in the Vercel project settings
- [ ] First production deploy smoke-tested against the core flows below

## Known open issues (non-blocking — found during the pre-launch audit, not fixed in this pass since they change behavior, not just cleanup)

None of these crash the app or fail the build. Recommend triaging before or shortly after launch:

1. **Onboarding dead-end** — `resume-setup.tsx:100`, "Build one here" navigates to `/profile`, which isn't in the onboarding allowlist; a mid-onboarding user gets silently bounced back to step 1.
2. **Silent subscription-write failure** — `plan.tsx:64-69`, the `premium_subscriptions` upsert error is discarded; onboarding completes even if the write fails, silently defaulting the user's plan state.
3. **Silent write failures, no user feedback** — `location.tsx`, `profession.tsx`: a failed Supabase write just stops the button spinner with no error shown.
4. **Unguarded resume-URL fetch** — `business.applicants.tsx:467-470`, a failed signed-URL request is an unhandled rejection; the recruiter's "Resume" click does nothing with no error.
5. **Shell inconsistency** — `business.advertising.tsx` / `business.marketing.tsx` render in the generic `AppShell` instead of `BusinessShell`, despite being linked from the Business Hub sidebar; clicking them drops the user out of the business layout.
6. **Access-control gap (policy decision, not a bug)** — the entire `/interview/*` flow (dashboard through report) has no `requireAuth` guard, unlike every other feature route. It's currently backed entirely by client-side `sessionStorage`, not a database write, so there's no data-leak risk — but it means anonymous visitors can use the full AI interview flow. Confirm this is the intended pre-launch access model.

## Core flows to smoke-test after the first production deploy

- [ ] Student signup → onboarding wizard (`value-prop` → `location` → `profession` → `profile-details` → `resume-setup` → `plan`) → lands on `/home`
- [ ] Login — email/password and Google OAuth
- [ ] AI Interview: `/interview` → resume upload → job description analysis → setup (verify pre-fill from the job analysis) → device check → room → report
- [ ] Coding challenge run/submit (requires `JUDGE0_API_KEY` in production, or confirm the "not configured" message is acceptable for launch)
- [ ] Business signup → business onboarding → Business Hub dashboard
- [ ] Admin dashboard — confirm non-admin accounts are redirected away from `/admin/*`

## Sign-off

| Item | Status |
|---|---|
| Code quality / secrets / debug cleanup | Done — 2026-08-06 |
| Environment variables documented | Done — 2026-08-06 |
| Production Supabase provisioning | **Pending — operator action required** |
| Production env vars set on host | **Pending — operator action required** |
| First deploy smoke test | **Pending — operator action required** |
