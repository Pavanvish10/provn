import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppNav";
import {
  Bell,
  Heart,
  MessageCircle,
  UserPlus,
  UserCheck,
  Mail,
  FileText,
  Code2,
  Mic,
  Trophy,
  Briefcase,
  UserCircle2,
  Search,
  Trash2,
  CheckCheck,
  Send,
  CalendarClock,
  Megaphone,
  GraduationCap,
  CreditCard,
  Settings2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  useNotificationsRealtime,
  type Notification,
} from "@/lib/notifications-client";
import { resolveNotificationHref } from "@/lib/notification-links";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { NotificationPreferencesPanel } from "@/components/NotificationPreferencesPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatTimeAgo } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Notifications · Provn" },
      {
        name: "description",
        content: "Signals worth your attention: likes, comments, friend requests, and more.",
      },
      { property: "og:title", content: "Notifications · Provn" },
      { property: "og:description", content: "Only the signals worth your attention." },
    ],
  }),
  component: Notifs,
});

const TYPE_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  like: { label: "Like", icon: Heart },
  comment: { label: "Comment", icon: MessageCircle },
  friend_request: { label: "Friend request", icon: UserPlus },
  friend_accept: { label: "Friend accepted", icon: UserCheck },
  message: { label: "Message", icon: Mail },
  resume_analysis: { label: "Resume", icon: FileText },
  coding_test: { label: "Coding test", icon: Code2 },
  mock_interview: { label: "Mock interview", icon: Mic },
  challenge_completion: { label: "Challenge", icon: Trophy },
  job_update: { label: "Job update", icon: Briefcase },
  job_invite: { label: "Job invite", icon: Send },
  interview: { label: "Interview", icon: CalendarClock },
  company_post: { label: "Company post", icon: Megaphone },
  drive_update: { label: "Placement drive", icon: GraduationCap },
  billing_update: { label: "Billing", icon: CreditCard },
  profile_update: { label: "Profile", icon: UserCircle2 },
  system: { label: "System", icon: Bell },
};

function iconFor(type: string) {
  return TYPE_META[type]?.icon ?? Bell;
}

function Notifs() {
  const { data: user } = useCurrentUser();
  const navigate = useNavigate();
  useNotificationsRealtime(user?.id);

  const notifications = useNotifications(user?.id);
  const { data: unreadCount } = useUnreadNotificationCount(user?.id);
  const markRead = useMarkNotificationRead(user?.id);
  const markAllRead = useMarkAllNotificationsRead(user?.id);
  const deleteNotification = useDeleteNotification(user?.id);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showPreferences, setShowPreferences] = useState(false);

  const openNotification = async (n: Notification) => {
    if (!n.is_read) markRead.mutate(n.id);
    const href = await resolveNotificationHref(getSupabaseBrowserClient(), n, "student");
    if (href) navigate({ to: href });
  };

  const all = useMemo(
    () => notifications.data?.pages.flatMap((p) => p.items) ?? [],
    [notifications.data],
  );

  const filtered = all.filter((n) => {
    if (typeFilter !== "all" && n.type !== typeFilter) return false;
    if (search.trim() && !n.message.toLowerCase().includes(search.trim().toLowerCase()))
      return false;
    return true;
  });

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl tracking-tight">Notifications</h1>
          {!!unreadCount && unreadCount > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">{unreadCount} unread</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowPreferences((v) => !v)}>
            <Settings2 className="mr-1.5 h-3.5 w-3.5" /> Preferences
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={!unreadCount || markAllRead.isPending}
          >
            <CheckCheck className="mr-1.5 h-3.5 w-3.5" /> Mark all as read
          </Button>
        </div>
      </div>

      {showPreferences && (
        <div className="mb-6">
          <NotificationPreferencesPanel userId={user?.id} />
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notifications…"
            className="h-10 pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(TYPE_META).map(([value, meta]) => (
              <SelectItem key={value} value={value}>
                {meta.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {notifications.isLoading && (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
      )}

      {notifications.isError && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
          Couldn't load notifications. Try refreshing the page.
        </div>
      )}

      {!notifications.isLoading && !notifications.isError && all.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No notifications yet.
        </div>
      )}

      {!notifications.isLoading && all.length > 0 && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No notifications match your search.
        </div>
      )}

      {filtered.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {filtered.map((n) => (
            <NotificationRow
              key={n.id}
              notification={n}
              onOpen={() => openNotification(n)}
              onDelete={() => deleteNotification.mutate(n.id)}
            />
          ))}
        </div>
      )}

      {notifications.hasNextPage && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            onClick={() => notifications.fetchNextPage()}
            disabled={notifications.isFetchingNextPage}
          >
            Load more
          </Button>
        </div>
      )}
    </AppShell>
  );
}

function NotificationRow({
  notification,
  onOpen,
  onDelete,
}: {
  notification: Notification;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const Icon = iconFor(notification.type);
  return (
    <div
      className="group flex items-start gap-3 border-b border-border p-4 last:border-b-0 hover:bg-muted/40"
      onClick={onOpen}
      role="button"
      tabIndex={0}
    >
      <div
        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notification.is_read ? "bg-transparent" : "bg-brand"}`}
      />
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="text-sm">{notification.message}</div>
        <div className="text-xs text-muted-foreground">
          {formatTimeAgo(notification.created_at)} ago
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="shrink-0 rounded-md p-1.5 text-muted-foreground opacity-0 transition hover:bg-muted hover:text-destructive group-hover:opacity-100"
        aria-label="Delete notification"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
