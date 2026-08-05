// Owns the interview's conversational framing for the live Realtime voice
// session. As of Sprint 6, the actual question-by-question decision
// making is delegated entirely to the AI Interview Brain
// (src/ai/InterviewBrain.ts) — this class is a thin adapter that turns
// the brain's plain-English decisions into what the Realtime API needs:
// system instructions at connect time, and a hidden per-turn directive
// before every response so the live model asks exactly what the brain
// decided rather than improvising the whole interview on its own.
import {
  createInterviewBrain,
  type DifficultyMode,
  type InterviewBrain,
  type InterviewBrainPersonalization,
} from "@/ai/InterviewBrain";

export interface ConversationSetup {
  interviewType: string;
  company?: string;
  role: string;
  difficulty?: string;
  language?: string;
}

export interface NextTurn {
  directive: string;
  isComplete: boolean;
}

const DIFFICULTY_MODES: DifficultyMode[] = ["easy", "medium", "hard", "adaptive"];

function resolveDifficultyMode(value: string | undefined): DifficultyMode {
  const normalized = value?.trim().toLowerCase();
  return (DIFFICULTY_MODES as string[]).includes(normalized ?? "")
    ? (normalized as DifficultyMode)
    : "adaptive";
}

export class ConversationManager {
  private readonly setup: ConversationSetup;
  private readonly personalization?: InterviewBrainPersonalization;
  private brain: InterviewBrain;

  constructor(setup: ConversationSetup, personalization?: InterviewBrainPersonalization) {
    this.setup = setup;
    this.personalization = personalization;
    this.brain = this.createBrain();
  }

  private createBrain() {
    return createInterviewBrain(this.setup.role, this.setup.interviewType, {
      company: this.setup.company,
      difficulty: resolveDifficultyMode(this.setup.difficulty),
      personalization: this.personalization,
    });
  }

  getInstructions(): string {
    const base = this.brain.getSystemInstructions();
    return this.setup.language
      ? `${base}\n\nConduct the interview in ${this.setup.language}.`
      : base;
  }

  /** Call once, right after the session connects — starts the brain and
   * returns the hidden directive for the model's opening question. */
  startInterview(): NextTurn {
    this.brain.getOpeningQuestion();
    return { directive: this.brain.getRealtimeDirective(), isComplete: false };
  }

  /** Call once per candidate turn, with their finalized answer transcript
   * — records it with the brain and returns the directive for whatever
   * should be asked next (or a closing directive once the interview's
   * target question count has been reached). */
  submitAnswer(answerText: string): NextTurn {
    this.brain.submitAnswer(answerText);
    if (this.brain.isComplete()) {
      return { directive: this.brain.getClosingRemark(), isComplete: true };
    }
    this.brain.getNextQuestion();
    return { directive: this.brain.getRealtimeDirective(), isComplete: false };
  }

  getQuestionNumber(): number {
    return this.brain.getQuestionNumber();
  }

  reset() {
    this.brain = this.createBrain();
  }
}
