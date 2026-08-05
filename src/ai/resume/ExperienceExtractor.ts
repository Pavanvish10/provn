// Pulls work experience entries out of a resume's "Experience" section.
// Expects blank-line-separated blocks with a "Title, Company (Duration)"
// header line followed by "-" bullet highlights — the same convention
// most resumes already use, so no bespoke formatting is required.

export interface ExtractedExperience {
  title: string;
  company: string;
  duration: string | null;
  highlights: string[];
}

const HEADER_PATTERN = /^(.+?),\s*(.+?)\s*\(([^)]+)\)\s*$/;

export function extractExperience(experienceSectionText: string | null): ExtractedExperience[] {
  if (!experienceSectionText || !experienceSectionText.trim()) return [];

  const blocks = experienceSectionText
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.map((block) => {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const [headerLine, ...rest] = lines;
    const match = headerLine?.match(HEADER_PATTERN);

    const title = (match ? match[1] : (headerLine ?? "Unknown Role")).trim();
    const company = (match ? match[2] : "Unknown Company").trim();
    const duration = match ? match[3].trim() : null;
    const highlights = rest.map((line) => line.replace(/^[-•]\s*/, "").trim()).filter(Boolean);

    return { title, company, duration, highlights };
  });
}
