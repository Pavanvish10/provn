import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth-guard";

export const Route = createFileRoute("/checkout/success")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "Payment successful · Provn" }] }),
  component: CheckoutSuccess,
});

function CheckoutSuccess() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
        <h1 className="mt-4 font-display text-2xl tracking-tight">Payment successful</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your purchase is confirmed. A receipt has been sent to your email, and you can view it
          anytime from your billing page.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link to="/billing">
            <Button className="w-full">Go to billing</Button>
          </Link>
          <Link to="/home">
            <Button variant="outline" className="w-full">
              Back to home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
