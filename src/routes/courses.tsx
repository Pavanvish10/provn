import { createFileRoute, Link } from "@tanstack/react-router";
import { PlayCircle, ArrowRight, CheckCircle2 } from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { useCourses, useMyCourses } from "@/lib/payments-client";

export const Route = createFileRoute("/courses")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Courses · Provn" },
      { name: "description", content: "Focused courses to help you prepare and get hired." },
    ],
  }),
  component: CoursesPage,
});

function formatPrice(cents: number, currency: string) {
  const symbol = currency === "INR" ? "₹" : `${currency} `;
  return `${symbol}${(cents / 100).toFixed(0)}`;
}

function CoursesPage() {
  const { data: user } = useCurrentUser();
  // Deliberately not branching structure on isLoading — see business.tsx
  // (Sprint 25) for why. `courses` defaults to `[]` so the empty-state
  // branch below renders consistently during the loading window too.
  const { data: courses = [] } = useCourses();
  const { data: owned = [] } = useMyCourses(user?.id);
  const ownedIds = new Set(owned.map((o) => o.course_id));

  return (
    <AppShell>
      <div className="mb-6">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <PlayCircle className="h-5 w-5" />
        </div>
        <h1 className="mt-3 font-display text-4xl tracking-tight">Courses.</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Focused, one-time courses to help you prepare for interviews and land the role.
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No courses are available right now — check back soon.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => {
            const owns = ownedIds.has(c.id);
            return (
              <div key={c.id} className="rounded-2xl border border-border bg-card p-5">
                <h3 className="font-display text-lg leading-tight">{c.title}</h3>
                <p className="mt-1.5 line-clamp-3 text-sm text-muted-foreground">{c.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-display text-xl">
                    {formatPrice(c.price_cents, c.currency)}
                  </span>
                  {owns && (
                    <span className="inline-flex items-center gap-1 text-xs text-brand">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Owned
                    </span>
                  )}
                </div>
                <Link to="/courses/$courseId" params={{ courseId: c.id }} className="mt-3 block">
                  <Button size="sm" className="w-full gap-1">
                    {owns ? "Watch" : "View course"} <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
