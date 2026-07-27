import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2,
  MapPin,
  Globe2,
  Linkedin,
  Users,
  ShieldCheck,
  Loader2,
  Briefcase,
  MapPinned,
} from "lucide-react";
import { AppShell } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import {
  usePublicCompany,
  useCompanyFollowStatus,
  useCompanyFollowerCount,
  useToggleCompanyFollow,
} from "@/lib/company-client";
import { useCompanyOpenJobs } from "@/lib/jobs-client";

export const Route = createFileRoute("/c/$companyId")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Company · Provn" },
      { name: "description", content: "Follow a company and browse its open roles on Provn." },
    ],
  }),
  component: CompanyProfile,
});

function formatSalary(min: number | null, max: number | null, currency: string) {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    `${currency === "INR" ? "₹" : currency + " "}${(n / 100000).toFixed(0)}L`;
  if (min && max) return `${fmt(min)}–${fmt(max)}`;
  return fmt((min ?? max)!);
}

function CompanyProfile() {
  const { companyId } = Route.useParams();
  const { data: user } = useCurrentUser();
  const { data: company, isLoading } = usePublicCompany(companyId);
  const { data: following } = useCompanyFollowStatus(companyId, user?.id);
  const { data: followerCount } = useCompanyFollowerCount(companyId);
  const toggleFollow = useToggleCompanyFollow(companyId, user?.id);
  const { data: jobs = [], isLoading: jobsLoading } = useCompanyOpenJobs(companyId);

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (!company) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
          <div className="mt-3 font-display text-xl">Company not found</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="h-32 bg-gradient-to-br from-brand-soft to-muted sm:h-40">
          {company.cover_image && (
            <img src={company.cover_image} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="px-5 pb-5 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="-mt-10 flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-card bg-brand-soft text-brand">
                {company.logo ? (
                  <img src={company.logo} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-8 w-8" />
                )}
              </div>
              <div className="pb-1">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-brand" />{" "}
                  {company.verified ? "Verified company" : "Company · unverified"}
                </div>
                <h1 className="mt-1.5 font-display text-2xl tracking-tight sm:text-3xl">
                  {company.company_name}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {company.industry && <span>{company.industry}</span>}
                  {company.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {company.location}
                    </span>
                  )}
                  {company.company_size && (
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> {company.company_size} employees
                    </span>
                  )}
                  <span>{followerCount ?? 0} followers</span>
                </div>
              </div>
            </div>
            <Button
              variant={following ? "outline" : "default"}
              disabled={!user?.id || toggleFollow.isPending}
              onClick={() => toggleFollow.mutate(!following)}
            >
              {toggleFollow.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              {following ? "Following" : "Follow"}
            </Button>
          </div>

          {company.description && (
            <p className="mt-4 max-w-2xl text-sm text-muted-foreground">{company.description}</p>
          )}

          {(company.website || company.linkedin_url) && (
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-brand hover:underline"
                >
                  <Globe2 className="h-3.5 w-3.5" /> Website
                </a>
              )}
              {company.linkedin_url && (
                <a
                  href={company.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-brand hover:underline"
                >
                  <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 font-display text-xl">Open roles</h2>
        {jobsLoading ? (
          <div className="flex h-24 items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No open roles from {company.company_name} right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {jobs.map((job) => {
              const salary = formatSalary(job.salary_min, job.salary_max, job.currency);
              return (
                <div key={job.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display text-lg leading-tight">
                        {job.title ?? "Untitled role"}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        {job.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPinned className="h-3.5 w-3.5" /> {job.location}
                          </span>
                        )}
                        {job.work_mode && <span className="capitalize">· {job.work_mode}</span>}
                        {job.employment_type && <span>· {job.employment_type}</span>}
                        {salary && <span>· {salary}</span>}
                      </div>
                    </div>
                    <Link to="/apply">
                      <Button size="sm">
                        <Briefcase className="mr-1.5 h-3.5 w-3.5" /> Apply
                      </Button>
                    </Link>
                  </div>
                  {job.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {job.tags.slice(0, 6).map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px]">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
