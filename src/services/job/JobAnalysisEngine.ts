import type { DifficultyLevel } from "@/ai/QuestionDifficulty";
import type { CompanyProfileData } from "@/ai/resume/CompanyProfile";
import type { JobDescriptionAnalysis } from "@/ai/resume/JobDescriptionAnalyzer";
import { normalizeInterviewType, INTERVIEW_TYPE_LABELS } from "@/ai/InterviewContext";
import { CompanyKnowledgeBase } from "@/services/job/CompanyKnowledgeBase";
import { JobDescriptionParser } from "@/services/job/JobDescriptionParser";
import { InterviewPlanGenerator, type InterviewPlan } from "@/services/job/InterviewPlanGenerator";
import {
  PreparationRoadmapGenerator,
  type RoadmapStep,
} from "@/services/job/PreparationRoadmapGenerator";
import { RoleKnowledgeBase, type RoleProfile } from "@/services/job/RoleKnowledgeBase";
import { SkillMatcher, type SkillMatchResult } from "@/services/job/SkillMatcher";

// The single orchestrator Sprint 12's route calls: takes the raw inputs
// from the Job Description page (pasted/sample JD text, chosen company,
// chosen role, chosen interview type, optionally the candidate's parsed
// resume) and composes every other job/ service into one result object
// that both drives the on-page summary and feeds the AI Interview Brain
// (Sprint 6), Evaluation Engine (Sprint 8), and Report (Sprint 9) via the
// session store — entirely offline, no external APIs.

export interface JobAnalysisResult {
  company: CompanyProfileData | null;
  role: RoleProfile | null;
  interviewType: string;
  jobDescription: JobDescriptionAnalysis;
  skillMatch: SkillMatchResult;
  plan: InterviewPlan;
  roadmap: RoadmapStep[];
}

interface AnalyzeInput {
  jobDescriptionText: string;
  companyId: string | null;
  roleId: string | null;
  interviewType: string;
  /** Real skill names from the candidate's DB-persisted resume analysis
   * (Sprint 13), when one exists. Falls back to the role's core-skill
   * list so the flow still works end-to-end without an upload. */
  candidateSkills?: string[] | null;
  difficultyOverride?: DifficultyLevel | null;
}

export class JobAnalysisEngine {
  analyze({
    jobDescriptionText,
    companyId,
    roleId,
    interviewType,
    candidateSkills: resumeSkills,
    difficultyOverride,
  }: AnalyzeInput): JobAnalysisResult {
    const company = companyId ? CompanyKnowledgeBase.get(companyId) : null;
    const role = roleId ? RoleKnowledgeBase.get(roleId) : null;
    const jobDescription = JobDescriptionParser.parse(jobDescriptionText);

    const candidateSkills = resumeSkills?.length ? resumeSkills : (role?.coreSkills ?? []);
    const requiredSkills = jobDescription.requiredSkills.length
      ? jobDescription.requiredSkills
      : jobDescription.technologies;
    const skillMatch = SkillMatcher.match(candidateSkills, requiredSkills);

    const plan = InterviewPlanGenerator.generate({
      company,
      role,
      jobDescription,
      skillMatch,
      difficultyOverride,
    });
    const roadmap = PreparationRoadmapGenerator.generate({ company, role, skillMatch });

    const normalizedType = normalizeInterviewType(interviewType);

    return {
      company,
      role,
      interviewType: INTERVIEW_TYPE_LABELS[normalizedType],
      jobDescription,
      skillMatch,
      plan,
      roadmap,
    };
  }
}
