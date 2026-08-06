import {
  getCompanyProfile,
  listCompanyProfiles,
  type CompanyProfileData,
} from "@/ai/resume/CompanyProfile";
import type { DifficultyLevel } from "@/ai/QuestionDifficulty";

// Sprint 12's job-analysis-facing entry point onto Sprint 7's company
// data — a thin wrapper so `JobAnalysisEngine` and friends never import
// `@/ai/resume/CompanyProfile` directly, keeping the resume-analysis and
// job-analysis layers loosely coupled even though they share one dataset.

export class CompanyKnowledgeBase {
  static list(): CompanyProfileData[] {
    return listCompanyProfiles();
  }

  static get(idOrName: string): CompanyProfileData | null {
    return getCompanyProfile(idOrName);
  }

  static getLeadershipTopics(idOrName: string): string[] {
    return this.get(idOrName)?.leadershipPrinciples ?? [];
  }

  static getPreferredTopics(idOrName: string): string[] {
    return this.get(idOrName)?.preferredTopics ?? [];
  }

  static getDefaultDifficulty(idOrName: string): DifficultyLevel {
    return this.get(idOrName)?.difficulty ?? "medium";
  }
}
