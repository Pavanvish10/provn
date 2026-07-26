import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppNav";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Briefcase, ShieldCheck, Sparkles, Check, Plus, X, Send, Filter } from "lucide-react";
import { CANDIDATES } from "@/lib/mock-data";
import { rankCandidates, extractSkills, type RankedCandidate } from "@/lib/matching";

export const Route = createFileRoute("/business/hiring")({
  head: () => ({
    meta: [
      { title: "Job Hiring · Provn Business" },
      { name: "description", content: "Post a role. Get candidates ranked by verified-skill match, semantically." },
      { property: "og:title", content: "Job Hiring · Provn Business" },
      { property: "og:description", content: "Post a role and see verified candidates ranked by match tier." },
    ],
  }),
  component: Hiring,
});

type JobType = "Full-time" | "Internship" | "Contract" | "Remote";

function Hiring() {
  const [title, setTitle] = useState("Senior Frontend Engineer");
  const [description, setDescription] = useState(
    "We're building a fast, delightful web app used by thousands of teams. You'll own the frontend, ship UI systems, and partner closely with design. Comfort with server-side rendering and modern React patterns is a plus."
  );
  const [reqInput, setReqInput] = useState("");
  const [requirements, setRequirements] = useState<string[]>(["React", "TypeScript", "Next.js", "Tailwind"]);
  const [location, setLocation] = useState("Bengaluru · Hybrid");
  const [jobType, setJobType] = useState<JobType>("Full-time");
  const [salary, setSalary] = useState("₹24–40 LPA");
  const [submitted, setSubmitted] = useState(false);
  const [tierFilter, setTierFilter] = useState<0 | 50 | 75 | 90 | 100>(0);

  const addReq = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    setRequirements((prev) => Array.from(new Set([...prev, v])));
    setReqInput("");
  };
  const removeReq = (r: string) => setRequirements((prev) => prev.filter((x) => x !== r));

  const suggested = useMemo(() => {
    const fromJd = extractSkills(`${title} ${description}`);
    return fromJd.filter((s) => !requirements.map((r) => r.toLowerCase()).includes(s.toLowerCase())).slice(0, 8);
  }, [title, description, requirements]);

  const ranked = useMemo(() => rankCandidates(CANDIDATES, requirements), [requirements]);
  const filtered = useMemo(
    () => (tierFilter === 0 ? ranked : ranked.filter((r) => r.tier >= tierFilter)),
    [ranked, tierFilter],
  );

  const tierCounts = useMemo(() => {
    const c = { 100: 0, 90: 0, 75: 0, 50: 0 } as Record<number, number>;
    ranked.forEach((r) => { if (r.tier >= 50) c[r.tier] = (c[r.tier] ?? 0) + 1; });
    return c;
  }, [ranked]);

  return (
    <AppShell>
      <Link to="/business" className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Business Hub
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[440px_1fr]">
        {/* Job posting form */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <Briefcase className="h-4 w-4" />
              </div>
              <div>
                <div className="font-display text-lg">Post a job</div>
                <div className="text-xs text-muted-foreground">Provn matches by verified skill, not keywords.</div>
              </div>
            </div>

            <Field label="Job title">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Senior Frontend Engineer" />
            </Field>

            <Field label="Job description">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the role, team, and what a great candidate looks like."
                className="min-h-[120px]"
              />
            </Field>

            <Field label="Requirements (verified skills)">
              <div className="flex flex-wrap gap-1.5">
                {requirements.map((r) => (
                  <Badge key={r} variant="secondary" className="gap-1 pl-2 pr-1">
                    {r}
                    <button onClick={() => removeReq(r)} className="rounded-full p-0.5 hover:bg-muted-foreground/20" aria-label={`Remove ${r}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Input
                  value={reqInput}
                  onChange={(e) => setReqInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addReq(reqInput); } }}
                  placeholder="Type a skill and press Enter"
                />
                <Button type="button" variant="outline" onClick={() => addReq(reqInput)} disabled={!reqInput.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {suggested.length > 0 && (
                <div className="mt-3">
                  <div className="mb-1.5 flex items-center gap-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-brand" /> Suggested from JD
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {suggested.map((s) => (
                      <button
                        key={s}
                        onClick={() => addReq(s)}
                        className="rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground hover:border-brand hover:text-foreground"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Location">
                <Input value={location} onChange={(e) => setLocation(e.target.value)} />
              </Field>
              <Field label="Type">
                <select
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value as JobType)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option>Full-time</option>
                  <option>Internship</option>
                  <option>Contract</option>
                  <option>Remote</option>
                </select>
              </Field>
            </div>
            <Field label="Salary range">
              <Input value={salary} onChange={(e) => setSalary(e.target.value)} />
            </Field>

            <Button className="mt-2 w-full" onClick={() => setSubmitted(true)} disabled={!title.trim() || requirements.length === 0}>
              <Send className="mr-1.5 h-4 w-4" /> {submitted ? "Update posting" : "Post job & match candidates"}
            </Button>
          </div>
        </div>

        {/* Ranked candidates */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-display text-lg">Matched candidates</div>
                <div className="text-xs text-muted-foreground">
                  Ranked by verified-skill match against your requirements. Uses synonym-aware matching.
                </div>
              </div>
              <div className="inline-flex items-center gap-1 rounded-lg border border-border p-1 text-xs">
                <Filter className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
                {[
                  { v: 0 as const, label: "All" },
                  { v: 50 as const, label: "50%+" },
                  { v: 75 as const, label: "75%+" },
                  { v: 90 as const, label: "90%+" },
                  { v: 100 as const, label: "100%" },
                ].map((t) => (
                  <button
                    key={t.v}
                    onClick={() => setTierFilter(t.v)}
                    className={`rounded-md px-2 py-1 ${tierFilter === t.v ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              {[100, 90, 75, 50].map((t) => (
                <div key={t} className="rounded-xl border border-border bg-background p-3">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t}%+ match</div>
                  <div className="font-display text-2xl">{tierCounts[t] ?? 0}</div>
                </div>
              ))}
            </div>
          </div>

          {requirements.length === 0 ? (
            <EmptyState text="Add at least one requirement to see matched candidates." />
          ) : filtered.length === 0 ? (
            <EmptyState text="No candidates at this tier. Try lowering the filter." />
          ) : (
            <div className="space-y-3">
              {groupByTier(filtered).map(({ tier, list }) => (
                <section key={tier}>
                  <TierHeader tier={tier} count={list.length} />
                  <div className="mt-2 space-y-2">
                    {list.map((c) => <CandidateRow key={c.id} c={c} required={requirements} />)}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function groupByTier(list: RankedCandidate[]) {
  const order: RankedCandidate["tier"][] = [100, 90, 75, 50, 0];
  return order
    .map((tier) => ({ tier, list: list.filter((c) => c.tier === tier) }))
    .filter((g) => g.list.length > 0);
}

function TierHeader({ tier, count }: { tier: RankedCandidate["tier"]; count: number }) {
  const label =
    tier === 100 ? "100% verified match"
    : tier === 90 ? "90%+ verified match"
    : tier === 75 ? "75%+ verified match"
    : tier === 50 ? "50%+ verified match"
    : "Weaker matches";
  const tone =
    tier >= 90 ? "text-brand" : tier >= 75 ? "text-foreground" : "text-muted-foreground";
  return (
    <div className="flex items-center gap-2 px-1 text-xs uppercase tracking-widest">
      <ShieldCheck className={`h-3.5 w-3.5 ${tone}`} />
      <span className={tone}>{label}</span>
      <span className="text-muted-foreground">· {count}</span>
    </div>
  );
}

function CandidateRow({ c, required }: { c: RankedCandidate; required: string[] }) {
  const pct = Math.round(c.score * 100);
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
      <img src={c.avatar} alt="" className="h-11 w-11 rounded-full bg-muted" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <div className="font-medium">{c.name}</div>
          <div className="text-xs text-muted-foreground">· {c.headline} · {c.location} · {c.years}y</div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {required.map((r) => {
            const matched = c.matched.includes(r);
            const partial = c.partial.includes(r);
            return (
              <span
                key={r}
                className={
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] " +
                  (matched
                    ? "bg-brand-soft text-foreground"
                    : partial
                      ? "border border-dashed border-brand/40 text-muted-foreground"
                      : "border border-border text-muted-foreground/70 line-through")
                }
                title={matched ? "Verified match" : partial ? "Related verified skill" : "Not verified"}
              >
                {matched && <Check className="h-3 w-3 text-brand" />}
                {r}
              </span>
            );
          })}
        </div>
      </div>
      <div className="text-right">
        <div className={`font-display text-2xl leading-none ${pct >= 90 ? "text-brand" : ""}`}>{pct}%</div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">match</div>
        <Button size="sm" variant="outline" className="mt-2 h-7">Invite</Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
