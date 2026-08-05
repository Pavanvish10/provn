// Accumulates the live, turn-by-turn transcript for a realtime interview
// session. The Realtime API streams each side's speech as a sequence of
// text deltas followed by a "completed"/"done" event — this class turns
// that stream into a flat, ordered list of finalized-or-in-progress
// entries that the UI can render directly (see LiveTranscriptPanel).

export type TranscriptSpeaker = "ai" | "candidate";

export interface TranscriptEntry {
  id: string;
  speaker: TranscriptSpeaker;
  text: string;
  timestamp: number;
  final: boolean;
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `transcript-${Date.now()}-${idCounter}`;
}

export class TranscriptManager {
  private entries: TranscriptEntry[] = [];
  private activeAiId: string | null = null;
  private activeCandidateId: string | null = null;
  private listeners = new Set<() => void>();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }

  getEntries(): TranscriptEntry[] {
    return this.entries;
  }

  startAiTurn(): string {
    const id = nextId();
    this.activeAiId = id;
    this.entries = [
      ...this.entries,
      { id, speaker: "ai", text: "", timestamp: Date.now(), final: false },
    ];
    this.emit();
    return id;
  }

  appendAiDelta(delta: string) {
    if (!delta) return;
    if (!this.activeAiId) this.startAiTurn();
    const id = this.activeAiId;
    this.entries = this.entries.map((entry) =>
      entry.id === id ? { ...entry, text: entry.text + delta } : entry,
    );
    this.emit();
  }

  finalizeAiTurn(finalText?: string) {
    if (!this.activeAiId) return;
    const id = this.activeAiId;
    this.entries = this.entries.map((entry) =>
      entry.id === id
        ? {
            ...entry,
            text: finalText && finalText.length > 0 ? finalText : entry.text,
            final: true,
          }
        : entry,
    );
    this.activeAiId = null;
    this.emit();
  }

  startCandidateTurn(): string {
    const id = nextId();
    this.activeCandidateId = id;
    this.entries = [
      ...this.entries,
      { id, speaker: "candidate", text: "", timestamp: Date.now(), final: false },
    ];
    this.emit();
    return id;
  }

  appendCandidateDelta(delta: string) {
    if (!delta) return;
    if (!this.activeCandidateId) this.startCandidateTurn();
    const id = this.activeCandidateId;
    this.entries = this.entries.map((entry) =>
      entry.id === id ? { ...entry, text: entry.text + delta } : entry,
    );
    this.emit();
  }

  // Whisper-based transcription (the default) delivers the candidate's
  // turn as a single "completed" event with the full text rather than
  // incremental deltas, so this also handles the no-active-turn case.
  finalizeCandidateTurn(finalText?: string) {
    if (!this.activeCandidateId) {
      if (finalText) {
        this.entries = [
          ...this.entries,
          {
            id: nextId(),
            speaker: "candidate",
            text: finalText,
            timestamp: Date.now(),
            final: true,
          },
        ];
        this.emit();
      }
      return;
    }
    const id = this.activeCandidateId;
    this.entries = this.entries.map((entry) =>
      entry.id === id
        ? {
            ...entry,
            text: finalText && finalText.length > 0 ? finalText : entry.text,
            final: true,
          }
        : entry,
    );
    this.activeCandidateId = null;
    this.emit();
  }

  reset() {
    this.entries = [];
    this.activeAiId = null;
    this.activeCandidateId = null;
    this.emit();
  }
}
