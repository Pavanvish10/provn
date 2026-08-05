// Pulls education entries out of a resume's "Education" section. Expects
// one entry per line in "Degree, Institution (Year)" form.

export interface ExtractedEducation {
  degree: string;
  institution: string;
  year: string | null;
}

const HEADER_PATTERN = /^(.+?),\s*(.+?)\s*\(([^)]+)\)\s*$/;

export function extractEducation(educationSectionText: string | null): ExtractedEducation[] {
  if (!educationSectionText || !educationSectionText.trim()) return [];

  const lines = educationSectionText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line) => {
    const match = line.match(HEADER_PATTERN);
    const degree = (match ? match[1] : line).trim();
    const institution = match ? match[2].trim() : "Unknown Institution";
    const year = match ? match[3].trim() : null;
    return { degree, institution, year };
  });
}
