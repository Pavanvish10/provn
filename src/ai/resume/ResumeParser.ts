// Splits raw resume text into its standard sections (summary, skills,
// experience, projects, education, certifications) by recognizing common
// header lines. This sprint explicitly excludes OCR and file-upload
// plumbing — PDF/DOCX/TXT are accepted as *formats* (validated here) but
// the caller is expected to supply already-extracted plain text (or use
// loadMockResume() below for testing), the same boundary the rest of the
// resume engine assumes.

export type ResumeFileFormat = "pdf" | "docx" | "txt";
export const SUPPORTED_RESUME_FORMATS: ResumeFileFormat[] = ["pdf", "docx", "txt"];

export interface ResumeFileInput {
  filename: string;
  format: ResumeFileFormat;
  textContent: string;
}

export interface ParsedResumeSections {
  rawText: string;
  summary: string | null;
  skills: string | null;
  experience: string | null;
  projects: string | null;
  education: string | null;
  certifications: string | null;
}

type SectionKey = Exclude<keyof ParsedResumeSections, "rawText">;

const SECTION_HEADERS: Record<SectionKey, RegExp> = {
  summary: /^(summary|professional summary|objective|profile)\s*:?$/i,
  skills: /^(skills|technical skills|core skills)\s*:?$/i,
  experience: /^(experience|work experience|professional experience|employment history)\s*:?$/i,
  projects: /^(projects|personal projects|key projects)\s*:?$/i,
  education: /^(education|academic background)\s*:?$/i,
  certifications: /^(certifications|certificates|licenses)\s*:?$/i,
};

function sectionizeText(text: string): ParsedResumeSections {
  const lines = text.split("\n");
  const sections: Record<SectionKey, string[]> = {
    summary: [],
    skills: [],
    experience: [],
    projects: [],
    education: [],
    certifications: [],
  };
  let current: SectionKey | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const matchedKey = (Object.keys(SECTION_HEADERS) as SectionKey[]).find((key) =>
      SECTION_HEADERS[key].test(trimmed),
    );
    if (matchedKey) {
      current = matchedKey;
      continue;
    }
    if (current) sections[current].push(line);
  }

  const join = (key: SectionKey): string | null => {
    const joined = sections[key].join("\n").trim();
    return joined.length > 0 ? joined : null;
  };

  return {
    rawText: text,
    summary: join("summary"),
    skills: join("skills"),
    experience: join("experience"),
    projects: join("projects"),
    education: join("education"),
    certifications: join("certifications"),
  };
}

export function parseResumeFile(input: ResumeFileInput): ParsedResumeSections {
  if (!SUPPORTED_RESUME_FORMATS.includes(input.format)) {
    throw new Error(`Unsupported resume format: ${input.format}`);
  }
  return sectionizeText(input.textContent);
}

// ---------------------------------------------------------------------
// Test-mode mock resume — exercises every extractor without needing a
// real upload or any parsing beyond what parseResumeFile already does.
// ---------------------------------------------------------------------

export const MOCK_RESUME_TEXT = `PRIYA SHARMA
Frontend Engineer
priya.sharma@email.com | +1 (555) 123-4567

SUMMARY
Frontend engineer with 4 years of experience building performant, accessible web applications with React and TypeScript. Passionate about developer tooling and mentoring junior engineers.

SKILLS
JavaScript, TypeScript, React, Redux, Next.js, Node.js, GraphQL, Tailwind CSS, PostgreSQL, Docker, AWS, Git, Communication, Mentorship

EXPERIENCE
Frontend Engineer, Acme Corp (Jun 2022 - Present)
- Led the redesign of the checkout flow, reducing cart abandonment by 18%.
- Mentored two junior engineers and ran weekly code reviews.
- Migrated the legacy REST integration layer to GraphQL, cutting over-fetching by half.

Software Engineer, Beta Labs (Jul 2020 - May 2022)
- Built internal tooling that cut deployment time from 40 minutes to 6 minutes.
- Migrated a legacy jQuery codebase to React over two quarters.

PROJECTS
E-Commerce Platform (React, Redux, Node.js, MongoDB)
Built a full-featured e-commerce platform with product search, cart, and checkout. Implemented server-side rendering for SEO and optimized bundle size to cut initial load time by 35%.

Real-Time Chat App (React, Socket.io, Express, PostgreSQL)
Developed a real-time messaging app supporting group chats and file sharing, containerized with Docker and deployed on AWS.

EDUCATION
B.Tech in Computer Science, Indian Institute of Technology (2016 - 2020)

CERTIFICATIONS
AWS Certified Developer - Associate
Meta Front-End Developer Professional Certificate`;

export function loadMockResume(): ResumeFileInput {
  return { filename: "sample-resume.txt", format: "txt", textContent: MOCK_RESUME_TEXT };
}
