import type { DifficultyLevel } from "@/ai/QuestionDifficulty";
import type { CompanyProfileData } from "@/ai/resume/CompanyProfile";
import type { JobDescriptionAnalysis } from "@/ai/resume/JobDescriptionAnalyzer";
import type { RoleProfile } from "@/services/job/RoleKnowledgeBase";
import type { SkillMatchResult } from "@/services/job/SkillMatcher";

// Turns a (company, role, parsed JD, skill match) tuple into the concrete
// interview plan the room/report pages consume — question categories,
// topic lists, difficulty, and an estimated duration. Pure/offline: every
// input already comes from the other job/ services, so this file only
// combines and shapes data, it never re-derives it.

export interface InterviewPlan {
  focusAreas: string[];
  questionCategories: string[];
  technicalTopics: string[];
  behavioralTopics: string[];
  leadershipTopics: string[];
  systemDesignTopics: string[];
  difficulty: DifficultyLevel;
  estimatedDurationMinutes: number;
}

interface GeneratePlanInput {
  company: CompanyProfileData | null;
  role: RoleProfile | null;
  jobDescription: JobDescriptionAnalysis;
  skillMatch: SkillMatchResult;
  /** Manual override from the Job Description page's DifficultySelector —
   * takes priority over the company's default difficulty when present. */
  difficultyOverride?: DifficultyLevel | null;
}

const BASE_DURATION = 20;
const MINUTES_PER_CATEGORY = 8;
const MAX_DURATION = 60;
const DIFFICULTY_ORDER: DifficultyLevel[] = ["easy", "medium", "hard"];
const STRONG_MATCH_THRESHOLD = 85;
const WEAK_MATCH_THRESHOLD = 40;

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function adjustDifficulty(base: DifficultyLevel, matchPercent: number): DifficultyLevel {
  const index = DIFFICULTY_ORDER.indexOf(base);
  if (matchPercent >= STRONG_MATCH_THRESHOLD) {
    return DIFFICULTY_ORDER[Math.min(DIFFICULTY_ORDER.length - 1, index + 1)];
  }
  if (matchPercent < WEAK_MATCH_THRESHOLD) {
    return DIFFICULTY_ORDER[Math.max(0, index - 1)];
  }
  return base;
}

export class InterviewPlanGenerator {
  static generate({
    company,
    role,
    jobDescription,
    skillMatch,
    difficultyOverride,
  }: GeneratePlanInput): InterviewPlan {
    const technicalTopics = dedupe([
      ...(role?.technicalTopics ?? []),
      ...jobDescription.technologies.slice(0, 6),
    ]);
    const behavioralTopics = dedupe([
      ...(role?.behavioralTopics ?? []),
      ...jobDescription.softSkills,
    ]);
    const leadershipTopics = dedupe(company?.leadershipPrinciples ?? []);
    const systemDesignTopics = role?.includesSystemDesign
      ? dedupe([
          "System design fundamentals",
          "Scalability & trade-offs",
          ...technicalTopics.filter((topic) => /system|scal|architect|design/i.test(topic)),
        ])
      : [];

    const questionCategories = dedupe([
      "Technical Deep Dive",
      "Behavioral",
      ...(systemDesignTopics.length > 0 ? ["System Design"] : []),
      ...(leadershipTopics.length > 0 ? ["Company Culture Fit"] : []),
    ]);

    const focusAreas = dedupe([
      ...skillMatch.missing.slice(0, 5),
      ...jobDescription.responsibilities.slice(0, 3),
      ...(company?.preferredTopics.slice(0, 3) ?? []),
    ]);

    const difficulty = adjustDifficulty(
      difficultyOverride ?? company?.difficulty ?? "medium",
      skillMatch.matchPercent,
    );

    const estimatedDurationMinutes = Math.min(
      MAX_DURATION,
      BASE_DURATION + questionCategories.length * MINUTES_PER_CATEGORY,
    );

    return {
      focusAreas,
      questionCategories,
      technicalTopics,
      behavioralTopics,
      leadershipTopics,
      systemDesignTopics,
      difficulty,
      estimatedDurationMinutes,
    };
  }
}
