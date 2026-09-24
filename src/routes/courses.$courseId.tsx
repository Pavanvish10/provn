import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, PlayCircle, Loader2, CheckCircle2 } from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { useCourse, useMyCourses, useCreateCoursePurchaseCheckout } from "@/lib/payments-client";

export const Route = createFileRoute("/courses/$courseId")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "Course · Provn" }] }),
  component: CourseDetail,
});

function formatPrice(cents: number, currency: string) {
  const symbol = currency === "INR" ? "₹" : `${currency} `;
  return `${symbol}${(cents / 100).toFixed(0)}`;
}

function CourseDetail() {
  const { courseId } = Route.useParams();
  const { data: user } = useCurrentUser();
  // Deliberately not branching structure on isLoading for either query —
  // see business.tsx (Sprint 25) for why.
  const { data: course } = useCourse(courseId);
  const { data: owned = [] } = useMyCourses(user?.id);
  const owns = owned.some((o) => o.course_id === courseId);

  const purchase = useCreateCoursePurchaseCheckout(user?.id);
  const [error, setError] = useState<string | null>(null);

  if (!course) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          This course isn't available.
        </div>
      </AppShell>
    );
  }

  const handleBuy = async () => {
    setError(null);
    try {
      const result = await purchase.mutateAsync({
        courseId: course.id,
        successUrl: `${window.location.origin}/checkout/success`,
        cancelUrl: `${window.location.origin}/checkout/cancel`,
      });
      if (result.error) setError(result.error);
      else if (result.checkoutUrl && !result.activated) window.location.href = result.checkoutUrl;
    } catch {
      setError("Couldn't start checkout. Please try again.");
    }
  };

  return (
    <AppShell>
      <Link
        to="/courses"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Courses
      </Link>

      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl tracking-tight">{course.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{course.description}</p>

        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          {owns ? (
            <>
              <div className="mb-3 inline-flex items-center gap-1.5 text-sm text-brand">
                <CheckCircle2 className="h-4 w-4" /> You own this course
              </div>
              {course.video_url && (
                <a href={course.video_url} target="_blank" rel="noreferrer">
                  <Button size="lg" className="w-full gap-1.5">
                    <PlayCircle className="h-4 w-4" /> Watch course
                  </Button>
                </a>
              )}
              {!course.video_url && (
                <p className="text-sm text-muted-foreground">
                  Course content is being finalized and will be linked here soon.
                </p>
              )}
            </>
          ) : (
            <>
              <div className="font-display text-3xl">
                {formatPrice(course.price_cents, course.currency)}
              </div>
              <Button
                size="lg"
                className="mt-4 w-full"
                disabled={purchase.isPending}
                onClick={handleBuy}
              >
                {purchase.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Buy course
              </Button>
              {error && <p className="mt-2 text-center text-sm text-destructive">{error}</p>}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
