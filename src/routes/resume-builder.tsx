import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Sparkles,
  Loader2,
  FileText,
  Plus,
  Trash2,
  Download,
  Wand2,
  History,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Award,
  Search,
} from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { CompanySelector } from "@/components/interview/job/CompanySelector";
import {
  useResumeVersions,
  useResumeVersion,
  useResumeOptimizations,
  useCreateResumeVersion,
  useUpdateResumeVersionContent,
  useDeleteResumeVersion,
  useOptimizeResumeVersion,
  useApplyResumeOptimization,
  type ResumeVersion,
  type ResumeOptimization,
  type ResumeBuilderContent,
  type ResumeType,
} from "@/lib/resume-builder-client";

export const Route = createFileRoute("/resume-builder")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Resume Builder · Provn" },
      {
        name: "description",
        content:
          "Build and optimize multiple resume versions with AI — tailored to a target company, role, and job description.",
      },
    ],
  }),
  component: ResumeBuilderPage,
});

const RESUME_TYPES: { id: ResumeType; label: string }[] = [
  { id: "fresher", label: "Fresher" },
  { id: "experienced", label: "Experienced" },
  { id: "internship", label: "Internship" },
  { id: "ats_friendly", label: "ATS-Friendly" },
  { id: "company_specific", label: "Company-Specific" },
];

const RESUME_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  RESUME_TYPES.map((t) => [t.id, t.label]),
);

function ResumeBuilderPage() {
  const { data: user } = useCurrentUser();
  const { data: versions } = useResumeVersions(user?.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  if (selectedId) {
    return (
      <AppShell>
        <ResumeEditorPage
          versionId={selectedId}
          profileId={user?.id}
          onBack={() => setSelectedId(null)}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 no-print">
        <div>
          <h1 className="font-display text-4xl tracking-tight">Resume builder.</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Build and optimize as many resume versions as you like — one per company, per role, or
            just fresher vs. experienced. AI rewrites, scores, and gives section-by-section feedback
            every time you ask.
          </p>
        </div>
        <Button onClick={() => setShowCreate((v) => !v)}>
          <Plus className="mr-2 h-4 w-4" />
          {showCreate ? "Cancel" : "Create new resume"}
        </Button>
      </div>

      {showCreate && (
        <div className="mb-8">
          <CreateResumeForm
            profileId={user?.id}
            onCreated={(id) => {
              setSelectedId(id);
              setShowCreate(false);
            }}
          />
        </div>
      )}

      {!versions || versions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No resumes yet. Create one to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {versions.map((v) => (
            <VersionCard key={v.id} version={v} onOpen={() => setSelectedId(v.id)} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function VersionCard({ version, onOpen }: { version: ResumeVersion; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="rounded-2xl border border-border bg-card p-5 text-left transition hover:border-foreground/20 hover:shadow-sm"
    >
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <FileText className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <div className="truncate font-display text-lg leading-tight">{version.title}</div>
          <div className="text-xs text-muted-foreground">
            {RESUME_TYPE_LABEL[version.resume_type] ?? version.resume_type}
          </div>
        </div>
      </div>
      {(version.target_company || version.target_role) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {version.target_company && <Badge variant="outline">{version.target_company}</Badge>}
          {version.target_role && <Badge variant="outline">{version.target_role}</Badge>}
        </div>
      )}
      {version.ats_optimization_score != null && (
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>ATS {version.ats_optimization_score}%</span>
          <span>Quality {version.resume_quality_score}%</span>
          <span>Keywords {version.keyword_match_score}%</span>
        </div>
      )}
      <div className="mt-3 text-xs text-muted-foreground">
        Updated{" "}
        {new Date(version.updated_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </div>
    </button>
  );
}

function CreateResumeForm({
  profileId,
  onCreated,
}: {
  profileId: string | undefined;
  onCreated: (versionId: string) => void;
}) {
  const create = useCreateResumeVersion(profileId);
  const [title, setTitle] = useState("");
  const [resumeType, setResumeType] = useState<ResumeType>("fresher");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [role, setRole] = useState("");
  const [jdText, setJdText] = useState("");
  const [seedFromResume, setSeedFromResume] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!title.trim()) {
      setError("Give this resume a title.");
      return;
    }
    setError(null);
    const result = await create.mutateAsync({
      title: title.trim(),
      resumeType,
      targetCompany: companyId ?? undefined,
      targetRole: role.trim() || undefined,
      jobDescriptionText: jdText.trim() || undefined,
      seedFromResume,
    });
    if (result.error) setError(result.error);
    else if (result.versionId) onCreated(result.versionId);
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
      <div>
        <div className="mb-1.5 text-sm font-medium">Title</div>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Google Backend Developer Resume"
        />
      </div>

      <div>
        <div className="mb-1.5 text-sm font-medium">Resume type</div>
        <div className="flex flex-wrap gap-2">
          {RESUME_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setResumeType(t.id)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                resumeType === t.id
                  ? "border-brand/60 bg-brand-soft text-brand"
                  : "border-border text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 text-sm font-medium">
            Target company <span className="font-normal text-muted-foreground">(optional)</span>
          </div>
          <CompanySelector value={companyId} onChange={setCompanyId} />
        </div>
        <div>
          <div className="mb-1.5 text-sm font-medium">
            Target role <span className="font-normal text-muted-foreground">(optional)</span>
          </div>
          <Input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Backend Developer"
          />
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-sm font-medium">
          Job description <span className="font-normal text-muted-foreground">(optional)</span>
        </div>
        <Textarea
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          placeholder="Paste a job description to tailor optimization to it…"
          className="min-h-[100px]"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={seedFromResume} onCheckedChange={(c) => setSeedFromResume(c === true)} />
        Start from my uploaded resume (Resume Analyse)
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={handleCreate} disabled={create.isPending || !title.trim()}>
        {create.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="mr-2 h-4 w-4" />
        )}
        Create resume
      </Button>
    </div>
  );
}

function ResumeEditorPage({
  versionId,
  profileId,
  onBack,
}: {
  versionId: string;
  profileId: string | undefined;
  onBack: () => void;
}) {
  const { data: version } = useResumeVersion(versionId);
  const deleteVersion = useDeleteResumeVersion(profileId);

  if (!version) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading resume…
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 no-print">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All resumes
        </button>
        <Button
          variant="outline"
          onClick={async () => {
            await deleteVersion.mutateAsync(versionId);
            onBack();
          }}
          disabled={deleteVersion.isPending}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </Button>
      </div>
      <ResumeEditor key={version.id} version={version} profileId={profileId} />
    </div>
  );
}

function ResumeEditor({
  version,
  profileId,
}: {
  version: ResumeVersion;
  profileId: string | undefined;
}) {
  const updateContent = useUpdateResumeVersionContent(version.id);
  const optimize = useOptimizeResumeVersion(version.id);
  const applyOptimization = useApplyResumeOptimization(version.id);
  const { data: optimizations } = useResumeOptimizations(version.id);

  const [title, setTitle] = useState(version.title);
  const [content, setContent] = useState<ResumeBuilderContent>(
    version.content as unknown as ResumeBuilderContent,
  );
  const [targetCompany, setTargetCompany] = useState<string | null>(version.target_company);
  const [targetRole, setTargetRole] = useState(version.target_role ?? "");
  const [jdText, setJdText] = useState(version.job_description_text ?? "");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);
  const [selectedOptimizationId, setSelectedOptimizationId] = useState<string | null>(null);

  const selectedOptimization =
    optimizations?.find((o) => o.id === selectedOptimizationId) ?? optimizations?.[0] ?? null;

  async function handleSave() {
    await updateContent.mutateAsync({ title, content });
    setSaveMessage("Saved.");
    setTimeout(() => setSaveMessage(null), 2000);
  }

  async function handleOptimize() {
    setOptimizeError(null);
    const result = await optimize.mutateAsync({
      versionId: version.id,
      targetCompany: targetCompany ?? undefined,
      targetRole: targetRole.trim() || undefined,
      jobDescriptionText: jdText.trim() || undefined,
    });
    if (result.error) setOptimizeError(result.error);
    else if (result.optimizationId) setSelectedOptimizationId(result.optimizationId);
  }

  async function handleApply() {
    if (!selectedOptimization) return;
    await applyOptimization.mutateAsync(selectedOptimization.id);
    setContent((current) => {
      const merged = { ...current };
      if (selectedOptimization.rewritten_summary)
        merged.summary = selectedOptimization.rewritten_summary;
      const rewrittenExp =
        (selectedOptimization.rewritten_experience as unknown as {
          index: number;
          bullets: string[];
        }[]) ?? [];
      merged.experience = merged.experience.map((e, i) => {
        const r = rewrittenExp.find((x) => x.index === i);
        return r ? { ...e, bullets: r.bullets } : e;
      });
      const rewrittenProj =
        (selectedOptimization.rewritten_projects as unknown as {
          index: number;
          description: string;
          bullets: string[];
        }[]) ?? [];
      merged.projects = merged.projects.map((p, i) => {
        const r = rewrittenProj.find((x) => x.index === i);
        return r ? { ...p, description: r.description, bullets: r.bullets } : p;
      });
      merged.skills = Array.from(
        new Set([...merged.skills, ...(selectedOptimization.missing_skills ?? [])]),
      );
      merged.certifications = Array.from(
        new Set([
          ...merged.certifications,
          ...(selectedOptimization.recommended_certifications ?? []),
        ]),
      );
      return merged;
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <div className="no-print rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4 text-brand" /> Title
          </div>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-2" />
        </div>

        <OptimizePanel
          targetCompany={targetCompany}
          onTargetCompany={setTargetCompany}
          targetRole={targetRole}
          onTargetRole={setTargetRole}
          jdText={jdText}
          onJdText={setJdText}
          onOptimize={handleOptimize}
          optimizing={optimize.isPending}
          error={optimizeError}
        />

        {selectedOptimization && (
          <OptimizationResult
            optimization={selectedOptimization}
            onApply={handleApply}
            applying={applyOptimization.isPending}
          />
        )}

        <div className="no-print flex items-center gap-3">
          <Button onClick={handleSave} disabled={updateContent.isPending}>
            {updateContent.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Save changes
          </Button>
          {saveMessage && <span className="text-xs text-muted-foreground">{saveMessage}</span>}
          <Button variant="outline" onClick={() => window.print()} className="ml-auto">
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
        </div>

        <ContentEditor content={content} onChange={setContent} />

        <ResumePreview title={title} content={content} />
      </div>

      <div className="no-print space-y-6">
        {version.ats_optimization_score != null && (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <div className="text-sm font-semibold">Current scores</div>
            <MiniScoreBar label="ATS optimization" value={version.ats_optimization_score} />
            <MiniScoreBar label="Resume quality" value={version.resume_quality_score} />
            <MiniScoreBar label="Keyword match" value={version.keyword_match_score} />
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <History className="h-4 w-4 text-brand" /> Optimization history
          </div>
          <ul className="mt-3 space-y-2">
            {(optimizations ?? []).length === 0 && (
              <li className="text-xs text-muted-foreground">No optimizations run yet.</li>
            )}
            {(optimizations ?? []).map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => setSelectedOptimizationId(o.id)}
                  className={`w-full rounded-xl border p-3 text-left text-xs transition ${
                    (selectedOptimization?.id ?? optimizations?.[0]?.id) === o.id
                      ? "border-brand/60 bg-brand-soft/40"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>
                      {new Date(o.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    {o.applied && (
                      <Badge variant="secondary" className="text-[10px]">
                        Applied
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex gap-2 text-foreground">
                    <span>ATS {o.ats_optimization_score}%</span>
                    <span>Quality {o.resume_quality_score}%</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function MiniScoreBar({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null;
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span>{label}</span>
        <span className="text-muted-foreground">{value}%</span>
      </div>
      <Progress value={value} className="mt-1" />
    </div>
  );
}

function OptimizePanel({
  targetCompany,
  onTargetCompany,
  targetRole,
  onTargetRole,
  jdText,
  onJdText,
  onOptimize,
  optimizing,
  error,
}: {
  targetCompany: string | null;
  onTargetCompany: (v: string | null) => void;
  targetRole: string;
  onTargetRole: (v: string) => void;
  jdText: string;
  onJdText: (v: string) => void;
  onOptimize: () => void;
  optimizing: boolean;
  error: string | null;
}) {
  return (
    <div className="no-print rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Wand2 className="h-4 w-4 text-brand" /> Optimize with AI
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Rewrites your summary, bullets, and project descriptions; recommends missing skills and
        certifications; scores ATS optimization, resume quality, and keyword match.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-xs font-medium text-muted-foreground">Target company</div>
          <CompanySelector value={targetCompany} onChange={onTargetCompany} />
        </div>
        <div>
          <div className="mb-1 text-xs font-medium text-muted-foreground">Target role</div>
          <Input
            value={targetRole}
            onChange={(e) => onTargetRole(e.target.value)}
            placeholder="e.g. Backend Developer"
          />
        </div>
      </div>
      <div className="mt-3">
        <div className="mb-1 text-xs font-medium text-muted-foreground">
          Job description (optional)
        </div>
        <Textarea
          value={jdText}
          onChange={(e) => onJdText(e.target.value)}
          className="min-h-[80px]"
        />
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      <Button onClick={onOptimize} disabled={optimizing} className="mt-4">
        {optimizing ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="mr-2 h-4 w-4" />
        )}
        Optimize with AI
      </Button>
    </div>
  );
}

function OptimizationResult({
  optimization,
  onApply,
  applying,
}: {
  optimization: ResumeOptimization;
  onApply: () => void;
  applying: boolean;
}) {
  const feedback = (optimization.section_feedback as unknown as Record<string, string>) ?? {};
  return (
    <div className="no-print space-y-4 rounded-2xl border border-brand/30 bg-brand-soft/20 p-6">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Latest optimization result</div>
        {!optimization.applied && (
          <Button size="sm" onClick={onApply} disabled={applying}>
            {applying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Apply AI improvements
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MiniScoreBar label="ATS optimization" value={optimization.ats_optimization_score} />
        <MiniScoreBar label="Resume quality" value={optimization.resume_quality_score} />
        <MiniScoreBar label="Keyword match" value={optimization.keyword_match_score} />
      </div>

      {Object.keys(feedback).length > 0 && (
        <div className="space-y-1.5 text-xs">
          {Object.entries(feedback).map(([section, note]) => (
            <p key={section}>
              <span className="font-medium capitalize">{section}:</span>{" "}
              <span className="text-muted-foreground">{note}</span>
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5" /> Missing skills
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {(optimization.missing_skills ?? []).map((s) => (
              <Badge key={s} variant="destructive" className="text-[10px]">
                {s}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Award className="h-3.5 w-3.5" /> Recommended certifications
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {(optimization.recommended_certifications ?? []).map((c) => (
              <Badge key={c} variant="secondary" className="text-[10px]">
                {c}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Search className="h-3.5 w-3.5" /> Keyword suggestions
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {(optimization.keyword_suggestions ?? []).map((k) => (
              <Badge key={k} variant="outline" className="text-[10px]">
                {k}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Lightbulb className="h-3.5 w-3.5" /> Formatting suggestions
          </div>
          <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
            {(optimization.formatting_suggestions ?? []).map((f) => (
              <li key={f}>• {f}</li>
            ))}
          </ul>
        </div>
      </div>

      {optimization.rewritten_summary && (
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Rewritten summary
          </div>
          <p className="mt-1 text-sm">{optimization.rewritten_summary}</p>
        </div>
      )}
    </div>
  );
}

function ContentEditor({
  content,
  onChange,
}: {
  content: ResumeBuilderContent;
  onChange: (c: ResumeBuilderContent) => void;
}) {
  function set<K extends keyof ResumeBuilderContent>(key: K, value: ResumeBuilderContent[K]) {
    onChange({ ...content, [key]: value });
  }

  return (
    <div className="no-print space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="text-sm font-semibold">Contact</div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            placeholder="Full name"
            value={content.contact.name}
            onChange={(e) => set("contact", { ...content.contact, name: e.target.value })}
          />
          <Input
            placeholder="Email"
            value={content.contact.email}
            onChange={(e) => set("contact", { ...content.contact, email: e.target.value })}
          />
          <Input
            placeholder="Phone"
            value={content.contact.phone}
            onChange={(e) => set("contact", { ...content.contact, phone: e.target.value })}
          />
          <Input
            placeholder="Location"
            value={content.contact.location}
            onChange={(e) => set("contact", { ...content.contact, location: e.target.value })}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="text-sm font-semibold">Professional summary</div>
        <Textarea
          value={content.summary}
          onChange={(e) => set("summary", e.target.value)}
          className="mt-3 min-h-[100px]"
        />
      </div>

      <TagListEditor label="Skills" items={content.skills} onChange={(v) => set("skills", v)} />
      <TagListEditor
        label="Technologies"
        items={content.technologies}
        onChange={(v) => set("technologies", v)}
      />
      <TagListEditor
        label="Frameworks"
        items={content.frameworks}
        onChange={(v) => set("frameworks", v)}
      />

      <ExperienceEditor entries={content.experience} onChange={(v) => set("experience", v)} />
      <ProjectsEditor entries={content.projects} onChange={(v) => set("projects", v)} />
      <EducationEditor entries={content.education} onChange={(v) => set("education", v)} />

      <TagListEditor
        label="Certifications"
        items={content.certifications}
        onChange={(v) => set("certifications", v)}
      />
      <TagListEditor
        label="Languages"
        items={content.languages}
        onChange={(v) => set("languages", v)}
      />
    </div>
  );
}

function TagListEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="text-sm font-semibold">{label}</div>
      <Input
        value={items.join(", ")}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
        placeholder="Comma-separated"
        className="mt-3"
      />
    </div>
  );
}

function ExperienceEditor({
  entries,
  onChange,
}: {
  entries: ResumeBuilderContent["experience"];
  onChange: (v: ResumeBuilderContent["experience"]) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Experience</div>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            onChange([...entries, { title: "", company: "", duration: "", bullets: [] }])
          }
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Add
        </Button>
      </div>
      <div className="mt-3 space-y-4">
        {entries.map((entry, i) => (
          <div key={i} className="rounded-xl border border-border p-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Input
                placeholder="Title"
                value={entry.title}
                onChange={(e) =>
                  onChange(entries.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))
                }
              />
              <Input
                placeholder="Company"
                value={entry.company}
                onChange={(e) =>
                  onChange(entries.map((x, j) => (j === i ? { ...x, company: e.target.value } : x)))
                }
              />
              <Input
                placeholder="Duration"
                value={entry.duration}
                onChange={(e) =>
                  onChange(
                    entries.map((x, j) => (j === i ? { ...x, duration: e.target.value } : x)),
                  )
                }
              />
            </div>
            <Textarea
              placeholder="One bullet point per line"
              value={entry.bullets.join("\n")}
              onChange={(e) =>
                onChange(
                  entries.map((x, j) =>
                    j === i ? { ...x, bullets: e.target.value.split("\n") } : x,
                  ),
                )
              }
              className="mt-2 min-h-[80px]"
            />
            <Button
              size="sm"
              variant="ghost"
              className="mt-2 text-destructive"
              onClick={() => onChange(entries.filter((_, j) => j !== i))}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectsEditor({
  entries,
  onChange,
}: {
  entries: ResumeBuilderContent["projects"];
  onChange: (v: ResumeBuilderContent["projects"]) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Projects</div>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            onChange([...entries, { name: "", description: "", bullets: [], technologies: [] }])
          }
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Add
        </Button>
      </div>
      <div className="mt-3 space-y-4">
        {entries.map((entry, i) => (
          <div key={i} className="rounded-xl border border-border p-4">
            <Input
              placeholder="Project name"
              value={entry.name}
              onChange={(e) =>
                onChange(entries.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
              }
            />
            <Input
              placeholder="Short description"
              value={entry.description}
              onChange={(e) =>
                onChange(
                  entries.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)),
                )
              }
              className="mt-2"
            />
            <Textarea
              placeholder="One bullet point per line"
              value={entry.bullets.join("\n")}
              onChange={(e) =>
                onChange(
                  entries.map((x, j) =>
                    j === i ? { ...x, bullets: e.target.value.split("\n") } : x,
                  ),
                )
              }
              className="mt-2 min-h-[80px]"
            />
            <Input
              placeholder="Technologies (comma-separated)"
              value={entry.technologies.join(", ")}
              onChange={(e) =>
                onChange(
                  entries.map((x, j) =>
                    j === i
                      ? {
                          ...x,
                          technologies: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        }
                      : x,
                  ),
                )
              }
              className="mt-2"
            />
            <Button
              size="sm"
              variant="ghost"
              className="mt-2 text-destructive"
              onClick={() => onChange(entries.filter((_, j) => j !== i))}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function EducationEditor({
  entries,
  onChange,
}: {
  entries: ResumeBuilderContent["education"];
  onChange: (v: ResumeBuilderContent["education"]) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Education</div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onChange([...entries, { institution: "", degree: "", years: "" }])}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Add
        </Button>
      </div>
      <div className="mt-3 space-y-3">
        {entries.map((entry, i) => (
          <div
            key={i}
            className="grid grid-cols-1 gap-2 rounded-xl border border-border p-4 sm:grid-cols-4"
          >
            <Input
              placeholder="Institution"
              value={entry.institution}
              className="sm:col-span-2"
              onChange={(e) =>
                onChange(
                  entries.map((x, j) => (j === i ? { ...x, institution: e.target.value } : x)),
                )
              }
            />
            <Input
              placeholder="Degree"
              value={entry.degree}
              onChange={(e) =>
                onChange(entries.map((x, j) => (j === i ? { ...x, degree: e.target.value } : x)))
              }
            />
            <div className="flex gap-2">
              <Input
                placeholder="Years"
                value={entry.years}
                onChange={(e) =>
                  onChange(entries.map((x, j) => (j === i ? { ...x, years: e.target.value } : x)))
                }
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onChange(entries.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResumePreview({ title, content }: { title: string; content: ResumeBuilderContent }) {
  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #resume-print-area, #resume-print-area * { visibility: visible; }
          #resume-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div
        id="resume-print-area"
        className="rounded-2xl border border-border bg-white p-8 text-slate-900 shadow-sm"
      >
        <h2 className="text-center font-display text-2xl font-bold">
          {content.contact.name || title}
        </h2>
        <p className="mt-1 text-center text-xs text-slate-600">
          {[content.contact.email, content.contact.phone, content.contact.location]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {content.contact.links.length > 0 && (
          <p className="mt-0.5 text-center text-xs text-slate-500">
            {content.contact.links.join(" · ")}
          </p>
        )}

        {content.summary && (
          <PreviewSection title="Summary">
            <p className="text-sm">{content.summary}</p>
          </PreviewSection>
        )}

        {(content.skills.length > 0 ||
          content.technologies.length > 0 ||
          content.frameworks.length > 0) && (
          <PreviewSection title="Skills">
            <p className="text-sm">
              {[...content.skills, ...content.technologies, ...content.frameworks].join(", ")}
            </p>
          </PreviewSection>
        )}

        {content.experience.length > 0 && (
          <PreviewSection title="Experience">
            {content.experience.map((e, i) => (
              <div key={i} className="mb-3">
                <div className="flex items-baseline justify-between text-sm font-semibold">
                  <span>
                    {e.title}
                    {e.company ? ` — ${e.company}` : ""}
                  </span>
                  <span className="text-xs font-normal text-slate-500">{e.duration}</span>
                </div>
                <ul className="mt-1 list-disc pl-5 text-sm">
                  {e.bullets.filter(Boolean).map((b, bi) => (
                    <li key={bi}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </PreviewSection>
        )}

        {content.projects.length > 0 && (
          <PreviewSection title="Projects">
            {content.projects.map((p, i) => (
              <div key={i} className="mb-3">
                <div className="text-sm font-semibold">{p.name}</div>
                {p.description && <p className="text-sm">{p.description}</p>}
                <ul className="mt-1 list-disc pl-5 text-sm">
                  {p.bullets.filter(Boolean).map((b, bi) => (
                    <li key={bi}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </PreviewSection>
        )}

        {content.education.length > 0 && (
          <PreviewSection title="Education">
            {content.education.map((e, i) => (
              <div key={i} className="flex items-baseline justify-between text-sm">
                <span>
                  {e.degree}, {e.institution}
                </span>
                <span className="text-xs text-slate-500">{e.years}</span>
              </div>
            ))}
          </PreviewSection>
        )}

        {content.certifications.length > 0 && (
          <PreviewSection title="Certifications">
            <p className="text-sm">{content.certifications.join(", ")}</p>
          </PreviewSection>
        )}

        {content.languages.length > 0 && (
          <PreviewSection title="Languages">
            <p className="text-sm">{content.languages.join(", ")}</p>
          </PreviewSection>
        )}
      </div>
    </>
  );
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 border-t border-slate-200 pt-3">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
