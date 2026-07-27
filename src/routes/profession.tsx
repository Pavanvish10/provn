import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  GraduationCap,
  Sparkles,
  Rocket,
  Briefcase,
  Handshake,
  PenTool,
  RefreshCcw,
  MoreHorizontal,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { Wordmark } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { useUpdateProfile } from "@/lib/profile-client";

const OPTIONS = [
  { id: "student", label: "Student", sub: "Currently in college", icon: GraduationCap },
  { id: "fresh", label: "Fresh Graduate", sub: "0–1 yr experience", icon: Sparkles },
  { id: "founder", label: "Founder", sub: "Building something new", icon: Rocket },
  { id: "sales", label: "Salesperson", sub: "B2B / B2C sales", icon: Handshake },
  { id: "pro", label: "Working Professional", sub: "1+ yr experience", icon: Briefcase },
  { id: "designer", label: "Designer", sub: "Product / UI / UX", icon: PenTool },
  { id: "switcher", label: "Job Switcher", sub: "Actively interviewing", icon: RefreshCcw },
  { id: "other", label: "Other", sub: "Tell us later", icon: MoreHorizontal },
];

export const Route = createFileRoute("/profession")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "What best describes you? · Provn" },
      {
        name: "description",
        content: "Pick the option that fits — Provn tailors your journey from here.",
      },
      { property: "og:title", content: "What best describes you? · Provn" },
      { property: "og:description", content: "Your starting point shapes the whole roadmap." },
    ],
  }),
  component: Profession,
});

function Profession() {
  const nav = useNavigate();
  const { data: user } = useCurrentUser();
  const updateProfile = useUpdateProfile(user?.id);
  const [sel, setSel] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link to="/">
          <Wordmark />
        </Link>
        <DarkModeToggle />
      </div>
      <div className="mx-auto max-w-5xl px-6 pb-16">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Step 3 of 6 · You
        </span>
        <h1 className="mt-5 font-display text-5xl leading-tight tracking-tight sm:text-6xl">
          What best describes you?
        </h1>
        <p className="mt-3 max-w-lg text-sm text-muted-foreground">
          Pick one. We use it to tune your roadmap, mock interviews, and job matches.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {OPTIONS.map(({ id, label, sub, icon: Icon }) => {
            const active = sel === id;
            return (
              <button
                key={id}
                onClick={() => setSel(id)}
                className={cn(
                  "group relative flex flex-col items-start gap-4 rounded-xl border p-5 text-left transition",
                  active
                    ? "border-brand bg-brand-soft shadow-sm"
                    : "border-border bg-card hover:border-foreground/20 hover:bg-muted",
                )}
              >
                <div
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-lg transition",
                    active ? "bg-brand text-brand-foreground" : "bg-muted text-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium">{label}</div>
                  <div className="text-xs text-muted-foreground">{sub}</div>
                </div>
                {active && (
                  <span className="absolute right-3 top-3 rounded-full bg-brand px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-brand-foreground">
                    Selected
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-10 flex items-center gap-3">
          <Button variant="ghost" onClick={() => nav({ to: "/location" })}>
            Back
          </Button>
          <Button
            size="lg"
            disabled={!sel || submitting}
            className="ml-auto"
            onClick={async () => {
              setSubmitting(true);
              try {
                await updateProfile.mutateAsync({ persona: sel! });
                nav({ to: "/profile-details" });
              } finally {
                setSubmitting(false);
              }
            }}
          >
            Continue <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
