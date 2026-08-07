import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  MapPin,
  CalendarClock,
  ClipboardCheck,
  Users2,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Info,
  Check,
} from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import {
  useDrive,
  useDriveEligibility,
  useApplyToDrive,
  useMyDriveApplications,
} from "@/lib/college-client";

export const Route = createFileRoute("/drive/$driveId")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "Drive Details · Provn" }] }),
  component: DriveDetailPage,
});

function formatPackage(min: number | null, max: number | null, currency: string) {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    `${currency === "INR" ? "₹" : currency + " "}${(n / 100000).toFixed(1)}L`;
  if (min && max) return `${fmt(min)}–${fmt(max)}`;
  return fmt((min ?? max)!);
}

function DriveDetailPage() {
  const { driveId } = Route.useParams();
  const { data: user } = useCurrentUser();
  // Deliberately not branching structure on `isLoading` for any of these
  // queries — see business.tsx (Sprint 25) for why: a query can resolve
  // between the SSR flush and the client's first hydration paint, causing
  // a mismatch. Each value stays undefined while loading, which the
  // existing `!drive`/`eligibility ?` branches already handle safely.
  const { data: drive } = useDrive(driveId);
  const { data: eligibility, error: eligibilityError } = useDriveEligibility(driveId, user?.id);
  const { data: myApplications } = useMyDriveApplications(user?.id);
  const applyToDrive = useApplyToDrive(user?.id);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const existingApplication = myApplications?.find(
    (a) => a.drive_id === driveId && a.status !== "withdrawn",
  );

  if (!drive) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          This drive isn't available.
        </div>
      </AppShell>
    );
  }

  const pkg = formatPackage(drive.package_min, drive.package_max, drive.currency);
  const deadlinePassed = drive.application_deadline
    ? new Date(drive.application_deadline) < new Date()
    : false;

  const handleApply = async () => {
    setApplyError(null);
    const result = await applyToDrive.mutateAsync(driveId);
    if (result.error) {
      setApplyError(result.error);
      return;
    }
    setApplied(true);
  };

  return (
    <AppShell>
      <Link
        to="/drives"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Campus Drives
      </Link>

      <div className="mx-auto max-w-2xl">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          {drive.college?.name ?? "College"}
        </div>
        <h1 className="mt-1 font-display text-3xl tracking-tight">{drive.role}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {drive.company_name_override || "Company"}
        </p>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          {drive.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" /> {drive.location}
            </span>
          )}
          {pkg && <span>{pkg}</span>}
          <span className="inline-flex items-center gap-1.5">
            <Users2 className="h-4 w-4" />{" "}
            {drive.max_applicants ? `Up to ${drive.max_applicants} applicants` : "No applicant cap"}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-3">
          <DateField label="Apply by" value={drive.application_deadline} />
          <DateField label="Test date" value={drive.test_date} />
          <DateField label="Interview date" value={drive.interview_date} />
        </div>

        {(drive.min_cgpa != null ||
          drive.allowed_branches.length > 0 ||
          drive.allowed_graduation_years.length > 0) && (
          <div className="mt-5 rounded-2xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <ClipboardCheck className="h-4 w-4 text-brand" /> Eligibility criteria
            </div>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {drive.min_cgpa != null && <li>Minimum CGPA: {drive.min_cgpa}</li>}
              {drive.allowed_branches.length > 0 && (
                <li>Branches: {drive.allowed_branches.join(", ")}</li>
              )}
              {drive.allowed_graduation_years.length > 0 && (
                <li>Graduation years: {drive.allowed_graduation_years.join(", ")}</li>
              )}
              {drive.min_year_of_study != null && (
                <li>Minimum year of study: {drive.min_year_of_study}</li>
              )}
            </ul>
            {drive.eligibility_notes && (
              <p className="mt-2 text-xs text-muted-foreground">{drive.eligibility_notes}</p>
            )}
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-brand" /> Your eligibility check
          </div>
          {eligibilityError ? (
            <p className="text-sm text-destructive">{(eligibilityError as Error).message}</p>
          ) : eligibility ? (
            <div className="space-y-2">
              <Badge variant={eligibility.eligible ? "secondary" : "destructive"} className="gap-1">
                {eligibility.eligible ? (
                  <ShieldCheck className="h-3 w-3" />
                ) : (
                  <ShieldAlert className="h-3 w-3" />
                )}
                {eligibility.eligible
                  ? "You're eligible for this drive"
                  : "You don't meet all criteria yet"}
              </Badge>
              <ul className="mt-2 space-y-1.5 text-sm">
                {eligibility.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2">
                    {r.met ? (
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    ) : r.blocking ? (
                      <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                    ) : (
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="text-muted-foreground">
                      <span className="font-medium text-foreground">{r.criterion}:</span> {r.detail}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="mt-6">
          {existingApplication ? (
            <div className="rounded-2xl border border-brand/30 bg-brand-soft/40 p-4 text-center text-sm">
              You've already applied — status:{" "}
              <span className="font-medium capitalize">
                {existingApplication.status.replace("_", " ")}
              </span>
              .{" "}
              <Link to="/my-drives" className="text-brand hover:underline">
                View my applications
              </Link>
            </div>
          ) : applied ? (
            <div className="rounded-2xl border border-brand/30 bg-brand-soft/40 p-4 text-center text-sm text-brand">
              Application submitted! Track its status on{" "}
              <Link to="/my-drives" className="underline">
                My applications
              </Link>
              .
            </div>
          ) : (
            <>
              <Button
                size="lg"
                className="w-full"
                disabled={
                  applyToDrive.isPending ||
                  !eligibility?.eligible ||
                  drive.status !== "published" ||
                  deadlinePassed
                }
                onClick={handleApply}
              >
                {applyToDrive.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {deadlinePassed
                  ? "Application deadline passed"
                  : drive.status !== "published"
                    ? "This drive is not accepting applications"
                    : "Apply to this drive"}
              </Button>
              {applyError && (
                <p className="mt-2 text-center text-sm text-destructive">{applyError}</p>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function DateField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
        <CalendarClock className="h-3 w-3" /> {label}
      </div>
      <div className="mt-0.5 text-sm font-medium">
        {value ? new Date(value).toLocaleDateString() : "TBD"}
      </div>
    </div>
  );
}
