// Shared contract every payment provider adapter implements. Keeping this
// as a plain interface (not a class) means payments.server.ts never needs
// to know whether it's talking to Stripe or the mock — it just calls
// whatever getPaymentProvider() returns.

export type CheckoutSessionInput = {
  // "subscription" (default) recurs monthly; "payment" is a one-time charge
  // (course purchases, AI credit top-ups — nothing to bill again later).
  mode?: "subscription" | "payment";
  planCode: string;
  priceCents: number;
  currency: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
};

export type CheckoutSessionResult = {
  provider: "mock" | "stripe";
  sessionId: string;
  url: string;
  // Set only by the mock provider: there's no real payment step, so the
  // caller can activate the subscription synchronously instead of waiting
  // on a webhook that will never arrive without live Stripe keys.
  immediateStatus: "succeeded" | null;
};

export type WebhookVerifyResult =
  | { valid: true; event: { id: string; type: string; data: unknown } }
  | { valid: false; error: string };

export interface PaymentProvider {
  readonly name: "mock" | "stripe";
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult>;
  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): WebhookVerifyResult;
}
