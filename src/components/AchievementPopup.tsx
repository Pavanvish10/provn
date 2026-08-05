import { useEffect, useState } from "react";
import { Award, Flame, Sparkles, Trophy, X } from "lucide-react";

import {
  useBadgeDefinitions,
  useMarkBadgesSeen,
  useMyBadges,
  type UserBadge,
} from "@/lib/daily-challenge-client";

const ICONS = { Trophy, Flame, Sparkles, Award } as const;

function BadgeIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = (name && ICONS[name as keyof typeof ICONS]) || Trophy;
  return <Icon className={className} />;
}

/** Shows a glassmorphic "Achievement unlocked" popup for any badge the user
 * has earned but not yet acknowledged, then marks it seen. Renders nothing
 * when there's nothing new — safe to mount unconditionally on any page. */
export function AchievementPopup({ profileId }: { profileId: string | undefined }) {
  const { data: badges } = useMyBadges(profileId);
  const { data: definitions } = useBadgeDefinitions();
  const markSeen = useMarkBadgesSeen(profileId);
  const [queue, setQueue] = useState<UserBadge[]>([]);

  useEffect(() => {
    const unseen = (badges ?? []).filter((b) => !b.seen);
    if (unseen.length > 0) setQueue(unseen);
  }, [badges]);

  if (queue.length === 0) return null;
  const current = queue[0];
  const def = (definitions ?? []).find((d) => d.code === current.badge_code);

  const dismiss = () => {
    markSeen.mutate([current.id]);
    setQueue((q) => q.slice(1));
  };

  return (
    <div className="fixed inset-x-0 top-4 z-[100] flex justify-center px-4">
      <div className="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-brand/30 bg-card/80 p-4 shadow-xl backdrop-blur-xl animate-in fade-in slide-in-from-top-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <BadgeIcon name={def?.icon ?? null} className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-widest text-brand">
            Achievement unlocked
          </div>
          <div className="truncate font-display text-lg leading-tight">{def?.name ?? "Badge"}</div>
          {def?.description && (
            <p className="truncate text-xs text-muted-foreground">{def.description}</p>
          )}
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
