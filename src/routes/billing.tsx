import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CreditCard, Receipt, Sparkles, Download, Loader2, XCircle } from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import {
  useMySubscription,
  useMyPayments,
  useMyInvoices,
  useCancelSubscription,
  useCreditPacks,
  useMyCreditBalance,
  useMyCreditTransactions,
  useCreateCreditPackCheckout,
  type Invoice,
} from "@/lib/payments-client";

export const Route = createFileRoute("/billing")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "Billing · Provn" }] }),
  component: BillingPage,
});

function formatAmount(cents: number, currency: string) {
  const symbol = currency === "INR" ? "₹" : `${currency} `;
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

const STATUS_TONE: Record<string, string> = {
  active: "bg-brand-soft text-brand",
  trialing: "bg-brand-soft text-brand",
  past_due: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  canceled: "bg-muted text-muted-foreground",
  expired: "bg-destructive/10 text-destructive",
  succeeded: "bg-brand-soft text-brand",
  paid: "bg-brand-soft text-brand",
  failed: "bg-destructive/10 text-destructive",
  refunded: "bg-muted text-muted-foreground",
};

function BillingPage() {
  const { data: user } = useCurrentUser();
  // Deliberately not branching structure on isLoading for any of these —
  // same reasoning as every other route since Sprint 25 (business.tsx): a
  // query can resolve between the SSR flush and the client's first
  // hydration paint, causing a mismatch.
  const { data: subscription } = useMySubscription(user?.id);
  const { data: payments = [] } = useMyPayments(user?.id);
  const { data: invoices = [] } = useMyInvoices(user?.id);
  const { data: creditPacks = [] } = useCreditPacks();
  const { data: creditBalance } = useMyCreditBalance(user?.id);
  const { data: creditTxns = [] } = useMyCreditTransactions(user?.id);

  const cancelSubscription = useCancelSubscription(user?.id);
  const buyCredits = useCreateCreditPackCheckout(user?.id);
  const [buyingPack, setBuyingPack] = useState<string | null>(null);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [creditsError, setCreditsError] = useState<string | null>(null);

  const handleBuyPack = async (packCode: string) => {
    setBuyingPack(packCode);
    setCreditsError(null);
    try {
      const result = await buyCredits.mutateAsync({
        packCode,
        successUrl: `${window.location.origin}/checkout/success`,
        cancelUrl: `${window.location.origin}/checkout/cancel`,
      });
      if (result.error) {
        setCreditsError(result.error);
      } else if (result.checkoutUrl && !result.activated) {
        window.location.href = result.checkoutUrl;
      }
    } finally {
      setBuyingPack(null);
    }
  };

  return (
    <AppShell>
      <div className="mb-6">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <CreditCard className="h-5 w-5" />
        </div>
        <h1 className="mt-3 font-display text-3xl tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your subscription, AI credits, and payment history.
        </p>
      </div>

      {/* Subscription */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-lg">Subscription</h2>
        {subscription ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-medium">{subscription.plan?.name ?? "Plan"}</div>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span
                  className={`rounded-full px-2 py-0.5 font-medium uppercase tracking-widest ${STATUS_TONE[subscription.status] ?? "bg-muted text-muted-foreground"}`}
                >
                  {subscription.status.replace("_", " ")}
                </span>
                {subscription.current_period_end && (
                  <span>
                    Renews {new Date(subscription.current_period_end).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            {subscription.status !== "canceled" && subscription.plan?.price_cents !== 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive"
                disabled={cancelSubscription.isPending}
                onClick={() => cancelSubscription.mutate()}
              >
                {cancelSubscription.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <XCircle className="h-3.5 w-3.5" />
                )}
                Cancel subscription
              </Button>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            You're on the free plan.{" "}
            <a href="/plan" className="text-brand hover:underline">
              See plans →
            </a>
          </p>
        )}
      </div>

      {/* AI Credits */}
      <div className="mt-5 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg">AI Credits</h2>
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-brand" /> {creditBalance ?? 0} credits
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {creditPacks.map((pack) => (
            <div key={pack.id} className="rounded-xl border border-border p-3">
              <div className="font-medium">{pack.name}</div>
              <div className="text-xs text-muted-foreground">
                {formatAmount(pack.price_cents, pack.currency)}
              </div>
              <Button
                size="sm"
                className="mt-2 w-full"
                disabled={buyingPack === pack.code}
                onClick={() => handleBuyPack(pack.code)}
              >
                {buyingPack === pack.code ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Buy"
                )}
              </Button>
            </div>
          ))}
        </div>
        {creditsError && <p className="mt-3 text-sm text-destructive">{creditsError}</p>}
        {creditTxns.length > 0 && (
          <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
            {creditTxns.slice(0, 5).map((t) => (
              <li key={t.id} className="flex items-center justify-between">
                <span>{t.reason.replace("_", " ")}</span>
                <span className={t.delta > 0 ? "text-emerald-600" : ""}>
                  {t.delta > 0 ? "+" : ""}
                  {t.delta}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Payment history */}
      <div className="mt-5 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-lg">Payment history</h2>
        {payments.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No payments yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <th className="py-2">Description</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="py-2">{p.description ?? "—"}</td>
                    <td className="py-2">{formatAmount(p.amount_cents, p.currency)}</td>
                    <td className="py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest ${STATUS_TONE[p.status] ?? "bg-muted text-muted-foreground"}`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoices */}
      <div className="mt-5 rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-1.5 font-display text-lg">
          <Receipt className="h-4 w-4" /> Invoices
        </h2>
        {invoices.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No invoices yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {invoices.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between rounded-xl border border-border p-3 text-sm"
              >
                <div>
                  <div className="font-medium">{inv.invoice_number}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(inv.issued_at).toLocaleDateString()} ·{" "}
                    {formatAmount(inv.amount_cents, inv.currency)}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setPrintInvoice(inv)}>
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Receipt
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {printInvoice && (
        <InvoiceReceipt invoice={printInvoice} onClose={() => setPrintInvoice(null)} />
      )}
    </AppShell>
  );
}

function InvoiceReceipt({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const lineItems = (invoice.line_items as { description: string; amount_cents: number }[]) ?? [];
  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-print-area, #invoice-print-area * { visibility: visible; }
          #invoice-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
        <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-6">
          <div id="invoice-print-area" className="bg-white p-6 text-slate-900">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Provn</div>
            <h2 className="mt-2 text-xl font-semibold">Receipt {invoice.invoice_number}</h2>
            <p className="mt-1 text-xs text-slate-500">
              Issued {new Date(invoice.issued_at).toLocaleDateString()}
            </p>
            <table className="mt-4 w-full text-sm">
              <tbody>
                {lineItems.map((li, i) => (
                  <tr key={i}>
                    <td className="py-1">{li.description}</td>
                    <td className="py-1 text-right">
                      {formatAmount(li.amount_cents, invoice.currency)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-slate-200 font-semibold">
                  <td className="py-2">Total</td>
                  <td className="py-2 text-right">
                    {formatAmount(invoice.amount_cents, invoice.currency)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="no-print mt-4 flex gap-2">
            <Button className="flex-1" onClick={() => window.print()}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Download PDF
            </Button>
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
