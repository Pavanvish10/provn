// Owns the interview's conversational framing for the live Realtime voice
// session. As of Sprint 14, question-by-question decision making is real:
// every question comes from a live Gemini call (voice-interview.server.ts
// — the same engine text-mode interviews use), not a local hardcoded
// bank. This class is a thin adapter that turns those real, already
// natural-language questions into what the Realtime API needs: system
// instructions at connect time, and a hidden per-turn directive before
// every response so the live model *speaks* exactly what Gemini decided
// rather than improvising the whole interview on its own.
import { buildSystemInstructions, buildLiveDirective } from "@/ai/PromptTemplates";
import { normalizeInterviewType, INTERVIEW_TYPE_LABELS } from "@/ai/InterviewContext";
import { startVoiceInterviewFn, respondToVoiceInterviewFn } from "@/lib/voice-interview.server";
import {
  toVoiceInterviewType,
  toApiDifficulty,
  toApiLanguage,
  toApiVoiceGender,
  toApiDuration,
} from "@/lib/voice-interview-client";

export interface ConversationSetup {
  interviewType: string;
  company?: string;
  role: string;
  difficulty?: string;
  duration?: number;
  language?: string;
  voiceGender?: string;
  /** Sprint 14: optional real grounding carried over from the Job
   * Description page (Sprint 12) so the live questions are genuinely
   * tailored, not just generic-by-role. */
  jobDescriptionText?: string | null;
  targetSkills?: string[] | null;
}

export interface NextTurn {
  directive: string;
  isComplete: boolean;
}

const FALLBACK_DIRECTIVE =
  "We're having trouble reaching the AI interviewer right now. Apologize briefly to the candidate and let them know to try again in a moment.";

export class ConversationManager {
  private readonly setup: ConversationSetup;
  private sessionId: string | null = null;
  private questionsAsked = 0;

  constructor(setup: ConversationSetup) {
    this.setup = setup;
  }

  getInstructions(): string {
    const normalized = normalizeInterviewType(this.setup.interviewType);
    const base = buildSystemInstructions({
      typeLabel: INTERVIEW_TYPE_LABELS[normalized],
      role: this.setup.role,
      company: this.setup.company ?? null,
    });
    return this.setup.language && this.setup.language.toLowerCase() !== "english"
      ? `${base}\n\nConduct the interview in ${this.setup.language}.`
      : base;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  /** Call once, right after the session connects — starts a real Gemini
   * interview session server-side and returns the directive for the
   * model's opening question. */
  async startInterview(): Promise<NextTurn> {
    const result = await startVoiceInterviewFn({
      data: {
        interviewType: toVoiceInterviewType(this.setup.interviewType),
        company: this.setup.company,
        role: this.setup.role,
        difficulty: toApiDifficulty(this.setup.difficulty),
        durationMinutes: toApiDuration(this.setup.duration),
        language: toApiLanguage(this.setup.language),
        voiceGender: toApiVoiceGender(this.setup.voiceGender),
        jobDescriptionText: this.setup.jobDescriptionText ?? undefined,
        targetSkills: this.setup.targetSkills ?? undefined,
      },
    });

    if (result.error || !result.sessionId || !result.question) {
      return { directive: FALLBACK_DIRECTIVE, isComplete: false };
    }

    this.sessionId = result.sessionId;
    this.questionsAsked = 1;
    return { directive: buildLiveDirective(result.question, false), isComplete: false };
  }

  /** Call once per candidate turn, with their finalized answer transcript
   * — sends it to the real interview session and returns the directive
   * for whatever should be asked next (or a closing directive once the
   * session decides enough questions have been asked). */
  async submitAnswer(answerText: string): Promise<NextTurn> {
    if (!this.sessionId) {
      return {
        directive: buildLiveDirective(
          "Thank you for your time today — that concludes the interview.",
          true,
        ),
        isComplete: true,
      };
    }

    const result = await respondToVoiceInterviewFn({
      data: { sessionId: this.sessionId, answer: answerText },
    });

    if (result.error || !result.question) {
      return { directive: FALLBACK_DIRECTIVE, isComplete: true };
    }

    const isComplete = !!result.readyToFinish;
    if (!isComplete) this.questionsAsked += 1;
    return { directive: buildLiveDirective(result.question, isComplete), isComplete };
  }

  getQuestionNumber(): number {
    return this.questionsAsked;
  }

  reset() {
    this.sessionId = null;
    this.questionsAsked = 0;
  }
}
