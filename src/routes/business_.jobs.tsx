import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BusinessShell } from "@/components/BusinessNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import {
  Briefcase,
  Sparkles,
  Plus,
  X,
  Pencil,
  Trash2,
  Pause,
  PlayCircle,
  XCircle,
  Loader2,
  Save,
  Send,
  Building2,
  Users2,
  ArrowRight,
  CalendarClock,
  MapPin,
} from "lucide-react";
import { extractSkills } from "@/lib/matching";
import { requireBusinessAccount } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import {
  useMyCompany,
  useCompanyJobs,
  useCreateJob,
  useUpdateJob,
  useDeleteJob,
  type Job,
  type JobFormInput,
} from "@/lib/company-client";

export const Route = createFileRoute("/business_/jobs")({
  beforeLoad: requireBusinessAccount,
  head: () => ({
    meta: [
      { title: "Job Postings · Provn Business" },
      {
        name: "description",
        content: "Post roles with full detail and distribute them straight to the Provn feed.",
      },
    ],
  }),
  component: BusinessJobs,
});

const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Internship", "Contract", "Remote"];
const EXPERIENCE_LEVELS = ["Entry level", "Mid level", "Senior level", "Lead", "Executive"];
const WORK_MODES: { value: string; label: string }[] = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "office", label: "Office" },
];

function BusinessJobs() {
  const { data: user } = useCurrentUser();
  // Deliberately not branching structure on `isLoading` (hydration-mismatch
  // risk — see business.tsx); `membership` stays undefined during loading
  // too, so the empty-state branch below covers both cases.
  const { data: membership } = useMyCompany(user?.id);
  const companyId = membership?.company.id;

  const { data: jobs = [], isLoading: loadingJobs } = useCompanyJobs(companyId);

  if (!membership) {
    return (
      <BusinessShell>
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
          <div className="mt-3 font-display text-xl">Register your company first</div>
          <p className="mt-1 text-sm text-muted-foreground">
            You need a company profile before you can post jobs.
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Job Postings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {membership.company.company_name} · create, publish, and manage your roles.
          </p>
        </div>
        <JobFormDialog
          companyId={companyId}
          userId={user?.id}
          trigger={
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" /> Post a job
            </Button>
          }
        />
      </div>

      {loadingJobs ? (
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No jobs posted yet. Post your first role to start receiving applicants.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} companyId={companyId} userId={user?.id} />
          ))}
        </div>
      )}
    </BusinessShell>
  );
}

// ---------------------------------------------------------------------
// Job posting form (create + edit)
// ---------------------------------------------------------------------

function JobFormDialog({
  companyId,
  userId,
  trigger,
  job,
}: {
  companyId: string | undefined;
  userId: string | undefined;
  trigger: React.ReactNode;
  job?: Job;
}) {
  const createJob = useCreateJob(companyId, userId);
  const updateJob = useUpdateJob(companyId, userId);
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState(job?.title ?? "");
  const [description, setDescription] = useState(job?.description ?? "");
  const [department, setDepartment] = useState(job?.department ?? "");
  const [location, setLocation] = useState(job?.location ?? "");
  const [workMode, setWorkMode] = useState(job?.work_mode ?? "unspecified");
  const [employmentType, setEmploymentType] = useState(job?.employment_type ?? "Full-time");
  const [experienceLevel, setExperienceLevel] = useState(job?.experience_level ?? "unspecified");
  const [responsibilities, setResponsibilities] = useState(job?.responsibilities ?? "");
  const [requirements, setRequirements] = useState(job?.requirements ?? "");
  const [benefits, setBenefits] = useState(job?.benefits ?? "");
  const [applicationDeadline, setApplicationDeadline] = useState(job?.application_deadline ?? "");
  const [openingsCount, setOpeningsCount] = useState(String(job?.openings_count ?? 1));
  const [salaryMin, setSalaryMin] = useState(job?.salary_min?.toString() ?? "");
  const [salaryMax, setSalaryMax] = useState(job?.salary_max?.toString() ?? "");
  const [currency, setCurrency] = useState(job?.currency ?? "INR");
  const [reqInput, setReqInput] = useState("");
  const [tags, setTags] = useState<string[]>(job?.tags ?? []);
  const [error, setError] = useState<string | null>(null);

  const addTag = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    setTags((prev) => Array.from(new Set([...prev, v])));
    setReqInput("");
  };
  const removeTag = (t: string) => setTags((prev) => prev.filter((x) => x !== t));

  const suggested = useMemo(() => {
    const fromJd = extractSkills(`${title} ${description}`);
    return fromJd
      .filter((s) => !tags.map((t) => t.toLowerCase()).includes(s.toLowerCase()))
      .slice(0, 8);
  }, [title, description, tags]);

  const resetFields = () => {
    setTitle("");
    setDescription("");
    setDepartment("");
    setLocation("");
    setWorkMode("unspecified");
    setEmploymentType("Full-time");
    setExperienceLevel("unspecified");
    setResponsibilities("");
    setRequirements("");
    setBenefits("");
    setApplicationDeadline("");
    setOpeningsCount("1");
    setSalaryMin("");
    setSalaryMax("");
    setTags([]);
  };

  const submitWithStatus = async (status: string) => {
    setError(null);
    if (!title.trim()) {
      setError("Job title is required.");
      return;
    }
    if (!companyId) {
      setError("No company.");
      return;
    }

    const input: JobFormInput = {
      title,
      description,
      employmentType,
      location,
      department,
      workMode: workMode === "unspecified" ? null : workMode,
      experienceLevel: experienceLevel === "unspecified" ? "" : experienceLevel,
      responsibilities,
      requirements,
      benefits,
      applicationDeadline: applicationDeadline.trim() || null,
      openingsCount: openingsCount.trim() ? Number(openingsCount) : 1,
      salaryMin: salaryMin.trim() ? Number(salaryMin) : null,
      salaryMax: salaryMax.trim() ? Number(salaryMax) : null,
      currency,
      tags,
      status,
    };

    try {
      if (job) {
        await updateJob.mutateAsync({ id: job.id, patch: input });
      } else {
        await createJob.mutateAsync(input);
        resetFields();
      }
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  const pending = createJob.isPending || updateJob.isPending;
  const offerDraftChoice = !job || job.status === "draft";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-brand" /> {job ? "Edit job" : "Post a job"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-3">
          <Field label="Job title">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Frontend Engineer"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Department">
              <Input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Engineering"
              />
            </Field>
            <Field label="Location">
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Bengaluru"
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Work mode">
              <Select value={workMode} onValueChange={setWorkMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unspecified">Not specified</SelectItem>
                  {WORK_MODES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Employment type">
              <Select value={employmentType} onValueChange={setEmploymentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Experience level">
              <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unspecified">Not specified</SelectItem>
                  {EXPERIENCE_LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Job description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[90px]"
              placeholder="Role, team, expectations."
            />
          </Field>

          <Field label="Skills required (matched against verified skills)">
            <div className="flex flex-wrap gap-1.5">
              {tags.map((r) => (
                <Badge key={r} variant="secondary" className="gap-1 pl-2 pr-1">
                  {r}
                  <button
                    type="button"
                    onClick={() => removeTag(r)}
                    className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Input
                value={reqInput}
                onChange={(e) => setReqInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag(reqInput);
                  }
                }}
                placeholder="Type a skill and press Enter"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => addTag(reqInput)}
                disabled={!reqInput.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {suggested.length > 0 && (
              <div className="mt-2">
                <div className="mb-1.5 flex items-center gap-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-brand" /> Suggested from JD
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {suggested.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addTag(s)}
                      className="rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground hover:border-brand hover:text-foreground"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Field>

          <Field label="Responsibilities">
            <Textarea
              value={responsibilities}
              onChange={(e) => setResponsibilities(e.target.value)}
              className="min-h-[80px]"
              placeholder="What this person will own day-to-day…"
            />
          </Field>

          <Field label="Requirements">
            <Textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              className="min-h-[80px]"
              placeholder="Must-haves for this role…"
            />
          </Field>

          <Field label="Benefits">
            <Textarea
              value={benefits}
              onChange={(e) => setBenefits(e.target.value)}
              className="min-h-[70px]"
              placeholder="Perks, benefits, what makes this role stand out…"
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Salary min">
              <Input
                type="number"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
                placeholder="600000"
              />
            </Field>
            <Field label="Salary max">
              <Input
                type="number"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
                placeholder="1200000"
              />
            </Field>
            <Field label="Currency">
              <Input
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                maxLength={3}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Application deadline">
              <Input
                type="date"
                value={applicationDeadline}
                onChange={(e) => setApplicationDeadline(e.target.value)}
              />
            </Field>
            <Field label="Number of openings">
              <Input
                type="number"
                min={1}
                value={openingsCount}
                onChange={(e) => setOpeningsCount(e.target.value)}
              />
            </Field>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            {offerDraftChoice ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={pending || !title.trim()}
                  onClick={() => submitWithStatus("draft")}
                >
                  {pending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 h-4 w-4" />
                  )}
                  Save draft
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  disabled={pending || !title.trim()}
                  onClick={() => submitWithStatus("open")}
                >
                  {pending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-1.5 h-4 w-4" />
                  )}
                  Publish
                </Button>
              </>
            ) : (
              <Button
                type="button"
                className="w-full"
                disabled={pending || !title.trim()}
                onClick={() => submitWithStatus(job!.status)}
              >
                {pending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-4 w-4" />
                )}
                Save changes
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------
// Job list card
// ---------------------------------------------------------------------

const STATUS_TONE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  open: "bg-brand-soft text-brand",
  paused: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  closed: "bg-destructive/10 text-destructive",
};

function JobCard({
  job,
  companyId,
  userId,
}: {
  job: Job;
  companyId: string | undefined;
  userId: string | undefined;
}) {
  const updateJob = useUpdateJob(companyId, userId);
  const deleteJob = useDeleteJob(companyId);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{job.title || "Untitled role"}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            {job.department && <span>{job.department} ·</span>}
            {job.location ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {job.location}
              </span>
            ) : (
              <span>Location not set</span>
            )}
            <span>· {job.employment_type || "—"}</span>
            {job.work_mode && <span className="capitalize">· {job.work_mode}</span>}
          </div>
          {job.published_at && (
            <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <CalendarClock className="h-3 w-3" /> Published{" "}
              {new Date(job.published_at).toLocaleDateString()}
            </div>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest ${STATUS_TONE[job.status] ?? "bg-muted text-muted-foreground"}`}
        >
          {job.status}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span>
          {job.openings_count} opening{job.openings_count === 1 ? "" : "s"}
        </span>
        {job.experience_level && <span>· {job.experience_level}</span>}
        {job.application_deadline && (
          <span>· Apply by {new Date(job.application_deadline).toLocaleDateString()}</span>
        )}
      </div>

      {job.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {job.tags.slice(0, 4).map((t) => (
            <Badge key={t} variant="secondary" className="text-[10px]">
              {t}
            </Badge>
          ))}
          {job.tags.length > 4 && (
            <span className="text-[10px] text-muted-foreground">+{job.tags.length - 4}</span>
          )}
        </div>
      )}

      {job.status === "open" && (
        <Link
          to="/business/applicants"
          search={{ job: job.id, tab: "matches" }}
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
        >
          <Users2 className="h-3.5 w-3.5" /> View best matching students{" "}
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}

      <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-3">
        <JobFormDialog
          companyId={companyId}
          userId={userId}
          job={job}
          trigger={
            <Button size="sm" variant="outline" className="h-7 px-2">
              <Pencil className="h-3 w-3" />
            </Button>
          }
        />
        {job.status === "open" || job.status === "draft" ? (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2"
            title="Pause"
            disabled={updateJob.isPending}
            onClick={() => updateJob.mutate({ id: job.id, patch: { status: "paused" } })}
          >
            <Pause className="h-3 w-3" />
          </Button>
        ) : job.status === "paused" ? (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2"
            title="Reopen"
            disabled={updateJob.isPending}
            onClick={() => updateJob.mutate({ id: job.id, patch: { status: "open" } })}
          >
            <PlayCircle className="h-3 w-3" />
          </Button>
        ) : null}
        {job.status !== "closed" && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2"
            title="Close"
            disabled={updateJob.isPending}
            onClick={() => updateJob.mutate({ id: job.id, patch: { status: "closed" } })}
          >
            <XCircle className="h-3 w-3" />
          </Button>
        )}
        {confirmDelete ? (
          <>
            <Button
              size="sm"
              variant="destructive"
              className="h-7 px-2"
              disabled={deleteJob.isPending}
              onClick={() => deleteJob.mutate(job.id)}
            >
              Confirm
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-destructive"
            title="Delete"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
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
