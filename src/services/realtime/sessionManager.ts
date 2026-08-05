// Orchestrates one interview session end-to-end: session lifecycle (the
// Idle -> ... -> Disconnected/Error state machine), mic + connection
// setup, automatic reconnection on an unexpected drop, and wiring
// realtime server events into the transcript/conversation managers. This
// is the only piece the UI talks to (via useRealtimeInterview) — it never
// touches RTCPeerConnection or getUserMedia directly.
//
// As of Sprint 6, "what to ask next" is no longer left to the live model
// alone: turn detection runs with automatic response creation switched
// off (create_response: false), and this class explicitly asks
// ConversationManager (backed by the AI Interview Brain) for a directive
// after every candidate answer before triggering the model's response —
// see sendDirectiveAndRespond().
import { AudioManager, type MicPermissionState } from "@/services/realtime/audioManager";
import {
  ConversationManager,
  type ConversationSetup,
} from "@/services/realtime/conversationManager";
import { RealtimeClient, type RealtimeServerEvent } from "@/services/realtime/realtimeClient";
import { TranscriptManager, type TranscriptEntry } from "@/services/realtime/transcriptManager";
import { createRealtimeClientSecretFn } from "@/services/realtime/realtimeSession.server";
import type { InterviewBrainPersonalization } from "@/ai/InterviewBrain";

export type RealtimeSessionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "listening"
  | "thinking"
  | "speaking"
  | "disconnected"
  | "error";

export interface RealtimeSessionState {
  status: RealtimeSessionStatus;
  error: string | null;
  micPermission: MicPermissionState;
  micMuted: boolean;
  transcript: TranscriptEntry[];
  questionNumber: number;
  reconnectAttempt: number;
}

const ACTIVE_STATUSES: RealtimeSessionStatus[] = [
  "connecting",
  "connected",
  "listening",
  "thinking",
  "speaking",
];

const MAX_RECONNECT_ATTEMPTS = 3;
// How long to wait for the candidate's answer to finish transcribing
// before asking the brain for the next question anyway — keeps a slow or
// failed transcription from stalling the interview indefinitely.
const ANSWER_TRANSCRIPTION_TIMEOUT_MS = 4000;

export class SessionManager {
  private audio = new AudioManager();
  private transcript = new TranscriptManager();
  private conversation: ConversationManager;
  private client: RealtimeClient | null = null;

  private status: RealtimeSessionStatus = "idle";
  private error: string | null = null;
  private reconnectAttempt = 0;
  private stopping = false;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  private awaitingAnswer = false;
  private answerFallbackTimeout: ReturnType<typeof setTimeout> | null = null;

  private listeners = new Set<(state: RealtimeSessionState) => void>();

  constructor(setup: ConversationSetup, personalization?: InterviewBrainPersonalization) {
    this.conversation = new ConversationManager(setup, personalization);
    this.transcript.subscribe(() => this.emit());
    this.audio.subscribe(() => this.emit());
  }

  subscribe(listener: (state: RealtimeSessionState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getState(): RealtimeSessionState {
    return {
      status: this.status,
      error: this.error,
      micPermission: this.audio.getMicPermission(),
      micMuted: this.audio.isMuted(),
      transcript: this.transcript.getEntries(),
      questionNumber: this.conversation.getQuestionNumber(),
      reconnectAttempt: this.reconnectAttempt,
    };
  }

  private emit() {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  private setStatus(status: RealtimeSessionStatus, error: string | null = null) {
    this.status = status;
    this.error = error;
    this.emit();
  }

  async start() {
    if (ACTIVE_STATUSES.includes(this.status)) return;
    this.stopping = false;
    this.reconnectAttempt = 0;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    await this.connectOnce();
  }

  private async connectOnce() {
    this.setStatus("connecting");
    try {
      const stream = this.audio.getLocalStream() ?? (await this.audio.requestMicrophone());

      const tokenResult = await createRealtimeClientSecretFn();
      if (tokenResult.error || !tokenResult.clientSecret) {
        this.setStatus("error", tokenResult.error ?? "Could not start the realtime session.");
        return;
      }

      this.client = new RealtimeClient({
        onConnectionStateChange: (state, message) =>
          this.handleConnectionStateChange(state, message),
        onRemoteStream: (remoteStream) => this.audio.attachRemoteStream(remoteStream),
        onServerEvent: (event) => this.handleServerEvent(event),
      });

      await this.client.connect(tokenResult.clientSecret, stream);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start the interview.";
      this.setStatus("error", message);
    }
  }

  private handleConnectionStateChange(
    state: "connected" | "disconnected" | "error",
    message?: string,
  ) {
    if (state === "connected") {
      this.reconnectAttempt = 0;
      this.setStatus("connected");
      this.configureSession();
      return;
    }
    if (state === "error") {
      this.setStatus("error", message ?? "Connection error.");
      return;
    }
    // state === "disconnected"
    if (this.stopping) {
      this.setStatus("disconnected");
      return;
    }
    this.attemptReconnect();
  }

  private attemptReconnect() {
    if (this.reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      this.setStatus(
        "error",
        "Lost connection to the AI interviewer and could not reconnect. Please try again.",
      );
      return;
    }
    this.reconnectAttempt += 1;
    this.setStatus("connecting");
    const delay = 800 * this.reconnectAttempt;
    this.reconnectTimeout = setTimeout(() => {
      if (this.stopping) return;
      void this.connectOnce();
    }, delay);
  }

  private configureSession() {
    this.client?.sendEvent({
      type: "session.update",
      session: {
        instructions: this.conversation.getInstructions(),
        // Server VAD still detects when the candidate starts/stops
        // talking, but doesn't auto-generate a response — the brain
        // decides what to ask next before every response.create call
        // below (see sendDirectiveAndRespond).
        turn_detection: { type: "server_vad", create_response: false },
        input_audio_transcription: { model: "whisper-1" },
      },
    });

    const { directive } = this.conversation.startInterview();
    this.sendDirectiveAndRespond(directive);
  }

  /** Injects the brain's decision as a hidden, text-only conversation item
   * — the candidate never sees or hears it — then asks the model to
   * respond, which it does by speaking a natural version of that
   * directive out loud. */
  private sendDirectiveAndRespond(directive: string) {
    this.client?.sendEvent({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "system",
        content: [{ type: "input_text", text: directive }],
      },
    });
    this.client?.sendEvent({ type: "response.create" });
  }

  private scheduleAnswerFallback() {
    this.clearAnswerFallback();
    this.answerFallbackTimeout = setTimeout(() => {
      this.resolveAnswerTurn("");
    }, ANSWER_TRANSCRIPTION_TIMEOUT_MS);
  }

  private clearAnswerFallback() {
    if (this.answerFallbackTimeout) {
      clearTimeout(this.answerFallbackTimeout);
      this.answerFallbackTimeout = null;
    }
  }

  /** Called exactly once per candidate turn — by whichever fires first,
   * the transcription completing or the fallback timeout. */
  private resolveAnswerTurn(answerText: string) {
    if (!this.awaitingAnswer) return;
    this.awaitingAnswer = false;
    this.clearAnswerFallback();

    const { directive } = this.conversation.submitAnswer(
      answerText.trim() || "(The candidate's response wasn't captured clearly.)",
    );
    this.sendDirectiveAndRespond(directive);
  }

  private handleServerEvent(event: RealtimeServerEvent) {
    switch (event.type) {
      case "input_audio_buffer.speech_started":
        this.setStatus("listening");
        break;

      case "input_audio_buffer.speech_stopped":
        this.setStatus("thinking");
        this.awaitingAnswer = true;
        this.scheduleAnswerFallback();
        break;

      case "conversation.item.input_audio_transcription.delta":
        this.transcript.appendCandidateDelta(readString(event, "delta"));
        break;

      case "conversation.item.input_audio_transcription.completed": {
        const text = readString(event, "transcript");
        this.transcript.finalizeCandidateTurn(text);
        this.resolveAnswerTurn(text);
        break;
      }

      case "response.created":
        this.transcript.startAiTurn();
        this.setStatus("thinking");
        break;

      // Naming has shifted across Realtime API versions — handle both.
      case "response.output_audio.delta":
      case "response.audio.delta":
        this.setStatus("speaking");
        break;

      case "response.output_audio_transcript.delta":
      case "response.audio_transcript.delta":
        this.transcript.appendAiDelta(readString(event, "delta"));
        break;

      case "response.output_audio_transcript.done":
      case "response.audio_transcript.done":
        this.transcript.finalizeAiTurn(readString(event, "transcript"));
        break;

      case "response.done":
        this.setStatus("listening");
        break;

      case "error":
        this.setStatus("error", readErrorMessage(event));
        break;

      default:
        break;
    }
  }

  toggleMute() {
    this.audio.setMuted(!this.audio.isMuted());
  }

  stop() {
    this.stopping = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.clearAnswerFallback();
    this.awaitingAnswer = false;
    this.client?.disconnect();
    this.client = null;
    this.audio.stop();
    this.transcript.reset();
    this.conversation.reset();
    this.setStatus("idle");
  }

  dispose() {
    this.stop();
  }
}

function readString(event: RealtimeServerEvent, key: string): string {
  const value = event[key];
  return typeof value === "string" ? value : "";
}

function readErrorMessage(event: RealtimeServerEvent): string {
  const errorField = event.error;
  if (errorField && typeof errorField === "object" && "message" in errorField) {
    const message = (errorField as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return "The AI interviewer reported an error.";
}
