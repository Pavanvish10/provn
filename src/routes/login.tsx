import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { ArrowRight, Loader2 } from "lucide-react";

import { Wordmark } from "@/components/Logo";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { AuthBrandPanel, GoogleGlyph } from "@/components/AuthBrandPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInFn } from "@/lib/auth.server";
import { invalidateCurrentUser } from "@/lib/auth-client";
import { requireGuest } from "@/lib/auth-guard";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: searchSchema,
  beforeLoad: requireGuest,
  head: () => ({
    meta: [
      { title: "Log in · Provn" },
      { name: "description", content: "Log in to Provn to keep proving your skills." },
    ],
  }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const search = Route.useSearch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emailValid = z.string().email().safeParse(email).success;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!emailValid) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await signInFn({ data: { email, password } });
      if (result.error) {
        setError(result.error);
        return;
      }
      await invalidateCurrentUser(queryClient);
      await router.invalidate();
      nav({ to: search.redirect || "/home" });
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogle = async () => {
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) setError(oauthError.message);
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
            <h1 className="font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl">
              Welcome back
            </h1>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              Log in to keep proving what you can actually do.
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-3">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full justify-center gap-2 border-border bg-card text-foreground hover:bg-muted"
                onClick={onGoogle}
              >
                <GoogleGlyph /> Continue with Google
              </Button>

              <div className="flex items-center gap-3 py-1 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" /> or{" "}
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                <div>
                  <Label htmlFor="email" className="text-xs text-muted-foreground">
                    Email address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@college.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 h-11"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs text-muted-foreground">
                      Password
                    </Label>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                      Log in <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>

              <p className="pt-1 text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link
                  to="/signup"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Sign up
                </Link>
              </p>
              <p className="text-center text-sm text-muted-foreground">
                Hiring?{" "}
                <Link
                  to="/business-signup"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Register your company
                </Link>
              </p>
            </form>
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
