import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

/** Rows per page for paginated admin list views. */
export const ADMIN_PAGE_SIZE = 20;

/**
 * Writes an audit-log row to `admin_actions` for a destructive/privileged
 * admin operation (ban, suspend, verify, delete, grant, ...). Best-effort:
 * if the insert fails we log to the console rather than throwing, so a
 * broken audit write never blocks the primary action that already succeeded.
 */
export async function logAdminAction(
  supabase: SupabaseClient<Database>,
  params: {
    adminId: string;
    action: string;
    targetType: string;
    targetId?: string | null;
    notes?: string | null;
  },
) {
  const { error } = await supabase.from("admin_actions").insert({
    admin_id: params.adminId,
    action: params.action,
    target_type: params.targetType,
    target_id: params.targetId ?? null,
    notes: params.notes ?? null,
  });
  if (error) {
    console.error("Failed to write admin_actions audit log:", error);
  }
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" });
}
