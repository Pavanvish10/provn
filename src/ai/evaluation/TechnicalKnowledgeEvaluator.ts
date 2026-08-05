import type {
  CategoryEvaluator,
  CategoryScore,
  EvaluationInput,
} from "@/ai/evaluation/EvaluationTypes";
import { clampScore, tokenizeWords } from "@/ai/evaluation/EvaluationModels";
import { KeywordMatcher } from "@/ai/resume/KeywordMatcher";
import { SKILL_VOCABULARY } from "@/ai/resume/SkillExtractor";

// Reuses Sprint 7's skill vocabulary (the same list SkillExtractor and
// JobDescriptionAnalyzer match against) so "technical depth" here means
// the same thing it does everywhere else in the app: naming concrete
// technologies/tools, plus quantified specifics (numbers, percentages),
// rather than staying purely conceptual.

export class TechnicalKnowledgeEvaluator implements CategoryEvaluator {
  readonly category = "technicalKnowledge" as const;

  evaluate(input: EvaluationInput): CategoryScore {
    const words = tokenizeWords(input.transcript);
    if (words.length === 0) {
      return { category: this.category, score: 0, rationale: "No response was given." };
    }

    const techMatches = KeywordMatcher.findMatches(input.transcript, SKILL_VOCABULARY);
    const specificityScore = Math.min(1, techMatches.length / 2);
    const numberMentions = (input.transcript.match(/\d+/g) ?? []).length;
    const quantScore = Math.min(1, numberMentions);

    const score = clampScore((specificityScore * 0.7 + quantScore * 0.3) * 100);

    const rationale =
      techMatches.length > 0
        ? `Referenced concrete technical concepts (${techMatches
            .slice(0, 3)
            .map((match) => match.term)
            .join(", ")}).`
        : "Answer stayed general without naming specific technologies or tools.";

    return { category: this.category, score, rationale };
  }
}
