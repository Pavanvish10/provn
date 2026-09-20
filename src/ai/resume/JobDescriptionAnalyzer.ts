import { KeywordMatcher, type KeywordDefinition } from "@/ai/resume/KeywordMatcher";
import { SKILL_VOCABULARY } from "@/ai/resume/SkillExtractor";

// Splits a job description into the sections Sprint 7 calls for
// (responsibilities, required/preferred skills, experience, education,
// technologies). Required/preferred skills are matched against the same
// SKILL_VOCABULARY SkillExtractor uses on resumes, so the two sides speak
// the same vocabulary — that's what makes CandidateKnowledgeGraph's
// resume-vs-JD skill gap comparison meaningful.

export interface JobDescriptionAnalysis {
  responsibilities: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  experienceRequirement: string | null;
  educationRequirement: string | null;
  technologies: string[];
  softSkills: string[];
  keywords: string[];
}

// Sprint 12: a small, independent vocabulary of soft skills — kept
// separate from SKILL_VOCABULARY (which is technical/tooling-focused)
// since a JD's "soft skills" bucket is conceptually distinct from its
// required/preferred technical skills, even though both are matched the
// same keyword-scan way.
const SOFT_SKILL_VOCABULARY: KeywordDefinition[] = [
  { term: "Communication" },
  { term: "Leadership" },
  { term: "Teamwork", aliases: ["team player"] },
  { term: "Collaboration" },
  { term: "Problem Solving" },
  { term: "Adaptability" },
  { term: "Time Management" },
  { term: "Critical Thinking" },
  { term: "Ownership" },
  { term: "Mentorship", aliases: ["mentoring"] },
  { term: "Conflict Resolution" },
  { term: "Stakeholder Management" },
  { term: "Empathy" },
  { term: "Creativity" },
  { term: "Attention to Detail" },
  { term: "Self-Motivated" },
  { term: "Analytical Thinking" },
];

const KEYWORD_STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "have",
  "will",
  "your",
  "you",
  "are",
  "our",
  "role",
  "team",
  "work",
  "working",
  "years",
  "experience",
  "strong",
  "ability",
  "skills",
  "across",
  "including",
  "such",
  "who",
  "what",
  "into",
  "also",
  "who's",
  "etc",
  "using",
  "use",
  "able",
  "join",
  "looking",
  "required",
  "preferred",
  "plus",
  "about",
  "them",
  "they",
  "their",
  "been",
  "being",
  "can",
]);

function extractKeywords(text: string): string[] {
  const counts = new Map<string, number>();
  const words = text.toLowerCase().match(/[a-z][a-z+.#-]{2,}/g) ?? [];
  for (const word of words) {
    if (KEYWORD_STOPWORDS.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([word]) => word);
}

type JDSectionKey =
  | "responsibilities"
  | "requiredSkills"
  | "preferredSkills"
  | "experience"
  | "education"
  | "technologies";

const SECTION_HEADERS: Record<JDSectionKey, RegExp> = {
  responsibilities: /^(responsibilities|what you('| wi)ll do|role overview)\s*:?$/i,
  requiredSkills: /^(required skills|requirements|must[- ]haves?|minimum qualifications)\s*:?$/i,
  preferredSkills:
    /^(preferred skills|nice to haves?|preferred qualifications|bonus points)\s*:?$/i,
  experience: /^experience\s*:?$/i,
  education: /^education\s*:?$/i,
  technologies: /^(technologies|tech stack)\s*:?$/i,
};

function bulletLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

export class JobDescriptionAnalyzer {
  analyze(jdText: string): JobDescriptionAnalysis {
    const sections: Record<JDSectionKey, string[]> = {
      responsibilities: [],
      requiredSkills: [],
      preferredSkills: [],
      experience: [],
      education: [],
      technologies: [],
    };
    let current: JDSectionKey | null = null;

    for (const line of jdText.split("\n")) {
      const trimmed = line.trim();
      const matchedKey = (Object.keys(SECTION_HEADERS) as JDSectionKey[]).find((key) =>
        SECTION_HEADERS[key].test(trimmed),
      );
      if (matchedKey) {
        current = matchedKey;
        continue;
      }
      if (current) sections[current].push(line);
    }

    const responsibilities = bulletLines(sections.responsibilities.join("\n"));
    const requiredSkillsText = bulletLines(sections.requiredSkills.join("\n")).join(" ");
    const preferredSkillsText = bulletLines(sections.preferredSkills.join("\n")).join(" ");

    return {
      responsibilities,
      requiredSkills: KeywordMatcher.findMatches(requiredSkillsText, SKILL_VOCABULARY).map(
        (match) => match.term,
      ),
      preferredSkills: KeywordMatcher.findMatches(preferredSkillsText, SKILL_VOCABULARY).map(
        (match) => match.term,
      ),
      experienceRequirement: sections.experience.join(" ").trim() || null,
      educationRequirement: sections.education.join(" ").trim() || null,
      technologies: KeywordMatcher.findMatches(jdText, SKILL_VOCABULARY).map((match) => match.term),
      softSkills: KeywordMatcher.findMatches(jdText, SOFT_SKILL_VOCABULARY).map(
        (match) => match.term,
      ),
      keywords: extractKeywords(jdText),
    };
  }

  /** Test mode: analyzes the built-in mock job description. */
  analyzeMock(): JobDescriptionAnalysis {
    return this.analyze(MOCK_JOB_DESCRIPTION_TEXT);
  }
}

export const MOCK_JOB_DESCRIPTION_TEXT = `Frontend Engineer — TechNova Inc.

RESPONSIBILITIES
- Build and maintain customer-facing features using React and TypeScript.
- Collaborate with designers and backend engineers to ship end-to-end features.
- Improve application performance and monitor production health.
- Mentor junior engineers and participate in code reviews.

REQUIRED SKILLS
- 3+ years of experience with React and modern JavaScript.
- Strong TypeScript skills and experience with Redux or similar state management.
- Experience with GraphQL or REST APIs.
- Experience with Kubernetes and CI/CD pipelines.

PREFERRED SKILLS
- Experience with Next.js and server-side rendering.
- Familiarity with AWS or another cloud provider.
- Experience with PostgreSQL.

EXPERIENCE
3-5 years of professional frontend development experience.

EDUCATION
Bachelor's degree in Computer Science or equivalent practical experience.

TECHNOLOGIES
React, TypeScript, Redux, GraphQL, Kubernetes, CI/CD, Next.js, AWS, PostgreSQL`;
