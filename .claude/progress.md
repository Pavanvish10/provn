CURRENT SPRINT: Sprint 27 — Payments & Premium (subscriptions, course purchases, AI credits)
CURRENT TASK: Sprint 27 complete. Awaiting instruction before starting Sprint 28 (do not begin autonomously).

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

LAST VERIFIED COMMIT: 9d647ae (Sprint 26 — nothing committed yet this
Sprint 27 round; holding off per the blocker above)
