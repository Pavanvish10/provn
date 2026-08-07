import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Compass, MapPin, CalendarClock, GraduationCap, ArrowRight, Search } from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { requireAuth } from "@/lib/auth-guard";
import { usePublishedDrives } from "@/lib/college-client";

export const Route = createFileRoute("/drives")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Campus Drives · Provn" },
      { name: "description", content: "Browse campus placement drives from colleges on Provn." },
    ],
  }),
  component: DrivesPage,
});

function formatPackage(min: number | null, max: number | null, currency: string) {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    `${currency === "INR" ? "₹" : currency + " "}${(n / 100000).toFixed(1)}L`;
  if (min && max) return `${fmt(min)}–${fmt(max)}`;
  return fmt((min ?? max)!);
}

function DrivesPage() {
  // Deliberately not branching structure on `isLoading` — see business.tsx
  // (Sprint 25) for why. `drives` defaults to `[]` so the empty-state
  // branch below renders consistently during the loading window too.
  const { data: drives = [] } = usePublishedDrives();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return drives;
    return drives.filter(
      (d) =>
        d.role.toLowerCase().includes(q) ||
        (d.company_name_override ?? "").toLowerCase().includes(q) ||
        (d.college?.name ?? "").toLowerCase().includes(q),
    );
  }, [drives, search]);

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Compass className="h-5 w-5" />
          </div>
          <h1 className="mt-3 font-display text-4xl tracking-tight">Campus Drives.</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Placement drives published by colleges on Provn — check your eligibility and apply
            directly.
          </p>
        </div>
        <Link to="/my-drives">
          <Button variant="outline">My applications</Button>
        </Link>
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search role, company, college…"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          {drives.length === 0
            ? "No campus drives are open right now — check back soon."
            : "No drives match your search."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((d) => {
            const pkg = formatPackage(d.package_min, d.package_max, d.currency);
            return (
              <div key={d.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  {d.college?.name ?? "College"}
                </div>
                <h3 className="mt-1 font-display text-lg leading-tight">{d.role}</h3>
                <p className="text-sm text-muted-foreground">
                  {d.company_name_override || "Company"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {d.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {d.location}
                    </span>
                  )}
                  {pkg && <span>{pkg}</span>}
                  {d.application_deadline && (
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" /> Apply by{" "}
                      {new Date(d.application_deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {(d.min_cgpa != null || d.allowed_branches.length > 0) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {d.min_cgpa != null && (
                      <Badge variant="secondary" className="gap-1 text-[10px]">
                        <GraduationCap className="h-2.5 w-2.5" /> CGPA {d.min_cgpa}+
                      </Badge>
                    )}
                    {d.allowed_branches.slice(0, 3).map((b) => (
                      <Badge key={b} variant="secondary" className="text-[10px]">
                        {b}
                      </Badge>
                    ))}
                  </div>
                )}
                <Link to="/drive/$driveId" params={{ driveId: d.id }} className="mt-3 block">
                  <Button size="sm" className="w-full gap-1">
                    View drive <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
