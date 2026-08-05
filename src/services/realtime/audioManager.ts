// Owns every browser audio concern for the realtime interview: requesting
// microphone permission, exposing the local mic MediaStream (the actual
// streaming to OpenAI happens over WebRTC via realtimeClient — this class
// only owns capture/mute), and playing back the AI's remote audio track.

export type MicPermissionState = "idle" | "requesting" | "granted" | "denied";

export class AudioManager {
  private localStream: MediaStream | null = null;
  private remoteAudioEl: HTMLAudioElement | null = null;
  private micPermission: MicPermissionState = "idle";
  private muted = false;
  private listeners = new Set<() => void>();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }

  getMicPermission(): MicPermissionState {
    return this.micPermission;
  }

  isMuted(): boolean {
    return this.muted;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  async requestMicrophone(): Promise<MediaStream> {
    this.micPermission = "requesting";
    this.emit();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      this.localStream = stream;
      this.micPermission = "granted";
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !this.muted;
      });
      this.emit();
      return stream;
    } catch (err) {
      this.micPermission = "denied";
      this.emit();
      const denied = err instanceof DOMException && err.name === "NotAllowedError";
      throw new Error(
        denied
          ? "Microphone access was denied. Please allow microphone access in your browser settings and try again."
          : "Could not access the microphone. Please check your device and try again.",
      );
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
    this.emit();
  }

  attachRemoteStream(stream: MediaStream) {
    const el = this.getOrCreateAudioElement();
    el.srcObject = stream;
    void el.play().catch(() => {
      // Autoplay can be blocked without a user gesture, but the click that
      // started the interview already counts as one — safe to ignore.
    });
  }

  private getOrCreateAudioElement(): HTMLAudioElement {
    if (!this.remoteAudioEl) {
      const el = document.createElement("audio");
      el.autoplay = true;
      el.style.display = "none";
      document.body.appendChild(el);
      this.remoteAudioEl = el;
    }
    return this.remoteAudioEl;
  }

  stop() {
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
    if (this.remoteAudioEl) {
      this.remoteAudioEl.pause();
      this.remoteAudioEl.srcObject = null;
      this.remoteAudioEl.remove();
      this.remoteAudioEl = null;
    }
    this.micPermission = "idle";
    this.muted = false;
    this.emit();
  }
}
