import type {
  CategoryEvaluator,
  CategoryScore,
  EvaluationInput,
} from "@/ai/evaluation/EvaluationTypes";
import {
  clampScore,
  countOccurrences,
  LEADERSHIP_MARKERS,
  tokenizeWords,
} from "@/ai/evaluation/EvaluationModels";

// Looks for ownership/leadership language ("I led", "my team", "I
// mentored", "stakeholders") — most relevant for managerial/leadership
// questions, but scored on every answer since ownership can show up
// anywhere in an interview.

export class LeadershipEvaluator implements CategoryEvaluator {
  readonly category = "leadership" as const;

  evaluate(input: EvaluationInput): CategoryScore {
    const words = tokenizeWords(input.transcript);
    if (words.length === 0) {
      return { category: this.category, score: 0, rationale: "No response was given." };
    }

    const markerCount = countOccurrences(input.transcript, LEADERSHIP_MARKERS);
    const score = clampScore(45 + Math.min(1, markerCount / 2) * 55);

    const rationale =
      markerCount > 0
        ? "Answer highlighted ownership or leadership of the situation."
        : "Answer didn't emphasize a leadership or ownership role.";

    return { category: this.category, score, rationale };
  }
}
