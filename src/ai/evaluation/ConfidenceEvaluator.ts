import type {
  CategoryEvaluator,
  CategoryScore,
  EvaluationInput,
} from "@/ai/evaluation/EvaluationTypes";
import {
  ASSERTIVE_PHRASES,
  clampScore,
  countOccurrences,
  HEDGE_PHRASES,
  ratio,
  tokenizeWords,
} from "@/ai/evaluation/EvaluationModels";

// Confidence here means *linguistic* confidence — hedging ("maybe", "I
// guess", "not sure") versus assertive, direct phrasing ("I decided",
// "I'm confident") in the transcript. This is explicitly not vocal tone,
// sentiment, or emotion detection, which Sprint 8 rules out — it's the
// same text-only boundary CandidateProfile.ts (Sprint 6) uses.

export class ConfidenceEvaluator implements CategoryEvaluator {
  readonly category = "confidence" as const;

  evaluate(input: EvaluationInput): CategoryScore {
    const words = tokenizeWords(input.transcript);
    if (words.length === 0) {
      return { category: this.category, score: 0, rationale: "No response was given." };
    }

    // Normalized per ~20 words so longer answers aren't penalized just
    // for having more opportunities to use (or avoid) hedging language.
    const perTwentyWords = Math.max(1, words.length / 20);
    const hedgeCount = countOccurrences(input.transcript, HEDGE_PHRASES);
    const assertiveCount = countOccurrences(input.transcript, ASSERTIVE_PHRASES);
    const hedgeRatio = ratio(hedgeCount, perTwentyWords);
    const assertiveRatio = ratio(assertiveCount, perTwentyWords);

    const score = clampScore(60 + assertiveRatio * 25 - hedgeRatio * 30);

    const rationale =
      hedgeCount > assertiveCount
        ? "Language leaned on hedging phrases (e.g. 'maybe', 'I guess') rather than direct statements."
        : assertiveCount > 0
          ? "Answer was delivered with direct, assertive language."
          : "Answer was neutral in tone — neither notably hedging nor assertive.";

    return { category: this.category, score, rationale };
  }
}
