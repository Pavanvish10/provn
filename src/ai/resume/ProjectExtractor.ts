import { extractSkills } from "@/ai/resume/SkillExtractor";

// Pulls individual project entries out of a resume's "Projects" section.
// Expects blank-line-separated blocks where the first line is roughly
// "Project Name (Tech, Tech, Tech)" — a very common resume convention —
// but degrades gracefully (falls back to auto-detecting technologies
// from the description) when a project omits the parenthetical.

export interface ExtractedProject {
  name: string;
  description: string;
  technologies: string[];
}

const TITLE_LINE_PATTERN = /^(.+?)\s*\(([^)]+)\)\s*$/;

export function extractProjects(projectsSectionText: string | null): ExtractedProject[] {
  if (!projectsSectionText || !projectsSectionText.trim()) return [];

  const blocks = projectsSectionText
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.map((block) => {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const [firstLine, ...rest] = lines;
    const titleMatch = firstLine?.match(TITLE_LINE_PATTERN);

    const name = (titleMatch ? titleMatch[1] : (firstLine ?? "Untitled Project")).trim();
    const declaredTech = titleMatch
      ? titleMatch[2]
          .split(",")
          .map((tech) => tech.trim())
          .filter(Boolean)
      : [];
    const description = rest.join(" ");

    const detectedTech = extractSkills(`${declaredTech.join(" ")} ${description}`).map(
      (skill) => skill.name,
    );
    const technologies = Array.from(new Set([...declaredTech, ...detectedTech]));

    return { name, description, technologies };
  });
}
