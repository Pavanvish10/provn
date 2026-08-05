import { getFollowUpQuestion } from "@/ai/PromptTemplates";

// Decides, turn by turn, whether the AI should dig deeper into what the
// candidate just said (a follow-up) or move on to a fresh topic — and if
// it's digging deeper, produces that follow-up. Modeled as a "ladder":
// challenge -> approach -> outcome -> reflection, which is how a real
// interviewer naturally deepens a line of questioning without needing to
// understand the answer's content in detail.

const MAX_FOLLOW_UP_DEPTH = 2;
const MIN_ANSWER_LENGTH_FOR_FOLLOW_UP = 12;

export class FollowUpEngine {
  /** `topicDepth` is how many consecutive turns (including the one just
   * answered) have stayed on the current topic. `lastAnswer` is checked
   * for length only — a one-line answer isn't worth following up on,
   * it's worth moving to a new topic instead. */
  shouldFollowUp(topicDepth: number, lastAnswer: string): boolean {
    if (topicDepth >= MAX_FOLLOW_UP_DEPTH) return false;
    return lastAnswer.trim().split(/\s+/).length >= MIN_ANSWER_LENGTH_FOR_FOLLOW_UP;
  }

  /** `topicDepth` is 0 for the question that started this topic, so the
   * first follow-up on it is depth 0 -> rung 0 ("what was the challenge"),
   * the next is rung 1 ("how did you solve it"), and so on. */
  generateFollowUp(topicDepth: number): string {
    return getFollowUpQuestion(topicDepth);
  }
}
