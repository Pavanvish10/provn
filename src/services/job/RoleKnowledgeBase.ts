// Static knowledge about each supported role's interview shape — what
// technical/behavioral ground it typically covers and whether system
// design belongs in the mix. Keyed by the same plain role label the
// Sprint 2 setup wizard already uses (see RoleSelector.tsx), so no
// separate ID system needs to be threaded through the app.

export type RoleId =
  | "Frontend Developer"
  | "Backend Developer"
  | "Full Stack Developer"
  | "Software Engineer"
  | "SDE-1"
  | "SDE-2"
  | "AI Engineer"
  | "ML Engineer"
  | "Data Scientist"
  | "DevOps Engineer"
  | "Cloud Engineer"
  | "QA Engineer"
  | "Product Manager"
  | "UI UX Designer";

export interface RoleProfile {
  id: RoleId;
  label: string;
  category: "engineering" | "data-ai" | "infrastructure" | "quality" | "product" | "design";
  technicalTopics: string[];
  behavioralTopics: string[];
  includesSystemDesign: boolean;
  coreSkills: string[];
}

const ROLE_PROFILES: Record<RoleId, RoleProfile> = {
  "Frontend Developer": {
    id: "Frontend Developer",
    label: "Frontend Developer",
    category: "engineering",
    technicalTopics: [
      "React/Vue component architecture",
      "State management",
      "Browser performance & rendering",
      "Accessibility",
      "CSS/layout systems",
    ],
    behavioralTopics: ["Cross-functional collaboration", "Handling design/spec ambiguity"],
    includesSystemDesign: false,
    coreSkills: ["JavaScript", "TypeScript", "React", "CSS", "HTML"],
  },
  "Backend Developer": {
    id: "Backend Developer",
    label: "Backend Developer",
    category: "engineering",
    technicalTopics: [
      "API design",
      "Database schema design",
      "Concurrency & caching",
      "Service reliability",
      "Data structures & algorithms",
    ],
    behavioralTopics: ["Incident response", "Trade-off communication"],
    includesSystemDesign: true,
    coreSkills: ["Node.js", "SQL", "REST APIs", "System Design"],
  },
  "Full Stack Developer": {
    id: "Full Stack Developer",
    label: "Full Stack Developer",
    category: "engineering",
    technicalTopics: [
      "End-to-end feature delivery",
      "API design",
      "Frontend/backend integration",
      "Database fundamentals",
    ],
    behavioralTopics: ["Prioritization across the stack", "Ownership of a full feature"],
    includesSystemDesign: true,
    coreSkills: ["JavaScript", "React", "Node.js", "SQL"],
  },
  "Software Engineer": {
    id: "Software Engineer",
    label: "Software Engineer",
    category: "engineering",
    technicalTopics: [
      "Data structures & algorithms",
      "Coding fundamentals",
      "Debugging & testing",
      "System design fundamentals",
    ],
    behavioralTopics: ["Teamwork", "Learning agility"],
    includesSystemDesign: true,
    coreSkills: ["Data Structures", "Algorithms", "Git", "Testing"],
  },
  "SDE-1": {
    id: "SDE-1",
    label: "SDE-1",
    category: "engineering",
    technicalTopics: [
      "Data structures & algorithms",
      "Coding fundamentals",
      "Code quality & testing",
      "Debugging",
    ],
    behavioralTopics: ["Receiving feedback", "Working within a team"],
    includesSystemDesign: false,
    coreSkills: ["Data Structures", "Algorithms", "Git"],
  },
  "SDE-2": {
    id: "SDE-2",
    label: "SDE-2",
    category: "engineering",
    technicalTopics: [
      "System design fundamentals",
      "Data structures & algorithms",
      "Ownership of a service/component",
      "Performance optimization",
    ],
    behavioralTopics: ["Mentoring juniors", "Driving a project end to end"],
    includesSystemDesign: true,
    coreSkills: ["System Design", "Data Structures", "Algorithms", "Performance Tuning"],
  },
  "AI Engineer": {
    id: "AI Engineer",
    label: "AI Engineer",
    category: "data-ai",
    technicalTopics: [
      "LLM application design",
      "Prompt & context engineering",
      "Model evaluation",
      "AI system integration",
    ],
    behavioralTopics: ["Communicating AI limitations", "Cross-team collaboration with product"],
    includesSystemDesign: true,
    coreSkills: ["Python", "LLMs", "Prompt Engineering", "Vector Databases"],
  },
  "ML Engineer": {
    id: "ML Engineer",
    label: "ML Engineer",
    category: "data-ai",
    technicalTopics: [
      "Model training & evaluation",
      "Feature engineering",
      "ML pipeline design",
      "Model deployment & monitoring",
    ],
    behavioralTopics: ["Communicating model trade-offs", "Working with data scientists"],
    includesSystemDesign: true,
    coreSkills: ["Python", "Machine Learning", "TensorFlow", "MLOps"],
  },
  "Data Scientist": {
    id: "Data Scientist",
    label: "Data Scientist",
    category: "data-ai",
    technicalTopics: [
      "Statistical analysis",
      "Experiment design (A/B testing)",
      "Data wrangling & SQL",
      "Model interpretation",
    ],
    behavioralTopics: ["Translating data into business insight", "Stakeholder communication"],
    includesSystemDesign: false,
    coreSkills: ["Python", "SQL", "Statistics", "Machine Learning"],
  },
  "DevOps Engineer": {
    id: "DevOps Engineer",
    label: "DevOps Engineer",
    category: "infrastructure",
    technicalTopics: [
      "CI/CD pipeline design",
      "Infrastructure as code",
      "Monitoring & observability",
      "Incident response",
    ],
    behavioralTopics: ["On-call ownership", "Cross-team reliability culture"],
    includesSystemDesign: true,
    coreSkills: ["CI/CD", "Docker", "Kubernetes", "Terraform"],
  },
  "Cloud Engineer": {
    id: "Cloud Engineer",
    label: "Cloud Engineer",
    category: "infrastructure",
    technicalTopics: [
      "Cloud architecture design",
      "Networking & security fundamentals",
      "Cost optimization",
      "Infrastructure automation",
    ],
    behavioralTopics: ["Balancing cost vs. reliability", "Working with security teams"],
    includesSystemDesign: true,
    coreSkills: ["AWS", "Cloud Architecture", "Networking", "Terraform"],
  },
  "QA Engineer": {
    id: "QA Engineer",
    label: "QA Engineer",
    category: "quality",
    technicalTopics: [
      "Test strategy & planning",
      "Automation frameworks",
      "Bug triage & reporting",
      "Regression & performance testing",
    ],
    behavioralTopics: ["Advocating for quality under deadline pressure", "Working with developers"],
    includesSystemDesign: false,
    coreSkills: ["Testing", "Test Automation", "CI/CD"],
  },
  "Product Manager": {
    id: "Product Manager",
    label: "Product Manager",
    category: "product",
    technicalTopics: [
      "Product sense & prioritization",
      "Metrics & experimentation",
      "Roadmap planning",
      "Technical feasibility discussions",
    ],
    behavioralTopics: ["Stakeholder alignment", "Handling conflicting priorities"],
    includesSystemDesign: false,
    coreSkills: ["Product Strategy", "Roadmapping", "Analytics"],
  },
  "UI UX Designer": {
    id: "UI UX Designer",
    label: "UI UX Designer",
    category: "design",
    technicalTopics: [
      "Design systems",
      "User research methods",
      "Prototyping & usability testing",
      "Accessibility in design",
    ],
    behavioralTopics: ["Defending design decisions", "Collaborating with engineering"],
    includesSystemDesign: false,
    coreSkills: ["Figma", "User Research", "Prototyping", "Accessibility"],
  },
};

const ALIASES: Record<string, RoleId> = {
  sde1: "SDE-1",
  "sde 1": "SDE-1",
  sde2: "SDE-2",
  "sde 2": "SDE-2",
  "ui/ux designer": "UI UX Designer",
  "ux designer": "UI UX Designer",
  "ui designer": "UI UX Designer",
};

export class RoleKnowledgeBase {
  static list(): RoleProfile[] {
    return Object.values(ROLE_PROFILES);
  }

  static get(idOrLabel: string): RoleProfile | null {
    const key = idOrLabel.trim();
    if (key in ROLE_PROFILES) return ROLE_PROFILES[key as RoleId];
    const aliasKey = key.toLowerCase();
    if (aliasKey in ALIASES) return ROLE_PROFILES[ALIASES[aliasKey]];
    return null;
  }
}
