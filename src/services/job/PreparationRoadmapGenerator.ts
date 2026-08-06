import { buildPrinciplePreparationTip, buildSkillGapPreparationTip } from "@/ai/PromptTemplates";
import type { CompanyProfileData } from "@/ai/resume/CompanyProfile";
import type { RoleProfile } from "@/services/job/RoleKnowledgeBase";
import type { SkillMatchResult } from "@/services/job/SkillMatcher";

// Builds the step-by-step prep checklist shown on the Job Description
// page — reuses Sprint 6's PromptTemplates tip builders instead of
// hand-writing new copy, so the wording stays consistent with the
// candidate-facing tips the interview brain already produces elsewhere.

export interface RoadmapStep {
  order: number;
  title: string;
  detail: string;
}

interface GenerateRoadmapInput {
  company: CompanyProfileData | null;
  role: RoleProfile | null;
  skillMatch: SkillMatchResult;
}

const MAX_SKILL_STEPS = 4;
const MAX_PRINCIPLE_STEPS = 2;

export class PreparationRoadmapGenerator {
  static generate({ company, role, skillMatch }: GenerateRoadmapInput): RoadmapStep[] {
    const steps: RoadmapStep[] = [];

    for (const skill of skillMatch.missing.slice(0, MAX_SKILL_STEPS)) {
      steps.push({
        order: steps.length + 1,
        title: `Close the ${skill} gap`,
        detail: buildSkillGapPreparationTip(skill),
      });
    }

    if (company) {
      for (const principle of company.leadershipPrinciples.slice(0, MAX_PRINCIPLE_STEPS)) {
        steps.push({
          order: steps.length + 1,
          title: `Prepare a ${company.name} story`,
          detail: buildPrinciplePreparationTip(principle, company.name),
        });
      }
    }

    if (role?.includesSystemDesign) {
      steps.push({
        order: steps.length + 1,
        title: "Review system design fundamentals",
        detail:
          "Practice sketching a scalable architecture out loud — requirements, data model, bottlenecks, trade-offs.",
      });
    }

    steps.push({
      order: steps.length + 1,
      title: "Review the fundamentals",
      detail:
        "Do a final pass over core concepts for this role so you can answer confidently under time pressure.",
    });

    return steps;
  }
}
