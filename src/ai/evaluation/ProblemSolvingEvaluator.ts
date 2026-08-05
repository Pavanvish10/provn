import type {
  CategoryEvaluator,
  CategoryScore,
  EvaluationInput,
} from "@/ai/evaluation/EvaluationTypes";
import {
  clampScore,
  countOccurrences,
  PROBLEM_SOLVING_MARKERS,
  tokenizeWords,
} from "@/ai/evaluation/EvaluationModels";

// Looks for the language pattern of structured reasoning: cause/effect
// ("because", "so that"), trade-off awareness ("instead", "however",
// "considered"), and outcome framing ("resulted in", "improved",
// "reduced") — the markers of walking an interviewer through *how* a
// problem was solved, not just describing that it was.

export class ProblemSolvingEvaluator implements CategoryEvaluator {
  readonly category = "problemSolving" as const;

  evaluate(input: EvaluationInput): CategoryScore {
    const words = tokenizeWords(input.transcript);
    if (words.length === 0) {
      return { category: this.category, score: 0, rationale: "No response was given." };
    }

    const markerCount = countOccurrences(input.transcript, PROBLEM_SOLVING_MARKERS);
    const score = clampScore(40 + Math.min(1, markerCount / 3) * 60);

    const rationale =
      markerCount >= 2
        ? "Answer showed clear reasoning — approach, trade-offs, and outcome were all addressed."
        : markerCount === 1
          ? "Answer touched on reasoning but could go deeper into the approach and outcome."
          : "Answer didn't clearly walk through the reasoning or approach taken.";

    return { category: this.category, score, rationale };
  }
}
