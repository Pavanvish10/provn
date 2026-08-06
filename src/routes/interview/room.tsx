import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Loader2, Mic, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { InterviewHeader } from "@/components/interview/InterviewHeader";
import { AIInterviewerAvatar } from "@/components/interview/AIInterviewerAvatar";
import { CandidateCamera } from "@/components/interview/CandidateCamera";
import { CurrentQuestionCard } from "@/components/interview/CurrentQuestionCard";
import { InterviewControls } from "@/components/interview/InterviewControls";
import { InterviewProgress } from "@/components/interview/InterviewProgress";
import { InterviewTimeline } from "@/components/interview/InterviewTimeline";
import { AIThinkingAnimation } from "@/components/interview/AIThinkingAnimation";
import { LiveTranscriptPanel } from "@/components/interview/LiveTranscriptPanel";
import {
  InterviewStatusBar,
  type InterviewStatus,
} from "@/components/interview/InterviewStatusBar";
import { useRealtimeInterview } from "@/hooks/useRealtimeInterview";
import type { ConversationSetup } from "@/services/realtime/conversationManager";
import type { RealtimeSessionStatus } from "@/services/realtime/sessionManager";
import { useInterviewSession } from "@/store/InterviewSessionStore";
import { InterviewFlowController } from "@/store/InterviewFlowController";
import { INTERVIEW_ROUTES } from "@/store/InterviewNavigation";
import type { InterviewBrainPersonalization } from "@/ai/InterviewBrain";
import { CandidateKnowledgeGraph } from "@/ai/resume/CandidateKnowledgeGraph";
import { getCompanyProfile } from "@/ai/resume/CompanyProfile";
import { requireAuth } from "@/lib/auth-guard";

export const Route = createFileRoute("/interview/room")({
  beforeLoad: (args) => {
    requireAuth(args);
    InterviewFlowController.enforceRoomAccess();
  },
  head: () => ({
    meta: [
      { title: "Interview Room · Provn" },
      {
        name: "description",
        content: "Your live AI interview session.",
      },
    ],
  }),
  component: InterviewRoomPage,
});

// Fallback shown only if this page is somehow reached without a saved
// setup (the beforeLoad guard above normally prevents that).
const FALLBACK_SETUP: ConversationSetup = {
  interviewType: "Technical",
  company: "Google",
  role: "Frontend Developer",
};

const CURRENT_QUESTION_ESTIMATE_SECONDS = 120;
const DEFAULT_DURATION_MINUTES = 30;
const TOTAL_QUESTION_TARGET = 8;
const ACTIVE_STATUSES: RealtimeSessionStatus[] = ["connected", "listening", "thinking", "speaking"];

const NARROW_STATUS: Record<RealtimeSessionStatus, InterviewStatus> = {
  idle: "waiting",
  connecting: "waiting",
  connected: "waiting",
  listening: "listening",
  thinking: "thinking",
  speaking: "speaking",
  disconnected: "waiting",
  error: "waiting",
};

const STATUS_COPY: Record<RealtimeSessionStatus, string> = {
  idle: "Idle",
  connecting: "Connecting…",
  connected: "Connected",
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking…",
  disconnected: "Disconnected",
  error: "Error",
};

function InterviewRoomPage() {
  const navigate = useNavigate();
  const interviewSession = useInterviewSession();

  const roomSetup: ConversationSetup = interviewSession.setup
    ? {
        interviewType: interviewSession.setup.interviewType,
        company: interviewSession.setup.company ?? undefined,
        role: interviewSession.setup.role,
        difficulty: interviewSession.setup.difficulty,
        language: interviewSession.setup.language,
      }
    : FALLBACK_SETUP;
  const totalSessionSeconds = (interviewSession.setup?.duration ?? DEFAULT_DURATION_MINUTES) * 60;

  // Sprint 11: ground the live model's questions in a real uploaded
  // resume when one is available and the chosen company is one of the
  // supported profiles — otherwise the brain falls back to its generic
  // topic bank exactly as before.
  const personalization = useMemo<InterviewBrainPersonalization | undefined>(() => {
    if (!interviewSession.resumeMock || !interviewSession.setup?.company) return undefined;
    const companyId = getCompanyProfile(interviewSession.setup.company)?.id;
    if (!companyId) return undefined;
    return {
      companyId,
      knowledgeGraph: new CandidateKnowledgeGraph(
        interviewSession.resumeMock,
        interviewSession.jobDescriptionMock,
      ),
    };
  }, [
    interviewSession.resumeMock,
    interviewSession.jobDescriptionMock,
    interviewSession.setup?.company,
  ]);

  const session = useRealtimeInterview(roomSetup, personalization);

  const [uiPaused, setUiPaused] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(totalSessionSeconds);

  const sessionActive = ACTIVE_STATUSES.includes(session.status);
  const recording = sessionActive && !uiPaused;

  useEffect(() => {
    if (!recording) return;
    const interval = setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
      setSecondsRemaining((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [recording]);

  useEffect(() => {
    if (session.status === "error" && session.error) {
      toast.error(session.error);
    }
  }, [session.status, session.error]);

  useEffect(() => {
    if (sessionActive) InterviewFlowController.beginRoomSession();
  }, [sessionActive]);

  function handleStart() {
    setUiPaused(false);
    setElapsedSeconds(0);
    setSecondsRemaining(totalSessionSeconds);
    session.start();
  }

  function handleToggleMic() {
    session.toggleMute();
  }

  function handleTogglePause() {
    setUiPaused((current) => {
      const next = !current;
      if (next && !session.micMuted) session.toggleMute();
      toast(next ? "Interview paused" : "Interview resumed");
      return next;
    });
  }

  function handleSettings() {
    toast.info("Settings coming soon");
  }

  function handleEnd() {
    const transcriptSnapshot = session.transcript;
    session.stop();
    InterviewFlowController.endInterview(transcriptSnapshot);
    toast.success("Interview ended — your report is ready.");
    navigate({ to: INTERVIEW_ROUTES.report });
  }

  const lastAiEntry = [...session.transcript].reverse().find((entry) => entry.speaker === "ai");
  const questionText =
    lastAiEntry?.text && lastAiEntry.text.trim().length > 0
      ? lastAiEntry.text
      : "Your AI interviewer will begin shortly…";

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-blue-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 top-1/3 h-[28rem] w-[28rem] rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-[24rem] w-[24rem] rounded-full bg-indigo-600/15 blur-3xl" />

      <InterviewHeader
        interviewType={roomSetup.interviewType}
        company={roomSetup.company ?? ""}
        role={roomSetup.role}
        questionNumber={session.questionNumber}
        totalQuestions={TOTAL_QUESTION_TARGET}
        secondsRemaining={secondsRemaining}
        recording={recording}
        elapsedSeconds={elapsedSeconds}
        transcriptOpen={transcriptOpen}
        onToggleTranscript={() => setTranscriptOpen((open) => !open)}
      />

      <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
        <InterviewTimeline currentIndex={Math.min(6, session.questionNumber - 1)} />

        <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[1fr_240px]">
          <div className="flex flex-col items-center justify-center gap-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-blue-950/40 backdrop-blur-xl sm:p-10">
            {session.status === "idle" ||
            session.status === "connecting" ||
            session.status === "error" ? (
              <StartGate status={session.status} error={session.error} onStart={handleStart} />
            ) : (
              <>
                <div className="flex flex-col items-center gap-2">
                  <InterviewStatusBar status={NARROW_STATUS[session.status]} />
                  <span className="text-xs font-medium text-white/40">
                    {STATUS_COPY[session.status]}
                  </span>
                </div>

                <AIInterviewerAvatar status={NARROW_STATUS[session.status]} />

                <AnimatePresence>
                  {session.status === "thinking" && <AIThinkingAnimation key="thinking" />}
                </AnimatePresence>

                <CurrentQuestionCard
                  question={questionText}
                  questionNumber={session.questionNumber}
                  totalQuestions={TOTAL_QUESTION_TARGET}
                  estimatedSeconds={CURRENT_QUESTION_ESTIMATE_SECONDS}
                />
              </>
            )}
          </div>

          <div className="flex justify-center lg:justify-start">
            <CandidateCamera micMuted={session.micMuted} />
          </div>
        </div>

        <InterviewProgress
          currentQuestion={session.questionNumber}
          totalQuestions={TOTAL_QUESTION_TARGET}
          secondsRemaining={secondsRemaining}
          totalSeconds={totalSessionSeconds}
        />
      </div>

      <InterviewControls
        micMuted={session.micMuted}
        onToggleMic={handleToggleMic}
        paused={uiPaused}
        onTogglePause={handleTogglePause}
        onEnd={handleEnd}
        onSettings={handleSettings}
      />

      <LiveTranscriptPanel
        open={transcriptOpen}
        onOpenChange={setTranscriptOpen}
        entries={session.transcript}
      />
    </div>
  );
}

function StartGate({
  status,
  error,
  onStart,
}: {
  status: RealtimeSessionStatus;
  error: string | null;
  onStart: () => void;
}) {
  const connecting = status === "connecting";
  const errored = status === "error";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex max-w-md flex-col items-center gap-4 text-center"
    >
      <span
        className={`flex h-16 w-16 items-center justify-center rounded-full ${
          errored ? "bg-rose-500/15 text-rose-300" : "bg-blue-500/15 text-blue-300"
        }`}
      >
        {connecting ? (
          <Loader2 className="h-7 w-7 animate-spin" />
        ) : errored ? (
          <AlertTriangle className="h-7 w-7" />
        ) : (
          <Mic className="h-7 w-7" />
        )}
      </span>

      <div>
        <h2 className="font-display text-xl font-bold text-white">
          {connecting
            ? "Connecting to your AI interviewer…"
            : errored
              ? "Something went wrong"
              : "Ready when you are"}
        </h2>
        <p className="mt-1.5 text-sm text-white/60">
          {errored
            ? (error ?? "Could not start the interview.")
            : "We'll ask for microphone access, then connect you to a live AI interviewer."}
        </p>
      </div>

      {!connecting && (
        <button
          type="button"
          onClick={onStart}
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:opacity-95"
        >
          {errored ? <RotateCcw className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {errored ? "Try Again" : "Start Interview"}
        </button>
      )}
    </motion.div>
  );
}
