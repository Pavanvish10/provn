import { createFileRoute, Link } from "@tanstack/react-router";
import { XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth-guard";

export const Route = createFileRoute("/checkout/cancel")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "Checkout canceled · Provn" }] }),
  component: CheckoutCancel,
});

function CheckoutCancel() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
        <XCircle className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-4 font-display text-2xl tracking-tight">Checkout canceled</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          No charge was made. You can try again anytime.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link to="/plan">
            <Button className="w-full">Back to plans</Button>
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
