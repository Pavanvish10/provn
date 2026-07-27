import { createFileRoute, Link } from "@tanstack/react-router";
import { Briefcase, MapPin, Bookmark, Loader2, Check, ExternalLink } from "lucide-react";
import { AppShell } from "@/components/AppNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { useMyApplications, useSavedJobs, useUnsaveJob } from "@/lib/jobs-client";

export const Route = createFileRoute("/applied-jobs")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Applied Jobs · Provn" },
      {
        name: "description",
        content: "Track the roles you've applied to and jobs you've saved for later.",
      },
    ],
  }),
  component: AppliedJobs,
});

const STATUS_TONE: Record<string, string> = {
  applied: "bg-muted text-muted-foreground",
  viewed: "bg-muted text-muted-foreground",
  shortlisted: "bg-brand-soft text-brand",
  interview: "bg-brand-soft text-brand",
  selected: "bg-brand text-brand-foreground",
  rejected: "bg-destructive/10 text-destructive",
  hired: "bg-brand text-brand-foreground",
};

function formatSalary(min: number | null, max: number | null, currency: string) {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    `${currency === "INR" ? "₹" : currency + " "}${(n / 100000).toFixed(0)}L`;
  if (min && max) return `${fmt(min)}–${fmt(max)}`;
  return fmt((min ?? max)!);
}

function AppliedJobs() {
  const { data: user } = useCurrentUser();
  const { data: applications, isLoading: applicationsLoading } = useMyApplications(user?.id);
  const { data: savedJobs, isLoading: savedLoading } = useSavedJobs(user?.id);
  const unsaveJob = useUnsaveJob(user?.id);

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="font-display text-4xl tracking-tight">Applied Jobs</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Track your applications and revisit roles you've saved for later.
        </p>
      </div>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-xl">Your applications</h2>
        {applicationsLoading ? (
          <div className="flex h-24 items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !applications || applications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <Briefcase className="mx-auto h-7 w-7 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              You haven't applied to any roles yet.
            </p>
            <Link to="/apply" className="mt-3 inline-block text-sm text-brand hover:underline">
              Browse open roles →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {applications.map((app) => (
              <div
                key={app.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">
                    Applied {new Date(app.applied_at).toLocaleDateString()}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">Job ID: {app.job_id}</div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest ${
                    STATUS_TONE[app.status] ?? "bg-muted text-muted-foreground"
                  }`}
                >
                  {app.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-xl">
          <Bookmark className="h-4 w-4 text-brand" /> Saved jobs
        </h2>
        {savedLoading ? (
          <div className="flex h-24 items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !savedJobs || savedJobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No saved jobs yet — tap the bookmark icon on any job to save it for later.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {savedJobs.map((job) => {
              const salary = formatSalary(job.salary_min, job.salary_max, job.currency);
              return (
                <div key={job.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">
                        {job.companies?.company_name ?? "Company"}
                      </div>
                      <h3 className="mt-1 font-display text-lg leading-tight">
                        {job.title ?? "Untitled role"}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        {job.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" /> {job.location}
                          </span>
                        )}
                        {salary && <span>· {salary}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => unsaveJob.mutate(job.id)}
                      disabled={unsaveJob.isPending}
                      className="shrink-0 rounded-md p-1.5 text-brand hover:bg-muted"
                      title="Remove from saved"
                    >
                      <Bookmark className="h-4 w-4 fill-current" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Link to="/apply">
                      <Button size="sm">
                        <Check className="mr-1.5 h-3.5 w-3.5" /> Apply
                      </Button>
                    </Link>
                    {job.company_id && (
                      <Link to="/c/$companyId" params={{ companyId: job.company_id }}>
                        <Button size="sm" variant="outline">
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Company
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
