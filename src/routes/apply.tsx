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
  Send,
  Trophy,
  ThumbsUp,
  AlertTriangle,
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
import {
  finishInterviewFn,
  respondToInterviewFn,
  startMockInterviewFn,
  type InterviewFeedback,
  type InterviewTurn,
} from "@/lib/interview.server";

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
            desc="A real, turn-based interview with Claude — then get scored feedback."
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

type InterviewPhase = "idle" | "running" | "ready_to_finish" | "completed";

function MockInterviewDialog({
  open,
  onOpenChange,
  defaultRole,
  onFinished,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRole: string;
  onFinished: () => void;
}) {
  const [role, setRole] = useState(defaultRole);
  const [phase, setPhase] = useState<InterviewPhase>("idle");
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<InterviewTurn[]>([]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);

  const reset = () => {
    setPhase("idle");
    setInterviewId(null);
    setTranscript([]);
    setAnswer("");
    setLoading(false);
    setError(null);
    setFeedback(null);
    setRole(defaultRole);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const begin = async () => {
    if (!role.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await startMockInterviewFn({ data: { role: role.trim() } });
      if (res.error || !res.interviewId || !res.question) {
        setError(res.error ?? "Could not start the interview.");
        return;
      }
      setInterviewId(res.interviewId);
      setTranscript([{ role: "assistant", content: res.question }]);
      setPhase("running");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const send = async () => {
    if (!answer.trim() || !interviewId) return;
    const candidateAnswer = answer.trim();
    setTranscript((t) => [...t, { role: "user", content: candidateAnswer }]);
    setAnswer("");
    setLoading(true);
    setError(null);
    try {
      const res = await respondToInterviewFn({ data: { interviewId, answer: candidateAnswer } });
      if (res.error || !res.question) {
        setError(res.error ?? "Could not get the next question.");
        return;
      }
      setTranscript((t) => [...t, { role: "assistant", content: res.question! }]);
      setPhase(res.readyToFinish ? "ready_to_finish" : "running");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const finish = async () => {
    if (!interviewId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await finishInterviewFn({ data: { interviewId } });
      if (res.error || !res.feedback) {
        setError(res.error ?? "Could not generate feedback.");
        return;
      }
      setFeedback(res.feedback);
      setPhase("completed");
      onFinished();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-brand" /> AI Mock Interview
          </DialogTitle>
          <DialogDescription>
            {phase === "idle" &&
              "A real, turn-based interview — Claude asks the questions, you answer in text."}
            {phase === "running" && `Interviewing for: ${role}`}
            {phase === "ready_to_finish" &&
              "That's the last question — get your feedback when ready."}
            {phase === "completed" && "Interview complete."}
          </DialogDescription>
        </DialogHeader>

        {phase === "idle" && (
          <div className="space-y-3">
            <label className="text-xs font-medium text-muted-foreground">
              Role you're interviewing for
            </label>
            <Textarea
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Frontend Developer"
              className="min-h-[44px] resize-none"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" onClick={begin} disabled={loading || !role.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Start interview</>}
            </Button>
          </div>
        )}

        {(phase === "running" || phase === "ready_to_finish") && (
          <div className="space-y-4">
            <div className="max-h-72 space-y-3 overflow-y-auto rounded-xl border border-border bg-background p-3">
              {transcript.map((t, i) => (
                <div
                  key={i}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    t.role === "assistant" ? "bg-brand-soft/60" : "ml-6 bg-muted"
                  }`}
                >
                  <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                    {t.role === "assistant" ? "Interviewer" : "You"}
                  </div>
                  {t.content}
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                </div>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {phase === "running" ? (
              <div className="flex items-end gap-2">
                <Textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type your answer…"
                  className="min-h-[60px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                <Button size="icon" onClick={send} disabled={loading || !answer.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button className="w-full" onClick={finish} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Get my feedback"}
              </Button>
            )}
          </div>
        )}

        {phase === "completed" && feedback && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-brand/30 bg-brand-soft/50 p-4">
              <Trophy className="h-8 w-8 text-brand" />
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Score</div>
                <div className="font-display text-3xl">{feedback.score}/10</div>
              </div>
            </div>
            <p className="text-sm">{feedback.summary}</p>
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <ThumbsUp className="h-3.5 w-3.5" /> Strengths
              </div>
              <ul className="space-y-1 text-sm">
                {feedback.strengths.map((s) => (
                  <li key={s} className="flex gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" /> {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5" /> Improve
              </div>
              <ul className="space-y-1 text-sm">
                {feedback.improvements.map((s) => (
                  <li key={s} className="flex gap-2">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" /> {s}
                  </li>
                ))}
              </ul>
            </div>
            <Button className="w-full" onClick={() => handleClose(false)}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
