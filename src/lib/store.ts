// Lightweight client-side app state stored in localStorage. Mock-only.
import { useEffect, useState, useSyncExternalStore } from "react";

type AppState = {
  authed: boolean;
  email?: string;
  name?: string;
  location?: string;
  profession?: string;
  plan?: "free" | "pro";
  darkMode: boolean;
  verification: {
    resume: boolean;
    codingTest: boolean;
    mockInterview: boolean;
  };
  verifiedSkills: string[];
  streak: number;
};

const KEY = "provn.state.v1";

const defaultState: AppState = {
  authed: false,
  darkMode: false,
  verification: { resume: false, codingTest: false, mockInterview: false },
  verifiedSkills: ["React", "TypeScript"],
  streak: 12,
};

const listeners = new Set<() => void>();
let cached: AppState | null = null;

function read(): AppState {
  if (cached) return cached;
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(KEY);
    cached = raw ? { ...defaultState, ...JSON.parse(raw) } : defaultState;
  } catch {
    cached = defaultState;
  }
  return cached!;
}

function write(next: AppState) {
  cached = next;
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(next));
    document.documentElement.classList.toggle("dark", next.darkMode);
  }
  listeners.forEach((l) => l());
}

export function setState(patch: Partial<AppState>) {
  write({ ...read(), ...patch });
}

export function useAppState() {
  const state = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => read(),
    () => defaultState,
  );
  return state;
}

export function useHydrateDarkMode() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const s = read();
    document.documentElement.classList.toggle("dark", s.darkMode);
    setReady(true);
    listeners.forEach((l) => l());
  }, []);
  return ready;
}

export function toggleDark() {
  const s = read();
  setState({ darkMode: !s.darkMode });
}
