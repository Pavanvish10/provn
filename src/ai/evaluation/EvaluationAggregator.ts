import type {
  CategoryScore,
  EvaluationCategory,
  EvaluationSnapshot,
  HiringRecommendation,
} from "@/ai/evaluation/EvaluationTypes";
import {
  CATEGORY_LABELS,
  CATEGORY_WEIGHTS,
  clampScore,
  HIRING_RECOMMENDATION_THRESHOLDS,
  IMPROVEMENT_TIPS,
  STRENGTH_THRESHOLD,
  WEAKNESS_THRESHOLD,
} from "@/ai/evaluation/EvaluationModels";

// Pure math/derivation over category scores — no state of its own (see
// EvaluationStore for that) and no per-category heuristics of its own
// (see the individual evaluators). Everything here is "given scores,
// what do they mean."

export interface EvaluationSummary {
  strengths: string[];
  weaknesses: string[];
  improvementAreas: string[];
  aiNotes: string[];
  hiringRecommendation: HiringRecommendation;
}

export class EvaluationAggregator {
  /** Weighted average of category scores -> a single 0-100 overall score. */
  computeOverallScore(categoryScores: CategoryScore[]): number {
    if (categoryScores.length === 0) return 0;
    const totalWeight = categoryScores.reduce(
      (sum, entry) => sum + CATEGORY_WEIGHTS[entry.category],
      0,
    );
    if (totalWeight === 0) return 0;
    const weightedSum = categoryScores.reduce(
      (sum, entry) => sum + entry.score * CATEGORY_WEIGHTS[entry.category],
      0,
    );
    return clampScore(weightedSum / totalWeight);
  }

  /** Collapses a whole interview's snapshots into one score per category
   * (the simple mean across every turn that category was evaluated on) —
   * what the final report is built from, rather than just the last turn. */
  averageAcrossTimeline(timeline: EvaluationSnapshot[]): CategoryScore[] {
    if (timeline.length === 0) return [];

    const scoresByCategory = new Map<EvaluationCategory, number[]>();
    for (const snapshot of timeline) {
      for (const entry of snapshot.categoryScores) {
        const scores = scoresByCategory.get(entry.category) ?? [];
        scores.push(entry.score);
        scoresByCategory.set(entry.category, scores);
      }
    }

    return Array.from(scoresByCategory.entries()).map(([category, scores]) => ({
      category,
      score: clampScore(scores.reduce((sum, score) => sum + score, 0) / scores.length),
      rationale: `Averaged across ${scores.length} response${scores.length === 1 ? "" : "s"}.`,
    }));
  }

  deriveStrengths(categoryScores: CategoryScore[]): string[] {
    return [...categoryScores]
      .filter((entry) => entry.score >= STRENGTH_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .map(
        (entry) => `${CATEGORY_LABELS[entry.category]} (${entry.score}/100) — ${entry.rationale}`,
      );
  }

  deriveWeaknesses(categoryScores: CategoryScore[]): string[] {
    return [...categoryScores]
      .filter((entry) => entry.score < WEAKNESS_THRESHOLD)
      .sort((a, b) => a.score - b.score)
      .map(
        (entry) => `${CATEGORY_LABELS[entry.category]} (${entry.score}/100) — ${entry.rationale}`,
      );
  }

  deriveImprovementAreas(categoryScores: CategoryScore[]): string[] {
    return [...categoryScores]
      .filter((entry) => entry.score < WEAKNESS_THRESHOLD)
      .sort((a, b) => a.score - b.score)
      .map((entry) => IMPROVEMENT_TIPS[entry.category]);
  }

  deriveAiNotes(categoryScores: CategoryScore[], overallScore: number): string[] {
    if (categoryScores.length === 0) return ["No responses have been evaluated yet."];

    const notes = [
      `Overall performance scored ${overallScore}/100 across ${categoryScores.length} evaluated categories.`,
    ];
    const ranked = [...categoryScores].sort((a, b) => b.score - a.score);
    const best = ranked[0];
    const worst = ranked[ranked.length - 1];
    if (best) notes.push(`Strongest area: ${CATEGORY_LABELS[best.category]}.`);
    if (worst && worst.category !== best?.category) {
      notes.push(`Area with the most room to grow: ${CATEGORY_LABELS[worst.category]}.`);
    }
    return notes;
  }

  deriveHiringRecommendation(overallScore: number): HiringRecommendation {
    const match = HIRING_RECOMMENDATION_THRESHOLDS.find((tier) => overallScore >= tier.min);
    return match?.recommendation ?? "No Hire";
  }

  summarize(categoryScores: CategoryScore[]): EvaluationSummary {
    const overallScore = this.computeOverallScore(categoryScores);
    return {
      strengths: this.deriveStrengths(categoryScores),
      weaknesses: this.deriveWeaknesses(categoryScores),
      improvementAreas: this.deriveImprovementAreas(categoryScores),
      aiNotes: this.deriveAiNotes(categoryScores, overallScore),
      hiringRecommendation: this.deriveHiringRecommendation(overallScore),
    };
  }
}
