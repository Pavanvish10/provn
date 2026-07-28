import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ArrowRight, Loader2, Upload, User } from "lucide-react";

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
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { Wordmark } from "@/components/Logo";
import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser, invalidateCurrentUser } from "@/lib/auth-client";
import { useProfile, useUpdateProfile, uploadAvatar } from "@/lib/profile-client";

const STARTUP_STAGES = ["Idea stage", "Pre-seed", "Seed", "Early traction", "Growth", "Scaling"];

export const Route = createFileRoute("/profile-details")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [{ title: "Your profile · Provn" }],
  }),
  component: ProfileDetails,
});

function ProfileDetails() {
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const { data: profile } = useProfile(user?.id);
  const updateProfile = useUpdateProfile(user?.id);
  const fileInput = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [college, setCollege] = useState("");
  const [degree, setDegree] = useState("");
  const [branch, setBranch] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [founderCompanyName, setFounderCompanyName] = useState("");
  const [founderCompanyWebsite, setFounderCompanyWebsite] = useState("");
  const [founderCompanyLinkedin, setFounderCompanyLinkedin] = useState("");
  const [founderStartupStage, setFounderStartupStage] = useState("");
  const [founderIndustry, setFounderIndustry] = useState("");
  const [founderCompanyDescription, setFounderCompanyDescription] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  if (profile && !hydrated) {
    setFullName(profile.full_name ?? user?.name ?? "");
    setUsername(profile.username ?? "");
    setCollege(profile.college ?? "");
    setDegree(profile.degree ?? "");
    setBranch(profile.branch ?? "");
    setYearOfStudy(profile.year_of_study ? String(profile.year_of_study) : "");
    setGraduationYear(profile.graduation_year ? String(profile.graduation_year) : "");
    setFounderCompanyName(profile.founder_company_name ?? "");
    setFounderCompanyWebsite(profile.founder_company_website ?? "");
    setFounderCompanyLinkedin(profile.founder_company_linkedin ?? "");
    setFounderStartupStage(profile.founder_startup_stage ?? "");
    setFounderIndustry(profile.founder_industry ?? "");
    setFounderCompanyDescription(profile.founder_company_description ?? "");
    setTargetRole(profile.target_role ?? "");
    setGithub(profile.github_url ?? "");
    setLinkedin(profile.linkedin_url ?? "");
    setPortfolio(profile.portfolio_url ?? "");
    setBio(profile.bio ?? "");
    setAvatarUrl(profile.avatar_url ?? null);
    setHydrated(true);
  }

  const isFounder = profile?.persona === "founder";

  const onAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarUploading(true);
    setError(null);
    try {
      const url = await uploadAvatar(user.id, file);
      setAvatarUrl(url);
    } catch {
      setError("Couldn't upload that image. Try a smaller file.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim()) {
      setError("Choose a username.");
      return;
    }
    if (!/^[a-z0-9_.]{3,24}$/i.test(username.trim())) {
      setError("Username must be 3-24 characters: letters, numbers, dot, underscore.");
      return;
    }
    if (!user) return;

    setSubmitting(true);
    try {
      await updateProfile.mutateAsync({
        full_name: fullName.trim(),
        username: username.trim().toLowerCase(),
        ...(isFounder
          ? {
              founder_company_name: founderCompanyName.trim() || null,
              founder_company_website: founderCompanyWebsite.trim() || null,
              founder_company_linkedin: founderCompanyLinkedin.trim() || null,
              founder_startup_stage: founderStartupStage || null,
              founder_industry: founderIndustry.trim() || null,
              founder_company_description: founderCompanyDescription.trim() || null,
            }
          : {
              college: college.trim() || null,
              degree: degree.trim() || null,
              branch: branch.trim() || null,
              year_of_study: yearOfStudy ? Number(yearOfStudy) : null,
              graduation_year: graduationYear ? Number(graduationYear) : null,
            }),
        target_role: targetRole.trim() || null,
        github_url: github.trim() || null,
        linkedin_url: linkedin.trim() || null,
        portfolio_url: portfolio.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
      });
      await invalidateCurrentUser(queryClient);
      nav({ to: "/resume-setup" });
    } catch {
      setError(
        username.trim()
          ? "That username may already be taken — try another."
          : "Something went wrong. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

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
          <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Step 4 of 6 · Profile
        </span>
        <h1 className="mt-5 font-display text-4xl leading-tight tracking-tight sm:text-5xl">
          Build your profile
        </h1>
        <p className="mt-3 max-w-lg text-sm text-muted-foreground">
          This is what recruiters and peers see. You can edit it anytime from your profile.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-muted-foreground" />
              )}
              {avatarUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              )}
            </button>
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInput.current?.click()}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload photo
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onAvatarPick}
              />
              <p className="mt-1 text-xs text-muted-foreground">PNG or JPG, up to 5MB.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Full name">
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </Field>
            <Field label="Username">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="aarav_k"
              />
            </Field>
          </div>

          {isFounder ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Company name">
                  <Input
                    value={founderCompanyName}
                    onChange={(e) => setFounderCompanyName(e.target.value)}
                    placeholder="Your startup's name"
                  />
                </Field>
                <Field label="Company website">
                  <Input
                    value={founderCompanyWebsite}
                    onChange={(e) => setFounderCompanyWebsite(e.target.value)}
                    placeholder="https://yourstartup.com"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Company LinkedIn">
                  <Input
                    value={founderCompanyLinkedin}
                    onChange={(e) => setFounderCompanyLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/company/..."
                  />
                </Field>
                <Field label="Startup stage">
                  <Select value={founderStartupStage} onValueChange={setFounderStartupStage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {STARTUP_STAGES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Industry">
                  <Input
                    value={founderIndustry}
                    onChange={(e) => setFounderIndustry(e.target.value)}
                    placeholder="Fintech"
                  />
                </Field>
              </div>

              <Field label="Company description">
                <Textarea
                  value={founderCompanyDescription}
                  onChange={(e) => setFounderCompanyDescription(e.target.value)}
                  rows={3}
                  placeholder="What does your startup do?"
                />
              </Field>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="College / University">
                  <Input value={college} onChange={(e) => setCollege(e.target.value)} />
                </Field>
                <Field label="Degree">
                  <Input
                    value={degree}
                    onChange={(e) => setDegree(e.target.value)}
                    placeholder="B.Tech"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Branch">
                  <Input
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="Computer Science"
                  />
                </Field>
                <Field label="Current year">
                  <Input
                    type="number"
                    min={1}
                    max={6}
                    value={yearOfStudy}
                    onChange={(e) => setYearOfStudy(e.target.value)}
                  />
                </Field>
                <Field label="Graduation year">
                  <Input
                    type="number"
                    min={2000}
                    max={2100}
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(e.target.value)}
                  />
                </Field>
              </div>
            </>
          )}

          <Field label="Target role">
            <Input
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="Frontend Engineer"
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="GitHub">
              <Input
                value={github}
                onChange={(e) => setGithub(e.target.value)}
                placeholder="https://github.com/you"
              />
            </Field>
            <Field label="LinkedIn">
              <Input
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/you"
              />
            </Field>
            <Field label="Portfolio">
              <Input
                value={portfolio}
                onChange={(e) => setPortfolio(e.target.value)}
                placeholder="https://you.dev"
              />
            </Field>
          </div>

          <Field label="Bio">
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="A couple of sentences about what you build and where you're headed."
            />
          </Field>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => nav({ to: "/profession" })}>
              Back
            </Button>
            <Button type="submit" size="lg" className="ml-auto" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
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
