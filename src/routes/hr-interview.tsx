import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Keyboard, MessageCircle, Mic, Sparkles, Users } from "lucide-react";

import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { useCurrentResume } from "@/lib/resume-client";
import { useMyCareerRoadmap, useCareerRoadmapProgress } from "@/lib/career-roadmap-client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { InterviewTypeCard } from "@/components/interview/InterviewTypeCard";
import { CompanySelector } from "@/components/interview/CompanySelector";
import { RoleSelector } from "@/components/interview/RoleSelector";
import { DifficultySelector } from "@/components/interview/DifficultySelector";
import { DurationSelector } from "@/components/interview/DurationSelector";
import { LanguageSelector } from "@/components/interview/LanguageSelector";
import { VoiceSelector } from "@/components/interview/VoiceSelector";
import { InterviewFlowController } from "@/store/InterviewFlowController";
import { INTERVIEW_ROUTES } from "@/store/InterviewNavigation";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/hr-interview")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "HR Interview · Provn" },
      {
        name: "description",
        content:
          "A real AI-powered HR, behavioral, and managerial mock interview — grounded in your resume, roadmap progress, and past interview performance.",
      },
    ],
  }),
  component: HrInterviewPage,
});

const HR_TYPES = [
  {
    id: "HR",
    label: "HR Interview",
    description: "General fit, motivation, and culture questions.",
    icon: Users,
    gradient: "from-emerald-500 to-teal-400",
  },
  {
    id: "Behavioral",
    label: "Behavioral",
    description: "Past-experience, STAR-format questions.",
    icon: MessageCircle,
    gradient: "from-cyan-500 to-teal-400",
  },
  {
    id: "Manager",
    label: "Managerial",
    description: "Leadership and people-management focus.",
    icon: Briefcase,
    gradient: "from-fuchsia-500 to-pink-500",
  },
] as const;

function useLatestVoiceInterview(profileId: string | undefined) {
  return useQuery({
    queryKey: ["hr-interview-latest-session", profileId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("voice_interview_sessions")
        .select("interview_type, role, company, overall_score")
        .eq("profile_id", profileId!)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });
}

interface SetupState {
  interviewType: string | null;
  company: string | null;
  role: string | null;
  difficulty: string | null;
  duration: number | null;
  language: string | null;
  voice: string | null;
  mode: "voice" | "text";
}

const INITIAL_STATE: SetupState = {
  interviewType: "HR",
  company: null,
  role: null,
  difficulty: null,
  duration: null,
  language: null,
  voice: null,
  mode: "voice",
};

function HrInterviewPage() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const { data: resume } = useCurrentResume(user?.id);
  const { data: roadmap } = useMyCareerRoadmap(user?.id);
  const { data: progress } = useCareerRoadmapProgress(roadmap);
  const { data: lastSession } = useLatestVoiceInterview(user?.id);

  const [setup, setSetup] = useState<SetupState>(INITIAL_STATE);

  const canStart =
    !!setup.interviewType &&
    !!setup.role &&
    !!setup.difficulty &&
    !!setup.duration &&
    !!setup.language &&
    !!setup.voice;

  function handleStart() {
    if (!canStart) return;
    InterviewFlowController.startInterview({
      interviewType: setup.interviewType!,
      company: setup.company,
      role: setup.role!,
      difficulty: setup.difficulty!,
      duration: setup.duration!,
      language: setup.language!,
      voice: setup.voice!,
      mode: setup.mode,
    });
    navigate({ to: setup.mode === "text" ? INTERVIEW_ROUTES.room : INTERVIEW_ROUTES.deviceCheck });
  }

  const contextNotes: string[] = [];
  if (resume) contextNotes.push("your uploaded resume");
  if (progress) contextNotes.push(`your roadmap (${progress.percentage}% complete)`);
  if (lastSession)
    contextNotes.push(
      `your last ${lastSession.interview_type} interview (${lastSession.overall_score ?? "n/a"}/100)`,
    );

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-violet-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/40">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-64 h-96 w-96 rounded-full bg-fuchsia-400/20 blur-3xl" />

      <div className="relative mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          HR & Behavioral Interview
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A real AI-powered HR interviewer that evaluates communication, confidence, leadership,
          teamwork, adaptability, culture fit, and professionalism — the same way an experienced HR
          interviewer would.
        </p>

        {contextNotes.length > 0 && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-violet-400/30 bg-violet-500/5 p-4 text-xs text-muted-foreground backdrop-blur-xl">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-400" />
            <span>Grounded in {contextNotes.join(", ")}.</span>
          </div>
        )}

        <div className="mt-8 space-y-6">
          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Interview type</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {HR_TYPES.map((type) => (
                <InterviewTypeCard
                  key={type.id}
                  label={type.label}
                  description={type.description}
                  icon={type.icon}
                  gradient={type.gradient}
                  selected={setup.interviewType === type.id}
                  onSelect={() => setSetup((current) => ({ ...current, interviewType: type.id }))}
                />
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              Target company <span className="font-normal text-muted-foreground">(optional)</span>
            </h2>
            <CompanySelector
              value={setup.company}
              onChange={(company) => setSetup((current) => ({ ...current, company }))}
            />
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Target role</h2>
            <RoleSelector
              value={setup.role}
              onChange={(role) => setSetup((current) => ({ ...current, role }))}
            />
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Difficulty</h2>
            <DifficultySelector
              value={setup.difficulty}
              onChange={(difficulty) => setSetup((current) => ({ ...current, difficulty }))}
            />
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Duration</h2>
            <DurationSelector
              value={setup.duration}
              onChange={(duration) => setSetup((current) => ({ ...current, duration }))}
            />
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Language</h2>
            <LanguageSelector
              value={setup.language}
              onChange={(language) => setSetup((current) => ({ ...current, language }))}
            />
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">AI interviewer voice</h2>
            <VoiceSelector
              value={setup.voice}
              onChange={(voice) => setSetup((current) => ({ ...current, voice }))}
            />
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Interview mode</h2>
            <div className="inline-flex rounded-full border border-white/20 bg-white/60 p-1 backdrop-blur-xl dark:bg-white/5">
              <button
                type="button"
                onClick={() => setSetup((current) => ({ ...current, mode: "voice" }))}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                  setup.mode === "voice"
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Mic className="h-3.5 w-3.5" />
                Voice
              </button>
              <button
                type="button"
                onClick={() => setSetup((current) => ({ ...current, mode: "text" }))}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                  setup.mode === "text"
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Keyboard className="h-3.5 w-3.5" />
                Text
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStart}
            disabled={!canStart}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold shadow-md transition",
              canStart
                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-violet-500/25 hover:opacity-95"
                : "cursor-not-allowed bg-muted text-muted-foreground shadow-none",
            )}
          >
            <Sparkles className="h-4 w-4" />
            Start HR interview
          </button>
        </div>
      </div>
    </div>
  );
}
