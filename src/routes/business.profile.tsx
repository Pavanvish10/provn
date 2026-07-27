import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  Building2,
  ImagePlus,
  Loader2,
  ShieldCheck,
  Users,
  Briefcase,
  Globe,
  Linkedin,
} from "lucide-react";

import { BusinessShell } from "@/components/BusinessNav";
import { requireBusinessAccount } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import {
  useMyCompany,
  useUpdateCompany,
  useCompanyJobs,
  useCompanyFollowerCount,
} from "@/lib/company-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/business/profile")({
  beforeLoad: requireBusinessAccount,
  head: () => ({ meta: [{ title: "Company Profile · Provn Business" }] }),
  component: CompanyProfilePage,
});

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

function CompanyProfilePage() {
  const { data: user } = useCurrentUser();
  const { data: membership, isLoading } = useMyCompany(user?.id);
  const companyId = membership?.company.id;
  const { data: jobs } = useCompanyJobs(companyId);
  const { data: followerCount } = useCompanyFollowerCount(companyId);
  const updateCompany = useUpdateCompany(companyId, user?.id);

  const logoInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);

  const company = membership?.company;

  if (company && hydratedFor !== company.id) {
    setForm({
      companyName: company.company_name ?? "",
      description: company.description ?? "",
      website: company.website ?? "",
      industry: company.industry ?? "",
      companySize: company.company_size ?? "",
      location: company.location ?? "",
      linkedinUrl: company.linkedin_url ?? "",
    });
    setLogoPreview(company.logo);
    setCoverPreview(company.cover_image);
    setHydratedFor(company.id);
  }

  if (isLoading) {
    return (
      <BusinessShell>
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </BusinessShell>
    );
  }

  if (!company) {
    return (
      <BusinessShell>
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No company yet.
        </div>
      </BusinessShell>
    );
  }

  const openJobs = (jobs ?? []).filter((j) => j.status === "open").length;

  const onLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };
  const onCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const save = async () => {
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      await updateCompany.mutateAsync({
        companyName: form.companyName,
        description: form.description,
        website: form.website,
        industry: form.industry,
        companySize: form.companySize,
        location: form.location,
        linkedinUrl: form.linkedinUrl,
        logoFile,
        coverImageFile: coverFile,
      });
      setNotice("Company profile saved.");
      setLogoFile(null);
      setCoverFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BusinessShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl tracking-tight">Company Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This is what candidates and followers see.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <button
          type="button"
          onClick={() => coverInput.current?.click()}
          className="relative block h-40 w-full bg-gradient-to-br from-brand-soft to-muted"
        >
          {coverPreview && <img src={coverPreview} alt="" className="h-full w-full object-cover" />}
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur">
            <ImagePlus className="h-3 w-3" /> Change cover
          </span>
        </button>
        <input
          ref={coverInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onCover}
        />

        <div className="relative px-6 pb-6">
          <button
            type="button"
            onClick={() => logoInput.current?.click()}
            className="-mt-10 flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border-4 border-card bg-muted"
          >
            {logoPreview ? (
              <img src={logoPreview} alt="" className="h-full w-full object-cover" />
            ) : (
              <Building2 className="h-8 w-8 text-muted-foreground" />
            )}
          </button>
          <input
            ref={logoInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onLogo}
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-brand" />{" "}
              {company.verified ? "Verified" : "Unverified"}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 sm:max-w-md">
            <Stat icon={Users} label="Followers" value={followerCount ?? 0} />
            <Stat icon={Briefcase} label="Jobs posted" value={jobs?.length ?? 0} />
            <Stat icon={ShieldCheck} label="Open roles" value={openJobs} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Company name">
              <Input
                value={form.companyName ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
              />
            </Field>
            <Field label="Industry">
              <Input
                value={form.industry ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
              />
            </Field>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Company size">
              <Select
                value={form.companySize ?? ""}
                onValueChange={(v) => setForm((f) => ({ ...f, companySize: v }))}
              >
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
            <Field label="Location">
              <Input
                value={form.location ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              />
            </Field>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Website">
              <div className="relative">
                <Globe className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8"
                  value={form.website ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                />
              </div>
            </Field>
            <Field label="LinkedIn">
              <div className="relative">
                <Linkedin className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8"
                  value={form.linkedinUrl ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, linkedinUrl: e.target.value }))}
                />
              </div>
            </Field>
          </div>
          <div className="mt-3">
            <Field label="About">
              <Textarea
                rows={4}
                value={form.description ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </Field>
          </div>

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          {notice && <p className="mt-3 text-sm text-brand">{notice}</p>}

          <Button className="mt-4" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
        </div>
      </div>
    </BusinessShell>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-brand" />
      <div className="mt-1 font-display text-lg">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
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
