import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Building2,
  CalendarClock,
  Check,
  Code2,
  Compass,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Gauge,
  History,
  Loader2,
  MessageSquare,
  Scale,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  StickyNote,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { BusinessShell } from "@/components/BusinessNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { requireBusinessAccount } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import {
  useMyCompany,
  useCompanyJobs,
  useCompanyApplications,
  useUpdateApplicationStatus,
  useScheduleInterview,
  useBestMatches,
  useInviteToApply,
  useCandidateBookmarks,
  useToggleCandidateBookmark,
  useApplicationNotes,
  useAddApplicationNote,
  useApplicationStatusHistory,
  useCandidateResumeDetail,
  type Job,
  type KanbanApplicant,
  type BestMatchCandidate,
} from "@/lib/company-client";
import { useStartConversation } from "@/lib/messages-client";
import { getSignedResumeUrl } from "@/lib/resume-client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const searchSchema = z.object({
  job: z.string().optional(),
  tab: z.enum(["board", "matches"]).optional(),
});

export const Route = createFileRoute("/business_/applicants")({
  validateSearch: searchSchema,
  beforeLoad: requireBusinessAccount,
  head: () => ({
    meta: [
      { title: "Applicants · Provn Business" },
      {
        name: "description",
        content: "Track applicants through your hiring pipeline and find best-fit candidates.",
      },
      { property: "og:title", content: "Applicants · Provn Business" },
      {
        property: "og:description",
        content: "A Kanban pipeline for every applicant, plus best-match student suggestions.",
      },
    ],
  }),
  component: Applicants,
});

// ---------------------------------------------------------------------
// Pipeline columns. Sprint 32: `viewed` now gets its own "Screening"
// column — previously it was folded into "Applied" with the column's
// dropStatus hardcoded to "applied", so a card could never actually
// reach `viewed` through the UI despite the status existing in the
// schema. All 7 statuses are genuinely reachable now.
// ---------------------------------------------------------------------
const COLUMNS: { key: string; label: string; statuses: string[]; dropStatus: string }[] = [
  { key: "applied", label: "Applied", statuses: ["applied"], dropStatus: "applied" },
  { key: "screening", label: "Screening", statuses: ["viewed"], dropStatus: "viewed" },
  {
    key: "shortlisted",
    label: "Shortlisted",
    statuses: ["shortlisted"],
    dropStatus: "shortlisted",
  },
  {
    key: "interview",
    label: "Interview Scheduled",
    statuses: ["interview"],
    dropStatus: "interview",
  },
  { key: "selected", label: "Selected", statuses: ["selected"], dropStatus: "selected" },
  { key: "hired", label: "Hired", statuses: ["hired"], dropStatus: "hired" },
  { key: "rejected", label: "Rejected", statuses: ["rejected"], dropStatus: "rejected" },
];

function Applicants() {
  const { data: user } = useCurrentUser();
  // Deliberately not branching structure on `isLoading` (hydration-mismatch
  // risk — see business.tsx); `membership` stays undefined during loading
  // too, so the empty-state branch below covers both cases.
  const { data: membership } = useMyCompany(user?.id);
  const companyId = membership?.company.id;

  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const selectedJobId = search.job;
  const tab = search.tab ?? "board";

  const { data: jobs = [] } = useCompanyJobs(companyId);
  const selectedJob = jobs.find((j) => j.id === selectedJobId) ?? null;

  const setJob = (jobId: string | undefined) => {
    navigate({ search: (prev) => ({ ...prev, job: jobId || undefined }) });
  };
  const setTab = (t: "board" | "matches") => {
    navigate({ search: (prev) => ({ ...prev, tab: t === "board" ? undefined : t }) });
  };

  if (!membership) {
    return (
      <BusinessShell>
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
          <div className="mt-3 font-display text-xl">Register your company first</div>
          <p className="mt-1 text-sm text-muted-foreground">
            You need a company profile before you can view applicants.
          </p>
          <Button asChild className="mt-4">
            <Link to="/business">Register company</Link>
          </Button>
        </div>
      </BusinessShell>
    );
  }

  return (
    <BusinessShell>
      <Link
        to="/business"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Business Hub
      </Link>

      <header className="mb-5">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Users className="h-5 w-5" />
        </div>
        <h1 className="mt-3 font-display text-3xl tracking-tight">Applicants</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {membership.company.company_name} · drag a card across the pipeline, or find and invite
          strong-fit students who haven't applied yet.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          value={selectedJobId ?? "all"}
          onValueChange={(v) => setJob(v === "all" ? undefined : v)}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="All jobs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All jobs</SelectItem>
            {jobs.map((j) => (
              <SelectItem key={j.id} value={j.id}>
                {j.title || "Untitled role"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex gap-1 rounded-lg border border-border bg-card p-1">
          <Button
            size="sm"
            variant={tab === "board" ? "default" : "ghost"}
            className="h-7"
            onClick={() => setTab("board")}
          >
            Pipeline
          </Button>
          <Button
            size="sm"
            variant={tab === "matches" ? "default" : "ghost"}
            className="h-7 gap-1"
            disabled={!selectedJobId}
            title={!selectedJobId ? "Select a specific job first" : undefined}
            onClick={() => setTab("matches")}
          >
            <Sparkles className="h-3.5 w-3.5" /> Best Matches
          </Button>
        </div>
      </div>

      {tab === "matches" ? (
        selectedJob ? (
          <BestMatchesPanel job={selectedJob} userId={user?.id} />
        ) : (
          <EmptyState text="Select a specific job above to see its best-matching students." />
        )
      ) : (
        <KanbanBoardPanel companyId={companyId} jobId={selectedJobId} userId={user?.id} />
      )}
    </BusinessShell>
  );
}

// ---------------------------------------------------------------------
// Kanban pipeline
// ---------------------------------------------------------------------

function KanbanBoardPanel({
  companyId,
  jobId,
  userId,
}: {
  companyId: string | undefined;
  jobId: string | undefined;
  userId: string | undefined;
}) {
  const { data: applications = [], isLoading } = useCompanyApplications(companyId, jobId);
  const updateStatus = useUpdateApplicationStatus(jobId, companyId);
  const { data: bookmarks = new Set<string>() } = useCandidateBookmarks(companyId);
  const toggleBookmark = useToggleCandidateBookmark(companyId, userId);

  const [minAts, setMinAts] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [locationQuery, setLocationQuery] = useState("");
  const [collegeQuery, setCollegeQuery] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [interviewCompletedOnly, setInterviewCompletedOnly] = useState(false);
  const [roadmapActiveOnly, setRoadmapActiveOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [compareOpen, setCompareOpen] = useState(false);
  const MAX_COMPARE = 4;

  const toggleCompare = (id: string) =>
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_COMPARE) {
        next.add(id);
      } else {
        toast.error(`You can compare up to ${MAX_COMPARE} candidates at once.`);
      }
      return next;
    });

  const allSkills = useMemo(() => {
    const set = new Set<string>();
    applications.forEach((a) => a.verifiedSkills.forEach((s) => set.add(s)));
    return Array.from(set).sort().slice(0, 40);
  }, [applications]);

  const toggleSkill = (s: string) =>
    setSelectedSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const filtered = useMemo(() => {
    const minAtsNum = minAts.trim() ? Number(minAts) : null;
    const loc = locationQuery.trim().toLowerCase();
    const col = collegeQuery.trim().toLowerCase();
    const gradYearNum = gradYear.trim() ? Number(gradYear) : null;
    return applications.filter((a) => {
      if (minAtsNum !== null && (a.atsScore ?? -1) < minAtsNum) return false;
      if (selectedSkills.length > 0 && !selectedSkills.every((s) => a.verifiedSkills.includes(s)))
        return false;
      if (loc && !(a.applicant?.location ?? "").toLowerCase().includes(loc)) return false;
      if (col && !(a.applicant?.college ?? "").toLowerCase().includes(col)) return false;
      if (gradYearNum !== null && a.applicant?.graduation_year !== gradYearNum) return false;
      if (interviewCompletedOnly && !a.interviewCompleted) return false;
      if (roadmapActiveOnly && !a.roadmapActive) return false;
      return true;
    });
  }, [
    applications,
    minAts,
    selectedSkills,
    locationQuery,
    collegeQuery,
    gradYear,
    interviewCompletedOnly,
    roadmapActiveOnly,
  ]);

  const columns = COLUMNS.map((col) => ({
    ...col,
    items: filtered.filter((a) => col.statuses.includes(a.status)),
  }));

  const activeFilterCount =
    (minAts.trim() ? 1 : 0) +
    selectedSkills.length +
    (locationQuery.trim() ? 1 : 0) +
    (collegeQuery.trim() ? 1 : 0) +
    (gradYear.trim() ? 1 : 0) +
    (interviewCompletedOnly ? 1 : 0) +
    (roadmapActiveOnly ? 1 : 0);

  return (
    <div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="inline-flex items-center gap-1.5 text-sm font-medium">
            <Filter className="h-4 w-4" /> Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {activeFilterCount} active
              </Badge>
            )}
          </span>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            {applications.length} applicant{applications.length === 1 ? "" : "s"}
            {compareIds.size > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 gap-1 px-2 text-[11px]"
                onClick={(e) => {
                  e.stopPropagation();
                  setCompareOpen(true);
                }}
              >
                <Scale className="h-3 w-3" /> Compare ({compareIds.size})
              </Button>
            )}
          </span>
        </button>

        {showFilters && (
          <div className="mt-3 space-y-3 border-t border-border pt-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Min ATS score">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={minAts}
                  onChange={(e) => setMinAts(e.target.value)}
                  placeholder="e.g. 70"
                />
              </Field>
              <Field label="Location">
                <Input
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  placeholder="e.g. Bengaluru"
                />
              </Field>
              <Field label="College">
                <Input
                  value={collegeQuery}
                  onChange={(e) => setCollegeQuery(e.target.value)}
                  placeholder="e.g. IIT"
                />
              </Field>
              <Field label="Graduation year">
                <Input
                  type="number"
                  value={gradYear}
                  onChange={(e) => setGradYear(e.target.value)}
                  placeholder="e.g. 2026"
                />
              </Field>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={interviewCompletedOnly}
                  onCheckedChange={(v) => setInterviewCompletedOnly(v === true)}
                />
                Interview completed
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={roadmapActiveOnly}
                  onCheckedChange={(v) => setRoadmapActiveOnly(v === true)}
                />
                Active roadmap
              </label>
            </div>
            {allSkills.length > 0 && (
              <div>
                <Label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">
                  Verified skills
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {allSkills.map((s) => (
                    <button
                      key={s}
                      onClick={() => toggleSkill(s)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs transition",
                        selectedSkills.includes(s)
                          ? "border-brand bg-brand-soft text-brand"
                          : "border-border text-muted-foreground hover:border-brand/40",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Experience-level and availability filters aren't included: there's no reliable schema
              signal to derive years-of-experience or availability from honestly yet, so rather than
              fabricate one we've left them out.
            </p>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="mt-4 flex h-40 items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : applications.length === 0 ? (
        <div className="mt-4">
          <EmptyState text="No applicants yet." />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
          {columns.map((col) => (
            <KanbanColumn
              key={col.key}
              col={col}
              updateStatus={updateStatus}
              userId={userId}
              companyId={companyId}
              bookmarks={bookmarks}
              toggleBookmark={toggleBookmark}
              compareIds={compareIds}
              toggleCompare={toggleCompare}
            />
          ))}
        </div>
      )}

      <CompareDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        candidates={applications.filter((a) => compareIds.has(a.id))}
        onRemove={toggleCompare}
      />
    </div>
  );
}

// ---------------------------------------------------------------------
// Candidate comparison — pure client-side view over already-fetched
// Kanban data (useCompanyApplications already includes everything
// needed per candidate: scores, verified skills, job-requirement match,
// interview results). No new queries, no fabricated data — a candidate
// with no resume/no interview yet just shows "—" for that row.
// ---------------------------------------------------------------------
function CompareDialog({
  open,
  onOpenChange,
  candidates,
  onRemove,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: KanbanApplicant[];
  onRemove: (id: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-brand" /> Compare candidates
          </DialogTitle>
        </DialogHeader>
        {candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Select at least 2 candidates from the board to compare them.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-36 py-2 pr-3 text-left align-bottom text-xs text-muted-foreground">
                    &nbsp;
                  </th>
                  {candidates.map((c) => (
                    <th key={c.id} className="min-w-[180px] px-3 py-2 text-left align-bottom">
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <div className="truncate font-display text-base">
                            {c.applicant?.full_name ?? "Unknown candidate"}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {c.applicant?.target_role || "Target role not set"}
                          </div>
                        </div>
                        <button
                          onClick={() => onRemove(c.id)}
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
                  label="Pipeline status"
                  values={candidates.map((c) => (
                    <Badge key={c.id} variant="secondary" className="text-[10px] capitalize">
                      {c.status}
                    </Badge>
                  ))}
                />
                <CompareRow
                  label="Applied"
                  values={candidates.map((c) =>
                    c.appliedAt ? new Date(c.appliedAt).toLocaleDateString() : "—",
                  )}
                />
                <CompareRow
                  label="Job match"
                  values={candidates.map((c) =>
                    c.jobMatchPercentage != null ? `${Math.round(c.jobMatchPercentage)}%` : "—",
                  )}
                  highlight
                />
                <CompareRow
                  label="ATS score"
                  values={candidates.map((c) =>
                    c.atsScore != null ? Math.round(c.atsScore) : "—",
                  )}
                />
                <CompareRow
                  label="Skills score"
                  values={candidates.map((c) =>
                    c.skillsScore != null ? Math.round(c.skillsScore) : "—",
                  )}
                />
                <CompareRow
                  label="Verified skills"
                  values={candidates.map((c) => (
                    <div key={c.id} className="flex flex-wrap gap-1">
                      {c.verifiedSkills.length === 0 ? (
                        <span className="text-muted-foreground">None yet</span>
                      ) : (
                        c.verifiedSkills.slice(0, 6).map((s) => (
                          <Badge key={s} variant="secondary" className="text-[9px]">
                            {s}
                          </Badge>
                        ))
                      )}
                    </div>
                  ))}
                />
                <CompareRow
                  label="Matches job requirements"
                  values={candidates.map((c) =>
                    c.jobTags.length === 0
                      ? "No tags on this role"
                      : `${c.matchedSkills.length}/${c.jobTags.length}`,
                  )}
                />
                <CompareRow
                  label="Missing requirements"
                  values={candidates.map((c) => (
                    <div key={c.id} className="flex flex-wrap gap-1">
                      {c.missingSkills.length === 0 ? (
                        <span className="text-muted-foreground">None</span>
                      ) : (
                        c.missingSkills.slice(0, 4).map((s) => (
                          <Badge key={s} variant="outline" className="text-[9px] text-destructive">
                            {s}
                          </Badge>
                        ))
                      )}
                    </div>
                  ))}
                />
                <CompareRow
                  label="Coding interview"
                  values={candidates.map((c) =>
                    c.bestCodingScore != null
                      ? `${Math.round(c.bestCodingScore)}/100`
                      : "Not taken",
                  )}
                />
                <CompareRow
                  label="HR/voice interview"
                  values={candidates.map((c) =>
                    c.bestHrScore != null ? `${Math.round(c.bestHrScore)}/100` : "Not taken",
                  )}
                />
                <CompareRow
                  label="Active roadmap"
                  values={candidates.map((c) => (c.roadmapActive ? "Yes" : "No"))}
                />
                <CompareRow
                  label="Projects on profile"
                  values={candidates.map((c) => c.topProjects.length)}
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

function KanbanColumn({
  col,
  updateStatus,
  userId,
  companyId,
  bookmarks,
  toggleBookmark,
  compareIds,
  toggleCompare,
}: {
  col: { key: string; label: string; items: KanbanApplicant[]; dropStatus: string };
  updateStatus: ReturnType<typeof useUpdateApplicationStatus>;
  userId: string | undefined;
  companyId: string | undefined;
  bookmarks: Set<string>;
  toggleBookmark: ReturnType<typeof useToggleCandidateBookmark>;
  compareIds: Set<string>;
  toggleCompare: (id: string) => void;
}) {
  const [isOver, setIsOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        const id = e.dataTransfer.getData("text/plain");
        if (id) updateStatus.mutate({ id, status: col.dropStatus });
      }}
      className={cn(
        "flex min-h-[240px] flex-col rounded-2xl border p-2 transition",
        isOver ? "border-brand bg-brand-soft/30" : "border-border bg-card/60",
      )}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          {col.label}
        </span>
        <Badge variant="secondary" className="text-[10px]">
          {col.items.length}
        </Badge>
      </div>
      <div className="flex-1 space-y-2">
        {col.items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-center text-[11px] text-muted-foreground">
            Drop here
          </div>
        ) : (
          col.items.map((a) => (
            <ApplicantCard
              key={a.id}
              app={a}
              userId={userId}
              companyId={companyId}
              updateStatus={updateStatus}
              bookmarks={bookmarks}
              toggleBookmark={toggleBookmark}
              compareChecked={compareIds.has(a.id)}
              onToggleCompare={() => toggleCompare(a.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ApplicantCard({
  app,
  userId,
  companyId,
  updateStatus,
  bookmarks,
  toggleBookmark,
  compareChecked,
  onToggleCompare,
}: {
  app: KanbanApplicant;
  userId: string | undefined;
  companyId: string | undefined;
  updateStatus: ReturnType<typeof useUpdateApplicationStatus>;
  bookmarks: Set<string>;
  toggleBookmark: ReturnType<typeof useToggleCandidateBookmark>;
  compareChecked: boolean;
  onToggleCompare: () => void;
}) {
  const scheduleInterview = useScheduleInterview(app.jobId, userId, companyId);
  const startConversation = useStartConversation(userId);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const isBookmarked = app.applicant ? bookmarks.has(app.applicant.id) : false;

  const openResume = async () => {
    if (!app.resumeStoragePath) return;
    try {
      const url = await getSignedResumeUrl(app.resumeStoragePath);
      window.open(url, "_blank");
    } catch {
      toast.error("Couldn't open this resume. Please try again.");
    }
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", app.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="cursor-grab rounded-xl border border-border bg-card p-3 text-sm shadow-sm active:cursor-grabbing"
    >
      <div className="flex items-start gap-2">
        <Checkbox
          checked={compareChecked}
          onClick={(e) => e.stopPropagation()}
          onCheckedChange={onToggleCompare}
          className="mt-1 shrink-0"
          title="Select to compare"
        />
        <img
          src={
            app.applicant?.avatar_url ||
            `https://api.dicebear.com/9.x/notionists/svg?seed=${app.applicant?.id ?? app.id}`
          }
          alt=""
          className="h-9 w-9 shrink-0 rounded-full bg-muted"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium">
            {app.applicant?.full_name ?? "Unknown candidate"}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">
            {app.applicant?.target_role || "Target role not set"}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">
            {app.applicant?.college || "College not set"}
          </div>
        </div>
        <button
          type="button"
          className="shrink-0 text-muted-foreground hover:text-brand"
          disabled={!app.applicant || toggleBookmark.isPending}
          onClick={() =>
            app.applicant &&
            toggleBookmark.mutate({ profileId: app.applicant.id, bookmarked: isBookmarked })
          }
          title={isBookmarked ? "Remove bookmark" : "Bookmark candidate"}
        >
          {isBookmarked ? (
            <BookmarkCheck className="h-4 w-4 text-brand" />
          ) : (
            <Bookmark className="h-4 w-4" />
          )}
        </button>
        {app.jobMatchPercentage != null && (
          <div className="shrink-0 text-right">
            <div className="font-display text-base leading-none text-brand">
              {Math.round(app.jobMatchPercentage)}%
            </div>
            <div className="text-[8px] uppercase tracking-widest text-muted-foreground">match</div>
          </div>
        )}
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        <span>ATS: {app.atsScore != null ? Math.round(app.atsScore) : "—"}</span>
        {app.status === "viewed" && (
          <Badge variant="secondary" className="text-[9px]">
            Seen
          </Badge>
        )}
        {app.interviewCompleted && (
          <Badge variant="secondary" className="gap-0.5 text-[9px]">
            <UserCheck className="h-2.5 w-2.5" /> Interviewed
          </Badge>
        )}
        {app.roadmapActive && (
          <Badge variant="secondary" className="gap-0.5 text-[9px]">
            <Compass className="h-2.5 w-2.5" /> Active roadmap
          </Badge>
        )}
      </div>

      {app.verifiedSkills.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {app.verifiedSkills.slice(0, 4).map((s) => (
            <Badge key={s} variant="secondary" className="gap-0.5 text-[9px]">
              <ShieldCheck className="h-2.5 w-2.5 text-brand" /> {s}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="mt-1.5 text-[10px] text-muted-foreground">No verified skills yet.</p>
      )}

      {app.topProjects.length > 0 && (
        <div className="mt-1.5 space-y-0.5">
          {app.topProjects.map((p) => (
            <div
              key={p.id}
              className="truncate text-[10px] text-muted-foreground"
              title={p.description ?? undefined}
            >
              • {p.title}
            </div>
          ))}
        </div>
      )}

      {(app.applicant?.github_url || app.applicant?.portfolio_url) && (
        <div className="mt-1.5 flex flex-wrap gap-2 text-[10px]">
          {app.applicant?.github_url && (
            <a
              href={app.applicant.github_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-brand hover:underline"
            >
              GitHub <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
          {app.applicant?.portfolio_url && (
            <a
              href={app.applicant.portfolio_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-brand hover:underline"
            >
              Portfolio <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-1 border-t border-border pt-2">
        <a
          href={`/live-resume?u=${app.applicant?.id ?? ""}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex"
        >
          <Button size="sm" variant="outline" className="h-6 px-1.5 text-[10px]">
            Live Resume
          </Button>
        </a>
        {app.resumeStoragePath && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 gap-1 px-1.5 text-[10px]"
            onClick={openResume}
          >
            <FileText className="h-3 w-3" /> Resume
          </Button>
        )}
      </div>

      <div className="mt-1.5 flex flex-wrap gap-1">
        <Button
          size="sm"
          variant="outline"
          className="h-6 gap-1 px-1.5 text-[10px]"
          onClick={() => setDetailOpen(true)}
        >
          <Eye className="h-3 w-3" /> Details
        </Button>
        {app.status !== "shortlisted" && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-1.5 text-[10px]"
            onClick={() => updateStatus.mutate({ id: app.id, status: "shortlisted" })}
          >
            Shortlist
          </Button>
        )}
        {app.status !== "rejected" && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-1.5 text-[10px] text-destructive"
            onClick={() => updateStatus.mutate({ id: app.id, status: "rejected" })}
          >
            Reject
          </Button>
        )}
        <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-6 gap-1 px-1.5 text-[10px]">
              <MessageSquare className="h-3 w-3" /> Message
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Message {app.applicant?.full_name ?? "candidate"}</DialogTitle>
            </DialogHeader>
            <MessageDialogForm
              userId={userId}
              otherUserId={app.applicant?.id}
              defaultText={`Hi${app.applicant?.full_name ? " " + app.applicant.full_name.split(" ")[0] : ""}, thanks for applying to ${app.jobTitle} — would love to chat further.`}
              startConversation={startConversation}
              onDone={() => setMessageOpen(false)}
            />
          </DialogContent>
        </Dialog>
        <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-6 gap-1 px-1.5 text-[10px]">
              <CalendarClock className="h-3 w-3" /> Interview
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule interview</DialogTitle>
            </DialogHeader>
            <ScheduleInterviewForm
              scheduleInterview={scheduleInterview}
              applicationId={app.id}
              onDone={() => setScheduleOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <CandidateDetailDrawer
        app={app}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        userId={userId}
      />
    </div>
  );
}

// ---------------------------------------------------------------------
// Candidate detail drawer — resume preview, ATS report, interview
// analytics, skill-gap summary, recruiter notes, and status history.
// ---------------------------------------------------------------------

function CandidateDetailDrawer({
  app,
  open,
  onOpenChange,
  userId,
}: {
  app: KanbanApplicant;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | undefined;
}) {
  const { data: resumeDetail, isLoading: resumeLoading } = useCandidateResumeDetail(
    app.applicant?.id,
    open,
  );
  const { data: notes = [], isLoading: notesLoading } = useApplicationNotes(
    open ? app.id : undefined,
  );
  const addNote = useAddApplicationNote(app.id);
  const { data: history = [], isLoading: historyLoading } = useApplicationStatusHistory(
    open ? app.id : undefined,
  );
  const [noteText, setNoteText] = useState("");
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);

  const openResumePreview = async () => {
    if (!resumeDetail?.storage_path) return;
    try {
      const url = await getSignedResumeUrl(resumeDetail.storage_path);
      setResumeUrl(url);
    } catch {
      toast.error("Couldn't load this resume. Please try again.");
    }
  };

  const submitNote = async () => {
    if (!userId || !noteText.trim()) return;
    await addNote.mutateAsync({ authorId: userId, body: noteText });
    setNoteText("");
  };

  const analysis = resumeDetail?.analysis as { ats_feedback?: string[] } | null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{app.applicant?.full_name ?? "Candidate"}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          <div className="flex items-start gap-3">
            <img
              src={
                app.applicant?.avatar_url ||
                `https://api.dicebear.com/9.x/notionists/svg?seed=${app.applicant?.id ?? app.id}`
              }
              alt=""
              className="h-14 w-14 shrink-0 rounded-full bg-muted"
            />
            <div className="min-w-0">
              <div className="font-medium">{app.applicant?.full_name ?? "Unknown candidate"}</div>
              <div className="text-xs text-muted-foreground">
                {app.applicant?.target_role || "Target role not set"} ·{" "}
                {app.applicant?.college || "College not set"}
                {app.applicant?.graduation_year
                  ? ` · Class of ${app.applicant.graduation_year}`
                  : ""}
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-xs">
                {app.applicant?.github_url && (
                  <a
                    href={app.applicant.github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand hover:underline"
                  >
                    GitHub
                  </a>
                )}
                {app.applicant?.portfolio_url && (
                  <a
                    href={app.applicant.portfolio_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand hover:underline"
                  >
                    Portfolio
                  </a>
                )}
              </div>
            </div>
          </div>

          <section>
            <SectionHeading icon={<Gauge className="h-3.5 w-3.5" />} title="Resume & ATS report" />
            {resumeLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : !resumeDetail ? (
              <p className="text-xs text-muted-foreground">No resume on file yet.</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">
                    {resumeDetail.ats_score != null ? `${resumeDetail.ats_score}/100` : "—"}
                  </span>
                  <span className="text-xs text-muted-foreground">ATS score</span>
                  {resumeDetail.storage_path && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-auto h-6 text-[10px]"
                      onClick={openResumePreview}
                    >
                      Preview resume
                    </Button>
                  )}
                </div>
                {analysis?.ats_feedback && analysis.ats_feedback.length > 0 && (
                  <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                    {analysis.ats_feedback.slice(0, 5).map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                )}
                {resumeUrl && (
                  <iframe
                    src={resumeUrl}
                    title="Resume preview"
                    className="h-64 w-full rounded-lg border border-border"
                  />
                )}
              </div>
            )}
          </section>

          <section>
            <SectionHeading icon={<Code2 className="h-3.5 w-3.5" />} title="Interview analytics" />
            {!app.interviewCompleted ? (
              <p className="text-xs text-muted-foreground">
                No completed interviews yet — AI interview data isn't available for this candidate.
              </p>
            ) : (
              <div className="flex gap-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Coding</div>
                  <div className="font-semibold">{app.bestCodingScore ?? "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">HR</div>
                  <div className="font-semibold">{app.bestHrScore ?? "—"}</div>
                </div>
              </div>
            )}
          </section>

          <section>
            <SectionHeading
              icon={<ShieldAlert className="h-3.5 w-3.5" />}
              title="Skill-gap summary"
            />
            {app.jobTags.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                This job has no required skills tagged.
              </p>
            ) : (
              <div className="space-y-1.5">
                <SkillGapRow label="Matched" skills={app.matchedSkills} variant="secondary" />
                <SkillGapRow label="Partial" skills={app.partialSkills} variant="outline" />
                <SkillGapRow label="Missing" skills={app.missingSkills} variant="destructive" />
              </div>
            )}
          </section>

          <section>
            <SectionHeading icon={<StickyNote className="h-3.5 w-3.5" />} title="Recruiter notes" />
            {notesLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <div className="space-y-2">
                {notes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No notes yet.</p>
                ) : (
                  notes.map((n) => (
                    <div key={n.id} className="rounded-lg border border-border p-2 text-xs">
                      <div className="mb-0.5 text-[10px] text-muted-foreground">
                        {n.author?.full_name ?? "Teammate"} ·{" "}
                        {new Date(n.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                      {n.body}
                    </div>
                  ))
                )}
                <div className="flex gap-1.5">
                  <Textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add a note about this candidate…"
                    className="min-h-[60px] text-xs"
                  />
                </div>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  disabled={!noteText.trim() || addNote.isPending}
                  onClick={submitNote}
                >
                  {addNote.isPending ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : null}
                  Add note
                </Button>
              </div>
            )}
          </section>

          <section>
            <SectionHeading icon={<History className="h-3.5 w-3.5" />} title="Status history" />
            {historyLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : history.length === 0 ? (
              <p className="text-xs text-muted-foreground">No status changes recorded yet.</p>
            ) : (
              <ol className="space-y-1.5 text-xs">
                {history.map((h) => (
                  <li key={h.id} className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="capitalize">{h.from_status ?? "—"}</span>
                    <span>→</span>
                    <span className="font-medium capitalize text-foreground">{h.to_status}</span>
                    <span className="ml-auto text-[10px]">
                      {new Date(h.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                      {h.changedByProfile?.full_name ? ` · ${h.changedByProfile.full_name}` : ""}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SectionHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {icon} {title}
    </div>
  );
}

function SkillGapRow({
  label,
  skills,
  variant,
}: {
  label: string;
  skills: string[];
  variant: "secondary" | "outline" | "destructive";
}) {
  if (skills.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="w-14 shrink-0 text-muted-foreground">{label}:</span>
      {skills.map((s) => (
        <Badge key={s} variant={variant} className="text-[10px]">
          {s}
        </Badge>
      ))}
    </div>
  );
}

function ScheduleInterviewForm({
  scheduleInterview,
  applicationId,
  onDone,
}: {
  scheduleInterview: ReturnType<typeof useScheduleInterview>;
  applicationId: string;
  onDone: () => void;
}) {
  const [when, setWhen] = useState("");
  const [mode, setMode] = useState("video");
  const [interviewerName, setInterviewerName] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!when) {
      setError("Pick a date & time.");
      return;
    }
    try {
      await scheduleInterview.mutateAsync({
        applicationId,
        scheduledAt: new Date(when).toISOString(),
        mode,
        interviewerName: interviewerName.trim() || undefined,
        meetingLink: meetingLink.trim() || undefined,
        notes,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not schedule.");
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date & time">
          <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </Field>
        <Field label="Type">
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="video">Online</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="onsite">Offline (onsite)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Interviewer name">
          <Input
            value={interviewerName}
            onChange={(e) => setInterviewerName(e.target.value)}
            placeholder="e.g. Priya Sharma"
          />
        </Field>
        <Field label="Meeting link">
          <Input
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
            placeholder="https://…"
          />
        </Field>
      </div>
      <Field label="Notes">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-[70px]"
          placeholder="Round, focus areas…"
        />
      </Field>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={scheduleInterview.isPending}>
        {scheduleInterview.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
        Schedule &amp; notify candidate
      </Button>
    </form>
  );
}

function MessageDialogForm({
  userId,
  otherUserId,
  defaultText,
  startConversation,
  onDone,
}: {
  userId: string | undefined;
  otherUserId: string | undefined;
  defaultText: string;
  startConversation: ReturnType<typeof useStartConversation>;
  onDone: () => void;
}) {
  const [text, setText] = useState(defaultText);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (!userId || !otherUserId || !text.trim()) return;
    setSending(true);
    setError(null);
    try {
      const conversationId = await startConversation.mutateAsync(otherUserId);
      const supabase = getSupabaseBrowserClient();
      const { error: msgError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: text.trim(),
      });
      if (msgError) throw msgError;
      setSent(true);
      setTimeout(onDone, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <p className="flex items-center gap-1.5 py-4 text-sm text-brand">
        <Check className="h-4 w-4" /> Message sent.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-[100px]" />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button className="w-full" onClick={send} disabled={sending || !text.trim()}>
        {sending ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <Send className="mr-1.5 h-4 w-4" />
        )}
        Send message
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------
// Best Matches (?tab=matches) — students who haven't applied/been invited,
// ranked by verified-skill overlap with this job's tags.
// ---------------------------------------------------------------------

function BestMatchesPanel({ job, userId }: { job: Job; userId: string | undefined }) {
  const { data: candidates = [], isLoading } = useBestMatches(job.id, job.tags);

  return (
    <div>
      <div className="flex items-start gap-2 rounded-lg border border-dashed border-border bg-card p-2.5 text-xs text-muted-foreground">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
        <span>
          Students ranked by verified-skill overlap with "{job.title || "this role"}"'s requirement
          tags, excluding anyone who already applied or was already invited.
          {job.tags.length === 0 &&
            " This job has no requirement tags set, so no ranking signal is available yet."}
        </span>
      </div>

      {isLoading ? (
        <div className="mt-4 flex h-32 items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : candidates.length === 0 ? (
        <div className="mt-4">
          <EmptyState text="No matching students found right now." />
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {candidates.map((c) => (
            <BestMatchCard key={c.id} candidate={c} jobId={job.id} userId={userId} />
          ))}
        </div>
      )}
    </div>
  );
}

function BestMatchCard({
  candidate,
  jobId,
  userId,
}: {
  candidate: BestMatchCandidate;
  jobId: string;
  userId: string | undefined;
}) {
  const invite = useInviteToApply(jobId, userId);
  const [invited, setInvited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pct = Math.round(candidate.score * 100);

  const doInvite = async () => {
    setError(null);
    try {
      await invite.mutateAsync(candidate.id);
      setInvited(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not invite this student.");
    }
  };

  return (
    <div className="flex flex-wrap items-start gap-3 rounded-2xl border border-border bg-card p-4">
      <img
        src={
          candidate.avatarUrl || `https://api.dicebear.com/9.x/notionists/svg?seed=${candidate.id}`
        }
        alt=""
        className="h-11 w-11 shrink-0 rounded-full bg-muted"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-medium">{candidate.fullName ?? "Unnamed student"}</span>
          {candidate.username && (
            <span className="text-xs text-muted-foreground">@{candidate.username}</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {candidate.targetRole || "—"} · {candidate.location || "—"} ·{" "}
          {candidate.college || "College not set"}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {candidate.verifiedSkills.slice(0, 6).map((s) => (
            <Badge key={s} variant="secondary" className="gap-1 text-[10px]">
              <ShieldCheck className="h-2.5 w-2.5 text-brand" /> {s}
            </Badge>
          ))}
        </div>
        {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <div className="text-right">
          <div className={cn("font-display text-xl leading-none", pct >= 90 && "text-brand")}>
            {pct}%
          </div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">match</div>
        </div>
        <Button
          size="sm"
          variant={invited ? "secondary" : "outline"}
          className="h-7 gap-1"
          disabled={invited || invite.isPending || !userId}
          onClick={doInvite}
        >
          {invite.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : invited ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <UserPlus className="h-3.5 w-3.5" />
          )}
          {invited ? "Invited" : "Invite to Apply"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
