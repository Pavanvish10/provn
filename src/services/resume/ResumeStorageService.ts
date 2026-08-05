import type { ResumeProfile } from "@/ai/resume/ResumeAnalyzer";
import type { ParsedResume } from "@/services/resume/ResumeParserService";
import { interviewSessionStore } from "@/store/InterviewSessionStore";

// Client-side only — no backend storage, per this sprint's constraints.
// Keeps the uploaded resume's metadata + parsed profile in sessionStorage
// (survives a refresh, cleared when the tab closes) under its own key,
// independent of InterviewSessionStore's per-attempt session — a
// candidate's resume shouldn't disappear just because they retake an
// interview. Every successful save also pushes the parsed profile into
// the live InterviewSessionStore so Setup/Room/Report immediately see it.

const STORAGE_KEY = "provn.uploaded-resume.v1";

export interface StoredResumeMeta {
  filename: string;
  sizeBytes: number;
  uploadedAt: number;
  sourceFormat: string;
  isMockExtraction: boolean;
}

export interface StoredResume {
  meta: StoredResumeMeta;
  profile: ResumeProfile;
}

export class ResumeStorageService {
  static save(parsed: ParsedResume, sizeBytes: number): StoredResumeMeta {
    const meta: StoredResumeMeta = {
      filename: parsed.filename,
      sizeBytes,
      uploadedAt: Date.now(),
      sourceFormat: parsed.sourceFormat,
      isMockExtraction: parsed.isMockExtraction,
    };

    if (typeof window !== "undefined") {
      try {
        const record: StoredResume = { meta, profile: parsed.profile };
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(record));
      } catch {
        // Storage can fail (quota, private browsing) — the resume is
        // still available for the rest of this page load via the
        // interview session store below.
      }
    }

    interviewSessionStore.setResumeMock(parsed.profile);
    return meta;
  }

  static load(): StoredResume | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as StoredResume) : null;
    } catch {
      return null;
    }
  }

  static clear(): void {
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // Nothing to do if storage is unavailable.
      }
    }
    interviewSessionStore.clearResumeMock();
  }
}
