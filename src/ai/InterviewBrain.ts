import {
  InterviewContext,
  normalizeInterviewType,
  type InterviewContextConfig,
} from "@/ai/InterviewContext";
import {
  QuestionDifficultyManager,
  type DifficultyLevel,
  type DifficultyMode,
} from "@/ai/QuestionDifficulty";
import { CandidateProfile } from "@/ai/CandidateProfile";
import { ConversationMemory, type QAPair } from "@/ai/ConversationMemory";
import { FollowUpEngine } from "@/ai/FollowUpEngine";
import { QuestionGenerator } from "@/ai/QuestionGenerator";
import {
  buildClosing,
  buildIntroduction,
  buildRealtimeDirective,
  buildSystemInstructions,
  DUMMY_CANDIDATE_ANSWERS,
} from "@/ai/PromptTemplates";
import { getCompanyProfile } from "@/ai/resume/CompanyProfile";
import {
  CompanyQuestionStrategy,
  type QuestionStrategyOutput,
} from "@/ai/resume/CompanyQuestionStrategy";
import type {
  CandidateKnowledgeGraph,
  CandidateProfileSummary,
} from "@/ai/resume/CandidateKnowledgeGraph";

export type { InterviewType } from "@/ai/InterviewContext";
export type { DifficultyLevel, DifficultyMode } from "@/ai/QuestionDifficulty";
export type { QAPair } from "@/ai/ConversationMemory";

/** Resume + job-description + company grounding (Sprint 7) — entirely
 * optional. Build a CandidateKnowledgeGraph with ResumeAnalyzer (+
 * JobDescriptionAnalyzer if you have a JD) and pass it here along with
 * which of the supported companies this interview is for. */
export interface InterviewBrainPersonalization {
  companyId: string;
  knowledgeGraph: CandidateKnowledgeGraph;
}

export interface InterviewBrainConfig extends InterviewContextConfig {
  difficulty?: DifficultyMode;
  personalization?: InterviewBrainPersonalization;
}

export interface SimulatedInterviewTurn {
  speaker: "ai" | "candidate";
  kind: "intro" | "question" | "answer" | "closing";
  text: string;
  topic?: string;
  difficulty?: DifficultyLevel;
}

/** The single entry point the rest of the app talks to. Composes
 * InterviewContext (who/what this interview is), ConversationMemory
 * (what's been asked/answered), CandidateProfile (how the candidate is
 * doing), QuestionDifficultyManager (how hard to go next), and
 * QuestionGenerator/FollowUpEngine (what to actually ask) — optionally
 * grounded in a real resume + company via CompanyQuestionStrategy — into
 * one clean, stateful API. Never calls an external API itself — it's a
 * deterministic decision engine, which is what makes runSimulation()
 * below able to play out a full interview completely offline. */
export class InterviewBrain {
  readonly context: InterviewContext;
  private readonly memory = new ConversationMemory();
  private readonly profile = new CandidateProfile();
  private readonly difficulty: QuestionDifficultyManager;
  private readonly generator: QuestionGenerator;
  private readonly personalizationStrategy: CompanyQuestionStrategy | null;
  private readonly knowledgeGraph: CandidateKnowledgeGraph | null;
  private questionsAsked = 0;

  constructor(config: InterviewBrainConfig) {
    this.context = new InterviewContext(config);
    this.difficulty = new QuestionDifficultyManager(config.difficulty ?? "adaptive");

    this.knowledgeGraph = config.personalization?.knowledgeGraph ?? null;
    const companyProfile = config.personalization
      ? getCompanyProfile(config.personalization.companyId)
      : null;
    this.personalizationStrategy =
      companyProfile && this.knowledgeGraph
        ? new CompanyQuestionStrategy(companyProfile, this.knowledgeGraph)
        : null;

    this.generator = new QuestionGenerator(
      this.context.interviewType,
      new FollowUpEngine(),
      this.personalizationStrategy ?? undefined,
    );
  }

  /** The AI's opening script: introduces itself, greets the candidate,
   * and explains what's about to happen. Spoken once, before the first
   * question. */
  introduce(): string {
    return buildIntroduction({
      typeLabel: this.context.typeLabel,
      role: this.context.role,
      company: this.context.company,
    });
  }

  /** System-level instructions for a live voice model (see
   * services/realtime/conversationManager.ts) — the overall persona and
   * behavior contract, sent once at session start. */
  getSystemInstructions(): string {
    return buildSystemInstructions({
      typeLabel: this.context.typeLabel,
      role: this.context.role,
      company: this.context.company,
    });
  }

  /** Advances the brain past its first question and returns it. */
  getOpeningQuestion(): string {
    const question = this.generator.generateOpeningQuestion(this.difficulty.getCurrent());
    this.memory.recordQuestion(question.text, question.topic, question.difficulty);
    this.questionsAsked += 1;
    return question.text;
  }

  /** Records the candidate's answer to the most recently asked question
   * and lets it influence future difficulty. */
  submitAnswer(answerText: string): void {
    this.memory.recordAnswer(answerText);
    const assessment = this.profile.recordAnswer(answerText);
    this.difficulty.adjust(assessment.strength);
  }

  /** Decides and returns the next question — grounded in the candidate's
   * resume/company when personalization is configured, otherwise a
   * contextual follow-up or topic pivot from the generic bank — at
   * whatever difficulty the candidate's performance now calls for. */
  getNextQuestion(): string {
    const next = this.generator.generateNextQuestion({
      memory: this.memory,
      difficulty: this.difficulty.getCurrent(),
      lastAnswer: this.memory.getLastAnswer() ?? "",
    });
    this.memory.recordQuestion(next.text, next.topic, next.difficulty);
    this.questionsAsked += 1;
    return next.text;
  }

  /** A hidden, per-turn instruction for a live voice model describing
   * exactly what the brain wants asked next, without the model having to
   * decide that on its own. Call after getOpeningQuestion()/getNextQuestion(). */
  getRealtimeDirective(): string {
    const last = this.memory.getLastQuestion();
    if (!last) return this.getSystemInstructions();
    return buildRealtimeDirective({
      questionText: last.question,
      topic: last.topic,
      difficulty: last.difficulty,
      isFollowUp: this.memory.getCurrentTopicDepth() > 1,
    });
  }

  getClosingRemark(): string {
    return buildClosing({ answeredCount: this.memory.getAnsweredCount() });
  }

  isComplete(): boolean {
    return this.memory.getAnsweredCount() >= this.context.targetQuestionCount;
  }

  getCurrentDifficulty(): DifficultyLevel {
    return this.difficulty.getCurrent();
  }

  getQuestionNumber(): number {
    return this.questionsAsked;
  }

  getConversationHistory(): QAPair[] {
    return this.memory.getHistory();
  }

  getCoveredTopics(): string[] {
    return this.memory.getCoveredTopics();
  }

  /** Sprint 7 OUTPUT: candidate profile summary — null when no
   * personalization (no resume) was configured for this interview. */
  getCandidateProfileSummary(): CandidateProfileSummary | null {
    return this.knowledgeGraph?.toSummary() ?? null;
  }

  /** Sprint 7 OUTPUT: focus areas / recommended questions / skill gap /
   * preparation suggestions — null when no personalization was configured. */
  getPersonalizationOutput(): QuestionStrategyOutput | null {
    return this.personalizationStrategy?.buildOutput(this.difficulty.getCurrent()) ?? null;
  }

  reset(): void {
    this.memory.reset();
    this.profile.reset();
    this.difficulty.reset();
    this.questionsAsked = 0;
  }

  /** Test mode: plays the brain against a small built-in bank of dummy
   * candidate answers (or a caller-supplied list) so the Interview Room
   * UI can render a complete, realistic interview end-to-end without
   * ever calling an external API. Uses all the same decision logic as a
   * live session — only the "candidate" is scripted. */
  runSimulation(candidateAnswers: string[] = DUMMY_CANDIDATE_ANSWERS): SimulatedInterviewTurn[] {
    this.reset();
    const turns: SimulatedInterviewTurn[] = [];

    turns.push({ speaker: "ai", kind: "intro", text: this.introduce() });

    const openingQuestion = this.getOpeningQuestion();
    const openingMeta = this.memory.getLastQuestion();
    turns.push({
      speaker: "ai",
      kind: "question",
      text: openingQuestion,
      topic: openingMeta?.topic,
      difficulty: openingMeta?.difficulty,
    });

    for (const answer of candidateAnswers) {
      if (this.isComplete()) break;

      turns.push({ speaker: "candidate", kind: "answer", text: answer });
      this.submitAnswer(answer);

      if (this.isComplete()) break;

      const nextQuestion = this.getNextQuestion();
      const meta = this.memory.getLastQuestion();
      turns.push({
        speaker: "ai",
        kind: "question",
        text: nextQuestion,
        topic: meta?.topic,
        difficulty: meta?.difficulty,
      });
    }

    turns.push({ speaker: "ai", kind: "closing", text: this.getClosingRemark() });
    return turns;
  }
}

export function createInterviewBrain(
  role: string,
  interviewType: string,
  options?: {
    company?: string | null;
    difficulty?: DifficultyMode;
    targetQuestionCount?: number;
    personalization?: InterviewBrainPersonalization;
  },
): InterviewBrain {
  return new InterviewBrain({
    role,
    interviewType: normalizeInterviewType(interviewType),
    company: options?.company,
    difficulty: options?.difficulty,
    targetQuestionCount: options?.targetQuestionCount,
    personalization: options?.personalization,
  });
}
