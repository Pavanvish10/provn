import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "@/lib/payments";
import { sendPaymentReceiptEmail } from "@/lib/email.server";
import type { Json } from "@/lib/supabase/types";

// Real Stripe activation path — the mock provider never reaches here (see
// payments.server.ts's comment: mock activates synchronously in the
// checkout call itself since no webhook will ever arrive for it). Never
// trust anything client-reported as "payment succeeded"; this route is the
// only place a subscription/payment/course purchase/credit grant becomes
// real for the Stripe path, gated entirely on a verified signature.
//
// Mirrors src/routes/sitemap[.]xml.ts for the raw-response route shape —
// the only non-page-route mechanism this TanStack Start version supports.

type StripeMetadata = Record<string, string | undefined>;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function nextInvoiceNumber(admin: ReturnType<typeof getSupabaseAdminClient>) {
  const { data } = await admin.rpc("generate_invoice_number");
  return data ?? `INV-${Date.now()}`;
}

async function handleCheckoutCompleted(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  session: { id: string; metadata?: StripeMetadata; customer_email?: string | null },
) {
  const meta = session.metadata ?? {};
  const profileId = meta.profileId;
  if (!profileId) return;

  const { data: profile } = await admin
    .from("profiles")
    .select("email, full_name")
    .eq("id", profileId)
    .maybeSingle();
  const email = profile?.email ?? session.customer_email ?? null;
  const fullName = profile?.full_name ?? "";

  if (meta.planId) {
    const { data: plan } = await admin
      .from("subscription_plans")
      .select("id, name, price_cents, currency, billing_interval")
      .eq("id", meta.planId)
      .maybeSingle();
    if (!plan) return;

    await admin
      .from("subscriptions")
      .update({ status: "canceled", canceled_at: new Date().toISOString() })
      .eq("profile_id", profileId)
      .is("company_id", null)
      .in("status", ["trialing", "active", "past_due"]);

    const days = plan.billing_interval === "year" ? 365 : 30;
    const periodEnd =
      plan.price_cents === 0
        ? null
        : new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    const { data: subscription } = await admin
      .from("subscriptions")
      .insert({
        profile_id: profileId,
        plan_id: plan.id,
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd,
        payment_provider: "stripe",
        provider_subscription_id: session.id,
      })
      .select("id")
      .single();

    const { data: payment } = await admin
      .from("payments")
      .insert({
        subscription_id: subscription?.id ?? null,
        profile_id: profileId,
        plan_id: plan.id,
        amount_cents: plan.price_cents,
        currency: plan.currency,
        status: "succeeded",
        provider: "stripe",
        provider_payment_id: session.id,
        description: `Subscription: ${plan.name}`,
      })
      .select("id")
      .single();

    if (payment && plan.price_cents > 0) {
      await admin.from("invoices").insert({
        payment_id: payment.id,
        subscription_id: subscription?.id ?? null,
        profile_id: profileId,
        invoice_number: await nextInvoiceNumber(admin),
        amount_cents: plan.price_cents,
        currency: plan.currency,
        status: "paid",
        line_items: [{ description: plan.name, amount_cents: plan.price_cents }] as unknown as Json,
        paid_at: new Date().toISOString(),
      });
      if (email) {
        await sendPaymentReceiptEmail({
          to: email,
          name: fullName,
          description: `Subscription: ${plan.name}`,
          amountCents: plan.price_cents,
          currency: plan.currency,
        });
      }
    }
    return;
  }

  if (meta.courseId) {
    const { data: course } = await admin
      .from("courses")
      .select("id, title, price_cents, currency")
      .eq("id", meta.courseId)
      .maybeSingle();
    if (!course) return;

    const { data: payment } = await admin
      .from("payments")
      .insert({
        profile_id: profileId,
        amount_cents: course.price_cents,
        currency: course.currency,
        status: "succeeded",
        provider: "stripe",
        provider_payment_id: session.id,
        description: `Course: ${course.title}`,
      })
      .select("id")
      .single();
    if (!payment) return;

    await admin
      .from("course_purchases")
      .upsert(
        { course_id: course.id, profile_id: profileId, payment_id: payment.id },
        { onConflict: "course_id,profile_id" },
      );

    await admin.from("invoices").insert({
      payment_id: payment.id,
      profile_id: profileId,
      invoice_number: await nextInvoiceNumber(admin),
      amount_cents: course.price_cents,
      currency: course.currency,
      status: "paid",
      line_items: [
        { description: course.title, amount_cents: course.price_cents },
      ] as unknown as Json,
      paid_at: new Date().toISOString(),
    });
    if (email) {
      await sendPaymentReceiptEmail({
        to: email,
        name: fullName,
        description: `Course: ${course.title}`,
        amountCents: course.price_cents,
        currency: course.currency,
      });
    }
    return;
  }

  if (meta.creditPackId) {
    const { data: pack } = await admin
      .from("credit_packs")
      .select("id, name, credits, price_cents, currency")
      .eq("id", meta.creditPackId)
      .maybeSingle();
    if (!pack) return;

    const { data: payment } = await admin
      .from("payments")
      .insert({
        profile_id: profileId,
        amount_cents: pack.price_cents,
        currency: pack.currency,
        status: "succeeded",
        provider: "stripe",
        provider_payment_id: session.id,
        description: `AI Credits: ${pack.name}`,
      })
      .select("id")
      .single();
    if (!payment) return;

    await admin.rpc("grant_ai_credits", {
      p_profile_id: profileId,
      p_amount: pack.credits,
      p_reason: "purchase",
      p_reference_type: "credit_pack",
      p_reference_id: pack.id,
    });

    await admin.from("invoices").insert({
      payment_id: payment.id,
      profile_id: profileId,
      invoice_number: await nextInvoiceNumber(admin),
      amount_cents: pack.price_cents,
      currency: pack.currency,
      status: "paid",
      line_items: [{ description: pack.name, amount_cents: pack.price_cents }] as unknown as Json,
      paid_at: new Date().toISOString(),
    });
    if (email) {
      await sendPaymentReceiptEmail({
        to: email,
        name: fullName,
        description: `AI Credits: ${pack.name}`,
        amountCents: pack.price_cents,
        currency: pack.currency,
      });
    }
  }
}

async function handleSubscriptionUpdated(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  sub: { id: string; status?: string; current_period_end?: number; cancel_at_period_end?: boolean },
) {
  const statusMap: Record<string, string> = {
    active: "active",
    trialing: "trialing",
    past_due: "past_due",
    canceled: "canceled",
    unpaid: "past_due",
    incomplete_expired: "expired",
  };
  await admin
    .from("subscriptions")
    .update({
      status: sub.status ? (statusMap[sub.status] ?? sub.status) : undefined,
      current_period_end: sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : undefined,
      cancel_at_period_end: sub.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq("provider_subscription_id", sub.id);
}

async function handleSubscriptionDeleted(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  sub: { id: string },
) {
  await admin
    .from("subscriptions")
    .update({ status: "canceled", canceled_at: new Date().toISOString() })
    .eq("provider_subscription_id", sub.id);
}

export const Route = createFileRoute("/api/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const signature = request.headers.get("stripe-signature");

        const result = getPaymentProvider().verifyWebhookSignature(rawBody, signature);
        if (!result.valid) {
          return jsonResponse({ error: result.error }, 400);
        }

        const admin = getSupabaseAdminClient();

        // Idempotency: Stripe redelivers events. A unique constraint on
        // event_id means a duplicate delivery fails this insert and we
        // acknowledge without reprocessing, rather than double-crediting.
        const { error: insertError } = await admin.from("payment_webhook_events").insert({
          provider: "stripe",
          event_id: result.event.id,
          event_type: result.event.type,
          payload: result.event.data as Json,
        });
        if (insertError) {
          return jsonResponse({ received: true, duplicate: true });
        }

        try {
          const payload = result.event.data as Record<string, unknown>;
          switch (result.event.type) {
            case "checkout.session.completed":
              await handleCheckoutCompleted(
                admin,
                payload as {
                  id: string;
                  metadata?: StripeMetadata;
                  customer_email?: string | null;
                },
              );
              break;
            case "customer.subscription.updated":
              await handleSubscriptionUpdated(
                admin,
                payload as {
                  id: string;
                  status?: string;
                  current_period_end?: number;
                  cancel_at_period_end?: boolean;
                },
              );
              break;
            case "customer.subscription.deleted":
              await handleSubscriptionDeleted(admin, payload as { id: string });
              break;
            default:
              break;
          }
          await admin
            .from("payment_webhook_events")
            .update({ processed: true, processed_at: new Date().toISOString() })
            .eq("event_id", result.event.id);
        } catch (err) {
          await admin
            .from("payment_webhook_events")
            .update({
              error: err instanceof Error ? err.message : "Unknown webhook processing error.",
            })
            .eq("event_id", result.event.id);
        }

        return jsonResponse({ received: true });
      },
    },
  },
});
