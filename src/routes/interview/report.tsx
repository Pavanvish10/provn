import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Compass, Gauge, Loader2 } from "lucide-react";

import { OverallScoreCard } from "@/components/interview/report/OverallScoreCard";
import { ScoreBreakdown } from "@/components/interview/report/ScoreBreakdown";
import { StrengthCard } from "@/components/interview/report/StrengthCard";
import { WeaknessCard } from "@/components/interview/report/WeaknessCard";
import { ImprovementRoadmap } from "@/components/interview/report/ImprovementRoadmap";
import { HiringRecommendation } from "@/components/interview/report/HiringRecommendation";
import { PerformanceTimeline } from "@/components/interview/report/PerformanceTimeline";
import { InterviewSummary } from "@/components/interview/report/InterviewSummary";
import {
  QuestionAnalysis,
  type QuestionAnalysisEntry,
} from "@/components/interview/report/QuestionAnalysis";
import { SkillGapAnalysis } from "@/components/interview/report/SkillGapAnalysis";
import { NextStepsCard } from "@/components/interview/report/NextStepsCard";
import { RetakeInterviewButton } from "@/components/interview/report/RetakeInterviewButton";
import { DownloadReportButton } from "@/components/interview/report/DownloadReportButton";
import { ShareReportButton } from "@/components/interview/report/ShareReportButton";

import { STRENGTH_THRESHOLD, WEAKNESS_THRESHOLD } from "@/ai/evaluation/EvaluationModels";
import type { EvaluationCategory } from "@/ai/evaluation/EvaluationTypes";
import type { DifficultyLevel } from "@/ai/QuestionDifficulty";
import { getCompanyProfile } from "@/ai/resume/CompanyProfile";
import { useVoiceInterviewSession, adaptVoiceInterviewReport } from "@/lib/voice-interview-client";
import type { VoiceInterviewQA } from "@/lib/voice-interview.server";
import { useInterviewSession } from "@/store/InterviewSessionStore";
import { InterviewFlowController } from "@/store/InterviewFlowController";
import { requireAuth } from "@/lib/auth-guard";

export const Route = createFileRoute("/interview/report")({
  beforeLoad: (args) => {
    requireAuth(args);
    InterviewFlowController.enforceReportAccess();
  },
  head: () => ({
    meta: [
      { title: "Interview Report · Provn" },
      { name: "description", content: "Your AI-generated interview performance report." },
    ],
  }),
  component: InterviewReportPage,
});

const READINESS_ADJUSTMENT: Record<DifficultyLevel, number> = { easy: 10, medium: 0, hard: -10 };

const INTERVIEW_TYPE_DISPLAY: Record<string, string> = {
  hr: "HR",
  technical: "Technical",
  manager: "Manager",
  startup: "Startup",
  faang: "FAANG",
};

const LEARNING_TOPIC_SUGGESTIONS: Record<EvaluationCategory, string[]> = {
  communication: ["Structuring answers with the STAR method"],
  confidence: ["Assertive communication techniques"],
  grammar: ["Spoken English grammar refresher"],
  vocabulary: ["Technical vocabulary building"],
  fluency: ["Reducing filler words in practice sessions"],
  technicalKnowledge: ["System design fundamentals", "Data structures deep dive"],
  problemSolving: ["Structured problem-solving frameworks"],
  leadership: ["Leadership storytelling for interviews"],
  listening: ["Active listening & question comprehension"],
  professionalism: ["Professional interview etiquette"],
};

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function InterviewReportPage() {
  const interviewSession = useInterviewSession();
  const {
    data: session,
    isLoading,
    error,
  } = useVoiceInterviewSession(interviewSession.voiceInterviewSessionId ?? undefined);

  if (isLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex items-center gap-2 text-sm text-white/60">
          <Loader2 className="h-4 w-4 animate-spin" />
          {error ? "Could not load this report." : "Loading your report…"}
        </div>
      </div>
    );
  }

  return <ReportContent session={session} />;
}

function ReportContent({
  session,
}: {
  session: NonNullable<ReturnType<typeof useVoiceInterviewSession>["data"]>;
}) {
  const report = useMemo(() => adaptVoiceInterviewReport(session), [session]);

  const strengths = useMemo(
    () =>
      [...report.categoryScores]
        .filter((entry) => entry.score >= STRENGTH_THRESHOLD)
        .sort((a, b) => b.score - a.score),
    [report],
  );
  const weaknesses = useMemo(
    () =>
      [...report.categoryScores]
        .filter((entry) => entry.score < WEAKNESS_THRESHOLD)
        .sort((a, b) => a.score - b.score),
    [report],
  );

  const questions = (session.questions as unknown as VoiceInterviewQA[]) ?? [];
  const answeredQuestions = questions.filter((q) => q.answer);

  const questionEntries = useMemo<QuestionAnalysisEntry[]>(
    () =>
      answeredQuestions.map((q, index) => ({
        questionNumber: index + 1,
        question: q.question,
        answer: q.answer ?? "",
        score: q.score ?? report.overallScore,
        feedback:
          [q.strengths?.[0], q.weaknesses?.[0]].filter(Boolean).join(" ") ||
          "No detailed feedback available for this answer.",
        improvementTip:
          q.suggestions?.[0] ?? q.idealAnswer ?? "Review this topic before your next interview.",
      })),
    [answeredQuestions, report.overallScore],
  );

  const interviewTypeLabel =
    INTERVIEW_TYPE_DISPLAY[session.interview_type] ?? session.interview_type;
  const companyProfile = session.company ? getCompanyProfile(session.company) : null;

  const companyReadiness = clampScore(
    report.overallScore + (companyProfile ? READINESS_ADJUSTMENT[companyProfile.difficulty] : 0),
  );

  const topicSourceCategories =
    weaknesses.length > 0
      ? weaknesses
      : [...report.categoryScores].sort((a, b) => a.score - b.score).slice(0, 2);
  const learningTopics = Array.from(
    new Set(topicSourceCategories.flatMap((entry) => LEARNING_TOPIC_SUGGESTIONS[entry.category])),
  ).slice(0, 5);

  const nextInterviewDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      month: "long",
      day: "numeric",
    },
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-blue-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 top-1/3 h-[28rem] w-[28rem] rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-[24rem] w-[24rem] rounded-full bg-indigo-600/15 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <Link
              to="/interview"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white/50 transition hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to dashboard
            </Link>
            <h1 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
              Interview Report
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <DownloadReportButton />
            <ShareReportButton />
            <RetakeInterviewButton />
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <OverallScoreCard score={report.overallScore} />
          <HiringRecommendation recommendation={report.hiringRecommendation} />
          <InterviewSummary
            role={session.role}
            company={session.company}
            interviewType={interviewTypeLabel}
            questionCount={answeredQuestions.length}
            aiNotes={report.aiNotes}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ScoreBreakdown categories={report.categoryScores} />
          </div>
          <NextStepsCard
            learningTopics={learningTopics}
            nextInterviewDate={nextInterviewDate}
            companyReadiness={companyReadiness}
            companyName={session.company}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h2 className="font-display text-lg font-semibold text-white">Strengths</h2>
            {strengths.length === 0 ? (
              <p className="text-sm text-white/40">No standout strengths yet — keep practicing.</p>
            ) : (
              strengths.map((item) => <StrengthCard key={item.category} item={item} />)
            )}
          </div>
          <div className="space-y-3">
            <h2 className="font-display text-lg font-semibold text-white">Weaknesses</h2>
            {weaknesses.length === 0 ? (
              <p className="text-sm text-white/40">No significant weaknesses detected.</p>
            ) : (
              weaknesses.map((item) => <WeaknessCard key={item.category} item={item} />)
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ImprovementRoadmap improvementAreas={report.improvementAreas} />
          <SkillGapAnalysis
            matchedSkills={session.matched_skills ?? []}
            missingSkills={session.missing_skills ?? []}
          />
        </div>

        <div className="mt-6">
          <PerformanceTimeline timeline={report.timeline} />
        </div>

        <div className="mt-6">
          <QuestionAnalysis entries={questionEntries} />
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 pb-4">
          <DownloadReportButton />
          <ShareReportButton />
          <RetakeInterviewButton />
          <Link
            to="/career-roadmap"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white/85 transition hover:bg-white/[0.08]"
          >
            <Compass className="h-4 w-4" /> Build your personalized roadmap
          </Link>
          <Link
            to="/eligibility"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white/85 transition hover:bg-white/[0.08]"
          >
            <Gauge className="h-4 w-4" /> Check company eligibility
          </Link>
        </div>
      </div>
    </div>
  );
}
