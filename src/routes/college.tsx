import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Building2,
  Plus,
  Loader2,
  GraduationCap,
  Briefcase,
  Users,
  CalendarClock,
  PlayCircle,
  Pause,
  XCircle,
  ArrowRight,
} from "lucide-react";

import { CollegeShell } from "@/components/CollegeNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { requireCollegeAccount } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import {
  useMyCollege,
  useCreateCollege,
  useCollegeDrives,
  useCreateDrive,
  useUpdateDrive,
  type PlacementDrive,
  type DriveFormInput,
} from "@/lib/college-client";

export const Route = createFileRoute("/college")({
  beforeLoad: requireCollegeAccount,
  head: () => ({
    meta: [
      { title: "College Portal · Provn" },
      {
        name: "description",
        content: "Create campus placement drives and manage student applicants.",
      },
    ],
  }),
  component: CollegePage,
});

const STATUS_TONE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-brand-soft text-brand",
  paused: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  closed: "bg-destructive/10 text-destructive",
};

function CollegePage() {
  const { data: user } = useCurrentUser();
  // Deliberately not branching structure on `isLoading` — the same query
  // can resolve between the SSR flush and the client's first hydration
  // paint, causing a hydration mismatch (see business.tsx in Sprint 25 for
  // the same fix). `membership` stays undefined during loading too, so the
  // `!membership` branch below covers both cases.
  const { data: membership } = useMyCollege(user?.id);
  const collegeId = membership?.college.id;
  const { data: drives = [], isLoading: loadingDrives } = useCollegeDrives(collegeId);

  if (!membership) {
    return (
      <CollegeShell>
        <RegisterCollegeCard userId={user?.id} />
      </CollegeShell>
    );
  }

  const stats = {
    total: drives.length,
    published: drives.filter((d) => d.status === "published").length,
    draft: drives.filter((d) => d.status === "draft").length,
  };

  return (
    <CollegeShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <GraduationCap className="h-5 w-5" />
          </div>
          <h1 className="mt-3 font-display text-3xl tracking-tight">{membership.college.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your role: {membership.role} · Create campus drives and manage student applicants.
          </p>
        </div>
        <DriveFormDialog
          collegeId={collegeId}
          userId={user?.id}
          trigger={
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" /> Create drive
            </Button>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard icon={Briefcase} label="Drives created" value={stats.total} />
        <StatCard icon={PlayCircle} label="Published" value={stats.published} />
        <StatCard icon={CalendarClock} label="Drafts" value={stats.draft} />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 font-display text-xl">Placement drives</h2>
        {loadingDrives ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : drives.length === 0 ? (
          <EmptyState text="No placement drives yet — create your first one above." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Deadline</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {drives.map((d) => (
                  <DriveRow key={d.id} drive={d} collegeId={collegeId} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </CollegeShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function DriveRow({ drive, collegeId }: { drive: PlacementDrive; collegeId: string | undefined }) {
  const updateDrive = useUpdateDrive(collegeId);

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-3 font-medium">{drive.role}</td>
      <td className="px-4 py-3 text-muted-foreground">
        {drive.company_name_override || "—"}
        {drive.location ? ` · ${drive.location}` : ""}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {drive.application_deadline
          ? new Date(drive.application_deadline).toLocaleDateString()
          : "—"}
      </td>
      <td className="px-4 py-3">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest ${STATUS_TONE[drive.status] ?? "bg-muted text-muted-foreground"}`}
        >
          {drive.status}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {drive.status === "draft" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={() => updateDrive.mutate({ id: drive.id, status: "published" })}
            >
              <PlayCircle className="h-3.5 w-3.5" /> Publish
            </Button>
          )}
          {drive.status === "published" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={() => updateDrive.mutate({ id: drive.id, status: "paused" })}
            >
              <Pause className="h-3.5 w-3.5" /> Pause
            </Button>
          )}
          {drive.status === "paused" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={() => updateDrive.mutate({ id: drive.id, status: "published" })}
            >
              <PlayCircle className="h-3.5 w-3.5" /> Resume
            </Button>
          )}
          {drive.status !== "closed" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs text-destructive"
              onClick={() => updateDrive.mutate({ id: drive.id, status: "closed" })}
            >
              <XCircle className="h-3.5 w-3.5" /> Close
            </Button>
          )}
          <Link to="/college-drive/$driveId" params={{ driveId: drive.id }}>
            <Button size="sm" className="h-7 gap-1 text-xs">
              Applicants <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </td>
    </tr>
  );
}

function RegisterCollegeCard({ userId }: { userId: string | undefined }) {
  const createCollege = useCreateCollege(userId);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Enter your college's name.");
      return;
    }
    try {
      await createCollege.mutateAsync({ name, location, website });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register your college.");
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
        <h1 className="mt-3 font-display text-2xl">Register your college</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Set up your college's placement portal to start creating campus drives.
        </p>
        <form onSubmit={submit} className="mt-5 space-y-3 text-left">
          <div>
            <Label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">
              College name
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. IIT Bombay"
            />
          </div>
          <div>
            <Label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">
              Location
            </Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Mumbai"
            />
          </div>
          <div>
            <Label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">
              Website
            </Label>
            <Input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://…"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={createCollege.isPending}>
            {createCollege.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Register college
          </Button>
        </form>
      </div>
    </div>
  );
}

function DriveFormDialog({
  collegeId,
  userId,
  trigger,
}: {
  collegeId: string | undefined;
  userId: string | undefined;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const createDrive = useCreateDrive(collegeId, userId);
  const [error, setError] = useState<string | null>(null);

  const [role, setRole] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [packageMin, setPackageMin] = useState("");
  const [packageMax, setPackageMax] = useState("");
  const [minCgpa, setMinCgpa] = useState("");
  const [allowedBranches, setAllowedBranches] = useState("");
  const [allowedYears, setAllowedYears] = useState("");
  const [minYearOfStudy, setMinYearOfStudy] = useState("");
  const [eligibilityNotes, setEligibilityNotes] = useState("");
  const [applicationDeadline, setApplicationDeadline] = useState("");
  const [testDate, setTestDate] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [maxApplicants, setMaxApplicants] = useState("");

  const reset = () => {
    setRole("");
    setCompanyName("");
    setLocation("");
    setEmploymentType("");
    setPackageMin("");
    setPackageMax("");
    setMinCgpa("");
    setAllowedBranches("");
    setAllowedYears("");
    setMinYearOfStudy("");
    setEligibilityNotes("");
    setApplicationDeadline("");
    setTestDate("");
    setInterviewDate("");
    setMaxApplicants("");
    setError(null);
  };

  const submit = async (status: "draft" | "published") => {
    setError(null);
    if (!role.trim()) {
      setError("Enter a role.");
      return;
    }
    const input: DriveFormInput = {
      role,
      companyNameOverride: companyName,
      location,
      employmentType: employmentType || undefined,
      packageMin: packageMin.trim() ? Number(packageMin) : null,
      packageMax: packageMax.trim() ? Number(packageMax) : null,
      minCgpa: minCgpa.trim() ? Number(minCgpa) : null,
      allowedBranches: allowedBranches
        .split(",")
        .map((b) => b.trim())
        .filter(Boolean),
      allowedGraduationYears: allowedYears
        .split(",")
        .map((y) => Number(y.trim()))
        .filter((y) => !Number.isNaN(y)),
      minYearOfStudy: minYearOfStudy.trim() ? Number(minYearOfStudy) : null,
      eligibilityNotes,
      applicationDeadline: applicationDeadline ? new Date(applicationDeadline).toISOString() : null,
      testDate: testDate ? new Date(testDate).toISOString() : null,
      interviewDate: interviewDate ? new Date(interviewDate).toISOString() : null,
      maxApplicants: maxApplicants.trim() ? Number(maxApplicants) : null,
      status,
    };
    try {
      await createDrive.mutateAsync(input);
      reset();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the drive.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a placement drive</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Role">
            <Input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Backend Developer"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company">
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Corp"
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Package min (LPA)">
              <Input
                type="number"
                value={packageMin}
                onChange={(e) => setPackageMin(e.target.value)}
                placeholder="6"
              />
            </Field>
            <Field label="Package max (LPA)">
              <Input
                type="number"
                value={packageMax}
                onChange={(e) => setPackageMax(e.target.value)}
                placeholder="12"
              />
            </Field>
          </div>

          <div className="rounded-xl border border-border p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Eligibility criteria
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Min CGPA">
                <Input
                  type="number"
                  step="0.1"
                  value={minCgpa}
                  onChange={(e) => setMinCgpa(e.target.value)}
                  placeholder="7.0"
                />
              </Field>
              <Field label="Min year of study">
                <Input
                  type="number"
                  value={minYearOfStudy}
                  onChange={(e) => setMinYearOfStudy(e.target.value)}
                  placeholder="3"
                />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Allowed branches (comma-separated)">
                <Input
                  value={allowedBranches}
                  onChange={(e) => setAllowedBranches(e.target.value)}
                  placeholder="Computer Science, IT"
                />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Allowed graduation years (comma-separated)">
                <Input
                  value={allowedYears}
                  onChange={(e) => setAllowedYears(e.target.value)}
                  placeholder="2026, 2027"
                />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Eligibility notes">
                <Textarea
                  value={eligibilityNotes}
                  onChange={(e) => setEligibilityNotes(e.target.value)}
                  className="min-h-[60px]"
                  placeholder="Any other criteria for students to know…"
                />
              </Field>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Application deadline">
              <Input
                type="date"
                value={applicationDeadline}
                onChange={(e) => setApplicationDeadline(e.target.value)}
              />
            </Field>
            <Field label="Test date">
              <Input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} />
            </Field>
            <Field label="Interview date">
              <Input
                type="date"
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Max applicants">
            <Input
              type="number"
              value={maxApplicants}
              onChange={(e) => setMaxApplicants(e.target.value)}
              placeholder="Leave blank for no cap"
            />
          </Field>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={createDrive.isPending}
              onClick={() => submit("draft")}
            >
              Save as draft
            </Button>
            <Button
              className="flex-1"
              disabled={createDrive.isPending}
              onClick={() => submit("published")}
            >
              {createDrive.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Publish
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
