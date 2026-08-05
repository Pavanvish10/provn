import { useSyncExternalStore } from "react";

import type { ResumeProfile } from "@/ai/resume/ResumeAnalyzer";
import type { JobDescriptionAnalysis } from "@/ai/resume/JobDescriptionAnalyzer";
import type { EvaluationReport } from "@/ai/evaluation/EvaluationTypes";
import type { TranscriptEntry } from "@/services/realtime/transcriptManager";
import { loadPersistedSession, persistSession } from "@/store/SessionPersistence";

// The single source of truth for "what interview is the candidate
// currently going through" — shared across every route in the flow
// (Dashboard -> Setup -> Device Check -> Room -> Report). A plain
// module-singleton pub/sub store, matching the pattern already used for
// UI state in src/lib/store.ts, rather than pulling in a state library.

export type InterviewSessionStatus =
  "idle" | "configuring" | "device-check" | "in-progress" | "completed";

/** Exactly the fields the Setup wizard (Sprint 2) collects. */
export interface InterviewSetupConfig {
  interviewType: string;
  company: string | null;
  role: string;
  difficulty: string;
  duration: number;
  language: string;
  voice: string;
}

export interface InterviewSessionData {
  status: InterviewSessionStatus;
  setup: InterviewSetupConfig | null;
  deviceCheckCompleted: boolean;
  resumeMock: ResumeProfile | null;
  jobDescriptionMock: JobDescriptionAnalysis | null;
  conversationHistory: TranscriptEntry[];
  evaluationReport: EvaluationReport | null;
  startedAt: number | null;
  completedAt: number | null;
}

export const DEFAULT_SESSION: InterviewSessionData = {
  status: "idle",
  setup: null,
  deviceCheckCompleted: false,
  resumeMock: null,
  jobDescriptionMock: null,
  conversationHistory: [],
  evaluationReport: null,
  startedAt: null,
  completedAt: null,
};

class InterviewSessionStoreImpl {
  private data: InterviewSessionData = loadPersistedSession() ?? DEFAULT_SESSION;
  private listeners = new Set<() => void>();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    persistSession(this.data);
    this.listeners.forEach((listener) => listener());
  }

  getSnapshot(): InterviewSessionData {
    return this.data;
  }

  /** Saving a new setup is the root of the flow — it invalidates
   * everything downstream (device check, transcript, report) so a
   * candidate reconfiguring their interview never sees stale results
   * from a previous run. */
  setSetup(setup: InterviewSetupConfig) {
    this.data = {
      ...DEFAULT_SESSION,
      status: "configuring",
      setup,
      startedAt: Date.now(),
    };
    this.emit();
  }

  setResumeMock(profile: ResumeProfile) {
    this.data = { ...this.data, resumeMock: profile };
    this.emit();
  }

  clearResumeMock() {
    this.data = { ...this.data, resumeMock: null };
    this.emit();
  }

  setJobDescriptionMock(analysis: JobDescriptionAnalysis) {
    this.data = { ...this.data, jobDescriptionMock: analysis };
    this.emit();
  }

  markDeviceCheckComplete() {
    this.data = { ...this.data, deviceCheckCompleted: true, status: "device-check" };
    this.emit();
  }

  markInProgress() {
    this.data = { ...this.data, status: "in-progress" };
    this.emit();
  }

  setConversationHistory(entries: TranscriptEntry[]) {
    this.data = { ...this.data, conversationHistory: entries };
    this.emit();
  }

  setEvaluationReport(report: EvaluationReport) {
    this.data = { ...this.data, evaluationReport: report };
    this.emit();
  }

  markCompleted() {
    this.data = { ...this.data, status: "completed", completedAt: Date.now() };
    this.emit();
  }

  reset() {
    this.data = DEFAULT_SESSION;
    this.emit();
  }
}

export const interviewSessionStore = new InterviewSessionStoreImpl();

export function useInterviewSession(): InterviewSessionData {
  return useSyncExternalStore(
    (listener) => interviewSessionStore.subscribe(listener),
    () => interviewSessionStore.getSnapshot(),
    () => DEFAULT_SESSION,
  );
}
