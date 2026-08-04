import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ArrowRight, Loader2, KeyRound } from "lucide-react";

import { Wordmark } from "@/components/Logo";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { AuthBrandPanel, GoogleGlyph } from "@/components/AuthBrandPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { signInFn } from "@/lib/auth.server";
import { requestEmailOtpFn, verifyEmailOtpFn } from "@/lib/email-otp.server";
import { invalidateCurrentUser } from "@/lib/auth-client";
import { requireGuest } from "@/lib/auth-guard";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const RESEND_COOLDOWN_SECONDS = 60;

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

type Mode = "password" | "otp-email" | "otp-code";

function Login() {
  const nav = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const search = Route.useSearch();

  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [justConfirmed, setJustConfirmed] = useState(false);

  const emailValid = z.string().email().safeParse(email).success;

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // Signup confirmation links land here with an implicit-flow session in
  // the URL hash (see the redirectTo comment in signup.tsx / business-signup.tsx)
  // that this app's cookie-based SSR auth can't use — strip it immediately
  // so a live access token doesn't linger in the address bar or history,
  // and let the user know their email is confirmed.
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("access_token") && hash.includes("type=signup")) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      setJustConfirmed(true);
    }
  }, []);

  const finishSignIn = async () => {
    await invalidateCurrentUser(queryClient);
    await router.invalidate();
    nav({ to: search.redirect || "/home" });
  };

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
      await finishSignIn();
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

    console.log("[oauth] provider:", provider);
    console.log("[oauth] redirectTo:", redirectTo);
    console.log("[oauth] generated authorize URL:", data?.url);

    if (oauthError) {
      setError(oauthError.message);
      return;
    }
    if (data?.url) window.location.href = data.url;
  };

  const onSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!emailValid) {
      setError("Enter a valid email address.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await requestEmailOtpFn({ data: { email } });
      if (result.error) {
        setError(result.error);
        return;
      }
      setCode("");
      setMode("otp-code");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } finally {
      setSubmitting(false);
    }
  };

  const onVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (code.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await verifyEmailOtpFn({ data: { email, code } });
      if (result.error) {
        setError(result.error);
        return;
      }
      await finishSignIn();
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
            <h1 className="font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl">
              Welcome back
            </h1>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              Log in to keep proving what you can actually do.
            </p>

            {justConfirmed && (
              <p className="mt-4 rounded-lg border border-brand/30 bg-brand/10 px-3 py-2 text-sm text-foreground">
                Email confirmed. Log in below to continue.
              </p>
            )}

            {mode === "password" && (
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

                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10 w-full justify-center gap-2 text-muted-foreground"
                    onClick={() => {
                      setError(null);
                      setMode("otp-email");
                    }}
                  >
                    <KeyRound className="h-4 w-4" /> Sign in with a code instead
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
            )}

            {mode === "otp-email" && (
              <form onSubmit={onSendCode} className="mt-8 space-y-3">
                <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                  <div>
                    <Label htmlFor="otp-email" className="text-xs text-muted-foreground">
                      Email address
                    </Label>
                    <Input
                      id="otp-email"
                      type="email"
                      autoFocus
                      autoComplete="email"
                      placeholder="you@college.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 h-11"
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      We'll email you a 6-digit code — no password needed.
                    </p>
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
                        Send code <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 w-full justify-center text-muted-foreground"
                  onClick={() => {
                    setError(null);
                    setMode("password");
                  }}
                >
                  Use password instead
                </Button>
              </form>
            )}

            {mode === "otp-code" && (
              <form onSubmit={onVerifyCode} className="mt-8 space-y-3">
                <div className="space-y-4 rounded-xl border border-border bg-card p-4">
                  <div>
                    <p className="text-sm">
                      Enter the code we sent to{" "}
                      <span className="font-medium text-foreground">{email}</span>
                    </p>
                  </div>

                  <InputOTP maxLength={6} value={code} onChange={setCode}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <Button
                    type="submit"
                    className="h-11 w-full justify-center gap-2"
                    disabled={submitting || code.length !== 6}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Verify & sign in <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 w-full justify-center text-xs text-muted-foreground"
                    disabled={cooldown > 0 || submitting}
                    onClick={onSendCode}
                  >
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 w-full justify-center text-muted-foreground"
                  onClick={() => {
                    setError(null);
                    setCode("");
                    setMode("otp-email");
                  }}
                >
                  Use a different email
                </Button>
              </form>
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
