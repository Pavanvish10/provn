import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppNav";
import { useRef, useState } from "react";
import {
  Heart,
  MessageCircle,
  ImagePlus,
  Send,
  Flame,
  TrendingUp,
  Trophy,
  Briefcase,
  ArrowRight,
  Loader2,
  X,
  Search,
  UserPlus,
  MapPin,
  Bookmark,
  Share2,
  Building2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/lib/auth-client";
import { requireAuth } from "@/lib/auth-guard";
import { useProfile } from "@/lib/profile-client";
import { useSkills, useLeaderboardRank } from "@/lib/profile-sections-client";
import {
  useFeed,
  useCreatePost,
  useToggleLike,
  useComments,
  useAddComment,
  useTopStreaks,
  uploadPostImage,
  type FeedPost,
  type JobPostMetadata,
} from "@/lib/posts-client";
import { useSuggestedPeople, useSendFriendRequest } from "@/lib/friends-client";
import { formatTimeAgo } from "@/lib/utils";
import { useJobById, useIsJobSaved, useSaveJob, useUnsaveJob } from "@/lib/jobs-client";

export const Route = createFileRoute("/home")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Home · Provn" },
      {
        name: "description",
        content: "Your feed: projects, streaks, and posts from the Provn community.",
      },
      { property: "og:title", content: "Home · Provn" },
      { property: "og:description", content: "The feed for people who prove their work." },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: user } = useCurrentUser();
  const { data: profile } = useProfile(user?.id);

  return (
    <AppShell>
      <div className="mb-6 max-w-xl">
        <SearchBox />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr_300px]">
        {/* Left rail */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-4">
            <MiniProfile />
            <Card title="Your streak" icon={<Flame className="h-4 w-4 text-brand" />}>
              <div className="font-display text-4xl">{profile?.streak ?? 0}</div>
              <div className="text-xs text-muted-foreground">
                days · solve challenges today to keep it alive
              </div>
            </Card>
          </div>
        </aside>

        {/* Feed */}
        <Feed userId={user?.id} />

        {/* Right rail */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-4">
            <Link
              to="/business"
              className="group block rounded-2xl border border-border bg-gradient-to-br from-brand-soft to-card p-4 transition hover:border-brand/60"
            >
              <div className="flex items-center gap-2">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-foreground">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  For companies
                </div>
              </div>
              <div className="mt-3 font-display text-lg leading-tight">Business</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Post jobs, hire from a verified pool, and reach the Provn community.
              </p>
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand">
                Open Business Hub{" "}
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </div>
            </Link>
            <StreakLeaderboardCard />
            <SuggestedPeopleCard userId={user?.id} targetRole={profile?.target_role} />
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function SearchBox() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) navigate({ to: "/search", search: { q: q.trim() } });
      }}
      className="relative"
    >
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search people, posts, skills, jobs…"
        className="h-11 pl-10"
      />
    </form>
  );
}

function Feed({ userId }: { userId: string | undefined }) {
  const feed = useFeed(userId);
  const posts = feed.data?.pages.flatMap((p) => p.posts) ?? [];

  return (
    <div className="min-w-0 space-y-4">
      <Composer userId={userId} />

      {feed.isLoading && (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading feed…</div>
      )}

      {!feed.isLoading && posts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No posts yet — be the first to share something.
        </div>
      )}

      {posts.map((p) => (
        <PostCard key={p.id} post={p} userId={userId} />
      ))}

      {feed.hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => feed.fetchNextPage()}
            disabled={feed.isFetchingNextPage}
          >
            {feed.isFetchingNextPage ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : null}
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

function Composer({ userId }: { userId: string | undefined }) {
  const { data: user } = useCurrentUser();
  const { data: profile } = useProfile(userId);
  const createPost = useCreatePost(userId);
  const [draft, setDraft] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true);
    try {
      const url = await uploadPostImage(userId, file);
      setImageUrl(url);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const post = async () => {
    if (!draft.trim() && !imageUrl) return;
    await createPost.mutateAsync({
      content: draft.trim(),
      imageUrls: imageUrl ? [imageUrl] : [],
    });
    setDraft("");
    setImageUrl(null);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex gap-3">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            className="h-10 w-10 rounded-full bg-muted object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted font-display text-sm">
            {(user?.name ?? "?").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <Textarea
            placeholder="Share what you shipped today…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="min-h-[80px] resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
          />
          {imageUrl && (
            <div className="relative mt-2 inline-block">
              <img
                src={imageUrl}
                alt=""
                className="max-h-48 rounded-lg border border-border object-cover"
              />
              <button
                onClick={() => setImageUrl(null)}
                className="absolute -right-2 -top-2 rounded-full bg-background p-1 shadow ring-1 ring-border"
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-border pt-3">
            <div className="flex items-center gap-1 text-muted-foreground">
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickImage}
              />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
                Image
              </button>
            </div>
            <Button
              size="sm"
              onClick={post}
              disabled={(!draft.trim() && !imageUrl) || createPost.isPending}
            >
              {createPost.isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-3.5 w-3.5" />
              )}
              Post
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PostCard({ post, userId }: { post: FeedPost; userId: string | undefined }) {
  const toggleLike = useToggleLike(userId);
  const [showComments, setShowComments] = useState(false);
  const author = post.author;
  const isJobPost = post.kind === "job";
  const jobMeta = isJobPost ? ((post.metadata ?? null) as unknown as JobPostMetadata | null) : null;

  return (
    <article className="rounded-2xl border border-border bg-card p-5">
      {jobMeta?.job_id ? (
        <JobPostHeader meta={jobMeta} createdAt={post.created_at} />
      ) : (
        <header className="flex items-center gap-3">
          {author?.avatar_url ? (
            <img
              src={author.avatar_url}
              className="h-10 w-10 rounded-full bg-muted object-cover"
              alt=""
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-display text-sm">
              {(author?.full_name ?? "?").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-medium">{author?.full_name || author?.username || "Someone"}</div>
            <div className="text-xs text-muted-foreground">
              {author?.username ? `@${author.username}` : ""} · {formatTimeAgo(post.created_at)}
            </div>
          </div>
        </header>
      )}

      {jobMeta?.job_id ? (
        <JobPostBody meta={jobMeta} userId={userId} />
      ) : (
        <>
          {post.content && (
            <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed">{post.content}</p>
          )}
          {post.image_urls.length > 0 && (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {post.image_urls.map((url) => (
                <img
                  key={url}
                  src={url}
                  alt=""
                  className="max-h-96 w-full rounded-xl border border-border object-cover"
                />
              ))}
            </div>
          )}
        </>
      )}
      <footer className="mt-4 flex items-center gap-1 border-t border-border pt-3 text-muted-foreground">
        <button
          onClick={() => toggleLike.mutate({ postId: post.id, liked: post.liked_by_me })}
          disabled={!userId || toggleLike.isPending}
          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs hover:bg-muted hover:text-foreground ${post.liked_by_me ? "text-brand" : ""}`}
        >
          <Heart className={`h-4 w-4 ${post.liked_by_me ? "fill-current" : ""}`} />{" "}
          {post.like_count}
        </button>
        <button
          onClick={() => setShowComments((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs hover:bg-muted hover:text-foreground"
        >
          <MessageCircle className="h-4 w-4" /> {post.comment_count}
        </button>
      </footer>
      {showComments && <Comments postId={post.id} userId={userId} />}
    </article>
  );
}

function JobPostHeader({ meta, createdAt }: { meta: JobPostMetadata; createdAt: string }) {
  return (
    <header className="flex items-center gap-3">
      <Link to="/c/$companyId" params={{ companyId: meta.company_id }} className="shrink-0">
        {meta.company_logo ? (
          <img
            src={meta.company_logo}
            className="h-10 w-10 rounded-xl bg-muted object-cover"
            alt=""
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Building2 className="h-5 w-5" />
          </div>
        )}
      </Link>
      <div className="min-w-0">
        <Link
          to="/c/$companyId"
          params={{ companyId: meta.company_id }}
          className="font-medium hover:underline"
        >
          {meta.company_name}
        </Link>
        <div className="text-xs text-muted-foreground">
          Job posting · {formatTimeAgo(createdAt)}
        </div>
      </div>
      <Badge className="ml-auto gap-1 bg-brand-soft text-brand hover:bg-brand-soft">
        <Briefcase className="h-3 w-3" /> Hiring
      </Badge>
    </header>
  );
}

function JobPostBody({ meta, userId }: { meta: JobPostMetadata; userId: string | undefined }) {
  const { data: job, isLoading } = useJobById(meta.job_id);
  const { data: saved } = useIsJobSaved(meta.job_id, userId);
  const saveJob = useSaveJob(userId);
  const unsaveJob = useUnsaveJob(userId);
  const [copied, setCopied] = useState(false);

  const onShare = async () => {
    const url = `${window.location.origin}/c/${meta.company_id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access denied — nothing more we can do without a toast host.
    }
  };

  const toggleSave = () => {
    if (!userId) return;
    if (saved) unsaveJob.mutate(meta.job_id);
    else saveJob.mutate(meta.job_id);
  };

  return (
    <div className="mt-4">
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading role details…</div>
      ) : (
        <>
          <h3 className="font-display text-lg leading-tight">{job?.title ?? "A new role"}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {job?.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {job.location}
              </span>
            )}
            {job?.work_mode && <span className="capitalize">· {job.work_mode}</span>}
            {job?.employment_type && <span>· {job.employment_type}</span>}
          </div>
          {job?.tags && job.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {job.tags.slice(0, 6).map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px]">
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link to="/apply">
          <Button size="sm">Apply</Button>
        </Link>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={!userId || saveJob.isPending || unsaveJob.isPending}
          onClick={toggleSave}
        >
          <Bookmark className={`h-3.5 w-3.5 ${saved ? "fill-current text-brand" : ""}`} />
          {saved ? "Saved" : "Save"}
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={onShare}>
          {copied ? (
            <Check className="h-3.5 w-3.5 text-brand" />
          ) : (
            <Share2 className="h-3.5 w-3.5" />
          )}
          {copied ? "Copied" : "Share"}
        </Button>
      </div>
    </div>
  );
}

function Comments({ postId, userId }: { postId: string; userId: string | undefined }) {
  const { data: comments, isLoading } = useComments(postId, true);
  const addComment = useAddComment(postId, userId);
  const [draft, setDraft] = useState("");

  const submit = async () => {
    if (!draft.trim()) return;
    await addComment.mutateAsync(draft.trim());
    setDraft("");
  };

  return (
    <div className="mt-3 space-y-3 border-t border-border pt-3">
      {isLoading && <div className="text-xs text-muted-foreground">Loading comments…</div>}
      {!isLoading && comments && comments.length === 0 && (
        <div className="text-xs text-muted-foreground">No comments yet.</div>
      )}
      {comments?.map((c) => (
        <div key={c.id} className="flex gap-2 text-sm">
          {c.author?.avatar_url ? (
            <img
              src={c.author.avatar_url}
              className="h-7 w-7 rounded-full bg-muted object-cover"
              alt=""
            />
          ) : (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-display">
              {(c.author?.full_name ?? "?").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <span className="font-medium">
              {c.author?.full_name || c.author?.username || "Someone"}
            </span>{" "}
            <span className="text-muted-foreground">{formatTimeAgo(c.created_at)}</span>
            <p className="text-foreground">{c.content}</p>
          </div>
        </div>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-center gap-2"
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a comment…"
          className="h-9"
        />
        <Button type="submit" size="sm" disabled={!draft.trim() || addComment.isPending}>
          Reply
        </Button>
      </form>
    </div>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

function MiniProfile() {
  const { data: user } = useCurrentUser();
  const { data: profile } = useProfile(user?.id);
  const { data: skills } = useSkills(user?.id);
  const { data: rank } = useLeaderboardRank(user?.id, profile?.xp);
  const verifiedCount = skills?.filter((s) => s.verified).length ?? 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            className="h-11 w-11 rounded-full bg-muted object-cover"
            alt=""
          />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted font-display text-base">
            {(profile?.full_name ?? user?.name ?? "?").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate font-medium">{profile?.full_name || user?.name || "You"}</div>
          <div className="truncate text-xs text-muted-foreground">{profile?.location || "—"}</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat k={String(verifiedCount)} v="Verified" />
        <Stat k={String(profile?.streak ?? 0)} v="Streak" />
        <Stat k={rank ? `#${rank}` : "—"} v="Rank" />
      </div>
    </div>
  );
}
function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg bg-muted p-2">
      <div className="font-display text-lg leading-none">{k}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{v}</div>
    </div>
  );
}

function StreakLeaderboardCard() {
  const { data: top } = useTopStreaks(5);
  return (
    <Card title="Streak leaderboard" icon={<Trophy className="h-4 w-4 text-brand" />}>
      {top && top.length > 0 ? (
        <ul className="space-y-2">
          {top.map((u, i) => (
            <li key={u.id} className="flex items-center gap-3 text-sm">
              <span className="w-4 text-xs text-muted-foreground">{i + 1}</span>
              {u.avatar_url ? (
                <img
                  src={u.avatar_url}
                  className="h-7 w-7 rounded-full bg-muted object-cover"
                  alt=""
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-display">
                  {(u.full_name ?? "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              <span className="truncate">{u.full_name || u.username || "Someone"}</span>
              <span className="ml-auto inline-flex items-center gap-0.5 text-xs text-brand">
                <Flame className="h-3 w-3" /> {u.streak}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No one has an active streak yet.</p>
      )}
    </Card>
  );
}

function SuggestedPeopleCard({
  userId,
  targetRole,
}: {
  userId: string | undefined;
  targetRole: string | null | undefined;
}) {
  const { data: suggestions } = useSuggestedPeople(userId, targetRole, 3);
  const sendRequest = useSendFriendRequest(userId);
  const [sent, setSent] = useState<Record<string, boolean>>({});

  return (
    <Card title="People to follow" icon={<TrendingUp className="h-4 w-4 text-brand" />}>
      {suggestions && suggestions.length > 0 ? (
        <ul className="space-y-3">
          {suggestions.map((u) => (
            <li key={u.id} className="flex items-center gap-3">
              {u.avatar_url ? (
                <img
                  src={u.avatar_url}
                  className="h-8 w-8 rounded-full bg-muted object-cover"
                  alt=""
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-display">
                  {(u.full_name ?? "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate text-sm">{u.full_name || u.username || "Someone"}</div>
                <div className="truncate text-xs text-muted-foreground">{u.target_role || "—"}</div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto h-7"
                disabled={sent[u.id] || sendRequest.isPending}
                onClick={async () => {
                  await sendRequest.mutateAsync(u.id);
                  setSent((v) => ({ ...v, [u.id]: true }));
                }}
              >
                {sent[u.id] ? (
                  "Sent"
                ) : (
                  <>
                    <UserPlus className="mr-1 h-3 w-3" /> Add
                  </>
                )}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          No suggestions yet — add a target role or skills to your profile to get matched with
          people.
        </p>
      )}
    </Card>
  );
}
