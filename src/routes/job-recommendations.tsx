import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  Loader2,
  MapPin,
  DollarSign,
  Briefcase,
  History,
  GraduationCap,
  FolderKanban,
  Award,
  Code2,
  MessagesSquare,
  Building2,
  ExternalLink,
} from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { useProfile } from "@/lib/profile-client";
import {
  useRecommendationHistory,
  useGenerateJobRecommendations,
  type JobRecommendationEntry,
  type JobRecommendationNextSteps,
  type JobRecommendationRun,
  type RecommendationCategory,
} from "@/lib/job-recommendations-client";

export const Route = createFileRoute("/job-recommendations")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Job Recommendations · Provn" },
      {
        name: "description",
        content:
          "AI-matched jobs, internships, and companies from the real Provn job board — scored against your resume, interviews, and roadmap.",
      },
    ],
  }),
  component: JobRecommendationsPage,
});

const EXPERIENCE_LEVELS = ["Entry level", "Mid level", "Senior level", "Lead", "Executive"];

const TABS: { id: RecommendationCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "job", label: "Jobs" },
  { id: "internship", label: "Internships" },
  { id: "remote", label: "Remote" },
  { id: "startup", label: "Startups" },
  { id: "company", label: "Top Companies" },
];

function JobRecommendationsPage() {
  const { data: user } = useCurrentUser();
  const { data: profile } = useProfile(user?.id);
  const { data: history } = useRecommendationHistory(user?.id);
  const generate = useGenerateJobRecommendations(user?.id);

  const [targetRole, setTargetRole] = useState("");
  const [preferredLocation, setPreferredLocation] = useState("");
  const [minSalary, setMinSalary] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<string>("any");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [internshipOnly, setInternshipOnly] = useState(false);
  const [fullTimeOnly, setFullTimeOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");

  const selectedRun = useMemo(() => {
    if (!history || history.length === 0) return null;
    if (selectedRunId) return history.find((r) => r.id === selectedRunId) ?? history[0];
    return history[0];
  }, [history, selectedRunId]);

  async function handleGenerate() {
    setError(null);
    const result = await generate.mutateAsync({
      targetRole: targetRole.trim() || profile?.target_role || undefined,
      preferredLocation: preferredLocation.trim() || undefined,
      minSalary: minSalary.trim() ? Number(minSalary.trim()) : undefined,
      experienceLevel: experienceLevel === "any" ? undefined : experienceLevel,
      remoteOnly,
      internshipOnly,
      fullTimeOnly,
    });
    if (result.error) setError(result.error);
    else if (result.recommendationId) setSelectedRunId(result.recommendationId);
  }

  const recommendations =
    (selectedRun?.recommendations as unknown as JobRecommendationEntry[]) ?? [];
  const nextSteps = (selectedRun?.next_steps as unknown as JobRecommendationNextSteps) ?? null;

  const filtered =
    tab === "all"
      ? recommendations
      : recommendations.filter((r) => r.categories.includes(tab as RecommendationCategory));
  const deduped =
    tab === "company"
      ? Array.from(new Map(filtered.map((r) => [r.companyId ?? r.companyName, r])).values())
      : filtered;

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="font-display text-4xl tracking-tight">Job recommendations.</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          AI-matched against real open roles on Provn — scored using your resume, ATS score, skill
          gap, interview performance, and roadmap progress. Never a fabricated listing: every title,
          company, and salary shown is a real posting.
        </p>
      </div>

      <div className="mb-8 space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="Target role"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
          />
          <Input
            placeholder="Preferred location"
            value={preferredLocation}
            onChange={(e) => setPreferredLocation(e.target.value)}
          />
          <Input
            type="number"
            placeholder="Minimum salary"
            value={minSalary}
            onChange={(e) => setMinSalary(e.target.value)}
          />
          <Select value={experienceLevel} onValueChange={setExperienceLevel}>
            <SelectTrigger>
              <SelectValue placeholder="Experience level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any experience level</SelectItem>
              {EXPERIENCE_LEVELS.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <Checkbox checked={remoteOnly} onCheckedChange={(c) => setRemoteOnly(c === true)} />
            Remote only
          </label>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={internshipOnly}
              onCheckedChange={(c) => setInternshipOnly(c === true)}
            />
            Internships only
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={fullTimeOnly} onCheckedChange={(c) => setFullTimeOnly(c === true)} />
            Full-time only
          </label>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={handleGenerate} disabled={generate.isPending}>
          {generate.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Get recommendations
        </Button>
      </div>

      {!selectedRun ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No recommendations yet — set your filters above and generate your first match list.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                    tab === t.id
                      ? "border-brand/60 bg-brand-soft text-brand"
                      : "border-border text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {deduped.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                No matches in this category yet — try a different filter or generate again.
              </div>
            ) : (
              <div className="space-y-4">
                {deduped.map((r) => (
                  <RecommendationCard key={r.jobId} entry={r} />
                ))}
              </div>
            )}

            {nextSteps && <NextStepsPanel nextSteps={nextSteps} />}
          </div>

          <HistoryList
            history={history ?? []}
            selectedId={selectedRun.id}
            onSelect={setSelectedRunId}
          />
        </div>
      )}
    </AppShell>
  );
}

function formatSalary(min: number | null, max: number | null, currency: string) {
  if (min == null && max == null) return "Not disclosed";
  const fmt = (n: number) =>
    `${currency === "INR" ? "₹" : currency + " "}${(n / 100000).toFixed(1)}L`;
  if (min != null && max != null) return `${fmt(min)}–${fmt(max)}`;
  return fmt((min ?? max)!);
}

function difficultyColor(difficulty: string) {
  if (difficulty === "Easy") return "border-emerald-400/40 text-emerald-600 dark:text-emerald-400";
  if (difficulty === "Hard") return "border-rose-400/40 text-rose-600 dark:text-rose-400";
  return "border-amber-400/40 text-amber-600 dark:text-amber-400";
}

function RecommendationCard({ entry }: { entry: JobRecommendationEntry }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg leading-tight">{entry.title}</h3>
          <p className="text-sm text-muted-foreground">{entry.companyName}</p>
        </div>
        <Badge variant="outline" className={difficultyColor(entry.difficulty)}>
          {entry.difficulty}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {entry.location && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {entry.location}
          </span>
        )}
        {entry.workMode && <span className="capitalize">{entry.workMode}</span>}
        {entry.employmentType && <span>{entry.employmentType}</span>}
        {entry.experienceLevel && <span>{entry.experienceLevel}</span>}
        <span className="inline-flex items-center gap-1">
          <DollarSign className="h-3.5 w-3.5" />
          {formatSalary(entry.salaryMin, entry.salaryMax, entry.currency)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <MiniStat label="Match" value={entry.matchPercent} />
        <MiniStat label="Eligibility" value={entry.eligibilityScore} />
        <MiniStat label="Hiring probability" value={entry.hiringProbability} />
      </div>

      {entry.missingSkills.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Missing skills
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {entry.missingSkills.map((s) => (
              <Badge key={s} variant="destructive" className="text-[10px]">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {entry.whyRecommended && (
        <p className="mt-4 text-sm text-muted-foreground">{entry.whyRecommended}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {entry.companyId && (
          <Link to="/c/$companyId" params={{ companyId: entry.companyId }}>
            <Button size="sm" variant="outline">
              <Building2 className="mr-1.5 h-3.5 w-3.5" /> View company
            </Button>
          </Link>
        )}
        <Link to="/apply">
          <Button size="sm">
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Apply
          </Button>
        </Link>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <Progress value={value} className="mt-1" />
    </div>
  );
}

function NextStepsPanel({ nextSteps }: { nextSteps: JobRecommendationNextSteps }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <RecommendationSection
        icon={<GraduationCap className="h-4 w-4 text-brand" />}
        title="Skills to learn next"
        items={nextSteps.skillsToLearn}
      />
      <RecommendationSection
        icon={<Award className="h-4 w-4 text-brand" />}
        title="Certifications"
        items={nextSteps.certifications}
      />
      <RecommendationSection
        icon={<FolderKanban className="h-4 w-4 text-brand" />}
        title="Projects"
        items={nextSteps.projects}
      />
      <RecommendationSection
        icon={<Code2 className="h-4 w-4 text-brand" />}
        title="Coding practice topics"
        items={nextSteps.codingTopics}
      />
      <RecommendationSection
        icon={<MessagesSquare className="h-4 w-4 text-brand" />}
        title="HR preparation topics"
        items={nextSteps.hrTopics}
      />
    </div>
  );
}

function RecommendationSection({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {icon} {title}
      </div>
      <ul className="mt-3 space-y-1.5">
        {items.length === 0 ? (
          <li className="text-xs text-muted-foreground">Nothing suggested here.</li>
        ) : (
          items.map((item) => (
            <li key={item} className="flex gap-2 text-sm">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" />
              {item}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function HistoryList({
  history,
  selectedId,
  onSelect,
}: {
  history: JobRecommendationRun[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="h-fit rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <History className="h-4 w-4 text-brand" /> History
      </div>
      <ul className="mt-3 space-y-2">
        {history.map((run) => {
          const count = (run.recommendations as unknown as JobRecommendationEntry[])?.length ?? 0;
          return (
            <li key={run.id}>
              <button
                type="button"
                onClick={() => onSelect(run.id)}
                className={`w-full rounded-xl border p-3 text-left text-xs transition ${
                  run.id === selectedId
                    ? "border-brand/60 bg-brand-soft/40"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <Briefcase className="h-3 w-3" /> {count} matches
                </div>
                <div className="mt-1 text-muted-foreground">
                  {new Date(run.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
                {run.target_role && (
                  <div className="mt-1 text-muted-foreground">Target: {run.target_role}</div>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
