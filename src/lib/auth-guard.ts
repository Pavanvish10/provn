import { redirect } from "@tanstack/react-router";

import type { AuthUser } from "@/lib/auth.server";

type GuardArgs = {
  context: { user: AuthUser | null };
  location: { href: string; pathname: string };
};

const STUDENT_ONBOARDING_ENTRY = "/value-prop";
const STUDENT_ONBOARDING_PATHS = new Set([
  "/value-prop",
  "/location",
  "/profession",
  "/profile-details",
  "/resume-setup",
  "/plan",
]);

const BUSINESS_ONBOARDING_ENTRY = "/business-onboarding";
const BUSINESS_ONBOARDING_PATHS = new Set(["/business-onboarding"]);

function onboardingEntryFor(user: AuthUser) {
  return user.accountType === "company" ? BUSINESS_ONBOARDING_ENTRY : STUDENT_ONBOARDING_ENTRY;
}

function isOnboardingPath(user: AuthUser, pathname: string) {
  return user.accountType === "company"
    ? BUSINESS_ONBOARDING_PATHS.has(pathname)
    : STUDENT_ONBOARDING_PATHS.has(pathname);
}

export function requireAuth({ context, location }: GuardArgs) {
  if (!context.user) {
    throw redirect({ to: "/login", search: { redirect: location.href } });
  }
  if (!context.user.onboardingCompleted && !isOnboardingPath(context.user, location.pathname)) {
    throw redirect({ to: onboardingEntryFor(context.user) });
  }
}

export function requireGuest({ context }: GuardArgs) {
  if (context.user) {
    throw redirect({
      to: context.user.onboardingCompleted
        ? context.user.accountType === "company"
          ? "/business"
          : context.user.accountType === "college"
            ? "/college"
            : "/home"
        : onboardingEntryFor(context.user),
    });
  }
}

/** For /business-signup specifically: a logged-in student is exactly who
 * the "Register your company" links (home card, nav item) are meant for —
 * they're registering a separate company account under a different work
 * email, so their current student session shouldn't block them the way
 * requireGuest blocks /signup and /login. An already-registered company
 * account, though, should skip straight to its own dashboard/onboarding
 * rather than seeing the signup form again. */
export function requireNotCompanyAccount({ context }: GuardArgs) {
  if (context.user?.accountType === "company") {
    throw redirect({
      to: context.user.onboardingCompleted ? "/business" : onboardingEntryFor(context.user),
    });
  }
}

export function requireAdmin({ context, location }: GuardArgs) {
  requireAuth({ context, location });
  if (context.user?.role !== "admin") {
    throw redirect({ to: "/home" });
  }
}

/** Gates the recruiter/business dashboard: only "company" accounts may enter. */
export function requireBusinessAccount({ context, location }: GuardArgs) {
  if (!context.user) {
    throw redirect({ to: "/login", search: { redirect: location.href } });
  }
  if (context.user.accountType !== "company") {
    throw redirect({ to: "/home" });
  }
  if (!context.user.onboardingCompleted && !isOnboardingPath(context.user, location.pathname)) {
    throw redirect({ to: onboardingEntryFor(context.user) });
  }
}

/** Gates the college admin dashboard: only "college" accounts may enter. */
export function requireCollegeAccount({ context, location }: GuardArgs) {
  if (!context.user) {
    throw redirect({ to: "/login", search: { redirect: location.href } });
  }
  if (context.user.accountType !== "college") {
    throw redirect({ to: "/home" });
  }
  if (!context.user.onboardingCompleted && !isOnboardingPath(context.user, location.pathname)) {
    throw redirect({ to: onboardingEntryFor(context.user) });
  }
}

/** @deprecated use requireBusinessAccount for dashboard routes */
export function requireCompanyAccess({ context, location }: GuardArgs) {
  requireAuth({ context, location });
  if (context.user?.role !== "company_admin" && context.user?.role !== "admin") {
    throw redirect({ to: "/home" });
  }
}
