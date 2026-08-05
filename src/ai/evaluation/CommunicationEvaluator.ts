import type {
  CategoryEvaluator,
  CategoryScore,
  EvaluationInput,
} from "@/ai/evaluation/EvaluationTypes";
import {
  clampScore,
  countOccurrences,
  splitSentences,
  tokenizeWords,
  TRANSITION_WORDS,
} from "@/ai/evaluation/EvaluationModels";

// Scores how clearly and coherently the answer was put together: is it
// developed enough, broken into more than one sentence, and does it use
// transition language that signals a structured train of thought.

export class CommunicationEvaluator implements CategoryEvaluator {
  readonly category = "communication" as const;

  evaluate(input: EvaluationInput): CategoryScore {
    const words = tokenizeWords(input.transcript);
    if (words.length === 0) {
      return { category: this.category, score: 0, rationale: "No response was given." };
    }

    const sentences = splitSentences(input.transcript);
    const lengthScore = Math.min(1, words.length / 50);
    const structureScore = sentences.length >= 2 ? 1 : sentences.length === 1 ? 0.6 : 0.2;
    const transitionScore = Math.min(1, countOccurrences(input.transcript, TRANSITION_WORDS) / 2);

    const score = clampScore(
      (lengthScore * 0.4 + structureScore * 0.35 + transitionScore * 0.25) * 100,
    );

    const rationale =
      score >= 75
        ? "Answer was well-developed and organized, with clear transitions between ideas."
        : score >= 50
          ? "Answer covered the topic but could be organized more clearly."
          : "Answer was brief or lacked clear structure.";

    return { category: this.category, score, rationale };
  }
}
