import { useEffect, useState } from "react";
import { Mic, Loader2, Send, Trophy, Check, ThumbsUp, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  finishInterviewFn,
  respondToInterviewFn,
  startMockInterviewFn,
  type InterviewFeedback,
  type InterviewMode,
  type InterviewTurn,
} from "@/lib/interview.server";

type InterviewPhase = "idle" | "running" | "ready_to_finish" | "completed";

const MODE_COPY: Record<InterviewMode, { title: string; idleDescription: string }> = {
  technical: {
    title: "AI Mock Interview",
    idleDescription: "A real, turn-based interview — AI asks the questions, you answer in text.",
  },
  soft_skills: {
    title: "AI Soft-Skills Interview",
    idleDescription:
      "A behavioral practice interview focused on communication, teamwork, and leadership — AI asks the questions, you answer in text.",
  },
};

export function MockInterviewDialog({
  open,
  onOpenChange,
  defaultRole,
  mode,
  onFinished,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRole: string;
  mode: InterviewMode;
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

  const copy = MODE_COPY[mode];

  // defaultRole (profile.target_role) often resolves after this dialog has
  // already mounted (it's rendered closed, not mounted-on-open) — keep the
  // field in sync with it until the user actually starts the interview.
  useEffect(() => {
    if (phase === "idle") setRole(defaultRole);
  }, [defaultRole, phase]);

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
      const res = await startMockInterviewFn({ data: { role: role.trim(), mode } });
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
            <Mic className="h-5 w-5 text-brand" /> {copy.title}
          </DialogTitle>
          <DialogDescription>
            {phase === "idle" && copy.idleDescription}
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
