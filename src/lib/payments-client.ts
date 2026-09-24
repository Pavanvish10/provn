import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import {
  createSubscriptionCheckoutFn,
  cancelSubscriptionFn,
  createCoursePurchaseCheckoutFn,
  createCreditPackCheckoutFn,
} from "@/lib/payments.server";

export type SubscriptionPlan = Database["public"]["Tables"]["subscription_plans"]["Row"];
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
export type Course = Database["public"]["Tables"]["courses"]["Row"];
export type CreditPack = Database["public"]["Tables"]["credit_packs"]["Row"];
export type AiCreditTransaction = Database["public"]["Tables"]["ai_credit_transactions"]["Row"];

// ---------------------------------------------------------------------
// Reads — direct RLS-scoped browser client queries, matching
// college-client.ts's convention (no server function needed for reads).
// ---------------------------------------------------------------------

export function usePlans(audience: "student" | "recruiter") {
  return useQuery({
    queryKey: ["subscription-plans", audience],
    queryFn: async (): Promise<SubscriptionPlan[]> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("audience", audience)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function mySubscriptionQueryKey(userId: string | undefined) {
  return ["my-subscription", userId] as const;
}

export function useMySubscription(userId: string | undefined) {
  return useQuery({
    queryKey: mySubscriptionQueryKey(userId),
    queryFn: async (): Promise<(Subscription & { plan: SubscriptionPlan | null }) | null> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, plan:subscription_plans(*)")
        .eq("profile_id", userId!)
        .is("company_id", null)
        .in("status", ["trialing", "active", "past_due"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as (Subscription & { plan: SubscriptionPlan | null }) | null;
    },
    enabled: !!userId,
  });
}

export function useMyPayments(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-payments", userId],
    queryFn: async (): Promise<Payment[]> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("profile_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });
}

export function useMyInvoices(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-invoices", userId],
    queryFn: async (): Promise<Invoice[]> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("profile_id", userId!)
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });
}

export function useCourses() {
  return useQuery({
    queryKey: ["courses"],
    queryFn: async (): Promise<Course[]> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCourse(courseId: string | undefined) {
  return useQuery({
    queryKey: ["course", courseId],
    queryFn: async (): Promise<Course | null> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });
}

export function useMyCourses(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-courses", userId],
    queryFn: async (): Promise<{ course_id: string; purchased_at: string }[]> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("course_purchases")
        .select("course_id, purchased_at")
        .eq("profile_id", userId!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });
}

export function useCreditPacks() {
  return useQuery({
    queryKey: ["credit-packs"],
    queryFn: async (): Promise<CreditPack[]> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("credit_packs")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function myCreditBalanceQueryKey(userId: string | undefined) {
  return ["my-credit-balance", userId] as const;
}

export function useMyCreditBalance(userId: string | undefined) {
  return useQuery({
    queryKey: myCreditBalanceQueryKey(userId),
    queryFn: async (): Promise<number> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("ai_credit_balances")
        .select("balance")
        .eq("profile_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data?.balance ?? 0;
    },
    enabled: !!userId,
  });
}

export function useMyCreditTransactions(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-credit-transactions", userId],
    queryFn: async (): Promise<AiCreditTransaction[]> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("ai_credit_transactions")
        .select("*")
        .eq("profile_id", userId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });
}

// ---------------------------------------------------------------------
// Mutations — wrap the server functions in payments.server.ts (every
// write to payment state must go through those, never a direct browser
// insert/update — see that file's RLS comment).
// ---------------------------------------------------------------------

export function useCreateSubscriptionCheckout(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { planCode: string; successUrl: string; cancelUrl: string }) =>
      createSubscriptionCheckoutFn({ data: vars }),
    onSuccess: (result) => {
      if (!result.error && result.activated) {
        queryClient.invalidateQueries({ queryKey: mySubscriptionQueryKey(userId) });
        queryClient.invalidateQueries({ queryKey: ["my-payments", userId] });
        queryClient.invalidateQueries({ queryKey: ["my-invoices", userId] });
        queryClient.invalidateQueries({ queryKey: ["premium", userId] });
      }
    },
  });
}

export function useCancelSubscription(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => cancelSubscriptionFn(),
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: mySubscriptionQueryKey(userId) });
        queryClient.invalidateQueries({ queryKey: ["premium", userId] });
      } else {
        toast.error(result.error);
      }
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Couldn't cancel your subscription."),
  });
}

export function useCreateCoursePurchaseCheckout(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { courseId: string; successUrl: string; cancelUrl: string }) =>
      createCoursePurchaseCheckoutFn({ data: vars }),
    onSuccess: (result) => {
      if (!result.error && result.activated) {
        queryClient.invalidateQueries({ queryKey: ["my-courses", userId] });
        queryClient.invalidateQueries({ queryKey: ["my-payments", userId] });
        queryClient.invalidateQueries({ queryKey: ["my-invoices", userId] });
      }
    },
  });
}

export function useCreateCreditPackCheckout(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { packCode: string; successUrl: string; cancelUrl: string }) =>
      createCreditPackCheckoutFn({ data: { ...vars, idempotencyKey: crypto.randomUUID() } }),
    onSuccess: (result) => {
      if (!result.error && result.activated) {
        queryClient.invalidateQueries({ queryKey: myCreditBalanceQueryKey(userId) });
        queryClient.invalidateQueries({ queryKey: ["my-credit-transactions", userId] });
        queryClient.invalidateQueries({ queryKey: ["my-payments", userId] });
        queryClient.invalidateQueries({ queryKey: ["my-invoices", userId] });
      }
    },
  });
}
