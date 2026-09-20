import Stripe from "stripe";

import type {
  CheckoutSessionInput,
  CheckoutSessionResult,
  PaymentProvider,
  WebhookVerifyResult,
} from "./types";

// Only constructed when STRIPE_SECRET_KEY is present (see index.ts) — real
// checkout sessions never resolve immediately, activation happens when the
// webhook confirms `checkout.session.completed` / `invoice.paid`.
export function createStripeProvider(secretKey: string): PaymentProvider {
  const stripe = new Stripe(secretKey);

  return {
    name: "stripe",

    async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
      const mode = input.mode ?? "subscription";
      const session = await stripe.checkout.sessions.create({
        mode,
        customer_email: input.customerEmail,
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        metadata: input.metadata,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: input.currency.toLowerCase(),
              unit_amount: input.priceCents,
              ...(mode === "subscription" ? { recurring: { interval: "month" as const } } : {}),
              product_data: { name: input.planCode },
            },
          },
        ],
      });
      if (!session.url) throw new Error("Stripe did not return a checkout URL.");
      return { provider: "stripe", sessionId: session.id, url: session.url, immediateStatus: null };
    },

    verifyWebhookSignature(rawBody: string, signatureHeader: string | null): WebhookVerifyResult {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret)
        return { valid: false, error: "STRIPE_WEBHOOK_SECRET is not configured." };
      if (!signatureHeader) return { valid: false, error: "Missing Stripe-Signature header." };
      try {
        const event = stripe.webhooks.constructEvent(rawBody, signatureHeader, webhookSecret);
        return { valid: true, event: { id: event.id, type: event.type, data: event.data.object } };
      } catch (err) {
        return {
          valid: false,
          error: err instanceof Error ? err.message : "Webhook signature verification failed.",
        };
      }
    },
  };
}
