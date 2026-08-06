import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

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

import { EvaluationEngine, DUMMY_EVALUATION_TURNS } from "@/ai/evaluation/EvaluationEngine";
import {
  clampScore,
  IMPROVEMENT_TIPS,
  STRENGTH_THRESHOLD,
  WEAKNESS_THRESHOLD,
} from "@/ai/evaluation/EvaluationModels";
import type { EvaluationCategory } from "@/ai/evaluation/EvaluationTypes";
import { INTERVIEW_TYPE_LABELS } from "@/ai/InterviewContext";
import type { DifficultyLevel } from "@/ai/QuestionDifficulty";
import { ResumeAnalyzer } from "@/ai/resume/ResumeAnalyzer";
import { JobDescriptionAnalyzer } from "@/ai/resume/JobDescriptionAnalyzer";
import { CandidateKnowledgeGraph } from "@/ai/resume/CandidateKnowledgeGraph";
import { getCompanyProfile } from "@/ai/resume/CompanyProfile";
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

const READINESS_ADJUSTMENT: Record<DifficultyLevel, number> = { easy: 10, medium: 0, hard: -10 };

function InterviewReportPage() {
  const interviewSession = useInterviewSession();

  // The route guard only allows this page once a real report exists, but
  // a fresh test-mode run keeps the page useful on its own (e.g. in
  // isolation during development) if it's ever reached without one.
  const report = useMemo(
    () => interviewSession.evaluationReport ?? new EvaluationEngine().runTestEvaluation(),
    [interviewSession.evaluationReport],
  );

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

  const questionEntries = useMemo<QuestionAnalysisEntry[]>(
    () =>
      report.timeline.map((snapshot, index) => {
        const turn = DUMMY_EVALUATION_TURNS[index];
        const weakest = [...snapshot.categoryScores].sort((a, b) => a.score - b.score)[0];
        return {
          questionNumber: index + 1,
          question: turn.question,
          answer: turn.transcript,
          score: snapshot.overallScore,
          feedback: weakest.rationale,
          improvementTip: IMPROVEMENT_TIPS[weakest.category],
        };
      }),
    [report],
  );

  const knowledgeGraph = useMemo(() => {
    const resumeProfile = interviewSession.resumeMock ?? new ResumeAnalyzer().analyzeMock();
    const jobDescription =
      interviewSession.jobDescriptionMock ?? new JobDescriptionAnalyzer().analyzeMock();
    return new CandidateKnowledgeGraph(resumeProfile, jobDescription);
  }, [interviewSession.resumeMock, interviewSession.jobDescriptionMock]);

  const fallbackTurn = DUMMY_EVALUATION_TURNS[0];
  const reportContext = {
    role: interviewSession.setup?.role ?? fallbackTurn.role,
    company: interviewSession.setup?.company ?? fallbackTurn.company,
    interviewTypeLabel:
      interviewSession.setup?.interviewType ?? INTERVIEW_TYPE_LABELS[fallbackTurn.interviewType],
  };
  const companyProfile = reportContext.company ? getCompanyProfile(reportContext.company) : null;

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
            role={reportContext.role}
            company={reportContext.company}
            interviewType={reportContext.interviewTypeLabel}
            questionCount={report.timeline.length}
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
            companyName={reportContext.company}
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
            matchedSkills={knowledgeGraph.getMatchedSkills()}
            missingSkills={knowledgeGraph.getMissingSkills()}
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
        </div>
      </div>
    </div>
  );
}
