import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Loader2, Send, Sparkles, User } from "lucide-react";
import { toast } from "sonner";

import { InterviewHeader } from "@/components/interview/InterviewHeader";
import { InterviewProgress } from "@/components/interview/InterviewProgress";
import {
  useStartVoiceInterview,
  useRespondToVoiceInterview,
  toVoiceInterviewType,
  toApiDifficulty,
  toApiLanguage,
  toApiVoiceGender,
  toApiDuration,
  buildInterviewContextFromJobAnalysis,
} from "@/lib/voice-interview-client";
import { InterviewFlowController } from "@/store/InterviewFlowController";
import { INTERVIEW_ROUTES } from "@/store/InterviewNavigation";
import type { InterviewSetupConfig } from "@/store/InterviewSessionStore";
import type { JobAnalysisResult } from "@/services/job/JobAnalysisEngine";

// Sprint 14: the text-mode counterpart to the OpenAI Realtime voice room
// — same real interview engine (voice-interview.server.ts), same
// persistence, same final report; the only difference is the I/O layer
// is a plain chat log instead of WebRTC audio.

export interface TextInterviewRoomProps {
  setup: InterviewSetupConfig;
  jobAnalysis: JobAnalysisResult | null;
}

interface ChatMessage {
  id: string;
  role: "ai" | "candidate";
  text: string;
}

const TOTAL_QUESTION_ESTIMATE: Record<number, number> = { 15: 4, 30: 6, 45: 8, 60: 10 };

export function TextInterviewRoom({ setup, jobAnalysis }: TextInterviewRoomProps) {
  const navigate = useNavigate();
  const startInterview = useStartVoiceInterview();
  const respond = useRespondToVoiceInterview();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [answer, setAnswer] = useState("");
  const [starting, setStarting] = useState(true);
  const [sending, setSending] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [readyToFinish, setReadyToFinish] = useState(false);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startError, setStartError] = useState<string | null>(null);
  const startedRef = useRef(false);
  const listEndRef = useRef<HTMLDivElement>(null);

  const totalQuestions = TOTAL_QUESTION_ESTIMATE[setup.duration] ?? 6;
  const totalSeconds = setup.duration * 60;

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const { jobDescriptionText, targetSkills } = buildInterviewContextFromJobAnalysis(jobAnalysis);

    startInterview
      .mutateAsync({
        interviewType: toVoiceInterviewType(setup.interviewType),
        company: setup.company ?? undefined,
        role: setup.role,
        difficulty: toApiDifficulty(setup.difficulty),
        durationMinutes: toApiDuration(setup.duration),
        language: toApiLanguage(setup.language),
        voiceGender: toApiVoiceGender(setup.voice),
        jobDescriptionText: jobDescriptionText ?? undefined,
        targetSkills: targetSkills ?? undefined,
      })
      .then((result) => {
        if (result.error || !result.sessionId || !result.question) {
          setStartError(result.error ?? "Could not start the interview.");
          return;
        }
        setSessionId(result.sessionId);
        InterviewFlowController.setVoiceInterviewSessionId(result.sessionId);
        setMessages([{ id: "q-0", role: "ai", text: result.question }]);
      })
      .catch(() => setStartError("Could not start the interview."))
      .finally(() => setStarting(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = answer.trim();
    if (!text || !sessionId || sending) return;

    setMessages((current) => [...current, { id: `a-${current.length}`, role: "candidate", text }]);
    setAnswer("");
    setSending(true);
    try {
      const result = await respond.mutateAsync({ sessionId, answer: text });
      if (result.error || !result.question) {
        toast.error(result.error ?? "The AI interviewer had trouble responding. Try again.");
        return;
      }
      setMessages((current) => [
        ...current,
        { id: `q-${current.length}`, role: "ai", text: result.question! },
      ]);
      if (result.readyToFinish) {
        setReadyToFinish(true);
      } else {
        setQuestionNumber((n) => n + 1);
      }
    } finally {
      setSending(false);
    }
  }

  async function handleFinish() {
    if (!sessionId || finishing) return;
    setFinishing(true);
    try {
      await InterviewFlowController.endInterview([], sessionId);
      toast.success("Interview ended — your report is ready.");
      navigate({ to: INTERVIEW_ROUTES.report });
    } finally {
      setFinishing(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-blue-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 top-1/3 h-[28rem] w-[28rem] rounded-full bg-cyan-500/15 blur-3xl" />

      <InterviewHeader
        interviewType={setup.interviewType}
        company={setup.company ?? ""}
        role={setup.role}
        questionNumber={questionNumber}
        totalQuestions={totalQuestions}
        secondsRemaining={Math.max(0, totalSeconds - elapsedSeconds)}
        recording={!starting && !readyToFinish}
        elapsedSeconds={elapsedSeconds}
        transcriptOpen={false}
        onToggleTranscript={() => {}}
      />

      <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
        <InterviewProgress
          currentQuestion={questionNumber}
          totalQuestions={totalQuestions}
          secondsRemaining={Math.max(0, totalSeconds - elapsedSeconds)}
          totalSeconds={totalSeconds}
        />

        <div className="flex-1 space-y-4 overflow-y-auto rounded-3xl border border-white/10 bg-white/[0.03] p-4 shadow-2xl shadow-blue-950/40 backdrop-blur-xl sm:p-6">
          {starting && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-white/60">
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting you to your AI interviewer…
            </div>
          )}

          {startError && (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">
              {startError}
            </div>
          )}

          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex gap-3 ${message.role === "candidate" ? "flex-row-reverse" : ""}`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  message.role === "ai"
                    ? "bg-gradient-to-br from-blue-500 to-cyan-400 text-white"
                    : "bg-white/10 text-white/70"
                }`}
              >
                {message.role === "ai" ? (
                  <Sparkles className="h-4 w-4" />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </span>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  message.role === "ai"
                    ? "bg-white/[0.06] text-white/90"
                    : "bg-blue-500/20 text-white"
                }`}
              >
                {message.text}
              </div>
            </motion.div>
          ))}

          {sending && (
            <div className="flex items-center gap-2 pl-11 text-xs text-white/40">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Thinking…
            </div>
          )}

          <div ref={listEndRef} />
        </div>

        {readyToFinish ? (
          <button
            type="button"
            onClick={handleFinish}
            disabled={finishing}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:opacity-95 disabled:opacity-60"
          >
            {finishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {finishing ? "Preparing your report…" : "See My Report"}
          </button>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Type your answer…"
              rows={2}
              disabled={starting || !!startError || sending}
              className="flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white placeholder:text-white/30 focus:border-blue-400/50 focus:outline-none disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={starting || !!startError || sending || !answer.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send answer"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
