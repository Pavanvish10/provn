import { createServerFn } from "@tanstack/react-start";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export type IntegrationHealth = {
  gemini: boolean;
  resend: boolean;
  judge0: boolean;
  stripe: boolean;
  supabase: boolean;
};

/**
 * Reports whether each external integration's env var is SET — never the
 * value itself. Every `.server.ts` file in this app already checks its own
 * `process.env.X` inline and degrades to a mock/disabled state when unset
 * (grepped: no shared helper exists) — this just surfaces those same
 * presence checks to the admin Launch Command Center. Admin-gated even
 * though it only returns booleans, consistent with Sprint 35's "everything
 * here is RBAC-protected" requirement.
 */
export const getIntegrationHealthFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ error: string | null; health?: IntegrationHealth }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) return { error: "Admin access required." };

    return {
      error: null,
      health: {
        gemini: !!process.env.GEMINI_API_KEY,
        resend: !!process.env.RESEND_API_KEY,
        judge0: !!process.env.JUDGE0_API_KEY,
        stripe: !!process.env.STRIPE_SECRET_KEY,
        supabase: !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY),
      },
    };
  },
);
