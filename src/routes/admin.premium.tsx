import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, ChevronLeft, ChevronRight, Crown, Check } from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { AdminSubNav } from "@/components/AdminSubNav";
import { AdminConfirmDialog } from "@/components/AdminConfirmDialog";
import { requireAdmin } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import {
  useAdminPremiumSubscribers,
  useSearchProfileByEmail,
  useGrantPremium,
  useRevokePremium,
} from "@/lib/admin-premium-client";
import { ADMIN_PAGE_SIZE, formatDate } from "@/lib/admin-shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/premium")({
  beforeLoad: requireAdmin,
  head: () => ({ meta: [{ title: "Manage Premium · Admin · Provn" }] }),
  component: AdminPremium,
});

function AdminPremium() {
  const { data: currentUser } = useCurrentUser();
  const [page, setPage] = useState(0);
  const [grantSearch, setGrantSearch] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; label: string } | null>(null);

  const { data, isLoading } = useAdminPremiumSubscribers({ search: "", page });
  const { data: matches } = useSearchProfileByEmail(grantSearch);
  const grantPremium = useGrantPremium(currentUser?.id);
  const revokePremium = useRevokePremium(currentUser?.id);
  const [notice, setNotice] = useState<string | null>(null);

  const rows = data?.rows ?? [];
  const count = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / ADMIN_PAGE_SIZE));

  const grant = async (profileId: string, days: number | null) => {
    setNotice(null);
    await grantPremium.mutateAsync({ profileId, days });
    setNotice("Premium granted.");
    setGrantSearch("");
  };

  const runRevoke = async () => {
    if (!revokeTarget) return;
    await revokePremium.mutateAsync(revokeTarget.id);
    setRevokeTarget(null);
  };

  return (
    <AppShell>
      <AdminSubNav />
      <div className="mb-6">
        <h1 className="font-display text-3xl tracking-tight">Manage Premium</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Payments aren't wired up yet — grant or revoke premium access manually while billing is
          deferred.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Crown className="h-4 w-4 text-brand" />
            <div className="font-display text-lg">Grant premium</div>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={grantSearch}
              onChange={(e) => setGrantSearch(e.target.value)}
              placeholder="Search by email or username"
              className="pl-8"
            />
          </div>
          {notice && <p className="mt-2 text-sm text-brand">{notice}</p>}
          <div className="mt-3 space-y-2">
            {(matches ?? []).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {p.full_name || p.username || p.email}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{p.email}</div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => grant(p.id, 30)}
                    disabled={grantPremium.isPending}
                  >
                    +30 days
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => grant(p.id, null)}
                    disabled={grantPremium.isPending}
                  >
                    <Check className="mr-1 h-3.5 w-3.5" /> Lifetime
                  </Button>
                </div>
              </div>
            ))}
            {grantSearch.trim().length >= 2 && (matches ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground">No matching users.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card">
          <div className="border-b border-border p-4">
            <div className="font-display text-lg">Active premium subscribers ({count})</div>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No premium subscribers yet.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {rows.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {r.profile?.full_name || r.profile?.username || r.profile?.email}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <Badge variant="secondary">Since {formatDate(r.started_at)}</Badge>
                      {r.current_period_end && (
                        <Badge variant="outline">Until {formatDate(r.current_period_end)}</Badge>
                      )}
                      {!r.current_period_end && <Badge variant="outline">No expiry</Badge>}
                      {r.payment_provider && <Badge variant="outline">{r.payment_provider}</Badge>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setRevokeTarget({
                        id: r.profile_id,
                        label: r.profile?.full_name || r.profile?.email || "this user",
                      })
                    }
                  >
                    Revoke
                  </Button>
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

      <AdminConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(o) => !o && setRevokeTarget(null)}
        title="Revoke premium?"
        description={`${revokeTarget?.label} will lose premium access immediately.`}
        confirmLabel="Revoke"
        destructive
        pending={revokePremium.isPending}
        onConfirm={runRevoke}
      />
    </AppShell>
  );
}
