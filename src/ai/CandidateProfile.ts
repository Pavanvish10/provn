// Tracks how strong the candidate's answers have been, purely from
// *content* signals (length, structure, concrete detail) — never tone,
// sentiment, or vocal/facial cues. This is deliberately not emotion
// detection or scoring for a hiring decision; it exists only to feed
// QuestionDifficultyManager's "increase when they're doing well, ease up
// when they're struggling" adjustment.

export interface AnswerAssessment {
  /** 0 (weak/thin) to 1 (strong/detailed). */
  strength: number;
  wordCount: number;
}

const SPECIFICITY_MARKERS =
  /\d|%|percent|reduced|increased|improved|built|designed|implemented|led|shipped|launched|users?|api|database|team|architecture|deployed/i;

function scoreAnswer(answer: string): AnswerAssessment {
  const trimmed = answer.trim();
  if (!trimmed) return { strength: 0, wordCount: 0 };

  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const lengthScore = Math.min(1, wordCount / 60);
  const specificityScore = SPECIFICITY_MARKERS.test(trimmed) ? 1 : 0.4;
  const sentenceCount = trimmed.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
  const structureScore = Math.min(1, sentenceCount / 3);

  const strength = lengthScore * 0.4 + specificityScore * 0.4 + structureScore * 0.2;
  return { strength: Number(strength.toFixed(2)), wordCount };
}

export class CandidateProfile {
  private assessments: AnswerAssessment[] = [];

  recordAnswer(answerText: string): AnswerAssessment {
    const assessment = scoreAnswer(answerText);
    this.assessments.push(assessment);
    return assessment;
  }

  getAverageStrength(): number {
    if (this.assessments.length === 0) return 0.5;
    const sum = this.assessments.reduce((total, a) => total + a.strength, 0);
    return Number((sum / this.assessments.length).toFixed(2));
  }

  getLastStrength(): number | null {
    return this.assessments.at(-1)?.strength ?? null;
  }

  getAnswerCount(): number {
    return this.assessments.length;
  }

  reset() {
    this.assessments = [];
  }
}
