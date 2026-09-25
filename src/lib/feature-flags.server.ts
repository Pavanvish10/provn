import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

/**
 * Sprint 35: real enforcement for the Launch Command Center's feature
 * toggles. Fails OPEN (treats a missing row or a query error as enabled)
 * so a problem with this table never takes a working feature down —
 * mirrors rate-limit.server.ts's checkRateLimit fail-open behavior.
 */
export async function isFeatureEnabled(
  supabase: SupabaseClient<Database>,
  key: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("feature_flags")
    .select("enabled")
    .eq("key", key)
    .maybeSingle();
  if (error || !data) return true;
  return data.enabled;
}

export const FEATURE_DISABLED_MESSAGE =
  "This feature is temporarily disabled. Please try again later.";
