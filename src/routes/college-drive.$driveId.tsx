import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Download,
  Sparkles,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Check,
  X,
  Lightbulb,
} from "lucide-react";

import { CollegeShell } from "@/components/CollegeNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requireCollegeAccount } from "@/lib/auth-guard";
import {
  useDrive,
  useDriveApplicants,
  useShortlistApplicant,
  useRejectApplicant,
  useDriveRankingInsights,
  useMissingSkillSuggestions,
  exportApplicantsToCsv,
  type DriveApplicantRow,
  type DriveEligibility,
} from "@/lib/college-client";

export const Route = createFileRoute("/college-drive/$driveId")({
  beforeLoad: requireCollegeAccount,
  head: () => ({ meta: [{ title: "Drive Applicants · Provn College" }] }),
  component: CollegeDriveDetail,
});

const STATUS_TONE: Record<string, string> = {
  applied: "bg-muted text-muted-foreground",
  shortlisted: "bg-brand-soft text-brand",
  interview_scheduled: "bg-brand-soft text-brand",
  selected: "bg-brand text-brand-foreground",
  rejected: "bg-destructive/10 text-destructive",
  withdrawn: "bg-muted text-muted-foreground",
};

function CollegeDriveDetail() {
  const { driveId } = Route.useParams();
  // Deliberately not branching structure on `isLoading` for either query —
  // see business.tsx (Sprint 25) for why: the query can resolve between the
  // SSR flush and the client's first hydration paint, causing a mismatch.
  const { data: drive } = useDrive(driveId);
  const { data: applicants = [] } = useDriveApplicants(driveId);
  const rankingInsights = useDriveRankingInsights();

  if (!drive) {
    return (
      <CollegeShell>
        <EmptyState text="Drive not found." />
      </CollegeShell>
    );
  }

  return (
    <CollegeShell>
      <Link
        to="/college"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> College Portal
      </Link>

      <header className="mb-5">
        <h1 className="font-display text-3xl tracking-tight">{drive.role}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {drive.company_name_override || "Company"} {drive.location ? `· ${drive.location}` : ""} ·{" "}
          {applicants.length} applicant{applicants.length === 1 ? "" : "s"}
        </p>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={applicants.length === 0}
          onClick={() => exportApplicantsToCsv(applicants, drive.role)}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={rankingInsights.isPending || applicants.length === 0}
          onClick={() => rankingInsights.mutate(driveId)}
        >
          {rankingInsights.isPending ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          )}
          AI ranking insights
        </Button>
      </div>

      {rankingInsights.data?.error && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {rankingInsights.data.error}
        </div>
      )}
      {rankingInsights.data?.insight && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-border bg-card p-4 text-sm">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <p className="whitespace-pre-wrap">{rankingInsights.data.insight}</p>
        </div>
      )}

      {applicants.length === 0 ? (
        <EmptyState text="No applicants yet." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">College / Branch</th>
                <th className="px-4 py-3">CGPA</th>
                <th className="px-4 py-3">Eligibility</th>
                <th className="px-4 py-3">Fit score</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applicants.map((a) => (
                <ApplicantRow key={a.id} applicant={a} driveId={driveId} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CollegeShell>
  );
}

function ApplicantRow({ applicant, driveId }: { applicant: DriveApplicantRow; driveId: string }) {
  const shortlist = useShortlistApplicant(driveId);
  const reject = useRejectApplicant(driveId);
  const missingSkills = useMissingSkillSuggestions();
  const [showSkills, setShowSkills] = useState(false);

  const eligibility = applicant.eligibility_snapshot as unknown as DriveEligibility | null;

  return (
    <tr className="border-b border-border align-top last:border-0">
      <td className="px-4 py-3">
        <div className="font-medium">{applicant.student?.full_name ?? "Unknown"}</div>
        <div className="text-xs text-muted-foreground">{applicant.student?.email ?? ""}</div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {applicant.student?.college ?? "—"}
        {applicant.student?.branch ? ` · ${applicant.student.branch}` : ""}
      </td>
      <td className="px-4 py-3">{applicant.student?.cgpa ?? "—"}</td>
      <td className="px-4 py-3">
        {eligibility ? (
          <Badge
            variant={eligibility.eligible ? "secondary" : "destructive"}
            className="gap-1 text-[10px]"
          >
            {eligibility.eligible ? (
              <ShieldCheck className="h-2.5 w-2.5" />
            ) : (
              <ShieldAlert className="h-2.5 w-2.5" />
            )}
            {eligibility.eligible ? "Eligible" : "Not eligible"}
          </Badge>
        ) : (
          "—"
        )}
      </td>
      <td className="px-4 py-3 font-medium">{applicant.ai_fit_score ?? "—"}</td>
      <td className="px-4 py-3">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest ${STATUS_TONE[applicant.status] ?? "bg-muted text-muted-foreground"}`}
        >
          {applicant.status.replace("_", " ")}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {applicant.status === "applied" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              disabled={shortlist.isPending}
              onClick={() =>
                shortlist.mutate({ applicationId: applicant.id, stage: "shortlisted" })
              }
            >
              <Check className="h-3.5 w-3.5" /> Shortlist
            </Button>
          )}
          {applicant.status === "shortlisted" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              disabled={shortlist.isPending}
              onClick={() => shortlist.mutate({ applicationId: applicant.id, stage: "interview" })}
            >
              <Check className="h-3.5 w-3.5" /> Interview
            </Button>
          )}
          {applicant.status === "interview_scheduled" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              disabled={shortlist.isPending}
              onClick={() => shortlist.mutate({ applicationId: applicant.id, stage: "selected" })}
            >
              <Check className="h-3.5 w-3.5" /> Select
            </Button>
          )}
          {applicant.status !== "rejected" && applicant.status !== "withdrawn" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs text-destructive"
              disabled={reject.isPending}
              onClick={() => reject.mutate(applicant.id)}
            >
              <X className="h-3.5 w-3.5" /> Reject
            </Button>
          )}
          {applicant.status === "rejected" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              disabled={missingSkills.isPending}
              onClick={async () => {
                setShowSkills(true);
                if (!missingSkills.data) await missingSkills.mutateAsync(applicant.id);
              }}
            >
              {missingSkills.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Lightbulb className="h-3.5 w-3.5" />
              )}
              Skill gaps
            </Button>
          )}
        </div>
        {showSkills && (
          <div className="mt-2 max-w-xs rounded-lg border border-border bg-muted/30 p-2 text-xs">
            {missingSkills.data?.error ? (
              <span className="text-destructive">{missingSkills.data.error}</span>
            ) : missingSkills.data?.suggestions ? (
              <ul className="list-disc space-y-0.5 pl-3">
                {missingSkills.data.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            ) : (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
