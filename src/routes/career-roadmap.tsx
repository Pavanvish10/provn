import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Sparkles,
  Loader2,
  Target,
  Building2,
  ChevronLeft,
  ChevronRight,
  Code2,
  HeartHandshake,
  MessagesSquare,
  FolderKanban,
  Milestone,
  CalendarClock,
} from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { useProfile } from "@/lib/profile-client";
import { CompanySelector } from "@/components/interview/job/CompanySelector";
import { JobDescriptionInput } from "@/components/interview/job/JobDescriptionInput";
import {
  SAMPLE_JOB_DESCRIPTIONS,
  type SampleJobDescription,
} from "@/services/job/JobDescriptionParser";
import {
  useMyCareerRoadmap,
  useGenerateCareerRoadmap,
  useArchiveCareerRoadmap,
  useCareerRoadmapMonthlyTasks,
  useCareerRoadmapWeeklyTasks,
  useCareerRoadmapDailyTasks,
  useCareerRoadmapProgress,
  useToggleCareerRoadmapTask,
  type CareerRoadmap,
  type RoadmapPlanItem,
  type RoadmapProjectItem,
  type RoadmapSkillGap,
} from "@/lib/career-roadmap-client";

export const Route = createFileRoute("/career-roadmap")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Career Roadmap · Provn" },
      {
        name: "description",
        content:
          "Your personalized AI career roadmap — readiness scores, daily tasks, and a prep plan built from your resume and interview history.",
      },
    ],
  }),
  component: CareerRoadmapPage,
});

function CareerRoadmapPage() {
  const { data: user } = useCurrentUser();
  const { data: profile } = useProfile(user?.id);
  const { data: roadmap } = useMyCareerRoadmap(user?.id);

  if (!roadmap) {
    return (
      <AppShell>
        <RoadmapSetup profileId={user?.id} defaultRole={profile?.target_role ?? ""} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <RoadmapDashboard roadmap={roadmap} profileId={user?.id} />
    </AppShell>
  );
}

function RoadmapSetup({
  profileId,
  defaultRole,
}: {
  profileId: string | undefined;
  defaultRole: string;
}) {
  const generate = useGenerateCareerRoadmap(profileId);
  const [targetRole, setTargetRole] = useState(defaultRole);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [jdText, setJdText] = useState("");
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [durationMonths, setDurationMonths] = useState(3);
  const [error, setError] = useState<string | null>(null);

  // The profile (and its target_role) loads asynchronously after this
  // component's first render, so seed the field once it arrives instead
  // of only capturing it at mount — but never clobber what the user typed.
  useEffect(() => {
    if (defaultRole && !targetRole) setTargetRole(defaultRole);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultRole]);

  function handleSelectSample(sample: SampleJobDescription) {
    setJdText(sample.text);
    setSelectedSampleId(sample.id);
    if (!targetRole.trim()) setTargetRole(sample.role);
  }

  async function handleGenerate() {
    if (!targetRole.trim()) {
      setError("Enter a target role.");
      return;
    }
    setError(null);
    const result = await generate.mutateAsync({
      targetRole: targetRole.trim(),
      targetCompany: companyId ?? undefined,
      jobDescriptionText: jdText.trim() || undefined,
      durationMonths,
    });
    if (result.error) setError(result.error);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="font-display text-4xl tracking-tight">Your AI career roadmap.</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Built from your resume analysis and mock interview history — a personalized plan with
          daily tasks, weekly goals, monthly milestones, and readiness scores for the role and
          company you're targeting.
        </p>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-white/20 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:bg-white/5">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Target className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            Target role
          </div>
          <Input
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="e.g. Backend Developer"
            className="mt-3"
          />
        </div>

        <div className="rounded-2xl border border-white/20 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:bg-white/5">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Building2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            Target company <span className="font-normal text-muted-foreground">(optional)</span>
          </div>
          <div className="mt-3">
            <CompanySelector value={companyId} onChange={setCompanyId} />
          </div>
        </div>

        <JobDescriptionInput
          value={jdText}
          onChange={setJdText}
          samples={SAMPLE_JOB_DESCRIPTIONS}
          selectedSampleId={selectedSampleId}
          onSelectSample={handleSelectSample}
        />

        <div className="rounded-2xl border border-white/20 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:bg-white/5">
          <div className="flex items-center justify-between text-sm font-semibold text-foreground">
            <span className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              Preparation duration
            </span>
            <span className="text-violet-600 dark:text-violet-400">
              {durationMonths} {durationMonths === 1 ? "month" : "months"}
            </span>
          </div>
          <Slider
            value={[durationMonths]}
            onValueChange={(v) => setDurationMonths(v[0])}
            min={1}
            max={24}
            step={1}
            className="mt-4"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          size="lg"
          className="w-full"
          onClick={handleGenerate}
          disabled={generate.isPending || !targetRole.trim()}
        >
          {generate.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Building your roadmap…
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" /> Generate my roadmap
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{value}%</span>
      </div>
      <Progress value={value} className="mt-1.5" />
    </div>
  );
}

function RoadmapDashboard({
  roadmap,
  profileId,
}: {
  roadmap: CareerRoadmap;
  profileId: string | undefined;
}) {
  const archive = useArchiveCareerRoadmap(profileId);
  const { data: progress } = useCareerRoadmapProgress(roadmap);
  const { data: monthly } = useCareerRoadmapMonthlyTasks(roadmap.id);
  const { data: weekly } = useCareerRoadmapWeeklyTasks(roadmap.id);
  const toggleTask = useToggleCareerRoadmapTask(roadmap.id);

  const totalWeeks = weekly?.length ?? 0;
  const currentWeekFromStart = useMemo(() => {
    const start = new Date(roadmap.start_date);
    const days = Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(Math.max(1, Math.floor(days / 7) + 1), Math.max(1, totalWeeks));
  }, [roadmap.start_date, totalWeeks]);
  const [weekNumber, setWeekNumber] = useState(currentWeekFromStart);
  const { data: dailyTasks } = useCareerRoadmapDailyTasks(roadmap.id, weekNumber);

  const skillGap = (roadmap.skill_gap as unknown as RoadmapSkillGap) ?? {
    matched: [],
    missing: [],
    priority: [],
  };
  const projects = (roadmap.recommended_projects as unknown as RoadmapProjectItem[]) ?? [];
  const codingPlan = (roadmap.coding_practice_plan as unknown as RoadmapPlanItem[]) ?? [];
  const hrPlan = (roadmap.hr_prep_plan as unknown as RoadmapPlanItem[]) ?? [];
  const interviewPlan = (roadmap.interview_prep_plan as unknown as RoadmapPlanItem[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            {roadmap.duration_months}-month plan · started{" "}
            {new Date(roadmap.start_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
          <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">
            {roadmap.target_role}
            {roadmap.target_company ? ` @ ${roadmap.target_company}` : ""}
          </h1>
        </div>
        <Button
          variant="outline"
          onClick={() => archive.mutate(roadmap.id)}
          disabled={archive.isPending}
        >
          {archive.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Start a new roadmap
        </Button>
      </div>

      {roadmap.summary && (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          {roadmap.summary}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-3">
        <ScoreBar label="Role readiness" value={roadmap.role_readiness_score} />
        <ScoreBar label="Company readiness" value={roadmap.company_readiness_score} />
        <ScoreBar label="Hiring readiness" value={roadmap.hiring_readiness_score} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Progress tracker</span>
          <span className="text-muted-foreground">
            {progress ? `${progress.completed}/${progress.total} tasks` : "…"}
          </span>
        </div>
        <Progress value={progress?.percentage ?? 0} className="mt-2" />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{progress?.percentage ?? 0}% complete</span>
          <span>
            Estimated completion:{" "}
            {progress?.estimatedCompletionDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }) ?? "—"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Target className="h-4 w-4 text-brand" /> Skill gap
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Matched
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {skillGap.matched.length === 0 ? (
                  <span className="text-xs text-muted-foreground">None yet.</span>
                ) : (
                  skillGap.matched.map((s) => (
                    <Badge key={s} variant="secondary">
                      {s}
                    </Badge>
                  ))
                )}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Missing (priority first)
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {skillGap.missing.length === 0 ? (
                  <span className="text-xs text-muted-foreground">No gaps found.</span>
                ) : (
                  [
                    ...skillGap.priority,
                    ...skillGap.missing.filter((s) => !skillGap.priority.includes(s)),
                  ].map((s) => (
                    <Badge key={s} variant="destructive">
                      {s}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Milestone className="h-4 w-4 text-brand" /> Monthly milestones
          </div>
          <ol className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
            {(monthly ?? []).map((m) => (
              <li key={m.id} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-bold text-brand">
                  {m.period_index}
                </span>
                <div>
                  <p className="text-sm font-medium">{m.title}</p>
                  {m.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{m.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CalendarClock className="h-4 w-4 text-brand" /> This week's daily tasks — week{" "}
            {weekNumber}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setWeekNumber((w) => Math.max(1, w - 1))}
              disabled={weekNumber <= 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setWeekNumber((w) => Math.min(totalWeeks || w, w + 1))}
              disabled={weekNumber >= totalWeeks}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {(dailyTasks ?? []).map((task) => (
            <label
              key={task.id}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 hover:bg-muted/50"
            >
              <Checkbox
                checked={task.completed}
                onCheckedChange={(checked) =>
                  toggleTask.mutate({ taskId: task.id, completed: checked === true })
                }
                className="mt-0.5"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={`text-sm font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}
                  >
                    {task.title}
                  </p>
                  {task.task_date && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(task.task_date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>
                {task.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{task.description}</p>
                )}
              </div>
            </label>
          ))}
          {(dailyTasks ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No tasks for this week.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Milestone className="h-4 w-4 text-brand" /> Weekly goals
        </div>
        <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
          {(weekly ?? []).map((w) => (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => setWeekNumber(w.period_index)}
                className={`w-full rounded-xl border p-3 text-left text-sm transition ${
                  w.period_index === weekNumber
                    ? "border-brand/60 bg-brand-soft/40"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{w.title}</span>
                  {w.category && (
                    <Badge variant="outline" className="text-[10px]">
                      {w.category}
                    </Badge>
                  )}
                </div>
                {w.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{w.description}</p>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <FolderKanban className="h-4 w-4 text-brand" /> Recommended projects
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <div key={p.title} className="rounded-xl border border-border p-4">
              <p className="text-sm font-medium">{p.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {p.skillsPracticed?.map((s) => (
                  <Badge key={s} variant="secondary" className="text-[10px]">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
          {projects.length === 0 && (
            <p className="text-sm text-muted-foreground">No projects suggested.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <PlanCard
          icon={<Code2 className="h-4 w-4 text-brand" />}
          title="Coding practice plan"
          items={codingPlan}
        />
        <PlanCard
          icon={<HeartHandshake className="h-4 w-4 text-brand" />}
          title="HR prep plan"
          items={hrPlan}
        />
        <PlanCard
          icon={<MessagesSquare className="h-4 w-4 text-brand" />}
          title="Interview prep plan"
          items={interviewPlan}
        />
      </div>
    </div>
  );
}

function PlanCard({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: RoadmapPlanItem[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {icon} {title}
      </div>
      <ol className="mt-4 space-y-3">
        {items.map((item, i) => (
          <li key={item.title} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-bold text-brand">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-medium">{item.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
            </div>
          </li>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground">Nothing planned.</p>}
      </ol>
    </div>
  );
}
