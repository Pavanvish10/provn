import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Flame,
  MapPin,
  Link as LinkIcon,
  Github,
  Linkedin,
  Plus,
  ShieldCheck,
  Check,
  Trophy,
  FileText,
  Download,
  Eye,
  RefreshCcw,
  Trash2,
  Loader2,
  X,
  Award,
  Sparkles,
  Rocket,
  Globe,
} from "lucide-react";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUser, invalidateCurrentUser } from "@/lib/auth-client";
import { requireAuth } from "@/lib/auth-guard";
import { useProfile, useUpdateProfile, uploadAvatar } from "@/lib/profile-client";
import {
  useCurrentResume,
  useUploadResume,
  useDeleteResume,
  getSignedResumeUrl,
  ACCEPTED_RESUME_MIME_TYPES,
  type Resume,
} from "@/lib/resume-client";
import {
  useEducation,
  useAddEducation,
  useDeleteEducation,
  useExperience,
  useAddExperience,
  useDeleteExperience,
  useProjects,
  useAddProject,
  useDeleteProject,
  useAchievements,
  useSkills,
  useAddSkill,
  useDeleteSkill,
  useLeaderboardRank,
  type Project,
  type Skill,
} from "@/lib/profile-sections-client";

export const Route = createFileRoute("/profile")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "My profile · Provn" },
      {
        name: "description",
        content: "Your public Provn profile — verified skills, projects, and streak.",
      },
      { property: "og:title", content: "My profile · Provn" },
      { property: "og:description", content: "Proof of skill, in one place." },
    ],
  }),
  component: Me,
});

function Me() {
  const { data: user } = useCurrentUser();
  const { data: profile } = useProfile(user?.id);
  const { data: resume } = useCurrentResume(user?.id);
  const { data: education } = useEducation(user?.id);
  const { data: experience } = useExperience(user?.id);
  const { data: projects } = useProjects(user?.id);
  const { data: achievements } = useAchievements(user?.id);
  const { data: skills } = useSkills(user?.id);
  const { data: rank } = useLeaderboardRank(user?.id, profile?.xp);
  const deleteExperience = useDeleteExperience(user?.id);
  const deleteEducation = useDeleteEducation(user?.id);

  const [editOpen, setEditOpen] = useState(false);
  const [addSkillOpen, setAddSkillOpen] = useState(false);
  const [addEduOpen, setAddEduOpen] = useState(false);
  const [addExpOpen, setAddExpOpen] = useState(false);
  const [addProjectOpen, setAddProjectOpen] = useState(false);

  if (!profile) {
    return (
      <AppShell>
        <div className="py-24 text-center text-sm text-muted-foreground">Loading profile…</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Cover */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-brand-soft to-background p-6 sm:p-10">
        <div className="absolute inset-0 grid-dots opacity-50" />
        <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-6 sm:flex sm:flex-wrap">
          <div className="flex min-w-0 items-start gap-5">
            <div className="shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  className="h-24 w-24 rounded-full border-4 border-background bg-muted object-cover"
                  alt=""
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-background bg-muted font-display text-2xl">
                  {(profile.full_name ?? "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-xs">
                <Flame className="h-3 w-3 text-brand" /> {profile.streak} day streak
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-4xl tracking-tight">
                {profile.full_name || "Your name"}
              </h1>
              <div className="mt-1 text-sm text-muted-foreground">
                {profile.username ? `@${profile.username}` : ""}
                {profile.target_role ? ` · ${profile.target_role}` : ""}
              </div>
              {profile.bio && (
                <p className="mt-2 max-w-lg text-sm text-muted-foreground">{profile.bio}</p>
              )}
              {profile.persona === "founder" && profile.founder_company_name && (
                <div className="mt-3 rounded-lg border border-border bg-card/60 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Rocket className="h-4 w-4 text-brand" />
                    <span className="font-medium">{profile.founder_company_name}</span>
                    {profile.founder_startup_stage && (
                      <Badge variant="secondary">{profile.founder_startup_stage}</Badge>
                    )}
                    {profile.founder_industry && (
                      <Badge variant="secondary">{profile.founder_industry}</Badge>
                    )}
                  </div>
                  {profile.founder_company_description && (
                    <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                      {profile.founder_company_description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {profile.founder_company_website && (
                      <a
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        href={profile.founder_company_website}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Globe className="h-3.5 w-3.5" /> Website
                      </a>
                    )}
                    {profile.founder_company_linkedin && (
                      <a
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        href={profile.founder_company_linkedin}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Linkedin className="h-3.5 w-3.5" /> Company LinkedIn
                      </a>
                    )}
                  </div>
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {profile.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {profile.location}
                  </span>
                )}
                {profile.github_url && (
                  <a
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    href={profile.github_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Github className="h-3.5 w-3.5" /> GitHub
                  </a>
                )}
                {profile.linkedin_url && (
                  <a
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    href={profile.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                  </a>
                )}
                {profile.portfolio_url && (
                  <a
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    href={profile.portfolio_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <LinkIcon className="h-3.5 w-3.5" /> Portfolio
                  </a>
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
                <Stat label="XP" value={profile.xp} />
                <Stat label="Rank" value={rank ? `#${rank}` : "—"} />
                <Stat
                  label="Verified skills"
                  value={skills?.filter((s) => s.verified).length ?? 0}
                />
              </div>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              Edit profile
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <ResumeSection profileId={user?.id} resume={resume} />

          <Section title="Experience" action={<IconAdd onClick={() => setAddExpOpen(true)} />}>
            {experience && experience.length > 0 ? (
              <Timeline
                items={experience.map((e) => ({
                  id: e.id,
                  role: e.title,
                  org: e.company_name,
                  period: `${e.start_date ?? ""}${e.is_current ? " – present" : e.end_date ? ` – ${e.end_date}` : ""}`,
                  d: e.description ?? "",
                }))}
                onDelete={(id) => deleteExperience.mutate(id)}
              />
            ) : (
              <Empty text="No experience added yet." />
            )}
          </Section>

          <Section title="Education" action={<IconAdd onClick={() => setAddEduOpen(true)} />}>
            {education && education.length > 0 ? (
              <Timeline
                items={education.map((e) => ({
                  id: e.id,
                  role: `${e.degree ?? ""}${e.field ? ` · ${e.field}` : ""}`,
                  org: e.institution,
                  period: `${e.start_year ?? ""}${e.end_year ? ` – ${e.end_year}` : ""}`,
                  d: e.description ?? "",
                }))}
                onDelete={(id) => deleteEducation.mutate(id)}
              />
            ) : (
              <Empty text="No education added yet." />
            )}
          </Section>

          <Section title="Projects" action={<IconAdd onClick={() => setAddProjectOpen(true)} />}>
            {projects && projects.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {projects.map((p) => (
                  <ProjectCard key={p.id} project={p} profileId={user?.id} />
                ))}
              </div>
            ) : (
              <Empty text="No projects added yet." />
            )}
          </Section>

          <Section title="Achievements">
            {achievements && achievements.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {achievements.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
                  >
                    <Award className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <div>
                      <div className="font-medium">{a.title}</div>
                      {a.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty text="Achievements unlock automatically as you complete challenges, interviews, and streaks." />
            )}
          </Section>
        </div>

        {/* Verified skills */}
        <aside className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brand" />
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Skills</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills?.map((sk) => (
                <SkillBadge key={sk.id} skill={sk} profileId={user?.id} />
              ))}
              {(!skills || skills.length === 0) && (
                <span className="text-xs text-muted-foreground">
                  None yet. Add your first skill →
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 w-full"
              onClick={() => setAddSkillOpen(true)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add skill
            </Button>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Skills become <span className="text-foreground">verified</span> by passing a coding
              challenge in that category.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <Trophy className="h-4 w-4 text-brand" /> Leaderboard
            </div>
            <div className="font-display text-2xl">{rank ? `#${rank}` : "Unranked"}</div>
            <p className="mt-1 text-xs text-muted-foreground">{profile.xp} XP earned so far.</p>
          </div>
        </aside>
      </div>

      <EditProfileDialog open={editOpen} onOpenChange={setEditOpen} userId={user?.id} />
      <AddSkillDialog
        open={addSkillOpen}
        onOpenChange={setAddSkillOpen}
        profileId={user?.id}
        existing={skills ?? []}
      />
      <AddEducationDialog open={addEduOpen} onOpenChange={setAddEduOpen} profileId={user?.id} />
      <AddExperienceDialog open={addExpOpen} onOpenChange={setAddExpOpen} profileId={user?.id} />
      <AddProjectDialog
        open={addProjectOpen}
        onOpenChange={setAddProjectOpen}
        profileId={user?.id}
      />
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-1.5">
      <span className="font-display text-base text-foreground">{value}</span>{" "}
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function IconAdd({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick}>
      <Plus className="mr-1 h-3.5 w-3.5" /> Add
    </Button>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

function Timeline({
  items,
  onDelete,
}: {
  items: { id: string; role: string; org: string; period: string; d: string }[];
  onDelete: (id: string) => void;
}) {
  return (
    <ol className="relative space-y-6 border-l border-border pl-5">
      {items.map((it) => (
        <li key={it.id} className="group relative">
          <span className="absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand" />
          <div className="flex flex-wrap items-baseline gap-x-2">
            <div className="font-medium">{it.role}</div>
            <div className="text-sm text-muted-foreground">· {it.org}</div>
            <div className="ml-auto text-xs text-muted-foreground">{it.period}</div>
            <button
              onClick={() => onDelete(it.id)}
              className="text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
              aria-label="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          {it.d && <p className="mt-1 text-sm text-muted-foreground">{it.d}</p>}
        </li>
      ))}
    </ol>
  );
}

function ProjectCard({ project, profileId }: { project: Project; profileId: string | undefined }) {
  const deleteProject = useDeleteProject(profileId);
  return (
    <div className="group relative rounded-xl border border-border bg-card p-4">
      <button
        onClick={() => deleteProject.mutate(project.id)}
        className="absolute right-3 top-3 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
        aria-label="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      {project.tags?.length > 0 && (
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          {project.tags.join(" · ")}
        </div>
      )}
      <div className="font-display text-lg">{project.title}</div>
      {project.description && (
        <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
      )}
      {project.project_url && (
        <a
          href={project.project_url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-xs text-brand hover:underline"
        >
          View project →
        </a>
      )}
    </div>
  );
}

function SkillBadge({ skill, profileId }: { skill: Skill; profileId: string | undefined }) {
  const deleteSkill = useDeleteSkill(profileId);
  return (
    <Badge className="group gap-1 bg-brand-soft text-foreground hover:bg-brand-soft">
      {skill.verified && <Check className="h-3 w-3 text-brand" />}
      {skill.skill_name}
      <button
        onClick={() => deleteSkill.mutate(skill.id)}
        aria-label="Remove skill"
        className="ml-0.5"
      >
        <X className="h-3 w-3 opacity-50 hover:opacity-100" />
      </button>
    </Badge>
  );
}

function ResumeSection({
  profileId,
  resume,
}: {
  profileId: string | undefined;
  resume: Resume | null | undefined;
}) {
  const uploadResume = useUploadResume(profileId);
  const deleteResume = useDeleteResume(profileId);
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const analysis = resume?.analysis as
    { skills?: string[]; ats_feedback?: string[] } | null | undefined;

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_RESUME_MIME_TYPES.has(file.type)) {
      setNote("Please upload a PDF or Word document (.pdf, .doc, .docx).");
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      const { analysisError } = await uploadResume.mutateAsync(file);
      if (analysisError) setNote(analysisError);
    } catch {
      setNote("Upload failed. Try again.");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const view = async () => {
    if (!resume?.storage_path) return;
    const url = await getSignedResumeUrl(resume.storage_path);
    window.open(url, "_blank");
  };

  return (
    <Section
      title="Resume"
      action={
        <Button variant="outline" size="sm" asChild>
          <Link to="/live-resume">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" /> View Live Resume
          </Link>
        </Button>
      }
    >
      <input
        ref={fileInput}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={onFile}
      />
      {resume ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background p-4">
            <FileText className="h-8 w-8 shrink-0 text-brand" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{resume.file_name ?? "Resume.pdf"}</div>
              <div className="text-xs text-muted-foreground">
                v{resume.version} · uploaded{" "}
                {resume.created_at ? new Date(resume.created_at).toLocaleDateString() : "—"}
                {resume.ats_score !== null && ` · ATS score ${resume.ats_score}/100`}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={view}>
                <Eye className="mr-1 h-3.5 w-3.5" /> View
              </Button>
              <Button size="sm" variant="outline" onClick={view}>
                <Download className="mr-1 h-3.5 w-3.5" /> Download
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => fileInput.current?.click()}
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCcw className="mr-1 h-3.5 w-3.5" />
                )}
                Replace
              </Button>
              <Button size="sm" variant="outline" onClick={() => deleteResume.mutate(resume)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
          {analysis?.ats_feedback && analysis.ats_feedback.length > 0 && (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {analysis.ats_feedback.map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" /> {f}
                </li>
              ))}
            </ul>
          )}
          {note && <p className="text-sm text-muted-foreground">{note}</p>}
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border p-6">
          <p className="text-sm text-muted-foreground">No resume on file yet.</p>
          <Button size="sm" disabled={busy} onClick={() => fileInput.current?.click()}>
            {busy ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileText className="mr-1.5 h-3.5 w-3.5" />
            )}
            Upload resume
          </Button>
          {note && <p className="text-sm text-destructive">{note}</p>}
        </div>
      )}
    </Section>
  );
}

function EditProfileDialog({
  open,
  onOpenChange,
  userId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string | undefined;
}) {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile(userId);
  const updateProfile = useUpdateProfile(userId);
  const fileInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);

  const isFounder = profile?.persona === "founder";

  if (profile && hydratedFor !== profile.id && open) {
    setForm({
      full_name: profile.full_name ?? "",
      username: profile.username ?? "",
      ...(isFounder
        ? {
            founder_company_name: profile.founder_company_name ?? "",
            founder_company_website: profile.founder_company_website ?? "",
            founder_company_linkedin: profile.founder_company_linkedin ?? "",
            founder_startup_stage: profile.founder_startup_stage ?? "",
            founder_industry: profile.founder_industry ?? "",
            founder_company_description: profile.founder_company_description ?? "",
          }
        : {
            college: profile.college ?? "",
            degree: profile.degree ?? "",
            branch: profile.branch ?? "",
          }),
      target_role: profile.target_role ?? "",
      location: profile.location ?? "",
      github_url: profile.github_url ?? "",
      linkedin_url: profile.linkedin_url ?? "",
      portfolio_url: profile.portfolio_url ?? "",
      bio: profile.bio ?? "",
    });
    setAvatarUrl(profile.avatar_url);
    setHydratedFor(profile.id);
  }

  const onAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    const url = await uploadAvatar(userId, file);
    setAvatarUrl(url);
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile.mutateAsync({ ...form, avatar_url: avatarUrl });
      await invalidateCurrentUser(queryClient);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Edit profile</DialogTitle>
          <DialogDescription>Update what recruiters and peers see.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted"
            >
              {avatarUrl ? (
                <img src={avatarUrl} className="h-full w-full object-cover" alt="" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onAvatarPick}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInput.current?.click()}
            >
              Change photo
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(
              [
                ["full_name", "Full name"],
                ["username", "Username"],
                ...(isFounder
                  ? ([
                      ["founder_company_name", "Company name"],
                      ["founder_company_website", "Company website"],
                      ["founder_company_linkedin", "Company LinkedIn"],
                      ["founder_startup_stage", "Startup stage"],
                      ["founder_industry", "Industry"],
                    ] as const)
                  : ([
                      ["college", "College"],
                      ["degree", "Degree"],
                      ["branch", "Branch"],
                    ] as const)),
                ["target_role", "Target role"],
                ["location", "Location"],
                ["github_url", "GitHub URL"],
                ["linkedin_url", "LinkedIn URL"],
                ["portfolio_url", "Portfolio URL"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <Label className="text-xs text-muted-foreground">{label}</Label>
                <Input
                  className="mt-1"
                  value={form[key] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          {isFounder && (
            <div>
              <Label className="text-xs text-muted-foreground">Company description</Label>
              <Textarea
                className="mt-1"
                rows={3}
                value={form.founder_company_description ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, founder_company_description: e.target.value }))
                }
              />
            </div>
          )}
          <div>
            <Label className="text-xs text-muted-foreground">Bio</Label>
            <Textarea
              className="mt-1"
              rows={3}
              value={form.bio ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddSkillDialog({
  open,
  onOpenChange,
  profileId,
  existing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profileId: string | undefined;
  existing: { skill_name: string | null }[];
}) {
  const addSkill = useAddSkill(profileId);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) return;
    if (existing.some((s) => s.skill_name?.toLowerCase() === name.trim().toLowerCase())) {
      setError("You already have that skill.");
      return;
    }
    await addSkill.mutateAsync(name);
    setName("");
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add a skill</DialogTitle>
          <DialogDescription>
            It appears as unverified until you pass a coding challenge in that category.
          </DialogDescription>
        </DialogHeader>
        <Input
          placeholder="e.g. TypeScript"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddEducationDialog({
  open,
  onOpenChange,
  profileId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profileId: string | undefined;
}) {
  const addEducation = useAddEducation(profileId);
  const [institution, setInstitution] = useState("");
  const [degree, setDegree] = useState("");
  const [field, setField] = useState("");
  const [startYear, setStartYear] = useState("");
  const [endYear, setEndYear] = useState("");
  const [description, setDescription] = useState("");

  const submit = async () => {
    if (!institution.trim()) return;
    await addEducation.mutateAsync({
      institution: institution.trim(),
      degree: degree.trim() || null,
      field: field.trim() || null,
      start_year: startYear ? Number(startYear) : null,
      end_year: endYear ? Number(endYear) : null,
      description: description.trim() || null,
    });
    setInstitution("");
    setDegree("");
    setField("");
    setStartYear("");
    setEndYear("");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add education</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Institution"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Degree"
              value={degree}
              onChange={(e) => setDegree(e.target.value)}
            />
            <Input
              placeholder="Field of study"
              value={field}
              onChange={(e) => setField(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              placeholder="Start year"
              value={startYear}
              onChange={(e) => setStartYear(e.target.value)}
            />
            <Input
              type="number"
              placeholder="End year"
              value={endYear}
              onChange={(e) => setEndYear(e.target.value)}
            />
          </div>
          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddExperienceDialog({
  open,
  onOpenChange,
  profileId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profileId: string | undefined;
}) {
  const addExperience = useAddExperience(profileId);
  const [companyName, setCompanyName] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCurrent, setIsCurrent] = useState(false);
  const [description, setDescription] = useState("");

  const submit = async () => {
    if (!companyName.trim() || !title.trim()) return;
    await addExperience.mutateAsync({
      company_name: companyName.trim(),
      title: title.trim(),
      location: location.trim() || null,
      start_date: startDate || null,
      end_date: isCurrent ? null : endDate || null,
      is_current: isCurrent,
      description: description.trim() || null,
    });
    setCompanyName("");
    setTitle("");
    setLocation("");
    setStartDate("");
    setEndDate("");
    setIsCurrent(false);
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add experience</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Job title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input
            placeholder="Company"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
          <Input
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input
              type="date"
              value={endDate}
              disabled={isCurrent}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={isCurrent}
              onChange={(e) => setIsCurrent(e.target.checked)}
            />
            I currently work here
          </label>
          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddProjectDialog({
  open,
  onOpenChange,
  profileId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profileId: string | undefined;
}) {
  const addProject = useAddProject(profileId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [tags, setTags] = useState("");

  const submit = async () => {
    if (!title.trim()) return;
    await addProject.mutateAsync({
      title: title.trim(),
      description: description.trim() || null,
      project_url: url.trim() || null,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
    setTitle("");
    setDescription("");
    setUrl("");
    setTags("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add project</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Project title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Input
            placeholder="Project URL (optional)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Input
            placeholder="Tags, comma separated"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
