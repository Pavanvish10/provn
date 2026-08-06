import { useState } from "react";
import { AnimatePresence } from "framer-motion";

import { adaptResumeAnalysis } from "@/ai/resume/ResumeAnalyzer";
import type { ResumeAnalysis } from "@/lib/resume.server";
import {
  useCurrentResume,
  useUploadResume,
  useDeleteResume,
  ACCEPTED_RESUME_MIME_TYPES,
} from "@/lib/resume-client";
import { useCurrentUser } from "@/lib/auth-client";

import { ResumeDropzone } from "@/components/interview/resume/ResumeDropzone";
import { ResumeValidation } from "@/components/interview/resume/ResumeValidation";
import { ResumeParsingStatus } from "@/components/interview/resume/ResumeParsingStatus";
import { ResumePreview } from "@/components/interview/resume/ResumePreview";
import { ResumeSummary } from "@/components/interview/resume/ResumeSummary";
import { ResumeErrorCard } from "@/components/interview/resume/ResumeErrorCard";

// Sprint 13: this used to drive System A (ResumeParserService — local,
// PDF/DOCX text always faked with a hardcoded sample). It now drives the
// same real, DB-persisted Gemini pipeline (`resume-client.ts`/
// `resume.server.ts`) System B's Profile page already uses, so a resume
// uploaded here is the same real analysis, not a second parallel copy.
// The upload+analyze round trip is one real network call with no
// intermediate progress signal, so unlike System A's old fake byte-level
// progress bar, this shows one honest "working on it" state throughout.

type UploaderStage = "idle" | "parsing" | "ready" | "error";

const MIME_TO_LABEL: Record<string, string> = {
  "application/pdf": "PDF",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
};

export function ResumeUploader() {
  const { data: user } = useCurrentUser();
  const { data: resume } = useCurrentResume(user?.id);
  const uploadResume = useUploadResume(user?.id);
  const deleteResume = useDeleteResume(user?.id);

  const [stage, setStage] = useState<UploaderStage>("idle");
  const [filename, setFilename] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const effectiveStage: UploaderStage = resume && stage === "idle" ? "ready" : stage;

  async function handleFileSelected(file: File) {
    if (!ACCEPTED_RESUME_MIME_TYPES.has(file.type)) {
      setErrorMessage("Unsupported file type. Please upload a PDF, DOC, or DOCX file.");
      setStage("error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("File is too large. Maximum size is 10MB.");
      setStage("error");
      return;
    }

    setFilename(file.name);
    setStage("parsing");

    try {
      const { analysisError } = await uploadResume.mutateAsync(file);
      if (analysisError) {
        setErrorMessage(analysisError);
        setStage("error");
        return;
      }
      setStage("ready");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong while processing this file.",
      );
      setStage("error");
    }
  }

  function handleReplace() {
    setStage("idle");
  }

  async function handleDelete() {
    if (!resume) return;
    await deleteResume.mutateAsync(resume);
    setStage("idle");
  }

  const profile = resume?.analysis
    ? adaptResumeAnalysis(resume.analysis as unknown as ResumeAnalysis)
    : null;

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {effectiveStage === "idle" && (
          <div key="idle" className="space-y-4">
            <ResumeDropzone onFileSelected={handleFileSelected} />
            <ResumeValidation />
          </div>
        )}

        {effectiveStage === "parsing" && <ResumeParsingStatus key="parsing" stage="reading" />}

        {effectiveStage === "ready" && resume && (
          <div key="ready" className="space-y-4">
            <ResumePreview
              filename={resume.file_name ?? filename}
              sizeBytes={resume.file_size ?? 0}
              sourceFormat={MIME_TO_LABEL[resume.mime_type ?? ""] ?? "PDF"}
              uploadedAt={new Date(resume.created_at ?? Date.now()).getTime()}
              onReplace={handleReplace}
              onDelete={handleDelete}
            />
            {profile ? (
              <ResumeSummary profile={profile} isMockExtraction={false} />
            ) : (
              <div className="rounded-2xl border border-white/20 bg-white/60 p-6 text-sm text-muted-foreground shadow-sm backdrop-blur-xl dark:bg-white/5">
                Analysis in progress — check back in a moment.
              </div>
            )}
          </div>
        )}

        {effectiveStage === "error" && (
          <ResumeErrorCard key="error" message={errorMessage} onRetry={() => setStage("idle")} />
        )}
      </AnimatePresence>
    </div>
  );
}
