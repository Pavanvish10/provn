import { Sparkles } from "lucide-react";

import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notification-preferences-client";
import { Switch } from "@/components/ui/switch";

const CATEGORIES: {
  key: keyof Pick<NotificationPreferences, "social" | "jobs" | "placements" | "learning">;
  label: string;
  desc: string;
}[] = [
  { key: "social", label: "Social", desc: "Likes, comments, friend requests, messages" },
  { key: "jobs", label: "Jobs & interviews", desc: "Application updates, invites, interviews" },
  { key: "placements", label: "Placement drives", desc: "Campus drive applications and status" },
  { key: "learning", label: "Learning", desc: "Challenges, mock interviews, resume feedback" },
];

/** Billing/security notifications are deliberately not listed here — no
 * column exists for them at all (see the Sprint 29 migration), so they
 * can never be disabled through this UI. */
export function NotificationPreferencesPanel({ userId }: { userId: string | undefined }) {
  const { data: prefs, isLoading } = useNotificationPreferences(userId);
  const update = useUpdateNotificationPreferences(userId);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-1 font-display text-lg">Notification preferences</div>
      <p className="mb-4 text-xs text-muted-foreground">
        Billing and account-security notifications always stay on and can't be turned off here.
      </p>

      {isLoading ? (
        <div className="py-4 text-center text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Sparkles className="h-3.5 w-3.5 text-brand" /> Email notifications
              </div>
              <div className="text-xs text-muted-foreground">
                Also send important updates to your email
              </div>
            </div>
            <Switch
              checked={prefs?.email_notifications ?? true}
              onCheckedChange={(v) => update.mutate({ email_notifications: v })}
            />
          </label>

          {CATEGORIES.map((c) => (
            <label
              key={c.key}
              className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium">{c.label}</div>
                <div className="text-xs text-muted-foreground">{c.desc}</div>
              </div>
              <Switch
                checked={prefs?.[c.key] ?? true}
                onCheckedChange={(v) => update.mutate({ [c.key]: v })}
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
