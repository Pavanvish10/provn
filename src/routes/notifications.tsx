import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppNav";
import { NOTIFICATIONS } from "@/lib/mock-data";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications · Provn" },
      { name: "description", content: "Signals worth your attention: recruiter views, likes, and challenge drops." },
      { property: "og:title", content: "Notifications · Provn" },
      { property: "og:description", content: "Only the signals worth your attention." },
    ],
  }),
  component: Notifs,
});

function Notifs() {
  return (
    <AppShell>
      <h1 className="mb-6 font-display text-4xl tracking-tight">Notifications</h1>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {NOTIFICATIONS.map((n) => (
          <div key={n.id} className="flex items-start gap-3 border-b border-border p-4 last:border-b-0">
            <div className={`mt-1 h-2 w-2 rounded-full ${n.unread ? "bg-brand" : "bg-transparent"}`} />
            <Bell className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-sm">{n.text}</div>
              <div className="text-xs text-muted-foreground">{n.time} ago</div>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
