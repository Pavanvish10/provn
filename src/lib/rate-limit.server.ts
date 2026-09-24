import { getSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Sprint 34: generic DB-backed rate limiter, backed by the
 * `check_rate_limit` Postgres function (migration
 * 20260927000000_sprint34_security_hardening.sql). The app deploys as
 * serverless functions, so an in-memory counter wouldn't persist across
 * invocations — this is a single atomic UPSERT per check instead.
 *
 * Fails OPEN (returns true) if the rate-limit check itself errors, so a
 * problem with this table never takes down the feature it's protecting —
 * logged server-side so it's still visible.
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<boolean> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.rpc("check_rate_limit", {
    p_key: key,
    p_max_requests: maxRequests,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("[rate-limit] check failed, failing open:", error.message);
    return true;
  }
  return data === true;
}

export const RATE_LIMIT_MESSAGE = "Too many requests. Please wait a moment and try again.";
