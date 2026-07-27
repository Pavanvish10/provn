import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  Search as SearchIcon,
  FileText,
  Award,
  Briefcase,
  Building2,
  Code2,
  UserCircle2,
} from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { requireAuth } from "@/lib/auth-guard";
import { useGlobalSearch } from "@/lib/search-client";

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/search")({
  beforeLoad: requireAuth,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Search · Provn" },
      {
        name: "description",
        content: "Search people, posts, skills, jobs, companies, and challenges on Provn.",
      },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [value, setValue] = useState(q ?? "");

  useEffect(() => {
    setValue(q ?? "");
  }, [q]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (value.trim() !== (q ?? "")) {
        navigate({ search: value.trim() ? { q: value.trim() } : {} });
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const query = q ?? "";
  const { data, isLoading } = useGlobalSearch(query);

  const hasQuery = query.trim().length >= 2;
  const totalResults = data
    ? data.profiles.length +
      data.posts.length +
      data.skills.length +
      data.jobs.length +
      data.companies.length +
      data.challenges.length
    : 0;

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="font-display text-4xl tracking-tight">Search Provn</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Find people, posts, skills, jobs, companies, and challenges.
        </p>
      </div>

      <div className="relative mb-8 max-w-xl">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search Provn…"
          className="h-11 pl-10"
          autoFocus
        />
      </div>

      {!hasQuery && (
        <p className="text-sm text-muted-foreground">Type at least 2 characters to search.</p>
      )}

      {hasQuery && isLoading && <p className="text-sm text-muted-foreground">Searching…</p>}

      {hasQuery && !isLoading && data && totalResults === 0 && (
        <p className="text-sm text-muted-foreground">
          No results for &ldquo;{query}&rdquo;. Try a different search.
        </p>
      )}

      {hasQuery && !isLoading && data && totalResults > 0 && (
        <div className="space-y-8">
          {data.profiles.length > 0 && (
            <ResultSection title="People" icon={<UserCircle2 className="h-4 w-4 text-brand" />}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.profiles.map((p) => {
                  const card = (
                    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition hover:border-brand/60">
                      {p.avatar_url ? (
                        <img
                          src={p.avatar_url}
                          className="h-10 w-10 rounded-full bg-muted object-cover"
                          alt=""
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-display text-sm">
                          {(p.full_name ?? "?").slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {p.full_name || p.username || "Unnamed"}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {p.username ? `@${p.username}` : ""}
                          {p.target_role ? ` · ${p.target_role}` : ""}
                        </div>
                      </div>
                    </div>
                  );
                  return p.username ? (
                    <Link key={p.id} to="/u/$username" params={{ username: p.username }}>
                      {card}
                    </Link>
                  ) : (
                    <div key={p.id}>{card}</div>
                  );
                })}
              </div>
            </ResultSection>
          )}

          {data.posts.length > 0 && (
            <ResultSection title="Posts" icon={<FileText className="h-4 w-4 text-brand" />}>
              <div className="space-y-2">
                {data.posts.map((p) => (
                  <Link
                    key={p.id}
                    to="/home"
                    className="block rounded-xl border border-border bg-card p-3 transition hover:border-brand/60"
                  >
                    <div className="text-xs text-muted-foreground">
                      {p.author?.full_name || p.author?.username || "Someone"}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm">{p.content}</p>
                  </Link>
                ))}
              </div>
            </ResultSection>
          )}

          {data.skills.length > 0 && (
            <ResultSection title="Skills" icon={<Award className="h-4 w-4 text-brand" />}>
              <div className="flex flex-wrap gap-2">
                {data.skills.map((s) => (
                  <Badge key={s} variant="secondary">
                    {s}
                  </Badge>
                ))}
              </div>
            </ResultSection>
          )}

          {data.jobs.length > 0 && (
            <ResultSection title="Jobs" icon={<Briefcase className="h-4 w-4 text-brand" />}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {data.jobs.map((j) => (
                  <div key={j.id} className="rounded-xl border border-border bg-card p-3">
                    <div className="font-medium">{j.title || "Untitled role"}</div>
                    {j.location && (
                      <div className="text-xs text-muted-foreground">{j.location}</div>
                    )}
                  </div>
                ))}
              </div>
            </ResultSection>
          )}

          {data.companies.length > 0 && (
            <ResultSection title="Companies" icon={<Building2 className="h-4 w-4 text-brand" />}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {data.companies.map((c) => (
                  <div key={c.id} className="rounded-xl border border-border bg-card p-3">
                    <div className="font-medium">{c.company_name || "Unnamed company"}</div>
                  </div>
                ))}
              </div>
            </ResultSection>
          )}

          {data.challenges.length > 0 && (
            <ResultSection title="Challenges" icon={<Code2 className="h-4 w-4 text-brand" />}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {data.challenges.map((c) => (
                  <Link
                    key={c.id}
                    to="/challenges"
                    className="block rounded-xl border border-border bg-card p-3 transition hover:border-brand/60"
                  >
                    <div className="font-medium">{c.title}</div>
                    <div className="text-xs text-muted-foreground">{c.difficulty}</div>
                  </Link>
                ))}
              </div>
            </ResultSection>
          )}
        </div>
      )}
    </AppShell>
  );
}

function ResultSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        {icon} {title}
      </div>
      {children}
    </section>
  );
}
