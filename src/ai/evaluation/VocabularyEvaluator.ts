import type {
  CategoryEvaluator,
  CategoryScore,
  EvaluationInput,
} from "@/ai/evaluation/EvaluationTypes";
import {
  clampScore,
  countOccurrences,
  ratio,
  STRONG_VOCABULARY,
  tokenizeWords,
} from "@/ai/evaluation/EvaluationModels";

// Lexical richness: how varied the word choice is (type-token ratio),
// how substantial the words tend to be (average word length), and
// whether any notably strong/precise vocabulary shows up.

export class VocabularyEvaluator implements CategoryEvaluator {
  readonly category = "vocabulary" as const;

  evaluate(input: EvaluationInput): CategoryScore {
    const words = tokenizeWords(input.transcript).map((word) =>
      word.toLowerCase().replace(/[^a-z']/g, ""),
    );
    if (words.length === 0) {
      return { category: this.category, score: 0, rationale: "No response was given." };
    }

    const uniqueWords = new Set(words.filter(Boolean));
    const diversity = ratio(uniqueWords.size, words.length);
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    const strongCount = countOccurrences(input.transcript, STRONG_VOCABULARY);

    const diversityScore = Math.min(1, diversity / 0.6);
    const lengthScore = Math.min(1, avgWordLength / 5.5);
    const strongScore = Math.min(1, strongCount / 2);

    const score = clampScore((diversityScore * 0.5 + lengthScore * 0.3 + strongScore * 0.2) * 100);

    const rationale =
      score >= 75
        ? "Used varied, precise vocabulary."
        : score >= 50
          ? "Vocabulary was adequate but somewhat repetitive."
          : "Vocabulary was limited or highly repetitive.";

    return { category: this.category, score, rationale };
  }
}
