import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { ArrowRight, Loader2, MailCheck } from "lucide-react";

import { Wordmark } from "@/components/Logo";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { AuthBrandPanel, GoogleGlyph } from "@/components/AuthBrandPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpFn } from "@/lib/auth.server";
import { invalidateCurrentUser } from "@/lib/auth-client";
import { requireGuest } from "@/lib/auth-guard";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export const Route = createFileRoute("/signup")({
  beforeLoad: requireGuest,
  head: () => ({
    meta: [
      { title: "Sign up · Provn" },
      { name: "description", content: "Create a Provn account and start proving your skills." },
    ],
  }),
  component: Signup,
});

function Signup() {
  const nav = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Enter your name.");
      return;
    }
    if (!z.string().email().safeParse(email).success) {
      setError("Enter a valid email address.");
      return;
    }
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
      const result = await signUpFn({
        data: {
          email,
          password,
          fullName,
          // Not /auth/callback: admin.generateLink() (used server-side to
          // build the confirmation email) can only produce implicit-flow
          // links with tokens in the URL hash, never a PKCE `code` — the
          // only thing /auth/callback knows how to consume. Landing on
          // /login directly avoids a pointless bounce through a route that
          // can never handle this link shape.
          redirectTo: `${window.location.origin}/login`,
        },
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.needsEmailConfirmation) {
        setCheckEmail(true);
        return;
      }
      await invalidateCurrentUser(queryClient);
      await router.invalidate();
      nav({ to: "/home" });
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogle = async () => {
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const redirectTo = `${window.location.origin}/auth/callback`;
    const provider = "google";

    // skipBrowserRedirect lets us inspect the generated URL before the browser
    // navigates away. Note this is Supabase's own /auth/v1/authorize endpoint —
    // Supabase's server then 302s the browser on to Google using a *fixed*
    // redirect_uri (`${VITE_SUPABASE_URL}/auth/v1/callback`) that this app
    // never constructs and can't override; that's the value Google's
    // "Authorized redirect URIs" must match exactly.
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });

    if (oauthError) {
      setError(oauthError.message);
      return;
    }
    if (data?.url) window.location.href = data.url;
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
            {checkEmail ? (
              <div className="rounded-xl border border-border bg-card p-6 text-center">
                <MailCheck className="mx-auto h-10 w-10 text-brand" />
                <h1 className="mt-4 font-display text-2xl tracking-tight">Check your email</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  We sent a confirmation link to <span className="text-foreground">{email}</span>.
                  Click it to activate your account, then log in.
                </p>
                <Button className="mt-6 w-full" onClick={() => nav({ to: "/login" })}>
                  Back to login
                </Button>
              </div>
            ) : (
              <>
                <h1 className="font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl">
                  Create your account
                </h1>
                <p className="mt-3 max-w-sm text-sm text-muted-foreground">
                  Sign up to start proving what you can actually do — beyond the résumé.
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
                      <Label htmlFor="fullName" className="text-xs text-muted-foreground">
                        Full name
                      </Label>
                      <Input
                        id="fullName"
                        autoComplete="name"
                        placeholder="Aarav Kulkarni"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="mt-1 h-11"
                      />
                    </div>
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
                      <Label htmlFor="password" className="text-xs text-muted-foreground">
                        Password
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 h-11"
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword" className="text-xs text-muted-foreground">
                        Confirm password
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
                          Sign up <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>

                  <p className="pt-1 text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link
                      to="/login"
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      Log in
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
