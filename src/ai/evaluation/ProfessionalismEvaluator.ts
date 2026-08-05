import type {
  CategoryEvaluator,
  CategoryScore,
  EvaluationInput,
} from "@/ai/evaluation/EvaluationTypes";
import {
  clampScore,
  countOccurrences,
  tokenizeWords,
  UNPROFESSIONAL_MARKERS,
} from "@/ai/evaluation/EvaluationModels";

// Flags casual/negative phrasing (slang, complaints about past
// employers, dismissive language) that would read as unpolished in a
// real interview transcript.

export class ProfessionalismEvaluator implements CategoryEvaluator {
  readonly category = "professionalism" as const;

  evaluate(input: EvaluationInput): CategoryScore {
    const words = tokenizeWords(input.transcript);
    if (words.length === 0) {
      return { category: this.category, score: 0, rationale: "No response was given." };
    }

    const unprofessionalCount = countOccurrences(input.transcript, UNPROFESSIONAL_MARKERS);
    const score = clampScore(95 - unprofessionalCount * 20);

    const rationale =
      unprofessionalCount === 0
        ? "Tone and language were professional throughout."
        : "Some casual or negative phrasing could be tightened up for a more polished tone.";

    return { category: this.category, score, rationale };
  }
}
