import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { HeartHandshake, Mic, Sparkles } from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { MockInterviewDialog } from "@/components/MockInterviewDialog";
import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { useProfile } from "@/lib/profile-client";

export const Route = createFileRoute("/interview-practice")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Soft-Skills Interview Practice · Provn" },
      {
        name: "description",
        content:
          "Practice behavioral and soft-skills interview questions with an AI interviewer — communication, teamwork, leadership, and more.",
      },
      { property: "og:title", content: "Soft-Skills Interview Practice · Provn" },
      {
        property: "og:description",
        content: "Practice makes confident — no pressure, no score that counts.",
      },
    ],
  }),
  component: InterviewPractice,
});

function InterviewPractice() {
  const { data: user } = useCurrentUser();
  const { data: profile } = useProfile(user?.id);
  const [open, setOpen] = useState(false);

  return (
    <AppShell>
      <header className="mb-8">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <HeartHandshake className="h-5 w-5" />
        </div>
        <h1 className="mt-3 font-display text-3xl tracking-tight">
          Soft-skills interview practice
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          A behavioral, turn-based practice interview — communication, teamwork, conflict
          resolution, leadership, and adaptability. Purely for practice: it never counts toward the
          mock interview verification on the Apply page.
        </p>
      </header>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-brand" /> How it works
        </div>
        <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          <li>Tell the AI interviewer the role you're targeting.</li>
          <li>Answer a handful of behavioral questions, one at a time, in your own words.</li>
          <li>Get a score plus concrete strengths and areas to improve — repeat any time.</li>
        </ul>
        <Button className="mt-5" onClick={() => setOpen(true)}>
          <Mic className="mr-2 h-4 w-4" /> Start practice interview
        </Button>
      </div>

      <MockInterviewDialog
        open={open}
        onOpenChange={setOpen}
        defaultRole={profile?.target_role ?? "Software Engineer"}
        mode="soft_skills"
        onFinished={() => {}}
      />
    </AppShell>
  );
}
