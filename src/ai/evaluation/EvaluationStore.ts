import type { EvaluationCategory, EvaluationSnapshot } from "@/ai/evaluation/EvaluationTypes";

// Holds the evaluation timeline — one snapshot per candidate response,
// in order — and nothing else. A simple pub/sub store (same shape as
// Sprint 5/6's TranscriptManager/ConversationMemory) so LIVE MODE
// consumers (a future results UI, most likely) can subscribe and re-render
// as new snapshots come in, without EvaluationEngine needing to know
// anything about how they're displayed.

export class EvaluationStore {
  private timeline: EvaluationSnapshot[] = [];
  private listeners = new Set<(timeline: EvaluationSnapshot[]) => void>();

  subscribe(listener: (timeline: EvaluationSnapshot[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    this.listeners.forEach((listener) => listener(this.timeline));
  }

  record(snapshot: EvaluationSnapshot) {
    this.timeline = [...this.timeline, snapshot];
    this.emit();
  }

  getTimeline(): EvaluationSnapshot[] {
    return this.timeline;
  }

  getLatest(): EvaluationSnapshot | null {
    return this.timeline.at(-1) ?? null;
  }

  /** The score-over-time series for one category — e.g. to chart how
   * Confidence trended across the interview. */
  getCategoryTrend(category: EvaluationCategory): number[] {
    return this.timeline.map(
      (snapshot) =>
        snapshot.categoryScores.find((entry) => entry.category === category)?.score ?? 0,
    );
  }

  reset() {
    this.timeline = [];
    this.emit();
  }
}
