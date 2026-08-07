import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Briefcase,
  ShieldCheck,
  Building2,
  Loader2,
  ImagePlus,
  Pencil,
  Users,
  UserCheck,
} from "lucide-react";
import { requireBusinessAccount } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { useMyCompany, useUpdateCompany, useCompanyJobs, type Company } from "@/lib/company-client";
import { useRef, useState } from "react";
import { BusinessShell } from "@/components/BusinessNav";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/business")({
  beforeLoad: requireBusinessAccount,
  head: () => ({
    meta: [
      { title: "Dashboard · Provn Business" },
      {
        name: "description",
        content: "Post jobs, review applicants, and hire skill-verified candidates on Provn.",
      },
    ],
  }),
  component: BusinessDashboard,
});

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

function useCompanyDashboardStats(companyId: string | undefined) {
  return useQuery({
    queryKey: ["business", "dashboard-stats", companyId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, status")
        .eq("company_id", companyId!);
      const jobIds = (jobs ?? []).map((j) => j.id);
      const [{ count: followers }, { count: applicants }] = await Promise.all([
        supabase
          .from("company_follows")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId!),
        jobIds.length > 0
          ? supabase
              .from("job_applications")
              .select("id", { count: "exact", head: true })
              .in("job_id", jobIds)
          : Promise.resolve({ count: 0 }),
      ]);
      return {
        totalJobs: jobs?.length ?? 0,
        openJobs: (jobs ?? []).filter((j) => j.status === "open").length,
        followers: followers ?? 0,
        applicants: applicants ?? 0,
      };
    },
    enabled: !!companyId,
  });
}

function BusinessDashboard() {
  const { data: user } = useCurrentUser();
  // Deliberately not branching structure on `isLoading` — the same query
  // can resolve between the SSR flush and the client's first hydration
  // paint, causing a hydration mismatch. `membership` stays undefined in
  // both the loading and genuinely-no-company cases, so the empty-state
  // branch below covers both without a separate spinner tree.
  const { data: membership } = useMyCompany(user?.id);
  const companyId = membership?.company.id;
  const { data: stats } = useCompanyDashboardStats(companyId);
  const { data: recentJobs } = useCompanyJobs(companyId);

  if (!membership) {
    return (
      <BusinessShell>
        <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="mt-3 font-display text-2xl">No company on this account yet</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Finish setting up your company to unlock the dashboard.
          </p>
          <Button asChild className="mt-5">
            <Link to="/business-onboarding">Set up company</Link>
          </Button>
        </div>
      </BusinessShell>
    );
  }

  const company = membership.company;

  return (
    <BusinessShell>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-brand-soft text-brand">
            {company.logo ? (
              <img src={company.logo} alt="" className="h-full w-full object-cover" />
            ) : (
              <Building2 className="h-6 w-6" />
            )}
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-brand" />{" "}
              {company.verified ? "Verified company" : "Company · unverified"}
            </div>
            <h1 className="mt-2 font-display text-3xl tracking-tight">{company.company_name}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Your role: <span className="text-foreground">{membership.role}</span>
              {company.industry && <> · {company.industry}</>}
              {company.location && <> · {company.location}</>}
            </p>
          </div>
        </div>
        {(membership.role === "owner" || membership.role === "admin") && (
          <EditCompanyDialog company={company} userId={user?.id} />
        )}
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Briefcase} label="Jobs posted" value={stats?.totalJobs ?? 0} />
        <StatCard icon={ShieldCheck} label="Open positions" value={stats?.openJobs ?? 0} />
        <StatCard icon={Users} label="Applicants" value={stats?.applicants ?? 0} />
        <StatCard icon={UserCheck} label="Followers" value={stats?.followers ?? 0} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="font-display text-lg">Recent job postings</div>
          <Button asChild variant="outline" size="sm">
            <Link to="/business/jobs">View all</Link>
          </Button>
        </div>
        {!recentJobs || recentJobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No jobs posted yet.{" "}
            <Link to="/business/jobs" className="text-brand hover:underline">
              Post your first job
            </Link>
            .
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentJobs.slice(0, 5).map((j) => (
              <div key={j.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <div className="font-medium">{j.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {j.location || "—"} · {j.employment_type || "—"}
                  </div>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase tracking-widest text-muted-foreground">
                  {j.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </BusinessShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Briefcase;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <Icon className="h-4 w-4 text-brand" />
      <div className="mt-2 font-display text-2xl">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function EditCompanyDialog({ company, userId }: { company: Company; userId: string | undefined }) {
  const updateCompany = useUpdateCompany(company.id, userId);
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  const [companyName, setCompanyName] = useState(company.company_name ?? "");
  const [description, setDescription] = useState(company.description ?? "");
  const [website, setWebsite] = useState(company.website ?? "");
  const [industry, setIndustry] = useState(company.industry ?? "");
  const [companySize, setCompanySize] = useState(company.company_size ?? "");
  const [location, setLocation] = useState(company.location ?? "");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(company.logo);
  const [error, setError] = useState<string | null>(null);

  const onLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    try {
      await updateCompany.mutateAsync({
        companyName,
        description,
        website,
        industry,
        companySize,
        location,
        logoFile,
      });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Pencil className="h-3.5 w-3.5" /> Edit profile
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Company profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-background text-muted-foreground hover:border-brand hover:text-brand"
            >
              {logoPreview ? (
                <img src={logoPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImagePlus className="h-5 w-5" />
              )}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={onLogoChange}
            />
            <div className="text-xs text-muted-foreground">Logo</div>
          </div>

          <Field label="Company name">
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
          </Field>
          <Field label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[90px]"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Website">
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
              />
            </Field>
            <Field label="Industry">
              <Input value={industry} onChange={(e) => setIndustry(e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
            <Field label="Location">
              <Input value={location} onChange={(e) => setLocation(e.target.value)} />
            </Field>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={updateCompany.isPending}>
            {updateCompany.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
