import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Check,
  FileText,
  Code2,
  Mic,
  Lock,
  Upload,
  Play,
  Sparkles,
  ShieldCheck,
  MapPin,
  Loader2,
  Briefcase,
} from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { useProfile } from "@/lib/profile-client";
import { useCurrentResume } from "@/lib/resume-client";
import { useHasPassedChallenge, useLatestMockInterview } from "@/lib/verification-client";
import { useApplyToJob, useMyApplications, useOpenJobs } from "@/lib/jobs-client";
import { MockInterviewDialog } from "@/components/MockInterviewDialog";

export const Route = createFileRoute("/apply")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Apply for a job · Provn" },
      {
        name: "description",
        content: "Verify your skills, then apply with proof — not just claims.",
      },
      { property: "og:title", content: "Apply for a job · Provn" },
      { property: "og:description", content: "Three verifications unlock every listing." },
    ],
  }),
  component: Apply,
});

function formatSalary(min: number | null, max: number | null, currency: string) {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    `${currency === "INR" ? "₹" : currency + " "}${(n / 100000).toFixed(0)}L`;
  if (min && max) return `${fmt(min)}–${fmt(max)}`;
  return fmt((min ?? max)!);
}

function Apply() {
  const { data: user } = useCurrentUser();
  const { data: profile } = useProfile(user?.id);
  const queryClient = useQueryClient();

  const { data: resume } = useCurrentResume(user?.id);
  const { data: hasPassedChallenge } = useHasPassedChallenge(user?.id);
  const { data: latestInterview } = useLatestMockInterview(user?.id);

  const resumeDone = !!resume;
  const codingDone = !!hasPassedChallenge;
  const interviewDone = latestInterview?.status === "completed";

  const stepsDone = [resumeDone, codingDone, interviewDone].filter(Boolean).length;
  const unlocked = stepsDone === 3;

  const [interviewOpen, setInterviewOpen] = useState(false);

  const { data: jobs, isLoading: jobsLoading } = useOpenJobs();
  const { data: applications } = useMyApplications(user?.id);
  const applyMutation = useApplyToJob(user?.id);
  const appliedJobIds = new Set((applications ?? []).map((a) => a.job_id));

  const onInterviewFinished = () => {
    queryClient.invalidateQueries({ queryKey: ["verify-mock-interview", user?.id] });
  };

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="font-display text-4xl tracking-tight">Apply for a job.</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Provn only lets you apply once your skills are verified — real checks, not simulated ones.
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8 rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand" />
            <div className="font-medium">Skill verification</div>
            <Badge variant="secondary">{stepsDone}/3</Badge>
          </div>
          {unlocked ? (
            <Badge className="bg-brand text-brand-foreground hover:bg-brand">Unlocked</Badge>
          ) : (
            <span className="text-xs text-muted-foreground">Complete all 3 to unlock listings</span>
          )}
        </div>
        <Progress value={(stepsDone / 3) * 100} className="mt-4" />

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <VerifyStep
            done={resumeDone}
            icon={<FileText className="h-5 w-5" />}
            title="1. Upload résumé"
            desc="Your résumé seeds every AI test. Upload it from your profile."
            action={
              resumeDone ? (
                <Badge variant="secondary">
                  <Check className="mr-1 h-3 w-3" /> Uploaded
                </Badge>
              ) : (
                <Link to="/profile">
                  <Button size="sm">
                    <Upload className="mr-1.5 h-3.5 w-3.5" /> Go to profile
                  </Button>
                </Link>
              )
            }
          />
          <VerifyStep
            done={codingDone}
            locked={!resumeDone}
            icon={<Code2 className="h-5 w-5" />}
            title="2. Pass a coding challenge"
            desc="Solve at least one challenge to prove your skills."
            action={
              codingDone ? (
                <Badge variant="secondary">
                  <Check className="mr-1 h-3 w-3" /> Passed
                </Badge>
              ) : (
                <Link to="/challenges">
                  <Button size="sm" disabled={!resumeDone}>
                    <Play className="mr-1.5 h-3.5 w-3.5" /> Go to challenges
                  </Button>
                </Link>
              )
            }
          />
          <VerifyStep
            done={interviewDone}
            locked={!codingDone}
            icon={<Mic className="h-5 w-5" />}
            title="3. AI Mock Interview"
            desc="A real, turn-based interview with AI — then get scored feedback."
            action={
              interviewDone ? (
                <Badge variant="secondary">
                  <Check className="mr-1 h-3 w-3" /> Passed · {latestInterview?.score ?? "—"}/10
                </Badge>
              ) : (
                <Button size="sm" disabled={!codingDone} onClick={() => setInterviewOpen(true)}>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Begin interview
                </Button>
              )
            }
          />
        </div>
      </div>

      {/* Jobs */}
      <div className="mb-4 flex items-end justify-between">
        <h2 className="font-display text-2xl">Open roles</h2>
        {!unlocked && (
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Lock className="h-3 w-3" /> Locked until verified
          </span>
        )}
      </div>

      {jobsLoading ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Loading open roles…
        </div>
      ) : !jobs || jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Briefcase className="mx-auto h-8 w-8 text-muted-foreground" />
          <div className="mt-3 font-display text-xl">No open roles right now</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Check back soon — companies post new roles regularly.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {jobs.map((j) => {
            const applied = appliedJobIds.has(j.id);
            const salary = formatSalary(j.salary_min, j.salary_max, j.currency);
            return (
              <div
                key={j.id}
                className={`rounded-2xl border p-5 ${unlocked ? "border-border bg-card" : "border-border bg-card opacity-60"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-widest text-muted-foreground">
                      {j.companies?.company_name ?? "Company"}
                    </div>
                    <h3 className="mt-1 font-display text-xl">{j.title ?? "Untitled role"}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {j.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" /> {j.location}
                        </span>
                      )}
                      {salary && <span>· {salary}</span>}
                    </div>
                  </div>
                  <Button
                    disabled={!unlocked || applied || applyMutation.isPending}
                    size="sm"
                    onClick={() => applyMutation.mutate(j.id)}
                  >
                    {applied ? (
                      <>
                        <Check className="mr-1 h-3.5 w-3.5" /> Applied
                      </>
                    ) : unlocked ? (
                      applyMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Apply"
                      )
                    ) : (
                      <>
                        <Lock className="mr-1 h-3.5 w-3.5" /> Locked
                      </>
                    )}
                  </Button>
                </div>
                {j.description && (
                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{j.description}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(j.tags ?? []).map((t) => (
                    <Badge key={t} variant="secondary">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <MockInterviewDialog
        open={interviewOpen}
        onOpenChange={setInterviewOpen}
        defaultRole={profile?.target_role ?? "Software Engineer"}
        mode="technical"
        onFinished={onInterviewFinished}
      />
    </AppShell>
  );
}

function VerifyStep({
  done,
  locked,
  icon,
  title,
  desc,
  action,
}: {
  done: boolean;
  locked?: boolean;
  icon: React.ReactNode;
  title: string;
  desc: string;
  action: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${done ? "border-brand bg-brand-soft/50" : locked ? "border-border bg-background opacity-70" : "border-border bg-background"}`}
    >
      <div className="flex items-center gap-2">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-md ${done ? "bg-brand text-brand-foreground" : "bg-muted text-foreground"}`}
        >
          {done ? <Check className="h-4 w-4" /> : icon}
        </div>
        <div className="font-medium">{title}</div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
      <div className="mt-4">{action}</div>
    </div>
  );
}
