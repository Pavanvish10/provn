import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Send, ChevronLeft, ChevronRight, Bell } from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { AdminSubNav } from "@/components/AdminSubNav";
import { requireAdmin } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import {
  useSearchProfiles,
  useSendSystemNotification,
  useRecentSystemNotifications,
  type SentSystemNotification,
} from "@/lib/admin-notifications-client";
import { ADMIN_PAGE_SIZE, formatDateTime } from "@/lib/admin-shared";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/notifications")({
  beforeLoad: requireAdmin,
  head: () => ({ meta: [{ title: "Manage Notifications · Admin · Provn" }] }),
  component: AdminNotifications,
});

function AdminNotifications() {
  const { data: currentUser } = useCurrentUser();
  const [query, setQuery] = useState("");
  const [recipient, setRecipient] = useState<{ id: string; label: string } | null>(null);
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: matches } = useSearchProfiles(query);
  const sendNotification = useSendSystemNotification(currentUser?.id);
  const { data, isLoading } = useRecentSystemNotifications(page);

  const rows = data?.rows ?? [];
  const count = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / ADMIN_PAGE_SIZE));

  const send = async () => {
    setError(null);
    setNotice(null);
    if (!recipient) {
      setError("Pick a recipient first.");
      return;
    }
    if (!message.trim()) {
      setError("Write a message.");
      return;
    }
    try {
      await sendNotification.mutateAsync({ recipientId: recipient.id, message: message.trim() });
      setNotice(`Sent to ${recipient.label}.`);
      setMessage("");
      setRecipient(null);
      setQuery("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send.");
    }
  };

  return (
    <AppShell>
      <AdminSubNav />
      <div className="mb-6">
        <h1 className="font-display text-3xl tracking-tight">Manage Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Send a system notification to a specific user.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4 text-brand" />
            <div className="font-display text-lg">Send notification</div>
          </div>

          {recipient ? (
            <div className="mb-3 flex items-center justify-between rounded-lg border border-border p-3">
              <div className="text-sm font-medium">{recipient.label}</div>
              <Button size="sm" variant="ghost" onClick={() => setRecipient(null)}>
                Change
              </Button>
            </div>
          ) : (
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, email, or username"
                className="pl-8"
              />
            </div>
          )}

          {!recipient && (matches ?? []).length > 0 && (
            <div className="mb-3 max-h-48 overflow-y-auto rounded-lg border border-border">
              {(matches ?? []).map((p) => (
                <button
                  key={p.id}
                  onClick={() =>
                    setRecipient({
                      id: p.id,
                      label: p.full_name || p.username || p.email || "User",
                    })
                  }
                  className="flex w-full items-center justify-between border-b border-border p-2.5 text-left text-sm last:border-b-0 hover:bg-muted"
                >
                  <span>{p.full_name || p.username}</span>
                  <span className="text-xs text-muted-foreground">{p.email}</span>
                </button>
              ))}
            </div>
          )}

          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Notification message"
            className="mb-3 min-h-[100px]"
          />
          {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
          {notice && <p className="mb-2 text-sm text-brand">{notice}</p>}
          <Button onClick={send} disabled={sendNotification.isPending}>
            <Send className="mr-1.5 h-4 w-4" /> {sendNotification.isPending ? "Sending…" : "Send"}
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-card">
          <div className="border-b border-border p-4 font-display text-lg">Recently sent</div>
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No system notifications sent yet.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {rows.map((n: SentSystemNotification) => (
                <div key={n.id} className="p-4">
                  <div className="text-sm">{n.message}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    To {n.recipient?.full_name || n.recipient?.email || "user"} ·{" "}
                    {formatDateTime(n.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between border-t border-border p-3">
            <div className="text-xs text-muted-foreground">
              Page {page + 1} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
