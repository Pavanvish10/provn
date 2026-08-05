import type { QAPair } from "@/ai/ConversationMemory";
import type { DifficultyLevel } from "@/ai/QuestionDifficulty";
import type {
  CategoryEvaluator,
  EvaluationInput,
  EvaluationReport,
  EvaluationSnapshot,
} from "@/ai/evaluation/EvaluationTypes";
import { CommunicationEvaluator } from "@/ai/evaluation/CommunicationEvaluator";
import { ConfidenceEvaluator } from "@/ai/evaluation/ConfidenceEvaluator";
import { GrammarEvaluator } from "@/ai/evaluation/GrammarEvaluator";
import { VocabularyEvaluator } from "@/ai/evaluation/VocabularyEvaluator";
import { FluencyEvaluator } from "@/ai/evaluation/FluencyEvaluator";
import { TechnicalKnowledgeEvaluator } from "@/ai/evaluation/TechnicalKnowledgeEvaluator";
import { ProblemSolvingEvaluator } from "@/ai/evaluation/ProblemSolvingEvaluator";
import { LeadershipEvaluator } from "@/ai/evaluation/LeadershipEvaluator";
import { ListeningEvaluator } from "@/ai/evaluation/ListeningEvaluator";
import { ProfessionalismEvaluator } from "@/ai/evaluation/ProfessionalismEvaluator";
import { EvaluationAggregator } from "@/ai/evaluation/EvaluationAggregator";
import { EvaluationStore } from "@/ai/evaluation/EvaluationStore";

// The single entry point the rest of the app talks to — deliberately UI-
// and transport-independent (no React, no realtime/session coupling) so
// it can be driven from a live interview session, a batch replay, or (as
// runTestEvaluation below does) purely in-memory test data. Composes the
// ten category evaluators + EvaluationAggregator (turns scores into a
// report) + EvaluationStore (keeps the timeline) exactly the way
// InterviewBrain (Sprint 6) composes its own sub-services.

const DEFAULT_EVALUATORS: CategoryEvaluator[] = [
  new CommunicationEvaluator(),
  new ConfidenceEvaluator(),
  new GrammarEvaluator(),
  new VocabularyEvaluator(),
  new FluencyEvaluator(),
  new TechnicalKnowledgeEvaluator(),
  new ProblemSolvingEvaluator(),
  new LeadershipEvaluator(),
  new ListeningEvaluator(),
  new ProfessionalismEvaluator(),
];

export class EvaluationEngine {
  private readonly evaluators: CategoryEvaluator[];
  private readonly aggregator = new EvaluationAggregator();
  private readonly store = new EvaluationStore();
  private turnIndex = 0;

  /** Evaluators default to all ten built-in categories; pass a custom
   * list to run a subset, or to swap in a different implementation of a
   * category (open/closed — nothing here needs to change either way). */
  constructor(evaluators: CategoryEvaluator[] = DEFAULT_EVALUATORS) {
    this.evaluators = evaluators;
  }

  subscribe(listener: (timeline: EvaluationSnapshot[]) => void): () => void {
    return this.store.subscribe(listener);
  }

  /** LIVE MODE: call once per candidate response as the interview
   * progresses. Runs every evaluator, records the resulting snapshot, and
   * returns it immediately for anything that wants just this turn's read. */
  evaluateResponse(input: EvaluationInput): EvaluationSnapshot {
    const categoryScores = this.evaluators.map((evaluator) => evaluator.evaluate(input));
    const overallScore = this.aggregator.computeOverallScore(categoryScores);
    const snapshot: EvaluationSnapshot = {
      turnIndex: this.turnIndex,
      timestamp: Date.now(),
      categoryScores,
      overallScore,
    };
    this.turnIndex += 1;
    this.store.record(snapshot);
    return snapshot;
  }

  /** The full Sprint 8 OUTPUT, built from every turn evaluated so far:
   * overall score, per-category scores (averaged across the interview),
   * strengths/weaknesses/improvement areas, AI notes, a hiring
   * recommendation, and the turn-by-turn timeline. */
  getReport(): EvaluationReport {
    const timeline = this.store.getTimeline();
    const averagedScores = this.aggregator.averageAcrossTimeline(timeline);
    const summary = this.aggregator.summarize(averagedScores);
    return {
      overallScore: this.aggregator.computeOverallScore(averagedScores),
      categoryScores: averagedScores,
      timeline,
      ...summary,
    };
  }

  getLatestSnapshot(): EvaluationSnapshot | null {
    return this.store.getLatest();
  }

  getTimeline(): EvaluationSnapshot[] {
    return this.store.getTimeline();
  }

  reset() {
    this.store.reset();
    this.turnIndex = 0;
  }

  /** TEST MODE: evaluates a small built-in dummy transcript end-to-end —
   * no OpenAI, no external API calls, safe to run completely offline. */
  runTestEvaluation(turns: EvaluationInput[] = DUMMY_EVALUATION_TURNS): EvaluationReport {
    this.reset();
    for (const turn of turns) this.evaluateResponse(turn);
    return this.getReport();
  }
}

// ---------------------------------------------------------------------
// Test-mode dummy transcript — a short, realistic interview with
// intentionally mixed answer quality (strong/detailed vs. short/hedging)
// so every evaluator has something meaningful to score.
// ---------------------------------------------------------------------

interface DummyTurn {
  question: string;
  topic: string;
  difficulty: DifficultyLevel;
  transcript: string;
}

const DUMMY_TURNS: DummyTurn[] = [
  {
    question: "Tell me about a project you're proud of and the tech stack you used.",
    topic: "tech-background",
    difficulty: "easy",
    transcript:
      "Sure — I built an e-commerce platform using React, Redux, and Node.js. I led the frontend architecture and worked closely with two backend engineers to design the API. We shipped it in about eight weeks and it handled a 20% increase in holiday traffic without issues.",
  },
  {
    question: "What was the most challenging part of that project?",
    topic: "project-challenge",
    difficulty: "easy",
    transcript: "Um, I guess maybe the checkout flow was kind of tricky. It's hard to explain.",
  },
  {
    question: "How did you approach performance optimization?",
    topic: "project-optimization",
    difficulty: "medium",
    transcript:
      "I profiled the app with React DevTools and found the product list was re-rendering too often because of a shared context, so I split the context into smaller providers and memoized the list items. That reduced re-renders by about 60% and cut load time noticeably.",
  },
  {
    question: "Tell me about a time you had to make a difficult decision under pressure.",
    topic: "leadership-under-pressure",
    difficulty: "medium",
    transcript: "Yeah that happened once, it was fine, we figured it out as a team I think.",
  },
  {
    question: "How do you approach designing a system that needs to scale?",
    topic: "system-design",
    difficulty: "hard",
    transcript:
      "I start by identifying the read and write patterns, because that determines whether I reach for caching, read replicas, or sharding. For example, on my last project I introduced Redis caching for the product catalog, which reduced database load by 40%, and I made sure to consider the trade-off between cache freshness and consistency before rolling it out.",
  },
];

function toQAPair(index: number, turn: DummyTurn): QAPair {
  const now = Date.now();
  return {
    index,
    question: turn.question,
    topic: turn.topic,
    difficulty: turn.difficulty,
    answer: turn.transcript,
    askedAt: now,
    answeredAt: now,
  };
}

export const DUMMY_EVALUATION_TURNS: EvaluationInput[] = DUMMY_TURNS.map((turn, index) => ({
  transcript: turn.transcript,
  question: turn.question,
  questionTopic: turn.topic,
  difficulty: turn.difficulty,
  interviewType: "technical",
  role: "Frontend Developer",
  company: "Google",
  conversationHistory: DUMMY_TURNS.slice(0, index).map((prior, priorIndex) =>
    toQAPair(priorIndex, prior),
  ),
}));
