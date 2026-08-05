/**
 * Typed placeholders for Daily Challenges roadmap items — NOT implemented.
 * These exist so the shape of future work is settled ahead of time and the
 * UI/DB layer already built (challenges, categories, submissions, XP,
 * badges, leaderboard) doesn't need to change when each ships. Nothing in
 * this file is wired into the app; it's a contract for future PRs.
 *
 * Code execution itself (Run/Submit/Compile/Test Cases/Execution Results)
 * already has a real, working interface — see src/lib/judge0.server.ts
 * (Judge0Language, Judge0Result, TestCase, runSampleFn, submitChallengeFn).
 * That one is NOT a placeholder; it's live today, just gated behind
 * JUDGE0_API_KEY being configured.
 */

// ---------------------------------------------------------------------
// Contest mode / weekly contests / hackathons
// ---------------------------------------------------------------------

export type ContestStatus = "upcoming" | "live" | "ended";

export type Contest = {
  id: string;
  title: string;
  kind: "weekly" | "hackathon" | "company_sponsored";
  startsAt: string;
  endsAt: string;
  challengeIds: string[];
  status: ContestStatus;
};

export type ContestLeaderboardEntry = {
  profileId: string;
  score: number;
  solvedCount: number;
  finishTimeSeconds: number | null;
  rank: number;
};

/** Future: create/list contests, join a contest, live-ranked leaderboard
 * scoped to a single contest window (distinct from the global leaderboard
 * in leaderboard-client.ts). Would need its own `contests` +
 * `contest_participants` + `contest_submissions` tables, mirroring the
 * daily_challenge_* pattern but time-boxed instead of one-per-day. */
export type ContestApi = {
  listContests: (status?: ContestStatus) => Promise<Contest[]>;
  joinContest: (contestId: string) => Promise<{ error: string | null }>;
  getContestLeaderboard: (contestId: string) => Promise<ContestLeaderboardEntry[]>;
};

// ---------------------------------------------------------------------
// AI hints / AI explanations
// ---------------------------------------------------------------------

/** AI explanations for challenge submissions already ship today via
 * explainSubmissionFn in challenge-ai.server.ts (Gemini-backed). This type
 * documents the natural next step: an on-demand AI hint DURING an attempt
 * (before submitting), separate from the pre-authored `challenge.hints`
 * array — would call Gemini with the user's in-progress code + the
 * question, and should count toward `hint_used` like a regular hint. */
export type AiHintRequest = {
  challengeId: string;
  currentSource: string;
  language: string;
};

export type AiHintApi = {
  requestHint: (req: AiHintRequest) => Promise<{ error: string | null; hint?: string }>;
};

// ---------------------------------------------------------------------
// Company-specific challenge sets
// ---------------------------------------------------------------------

/** `challenges.company_tags` (added in this release) already supports
 * filtering by company today — see useChallengeCompanyTags /
 * useChallenges({ company }) in challenges-client.ts. A "set" is the next
 * layer: a curated, ordered bundle of challenges branded to one company
 * (e.g. "Amazon SDE-1 Prep"), possibly gated behind a job application. */
export type CompanyChallengeSet = {
  id: string;
  companyId: string;
  title: string;
  challengeIds: string[];
  isPremium: boolean;
};

// ---------------------------------------------------------------------
// Mock interview integration
// ---------------------------------------------------------------------

/** The mock interview system (src/lib/interview.server.ts) is already
 * fully separate and functional (technical + soft-skills modes). Future
 * integration point: let a mock interview reference a specific
 * `challenges.id` as its live-coding segment, so the interviewer persona
 * can ask the candidate to solve it during the conversation and grade
 * both the discussion and the code in one session. */
export type MockInterviewChallengeLink = {
  interviewId: string;
  challengeId: string;
};
