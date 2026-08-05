import type { InterviewType } from "@/ai/InterviewContext";
import type { DifficultyLevel } from "@/ai/QuestionDifficulty";
import type { ConversationMemory } from "@/ai/ConversationMemory";
import type { FollowUpEngine } from "@/ai/FollowUpEngine";
import { TOPIC_BANK } from "@/ai/PromptTemplates";
import type { CompanyQuestionStrategy } from "@/ai/resume/CompanyQuestionStrategy";

// Decides the literal next question. As of Sprint 7, there are two
// sources to choose from, tried in order:
//   1. A CompanyQuestionStrategy (optional) — resume/JD/company-grounded
//      questions, e.g. a ladder on a real project from the candidate's
//      resume. Its topics are namespaced ("project:x:challenge",
//      "skill-gap:kubernetes", "principle:ownership") so they're easy to
//      tell apart from the generic bank below.
//   2. The generic per-type/difficulty TOPIC_BANK (Sprint 6) — either a
//      contextual follow-up on the current topic (via FollowUpEngine) or
//      a pivot to a fresh, uncovered topic.
// Personalization is entirely optional: with none supplied, behavior is
// identical to Sprint 6.

export interface GeneratedQuestion {
  text: string;
  topic: string;
  difficulty: DifficultyLevel;
  isFollowUp: boolean;
}

/** The namespace of a topic id ("project:chat-app:challenge" ->
 * "project:chat-app"; a plain generic-bank topic like "debugging" has no
 * colon and is its own namespace). Two questions in the same namespace
 * are treated as a follow-up chain (e.g. successive rungs of one
 * project's ladder) rather than a pivot. */
function topicNamespace(topic: string): string {
  const parts = topic.split(":");
  return parts.length > 1 ? parts.slice(0, -1).join(":") : topic;
}

export class QuestionGenerator {
  constructor(
    private readonly interviewType: InterviewType,
    private readonly followUpEngine: FollowUpEngine,
    private readonly personalization?: CompanyQuestionStrategy,
  ) {}

  generateOpeningQuestion(difficulty: DifficultyLevel): GeneratedQuestion {
    const personalized = this.personalization?.pickNextQuestion([], difficulty);
    if (personalized) {
      return { text: personalized.text, topic: personalized.topic, difficulty, isFollowUp: false };
    }
    const bank = TOPIC_BANK[this.interviewType][difficulty];
    const question = bank[0];
    return { text: question.text, topic: question.topic, difficulty, isFollowUp: false };
  }

  generateNextQuestion(params: {
    memory: ConversationMemory;
    difficulty: DifficultyLevel;
    lastAnswer: string;
  }): GeneratedQuestion {
    const { memory, difficulty, lastAnswer } = params;
    const lastTopic = memory.getLastQuestion()?.topic ?? "";
    const lastIsPersonalized = lastTopic.includes(":");

    // The generic follow-up ladder only applies to generic-bank topics —
    // a personalized topic's own rungs (see CompanyQuestionStrategy)
    // already are that topic's follow-up progression.
    if (!lastIsPersonalized) {
      const topicDepth = memory.getCurrentTopicDepth() - 1;
      if (this.followUpEngine.shouldFollowUp(topicDepth, lastAnswer)) {
        return {
          text: this.followUpEngine.generateFollowUp(topicDepth),
          topic: lastTopic || "general",
          difficulty,
          isFollowUp: true,
        };
      }
    }

    const personalized = this.personalization?.pickNextQuestion(
      memory.getCoveredTopics(),
      difficulty,
    );
    if (personalized) {
      const isFollowUp = topicNamespace(personalized.topic) === topicNamespace(lastTopic);
      return { text: personalized.text, topic: personalized.topic, difficulty, isFollowUp };
    }

    return this.pivotToNewTopic(difficulty, memory);
  }

  private pivotToNewTopic(
    difficulty: DifficultyLevel,
    memory: ConversationMemory,
  ): GeneratedQuestion {
    const uncovered = this.findUncoveredQuestion(difficulty, memory);
    if (uncovered) return { ...uncovered, difficulty, isFollowUp: false };

    // Every question at this difficulty has been used — fall back to
    // another difficulty tier rather than repeating one verbatim.
    for (const fallbackDifficulty of ["medium", "hard", "easy"] as DifficultyLevel[]) {
      if (fallbackDifficulty === difficulty) continue;
      const fallback = this.findUncoveredQuestion(fallbackDifficulty, memory);
      if (fallback) return { ...fallback, difficulty: fallbackDifficulty, isFollowUp: false };
    }

    // Entire bank exhausted (a very long interview) — recycle the first
    // question rather than asking nothing.
    const bank = TOPIC_BANK[this.interviewType][difficulty];
    return { text: bank[0].text, topic: bank[0].topic, difficulty, isFollowUp: false };
  }

  private findUncoveredQuestion(difficulty: DifficultyLevel, memory: ConversationMemory) {
    const bank = TOPIC_BANK[this.interviewType][difficulty];
    return bank.find((question) => !memory.hasCoveredTopic(question.topic)) ?? null;
  }
}
