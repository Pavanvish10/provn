import { redirect } from "@tanstack/react-router";

import { interviewSessionStore, type InterviewSetupConfig } from "@/store/InterviewSessionStore";
import { clearPersistedSession } from "@/store/SessionPersistence";
import { FlowValidator } from "@/store/FlowValidator";
import { INTERVIEW_ROUTES, type InterviewRoutePath } from "@/store/InterviewNavigation";
import { ResumeAnalyzer } from "@/ai/resume/ResumeAnalyzer";
import { JobDescriptionAnalyzer } from "@/ai/resume/JobDescriptionAnalyzer";
import { ResumeStorageService } from "@/services/resume/ResumeStorageService";
import type { TranscriptEntry } from "@/services/realtime/transcriptManager";
import type { JobAnalysisResult } from "@/services/job/JobAnalysisEngine";
import { finishVoiceInterviewFn, type VoiceInterviewReport } from "@/lib/voice-interview.server";

// The orchestration layer: the single place that composes
// InterviewSessionStore (state), FlowValidator (rules), and the AI
// modules from Sprints 6-8 into the four actions Sprint 10 asks for —
// Start / Resume / End / Reset — plus the route guards every page in the
// flow uses. Pages call this, never the store or the AI engines, directly.

export class InterviewFlowController {
  // -- Flow actions ------------------------------------------------------

  /** Called once the Setup wizard's choices are confirmed. Saves the
   * config, then makes sure a resume and job description are available
   * for the rest of the flow. Sprint 12: `setSetup` now carries forward
   * whatever the candidate already supplied earlier in the flow (a real
   * uploaded resume from Sprint 11, or a real Job Analysis from Sprint
   * 12) — so this only ever fills in a mock for whichever of the two is
   * still missing, preserving the "go through the whole flow on dummy
   * data" guarantee from Sprint 10 without clobbering real data. */
  static startInterview(setup: InterviewSetupConfig) {
    interviewSessionStore.setSetup(setup);

    const session = interviewSessionStore.getSnapshot();
    if (!session.resumeMock) {
      const uploadedResume = ResumeStorageService.load();
      interviewSessionStore.setResumeMock(
        uploadedResume?.profile ?? new ResumeAnalyzer().analyzeMock(),
      );
    }
    if (!session.jobDescriptionMock) {
      interviewSessionStore.setJobDescriptionMock(new JobDescriptionAnalyzer().analyzeMock());
    }
  }

  /** Called once the Job Description page finishes a real analysis —
   * stores the full result (plan, roadmap, skill match) so the rest of
   * the flow (Setup's pre-fill, the Room's personalization, the Report)
   * can read it straight off the shared session store. */
  static applyJobAnalysis(result: JobAnalysisResult) {
    interviewSessionStore.setJobAnalysis(result);
  }

  static completeDeviceCheck() {
    interviewSessionStore.markDeviceCheckComplete();
  }

  /** Where an in-progress session should continue — used by "Resume
   * Interview" entry points (e.g. the dashboard's quick action) to land
   * the candidate on whichever step they hadn't finished yet. */
  static resumeInterview(): InterviewRoutePath {
    const session = interviewSessionStore.getSnapshot();
    if (!session.setup) return INTERVIEW_ROUTES.setup;
    if (!session.deviceCheckCompleted) return INTERVIEW_ROUTES.deviceCheck;
    if (session.status !== "completed") {
      interviewSessionStore.markInProgress();
      return INTERVIEW_ROUTES.room;
    }
    return INTERVIEW_ROUTES.report;
  }

  /** Called once the interview room connects — marks the session active. */
  static beginRoomSession() {
    interviewSessionStore.markInProgress();
  }

  /** Called once the real interview engine's opening question comes
   * back (voice mode: from ConversationManager via SessionManager's
   * emitted state; text mode: directly from startVoiceInterviewFn) —
   * records the real `voice_interview_sessions` row id so /interview/
   * report can fetch it once the interview ends. */
  static setVoiceInterviewSessionId(sessionId: string) {
    interviewSessionStore.setVoiceInterviewSessionId(sessionId);
  }

  /** Called when the candidate ends the interview. Captures whatever
   * realtime transcript exists (display/debugging only), then asks the
   * real interview engine (Sprint 14) to score the actual session and
   * generate the final report — the same Gemini call text-mode
   * interviews use. Returns null (no crash) if no real session was ever
   * created, e.g. the opening Gemini call failed. */
  static async endInterview(
    transcript: TranscriptEntry[],
    sessionId: string | null,
  ): Promise<VoiceInterviewReport | null> {
    interviewSessionStore.setConversationHistory(transcript);

    if (!sessionId) {
      interviewSessionStore.markCompleted();
      return null;
    }

    const result = await finishVoiceInterviewFn({ data: { sessionId } });
    interviewSessionStore.markCompleted();
    return result.error ? null : (result.report ?? null);
  }

  static resetInterview() {
    interviewSessionStore.reset();
    clearPersistedSession();
  }

  // -- Route guards --------------------------------------------------
  // Each mirrors the `beforeLoad: requireAuth` idiom already used across
  // the app's other routes (see src/lib/auth-guard.ts) — silent redirect,
  // skipped during SSR since session state only exists client-side.

  static enforceDeviceCheckAccess() {
    if (typeof window === "undefined") return;
    const check = FlowValidator.canAccessDeviceCheck(interviewSessionStore.getSnapshot());
    if (!check.allowed && check.redirectTo) throw redirect({ to: check.redirectTo });
  }

  static enforceRoomAccess() {
    if (typeof window === "undefined") return;
    const check = FlowValidator.canAccessRoom(interviewSessionStore.getSnapshot());
    if (!check.allowed && check.redirectTo) throw redirect({ to: check.redirectTo });
  }

  static enforceReportAccess() {
    if (typeof window === "undefined") return;
    const check = FlowValidator.canAccessReport(interviewSessionStore.getSnapshot());
    if (!check.allowed && check.redirectTo) throw redirect({ to: check.redirectTo });
  }
}
