import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  CalendarClock,
  Check,
  X,
  RotateCcw,
  Loader2,
  MapPin,
  Video,
  Building2,
  ExternalLink,
} from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { useMyInterviews, useRespondToInterview, type MyInterview } from "@/lib/interviews-client";

export const Route = createFileRoute("/my-interviews")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "My Interviews · Provn" },
      {
        name: "description",
        content: "Review and respond to interviews recruiters have scheduled with you.",
      },
      { property: "og:title", content: "My Interviews · Provn" },
      { property: "og:description", content: "Accept, decline, or request a new time." },
    ],
  }),
  component: MyInterviews,
});

const STATUS_TONE: Record<string, string> = {
  proposed: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  accepted: "bg-brand-soft text-brand",
  declined: "bg-destructive/10 text-destructive",
  reschedule_requested: "bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<string, string> = {
  proposed: "Awaiting your response",
  accepted: "Accepted",
  declined: "Declined",
  reschedule_requested: "You requested a new time",
};

function MyInterviews() {
  const { data: user } = useCurrentUser();
  const { data: interviews = [], isLoading } = useMyInterviews(user?.id);

  const upcoming = interviews.filter(
    (i) => i.status === "proposed" || i.status === "reschedule_requested",
  );
  const resolved = interviews.filter((i) => i.status === "accepted" || i.status === "declined");

  return (
    <AppShell>
      <header className="mb-6">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <CalendarClock className="h-5 w-5" />
        </div>
        <h1 className="mt-3 font-display text-3xl tracking-tight">My Interviews</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Interviews recruiters have scheduled with you. Accept, decline, or ask for a different
          time — the recruiter is notified automatically either way.
        </p>
      </header>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : interviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No interviews scheduled yet. When a recruiter schedules one after you apply, it'll show up
          here.
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Needs your response
              </h2>
              <div className="space-y-2">
                {upcoming.map((iv) => (
                  <InterviewCard key={iv.id} interview={iv} profileId={user?.id} />
                ))}
              </div>
            </section>
          )}
          {resolved.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Resolved
              </h2>
              <div className="space-y-2">
                {resolved.map((iv) => (
                  <InterviewCard key={iv.id} interview={iv} profileId={user?.id} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </AppShell>
  );
}

function InterviewCard({
  interview,
  profileId,
}: {
  interview: MyInterview;
  profileId: string | undefined;
}) {
  const respond = useRespondToInterview(profileId);
  const [error, setError] = useState<string | null>(null);
  const job = interview.application?.job;
  const company = job?.company;

  const act = async (status: "accepted" | "declined" | "reschedule_requested") => {
    setError(null);
    try {
      await respond.mutateAsync({ interviewId: interview.id, status });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update your response.");
    }
  };

  const canRespond = interview.status === "proposed";

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <img
            src={
              company?.logo ||
              `https://api.dicebear.com/9.x/shapes/svg?seed=${company?.id ?? interview.id}`
            }
            alt=""
            className="h-11 w-11 shrink-0 rounded-xl bg-muted object-cover"
          />
          <div className="min-w-0">
            <div className="font-medium">{job?.title ?? "A role"}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" /> {company?.companyName ?? "A company"}
              {job?.location && (
                <>
                  <span>·</span>
                  <MapPin className="h-3 w-3" /> {job.location}
                </>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5" />
                {new Date(interview.scheduled_at).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
              <span className="inline-flex items-center gap-1 capitalize">
                <Video className="h-3.5 w-3.5" /> {interview.mode}
              </span>
              {interview.interviewer_name && <span>Interviewer: {interview.interviewer_name}</span>}
            </div>
            {interview.meeting_link && (
              <a
                href={interview.meeting_link}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs text-brand hover:underline"
              >
                Meeting link <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {interview.notes && (
              <p className="mt-1.5 text-xs text-muted-foreground">{interview.notes}</p>
            )}
          </div>
        </div>

        <Badge className={STATUS_TONE[interview.status] ?? "bg-muted text-muted-foreground"}>
          {STATUS_LABEL[interview.status] ?? interview.status}
        </Badge>
      </div>

      {canRespond && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
          <Button
            size="sm"
            className="h-7 gap-1"
            disabled={respond.isPending}
            onClick={() => act("accepted")}
          >
            <Check className="h-3.5 w-3.5" /> Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1"
            disabled={respond.isPending}
            onClick={() => act("reschedule_requested")}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Request another time
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-destructive"
            disabled={respond.isPending}
            onClick={() => act("declined")}
          >
            <X className="h-3.5 w-3.5" /> Decline
          </Button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
