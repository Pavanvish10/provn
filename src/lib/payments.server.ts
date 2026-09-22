import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getSupabaseServerClient, getSupabaseAdminClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "@/lib/payments";
import { sendPaymentReceiptEmail } from "@/lib/email.server";
import type { Json } from "@/lib/supabase/types";

// Sprint 27: checkout + activation. The mock provider (what actually runs
// without STRIPE_SECRET_KEY configured) returns immediateStatus:"succeeded"
// synchronously — there is no webhook for it to arrive later — so these
// functions activate the purchase themselves right here when that happens.
// With a real Stripe key, immediateStatus is null and activation instead
// happens in src/routes/api.stripe-webhook.ts when Stripe confirms payment.
// All state-changing writes use getSupabaseAdminClient(), matching this
// schema's RLS design: authenticated users have no insert/update policy on
// subscriptions/payments/invoices/course_purchases/ai_credit_balances.

type CurrentUser = { error: string } | { userId: string; email: string; fullName: string };

async function currentUserAndProfile(): Promise<CurrentUser> {
  const supabase = getSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Not signed in." };
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (!profile?.email) return { error: "Your account has no email on file." };
  return { userId: auth.user.id, email: profile.email, fullName: profile.full_name ?? "" };
}

function periodEndFor(billingInterval: string, priceCents: number): string | null {
  if (priceCents === 0) return null;
  const days = billingInterval === "year" ? 365 : 30;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

async function nextInvoiceNumber(admin: ReturnType<typeof getSupabaseAdminClient>) {
  const { data, error } = await admin.rpc("generate_invoice_number");
  if (error || !data) throw new Error(error?.message ?? "Could not generate an invoice number.");
  return data;
}

export const createSubscriptionCheckoutFn = createServerFn({ method: "POST" })
  .validator(z.object({ planCode: z.string(), successUrl: z.string(), cancelUrl: z.string() }))
  .handler(
    async ({
      data,
    }): Promise<{ error: string | null; checkoutUrl?: string; activated?: boolean }> => {
      const who = await currentUserAndProfile();
      if ("error" in who) return { error: who.error };

      const supabase = getSupabaseServerClient();
      const { data: plan, error: planError } = await supabase
        .from("subscription_plans")
        .select("id, code, name, audience, price_cents, currency, billing_interval")
        .eq("code", data.planCode)
        .eq("is_active", true)
        .maybeSingle();
      if (planError) return { error: planError.message };
      if (!plan) return { error: "This plan is no longer available." };

      const provider = getPaymentProvider();
      let checkout;
      try {
        checkout = await provider.createCheckoutSession({
          mode: "subscription",
          planCode: plan.code,
          priceCents: plan.price_cents,
          currency: plan.currency,
          customerEmail: who.email,
          successUrl: data.successUrl,
          cancelUrl: data.cancelUrl,
          metadata: { profileId: who.userId, planId: plan.id, planCode: plan.code },
        });
      } catch (err) {
        return { error: err instanceof Error ? err.message : "Could not start checkout." };
      }

      if (checkout.immediateStatus !== "succeeded") {
        return { error: null, checkoutUrl: checkout.url, activated: false };
      }

      const admin = getSupabaseAdminClient();

      await admin
        .from("subscriptions")
        .update({ status: "canceled", canceled_at: new Date().toISOString() })
        .eq("profile_id", who.userId)
        .is("company_id", null)
        .in("status", ["trialing", "active", "past_due"]);

      const periodEnd = periodEndFor(plan.billing_interval, plan.price_cents);
      const { data: subscription, error: subError } = await admin
        .from("subscriptions")
        .insert({
          profile_id: who.userId,
          plan_id: plan.id,
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd,
          payment_provider: checkout.provider,
          provider_subscription_id: checkout.sessionId,
        })
        .select("id")
        .single();
      if (subError) return { error: subError.message };

      const { data: payment, error: payError } = await admin
        .from("payments")
        .insert({
          subscription_id: subscription.id,
          profile_id: who.userId,
          plan_id: plan.id,
          amount_cents: plan.price_cents,
          currency: plan.currency,
          status: "succeeded",
          provider: checkout.provider,
          provider_payment_id: checkout.sessionId,
          description: `Subscription: ${plan.name}`,
        })
        .select("id")
        .single();
      if (payError) return { error: payError.message };

      if (plan.price_cents > 0) {
        const invoiceNumber = await nextInvoiceNumber(admin);
        await admin.from("invoices").insert({
          payment_id: payment.id,
          subscription_id: subscription.id,
          profile_id: who.userId,
          invoice_number: invoiceNumber,
          amount_cents: plan.price_cents,
          currency: plan.currency,
          status: "paid",
          line_items: [
            { description: plan.name, amount_cents: plan.price_cents },
          ] as unknown as Json,
          paid_at: new Date().toISOString(),
        });
        await sendPaymentReceiptEmail({
          to: who.email,
          name: who.fullName,
          description: `Subscription: ${plan.name}`,
          amountCents: plan.price_cents,
          currency: plan.currency,
        });
      }

      return { error: null, checkoutUrl: checkout.url, activated: true };
    },
  );

export const cancelSubscriptionFn = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ error: string | null }> => {
    const who = await currentUserAndProfile();
    if ("error" in who) return { error: who.error };

    const admin = getSupabaseAdminClient();
    const { data: active } = await admin
      .from("subscriptions")
      .select("id")
      .eq("profile_id", who.userId)
      .is("company_id", null)
      .in("status", ["trialing", "active", "past_due"])
      .maybeSingle();
    if (!active) return { error: "You don't have an active subscription to cancel." };

    const { error } = await admin
      .from("subscriptions")
      .update({ status: "canceled", canceled_at: new Date().toISOString() })
      .eq("id", active.id);
    if (error) return { error: error.message };
    return { error: null };
  },
);

export const createCoursePurchaseCheckoutFn = createServerFn({ method: "POST" })
  .validator(
    z.object({ courseId: z.string().uuid(), successUrl: z.string(), cancelUrl: z.string() }),
  )
  .handler(
    async ({
      data,
    }): Promise<{ error: string | null; checkoutUrl?: string; activated?: boolean }> => {
      const who = await currentUserAndProfile();
      if ("error" in who) return { error: who.error };

      const supabase = getSupabaseServerClient();
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .select("id, title, price_cents, currency")
        .eq("id", data.courseId)
        .eq("is_active", true)
        .maybeSingle();
      if (courseError) return { error: courseError.message };
      if (!course) return { error: "This course is no longer available." };

      const { data: existing } = await supabase
        .from("course_purchases")
        .select("id")
        .eq("course_id", course.id)
        .eq("profile_id", who.userId)
        .maybeSingle();
      if (existing) return { error: "You already own this course." };

      const provider = getPaymentProvider();
      let checkout;
      try {
        checkout = await provider.createCheckoutSession({
          mode: "payment",
          planCode: course.title,
          priceCents: course.price_cents,
          currency: course.currency,
          customerEmail: who.email,
          successUrl: data.successUrl,
          cancelUrl: data.cancelUrl,
          metadata: { profileId: who.userId, courseId: course.id },
        });
      } catch (err) {
        return { error: err instanceof Error ? err.message : "Could not start checkout." };
      }

      if (checkout.immediateStatus !== "succeeded") {
        return { error: null, checkoutUrl: checkout.url, activated: false };
      }

      const admin = getSupabaseAdminClient();

      // Insert the purchase row FIRST — its (course_id, profile_id) unique
      // constraint is what actually prevents a double-click or a retried
      // request from granting/charging for the same course twice. The
      // `existing` check above is only a fast-path for the common case and
      // is not itself race-safe.
      const { data: purchase, error: purchaseError } = await admin
        .from("course_purchases")
        .insert({ course_id: course.id, profile_id: who.userId })
        .select("id")
        .single();
      if (purchaseError) {
        if (purchaseError.code === "23505") return { error: "You already own this course." };
        return { error: purchaseError.message };
      }

      const { data: payment, error: payError } = await admin
        .from("payments")
        .insert({
          profile_id: who.userId,
          amount_cents: course.price_cents,
          currency: course.currency,
          status: "succeeded",
          provider: checkout.provider,
          provider_payment_id: checkout.sessionId,
          description: `Course: ${course.title}`,
        })
        .select("id")
        .single();
      if (payError) {
        // Don't leave the user with course access but no payment record.
        await admin.from("course_purchases").delete().eq("id", purchase.id);
        return { error: payError.message };
      }

      await admin.from("course_purchases").update({ payment_id: payment.id }).eq("id", purchase.id);

      const invoiceNumber = await nextInvoiceNumber(admin);
      await admin.from("invoices").insert({
        payment_id: payment.id,
        profile_id: who.userId,
        invoice_number: invoiceNumber,
        amount_cents: course.price_cents,
        currency: course.currency,
        status: "paid",
        line_items: [
          { description: course.title, amount_cents: course.price_cents },
        ] as unknown as Json,
        paid_at: new Date().toISOString(),
      });
      await sendPaymentReceiptEmail({
        to: who.email,
        name: who.fullName,
        description: `Course: ${course.title}`,
        amountCents: course.price_cents,
        currency: course.currency,
      });

      return { error: null, checkoutUrl: checkout.url, activated: true };
    },
  );

export const createCreditPackCheckoutFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      packCode: z.string(),
      successUrl: z.string(),
      cancelUrl: z.string(),
      idempotencyKey: z.string().uuid(),
    }),
  )
  .handler(
    async ({
      data,
    }): Promise<{ error: string | null; checkoutUrl?: string; activated?: boolean }> => {
      const who = await currentUserAndProfile();
      if ("error" in who) return { error: who.error };

      const admin = getSupabaseAdminClient();
      // A prior call with this exact idempotency key already ran to
      // completion (double-click, retried request after a timeout, etc.)
      // — credits were already granted, so report success without
      // redoing any writes or double-granting.
      const { data: alreadyProcessed } = await admin
        .from("payments")
        .select("id")
        .eq("idempotency_key", data.idempotencyKey)
        .maybeSingle();
      if (alreadyProcessed) return { error: null, activated: true };

      const supabase = getSupabaseServerClient();
      const { data: pack, error: packError } = await supabase
        .from("credit_packs")
        .select("id, code, name, credits, price_cents, currency")
        .eq("code", data.packCode)
        .eq("is_active", true)
        .maybeSingle();
      if (packError) return { error: packError.message };
      if (!pack) return { error: "This credit pack is no longer available." };

      const provider = getPaymentProvider();
      let checkout;
      try {
        checkout = await provider.createCheckoutSession({
          mode: "payment",
          planCode: pack.name,
          priceCents: pack.price_cents,
          currency: pack.currency,
          customerEmail: who.email,
          successUrl: data.successUrl,
          cancelUrl: data.cancelUrl,
          metadata: { profileId: who.userId, creditPackId: pack.id },
        });
      } catch (err) {
        return { error: err instanceof Error ? err.message : "Could not start checkout." };
      }

      if (checkout.immediateStatus !== "succeeded") {
        return { error: null, checkoutUrl: checkout.url, activated: false };
      }

      const { data: payment, error: payError } = await admin
        .from("payments")
        .insert({
          profile_id: who.userId,
          amount_cents: pack.price_cents,
          currency: pack.currency,
          status: "succeeded",
          provider: checkout.provider,
          provider_payment_id: checkout.sessionId,
          description: `AI Credits: ${pack.name}`,
          idempotency_key: data.idempotencyKey,
        })
        .select("id")
        .single();
      if (payError) {
        // Unique violation on idempotency_key: a concurrent duplicate
        // request already inserted the payment and will grant credits.
        if (payError.code === "23505") return { error: null, activated: true };
        return { error: payError.message };
      }

      const { error: grantError } = await admin.rpc("grant_ai_credits", {
        p_profile_id: who.userId,
        p_amount: pack.credits,
        p_reason: "purchase",
        p_reference_type: "credit_pack",
        p_reference_id: pack.id,
      });
      if (grantError) return { error: grantError.message };

      const invoiceNumber = await nextInvoiceNumber(admin);
      await admin.from("invoices").insert({
        payment_id: payment.id,
        profile_id: who.userId,
        invoice_number: invoiceNumber,
        amount_cents: pack.price_cents,
        currency: pack.currency,
        status: "paid",
        line_items: [{ description: pack.name, amount_cents: pack.price_cents }] as unknown as Json,
        paid_at: new Date().toISOString(),
      });
      await sendPaymentReceiptEmail({
        to: who.email,
        name: who.fullName,
        description: `AI Credits: ${pack.name}`,
        amountCents: pack.price_cents,
        currency: pack.currency,
      });

      return { error: null, checkoutUrl: checkout.url, activated: true };
    },
  );
