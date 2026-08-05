import type { EvaluationCategory, HiringRecommendation } from "@/ai/evaluation/EvaluationTypes";

// The data every evaluator is built from — word lists and small text
// utilities — plus the config EvaluationAggregator uses to turn ten
// category scores into one overall score and a hiring recommendation.
// Kept separate from EvaluationTypes.ts (pure shapes) and out of the
// evaluators themselves so every heuristic's tunables live in one place.

// ---------------------------------------------------------------------
// Text utilities
// ---------------------------------------------------------------------

export function tokenizeWords(text: string): string[] {
  return text.trim().length > 0 ? text.trim().split(/\s+/).filter(Boolean) : [];
}

export function splitSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

/** Case-insensitive count of how many times any of `terms` appears in
 * `text` (substring match — simple and predictable for the short
 * phrases used below, e.g. "i guess", "you know"). */
export function countOccurrences(text: string, terms: string[]): number {
  const lower = text.toLowerCase();
  return terms.reduce((total, term) => {
    const needle = term.toLowerCase();
    let from = 0;
    let count = 0;
    for (;;) {
      const at = lower.indexOf(needle, from);
      if (at === -1) break;
      count += 1;
      from = at + needle.length;
    }
    return total + count;
  }, 0);
}

export function ratio(count: number, total: number): number {
  return total > 0 ? count / total : 0;
}

export function clampScore(score: number): number {
  if (Number.isNaN(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export const REPEATED_WORD_PATTERN = /\b(\w+)\s+\1\b/i;

// ---------------------------------------------------------------------
// Word/phrase lists — all text-only linguistic markers. Deliberately not
// vocal tone, sentiment, or emotion — see CandidateProfile.ts (Sprint 6)
// for the same content-signals-only boundary applied to difficulty
// adaptation.
// ---------------------------------------------------------------------

export const FILLER_WORDS = [
  "um",
  "uh",
  "like",
  "you know",
  "basically",
  "sort of",
  "kind of",
  "i mean",
];

export const HEDGE_PHRASES = [
  "i guess",
  "maybe",
  "not sure",
  "probably",
  "i suppose",
  "kind of",
  "sort of",
  "it's hard to explain",
];

export const ASSERTIVE_PHRASES = [
  "i decided",
  "i led",
  "i'm confident",
  "definitely",
  "certainly",
  "i own",
  "i drove",
  "i ensured",
];

export const TRANSITION_WORDS = [
  "first",
  "then",
  "next",
  "finally",
  "because",
  "as a result",
  "therefore",
  "however",
  "in addition",
  "for example",
];

export const PROBLEM_SOLVING_MARKERS = [
  "because",
  "so that",
  "in order to",
  "instead",
  "however",
  "considered",
  "trade-off",
  "alternative",
  "resulted in",
  "improved",
  "reduced",
  "achieved",
];

export const LEADERSHIP_MARKERS = [
  "i led",
  "my team",
  "i mentored",
  "i owned",
  "i initiated",
  "i drove",
  "stakeholders",
  "delegated",
  "i decided",
  "i coordinated",
];

export const STRONG_VOCABULARY = [
  "architected",
  "optimized",
  "synthesized",
  "orchestrated",
  "spearheaded",
  "facilitated",
  "streamlined",
  "leveraged",
  "mitigated",
  "cultivated",
];

export const UNPROFESSIONAL_MARKERS = [
  "hate",
  "sucked",
  "terrible boss",
  "stupid",
  "whatever",
  "lol",
  "gonna",
  "wanna",
  "kinda",
];

// ---------------------------------------------------------------------
// Scoring config
// ---------------------------------------------------------------------

/** Weights sum to 1.0 — technical knowledge and problem solving carry
 * the most weight since they're the strongest signal of role fit; the
 * rest reflect delivery quality. */
export const CATEGORY_WEIGHTS: Record<EvaluationCategory, number> = {
  communication: 0.12,
  confidence: 0.08,
  grammar: 0.1,
  vocabulary: 0.1,
  fluency: 0.1,
  technicalKnowledge: 0.15,
  problemSolving: 0.15,
  leadership: 0.08,
  listening: 0.07,
  professionalism: 0.05,
};

export const CATEGORY_LABELS: Record<EvaluationCategory, string> = {
  communication: "Communication",
  confidence: "Confidence",
  grammar: "Grammar",
  vocabulary: "Vocabulary",
  fluency: "Fluency",
  technicalKnowledge: "Technical Knowledge",
  problemSolving: "Problem Solving",
  leadership: "Leadership",
  listening: "Listening Skills",
  professionalism: "Professionalism",
};

export const IMPROVEMENT_TIPS: Record<EvaluationCategory, string> = {
  communication: "Structure answers with a clear beginning, middle, and end.",
  confidence:
    "Use more direct, assertive language and avoid hedging phrases like 'maybe' or 'I guess'.",
  grammar: "Slow down and speak in complete, well-formed sentences.",
  vocabulary: "Vary word choice and use more precise, domain-specific terms.",
  fluency: "Reduce filler words like 'um' and 'like' for a smoother delivery.",
  technicalKnowledge:
    "Go deeper on the technical specifics — name the tools, numbers, and outcomes.",
  problemSolving: "Walk through your reasoning step by step, including trade-offs you considered.",
  leadership: "Highlight moments where you took ownership or guided others.",
  listening: "Make sure your answer directly addresses what was actually asked.",
  professionalism: "Keep language polished and constructive, even when discussing challenges.",
};

/** Checked in order — the first entry whose `min` the score clears wins,
 * so this must stay sorted highest to lowest. */
export const HIRING_RECOMMENDATION_THRESHOLDS: {
  min: number;
  recommendation: HiringRecommendation;
}[] = [
  { min: 85, recommendation: "Strong Hire" },
  { min: 70, recommendation: "Hire" },
  { min: 55, recommendation: "Leaning Hire" },
  { min: 40, recommendation: "Leaning No Hire" },
  { min: 0, recommendation: "No Hire" },
];

export const STRENGTH_THRESHOLD = 75;
export const WEAKNESS_THRESHOLD = 50;
