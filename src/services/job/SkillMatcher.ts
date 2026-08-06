import { KeywordMatcher } from "@/ai/resume/KeywordMatcher";

// Compares a candidate's known skills (from an uploaded/mock resume, or
// simply the role's core-skill list when no resume exists yet) against a
// job description's required skills, reusing Sprint 7's
// KeywordMatcher.intersect/diff so the matching logic isn't reimplemented.

export interface SkillMatchResult {
  matched: string[];
  missing: string[];
  matchPercent: number;
}

export class SkillMatcher {
  static match(candidateSkills: string[], requiredSkills: string[]): SkillMatchResult {
    if (requiredSkills.length === 0) {
      return { matched: [], missing: [], matchPercent: 100 };
    }

    const matched = KeywordMatcher.intersect(requiredSkills, candidateSkills);
    const missing = KeywordMatcher.diff(candidateSkills, requiredSkills);
    const matchPercent = Math.round((matched.length / requiredSkills.length) * 100);

    return { matched, missing, matchPercent };
  }
}
