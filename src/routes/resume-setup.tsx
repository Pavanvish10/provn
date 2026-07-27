import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowRight, FileText, Loader2, PenLine, SkipForward, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { Wordmark } from "@/components/Logo";
import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { useUploadResume } from "@/lib/resume-client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/resume-setup")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [{ title: "Your resume · Provn" }],
  }),
  component: ResumeSetup,
});

type Mode = "choose" | "uploading" | "done";

function ResumeSetup() {
  const nav = useNavigate();
  const { data: user } = useCurrentUser();
  const uploadResume = useUploadResume(user?.id);
  const fileInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("choose");
  const [error, setError] = useState<string | null>(null);
  const [analysisNote, setAnalysisNote] = useState<string | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF resume.");
      return;
    }
    setError(null);
    setMode("uploading");
    try {
      const { analysisError } = await uploadResume.mutateAsync(file);
      if (analysisError) setAnalysisNote(analysisError);
      setMode("done");
    } catch {
      setError("Upload failed. Try again.");
      setMode("choose");
    }
  };

  const finish = () => nav({ to: "/plan" });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link to="/">
          <Wordmark />
        </Link>
        <DarkModeToggle />
      </div>

      <div className="mx-auto max-w-2xl px-6 pb-16">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Step 5 of 6 · Resume
        </span>
        <h1 className="mt-5 font-display text-4xl leading-tight tracking-tight sm:text-5xl">
          Add your resume
        </h1>
        <p className="mt-3 max-w-lg text-sm text-muted-foreground">
          We'll store it permanently and run an AI ATS analysis. You can replace it anytime from
          your profile — we won't ask again.
        </p>

        {mode === "done" ? (
          <div className="mt-10 rounded-2xl border border-border bg-card p-8 text-center">
            <FileText className="mx-auto h-10 w-10 text-brand" />
            <h2 className="mt-4 font-display text-2xl">Resume saved</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {analysisNote
                ? analysisNote
                : "We're analyzing it now — your ATS score will appear on your profile shortly."}
            </p>
            <Button size="lg" className="mt-6 w-full" onClick={finish}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <OptionCard
              icon={Upload}
              title="Upload resume"
              copy="PDF, analyzed instantly"
              onClick={() => fileInput.current?.click()}
              busy={mode === "uploading"}
            />
            <OptionCard
              icon={PenLine}
              title="Build one here"
              copy="Fill in your profile instead"
              onClick={() => nav({ to: "/profile" })}
            />
            <OptionCard
              icon={SkipForward}
              title="Skip for now"
              copy="Add it later"
              onClick={finish}
            />
          </div>
        )}

        <input
          ref={fileInput}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={onFile}
        />
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        {mode !== "done" && (
          <div className="mt-8">
            <Button variant="ghost" onClick={() => nav({ to: "/profile-details" })}>
              Back
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function OptionCard({
  icon: Icon,
  title,
  copy,
  onClick,
  busy,
}: {
  icon: typeof Upload;
  title: string;
  copy: string;
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        "flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-5 text-left transition hover:border-foreground/20 hover:bg-muted",
        busy && "opacity-70",
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-soft text-brand">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
      </div>
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{copy}</div>
      </div>
    </button>
  );
}
