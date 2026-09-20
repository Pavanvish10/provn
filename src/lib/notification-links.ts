import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import type { Notification } from "@/lib/notifications-client";

// Resolves a notification to an actual, already-existing route — never a
// stored/attacker-influenced URL (notifications carry no action_url
// column by design; every href below is a fixed literal from this
// module, which structurally rules out an open-redirect via notification
// content). Built from a full audit of every real create_notification()
// call site in supabase/migrations (see .claude/project-history.md) —
// each mapping below was verified against the actual route file, not
// guessed:
//   - no single-post page exists (posts render inline in the /home feed)
//   - no single-job page exists (/apply lists open jobs + applications,
//     no id param)
//   - /messages only accepts ?to=<profileId> to start/open a DM, not a
//     conversation id, so a generic /messages is the safe target
//   - /interview/report requires in-memory flow state
//     (InterviewFlowController) and cannot be cold-deep-linked by id
//   - challenges.$slug is slug-based but the notification stores a
//     challenge UUID, so this does one small lookup to resolve the slug
//   - job_update/interview/billing_update are sent to both students and
//     company members for the same `type` value, so the target branches
//     on the viewer's account_type
export async function resolveNotificationHref(
  supabase: SupabaseClient<Database>,
  notification: Notification,
  accountType: string | null | undefined,
): Promise<string | null> {
  switch (notification.type) {
    case "like":
    case "comment":
      return "/home";
    case "friend_request":
    case "friend_accept":
      return "/friends";
    case "message":
      return "/messages";
    case "challenge_completion": {
      if (!notification.entity_id) return "/challenges";
      const { data } = await supabase
        .from("challenges")
        .select("slug")
        .eq("id", notification.entity_id)
        .maybeSingle();
      return data?.slug ? `/challenges/${data.slug}` : "/challenges";
    }
    case "mock_interview":
      return "/interview-practice";
    case "job_update":
    case "interview":
      return accountType === "company" ? "/business/applicants" : "/apply";
    case "company_post":
    case "job_invite":
      return "/apply";
    case "drive_update":
      return "/my-drives";
    case "billing_update":
      return accountType === "company" ? "/business/subscription" : "/billing";
    case "profile_update":
      return "/profile";
    case "resume_analysis":
      return "/resume-analyse";
    case "coding_test":
      return "/coding-interview";
    case "system":
    default:
      return null;
  }
}
