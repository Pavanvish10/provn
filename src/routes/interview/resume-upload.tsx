import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

import { ResumeUploader } from "@/components/interview/resume/ResumeUploader";
import { INTERVIEW_ROUTES } from "@/store/InterviewNavigation";
import { requireAuth } from "@/lib/auth-guard";

export const Route = createFileRoute("/interview/resume-upload")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Upload Your Resume · Provn" },
      {
        name: "description",
        content:
          "Upload your resume so your AI interview can ask questions grounded in your real experience.",
      },
    ],
  }),
  component: ResumeUploadPage,
});

function ResumeUploadPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-violet-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/40">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-64 h-96 w-96 rounded-full bg-fuchsia-400/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl" />

      <div className="relative mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <Link
            to={INTERVIEW_ROUTES.setup}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to setup
          </Link>

          <div className="mt-3 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-500 text-white shadow-lg shadow-fuchsia-500/25">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                Upload Your Resume
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Optional — your AI interviewer will ground its questions in your real projects and
                skills instead of generic ones.
              </p>
            </div>
          </div>
        </motion.div>

        <ResumeUploader />

        <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-6">
          <button
            type="button"
            onClick={() => navigate({ to: INTERVIEW_ROUTES.jobDescription })}
            className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            Skip for now
          </button>

          <button
            type="button"
            onClick={() => navigate({ to: INTERVIEW_ROUTES.jobDescription })}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-500/20 transition hover:opacity-95"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
