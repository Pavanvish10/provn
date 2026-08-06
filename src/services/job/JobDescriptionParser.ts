import {
  JobDescriptionAnalyzer,
  type JobDescriptionAnalysis,
} from "@/ai/resume/JobDescriptionAnalyzer";

// Sprint 12's job-analysis-facing entry point onto Sprint 7's
// JobDescriptionAnalyzer — mirrors CompanyKnowledgeBase's role of
// keeping `src/services/job` decoupled from the resume-analysis
// internals it happens to reuse. Also owns the sample-JD library shown
// on the Job Description page for users who'd rather pick one than
// paste their own.

export interface SampleJobDescription {
  id: string;
  label: string;
  role: string;
  text: string;
}

export const SAMPLE_JOB_DESCRIPTIONS: SampleJobDescription[] = [
  {
    id: "frontend-developer",
    label: "Frontend Developer",
    role: "Frontend Developer",
    text: `Frontend Developer — Consumer Web Platform

RESPONSIBILITIES
- Build and maintain customer-facing features using React and TypeScript.
- Collaborate with designers and backend engineers to ship end-to-end features.
- Improve application performance and monitor production health.
- Champion accessibility and responsive design across the product.

REQUIRED SKILLS
- 3+ years of experience with React and modern JavaScript.
- Strong TypeScript skills and experience with state management.
- Experience with REST or GraphQL APIs.
- Solid understanding of CSS and responsive layout systems.

PREFERRED SKILLS
- Experience with Next.js and server-side rendering.
- Familiarity with design systems and component libraries.
- Experience with automated testing (Jest, Playwright).

EXPERIENCE
3-5 years of professional frontend development experience.

EDUCATION
Bachelor's degree in Computer Science or equivalent practical experience.

We're looking for someone with strong communication skills, a collaborative mindset, and
attention to detail who can take ownership of features from design to production.

TECHNOLOGIES
React, TypeScript, CSS, GraphQL, Next.js, Jest`,
  },
  {
    id: "backend-developer",
    label: "Backend Developer",
    role: "Backend Developer",
    text: `Backend Developer — Platform Engineering

RESPONSIBILITIES
- Design and build scalable REST APIs and services.
- Own database schema design and query performance.
- Participate in on-call rotation and incident response.
- Mentor junior engineers through code review.

REQUIRED SKILLS
- 3+ years building backend services in Node.js or a similar stack.
- Strong SQL and database design skills.
- Experience with system design and distributed systems fundamentals.
- Experience with Docker and CI/CD pipelines.

PREFERRED SKILLS
- Experience with Kubernetes.
- Familiarity with AWS or another cloud provider.
- Experience with message queues (Kafka, RabbitMQ).

EXPERIENCE
3-6 years of professional backend development experience.

EDUCATION
Bachelor's degree in Computer Science or equivalent practical experience.

Strong ownership mindset, clear communication, and comfort working through ambiguity are
essential — you'll be expected to drive projects with minimal supervision.

TECHNOLOGIES
Node.js, SQL, Docker, Kubernetes, AWS, Kafka`,
  },
  {
    id: "ai-engineer",
    label: "AI Engineer",
    role: "AI Engineer",
    text: `AI Engineer — Applied AI Team

RESPONSIBILITIES
- Design and ship LLM-powered features across the product.
- Build evaluation pipelines to measure model quality and regressions.
- Own prompt and context engineering for production AI features.
- Collaborate closely with product and data teams.

REQUIRED SKILLS
- 2+ years of experience building with LLMs or applied machine learning.
- Strong Python skills.
- Experience with vector databases and retrieval-augmented generation.
- Experience with API design and system integration.

PREFERRED SKILLS
- Experience with fine-tuning or model evaluation frameworks.
- Familiarity with Kubernetes and cloud deployment.

EXPERIENCE
2-4 years of experience in AI/ML engineering.

EDUCATION
Bachelor's or Master's degree in Computer Science, AI, or a related field.

We value creativity, analytical thinking, and the ability to communicate model limitations
clearly to non-technical stakeholders.

TECHNOLOGIES
Python, LLMs, Vector Databases, Kubernetes, AWS`,
  },
  {
    id: "product-manager",
    label: "Product Manager",
    role: "Product Manager",
    text: `Product Manager — Growth

RESPONSIBILITIES
- Own the roadmap for a core product area end to end.
- Define and track success metrics for every feature launch.
- Run experiments and translate data into product decisions.
- Align engineering, design, and business stakeholders around priorities.

REQUIRED SKILLS
- 3+ years of product management experience.
- Strong analytical skills and comfort with SQL/data tools.
- Experience running A/B tests and interpreting results.
- Excellent written and verbal communication.

PREFERRED SKILLS
- Experience in a growth or consumer product role.
- Technical background or ability to discuss feasibility with engineers.

EXPERIENCE
3-5 years of product management experience.

EDUCATION
Bachelor's degree in any field; MBA is a plus but not required.

Strong stakeholder management, leadership, and prioritization skills are critical — you'll
be balancing competing priorities across multiple teams every week.

TECHNOLOGIES
SQL, Analytics, Roadmapping tools`,
  },
  {
    id: "devops-engineer",
    label: "DevOps Engineer",
    role: "DevOps Engineer",
    text: `DevOps Engineer — Infrastructure Team

RESPONSIBILITIES
- Build and maintain CI/CD pipelines for all engineering teams.
- Manage infrastructure as code across cloud environments.
- Own monitoring, alerting, and observability tooling.
- Lead incident response and post-mortems.

REQUIRED SKILLS
- 3+ years of experience in DevOps or SRE roles.
- Strong experience with Docker and Kubernetes.
- Experience with infrastructure as code (Terraform).
- Solid understanding of networking and cloud security fundamentals.

PREFERRED SKILLS
- Experience with AWS at scale.
- Familiarity with cost optimization practices.

EXPERIENCE
3-6 years of experience in infrastructure/DevOps roles.

EDUCATION
Bachelor's degree in Computer Science or equivalent practical experience.

On-call ownership, calm incident response, and clear cross-team communication are core to
this role.

TECHNOLOGIES
Docker, Kubernetes, Terraform, AWS, CI/CD`,
  },
];

export class JobDescriptionParser {
  static parse(jdText: string): JobDescriptionAnalysis {
    return new JobDescriptionAnalyzer().analyze(jdText);
  }

  static getSamples(): SampleJobDescription[] {
    return SAMPLE_JOB_DESCRIPTIONS;
  }

  static getSample(id: string): SampleJobDescription | null {
    return SAMPLE_JOB_DESCRIPTIONS.find((sample) => sample.id === id) ?? null;
  }
}
