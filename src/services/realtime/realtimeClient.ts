// Low-level transport: a single WebRTC connection attempt to OpenAI's
// Realtime API. This class knows nothing about interview/session
// semantics or reconnection policy — it just negotiates one connection,
// streams the given local audio track, surfaces the remote AI audio
// track, and relays parsed data-channel events. sessionManager owns
// retry/reconnection by creating a fresh RealtimeClient per attempt.

export type RealtimeConnectionState = "connected" | "disconnected" | "error";

export interface RealtimeServerEvent {
  type: string;
  [key: string]: unknown;
}

export interface RealtimeClientHandlers {
  onConnectionStateChange: (state: RealtimeConnectionState, message?: string) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onServerEvent: (event: RealtimeServerEvent) => void;
}

// OpenAI Realtime API — WebRTC integration (see
// https://platform.openai.com/docs/guides/realtime-webrtc). The endpoint
// and model are isolated here as the single place to update if OpenAI
// changes either.
const REALTIME_URL = "https://api.openai.com/v1/realtime";
const REALTIME_MODEL = "gpt-realtime";

export class RealtimeClient {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private handlers: RealtimeClientHandlers;
  private closed = false;

  constructor(handlers: RealtimeClientHandlers) {
    this.handlers = handlers;
  }

  async connect(clientSecret: string, localStream: MediaStream): Promise<void> {
    this.closed = false;
    const pc = new RTCPeerConnection();
    this.pc = pc;

    localStream.getAudioTracks().forEach((track) => pc.addTrack(track, localStream));

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) this.handlers.onRemoteStream(stream);
    };

    pc.onconnectionstatechange = () => {
      if (this.closed) return;
      if (pc.connectionState === "connected") {
        this.handlers.onConnectionStateChange("connected");
      } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        this.handlers.onConnectionStateChange("disconnected");
      }
    };

    const dc = pc.createDataChannel("oai-events");
    this.dc = dc;
    dc.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as RealtimeServerEvent;
        this.handlers.onServerEvent(parsed);
      } catch {
        // Ignore malformed / non-JSON frames.
      }
    };

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const response = await fetch(`${REALTIME_URL}?model=${REALTIME_MODEL}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          "Content-Type": "application/sdp",
        },
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(
          `Could not connect to the AI interviewer (${response.status}).${body ? ` ${body}` : ""}`,
        );
      }

      const answerSdp = await response.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not connect to the AI interviewer.";
      this.handlers.onConnectionStateChange("error", message);
      throw err;
    }
  }

  sendEvent(event: Record<string, unknown>) {
    if (this.dc && this.dc.readyState === "open") {
      this.dc.send(JSON.stringify(event));
    }
  }

  disconnect() {
    this.closed = true;
    this.pc?.getSenders().forEach((sender) => sender.track?.stop());
    this.dc?.close();
    this.pc?.close();
    this.dc = null;
    this.pc = null;
    this.handlers.onConnectionStateChange("disconnected");
  }
}
