import type { QAPair } from "@/ai/ConversationMemory";
import type { InterviewType } from "@/ai/InterviewContext";
import type { DifficultyLevel } from "@/ai/QuestionDifficulty";

// Pure structural types for the evaluation engine — no logic here (see
// EvaluationModels.ts for the scoring config/word-lists the evaluators
// are built from). Reuses Sprint 6's QAPair/InterviewType/DifficultyLevel
// so a live session's existing conversation state can be passed straight
// through without translation.

export type EvaluationCategory =
  | "communication"
  | "confidence"
  | "grammar"
  | "vocabulary"
  | "fluency"
  | "technicalKnowledge"
  | "problemSolving"
  | "leadership"
  | "listening"
  | "professionalism";

export type HiringRecommendation =
  "Strong Hire" | "Hire" | "Leaning Hire" | "Leaning No Hire" | "No Hire";

/** Everything a single evaluation pass needs: the response being scored
 * (transcript), the question it answered, and enough interview context
 * (role/company/difficulty/type) plus the conversation so far for
 * evaluators like ListeningEvaluator to judge relevance and continuity. */
export interface EvaluationInput {
  transcript: string;
  question: string;
  questionTopic: string;
  difficulty: DifficultyLevel;
  interviewType: InterviewType;
  role: string;
  company: string | null;
  conversationHistory: QAPair[];
}

export interface CategoryScore {
  category: EvaluationCategory;
  /** 0-100 */
  score: number;
  rationale: string;
}

/** The contract every category evaluator implements — see
 * CommunicationEvaluator.ts etc. Deliberately narrow (one method) so new
 * categories can be added without touching existing evaluators
 * (open/closed) and EvaluationEngine can treat all ten uniformly. */
export interface CategoryEvaluator {
  readonly category: EvaluationCategory;
  evaluate(input: EvaluationInput): CategoryScore;
}

export interface EvaluationSnapshot {
  turnIndex: number;
  timestamp: number;
  categoryScores: CategoryScore[];
  overallScore: number;
}

export interface EvaluationReport {
  overallScore: number;
  categoryScores: CategoryScore[];
  strengths: string[];
  weaknesses: string[];
  improvementAreas: string[];
  aiNotes: string[];
  hiringRecommendation: HiringRecommendation;
  timeline: EvaluationSnapshot[];
}
