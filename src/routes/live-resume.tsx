import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import {
  Award,
  Check,
  Download,
  Github,
  GraduationCap,
  Languages,
  Link as LinkIcon,
  Linkedin,
  Loader2,
  MapPin,
  Pencil,
} from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import {
  useLiveResumeData,
  useStampLiveResumeDownloaded,
  type LiveResumeData,
} from "@/lib/live-resume-client";
import type { Achievement, Education, Experience, Project } from "@/lib/profile-sections-client";

const searchSchema = z.object({
  u: z.string().optional(),
});

export const Route = createFileRoute("/live-resume")({
  validateSearch: searchSchema,
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Live Resume · Provn" },
      {
        name: "description",
        content: "A resume that's always current — generated live from your Provn profile.",
      },
      { property: "og:title", content: "Live Resume · Provn" },
      { property: "og:description", content: "Proof of skill, always up to date." },
    ],
  }),
  component: LiveResumePage,
});

function LiveResumePage() {
  const { data: user } = useCurrentUser();
  const search = Route.useSearch();
  const targetId = search.u || user?.id;
  const isOwn = !search.u || search.u === user?.id;

  const { data, isLoading } = useLiveResumeData(targetId);
  const stampDownloaded = useStampLiveResumeDownloaded(user?.id);

  // Best-effort freshness stamp: the browser fires `afterprint` once the
  // print/Save-as-PDF dialog is dismissed, whether or not the user actually saved.
  // Good enough for a "last exported" signal — we don't store a rendered file.
  useEffect(() => {
    if (!isOwn) return;
    const handler = () => {
      stampDownloaded.mutate();
    };
    window.addEventListener("afterprint", handler);
    return () => window.removeEventListener("afterprint", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwn, user?.id]);

  const handleDownload = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading live resume…
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <div className="py-24 text-center text-sm text-muted-foreground">
          {search.u ? "That profile could not be found." : "We couldn't load your profile."}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl">Live Resume</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isOwn
                ? "Always current — generated from your Provn profile."
                : `Generated live from ${data.profile.full_name || "this student"}'s Provn profile.`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isOwn && (
              <Button variant="outline" asChild>
                <Link to="/profile">
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit on profile
                </Link>
              </Button>
            )}
            <Button onClick={handleDownload}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Download PDF
            </Button>
          </div>
        </div>
        {isOwn && (
          <p className="no-print mb-6 -mt-3 text-xs text-muted-foreground">
            Download opens your browser's print dialog — choose "Save as PDF" as the destination.
          </p>
        )}

        <LiveResumeSheet data={data} isOwn={isOwn} />
      </div>
    </AppShell>
  );
}

function formatExperiencePeriod(e: Experience) {
  const start = e.start_date
    ? new Date(e.start_date).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : "";
  if (e.is_current) return `${start} – Present`;
  const end = e.end_date
    ? new Date(e.end_date).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : "";
  return [start, end].filter(Boolean).join(" – ");
}

function formatEducationPeriod(e: Education) {
  return [e.start_year, e.end_year].filter((y): y is number => !!y).join(" – ");
}

function LiveResumeSheet({ data, isOwn }: { data: LiveResumeData; isOwn: boolean }) {
  const { profile, education, experience, projects, achievements, skills, resumeExtras } = data;
  const verifiedSkills = skills.filter((s) => s.verified);
  const unverifiedSkills = skills.filter((s) => !s.verified);

  const contactLine = [profile.location, profile.email].filter(Boolean);
  const links = [
    profile.github_url ? { label: "GitHub", href: profile.github_url, icon: Github } : null,
    profile.linkedin_url ? { label: "LinkedIn", href: profile.linkedin_url, icon: Linkedin } : null,
    profile.portfolio_url
      ? { label: "Portfolio", href: profile.portfolio_url, icon: LinkIcon }
      : null,
  ].filter((l): l is { label: string; href: string; icon: typeof Github } => !!l);

  return (
    <div className="live-resume-sheet rounded-2xl border border-border bg-card p-8 sm:p-10 print:rounded-none print:border-0 print:bg-white print:p-0 print:text-black print:shadow-none">
      {/* Header */}
      <header className="border-b border-border pb-5 print:border-black/20">
        <h1 className="font-display text-3xl tracking-tight print:text-black">
          {profile.full_name || "Unnamed student"}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground print:text-black/70">
          {profile.target_role && <span>{profile.target_role}</span>}
          {profile.username && <span>@{profile.username}</span>}
        </div>
        {(contactLine.length > 0 || links.length > 0) && (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground print:text-black/70">
            {profile.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {profile.location}
              </span>
            )}
            {profile.email && <span>{profile.email}</span>}
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-foreground print:text-black/70 print:no-underline"
              >
                <l.icon className="h-3 w-3" /> {l.href.replace(/^https?:\/\//, "")}
              </a>
            ))}
          </div>
        )}
      </header>

      {profile.bio && (
        <Section title="Summary">
          <p className="text-sm leading-relaxed text-foreground print:text-black">{profile.bio}</p>
        </Section>
      )}

      {skills.length > 0 && (
        <Section title="Skills">
          <div className="flex flex-wrap gap-x-2 gap-y-1.5 text-sm print:text-black">
            {verifiedSkills.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 print:border print:border-black/30 print:bg-transparent"
              >
                <Check className="h-3 w-3 text-brand print:text-black" /> {s.skill_name}
              </span>
            ))}
            {unverifiedSkills.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-muted-foreground print:border print:border-black/20 print:bg-transparent print:text-black/70"
              >
                {s.skill_name}
              </span>
            ))}
          </div>
          {verifiedSkills.length > 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground print:text-black/60">
              <Check className="mr-1 inline h-3 w-3 text-brand print:text-black" />
              indicates a skill verified by a Provn coding challenge.
            </p>
          )}
        </Section>
      )}

      {experience.length > 0 && (
        <Section title="Experience">
          <div className="space-y-4">
            {experience.map((e: Experience) => (
              <div key={e.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <div className="font-medium print:text-black">
                    {e.title}{" "}
                    <span className="text-muted-foreground print:text-black/70">
                      · {e.company_name}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground print:text-black/70">
                    {formatExperiencePeriod(e)}
                  </div>
                </div>
                {e.location && (
                  <div className="text-xs text-muted-foreground print:text-black/70">
                    {e.location}
                  </div>
                )}
                {e.description && (
                  <p className="mt-1 text-sm text-muted-foreground print:text-black/80">
                    {e.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {education.length > 0 && (
        <Section title="Education">
          <div className="space-y-4">
            {education.map((e: Education) => (
              <div key={e.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <div className="font-medium print:text-black">
                    {[e.degree, e.field].filter(Boolean).join(" · ") || "Studies"}{" "}
                    <span className="text-muted-foreground print:text-black/70">
                      · {e.institution}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground print:text-black/70">
                    {formatEducationPeriod(e)}
                  </div>
                </div>
                {e.description && (
                  <p className="mt-1 text-sm text-muted-foreground print:text-black/80">
                    {e.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {projects.length > 0 && (
        <Section title="Projects">
          <div className="space-y-4">
            {projects.map((p: Project) => (
              <div key={p.id}>
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <div className="font-medium print:text-black">{p.title}</div>
                  {p.tags?.length > 0 && (
                    <div className="text-xs text-muted-foreground print:text-black/70">
                      {p.tags.join(" · ")}
                    </div>
                  )}
                </div>
                {p.description && (
                  <p className="mt-1 text-sm text-muted-foreground print:text-black/80">
                    {p.description}
                  </p>
                )}
                {(p.project_url || p.repo_url) && (
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-brand print:text-black/70">
                    {p.project_url && <span>{p.project_url.replace(/^https?:\/\//, "")}</span>}
                    {p.repo_url && <span>{p.repo_url.replace(/^https?:\/\//, "")}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {achievements.length > 0 && (
        <Section title="Achievements">
          <div className="space-y-2">
            {achievements.map((a: Achievement) => (
              <div key={a.id} className="flex items-start gap-2">
                <Award className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand print:text-black" />
                <div>
                  <div className="text-sm font-medium print:text-black">{a.title}</div>
                  {a.description && (
                    <p className="text-sm text-muted-foreground print:text-black/80">
                      {a.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {resumeExtras && (
        <Section title="Additional">
          <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground print:text-black/60">
            {isOwn ? "From your uploaded resume" : "From their uploaded resume"}
          </p>
          <div className="space-y-2 text-sm print:text-black">
            {resumeExtras.certifications.length > 0 && (
              <div className="flex items-start gap-2">
                <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand print:text-black" />
                <span>{resumeExtras.certifications.join(", ")}</span>
              </div>
            )}
            {resumeExtras.languages.length > 0 && (
              <div className="flex items-start gap-2">
                <Languages className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand print:text-black" />
                <span>{resumeExtras.languages.join(", ")}</span>
              </div>
            )}
          </div>
        </Section>
      )}

      {education.length === 0 &&
        experience.length === 0 &&
        projects.length === 0 &&
        skills.length === 0 &&
        achievements.length === 0 &&
        !resumeExtras &&
        !profile.bio && (
          <p className="mt-6 text-sm text-muted-foreground print:text-black/70">
            This profile doesn't have any resume content yet.
          </p>
        )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 print:mt-4 print:break-inside-avoid">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground print:text-black">
        {title}
      </h2>
      {children}
    </section>
  );
}
