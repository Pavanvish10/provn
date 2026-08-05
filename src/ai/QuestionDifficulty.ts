// Manages the interview's difficulty progression: Easy -> Medium -> Hard,
// either held fixed at a chosen level or driven adaptively by how strong
// the candidate's answers have been (see CandidateProfile for the
// strength heuristic). "Adaptive" is a *mode*, not a fourth level — an
// adaptive interview still asks Easy/Medium/Hard questions, it just
// chooses which one on its own.

export type DifficultyLevel = "easy" | "medium" | "hard";
export type DifficultyMode = DifficultyLevel | "adaptive";

const LEVEL_ORDER: DifficultyLevel[] = ["easy", "medium", "hard"];

/** Two consecutive strong answers bump the difficulty up a level; two
 * consecutive weak ones bring it back down. A single mixed answer resets
 * the streak rather than moving the needle, so one so-so answer doesn't
 * swing the interview. */
const STRONG_THRESHOLD = 0.7;
const WEAK_THRESHOLD = 0.35;
const STREAK_TO_ADJUST = 2;

export class QuestionDifficultyManager {
  private adaptive: boolean;
  private current: DifficultyLevel;
  private consecutiveStrong = 0;
  private consecutiveWeak = 0;

  constructor(mode: DifficultyMode = "adaptive") {
    this.adaptive = mode === "adaptive";
    this.current = mode === "adaptive" ? "easy" : mode;
  }

  getCurrent(): DifficultyLevel {
    return this.current;
  }

  isAdaptive(): boolean {
    return this.adaptive;
  }

  /** Feed in the 0-1 strength score of the answer just given. Returns the
   * (possibly updated) difficulty level. No-op when the interview is
   * running at a fixed (non-adaptive) difficulty. */
  adjust(strengthScore: number): DifficultyLevel {
    if (!this.adaptive) return this.current;

    if (strengthScore >= STRONG_THRESHOLD) {
      this.consecutiveStrong += 1;
      this.consecutiveWeak = 0;
      if (this.consecutiveStrong >= STREAK_TO_ADJUST) this.step(1);
    } else if (strengthScore <= WEAK_THRESHOLD) {
      this.consecutiveWeak += 1;
      this.consecutiveStrong = 0;
      if (this.consecutiveWeak >= STREAK_TO_ADJUST) this.step(-1);
    } else {
      this.consecutiveStrong = 0;
      this.consecutiveWeak = 0;
    }
    return this.current;
  }

  private step(direction: 1 | -1) {
    const index = LEVEL_ORDER.indexOf(this.current);
    const nextIndex = Math.min(LEVEL_ORDER.length - 1, Math.max(0, index + direction));
    this.current = LEVEL_ORDER[nextIndex];
    this.consecutiveStrong = 0;
    this.consecutiveWeak = 0;
  }

  reset(mode: DifficultyMode = "adaptive") {
    this.adaptive = mode === "adaptive";
    this.current = mode === "adaptive" ? "easy" : mode;
    this.consecutiveStrong = 0;
    this.consecutiveWeak = 0;
  }
}
