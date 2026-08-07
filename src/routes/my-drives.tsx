import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, MapPin, Undo2, History } from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import {
  useMyDriveApplications,
  useWithdrawDriveApplication,
  useApplicationTimeline,
  type MyDriveApplicationRow,
} from "@/lib/college-client";

export const Route = createFileRoute("/my-drives")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "My Drive Applications · Provn" },
      { name: "description", content: "Track your campus placement drive applications." },
    ],
  }),
  component: MyDrivesPage,
});

const STATUS_TONE: Record<string, string> = {
  applied: "bg-muted text-muted-foreground",
  shortlisted: "bg-brand-soft text-brand",
  interview_scheduled: "bg-brand-soft text-brand",
  selected: "bg-brand text-brand-foreground",
  rejected: "bg-destructive/10 text-destructive",
  withdrawn: "bg-muted text-muted-foreground",
};

function MyDrivesPage() {
  const { data: user } = useCurrentUser();
  // Deliberately not branching structure on `isLoading` — see business.tsx
  // (Sprint 25) for why. `applications` stays undefined during loading too,
  // so the `!applications` branch below covers both cases.
  const { data: applications } = useMyDriveApplications(user?.id);

  return (
    <AppShell>
      <Link
        to="/drives"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Campus Drives
      </Link>

      <div className="mb-6">
        <h1 className="font-display text-4xl tracking-tight">My Drive Applications.</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Track the status of every campus drive you've applied to.
        </p>
      </div>

      {!applications || applications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            You haven't applied to any campus drives yet.
          </p>
          <Link to="/drives" className="mt-3 inline-block text-sm text-brand hover:underline">
            Browse campus drives →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <ApplicationCard key={app.id} application={app} userId={user?.id} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function ApplicationCard({
  application,
  userId,
}: {
  application: MyDriveApplicationRow;
  userId: string | undefined;
}) {
  const withdraw = useWithdrawDriveApplication(userId);
  const [error, setError] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const { data: timeline = [] } = useApplicationTimeline(showTimeline ? application.id : undefined);

  const drive = application.drive;
  const deadlinePassed = drive?.application_deadline
    ? new Date(drive.application_deadline) < new Date()
    : false;
  const canWithdraw = application.status !== "withdrawn" && !deadlinePassed;

  const handleWithdraw = async () => {
    setError(null);
    const result = await withdraw.mutateAsync(application.id);
    if (result.error) setError(result.error);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            {drive?.college?.name ?? "College"}
          </div>
          <h3 className="mt-0.5 font-display text-lg leading-tight">
            {drive?.role ?? "Untitled role"}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{drive?.company_name_override || "Company"}</span>
            {drive?.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {drive.location}
              </span>
            )}
            <span>Applied {new Date(application.applied_at).toLocaleDateString()}</span>
            {application.ai_fit_score != null && <span>Fit score: {application.ai_fit_score}</span>}
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest ${STATUS_TONE[application.status] ?? "bg-muted text-muted-foreground"}`}
        >
          {application.status.replace("_", " ")}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-xs"
          onClick={() => setShowTimeline((v) => !v)}
        >
          <History className="h-3.5 w-3.5" /> {showTimeline ? "Hide" : "View"} status timeline
        </Button>
        {canWithdraw && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs text-destructive"
            disabled={withdraw.isPending}
            onClick={handleWithdraw}
          >
            <Undo2 className="h-3.5 w-3.5" /> Withdraw
          </Button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      {showTimeline && (
        <div className="mt-3 border-t border-border pt-3">
          {timeline.length === 0 ? (
            <p className="text-xs text-muted-foreground">No status updates recorded yet.</p>
          ) : (
            <ol className="space-y-2">
              {timeline.map((t) => (
                <li key={t.id} className="flex items-start gap-2 text-xs">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  <div>
                    <div>{t.message}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(t.created_at).toLocaleString()}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
