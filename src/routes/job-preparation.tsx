import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppNav";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Code2,
  Database,
  LineChart,
  Brain,
  Server,
  Palette,
  Cloud,
  Smartphone,
  ShieldCheck,
  Sparkles,
  Lock,
  CheckCircle2,
  Circle,
  Loader2,
  Wand2,
} from "lucide-react";
import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { useProfile } from "@/lib/profile-client";
import { usePremiumStatus } from "@/lib/premium-client";
import {
  useRoadmapSteps,
  useRoadmapTemplates,
  useStartRoadmap,
  useToggleStepProgress,
  useUserRoadmap,
  useUserRoadmapProgress,
} from "@/lib/roadmap-client";
import { generateRoadmapForRoleFn } from "@/lib/roadmap.server";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/job-preparation")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Job Preparation · Provn" },
      {
        name: "description",
        content:
          "Pick a target role and get a step-by-step roadmap — from fundamentals to interview.",
      },
      { property: "og:title", content: "Job Preparation · Provn" },
      {
        property: "og:description",
        content: "Role-based roadmaps for every technical career track.",
      },
    ],
  }),
  component: JobPrep,
});

const ROLE_ICONS: Record<string, typeof Code2> = {
  frontend: Code2,
  backend: Server,
  fullstack: Sparkles,
  "data-analyst": LineChart,
  "data-scientist": Brain,
  devops: Cloud,
  mobile: Smartphone,
  designer: Palette,
  sql: Database,
  security: ShieldCheck,
};

function iconFor(role: string) {
  return ROLE_ICONS[role] ?? Code2;
}

function JobPrep() {
  const { data: user } = useCurrentUser();
  const { data: profile } = useProfile(user?.id);
  const { data: isPremiumStatus } = usePremiumStatus(user?.id);
  const isPremium = !!isPremiumStatus?.isPremium;

  const { data: templates, isLoading: templatesLoading } = useRoadmapTemplates();
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = templates?.find((r) => r.id === activeId) ?? null;

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [customRole, setCustomRole] = useState("");
  const queryClient = useQueryClient();

  const targetRoleHasTemplate = useMemo(() => {
    if (!profile?.target_role || !templates) return true;
    const slug = profile.target_role
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-+)|(-+$)/g, "");
    return templates.some((t) => t.role === slug);
  }, [profile?.target_role, templates]);

  const generateRoadmap = async (roleText: string) => {
    if (!roleText.trim()) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await generateRoadmapForRoleFn({ data: { role: roleText.trim() } });
      if (res.error || !res.roadmapId) {
        setGenerateError(res.error ?? "Could not generate a roadmap. Try again.");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["roadmap-templates"] });
      setActiveId(res.roadmapId);
    } catch {
      setGenerateError("Something went wrong generating the roadmap. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  if (active) {
    return (
      <RoadmapDetail
        roadmap={active}
        profileId={user?.id}
        isPremium={isPremium}
        onBack={() => setActiveId(null)}
      />
    );
  }

  return (
    <AppShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl tracking-tight">Job preparation, by role.</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Pick your target role. We'll open a step-by-step roadmap you can track to completion.
          </p>
        </div>
      </div>

      {profile?.target_role && !targetRoleHasTemplate && (
        <div className="mb-8 rounded-2xl border border-brand/30 bg-brand-soft/40 p-6">
          <div className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-brand" />
            <div className="font-medium">No roadmap yet for "{profile.target_role}"</div>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            We don't have a track for your target role yet. Generate one with AI — it'll be saved so
            every future candidate targeting this role gets it instantly.
          </p>
          {generateError && <p className="mt-2 text-sm text-destructive">{generateError}</p>}
          <Button
            className="mt-4"
            onClick={() => generateRoadmap(profile.target_role!)}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Generate my roadmap
              </>
            )}
          </Button>
        </div>
      )}

      <div className="mb-8 rounded-2xl border border-border bg-card p-6">
        <div className="font-medium">Don't see your role?</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us the role and AI will generate a real, reusable roadmap for it.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Textarea
            value={customRole}
            onChange={(e) => setCustomRole(e.target.value)}
            placeholder="e.g. Site Reliability Engineer"
            className="min-h-[40px] resize-none sm:flex-1"
          />
          <Button
            onClick={() => generateRoadmap(customRole)}
            disabled={generating || !customRole.trim()}
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
          </Button>
        </div>
        {generateError && <p className="mt-2 text-sm text-destructive">{generateError}</p>}
      </div>

      {templatesLoading ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Loading roadmaps…
        </div>
      ) : !templates || templates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No roadmaps yet. Generate one above to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((r) => {
            const Icon = iconFor(r.role);
            return (
              <button
                key={r.id}
                onClick={() => setActiveId(r.id)}
                className="group rounded-2xl border border-border bg-card p-6 text-left transition hover:border-foreground/20 hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-soft text-brand">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-widest text-muted-foreground">
                      {r.role}
                    </div>
                    <h3 className="font-display text-xl leading-tight">{r.title}</h3>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{r.description}</p>
                <div className="mt-4 flex items-center gap-2">
                  <Badge variant="secondary">Roadmap</Badge>
                  {r.is_premium && (
                    <Badge variant="secondary" className="inline-flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Premium
                    </Badge>
                  )}
                </div>
                <div className="mt-5 text-sm font-medium text-brand">View roadmap →</div>
              </button>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function RoadmapDetail({
  roadmap,
  profileId,
  isPremium,
  onBack,
}: {
  roadmap: {
    id: string;
    title: string;
    description: string | null;
    is_premium: boolean;
    role: string;
  };
  profileId: string | undefined;
  isPremium: boolean;
  onBack: () => void;
}) {
  const { data: steps, isLoading: stepsLoading } = useRoadmapSteps(roadmap.id);
  const { data: userRoadmap } = useUserRoadmap(profileId, roadmap.id);
  const startRoadmap = useStartRoadmap(profileId);
  const { data: progress } = useUserRoadmapProgress(userRoadmap?.id);
  const toggleStep = useToggleStepProgress(userRoadmap?.id);

  const gated = roadmap.is_premium && !isPremium;

  const completedStepIds = new Set(
    (progress ?? []).filter((p) => p.completed).map((p) => p.step_id),
  );
  const totalSteps = steps?.length ?? 0;
  const completedCount = completedStepIds.size;
  const pct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  return (
    <AppShell>
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All roles
      </button>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            {roadmap.role}
          </div>
          <h1 className="mt-1 font-display text-4xl tracking-tight">{roadmap.title} roadmap</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">{roadmap.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/challenges">
            <Button variant="outline">Start today's drill</Button>
          </Link>
          {!gated &&
            (userRoadmap ? (
              <Badge variant="secondary">
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Started
              </Badge>
            ) : (
              <Button
                onClick={() => startRoadmap.mutate(roadmap.id)}
                disabled={startRoadmap.isPending || !profileId}
              >
                {startRoadmap.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Start this roadmap"
                )}
              </Button>
            ))}
        </div>
      </div>

      {userRoadmap && !gated && (
        <div className="mt-6 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Your progress</span>
            <span className="text-muted-foreground">
              {completedCount}/{totalSteps} steps
            </span>
          </div>
          <Progress value={pct} className="mt-2" />
        </div>
      )}

      {gated ? (
        <div className="mt-8 overflow-hidden rounded-2xl border border-brand/40 bg-brand-soft/50">
          <div className="p-7">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-background px-2.5 py-1 text-xs text-brand">
              <Sparkles className="h-3 w-3" /> Premium roadmap
            </div>
            <h2 className="mt-3 font-display text-3xl tracking-tight">
              This roadmap is part of Provn Premium.
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Upgrade to unlock the full step-by-step content for this track.
            </p>
            <Link to="/plan">
              <Button size="lg" className="mt-5">
                <Lock className="mr-2 h-4 w-4" /> Upgrade to unlock
              </Button>
            </Link>
          </div>
        </div>
      ) : stepsLoading ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Loading steps…
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          {(steps ?? []).map((step, i) => {
            const done = completedStepIds.has(step.id);
            return (
              <div
                key={step.id}
                className={`rounded-2xl border p-6 ${done ? "border-brand bg-brand-soft/30" : "border-border bg-card"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-muted-foreground">
                      Phase 0{i + 1} · ~{step.estimated_hours}h
                    </div>
                    <h3 className="mt-1 font-display text-2xl">{step.title}</h3>
                  </div>
                  {userRoadmap && (
                    <button
                      onClick={() => toggleStep.mutate({ stepId: step.id, completed: !done })}
                      disabled={toggleStep.isPending}
                      className="shrink-0"
                      title={done ? "Mark incomplete" : "Mark complete"}
                    >
                      {done ? (
                        <CheckCircle2 className="h-6 w-6 text-brand" />
                      ) : (
                        <Circle className="h-6 w-6 text-muted-foreground" />
                      )}
                    </button>
                  )}
                </div>
                {step.description && (
                  <ul className="mt-4 space-y-2 text-sm">
                    {step.description
                      .split(";")
                      .map((it) => it.trim())
                      .filter(Boolean)
                      .map((it) => (
                        <li key={it} className="flex items-start gap-2">
                          <Circle className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span>{it}</span>
                        </li>
                      ))}
                  </ul>
                )}
                {step.resource_url && (
                  <a
                    href={step.resource_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-xs font-medium text-brand hover:underline"
                  >
                    Resource →
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!gated && !isPremium && (
        <div className="mt-10 overflow-hidden rounded-2xl border border-brand/40 bg-brand-soft/50">
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr]">
            <div className="p-7">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-background px-2.5 py-1 text-xs text-brand">
                <Sparkles className="h-3 w-3" /> Provn Premium
              </div>
              <h2 className="mt-3 font-display text-3xl tracking-tight">
                Want premium tracks too?
              </h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Premium unlocks every premium-only roadmap track as it's added.
              </p>
            </div>
            <div className="border-t border-border bg-background p-7 lg:border-l lg:border-t-0">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Provn Premium
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-4xl">₹299</span>
                <span className="text-sm text-muted-foreground">/ month</span>
              </div>
              <Link to="/plan">
                <Button size="lg" className="mt-5 w-full">
                  <Lock className="mr-2 h-4 w-4" /> View plans
                </Button>
              </Link>
              <p className="mt-2 text-[11px] text-muted-foreground">Cancel any time.</p>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
