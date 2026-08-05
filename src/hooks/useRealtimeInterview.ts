import { useCallback, useEffect, useRef, useState } from "react";

import type { ConversationSetup } from "@/services/realtime/conversationManager";
import { SessionManager, type RealtimeSessionState } from "@/services/realtime/sessionManager";
import type { InterviewBrainPersonalization } from "@/ai/InterviewBrain";

export interface UseRealtimeInterviewResult extends RealtimeSessionState {
  start: () => void;
  stop: () => void;
  toggleMute: () => void;
}

/** Wires a SessionManager instance into React state. One instance lives
 * for the lifetime of the component; it's torn down (mic released,
 * connection closed) on unmount. `personalization` (Sprint 11) grounds
 * the live model's questions in a real uploaded resume when one is
 * available — see room.tsx for how it's built. */
export function useRealtimeInterview(
  setup: ConversationSetup,
  personalization?: InterviewBrainPersonalization,
): UseRealtimeInterviewResult {
  const managerRef = useRef<SessionManager | null>(null);
  if (!managerRef.current) managerRef.current = new SessionManager(setup, personalization);
  const manager = managerRef.current;

  const [state, setState] = useState<RealtimeSessionState>(() => manager.getState());

  useEffect(() => {
    const unsubscribe = manager.subscribe(setState);
    return () => {
      unsubscribe();
      manager.dispose();
    };
  }, [manager]);

  const start = useCallback(() => {
    void manager.start();
  }, [manager]);

  const stop = useCallback(() => {
    manager.stop();
  }, [manager]);

  const toggleMute = useCallback(() => {
    manager.toggleMute();
  }, [manager]);

  return { ...state, start, stop, toggleMute };
}
