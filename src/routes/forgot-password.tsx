import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { ArrowRight, Loader2, MailCheck } from "lucide-react";

import { Wordmark } from "@/components/Logo";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { AuthBrandPanel } from "@/components/AuthBrandPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordResetFn } from "@/lib/auth.server";
import { requireGuest } from "@/lib/auth-guard";

export const Route = createFileRoute("/forgot-password")({
  beforeLoad: requireGuest,
  head: () => ({
    meta: [
      { title: "Forgot password · Provn" },
      { name: "description", content: "Reset your Provn account password." },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!z.string().email().safeParse(email).success) {
      setError("Enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await requestPasswordResetFn({
        data: { email, redirectTo: `${window.location.origin}/reset-password` },
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSent(true);
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
            {sent ? (
              <div className="rounded-xl border border-border bg-card p-6 text-center">
                <MailCheck className="mx-auto h-10 w-10 text-brand" />
                <h1 className="mt-4 font-display text-2xl tracking-tight">Check your email</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  If an account exists for <span className="text-foreground">{email}</span>, we've
                  sent a link to reset your password.
                </p>
                <Button asChild className="mt-6 w-full">
                  <Link to="/login">Back to login</Link>
                </Button>
              </div>
            ) : (
              <>
                <h1 className="font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl">
                  Reset your password
                </h1>
                <p className="mt-3 max-w-sm text-sm text-muted-foreground">
                  Enter the email on your account and we'll send you a reset link.
                </p>

                <form onSubmit={onSubmit} className="mt-8 space-y-3">
                  <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                    <div>
                      <Label htmlFor="email" className="text-xs text-muted-foreground">
                        Email address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        autoFocus
                        autoComplete="email"
                        placeholder="you@college.edu"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
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
                          Send reset link <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>

                  <p className="pt-1 text-center text-sm text-muted-foreground">
                    Remembered it?{" "}
                    <Link
                      to="/login"
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      Back to login
                    </Link>
                  </p>
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
