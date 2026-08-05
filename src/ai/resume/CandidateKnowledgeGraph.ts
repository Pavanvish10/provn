import { KeywordMatcher } from "@/ai/resume/KeywordMatcher";
import type { ResumeProfile } from "@/ai/resume/ResumeAnalyzer";
import type { ExtractedProject } from "@/ai/resume/ProjectExtractor";
import type { JobDescriptionAnalysis } from "@/ai/resume/JobDescriptionAnalyzer";

// The single "what do we know about this candidate" object: everything
// extracted from their resume, reconciled against the job description
// (if one was provided), and queryable by the question strategy — e.g.
// "which projects used React?" or "does the candidate have Kubernetes
// experience?" — rather than every consumer re-deriving that from raw
// extractor output.

export interface CandidateProfileSummary {
  yearsOfExperience: number;
  topSkills: string[];
  projectCount: number;
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  weaknesses: string[];
}

export class CandidateKnowledgeGraph {
  private readonly resume: ResumeProfile;
  private readonly jobDescription: JobDescriptionAnalysis | null;
  private readonly matchedSkills: string[];
  private readonly missingSkills: string[];

  constructor(resume: ResumeProfile, jobDescription: JobDescriptionAnalysis | null = null) {
    this.resume = resume;
    this.jobDescription = jobDescription;

    const resumeSkillNames = resume.skills.map((skill) => skill.name);
    const requiredSkills = jobDescription?.requiredSkills ?? [];
    this.matchedSkills = KeywordMatcher.intersect(requiredSkills, resumeSkillNames);
    this.missingSkills = KeywordMatcher.diff(resumeSkillNames, requiredSkills);
  }

  getResumeProfile(): ResumeProfile {
    return this.resume;
  }

  getJobDescription(): JobDescriptionAnalysis | null {
    return this.jobDescription;
  }

  getMatchedSkills(): string[] {
    return this.matchedSkills;
  }

  getMissingSkills(): string[] {
    return this.missingSkills;
  }

  hasSkill(skillName: string): boolean {
    const key = skillName.trim().toLowerCase();
    return this.resume.skills.some((skill) => skill.name.toLowerCase() === key);
  }

  /** "Which projects mention this skill?" — the query that lets
   * CompanyQuestionStrategy ground a question in something the candidate
   * actually built. */
  getProjectsUsingSkill(skillName: string): ExtractedProject[] {
    const key = skillName.trim().toLowerCase();
    return this.resume.projects.filter((project) =>
      project.technologies.some((tech) => tech.toLowerCase() === key),
    );
  }

  getTopProjects(limit = 3): ExtractedProject[] {
    return this.resume.projects.slice(0, limit);
  }

  getStrengths(): string[] {
    const strengths: string[] = [];
    if (this.matchedSkills.length > 0) {
      strengths.push(
        `Strong match on ${this.matchedSkills.slice(0, 3).join(", ")} — directly required for this role.`,
      );
    }
    const notableProject = this.resume.projects[0];
    if (notableProject) {
      const techList =
        notableProject.technologies.slice(0, 3).join(", ") || "multiple technologies";
      strengths.push(`Hands-on project experience with ${notableProject.name} (${techList}).`);
    }
    if (this.resume.yearsOfExperience >= 3) {
      strengths.push(
        `${this.resume.yearsOfExperience}+ years of relevant professional experience.`,
      );
    }
    return strengths;
  }

  getWeaknesses(): string[] {
    if (this.missingSkills.length === 0) return [];
    return [
      `Limited demonstrated experience with ${this.missingSkills.join(", ")}, which the job description lists as required.`,
    ];
  }

  toSummary(): CandidateProfileSummary {
    return {
      yearsOfExperience: this.resume.yearsOfExperience,
      topSkills: this.resume.skills.slice(0, 8).map((skill) => skill.name),
      projectCount: this.resume.projects.length,
      matchedSkills: this.matchedSkills,
      missingSkills: this.missingSkills,
      strengths: this.getStrengths(),
      weaknesses: this.getWeaknesses(),
    };
  }
}
