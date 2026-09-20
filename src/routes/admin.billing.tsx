import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { AdminSubNav } from "@/components/AdminSubNav";
import { requireAdmin } from "@/lib/auth-guard";
import { useAdminSubscriptions, useAdminPayments } from "@/lib/admin-billing-client";
import { ADMIN_PAGE_SIZE, formatDateTime } from "@/lib/admin-shared";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/billing")({
  beforeLoad: requireAdmin,
  head: () => ({ meta: [{ title: "Billing · Admin · Provn" }] }),
  component: AdminBilling,
});

function formatAmount(cents: number, currency: string) {
  const symbol = currency === "INR" ? "₹" : `${currency} `;
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

function AdminBilling() {
  const [subPage, setSubPage] = useState(0);
  const [payPage, setPayPage] = useState(0);
  const { data: subs, isLoading: subsLoading } = useAdminSubscriptions(subPage);
  const { data: pays, isLoading: paysLoading } = useAdminPayments(payPage);

  const subTotalPages = Math.max(1, Math.ceil((subs?.count ?? 0) / ADMIN_PAGE_SIZE));
  const payTotalPages = Math.max(1, Math.ceil((pays?.count ?? 0) / ADMIN_PAGE_SIZE));

  return (
    <AppShell>
      <AdminSubNav />
      <div className="mb-6">
        <h1 className="font-display text-3xl tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Subscriptions and payments across every account.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-lg">Subscriptions</h2>
        {subsLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <th className="py-2">Account</th>
                    <th className="py-2">Plan</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Renews</th>
                    <th className="py-2">Provider</th>
                  </tr>
                </thead>
                <tbody>
                  {(subs?.rows ?? []).map((s) => (
                    <tr key={s.id} className="border-b border-border last:border-0">
                      <td className="py-2">{s.profile?.full_name ?? s.profile?.email ?? "—"}</td>
                      <td className="py-2">{s.plan?.name ?? "—"}</td>
                      <td className="py-2 capitalize">{s.status.replace("_", " ")}</td>
                      <td className="py-2 text-muted-foreground">
                        {formatDateTime(s.current_period_end)}
                      </td>
                      <td className="py-2 text-muted-foreground">{s.payment_provider}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Page {subPage + 1} of {subTotalPages}
              </span>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={subPage === 0}
                  onClick={() => setSubPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={subPage + 1 >= subTotalPages}
                  onClick={() => setSubPage((p) => p + 1)}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-lg">Payments</h2>
        {paysLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <th className="py-2">Account</th>
                    <th className="py-2">Description</th>
                    <th className="py-2">Amount</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(pays?.rows ?? []).map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="py-2">{p.profile?.full_name ?? p.profile?.email ?? "—"}</td>
                      <td className="py-2">{p.description ?? "—"}</td>
                      <td className="py-2">{formatAmount(p.amount_cents, p.currency)}</td>
                      <td className="py-2 capitalize">{p.status}</td>
                      <td className="py-2 text-muted-foreground">{formatDateTime(p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Page {payPage + 1} of {payTotalPages}
              </span>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={payPage === 0}
                  onClick={() => setPayPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={payPage + 1 >= payTotalPages}
                  onClick={() => setPayPage((p) => p + 1)}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
