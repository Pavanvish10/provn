// The static configuration an interview runs under: who the candidate is
// interviewing with, for what role, in what style, and at what starting
// difficulty. Every other AI module reads this rather than taking its own
// copy of these fields, so there is exactly one source of truth for "what
// interview is this."

export type InterviewType = "hr" | "technical" | "startup" | "faang" | "managerial" | "behavioral";

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  hr: "HR",
  technical: "Technical",
  startup: "Startup",
  faang: "FAANG",
  managerial: "Managerial",
  behavioral: "Behavioral",
};

/** Free-form input is normalized against this list; anything unrecognized
 * falls back to "technical" so the rest of the brain always has a valid
 * InterviewType to work with. */
export function normalizeInterviewType(value: string): InterviewType {
  const key = value.trim().toLowerCase();
  if (key === "hr" || key === "technical" || key === "startup" || key === "faang") return key;
  if (key === "managerial" || key === "manager") return "managerial";
  if (key === "behavioral") return "behavioral";
  return "technical";
}

export interface InterviewContextConfig {
  role: string;
  interviewType: InterviewType;
  company?: string | null;
  /** Roughly how many questions the interview should run for before it's
   * considered complete. */
  targetQuestionCount?: number;
}

export class InterviewContext {
  readonly role: string;
  readonly interviewType: InterviewType;
  readonly company: string | null;
  readonly targetQuestionCount: number;
  private readonly startedAt: number;

  constructor(config: InterviewContextConfig) {
    this.role = config.role;
    this.interviewType = config.interviewType;
    this.company = config.company?.trim() || null;
    this.targetQuestionCount = config.targetQuestionCount ?? 8;
    this.startedAt = Date.now();
  }

  get typeLabel(): string {
    return INTERVIEW_TYPE_LABELS[this.interviewType];
  }

  /** e.g. "a Technical interview at Google for the Frontend Developer role" */
  describe(): string {
    const companyPart = this.company ? ` at ${this.company}` : "";
    return `a ${this.typeLabel} interview${companyPart} for the ${this.role} role`;
  }

  getElapsedSeconds(): number {
    return Math.floor((Date.now() - this.startedAt) / 1000);
  }
}
