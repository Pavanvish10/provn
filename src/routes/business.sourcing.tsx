import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppNav";
import { useState } from "react";
import {
  ArrowLeft,
  Globe2,
  Search,
  ShieldCheck,
  Info,
  MessageSquare,
  ExternalLink,
  Loader2,
  Building2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { requireBusinessAccount } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { useMyCompany } from "@/lib/company-client";
import {
  useCandidateSearch,
  emptyCandidateFilters,
  type SearchedCandidate,
} from "@/lib/recruiter-client";
import { useStartConversation } from "@/lib/messages-client";
import { MessageForm } from "@/components/business/MessageForm";

export const Route = createFileRoute("/business/sourcing")({
  beforeLoad: requireBusinessAccount,
  head: () => ({
    meta: [
      { title: "Recruiter Dashboard · Provn Business" },
      {
        name: "description",
        content: "Search every verified candidate on Provn — not just applicants to your jobs.",
      },
      { property: "og:title", content: "Recruiter Dashboard · Provn Business" },
      {
        property: "og:description",
        content:
          "Search and filter candidates platform-wide by verified skill, role, and location.",
      },
    ],
  }),
  component: Sourcing,
});

function Sourcing() {
  const { data: user } = useCurrentUser();
  const { data: membership, isLoading: loadingMembership } = useMyCompany(user?.id);

  const [name, setName] = useState("");
  const [skillsQuery, setSkillsQuery] = useState("");
  const [location, setLocation] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const filters = { name, skillsQuery, location, targetRole, verifiedOnly };
  const hasCompany = !!membership;
  const { data: candidates = [], isLoading, isFetching } = useCandidateSearch(filters);

  return (
    <AppShell>
      <Link
        to="/business"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Business Hub
      </Link>

      <header className="mb-6">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Globe2 className="h-5 w-5" />
        </div>
        <h1 className="mt-3 font-display text-3xl tracking-tight">Recruiter Dashboard</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Search every candidate on Provn — not just people who applied to one of your jobs.
        </p>
      </header>

      {!loadingMembership && !hasCompany && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-4 text-sm">
          <Building2 className="h-5 w-5 shrink-0 text-muted-foreground" />
          <span className="flex-1 text-muted-foreground">
            You can browse candidates without a company, but inviting/messaging works best once you{" "}
            <Link to="/business" className="text-brand underline underline-offset-2">
              register a company
            </Link>
            .
          </span>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={skillsQuery}
              onChange={(e) => setSkillsQuery(e.target.value)}
              placeholder="Skills, e.g. react typescript postgres"
              className="pl-8"
            />
          </div>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name or @username"
          />
          <Input
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="Target role"
          />
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location"
          />
        </div>
        <label className="mt-3 flex w-fit items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={verifiedOnly} onCheckedChange={(v) => setVerifiedOnly(v === true)} />
          Verified skills only
        </label>
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-lg border border-dashed border-border bg-card p-2.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          This search only uses what's publicly visible platform-wide: profile info and verified
          skills. Coding-test score, mock-interview score, ATS score, and roadmap progress are
          private to each candidate under current RLS and only become visible once they apply to one
          of your job postings — see the Applicants view on a specific job for those. The "match" %
          below is a verified-skill match score, the same engine used for job applicants, not a
          general aptitude score.
        </span>
      </div>

      <div className="mt-4">
        {isLoading || isFetching ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : candidates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            No candidates match these filters.
          </div>
        ) : (
          <div className="space-y-2">
            {candidates.map((c) => (
              <CandidateCard
                key={c.id}
                candidate={c}
                userId={user?.id}
                hasQuery={skillsQuery.trim().length > 0}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function CandidateCard({
  candidate,
  userId,
  hasQuery,
}: {
  candidate: SearchedCandidate;
  userId: string | undefined;
  hasQuery: boolean;
}) {
  const startConversation = useStartConversation(userId);
  const [inviteOpen, setInviteOpen] = useState(false);
  const pct = Math.round(candidate.score * 100);

  return (
    <div className="flex flex-wrap items-start gap-3 rounded-2xl border border-border bg-card p-4">
      <img
        src={candidate.avatar || `https://api.dicebear.com/9.x/notionists/svg?seed=${candidate.id}`}
        alt=""
        className="h-11 w-11 shrink-0 rounded-full bg-muted"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          {candidate.username ? (
            <Link
              to="/u/$username"
              params={{ username: candidate.username }}
              className="font-medium hover:underline"
            >
              {candidate.name}
            </Link>
          ) : (
            <span className="font-medium">{candidate.name}</span>
          )}
          {candidate.username && (
            <span className="text-xs text-muted-foreground">@{candidate.username}</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {candidate.targetRole || "—"} · {candidate.location || "—"}
        </div>
        {candidate.bio && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{candidate.bio}</p>
        )}
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {candidate.verifiedSkills.slice(0, 6).map((s) => (
            <Badge key={s} variant="secondary" className="gap-1 text-[10px]">
              <ShieldCheck className="h-2.5 w-2.5 text-brand" /> {s}
            </Badge>
          ))}
          {candidate.verifiedSkills.length === 0 && (
            <span className="text-[11px] text-muted-foreground">No verified skills yet.</span>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-3 text-[11px]">
          {candidate.githubUrl && (
            <a
              href={candidate.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-brand hover:underline"
            >
              GitHub <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {candidate.portfolioUrl && (
            <a
              href={candidate.portfolioUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-brand hover:underline"
            >
              Portfolio <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {candidate.linkedinUrl && (
            <a
              href={candidate.linkedinUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-brand hover:underline"
            >
              LinkedIn <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        {hasQuery && (
          <div className="text-right">
            <div className={`font-display text-xl leading-none ${pct >= 90 ? "text-brand" : ""}`}>
              {pct}%
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              skill match
            </div>
          </div>
        )}
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1"
              disabled={!userId || userId === candidate.id}
            >
              <MessageSquare className="h-3.5 w-3.5" /> Invite
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite {candidate.name}</DialogTitle>
            </DialogHeader>
            <MessageForm
              userId={userId}
              otherUserId={candidate.id}
              defaultText={`Hi ${candidate.name.split(" ")[0]}, I came across your verified profile on Provn and would love to chat about an opportunity.`}
              startConversation={startConversation}
              onDone={() => setInviteOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
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
void Field;
