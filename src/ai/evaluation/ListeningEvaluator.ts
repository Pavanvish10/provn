import type {
  CategoryEvaluator,
  CategoryScore,
  EvaluationInput,
} from "@/ai/evaluation/EvaluationTypes";
import { clampScore, tokenizeWords } from "@/ai/evaluation/EvaluationModels";

// "Listening skills" evaluated from text means relevance: did the answer
// actually engage with the specifics of the question asked, or was it a
// generic response that could have followed almost any question? Measured
// as keyword overlap between the question and the answer — not audio-based
// listening detection, which is out of scope here.

const MIN_KEYWORD_LENGTH = 5;

export class ListeningEvaluator implements CategoryEvaluator {
  readonly category = "listening" as const;

  evaluate(input: EvaluationInput): CategoryScore {
    const answerWords = tokenizeWords(input.transcript);
    if (answerWords.length === 0) {
      return { category: this.category, score: 0, rationale: "No response was given." };
    }

    const questionKeywords = tokenizeWords(input.question)
      .map((word) => word.toLowerCase().replace(/[^a-z]/g, ""))
      .filter((word) => word.length >= MIN_KEYWORD_LENGTH);

    const answerLower = input.transcript.toLowerCase();
    const overlap = questionKeywords.filter((keyword) => answerLower.includes(keyword));
    const overlapRatio =
      questionKeywords.length > 0 ? overlap.length / questionKeywords.length : 0.7;

    const score = clampScore(30 + overlapRatio * 70);

    const rationale =
      overlapRatio >= 0.5
        ? "Response directly addressed the specifics of the question asked."
        : "Response was somewhat generic relative to what was actually asked.";

    return { category: this.category, score, rationale };
  }
}
