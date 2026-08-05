import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";

import type { ResumeProfile } from "@/ai/resume/ResumeAnalyzer";
import { ResumeParserService } from "@/services/resume/ResumeParserService";
import { ResumeValidationService } from "@/services/resume/ResumeValidationService";
import {
  ResumeStorageService,
  type StoredResumeMeta,
} from "@/services/resume/ResumeStorageService";

import { ResumeDropzone } from "@/components/interview/resume/ResumeDropzone";
import { ResumeValidation } from "@/components/interview/resume/ResumeValidation";
import { UploadProgress } from "@/components/interview/resume/UploadProgress";
import {
  ResumeParsingStatus,
  type ParsingStage,
} from "@/components/interview/resume/ResumeParsingStatus";
import { ResumePreview } from "@/components/interview/resume/ResumePreview";
import { ResumeSummary } from "@/components/interview/resume/ResumeSummary";
import { ResumeErrorCard } from "@/components/interview/resume/ResumeErrorCard";

// The orchestrator: owns the upload/parse state machine and wires the
// four resume services together. Every other component in this folder is
// purely presentational and only knows about the slice of state it renders.

type UploaderStage = "idle" | "uploading" | "parsing" | "ready" | "error";

interface ReadyResume {
  meta: StoredResumeMeta;
  profile: ResumeProfile;
}

export interface ResumeUploaderProps {
  onParsed?: (result: ReadyResume) => void;
  onDeleted?: () => void;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function ResumeUploader({ onParsed, onDeleted }: ResumeUploaderProps) {
  const parserRef = useRef(new ResumeParserService());

  const [stage, setStage] = useState<UploaderStage>("idle");
  const [filename, setFilename] = useState("");
  const [progress, setProgress] = useState(0);
  const [parsingStage, setParsingStage] = useState<ParsingStage>("reading");
  const [errorMessage, setErrorMessage] = useState("");
  const [resume, setResume] = useState<ReadyResume | null>(null);

  useEffect(() => {
    const stored = ResumeStorageService.load();
    if (stored) {
      setResume(stored);
      setFilename(stored.meta.filename);
      setStage("ready");
    }
  }, []);

  async function handleFileSelected(file: File) {
    const validation = ResumeValidationService.validate(file);
    if (!validation.valid) {
      setErrorMessage(validation.errors[0]);
      setStage("error");
      return;
    }

    setFilename(file.name);
    setProgress(0);
    setStage("uploading");

    try {
      const parsed = await parserRef.current.parseFile(file, (event) => {
        setProgress(event.percent);
      });

      setStage("parsing");
      setParsingStage("extracting");
      await wait(350);
      setParsingStage("analyzing");
      await wait(350);

      const meta = ResumeStorageService.save(parsed, file.size);
      const ready: ReadyResume = { meta, profile: parsed.profile };
      setResume(ready);
      setStage("ready");
      onParsed?.(ready);
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

  function handleDelete() {
    ResumeStorageService.clear();
    setResume(null);
    setFilename("");
    setStage("idle");
    onDeleted?.();
  }

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {stage === "idle" && (
          <div key="idle" className="space-y-4">
            <ResumeDropzone onFileSelected={handleFileSelected} />
            <ResumeValidation />
          </div>
        )}

        {stage === "uploading" && (
          <UploadProgress key="uploading" filename={filename} percent={progress} />
        )}

        {stage === "parsing" && <ResumeParsingStatus key="parsing" stage={parsingStage} />}

        {stage === "ready" && resume && (
          <div key="ready" className="space-y-4">
            <ResumePreview
              filename={resume.meta.filename}
              sizeBytes={resume.meta.sizeBytes}
              sourceFormat={resume.meta.sourceFormat}
              uploadedAt={resume.meta.uploadedAt}
              onReplace={handleReplace}
              onDelete={handleDelete}
            />
            <ResumeSummary
              profile={resume.profile}
              isMockExtraction={resume.meta.isMockExtraction}
            />
          </div>
        )}

        {stage === "error" && (
          <ResumeErrorCard key="error" message={errorMessage} onRetry={() => setStage("idle")} />
        )}
      </AnimatePresence>
    </div>
  );
}
