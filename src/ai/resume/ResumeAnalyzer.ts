import { parseResumeFile, loadMockResume, type ResumeFileInput } from "@/ai/resume/ResumeParser";
import { extractSkills, type ExtractedSkill } from "@/ai/resume/SkillExtractor";
import { extractProjects, type ExtractedProject } from "@/ai/resume/ProjectExtractor";
import { extractExperience, type ExtractedExperience } from "@/ai/resume/ExperienceExtractor";
import { extractEducation, type ExtractedEducation } from "@/ai/resume/EducationExtractor";
import type { ResumeAnalysis } from "@/lib/resume.server";

// Orchestrates the individual extractors into one complete picture of the
// candidate — this is the "Extract skills / projects / experience /
// education / certificates" step from Sprint 7's AI ANALYSIS
// requirements. Strengths/weaknesses/missing-skills are relative to a
// job description, so those live one level up, in CandidateKnowledgeGraph.

export interface ContactInfo {
  name: string | null;
  email: string | null;
  phone: string | null;
}

export interface ResumeProfile {
  contact: ContactInfo;
  skills: ExtractedSkill[];
  projects: ExtractedProject[];
  experience: ExtractedExperience[];
  education: ExtractedEducation[];
  certifications: string[];
  yearsOfExperience: number;
}

function extractCertifications(certificationsSectionText: string | null): string[] {
  if (!certificationsSectionText) return [];
  return certificationsSectionText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_PATTERN = /(\+?\d[\d\s().-]{7,}\d)/;

/** Name/email/phone aren't in a labeled section the way skills/experience
 * are — resumes conventionally lead with them, so this is a light
 * heuristic over the first few lines rather than a dedicated extractor
 * module: the email/phone regexes are unambiguous, and "name" is simply
 * the first short, digit-free, non-email line. */
function extractContactInfo(rawText: string): ContactInfo {
  const email = rawText.match(EMAIL_PATTERN)?.[0] ?? null;
  const phone = rawText.match(PHONE_PATTERN)?.[0]?.trim() ?? null;

  const name =
    rawText
      .split("\n")
      .map((line) => line.trim())
      .find(
        (line) =>
          line.length > 0 &&
          line.length < 60 &&
          !/\d/.test(line) &&
          !EMAIL_PATTERN.test(line) &&
          !PHONE_PATTERN.test(line),
      ) ?? null;

  return { name, email, phone };
}

/** Sums each role's (end year - start year), treating "Present" as the
 * current year. A deliberately simple heuristic — good enough to gauge
 * seniority for question-difficulty purposes, not meant to be exact. */
function estimateYearsOfExperience(experience: ExtractedExperience[]): number {
  const currentYear = new Date().getFullYear();
  let totalYears = 0;
  for (const entry of experience) {
    if (!entry.duration) continue;
    const years = entry.duration.match(/\d{4}/g);
    if (!years || years.length === 0) continue;
    const start = Number(years[0]);
    const end = /present/i.test(entry.duration) ? currentYear : Number(years[1] ?? years[0]);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) continue;
    totalYears += end - start;
  }
  return totalYears;
}

export class ResumeAnalyzer {
  analyze(input: ResumeFileInput): ResumeProfile {
    const sections = parseResumeFile(input);
    const experience = extractExperience(sections.experience);

    // Skills are read from the dedicated section first, then topped up
    // with anything the whole resume implies (e.g. a technology named
    // only inside a project bullet) without duplicating entries.
    const declaredSkills = extractSkills(sections.skills ?? "");
    const impliedSkills = extractSkills(sections.rawText);
    const declaredNames = new Set(declaredSkills.map((skill) => skill.name));
    const skills = [
      ...declaredSkills,
      ...impliedSkills.filter((skill) => !declaredNames.has(skill.name)),
    ];

    return {
      contact: extractContactInfo(sections.rawText),
      skills,
      projects: extractProjects(sections.projects),
      experience,
      education: extractEducation(sections.education),
      certifications: extractCertifications(sections.certifications),
      yearsOfExperience: estimateYearsOfExperience(experience),
    };
  }

  /** Test mode: analyzes the built-in mock resume, no upload required. */
  analyzeMock(): ResumeProfile {
    return this.analyze(loadMockResume());
  }
}

/** Sprint 13: adapts the real, Gemini-derived `ResumeAnalysis` (from
 * `resume.server.ts` — real PDF/DOCX analysis, DB-persisted) into this
 * module's `ResumeProfile` shape, so real uploads can flow through the
 * same `ResumeSummary` UI this local extractor already renders into.
 * Gemini's analysis doesn't extract contact info, so `contact` is left
 * null — `ResumeSummary` already handles that ("Name not detected"). */
export function adaptResumeAnalysis(analysis: ResumeAnalysis): ResumeProfile {
  return {
    contact: { name: null, email: null, phone: null },
    skills: [
      ...(analysis.skills ?? []).map((name) => ({ name, category: "tool" as const })),
      ...(analysis.technologies ?? []).map((name) => ({ name, category: "language" as const })),
      ...(analysis.frameworks ?? []).map((name) => ({ name, category: "framework" as const })),
      ...(analysis.soft_skills ?? []).map((name) => ({ name, category: "soft" as const })),
    ],
    projects: (analysis.projects ?? []).map((p) => ({
      name: p.name,
      description: p.description,
      technologies: [],
    })),
    experience: (analysis.experience ?? []).map((e) => ({
      title: e.title,
      company: e.company,
      duration: e.duration || null,
      highlights: e.summary ? [e.summary] : [],
    })),
    education: (analysis.education ?? []).map((e) => ({
      degree: e.degree,
      institution: e.institution,
      year: e.years || null,
    })),
    certifications: analysis.certifications ?? [],
    yearsOfExperience: 0,
  };
}
