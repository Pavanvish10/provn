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
          : "/home"
        : onboardingEntryFor(context.user),
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

/** @deprecated use requireBusinessAccount for dashboard routes */
export function requireCompanyAccess({ context, location }: GuardArgs) {
  requireAuth({ context, location });
  if (context.user?.role !== "company_admin" && context.user?.role !== "admin") {
    throw redirect({ to: "/home" });
  }
}
