import type { InterviewSessionData } from "@/store/InterviewSessionStore";
import { INTERVIEW_ROUTES, type InterviewRoutePath } from "@/store/InterviewNavigation";

// Pure "is this step reachable right now" logic — given a session
// snapshot, decide whether a step is allowed and, if not, where the
// candidate should be sent instead. Deliberately has no dependency on
// the store, the router, or React, so it's trivial to reason about (and
// test) in isolation; InterviewFlowController is what wires this into
// actual redirects.

export interface FlowCheckResult {
  allowed: boolean;
  redirectTo?: InterviewRoutePath;
  reason?: string;
}

const ALLOWED: FlowCheckResult = { allowed: true };

export class FlowValidator {
  static canAccessDeviceCheck(session: InterviewSessionData): FlowCheckResult {
    if (!session.setup) {
      return {
        allowed: false,
        redirectTo: INTERVIEW_ROUTES.setup,
        reason: "Complete interview setup before checking your devices.",
      };
    }
    return ALLOWED;
  }

  static canAccessRoom(session: InterviewSessionData): FlowCheckResult {
    if (!session.setup) {
      return {
        allowed: false,
        redirectTo: INTERVIEW_ROUTES.setup,
        reason: "Complete interview setup first.",
      };
    }
    // Text mode has no camera/mic session to check — device-check is a
    // voice-mode-only step (see setup.tsx's handleStart).
    if (session.setup.mode !== "text" && !session.deviceCheckCompleted) {
      return {
        allowed: false,
        redirectTo: INTERVIEW_ROUTES.deviceCheck,
        reason: "Finish the device check before entering the interview room.",
      };
    }
    return ALLOWED;
  }

  static canAccessReport(session: InterviewSessionData): FlowCheckResult {
    // Sprint 14: a real report means a real voice_interview_sessions row
    // exists — replaces the old local-evaluationReport check now that
    // scoring happens server-side via the real interview engine.
    if (session.voiceInterviewSessionId) return ALLOWED;
    if (!session.setup) {
      return {
        allowed: false,
        redirectTo: INTERVIEW_ROUTES.setup,
        reason: "Start an interview before viewing a report.",
      };
    }
    if (session.setup.mode !== "text" && !session.deviceCheckCompleted) {
      return {
        allowed: false,
        redirectTo: INTERVIEW_ROUTES.deviceCheck,
        reason: "Finish the device check before viewing a report.",
      };
    }
    return {
      allowed: false,
      redirectTo: INTERVIEW_ROUTES.room,
      reason: "Finish the interview before viewing its report.",
    };
  }
}
