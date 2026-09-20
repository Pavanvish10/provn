import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { AdminSubNav } from "@/components/AdminSubNav";
import { requireAdmin } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import {
  useAdminCreditBalances,
  useAdminCreditTransactions,
  useSearchProfileForCredits,
  useAdminGrantCredits,
} from "@/lib/admin-credits-client";
import { ADMIN_PAGE_SIZE, formatDateTime } from "@/lib/admin-shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/credits")({
  beforeLoad: requireAdmin,
  head: () => ({ meta: [{ title: "Manage AI Credits · Admin · Provn" }] }),
  component: AdminCredits,
});

function AdminCredits() {
  const { data: currentUser } = useCurrentUser();
  const [grantSearch, setGrantSearch] = useState("");
  const [grantAmount, setGrantAmount] = useState(50);
  const [balancePage, setBalancePage] = useState(0);
  const [txnPage, setTxnPage] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: matches } = useSearchProfileForCredits(grantSearch);
  const { data: balances, isLoading: balancesLoading } = useAdminCreditBalances({
    page: balancePage,
  });
  const { data: txns, isLoading: txnsLoading } = useAdminCreditTransactions({ page: txnPage });
  const grantCredits = useAdminGrantCredits(currentUser?.id);

  const balanceRows = balances?.rows ?? [];
  const balanceCount = balances?.count ?? 0;
  const balanceTotalPages = Math.max(1, Math.ceil(balanceCount / ADMIN_PAGE_SIZE));

  const txnRows = txns?.rows ?? [];
  const txnCount = txns?.count ?? 0;
  const txnTotalPages = Math.max(1, Math.ceil(txnCount / ADMIN_PAGE_SIZE));

  const grant = (profileId: string, label: string) => {
    setError(null);
    setNotice(null);
    grantCredits.mutate(
      { profileId, amount: grantAmount },
      {
        onSuccess: (newBalance) => {
          setNotice(`Granted ${grantAmount} credits to ${label}. New balance: ${newBalance}.`);
          setGrantSearch("");
        },
        onError: (e) => setError(e instanceof Error ? e.message : "Failed to grant credits."),
      },
    );
  };

  return (
    <AppShell>
      <AdminSubNav />
      <div className="mb-6">
        <h1 className="font-display text-3xl tracking-tight">Manage AI Credits</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Grant additional AI credits to a user, and review every balance and transaction on the
          platform. Deductions only ever happen via a user's own real usage — admins can top up, not
          debit, matching the same grant/revoke-only convention as Manage Premium.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand" />
            <div className="font-display text-lg">Grant credits</div>
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">
              Amount
            </label>
            <Input
              type="number"
              min={1}
              value={grantAmount}
              onChange={(e) => setGrantAmount(Math.max(1, Number(e.target.value) || 1))}
            />
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
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
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
                <Button
                  size="sm"
                  onClick={() => grant(p.id, p.full_name || p.email || "this user")}
                  disabled={grantCredits.isPending}
                >
                  Grant {grantAmount}
                </Button>
              </div>
            ))}
            {grantSearch.trim().length >= 2 && (matches ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground">No matching users.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card">
          <div className="border-b border-border p-4">
            <div className="font-display text-lg">All balances ({balanceCount})</div>
          </div>
          {balancesLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : balanceRows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No credit balances yet.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {balanceRows.map((r) => (
                <div key={r.profile_id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {r.profile?.full_name || r.profile?.email || "—"}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Updated {formatDateTime(r.updated_at)}
                    </div>
                  </div>
                  <Badge variant="secondary">{r.balance} credits</Badge>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between border-t border-border p-3">
            <div className="text-xs text-muted-foreground">
              Page {balancePage + 1} of {balanceTotalPages}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={balancePage === 0}
                onClick={() => setBalancePage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={balancePage + 1 >= balanceTotalPages}
                onClick={() => setBalancePage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <div className="font-display text-lg">Transaction ledger ({txnCount})</div>
        </div>
        {txnsLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : txnRows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No transactions yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {txnRows.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {t.profile?.full_name || t.profile?.email || "—"}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {t.reason.replace(/_/g, " ")} · {formatDateTime(t.created_at)}
                  </div>
                </div>
                <div className="text-right">
                  <div className={t.delta > 0 ? "font-medium text-emerald-600" : "font-medium"}>
                    {t.delta > 0 ? "+" : ""}
                    {t.delta}
                  </div>
                  <div className="text-xs text-muted-foreground">balance {t.balance_after}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border p-3">
          <div className="text-xs text-muted-foreground">
            Page {txnPage + 1} of {txnTotalPages}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={txnPage === 0}
              onClick={() => setTxnPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={txnPage + 1 >= txnTotalPages}
              onClick={() => setTxnPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
