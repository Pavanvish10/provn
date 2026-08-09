import { mockProvider } from "./mock-provider";
import { createStripeProvider } from "./stripe-provider";
import type { PaymentProvider } from "./types";

export type { PaymentProvider, CheckoutSessionInput, CheckoutSessionResult, WebhookVerifyResult } from "./types";

// TODO(API_KEY): set STRIPE_SECRET_KEY (and STRIPE_WEBHOOK_SECRET) in the
// environment to take real payments. Every caller of this function degrades
// gracefully to the mock provider when it's absent — no feature throws.
export function getPaymentProvider(): PaymentProvider {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return mockProvider;
  return createStripeProvider(secretKey);
}
