import type {
  CategoryEvaluator,
  CategoryScore,
  EvaluationInput,
} from "@/ai/evaluation/EvaluationTypes";
import {
  clampScore,
  countOccurrences,
  FILLER_WORDS,
  ratio,
  REPEATED_WORD_PATTERN,
  tokenizeWords,
} from "@/ai/evaluation/EvaluationModels";

// Flow and delivery smoothness — distinct from ConfidenceEvaluator
// (hedging vs. assertive framing): this looks at filler-word density and
// stutter-like word repetition, the textual footprint of a halting,
// disfluent answer versus a smooth one.

export class FluencyEvaluator implements CategoryEvaluator {
  readonly category = "fluency" as const;

  evaluate(input: EvaluationInput): CategoryScore {
    const words = tokenizeWords(input.transcript);
    if (words.length === 0) {
      return { category: this.category, score: 0, rationale: "No response was given." };
    }

    const fillerCount = countOccurrences(input.transcript, FILLER_WORDS);
    const fillerDensity = ratio(fillerCount, words.length);
    const hasRepeatedWord = REPEATED_WORD_PATTERN.test(input.transcript);

    const score = clampScore(100 - fillerDensity * 400 - (hasRepeatedWord ? 10 : 0));

    const rationale =
      fillerDensity > 0.05
        ? "Frequent filler words affected the flow of the answer."
        : "Answer flowed smoothly with minimal filler words.";

    return { category: this.category, score, rationale };
  }
}
