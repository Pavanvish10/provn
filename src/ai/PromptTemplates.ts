import type { InterviewType } from "@/ai/InterviewContext";
import type { DifficultyLevel } from "@/ai/QuestionDifficulty";

// Every piece of literal interview copy lives here — the opening script,
// the question bank, follow-up phrasing, closing remarks, and the
// directive text sent to the live Realtime model — so nothing upstream
// (components, services) ever hardcodes prompt text of its own.

export interface TopicQuestion {
  topic: string;
  text: string;
}

// ---------------------------------------------------------------------
// Opening / closing script
// ---------------------------------------------------------------------

export function buildIntroduction(params: {
  typeLabel: string;
  role: string;
  company: string | null;
}): string {
  const companyPart = params.company ? ` at ${params.company}` : "";
  return (
    `Hi there! I'm Provn, your AI interviewer today. ` +
    `We'll be doing a ${params.typeLabel.toLowerCase()} interview${companyPart} for the ${params.role} role. ` +
    `I'll ask you a series of questions, listen closely to your answers, and follow up on anything I'd like to hear more about — ` +
    `just answer naturally, like you would in a real conversation. Let's get started.`
  );
}

export function buildClosing(params: { answeredCount: number }): string {
  return (
    `That's everything I wanted to cover today — thank you for walking me through your experience. ` +
    `You answered ${params.answeredCount} question${params.answeredCount === 1 ? "" : "s"}, and I appreciated the detail you went into. ` +
    `That wraps up this interview.`
  );
}

// ---------------------------------------------------------------------
// System instructions for the live Realtime voice model
// ---------------------------------------------------------------------

export function buildSystemInstructions(params: {
  typeLabel: string;
  role: string;
  company: string | null;
}): string {
  const companyPart = params.company ? ` at ${params.company}` : "";
  return `You are Provn, a warm but professional AI interviewer conducting a live, spoken ${params.typeLabel} interview${companyPart} for a candidate applying for the role of "${params.role}".

Speak naturally, one question at a time, the way a real human interviewer would. Keep each turn concise (1-3 sentences). Start by greeting the candidate warmly in one short sentence, then ask your first question.

You will periodically receive a short, hidden system note telling you exactly what topic and difficulty to ask about next — always follow that note's guidance and phrase it as a natural, spoken question rather than repeating it verbatim. Never ask the same question twice, and never repeat a topic you've already covered in this conversation.

Keep a natural conversational pace: wait for the candidate to finish speaking before responding, and don't interrupt.`;
}

/** The per-turn hidden instruction sent to the live model so its next
 * question is driven by the brain's own topic/difficulty decision rather
 * than left to the model to improvise for the whole interview. */
export function buildRealtimeDirective(params: {
  questionText: string;
  topic: string;
  difficulty: DifficultyLevel;
  isFollowUp: boolean;
}): string {
  const kind = params.isFollowUp ? "a follow-up question" : "a new question";
  return `[Interview director's note — do not read this aloud] Ask ${kind} at ${params.difficulty} difficulty, on the topic of "${params.topic}". Phrase it naturally in your own words, close in meaning to: "${params.questionText}"`;
}

/** Sprint 14: the live-model directive when the question/closing text
 * itself is already real, Gemini-authored, natural spoken-style content
 * (from voice-interview.server.ts) rather than a local brain's topic
 * pick — so there's no topic/difficulty metadata to relay, just an
 * instruction to deliver this exact real content in the model's own
 * natural voice. */
export function buildLiveDirective(text: string, isClosing: boolean): string {
  const action = isClosing
    ? "Deliver this closing remark to the candidate"
    : "Ask the candidate this exact question";
  return `[Interview director's note — do not read this aloud] ${action}, in your own natural spoken voice, preserving its meaning: "${text}"`;
}

// ---------------------------------------------------------------------
// Follow-up ladder — generic, topic-agnostic phrasing used to go one
// level deeper on whatever the candidate just described.
// ---------------------------------------------------------------------

export const FOLLOW_UP_LADDER: string[][] = [
  [
    "What was the most challenging part of that?",
    "What motivated that approach?",
    "Can you tell me more about that?",
  ],
  [
    "How did you go about solving that?",
    "Walk me through how you approached it.",
    "What steps did you take from there?",
  ],
  ["What was the outcome?", "How did that turn out in the end?", "What was the result of that?"],
  ["Looking back, what would you do differently?", "What did you learn from that experience?"],
];

export function getFollowUpQuestion(depth: number): string {
  const rung = FOLLOW_UP_LADDER[Math.min(depth, FOLLOW_UP_LADDER.length - 1)];
  return rung[0];
}

// ---------------------------------------------------------------------
// Topic bank — opening / pivot questions per interview type & difficulty.
// ---------------------------------------------------------------------

export const TOPIC_BANK: Record<InterviewType, Record<DifficultyLevel, TopicQuestion[]>> = {
  hr: {
    easy: [
      {
        topic: "background",
        text: "Tell me a little about your background and what drew you to this role.",
      },
      { topic: "strengths", text: "What would you say is your greatest professional strength?" },
      { topic: "motivation", text: "Why are you interested in this position?" },
    ],
    medium: [
      {
        topic: "teamwork",
        text: "Tell me about a time you had a disagreement with a teammate. How did you handle it?",
      },
      { topic: "failure", text: "Describe a time you failed at something. What did you learn?" },
      {
        topic: "priorities",
        text: "How do you prioritize when you have multiple deadlines at once?",
      },
    ],
    hard: [
      {
        topic: "conflict-resolution",
        text: "Tell me about the most difficult conflict you've had to resolve at work, and how you navigated it.",
      },
      {
        topic: "leadership-under-pressure",
        text: "Describe a time you had to make an unpopular decision. How did you handle the pushback?",
      },
      {
        topic: "ambiguity",
        text: "Tell me about a time you had to act without complete information. How did you decide what to do?",
      },
    ],
  },
  technical: {
    easy: [
      {
        topic: "tech-background",
        text: "Walk me through a project you're proud of and the tech stack you used.",
      },
      { topic: "tools", text: "What tools or frameworks do you use most in your day-to-day work?" },
      { topic: "learning", text: "How do you usually go about learning a new technology?" },
    ],
    medium: [
      {
        topic: "debugging",
        text: "Tell me about a particularly tricky bug you had to track down. How did you find it?",
      },
      {
        topic: "tradeoffs",
        text: "Describe a technical decision where you had to weigh trade-offs. What did you choose and why?",
      },
      {
        topic: "collaboration-tech",
        text: "How do you approach code review, both giving and receiving feedback?",
      },
    ],
    hard: [
      {
        topic: "system-design",
        text: "How would you approach designing a system that needs to scale to a large number of users?",
      },
      {
        topic: "architecture-decision",
        text: "Tell me about a time you had to make a significant architectural decision under pressure.",
      },
      {
        topic: "performance",
        text: "Describe a time you had to optimize a slow or inefficient system. What was your approach?",
      },
    ],
  },
  startup: {
    easy: [
      {
        topic: "ownership",
        text: "Tell me about a time you took ownership of something outside your usual responsibilities.",
      },
      { topic: "fast-pace", text: "How do you stay productive in a fast-changing environment?" },
      {
        topic: "resourcefulness",
        text: "Describe a time you had to get something done with limited resources.",
      },
    ],
    medium: [
      {
        topic: "wearing-hats",
        text: "Tell me about a time you had to wear multiple hats at once. How did you manage it?",
      },
      {
        topic: "ambiguity-startup",
        text: "Describe a situation where the goals were unclear. How did you figure out what to prioritize?",
      },
      {
        topic: "scrappy-solution",
        text: "Tell me about a scrappy or creative solution you came up with under a tight deadline.",
      },
    ],
    hard: [
      {
        topic: "pivot",
        text: "Tell me about a time a project or plan had to pivot quickly. How did you adapt?",
      },
      {
        topic: "founder-mindset",
        text: "Describe a decision you made that had significant impact, even though it wasn't officially your call to make.",
      },
      {
        topic: "high-stakes",
        text: "Tell me about the highest-stakes decision you've made with very little time to decide.",
      },
    ],
  },
  faang: {
    easy: [
      {
        topic: "impact",
        text: "Tell me about a project where you had measurable impact. How did you measure it?",
      },
      { topic: "process", text: "How do you approach breaking down a large, ambiguous problem?" },
      {
        topic: "collaboration-scale",
        text: "Describe how you collaborate with cross-functional teams.",
      },
    ],
    medium: [
      {
        topic: "data-driven",
        text: "Tell me about a time you used data to make a decision that others disagreed with.",
      },
      {
        topic: "scale-challenge",
        text: "Describe a time you had to solve a problem at scale. What made it hard?",
      },
      {
        topic: "stakeholder-mgmt",
        text: "Tell me about a time you had to manage competing stakeholder priorities.",
      },
    ],
    hard: [
      {
        topic: "bar-raising",
        text: "Tell me about the most technically or strategically challenging project you've led end-to-end.",
      },
      {
        topic: "org-influence",
        text: "Describe a time you had to influence a decision without having direct authority.",
      },
      {
        topic: "tradeoff-scale",
        text: "Walk me through a major trade-off you made on a large-scale system or initiative, and how you evaluated it.",
      },
    ],
  },
  managerial: {
    easy: [
      { topic: "mgmt-style", text: "How would you describe your management or leadership style?" },
      { topic: "feedback", text: "How do you typically give feedback to someone on your team?" },
      { topic: "onboarding", text: "How do you approach onboarding a new team member?" },
    ],
    medium: [
      {
        topic: "underperformance",
        text: "Tell me about a time you had to manage an underperforming team member.",
      },
      {
        topic: "delegation",
        text: "Describe how you decide what to delegate versus handle yourself.",
      },
      {
        topic: "motivation-team",
        text: "Tell me about a time you had to re-motivate a team during a difficult period.",
      },
    ],
    hard: [
      {
        topic: "hard-people-call",
        text: "Tell me about the hardest people decision you've had to make as a leader.",
      },
      {
        topic: "org-change",
        text: "Describe how you led a team through a significant organizational change.",
      },
      {
        topic: "conflicting-priorities-mgmt",
        text: "Tell me about a time you had to balance business needs against what was best for your team.",
      },
    ],
  },
};

// ---------------------------------------------------------------------
// Dummy candidate answers — used only by InterviewBrain's test-mode
// simulation, never sent to any API. Ordered to naturally exercise the
// adaptive-difficulty logic: strong, detailed answers first, then a
// couple of thin ones, then a recovery.
// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// Resume/company-driven personalization (Sprint 7) — phrasing for
// questions CompanyQuestionStrategy grounds in a specific project, a
// skill-gap versus the job description, or a company's leadership
// principles. Kept here, alongside every other prompt string, rather
// than inline in the strategy that picks when to use them.
// ---------------------------------------------------------------------

export function buildProjectChallengeQuestion(projectName: string): string {
  return `You mentioned you built ${projectName} — what was the most challenging part of that project?`;
}

export function buildProjectOptimizationQuestion(projectName: string, usesReact: boolean): string {
  return usesReact
    ? `How did you approach performance optimization in ${projectName} — things like re-renders or bundle size?`
    : `What did you do to keep ${projectName} performant as it grew?`;
}

export function buildProjectStateManagementQuestion(
  projectName: string,
  usesReact: boolean,
): string {
  return usesReact
    ? `How did you manage state across the application in ${projectName}?`
    : `How did you manage data flow between the different parts of ${projectName}?`;
}

export function buildProjectApiQuestion(projectName: string): string {
  return `How did ${projectName} handle communication with the backend or external APIs?`;
}

export function buildProjectDeploymentQuestion(projectName: string): string {
  return `How did you deploy and manage ${projectName} in production?`;
}

export function buildSkillGapQuestion(skill: string): string {
  return `The role calls for ${skill} — how comfortable are you with it, even if it's not on your resume yet?`;
}

export function buildCompanyPrincipleQuestion(principle: string, companyName: string): string {
  return `${companyName} looks for "${principle}" in candidates — can you tell me about a time you demonstrated that?`;
}

export function buildSkillGapPreparationTip(skill: string): string {
  return `Brush up on ${skill} — it's listed as required for this role.`;
}

export function buildPrinciplePreparationTip(principle: string, companyName: string): string {
  return `Prepare a specific story that demonstrates "${principle}" for ${companyName}.`;
}

export const DUMMY_CANDIDATE_ANSWERS: string[] = [
  "Sure — I led the redesign of our checkout flow last year. We reduced cart abandonment by about 18% by simplifying the form and adding a guest checkout option. I worked closely with design and backend to ship it in about six weeks.",
  "The biggest challenge was that our payment provider's API had inconsistent error codes, so failed payments were hard to distinguish from network issues. I ended up building a small retry-and-classify layer that logged the raw response so we could tell the two apart.",
  "I basically just tested it a bunch of times.",
  "Not sure, it just worked out.",
  "Looking back, I'd probably invest earlier in monitoring — we didn't have good visibility into payment failures until partway through, and that cost us a couple of weeks of guessing.",
  "I once had to coordinate a launch across three teams with very different priorities. I set up a shared doc with clear owners and deadlines, and did short daily syncs for the last week to catch blockers early. We shipped on time and I think the visibility was what made the difference.",
  "Honestly it was fine, nothing major happened.",
  "We shipped it and it worked well — usage went up about 12% in the first month, and support tickets related to that flow dropped noticeably.",
];
