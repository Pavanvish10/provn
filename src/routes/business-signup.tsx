import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { ArrowRight, Loader2, MailCheck } from "lucide-react";

import { Wordmark } from "@/components/Logo";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { AuthBrandPanel } from "@/components/AuthBrandPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { businessSignUpFn } from "@/lib/auth.server";
import { requireGuest } from "@/lib/auth-guard";

export const Route = createFileRoute("/business-signup")({
  beforeLoad: requireGuest,
  head: () => ({
    meta: [
      { title: "Register your company · Provn" },
      {
        name: "description",
        content: "Create a Provn Business account to post jobs and hire verified talent.",
      },
    ],
  }),
  component: BusinessSignup,
});

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

function BusinessSignup() {
  const nav = useNavigate();

  const [companyName, setCompanyName] = useState("");
  const [hrName, setHrName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [headquarters, setHeadquarters] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!companyName.trim()) return setError("Enter your company name.");
    if (!hrName.trim()) return setError("Enter your name.");
    if (!z.string().email().safeParse(email).success)
      return setError("Enter a valid work email address.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");

    setSubmitting(true);
    try {
      const result = await businessSignUpFn({
        data: {
          email,
          password,
          hrName,
          company: {
            companyName,
            website: website || undefined,
            description: description || undefined,
            industry: industry || undefined,
            companySize: companySize || undefined,
            headquarters: headquarters || undefined,
            linkedinUrl: linkedinUrl || undefined,
          },
        },
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setCheckEmail(true);
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
          <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center">
            {checkEmail ? (
              <div className="rounded-xl border border-border bg-card p-6 text-center">
                <MailCheck className="mx-auto h-10 w-10 text-brand" />
                <h1 className="mt-4 font-display text-2xl tracking-tight">Check your work email</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  We sent a confirmation link to <span className="text-foreground">{email}</span>.
                  Click it to verify your account, then log in to finish setting up {companyName}'s
                  profile.
                </p>
                <Button className="mt-6 w-full" onClick={() => nav({ to: "/login" })}>
                  Back to login
                </Button>
              </div>
            ) : (
              <>
                <h1 className="font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl">
                  Hire verified talent.
                </h1>
                <p className="mt-3 max-w-sm text-sm text-muted-foreground">
                  Register your company to post jobs and see candidates ranked by proven, verified
                  skills — not just résumés.
                </p>

                <form onSubmit={onSubmit} className="mt-8 space-y-3">
                  <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label="Company name">
                        <Input
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="Loom Labs"
                        />
                      </Field>
                      <Field label="Your name (HR)">
                        <Input value={hrName} onChange={(e) => setHrName(e.target.value)} />
                      </Field>
                    </div>

                    <Field label="Official work email">
                      <Input
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                      />
                    </Field>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label="Password">
                        <Input
                          type="password"
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </Field>
                      <Field label="Confirm password">
                        <Input
                          type="password"
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label="Website">
                        <Input
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          placeholder="https://company.com"
                        />
                      </Field>
                      <Field label="Industry">
                        <Input
                          value={industry}
                          onChange={(e) => setIndustry(e.target.value)}
                          placeholder="Fintech"
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label="Company size">
                        <Select value={companySize} onValueChange={setCompanySize}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                          <SelectContent>
                            {COMPANY_SIZES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s} employees
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Headquarters">
                        <Input
                          value={headquarters}
                          onChange={(e) => setHeadquarters(e.target.value)}
                          placeholder="Bengaluru, India"
                        />
                      </Field>
                    </div>

                    <Field label="LinkedIn company URL (optional)">
                      <Input
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        placeholder="https://linkedin.com/company/..."
                      />
                    </Field>

                    <Field label="Company description">
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        placeholder="What does your company do?"
                      />
                    </Field>

                    <p className="text-[11px] text-muted-foreground">
                      You'll add your logo right after verifying your email.
                    </p>

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
                          Create business account <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>

                  <p className="pt-1 text-center text-sm text-muted-foreground">
                    Already registered?{" "}
                    <Link
                      to="/login"
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      Log in
                    </Link>
                  </p>
                  <p className="text-center text-sm text-muted-foreground">
                    Looking to prove your own skills?{" "}
                    <Link
                      to="/signup"
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      Student sign up
                    </Link>
                  </p>
                </form>
              </>
            )}
          </div>

          <div className="mt-10 space-y-3 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} Provn Labs · Hiring, proven.</p>
          </div>
        </section>

        <AuthBrandPanel />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
