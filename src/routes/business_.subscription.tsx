import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Crown, Loader2, X } from "lucide-react";

import { BusinessShell } from "@/components/BusinessNav";
import { requireBusinessAccount } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { usePremiumStatus } from "@/lib/premium-client";
import { usePlans, useCreateSubscriptionCheckout } from "@/lib/payments-client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/business_/subscription")({
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

function BusinessSubscription() {
  const { data: user } = useCurrentUser();
  const { data: premium } = usePremiumStatus(user?.id);
  const { data: plans = [] } = usePlans("recruiter");
  const growthPlan = plans.find((p) => p.code === "recruiter_growth");
  const subscribeCheckout = useCreateSubscriptionCheckout(user?.id);
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscribe = async () => {
    if (!growthPlan) return;
    setSubscribing(true);
    setError(null);
    try {
      const result = await subscribeCheckout.mutateAsync({
        planCode: growthPlan.code,
        successUrl: `${window.location.origin}/checkout/success`,
        cancelUrl: `${window.location.origin}/checkout/cancel`,
      });
      if (result.error) setError(result.error);
      else if (result.checkoutUrl && !result.activated) window.location.href = result.checkoutUrl;
      else if (result.activated) window.location.href = "/checkout/success";
    } catch {
      setError("Couldn't start checkout. Please try again.");
    } finally {
      setSubscribing(false);
    }
  };

  const proFeatures = growthPlan
    ? (growthPlan.features as string[]).map((t) => ({ on: true, t }))
    : [];

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
          price={growthPlan ? `₹${growthPlan.price_cents / 100}` : "₹4,999"}
          title="Grow your hiring"
          feats={proFeatures.length ? proFeatures : [{ on: true, t: "Unlimited job postings" }]}
          current={!!premium?.isPremium}
          accent
          onSubscribe={!premium?.isPremium ? subscribe : undefined}
          loading={subscribing}
        />
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
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
  onSubscribe,
  loading,
}: {
  tag: string;
  price: string;
  title: string;
  feats: { on: boolean; t: string }[];
  current?: boolean;
  accent?: boolean;
  onSubscribe?: () => void;
  loading?: boolean;
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
      <Button
        className="mt-6 w-full"
        variant={current ? "outline" : "default"}
        disabled={current || !onSubscribe || loading}
        onClick={onSubscribe}
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {current ? "Current plan" : "Subscribe"}
      </Button>
    </div>
  );
}
