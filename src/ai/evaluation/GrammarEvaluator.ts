import type {
  CategoryEvaluator,
  CategoryScore,
  EvaluationInput,
} from "@/ai/evaluation/EvaluationTypes";
import {
  clampScore,
  REPEATED_WORD_PATTERN,
  splitSentences,
  tokenizeWords,
} from "@/ai/evaluation/EvaluationModels";

// A light heuristic grammar check — not a full grammar checker (that
// would need an NLP library out of scope here), just a few structural
// signals: immediately-repeated words, sentence fragments, and missing
// capitalization at sentence starts.

export class GrammarEvaluator implements CategoryEvaluator {
  readonly category = "grammar" as const;

  evaluate(input: EvaluationInput): CategoryScore {
    const text = input.transcript.trim();
    if (!text) {
      return { category: this.category, score: 0, rationale: "No response was given." };
    }

    const sentences = splitSentences(text);
    let issues = 0;

    if (REPEATED_WORD_PATTERN.test(text)) issues += 1;

    const uncapitalized = sentences.filter((sentence) => /^[a-z]/.test(sentence)).length;
    issues += Math.min(2, uncapitalized);

    const fragments = sentences.filter((sentence) => tokenizeWords(sentence).length <= 2).length;
    issues += Math.min(2, fragments);

    const score = clampScore(100 - issues * 15);

    const rationale =
      issues === 0
        ? "No obvious grammatical issues detected."
        : `Detected ${issues} potential grammar issue${issues === 1 ? "" : "s"} (repeated words, fragments, or capitalization).`;

    return { category: this.category, score, rationale };
  }
}
