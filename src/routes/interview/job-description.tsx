import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, FileText } from "lucide-react";

import { JobDescriptionInput } from "@/components/interview/job/JobDescriptionInput";
import { InterviewTypeSelector } from "@/components/interview/job/InterviewTypeSelector";
import { CompanySelector } from "@/components/interview/job/CompanySelector";
import { RoleSelector } from "@/components/interview/job/RoleSelector";
import { DifficultySelector } from "@/components/interview/job/DifficultySelector";
import { AnalysisProgress } from "@/components/interview/job/AnalysisProgress";
import { GenerateInterviewButton } from "@/components/interview/job/GenerateInterviewButton";
import { JobAnalysisSummary } from "@/components/interview/job/JobAnalysisSummary";
import { RequiredSkillsCard } from "@/components/interview/job/RequiredSkillsCard";
import { MissingSkillsCard } from "@/components/interview/job/MissingSkillsCard";
import { InterviewFocusCard } from "@/components/interview/job/InterviewFocusCard";
import { PreparationRoadmapCard } from "@/components/interview/job/PreparationRoadmapCard";

import type { DifficultyLevel } from "@/ai/QuestionDifficulty";
import { CompanyKnowledgeBase } from "@/services/job/CompanyKnowledgeBase";
import { RoleKnowledgeBase } from "@/services/job/RoleKnowledgeBase";
import {
  JobDescriptionParser,
  type SampleJobDescription,
} from "@/services/job/JobDescriptionParser";
import { JobAnalysisEngine, type JobAnalysisResult } from "@/services/job/JobAnalysisEngine";
import { InterviewFlowController } from "@/store/InterviewFlowController";
import { INTERVIEW_ROUTES } from "@/store/InterviewNavigation";
import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { useCurrentResume } from "@/lib/resume-client";
import type { ResumeAnalysis } from "@/lib/resume.server";

export const Route = createFileRoute("/interview/job-description")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Job Description Analysis · Provn" },
      {
        name: "description",
        content:
          "Paste a job description and get a tailored interview plan, skill-gap breakdown, and preparation roadmap.",
      },
    ],
  }),
  component: JobDescriptionPage,
});

type PageStage = "form" | "analyzing" | "ready";

const ANALYSIS_STEP_DELAY_MS = 350;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function JobDescriptionPage() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const { data: resume } = useCurrentResume(user?.id);

  const [stage, setStage] = useState<PageStage>("form");
  const [jobDescriptionText, setJobDescriptionText] = useState("");
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [interviewType, setInterviewType] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [roleId, setRoleId] = useState<string | null>(null);
  const [difficultyOverride, setDifficultyOverride] = useState<DifficultyLevel | null>(null);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [result, setResult] = useState<JobAnalysisResult | null>(null);

  const samples = useMemo(() => JobDescriptionParser.getSamples(), []);
  const recommendedDifficulty = useMemo(
    () => (companyId ? (CompanyKnowledgeBase.get(companyId)?.difficulty ?? null) : null),
    [companyId],
  );

  const canGenerate = jobDescriptionText.trim().length > 0 && !!interviewType;

  function handleSelectSample(sample: SampleJobDescription) {
    setJobDescriptionText(sample.text);
    setSelectedSampleId(sample.id);
    if (!roleId && RoleKnowledgeBase.get(sample.role)) {
      setRoleId(sample.role);
    }
  }

  async function handleGenerate() {
    if (!canGenerate) return;

    setStage("analyzing");
    for (let step = 0; step < 4; step += 1) {
      setAnalysisStep(step);
      await wait(ANALYSIS_STEP_DELAY_MS);
    }

    const analysis = resume?.analysis as unknown as ResumeAnalysis | null;
    const candidateSkills = analysis
      ? [
          ...(analysis.skills ?? []),
          ...(analysis.technologies ?? []),
          ...(analysis.frameworks ?? []),
        ]
      : null;
    const analysisResult = new JobAnalysisEngine().analyze({
      jobDescriptionText,
      companyId,
      roleId,
      interviewType: interviewType ?? "technical",
      candidateSkills,
      difficultyOverride,
    });

    InterviewFlowController.applyJobAnalysis(analysisResult);
    setResult(analysisResult);
    setStage("ready");
  }

  function handleEdit() {
    setStage("form");
  }

  function handleContinue() {
    navigate({ to: INTERVIEW_ROUTES.setup });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-violet-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/40">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-64 h-96 w-96 rounded-full bg-fuchsia-400/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl" />

      <div className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <Link
            to={INTERVIEW_ROUTES.resumeUpload}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to resume upload
          </Link>

          <div className="mt-3 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-500 text-white shadow-lg shadow-fuchsia-500/25">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                Analyze a Job Description
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Optional — paste a real job description to get a tailored interview plan, skill-gap
                breakdown, and preparation roadmap.
              </p>
            </div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {stage === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="space-y-6"
            >
              <JobDescriptionInput
                value={jobDescriptionText}
                onChange={(value) => {
                  setJobDescriptionText(value);
                  setSelectedSampleId(null);
                }}
                samples={samples}
                selectedSampleId={selectedSampleId}
                onSelectSample={handleSelectSample}
              />

              <div className="rounded-2xl border border-white/20 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:bg-white/5">
                <div className="text-sm font-semibold text-foreground">Interview Type</div>
                <div className="mt-3">
                  <InterviewTypeSelector value={interviewType} onChange={setInterviewType} />
                </div>
              </div>

              <div className="rounded-2xl border border-white/20 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:bg-white/5">
                <div className="text-sm font-semibold text-foreground">Company (optional)</div>
                <div className="mt-3">
                  <CompanySelector value={companyId} onChange={setCompanyId} />
                </div>
              </div>

              <div className="rounded-2xl border border-white/20 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:bg-white/5">
                <div className="text-sm font-semibold text-foreground">Role (optional)</div>
                <div className="mt-3">
                  <RoleSelector value={roleId} onChange={setRoleId} />
                </div>
              </div>

              <div className="rounded-2xl border border-white/20 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:bg-white/5">
                <div className="text-sm font-semibold text-foreground">
                  Difficulty Override (optional)
                </div>
                <div className="mt-3">
                  <DifficultySelector
                    value={difficultyOverride}
                    recommended={recommendedDifficulty}
                    onChange={setDifficultyOverride}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/10 pt-6">
                <button
                  type="button"
                  onClick={() => navigate({ to: INTERVIEW_ROUTES.setup })}
                  className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
                >
                  Skip for now
                </button>

                <GenerateInterviewButton disabled={!canGenerate} onGenerate={handleGenerate} />
              </div>
            </motion.div>
          )}

          {stage === "analyzing" && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <AnalysisProgress step={analysisStep} />
            </motion.div>
          )}

          {stage === "ready" && result && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="space-y-6"
            >
              <JobAnalysisSummary result={result} />

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <RequiredSkillsCard
                  jobDescription={result.jobDescription}
                  skillMatch={result.skillMatch}
                />
                <MissingSkillsCard skillMatch={result.skillMatch} />
                <InterviewFocusCard plan={result.plan} />
                <PreparationRoadmapCard roadmap={result.roadmap} />
              </div>

              <div className="flex items-center justify-between border-t border-white/10 pt-6">
                <button
                  type="button"
                  onClick={handleEdit}
                  className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
                >
                  Edit and re-analyze
                </button>

                <button
                  type="button"
                  onClick={handleContinue}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-500/20 transition hover:opacity-95"
                >
                  Continue to Setup
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
