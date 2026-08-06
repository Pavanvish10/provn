import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  Loader2,
  Target,
  Building2,
  Gauge,
  ListChecks,
  History,
  GraduationCap,
  FolderKanban,
  Award,
  Code2,
  MessagesSquare,
  Terminal,
  UserCheck,
  FileEdit,
} from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";

import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { useProfile } from "@/lib/profile-client";
import { CompanySelector } from "@/components/interview/job/CompanySelector";
import { JobDescriptionInput } from "@/components/interview/job/JobDescriptionInput";
import {
  SAMPLE_JOB_DESCRIPTIONS,
  type SampleJobDescription,
} from "@/services/job/JobDescriptionParser";
import {
  useEligibilityHistory,
  useGenerateEligibilityReport,
  type EligibilityReport,
  type EligibilityScoreRationale,
  type EligibilityRecommendations,
} from "@/lib/eligibility-client";

export const Route = createFileRoute("/eligibility")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Company Eligibility · Provn" },
      {
        name: "description",
        content:
          "Your AI ATS & company eligibility report — scores, explanations, and what to fix next, built from your resume, interview history, and roadmap progress.",
      },
    ],
  }),
  component: EligibilityPage,
});

function EligibilityPage() {
  const { data: user } = useCurrentUser();
  const { data: profile } = useProfile(user?.id);
  const { data: history } = useEligibilityHistory(user?.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const selected = useMemo(() => {
    if (!history || history.length === 0) return null;
    if (selectedId) return history.find((r) => r.id === selectedId) ?? history[0];
    return history[0];
  }, [history, selectedId]);

  return (
    <AppShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl tracking-tight">Company eligibility.</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            An ATS-style eligibility check against a target company and role, explained — built from
            your resume, interview history, and roadmap progress. Run it as often as you like and
            track how your score moves.
          </p>
        </div>
        {history && history.length > 0 && (
          <Button variant="outline" onClick={() => setShowForm((v) => !v)}>
            <Sparkles className="mr-2 h-4 w-4" />
            {showForm ? "Hide" : "Run a new check"}
          </Button>
        )}
      </div>

      {(showForm || !history || history.length === 0) && (
        <div className="mb-8">
          <EligibilitySetup
            profileId={user?.id}
            defaultRole={profile?.target_role ?? ""}
            onGenerated={(reportId) => {
              setSelectedId(reportId);
              setShowForm(false);
            }}
          />
        </div>
      )}

      {selected && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <ReportDetail report={selected} />
          <HistoryList history={history ?? []} selectedId={selected.id} onSelect={setSelectedId} />
        </div>
      )}
    </AppShell>
  );
}

function EligibilitySetup({
  profileId,
  defaultRole,
  onGenerated,
}: {
  profileId: string | undefined;
  defaultRole: string;
  onGenerated: (reportId: string) => void;
}) {
  const generate = useGenerateEligibilityReport(profileId);
  const [targetRole, setTargetRole] = useState(defaultRole);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [jdText, setJdText] = useState("");
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The profile (and its target_role) loads asynchronously after this
  // component's first render, so seed the field once it arrives instead
  // of only capturing it at mount — but never clobber what the user typed.
  useEffect(() => {
    if (defaultRole && !targetRole) setTargetRole(defaultRole);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultRole]);

  function handleSelectSample(sample: SampleJobDescription) {
    setJdText(sample.text);
    setSelectedSampleId(sample.id);
    if (!targetRole.trim()) setTargetRole(sample.role);
  }

  async function handleGenerate() {
    if (!targetRole.trim()) {
      setError("Enter a target role.");
      return;
    }
    setError(null);
    const result = await generate.mutateAsync({
      targetRole: targetRole.trim(),
      targetCompany: companyId ?? undefined,
      jobDescriptionText: jdText.trim() || undefined,
    });
    if (result.error) setError(result.error);
    else if (result.reportId) onGenerated(result.reportId);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl border border-white/20 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:bg-white/5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Target className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          Target role
        </div>
        <Input
          value={targetRole}
          onChange={(e) => setTargetRole(e.target.value)}
          placeholder="e.g. Backend Developer"
          className="mt-3"
        />
      </div>

      <div className="rounded-2xl border border-white/20 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:bg-white/5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Building2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          Target company <span className="font-normal text-muted-foreground">(optional)</span>
        </div>
        <div className="mt-3">
          <CompanySelector value={companyId} onChange={setCompanyId} />
        </div>
      </div>

      <JobDescriptionInput
        value={jdText}
        onChange={setJdText}
        samples={SAMPLE_JOB_DESCRIPTIONS}
        selectedSampleId={selectedSampleId}
        onSelectSample={handleSelectSample}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        size="lg"
        className="w-full"
        onClick={handleGenerate}
        disabled={generate.isPending || !targetRole.trim()}
      >
        {generate.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running eligibility check…
          </>
        ) : (
          <>
            <Gauge className="mr-2 h-4 w-4" /> Run eligibility check
          </>
        )}
      </Button>
    </div>
  );
}

function ScoreBar({
  label,
  value,
  rationale,
}: {
  label: string;
  value: number;
  rationale?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{value}%</span>
      </div>
      <Progress value={value} className="mt-1.5" />
      {rationale && <p className="mt-1.5 text-xs text-muted-foreground">{rationale}</p>}
    </div>
  );
}

function BadgeList({
  items,
  variant = "secondary",
  empty,
}: {
  items: string[];
  variant?: "secondary" | "destructive" | "outline";
  empty: string;
}) {
  if (items.length === 0) return <span className="text-xs text-muted-foreground">{empty}</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Badge key={item} variant={variant}>
          {item}
        </Badge>
      ))}
    </div>
  );
}

function RecommendationSection({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {icon} {title}
      </div>
      <ul className="mt-3 space-y-1.5">
        {items.length === 0 ? (
          <li className="text-xs text-muted-foreground">Nothing recommended here.</li>
        ) : (
          items.map((item) => (
            <li key={item} className="flex gap-2 text-sm">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" />
              {item}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function ReportDetail({ report }: { report: EligibilityReport }) {
  const rationale = (report.score_rationale as unknown as EligibilityScoreRationale) ?? {};
  const recs = (report.recommendations as unknown as EligibilityRecommendations) ?? {
    nextSkills: [],
    projectsToBuild: [],
    certifications: [],
    codingTopics: [],
    interviewPracticePriorities: [],
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          {new Date(report.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </div>
        <h2 className="mt-1 font-display text-2xl tracking-tight">
          {report.target_role}
          {report.target_company ? ` @ ${report.target_company}` : ""}
        </h2>
        {report.roadmap_progress_percent != null && (
          <p className="mt-1 text-xs text-muted-foreground">
            Active roadmap {report.roadmap_progress_percent}% complete at the time of this check.
          </p>
        )}
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <ScoreBar label="ATS score" value={report.ats_score} rationale={rationale.atsScore} />
        <ScoreBar
          label="Company eligibility"
          value={report.company_eligibility_score}
          rationale={rationale.companyEligibility}
        />
        <ScoreBar
          label="Role match"
          value={report.role_match_score}
          rationale={rationale.roleMatch}
        />
        {report.skill_match_percent != null && (
          <ScoreBar
            label="Skill match"
            value={report.skill_match_percent}
            rationale={rationale.skillMatch}
          />
        )}
        <ScoreBar
          label="Estimated interview readiness"
          value={report.estimated_interview_readiness}
          rationale={rationale.interviewReadiness}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <ListChecks className="h-3.5 w-3.5" /> Missing skills
          </div>
          <div className="mt-2">
            <BadgeList items={report.missing_skills} variant="destructive" empty="No gaps found." />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <FolderKanban className="h-3.5 w-3.5" /> Missing projects
          </div>
          <div className="mt-2">
            <BadgeList items={report.missing_projects} empty="No gaps found." />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Award className="h-3.5 w-3.5" /> Missing certifications
          </div>
          <div className="mt-2">
            <BadgeList items={report.missing_certifications} empty="None needed." />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <RecommendationSection
          icon={<GraduationCap className="h-4 w-4 text-brand" />}
          title="Next skills to learn"
          items={recs.nextSkills}
        />
        <RecommendationSection
          icon={<FolderKanban className="h-4 w-4 text-brand" />}
          title="Projects to build"
          items={recs.projectsToBuild}
        />
        <RecommendationSection
          icon={<Award className="h-4 w-4 text-brand" />}
          title="Certifications"
          items={recs.certifications}
        />
        <RecommendationSection
          icon={<Code2 className="h-4 w-4 text-brand" />}
          title="Coding topics"
          items={recs.codingTopics}
        />
        <RecommendationSection
          icon={<MessagesSquare className="h-4 w-4 text-brand" />}
          title="Interview practice priorities"
          items={recs.interviewPracticePriorities}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to="/coding-interview">
          <Button variant="outline">
            <Terminal className="mr-2 h-4 w-4" /> Practice a real coding interview
          </Button>
        </Link>
        <Link to="/hr-interview">
          <Button variant="outline">
            <UserCheck className="mr-2 h-4 w-4" /> Practice a real HR interview
          </Button>
        </Link>
        <Link to="/resume-builder">
          <Button variant="outline">
            <FileEdit className="mr-2 h-4 w-4" /> Build & optimize your resume
          </Button>
        </Link>
        <Link to="/job-recommendations">
          <Button variant="outline">
            <Target className="mr-2 h-4 w-4" /> Find matching jobs
          </Button>
        </Link>
      </div>
    </div>
  );
}

function HistoryList({
  history,
  selectedId,
  onSelect,
}: {
  history: EligibilityReport[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="h-fit rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <History className="h-4 w-4 text-brand" /> History
      </div>
      <ul className="mt-3 space-y-2">
        {history.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onSelect(r.id)}
              className={`w-full rounded-xl border p-3 text-left text-xs transition ${
                r.id === selectedId
                  ? "border-brand/60 bg-brand-soft/40"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <div className="font-medium text-foreground">
                {r.target_role}
                {r.target_company ? ` @ ${r.target_company}` : ""}
              </div>
              <div className="mt-0.5 text-muted-foreground">
                {new Date(r.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
                <span>ATS {r.ats_score}%</span>
                <span>Eligibility {r.company_eligibility_score}%</span>
                <span>Readiness {r.estimated_interview_readiness}%</span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
