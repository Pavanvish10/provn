import type { DifficultyLevel } from "@/ai/QuestionDifficulty";

// The interview's running transcript, in a shape the rest of the brain can
// reason over: every question asked (with its topic and difficulty) and
// the answer that followed it. This is what keeps the AI from repeating
// itself — every other module consults it before deciding what to ask next.

export interface QAPair {
  index: number;
  question: string;
  topic: string;
  difficulty: DifficultyLevel;
  answer: string | null;
  askedAt: number;
  answeredAt: number | null;
}

export class ConversationMemory {
  private history: QAPair[] = [];
  private topicsCovered = new Set<string>();

  recordQuestion(question: string, topic: string, difficulty: DifficultyLevel): QAPair {
    const pair: QAPair = {
      index: this.history.length,
      question,
      topic,
      difficulty,
      answer: null,
      askedAt: Date.now(),
      answeredAt: null,
    };
    this.history.push(pair);
    this.topicsCovered.add(topic);
    return pair;
  }

  /** Attaches the given answer to the most recent unanswered question. */
  recordAnswer(answer: string) {
    const current = this.history.at(-1);
    if (current && current.answer === null) {
      current.answer = answer;
      current.answeredAt = Date.now();
    }
  }

  getHistory(): QAPair[] {
    return this.history;
  }

  getLastQuestion(): QAPair | null {
    return this.history.at(-1) ?? null;
  }

  getLastAnswer(): string | null {
    return this.history.at(-1)?.answer ?? null;
  }

  hasCoveredTopic(topic: string): boolean {
    return this.topicsCovered.has(topic);
  }

  getCoveredTopics(): string[] {
    return [...this.topicsCovered];
  }

  getAnsweredCount(): number {
    return this.history.filter((qa) => qa.answer !== null).length;
  }

  /** How many consecutive turns (from the end) have stayed on the same
   * topic as the current one — used to decide when a follow-up chain
   * should end and the interview should pivot to a new topic. */
  getCurrentTopicDepth(): number {
    const topic = this.getLastQuestion()?.topic;
    if (!topic) return 0;
    let depth = 0;
    for (let i = this.history.length - 1; i >= 0; i--) {
      if (this.history[i].topic !== topic) break;
      depth += 1;
    }
    return depth;
  }

  reset() {
    this.history = [];
    this.topicsCovered.clear();
  }
}
