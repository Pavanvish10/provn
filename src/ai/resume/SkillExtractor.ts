import { KeywordMatcher, type KeywordDefinition } from "@/ai/resume/KeywordMatcher";

// Finds technical and soft skills mentioned anywhere in a block of resume
// (or job description) text. The vocabulary here is also reused by
// JobDescriptionAnalyzer so "skill" means the same thing on both sides of
// the match — required for KeywordMatcher.diff() to produce a meaningful
// skill gap in CandidateKnowledgeGraph.

export type SkillCategory = "language" | "framework" | "database" | "cloud" | "tool" | "soft";

export interface ExtractedSkill {
  name: string;
  category: SkillCategory;
}

interface SkillVocabEntry extends KeywordDefinition {
  category: SkillCategory;
}

export const SKILL_VOCABULARY: SkillVocabEntry[] = [
  // Languages
  { term: "JavaScript", aliases: ["JS"], category: "language" },
  { term: "TypeScript", aliases: ["TS"], category: "language" },
  { term: "Python", category: "language" },
  { term: "Java", category: "language" },
  { term: "Go", aliases: ["Golang"], category: "language" },
  { term: "C++", category: "language" },
  { term: "SQL", category: "language" },
  // Frameworks / libraries
  { term: "React", aliases: ["ReactJS"], category: "framework" },
  { term: "Next.js", aliases: ["NextJS"], category: "framework" },
  { term: "Redux", category: "framework" },
  { term: "Node.js", aliases: ["NodeJS", "Node"], category: "framework" },
  { term: "Express", aliases: ["Express.js"], category: "framework" },
  { term: "GraphQL", category: "framework" },
  { term: "REST", aliases: ["REST API", "RESTful"], category: "framework" },
  { term: "Django", category: "framework" },
  { term: "Spring Boot", aliases: ["Spring"], category: "framework" },
  { term: "Tailwind CSS", aliases: ["TailwindCSS", "Tailwind"], category: "framework" },
  // Databases
  { term: "PostgreSQL", aliases: ["Postgres"], category: "database" },
  { term: "MongoDB", category: "database" },
  { term: "MySQL", category: "database" },
  { term: "Redis", category: "database" },
  // Cloud / infra
  { term: "AWS", aliases: ["Amazon Web Services"], category: "cloud" },
  { term: "Azure", category: "cloud" },
  { term: "Google Cloud", aliases: ["GCP"], category: "cloud" },
  { term: "Docker", category: "cloud" },
  { term: "Kubernetes", aliases: ["K8s"], category: "cloud" },
  { term: "CI/CD", aliases: ["CI-CD", "continuous integration"], category: "cloud" },
  // Tools
  { term: "Git", category: "tool" },
  { term: "Figma", category: "tool" },
  { term: "Jira", category: "tool" },
  { term: "Webpack", category: "tool" },
  // Soft skills
  { term: "Leadership", category: "soft" },
  { term: "Communication", category: "soft" },
  { term: "Mentorship", aliases: ["mentoring"], category: "soft" },
  { term: "Collaboration", category: "soft" },
  { term: "Problem Solving", aliases: ["problem-solving"], category: "soft" },
];

export function extractSkills(text: string): ExtractedSkill[] {
  if (!text.trim()) return [];
  const matches = KeywordMatcher.findMatches(text, SKILL_VOCABULARY);
  const byTerm = new Map(SKILL_VOCABULARY.map((entry) => [entry.term, entry.category]));
  return matches.map((match) => ({ name: match.term, category: byTerm.get(match.term) ?? "tool" }));
}
