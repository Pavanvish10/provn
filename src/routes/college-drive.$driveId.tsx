import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
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
  Scale,
  StickyNote,
  History,
  FileText,
  ExternalLink,
} from "lucide-react";

import { CollegeShell } from "@/components/CollegeNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { requireCollegeAccount } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
  useDrive,
  useDriveApplicants,
  useShortlistApplicant,
  useRejectApplicant,
  useDriveRankingInsights,
  useMissingSkillSuggestions,
  useApplicationTimeline,
  useDriveApplicationNotes,
  useAddDriveApplicationNote,
  exportApplicantsToCsv,
  type DriveApplicantRow,
  type DriveEligibility,
} from "@/lib/college-client";
import { getSignedResumeUrl } from "@/lib/resume-client";

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
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [compareOpen, setCompareOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const MAX_COMPARE = 4;

  const toggleCompare = (id: string) =>
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_COMPARE) {
        next.add(id);
      } else {
        toast.error(`You can compare up to ${MAX_COMPARE} students at once.`);
      }
      return next;
    });

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
        {compareIds.size > 0 && (
          <Button size="sm" variant="outline" onClick={() => setCompareOpen(true)}>
            <Scale className="mr-1.5 h-3.5 w-3.5" /> Compare ({compareIds.size})
          </Button>
        )}
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
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
                <th className="w-8 px-4 py-3"></th>
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
                <ApplicantRow
                  key={a.id}
                  applicant={a}
                  driveId={driveId}
                  compareChecked={compareIds.has(a.id)}
                  onToggleCompare={() => toggleCompare(a.id)}
                  onOpenDetail={() => setDetailId(a.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CompareDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        students={applicants.filter((a) => compareIds.has(a.id))}
        onRemove={toggleCompare}
      />
      <StudentDetailDrawer
        applicant={applicants.find((a) => a.id === detailId) ?? null}
        open={!!detailId}
        onOpenChange={(open) => !open && setDetailId(null)}
      />
    </CollegeShell>
  );
}

function ApplicantRow({
  applicant,
  driveId,
  compareChecked,
  onToggleCompare,
  onOpenDetail,
}: {
  applicant: DriveApplicantRow;
  driveId: string;
  compareChecked: boolean;
  onToggleCompare: () => void;
  onOpenDetail: () => void;
}) {
  const shortlist = useShortlistApplicant(driveId);
  const reject = useRejectApplicant(driveId);
  const missingSkills = useMissingSkillSuggestions();
  const [showSkills, setShowSkills] = useState(false);

  const eligibility = applicant.eligibility_snapshot as unknown as DriveEligibility | null;

  return (
    <tr className="border-b border-border align-top last:border-0">
      <td className="px-4 py-3">
        <Checkbox
          checked={compareChecked}
          onCheckedChange={onToggleCompare}
          title="Select to compare"
        />
      </td>
      <td className="px-4 py-3">
        <button
          onClick={onOpenDetail}
          className="text-left font-medium hover:text-brand hover:underline"
        >
          {applicant.student?.full_name ?? "Unknown"}
        </button>
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

// ---------------------------------------------------------------------
// Student comparison — pure client-side view over useDriveApplicants'
// already-fetched data (Sprint 33 extended it with verified skills and
// resume path), same pattern as business_.applicants.tsx's
// CompareDialog. No new queries.
// ---------------------------------------------------------------------
function CompareDialog({
  open,
  onOpenChange,
  students,
  onRemove,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: DriveApplicantRow[];
  onRemove: (id: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-brand" /> Compare students
          </DialogTitle>
        </DialogHeader>
        {students.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Select at least 2 students from the table to compare them.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-36 py-2 pr-3 text-left align-bottom text-xs text-muted-foreground">
                    &nbsp;
                  </th>
                  {students.map((s) => (
                    <th key={s.id} className="min-w-[180px] px-3 py-2 text-left align-bottom">
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <div className="truncate font-display text-base">
                            {s.student?.full_name ?? "Unknown"}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {s.student?.college ?? "College not set"}
                          </div>
                        </div>
                        <button
                          onClick={() => onRemove(s.id)}
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          title="Remove from comparison"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <CompareRow
                  label="Status"
                  values={students.map((s) => (
                    <Badge key={s.id} variant="secondary" className="text-[10px] capitalize">
                      {s.status.replace("_", " ")}
                    </Badge>
                  ))}
                />
                <CompareRow
                  label="Applied"
                  values={students.map((s) =>
                    s.applied_at ? new Date(s.applied_at).toLocaleDateString() : "—",
                  )}
                />
                <CompareRow
                  label="AI fit score"
                  values={students.map((s) => s.ai_fit_score ?? "—")}
                  highlight
                />
                <CompareRow label="CGPA" values={students.map((s) => s.student?.cgpa ?? "—")} />
                <CompareRow label="Branch" values={students.map((s) => s.student?.branch ?? "—")} />
                <CompareRow
                  label="Verified skills"
                  values={students.map((s) => (
                    <div key={s.id} className="flex flex-wrap gap-1">
                      {s.verifiedSkills.length === 0 ? (
                        <span className="text-muted-foreground">None yet</span>
                      ) : (
                        s.verifiedSkills.slice(0, 6).map((sk) => (
                          <Badge key={sk} variant="secondary" className="text-[9px]">
                            {sk}
                          </Badge>
                        ))
                      )}
                    </div>
                  ))}
                />
                <CompareRow
                  label="Eligibility"
                  values={students.map((s) => {
                    const e = s.eligibility_snapshot as unknown as DriveEligibility | null;
                    return e ? (e.eligible ? "Eligible" : "Not eligible") : "—";
                  })}
                />
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CompareRow({
  label,
  values,
  highlight,
}: {
  label: string;
  values: React.ReactNode[];
  highlight?: boolean;
}) {
  return (
    <tr>
      <td className="py-2 pr-3 text-xs font-medium text-muted-foreground">{label}</td>
      {values.map((v, i) => (
        <td key={i} className={cn("px-3 py-2", highlight && "font-display text-base text-brand")}>
          {v}
        </td>
      ))}
    </tr>
  );
}

// ---------------------------------------------------------------------
// Student detail drawer — profile, resume, verified skills, eligibility,
// college notes (new this sprint), and the status timeline
// (useApplicationTimeline already existed but was never wired into any
// admin-facing view before this sprint).
// ---------------------------------------------------------------------
function StudentDetailDrawer({
  applicant,
  open,
  onOpenChange,
}: {
  applicant: DriveApplicantRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: user } = useCurrentUser();
  const { data: notes = [] } = useDriveApplicationNotes(applicant?.id);
  const addNote = useAddDriveApplicationNote(applicant?.id);
  const { data: timeline = [] } = useApplicationTimeline(applicant?.id);
  const [noteText, setNoteText] = useState("");
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [resumeLoading, setResumeLoading] = useState(false);

  const eligibility = applicant?.eligibility_snapshot as unknown as DriveEligibility | null;

  const openResume = async () => {
    if (!applicant?.resumeStoragePath) return;
    setResumeLoading(true);
    try {
      const url = await getSignedResumeUrl(applicant.resumeStoragePath);
      setResumeUrl(url);
      window.open(url, "_blank");
    } catch {
      toast.error("Couldn't open this resume. Please try again.");
    } finally {
      setResumeLoading(false);
    }
  };

  const submitNote = async () => {
    if (!user?.id || !noteText.trim()) return;
    await addNote.mutateAsync({ authorId: user.id, body: noteText });
    setNoteText("");
  };

  if (!applicant) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{applicant.student?.full_name ?? "Unknown student"}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5 px-1 pb-6">
          <div className="rounded-xl border border-border bg-card p-4 text-sm">
            <div className="text-muted-foreground">{applicant.student?.email ?? "—"}</div>
            <div className="mt-1 text-muted-foreground">
              {applicant.student?.college ?? "College not set"}
              {applicant.student?.branch ? ` · ${applicant.student.branch}` : ""}
              {applicant.student?.graduation_year
                ? ` · Class of ${applicant.student.graduation_year}`
                : ""}
            </div>
            <div className="mt-1 text-muted-foreground">
              CGPA: {applicant.student?.cgpa ?? "—"} · AI fit score: {applicant.ai_fit_score ?? "—"}
            </div>
            {eligibility && (
              <Badge
                variant={eligibility.eligible ? "secondary" : "destructive"}
                className="mt-2 gap-1 text-[10px]"
              >
                {eligibility.eligible ? (
                  <ShieldCheck className="h-2.5 w-2.5" />
                ) : (
                  <ShieldAlert className="h-2.5 w-2.5" />
                )}
                {eligibility.eligible ? "Eligible" : "Not eligible"}
              </Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              className="mt-3 gap-1.5"
              disabled={!applicant.resumeStoragePath || resumeLoading}
              onClick={openResume}
            >
              {resumeLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileText className="h-3.5 w-3.5" />
              )}
              {applicant.resumeStoragePath ? "View resume" : "No resume uploaded"}
              {resumeUrl && <ExternalLink className="h-3 w-3" />}
            </Button>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-brand" /> Verified skills
            </div>
            {applicant.verifiedSkills.length === 0 ? (
              <p className="text-xs text-muted-foreground">No verified skills yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {applicant.verifiedSkills.map((s) => (
                  <Badge key={s} variant="secondary" className="text-[10px]">
                    {s}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
              <History className="h-3.5 w-3.5 text-brand" /> Timeline
            </div>
            {timeline.length === 0 ? (
              <p className="text-xs text-muted-foreground">No activity recorded yet.</p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {timeline.map((t) => (
                  <li key={t.id} className="flex items-start gap-2 text-muted-foreground">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-brand" />
                    <span>
                      {t.message}
                      <span className="ml-1 opacity-70">
                        · {new Date(t.created_at).toLocaleString()}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
              <StickyNote className="h-3.5 w-3.5 text-brand" /> Placement office notes
            </div>
            {notes.length === 0 ? (
              <p className="mb-2 text-xs text-muted-foreground">No notes yet.</p>
            ) : (
              <ul className="mb-2 space-y-2">
                {notes.map((n) => (
                  <li key={n.id} className="rounded-lg border border-border bg-card p-2.5 text-xs">
                    <p className="whitespace-pre-wrap">{n.body}</p>
                    <p className="mt-1 text-muted-foreground">
                      {n.author?.full_name ?? "Unknown"} · {new Date(n.created_at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note visible to your placement office team…"
              rows={2}
              className="text-sm"
            />
            <Button
              size="sm"
              className="mt-2"
              disabled={!noteText.trim() || addNote.isPending}
              onClick={submitNote}
            >
              {addNote.isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <StickyNote className="mr-1.5 h-3.5 w-3.5" />
              )}
              Add note
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
