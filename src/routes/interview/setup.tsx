import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  Code2,
  FileUp,
  Rocket,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

import { InterviewTypeCard } from "@/components/interview/InterviewTypeCard";
import { CompanySelector } from "@/components/interview/CompanySelector";
import { RoleSelector } from "@/components/interview/RoleSelector";
import { DifficultySelector } from "@/components/interview/DifficultySelector";
import { DurationSelector } from "@/components/interview/DurationSelector";
import { LanguageSelector } from "@/components/interview/LanguageSelector";
import { VoiceSelector } from "@/components/interview/VoiceSelector";
import { SetupSummary } from "@/components/interview/SetupSummary";
import { StartInterviewButton } from "@/components/interview/StartInterviewButton";
import { cn } from "@/lib/utils";
import { InterviewFlowController } from "@/store/InterviewFlowController";
import { INTERVIEW_ROUTES } from "@/store/InterviewNavigation";
import { useInterviewSession } from "@/store/InterviewSessionStore";
import type { JobAnalysisResult } from "@/services/job/JobAnalysisEngine";
import { requireAuth } from "@/lib/auth-guard";

export const Route = createFileRoute("/interview/setup")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Interview Setup · Provn" },
      {
        name: "description",
        content: "Configure your AI interview — type, company, role, difficulty, and more.",
      },
    ],
  }),
  component: InterviewSetupPage,
});

interface InterviewType {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
}

const INTERVIEW_TYPES: InterviewType[] = [
  {
    id: "HR",
    label: "HR Interview",
    description: "Behavioral and culture-fit questions.",
    icon: Users,
    gradient: "from-emerald-500 to-teal-400",
  },
  {
    id: "Technical",
    label: "Technical",
    description: "Coding, systems, and problem solving.",
    icon: Code2,
    gradient: "from-blue-500 to-indigo-500",
  },
  {
    id: "Startup",
    label: "Startup",
    description: "Fast-paced, ownership-driven rounds.",
    icon: Rocket,
    gradient: "from-orange-500 to-amber-400",
  },
  {
    id: "FAANG",
    label: "FAANG",
    description: "Big tech, bar-raiser style rounds.",
    icon: Building2,
    gradient: "from-violet-500 to-purple-500",
  },
  {
    id: "Manager",
    label: "Manager",
    description: "Leadership and people-management focus.",
    icon: Briefcase,
    gradient: "from-fuchsia-500 to-pink-500",
  },
];

const STEPS = [
  { id: 1, label: "Type" },
  { id: 2, label: "Company" },
  { id: 3, label: "Role" },
  { id: 4, label: "Difficulty" },
  { id: 5, label: "Duration" },
  { id: 6, label: "Language" },
  { id: 7, label: "Voice" },
] as const;

const STEP_COPY: Record<number, { title: string; description: string }> = {
  1: {
    title: "Choose Interview Type",
    description: "What kind of interview do you want to practice?",
  },
  2: { title: "Choose Company", description: "Pick a company to tailor the interview style." },
  3: { title: "Choose Role", description: "Select the role you're preparing for." },
  4: { title: "Difficulty", description: "How challenging should the questions be?" },
  5: { title: "Duration", description: "How long should the session run?" },
  6: { title: "Language", description: "Pick the language for your interview." },
  7: { title: "AI Voice", description: "Choose your AI interviewer's voice." },
};

interface SetupState {
  interviewType: string | null;
  company: string | null;
  role: string | null;
  difficulty: string | null;
  duration: number | null;
  language: string | null;
  voice: string | null;
}

const INITIAL_STATE: SetupState = {
  interviewType: null,
  company: null,
  role: null,
  difficulty: null,
  duration: null,
  language: null,
  voice: null,
};

// The Job Description page (Sprint 12) speaks in its own vocabulary
// ("Managerial", lowercase difficulty levels) — these translate its
// output into the exact string values this wizard's selectors compare
// against, so a job analysis carries forward as real pre-filled
// selections instead of just inert session-store data.
function mapAnalyzedInterviewType(label: string): string {
  return label === "Managerial" ? "Manager" : label;
}

function capitalizeDifficulty(level: string): string {
  return level.charAt(0).toUpperCase() + level.slice(1);
}

function buildInitialSetup(jobAnalysis: JobAnalysisResult | null): SetupState {
  if (!jobAnalysis) return INITIAL_STATE;
  return {
    ...INITIAL_STATE,
    interviewType: mapAnalyzedInterviewType(jobAnalysis.interviewType),
    company: jobAnalysis.company?.name ?? null,
    role: jobAnalysis.role?.label ?? null,
    difficulty: capitalizeDifficulty(jobAnalysis.plan.difficulty),
  };
}

function InterviewSetupPage() {
  const navigate = useNavigate();
  const { jobAnalysis } = useInterviewSession();
  const [step, setStep] = useState(1);
  const [setup, setSetup] = useState<SetupState>(() => buildInitialSetup(jobAnalysis));

  const canContinue = useMemo(() => {
    switch (step) {
      case 1:
        return !!setup.interviewType;
      case 2:
        return !!setup.company;
      case 3:
        return !!setup.role;
      case 4:
        return !!setup.difficulty;
      case 5:
        return !!setup.duration;
      case 6:
        return !!setup.language;
      case 7:
        return !!setup.voice;
      default:
        return false;
    }
  }, [step, setup]);

  const isLastStep = step === STEPS.length;
  const copy = STEP_COPY[step];

  function goBack() {
    setStep((current) => Math.max(1, current - 1));
  }

  function goNext() {
    if (!canContinue) return;
    setStep((current) => Math.min(STEPS.length, current + 1));
  }

  function handleStart() {
    if (
      !setup.interviewType ||
      !setup.role ||
      !setup.difficulty ||
      !setup.duration ||
      !setup.language ||
      !setup.voice
    ) {
      return;
    }
    InterviewFlowController.startInterview({
      interviewType: setup.interviewType,
      company: setup.company,
      role: setup.role,
      difficulty: setup.difficulty,
      duration: setup.duration,
      language: setup.language,
      voice: setup.voice,
    });
    navigate({ to: INTERVIEW_ROUTES.deviceCheck });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-violet-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/40">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-64 h-96 w-96 rounded-full bg-fuchsia-400/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 flex flex-wrap items-center justify-between gap-4"
        >
          <div>
            <Link
              to="/interview"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to dashboard
            </Link>
            <h1 className="mt-2 font-display text-2xl font-bold text-foreground sm:text-3xl">
              Set Up Your Interview
            </h1>
            <Link
              to="/interview/resume-upload"
              className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 transition hover:underline dark:text-violet-400"
            >
              <FileUp className="h-3.5 w-3.5" />
              Upload your resume for a personalized interview
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {STEPS.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                    s.id === step
                      ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/30"
                      : s.id < step
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-black/5 text-muted-foreground dark:bg-white/10",
                  )}
                >
                  {s.id < step ? <Check className="h-3.5 w-3.5" /> : s.id}
                </div>
                {s.id !== STEPS.length && (
                  <div
                    className={cn(
                      "h-0.5 w-4 rounded-full sm:w-6",
                      s.id < step ? "bg-emerald-500/40" : "bg-black/10 dark:bg-white/10",
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {jobAnalysis && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-6 rounded-2xl border border-violet-400/30 bg-violet-500/5 p-4 backdrop-blur-xl sm:p-5"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              Pre-filled from your job description analysis
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Interview type, company, role, and difficulty below were carried over from your{" "}
              {jobAnalysis.role?.label ?? "role"} analysis
              {jobAnalysis.company ? ` at ${jobAnalysis.company.name}` : ""}. Change anything you
              like — nothing here is locked in.
            </p>
            {(jobAnalysis.plan.focusAreas.length > 0 ||
              jobAnalysis.plan.technicalTopics.length > 0) && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(jobAnalysis.plan.focusAreas.length > 0
                  ? jobAnalysis.plan.focusAreas
                  : jobAnalysis.plan.technicalTopics
                )
                  .slice(0, 6)
                  .map((topic) => (
                    <span
                      key={topic}
                      className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-600 dark:text-violet-400"
                    >
                      {topic}
                    </span>
                  ))}
              </div>
            )}
          </motion.div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-white/20 bg-white/60 p-5 shadow-sm backdrop-blur-xl dark:bg-white/5 sm:p-6">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">
                Step {step} of {STEPS.length}
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">{copy.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>

              <div className="mt-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    {step === 1 && (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {INTERVIEW_TYPES.map((type) => (
                          <InterviewTypeCard
                            key={type.id}
                            label={type.label}
                            description={type.description}
                            icon={type.icon}
                            gradient={type.gradient}
                            selected={setup.interviewType === type.id}
                            onSelect={() =>
                              setSetup((current) => ({ ...current, interviewType: type.id }))
                            }
                          />
                        ))}
                      </div>
                    )}

                    {step === 2 && (
                      <CompanySelector
                        value={setup.company}
                        onChange={(company) => setSetup((current) => ({ ...current, company }))}
                      />
                    )}

                    {step === 3 && (
                      <RoleSelector
                        value={setup.role}
                        onChange={(role) => setSetup((current) => ({ ...current, role }))}
                      />
                    )}

                    {step === 4 && (
                      <DifficultySelector
                        value={setup.difficulty}
                        onChange={(difficulty) =>
                          setSetup((current) => ({ ...current, difficulty }))
                        }
                      />
                    )}

                    {step === 5 && (
                      <DurationSelector
                        value={setup.duration}
                        onChange={(duration) => setSetup((current) => ({ ...current, duration }))}
                      />
                    )}

                    {step === 6 && (
                      <LanguageSelector
                        value={setup.language}
                        onChange={(language) => setSetup((current) => ({ ...current, language }))}
                      />
                    )}

                    {step === 7 && (
                      <VoiceSelector
                        value={setup.voice}
                        onChange={(voice) => setSetup((current) => ({ ...current, voice }))}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-6">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={step === 1}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/50 px-5 py-2.5 text-sm font-medium text-foreground shadow-sm backdrop-blur-md transition hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>

                {isLastStep ? (
                  <StartInterviewButton disabled={!canContinue} onStart={handleStart} />
                ) : (
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={!canContinue}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-6 py-2.5 text-sm font-semibold shadow-md transition",
                      canContinue
                        ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-violet-500/25 hover:opacity-95"
                        : "cursor-not-allowed bg-muted text-muted-foreground shadow-none",
                    )}
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <SetupSummary data={setup} />
          </div>
        </div>
      </div>
    </div>
  );
}
