import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

import { Wordmark } from "@/components/Logo";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { AuthBrandPanel } from "@/components/AuthBrandPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exchangeCodeForSessionFn, updatePasswordFn } from "@/lib/auth.server";

const searchSchema = z.object({
  code: z.string().optional(),
});

export const Route = createFileRoute("/reset-password")({
  validateSearch: searchSchema,
  beforeLoad: async ({ search }) => {
    if (search.code) {
      const result = await exchangeCodeForSessionFn({ data: { code: search.code } });
      return { linkError: result.error };
    }
    return { linkError: null };
  },
  head: () => ({
    meta: [
      { title: "Set a new password · Provn" },
      { name: "description", content: "Choose a new password for your Provn account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const nav = useNavigate();
  const { linkError } = Route.useRouteContext();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await updatePasswordFn({ data: { password } });
      if (result.error) {
        setError(result.error);
        return;
      }
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="absolute right-5 top-5 z-20">
        <DarkModeToggle />
      </div>

      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative flex flex-col justify-between px-6 py-10 sm:px-12 lg:px-16 lg:py-16">
          <Link to="/" className="lg:hidden">
            <Wordmark />
          </Link>
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
            {done ? (
              <div className="rounded-xl border border-border bg-card p-6 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-brand" />
                <h1 className="mt-4 font-display text-2xl tracking-tight">Password updated</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your password has been changed. Log in with your new password.
                </p>
                <Button className="mt-6 w-full" onClick={() => nav({ to: "/login" })}>
                  Back to login
                </Button>
              </div>
            ) : linkError ? (
              <div className="rounded-xl border border-border bg-card p-6 text-center">
                <h1 className="font-display text-2xl tracking-tight">Link expired</h1>
                <p className="mt-2 text-sm text-muted-foreground">{linkError}</p>
                <Button asChild className="mt-6 w-full">
                  <Link to="/forgot-password">Request a new link</Link>
                </Button>
              </div>
            ) : (
              <>
                <h1 className="font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl">
                  Set a new password
                </h1>
                <p className="mt-3 max-w-sm text-sm text-muted-foreground">
                  Choose a new password for your account.
                </p>

                <form onSubmit={onSubmit} className="mt-8 space-y-3">
                  <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                    <div>
                      <Label htmlFor="password" className="text-xs text-muted-foreground">
                        New password
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        autoFocus
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 h-11"
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword" className="text-xs text-muted-foreground">
                        Confirm new password
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="mt-1 h-11"
                      />
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <Button
                      type="submit"
                      className="h-11 w-full justify-center gap-2"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Update password <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </>
            )}
          </div>

          <div className="mt-10 space-y-3 text-xs text-muted-foreground">
            <p>
              © {new Date().getFullYear()} Provn Labs · Made for people who'd rather build than
              talk.
            </p>
          </div>
        </section>

        <AuthBrandPanel />
      </div>
    </div>
  );
}
