import type { DifficultyLevel } from "@/ai/QuestionDifficulty";
import type { CompanyProfileData } from "@/ai/resume/CompanyProfile";
import type { CandidateKnowledgeGraph } from "@/ai/resume/CandidateKnowledgeGraph";
import type { ExtractedProject } from "@/ai/resume/ProjectExtractor";
import {
  buildCompanyPrincipleQuestion,
  buildPrinciplePreparationTip,
  buildProjectApiQuestion,
  buildProjectChallengeQuestion,
  buildProjectDeploymentQuestion,
  buildProjectOptimizationQuestion,
  buildProjectStateManagementQuestion,
  buildSkillGapPreparationTip,
  buildSkillGapQuestion,
} from "@/ai/PromptTemplates";

// Turns "here's what we know about the candidate" (CandidateKnowledgeGraph)
// and "here's how this company interviews" (CompanyProfile) into an
// actual, ordered pool of personalized questions — grounded in specific
// projects, gaps versus the job description, and the company's own
// leadership principles, rather than the interview type's generic bank.
//
// A project produces a 5-question "ladder" (challenge -> optimization ->
// state management -> API handling -> deployment) — exactly the
// "built a React ecommerce site -> optimization -> state management ->
// API handling -> deployment" progression from Sprint 7's brief.

export type QuestionSource = "project" | "skill-gap" | "company-principle";

export interface PersonalizedQuestion {
  text: string;
  /** Stable id (e.g. "project:chat-app:optimization") used both to avoid
   * repeats and, for project questions, to keep a ladder's rungs in
   * order — see FollowUpEngine for the equivalent generic-topic ladder. */
  topic: string;
  difficulty: DifficultyLevel;
  source: QuestionSource;
}

export interface QuestionStrategyOutput {
  focusAreas: string[];
  recommendedQuestions: PersonalizedQuestion[];
  skillGap: string[];
  preparationSuggestions: string[];
}

const MAX_PROJECTS_FOR_LADDER = 2;
const MAX_SKILL_GAP_QUESTIONS = 2;
const MAX_PRINCIPLE_QUESTIONS = 2;

export class CompanyQuestionStrategy {
  constructor(
    private readonly company: CompanyProfileData,
    private readonly graph: CandidateKnowledgeGraph,
  ) {}

  /** The full Sprint 7 OUTPUT: focus areas, a recommended-questions pool,
   * the skill gap, and preparation suggestions — useful on its own as an
   * interview-prep briefing, and as the source pickNextQuestion() draws
   * from turn by turn. */
  buildOutput(difficulty: DifficultyLevel = this.company.difficulty): QuestionStrategyOutput {
    const recommendedQuestions = [
      ...this.buildProjectLadderQuestions(difficulty),
      ...this.buildSkillGapQuestions(difficulty),
      ...this.buildCompanyPrincipleQuestions(difficulty),
    ];

    return {
      focusAreas: this.buildFocusAreas(),
      recommendedQuestions,
      skillGap: this.graph.getMissingSkills(),
      preparationSuggestions: this.buildPreparationSuggestions(),
    };
  }

  /** The single next personalized question not already covered in this
   * conversation — what Sprint 6's QuestionGenerator consults before
   * falling back to its generic topic bank. */
  pickNextQuestion(
    coveredTopics: string[],
    difficulty: DifficultyLevel,
  ): PersonalizedQuestion | null {
    const pool = this.buildOutput(difficulty).recommendedQuestions;
    return pool.find((question) => !coveredTopics.includes(question.topic)) ?? null;
  }

  private buildFocusAreas(): string[] {
    const resumeSkills = this.graph
      .getResumeProfile()
      .skills.map((skill) => skill.name.toLowerCase());
    const overlap = this.company.preferredTopics.filter((topic) =>
      resumeSkills.some(
        (skill) => topic.toLowerCase().includes(skill) || skill.includes(topic.toLowerCase()),
      ),
    );
    const areas = new Set<string>([...overlap, ...this.company.preferredTopics.slice(0, 2)]);
    if (this.graph.getMissingSkills().length > 0) areas.add("closing the skill gap");
    return Array.from(areas);
  }

  private buildProjectLadderQuestions(difficulty: DifficultyLevel): PersonalizedQuestion[] {
    return this.graph
      .getTopProjects(MAX_PROJECTS_FOR_LADDER)
      .flatMap((project) => this.buildLadderForProject(project, difficulty));
  }

  private buildLadderForProject(
    project: ExtractedProject,
    difficulty: DifficultyLevel,
  ): PersonalizedQuestion[] {
    const usesReact = project.technologies.some((tech) => tech.toLowerCase() === "react");
    const slug = project.name.toLowerCase().replace(/\s+/g, "-");
    const rung = (suffix: string, text: string): PersonalizedQuestion => ({
      text,
      topic: `project:${slug}:${suffix}`,
      difficulty,
      source: "project",
    });

    return [
      rung("challenge", buildProjectChallengeQuestion(project.name)),
      rung("optimization", buildProjectOptimizationQuestion(project.name, usesReact)),
      rung("state", buildProjectStateManagementQuestion(project.name, usesReact)),
      rung("api", buildProjectApiQuestion(project.name)),
      rung("deployment", buildProjectDeploymentQuestion(project.name)),
    ];
  }

  private buildSkillGapQuestions(difficulty: DifficultyLevel): PersonalizedQuestion[] {
    return this.graph
      .getMissingSkills()
      .slice(0, MAX_SKILL_GAP_QUESTIONS)
      .map((skill) => ({
        text: buildSkillGapQuestion(skill),
        topic: `skill-gap:${skill.toLowerCase()}`,
        difficulty,
        source: "skill-gap" as const,
      }));
  }

  private buildCompanyPrincipleQuestions(difficulty: DifficultyLevel): PersonalizedQuestion[] {
    return this.company.leadershipPrinciples.slice(0, MAX_PRINCIPLE_QUESTIONS).map((principle) => ({
      text: buildCompanyPrincipleQuestion(principle, this.company.name),
      topic: `principle:${principle.toLowerCase().replace(/\s+/g, "-")}`,
      difficulty,
      source: "company-principle" as const,
    }));
  }

  private buildPreparationSuggestions(): string[] {
    const skillTips = this.graph
      .getMissingSkills()
      .map((skill) => buildSkillGapPreparationTip(skill));
    const principleTips = this.company.leadershipPrinciples
      .slice(0, MAX_PRINCIPLE_QUESTIONS)
      .map((principle) => buildPrinciplePreparationTip(principle, this.company.name));
    return [...skillTips, ...principleTips];
  }
}
