import { createFileRoute } from "@tanstack/react-router";
import { Check, Crown, X } from "lucide-react";

import { BusinessShell } from "@/components/BusinessNav";
import { requireBusinessAccount } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { usePremiumStatus } from "@/lib/premium-client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/business/subscription")({
  beforeLoad: requireBusinessAccount,
  head: () => ({ meta: [{ title: "Subscription · Provn Business" }] }),
  component: BusinessSubscription,
});

const FREE_FEATURES = [
  { on: true, t: "Up to 3 active job postings" },
  { on: true, t: "Applicant tracking & pipeline" },
  { on: true, t: "AI match scoring" },
  { on: false, t: "Unlimited job postings" },
  { on: false, t: "Advanced analytics & exports" },
  { on: false, t: "Priority verified badge review" },
];

const PRO_FEATURES = [
  { on: true, t: "Unlimited job postings" },
  { on: true, t: "Best Matching Students recommendations" },
  { on: true, t: "Advanced analytics & exports" },
  { on: true, t: "Priority verified badge review" },
  { on: true, t: "Priority support" },
];

function BusinessSubscription() {
  const { data: user } = useCurrentUser();
  const { data: premium } = usePremiumStatus(user?.id);

  return (
    <BusinessShell>
      <div className="mb-8">
        <h1 className="font-display text-3xl tracking-tight">Subscription</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {premium?.isPremium
            ? "You're on Provn Business Pro."
            : "You're on the free plan. Upgrade for unlimited postings and deeper insights."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <PlanCard
          tag="Free"
          price="₹0"
          title="Starter"
          feats={FREE_FEATURES}
          current={!premium?.isPremium}
        />
        <PlanCard
          tag="Business Pro"
          price="₹1,999"
          title="Grow your hiring"
          feats={PRO_FEATURES}
          current={!!premium?.isPremium}
          accent
        />
      </div>

      <p className="mt-6 max-w-lg text-xs text-muted-foreground">
        Payments aren't wired up yet — no charge is made. Contact Provn support to have Business Pro
        granted manually while billing is being set up.
      </p>
    </BusinessShell>
  );
}

function PlanCard({
  tag,
  price,
  title,
  feats,
  current,
  accent,
}: {
  tag: string;
  price: string;
  title: string;
  feats: { on: boolean; t: string }[];
  current?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl border p-7 ${accent ? "border-brand bg-brand-soft/60" : "border-border bg-card"}`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${accent ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground"}`}
        >
          {accent && <Crown className="h-3 w-3" />} {tag}
        </span>
        <div className="text-right">
          <div className="font-display text-3xl">{price}</div>
          <div className="text-xs text-muted-foreground">/ month</div>
        </div>
      </div>
      <h3 className="mt-6 font-display text-2xl tracking-tight">{title}</h3>
      <ul className="mt-5 space-y-2 text-sm">
        {feats.map((f) => (
          <li key={f.t} className="flex items-start gap-2">
            {f.on ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            ) : (
              <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className={f.on ? "" : "text-muted-foreground line-through"}>{f.t}</span>
          </li>
        ))}
      </ul>
      <Button className="mt-6 w-full" variant={current ? "outline" : "default"} disabled>
        {current ? "Current plan" : "Payments coming soon"}
      </Button>
    </div>
  );
}
