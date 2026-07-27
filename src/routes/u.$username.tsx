import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Flame,
  MapPin,
  Github,
  Linkedin,
  Link as LinkIcon,
  Check,
  ShieldCheck,
  MessageSquare,
  UserPlus,
  Clock,
  Users,
} from "lucide-react";
import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  useEducation,
  useExperience,
  useProjects,
  useAchievements,
  useSkills,
  useLeaderboardRank,
} from "@/lib/profile-sections-client";
import { useSendFriendRequest } from "@/lib/friends-client";

export const Route = createFileRoute("/u/$username")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "Profile · Provn" }] }),
  component: PublicProfile,
});

function useProfileByUsername(username: string) {
  return useQuery({
    queryKey: ["public-profile", username],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .ilike("username", username)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function useRelationship(meId: string | undefined, otherId: string | undefined) {
  return useQuery({
    queryKey: ["relationship", meId, otherId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("friendships")
        .select("*")
        .or(
          `and(requester_id.eq.${meId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${meId})`,
        )
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!meId && !!otherId && meId !== otherId,
  });
}

function PublicProfile() {
  const { username } = Route.useParams();
  const { data: me } = useCurrentUser();
  const { data: profile, isLoading } = useProfileByUsername(username);
  const { data: education } = useEducation(profile?.id);
  const { data: experience } = useExperience(profile?.id);
  const { data: projects } = useProjects(profile?.id);
  const { data: achievements } = useAchievements(profile?.id);
  const { data: skills } = useSkills(profile?.id);
  const { data: rank } = useLeaderboardRank(profile?.id, profile?.xp ?? undefined);
  const { data: relationship } = useRelationship(me?.id, profile?.id);
  const sendFriendRequest = useSendFriendRequest(me?.id);

  if (isLoading) {
    return (
      <AppShell>
        <div className="py-24 text-center text-sm text-muted-foreground">Loading profile…</div>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No user found at @{username}.
        </div>
      </AppShell>
    );
  }

  if (me && profile.id === me.id) {
    return <Navigate to="/profile" />;
  }

  return (
    <AppShell>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-brand-soft to-background p-6 sm:p-10">
        <div className="absolute inset-0 grid-dots opacity-50" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="flex min-w-0 items-start gap-5">
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
            <div className="min-w-0">
              <h1 className="font-display text-4xl tracking-tight">
                {profile.full_name || "Provn user"}
              </h1>
              <div className="mt-1 text-sm text-muted-foreground">
                {profile.username ? `@${profile.username}` : ""}
                {profile.target_role ? ` · ${profile.target_role}` : ""}
              </div>
              {profile.bio && (
                <p className="mt-2 max-w-lg text-sm text-muted-foreground">{profile.bio}</p>
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
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                <Stat label="XP" value={profile.xp} />
                <Stat label="Rank" value={rank ? `#${rank}` : "—"} />
                <Stat label="Streak" value={`${profile.streak}d`} />
              </div>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button asChild variant="outline">
              <Link to="/messages" search={{ to: profile.id }}>
                <MessageSquare className="mr-1.5 h-4 w-4" /> Message
              </Link>
            </Button>
            {relationship?.status === "accepted" ? (
              <Button variant="outline" disabled>
                <Users className="mr-1.5 h-4 w-4" /> Friends
              </Button>
            ) : relationship?.status === "pending" ? (
              <Button variant="outline" disabled>
                <Clock className="mr-1.5 h-4 w-4" /> Request pending
              </Button>
            ) : (
              <Button
                onClick={() => sendFriendRequest.mutate(profile.id)}
                disabled={sendFriendRequest.isPending}
              >
                <UserPlus className="mr-1.5 h-4 w-4" /> Add friend
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Section title="Experience">
            {experience && experience.length > 0 ? (
              <ol className="relative space-y-6 border-l border-border pl-5">
                {experience.map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand" />
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <div className="font-medium">{e.title}</div>
                      <div className="text-sm text-muted-foreground">· {e.company_name}</div>
                    </div>
                    {e.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{e.description}</p>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <Empty text="No experience listed." />
            )}
          </Section>

          <Section title="Education">
            {education && education.length > 0 ? (
              <ol className="relative space-y-6 border-l border-border pl-5">
                {education.map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand" />
                    <div className="font-medium">{e.institution}</div>
                    <div className="text-sm text-muted-foreground">
                      {e.degree}
                      {e.field ? ` · ${e.field}` : ""}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <Empty text="No education listed." />
            )}
          </Section>

          <Section title="Projects">
            {projects && projects.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {projects.map((p) => (
                  <div key={p.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="font-display text-lg">{p.title}</div>
                    {p.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                    )}
                    {p.project_url && (
                      <a
                        href={p.project_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-xs text-brand hover:underline"
                      >
                        View project →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Empty text="No projects listed." />
            )}
          </Section>

          <Section title="Achievements">
            {achievements && achievements.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {achievements.map((a) => (
                  <div key={a.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="font-medium">{a.title}</div>
                    {a.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Empty text="No achievements yet." />
            )}
          </Section>
        </div>

        <aside>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brand" />
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Skills</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills?.map((sk) => (
                <Badge
                  key={sk.id}
                  className="gap-1 bg-brand-soft text-foreground hover:bg-brand-soft"
                >
                  {sk.verified && <Check className="h-3 w-3 text-brand" />}
                  {sk.skill_name}
                </Badge>
              ))}
              {(!skills || skills.length === 0) && (
                <span className="text-xs text-muted-foreground">No skills listed yet.</span>
              )}
            </div>
          </div>
        </aside>
      </div>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="mb-4 font-display text-xl">{title}</h2>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}
