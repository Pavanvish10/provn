import type { InterviewSessionData } from "@/store/InterviewSessionStore";

// Reading/writing the interview session to storage — the only place that
// touches sessionStorage directly, so InterviewSessionStore never has to
// know how (or whether) persistence works. sessionStorage rather than
// localStorage on purpose: it survives a page refresh mid-interview (the
// "Resume Interview" requirement) but doesn't leave a stale interview
// sitting around across browser sessions/tabs.

const STORAGE_KEY = "provn.interview-session.v1";

export function loadPersistedSession(): InterviewSessionData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as InterviewSessionData;
  } catch {
    return null;
  }
}

export function persistSession(data: InterviewSessionData): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage can fail (quota, private browsing) — the in-memory store
    // still works for the rest of this page load, it just won't survive
    // a refresh.
  }
}

export function clearPersistedSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do if storage is unavailable.
  }
}
