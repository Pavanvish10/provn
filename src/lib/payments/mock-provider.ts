import type {
  CheckoutSessionInput,
  CheckoutSessionResult,
  PaymentProvider,
  WebhookVerifyResult,
} from "./types";

// Used whenever STRIPE_SECRET_KEY isn't configured. Every method returns a
// deterministic, immediately-successful response instead of throwing, so
// the checkout/billing UI works end to end in dev and CI without a real
// payment provider.
export const mockProvider: PaymentProvider = {
  name: "mock",

  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
    const sessionId = `mock_cs_${crypto.randomUUID()}`;
    const url = `${input.successUrl}${input.successUrl.includes("?") ? "&" : "?"}mock_session=${sessionId}`;
    return { provider: "mock", sessionId, url, immediateStatus: "succeeded" };
  },

  verifyWebhookSignature(rawBody: string): WebhookVerifyResult {
    try {
      const parsed = JSON.parse(rawBody) as { id?: string; type?: string; data?: unknown };
      return {
        valid: true,
        event: {
          id: parsed.id ?? `mock_evt_${crypto.randomUUID()}`,
          type: parsed.type ?? "mock.event",
          data: parsed.data ?? {},
        },
      };
    } catch {
      return { valid: false, error: "Mock webhook payload was not valid JSON." };
    }
  },
};
