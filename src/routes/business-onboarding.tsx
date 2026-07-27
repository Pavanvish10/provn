import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ArrowRight, Loader2, Upload } from "lucide-react";

import { Wordmark } from "@/components/Logo";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getPendingCompanyDraftFn } from "@/lib/auth.server";
import { useCurrentUser, invalidateCurrentUser } from "@/lib/auth-client";
import { useUpdateProfile } from "@/lib/profile-client";
import { useCreateCompany } from "@/lib/company-client";

export const Route = createFileRoute("/business-onboarding")({
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: "/login" });
    if (context.user.accountType !== "company") throw redirect({ to: "/home" });
    if (context.user.onboardingCompleted) throw redirect({ to: "/business" });
  },
  loader: () => getPendingCompanyDraftFn(),
  head: () => ({ meta: [{ title: "Set up your company · Provn" }] }),
  component: BusinessOnboarding,
});

function BusinessOnboarding() {
  const draft = Route.useLoaderData();
  const nav = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const updateProfile = useUpdateProfile(user?.id);
  const createCompany = useCreateCompany(user?.id);
  const fileInput = useRef<HTMLInputElement>(null);

  const [companyName, setCompanyName] = useState(draft?.companyName ?? "");
  const [website, setWebsite] = useState(draft?.website ?? "");
  const [description, setDescription] = useState(draft?.description ?? "");
  const [industry, setIndustry] = useState(draft?.industry ?? "");
  const [companySize, setCompanySize] = useState(draft?.companySize ?? "");
  const [headquarters, setHeadquarters] = useState(draft?.headquarters ?? "");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onLogoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!companyName.trim()) {
      setError("Company name is required.");
      return;
    }
    setSubmitting(true);
    try {
      await createCompany.mutateAsync({
        companyName,
        description: description || undefined,
        website: website || undefined,
        industry: industry || undefined,
        companySize: companySize || undefined,
        location: headquarters || undefined,
        logoFile,
      });
      await updateProfile.mutateAsync({ onboarding_completed: true });
      await invalidateCurrentUser(queryClient);
      await router.invalidate();
      nav({ to: "/business" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your company. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Wordmark />
        <DarkModeToggle />
      </div>

      <div className="mx-auto max-w-2xl px-6 pb-16">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Finish setting up your company
        </span>
        <h1 className="mt-5 font-display text-4xl leading-tight tracking-tight sm:text-5xl">
          Welcome to Provn Business
        </h1>
        <p className="mt-3 max-w-lg text-sm text-muted-foreground">
          Confirm your company details and add a logo — this is what candidates will see.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted"
            >
              {logoPreview ? (
                <img src={logoPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <Upload className="h-6 w-6 text-muted-foreground" />
              )}
            </button>
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInput.current?.click()}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload logo
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onLogoPick}
              />
              <p className="mt-1 text-xs text-muted-foreground">PNG or JPG, square works best.</p>
            </div>
          </div>

          <Field label="Company name">
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Website">
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
            </Field>
            <Field label="Industry">
              <Input value={industry} onChange={(e) => setIndustry(e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Company size">
              <Input value={companySize} onChange={(e) => setCompanySize(e.target.value)} />
            </Field>
            <Field label="Headquarters">
              <Input value={headquarters} onChange={(e) => setHeadquarters(e.target.value)} />
            </Field>
          </div>

          <Field label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </Field>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Enter your dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
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
