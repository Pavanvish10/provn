// Mock semantic matching engine for the Business/ATS feature.
// Structured so a real embedding/LLM model can replace `expandSkill` and
// `scoreCandidate` later without changing the UI.

import type { Candidate } from "./mock-data";

// Synonym / related-term graph. Bidirectional edges are expanded at runtime.
const SYNONYMS: Record<string, string[]> = {
  react: ["nextjs", "react native", "frontend", "javascript", "typescript", "tailwind"],
  nextjs: ["react", "frontend", "typescript", "ssr"],
  frontend: ["react", "vue", "javascript", "typescript", "css", "tailwind", "accessibility"],
  vue: ["frontend", "javascript", "typescript"],
  javascript: ["typescript", "frontend", "nodejs"],
  typescript: ["javascript", "react", "nodejs", "frontend"],
  tailwind: ["css", "frontend", "design systems"],
  css: ["tailwind", "frontend", "accessibility"],

  backend: ["nodejs", "go", "java", "spring", "postgres", "system design", "graphql", "kafka", "redis"],
  "server-side": ["backend", "nodejs", "go", "java"],
  "server side": ["backend"],
  nodejs: ["javascript", "typescript", "backend", "graphql"],
  "node.js": ["nodejs"],
  node: ["nodejs"],
  go: ["golang", "backend"],
  golang: ["go"],
  java: ["spring", "backend"],
  spring: ["java", "backend"],
  graphql: ["backend", "nodejs", "api"],
  api: ["backend", "graphql", "rest"],
  rest: ["api", "backend"],
  kafka: ["backend", "streaming", "distributed systems"],
  redis: ["backend", "caching", "distributed systems"],

  postgres: ["sql", "database", "backend"],
  postgresql: ["postgres"],
  sql: ["postgres", "database", "analytics"],
  mongodb: ["database", "backend"],
  database: ["sql", "postgres", "mongodb"],

  devops: ["kubernetes", "docker", "aws", "terraform", "linux", "sre"],
  sre: ["devops", "kubernetes", "linux"],
  kubernetes: ["k8s", "devops", "docker"],
  k8s: ["kubernetes"],
  docker: ["kubernetes", "devops"],
  aws: ["devops", "cloud", "terraform"],
  cloud: ["aws", "gcp", "azure", "devops"],
  terraform: ["devops", "aws", "iac"],
  linux: ["devops", "sre"],

  ml: ["machine learning", "python", "pytorch", "sklearn", "mlops", "data science"],
  "machine learning": ["ml", "python", "pytorch", "sklearn"],
  python: ["ml", "data science", "sklearn", "pandas", "sql"],
  pytorch: ["ml", "machine learning", "python"],
  sklearn: ["ml", "python"],
  mlops: ["ml", "devops"],
  "data science": ["python", "pandas", "sql", "statistics", "ml"],
  pandas: ["python", "data science", "sql"],
  statistics: ["data science", "analytics"],
  analytics: ["sql", "data science", "statistics"],

  mobile: ["react native", "swift", "kotlin", "ios", "android"],
  "react native": ["mobile", "react", "javascript"],
  swift: ["mobile", "ios"],
  kotlin: ["mobile", "android"],
  ios: ["swift", "mobile"],
  android: ["kotlin", "mobile"],

  design: ["figma", "design systems", "ux research", "prototyping"],
  figma: ["design", "design systems", "prototyping"],
  "design systems": ["design", "figma", "tailwind"],
  "ux research": ["design", "product"],
  prototyping: ["design", "figma"],

  "system design": ["backend", "distributed systems", "scalability"],
  "distributed systems": ["system design", "kafka", "redis"],
  scalability: ["system design", "backend"],
  accessibility: ["frontend", "a11y"],
  a11y: ["accessibility"],
};

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9+.# ]/g, "");
}

/** Expand a single skill/term into itself + related terms. */
export function expandSkill(term: string): Set<string> {
  const key = normalize(term);
  const out = new Set<string>([key]);
  const related = SYNONYMS[key];
  if (related) related.forEach((r) => out.add(normalize(r)));
  return out;
}

/** Extract candidate skill tokens (single + bigrams) from free-form JD text. */
export function extractSkills(text: string): string[] {
  const clean = normalize(text);
  const tokens = clean.split(/\s+/).filter(Boolean);
  const bigrams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) bigrams.push(`${tokens[i]} ${tokens[i + 1]}`);
  const all = new Set<string>([...tokens, ...bigrams]);
  const known = new Set<string>();
  for (const t of all) if (SYNONYMS[t]) known.add(t);
  return Array.from(known);
}

/**
 * Score a candidate against required skills. Returns 0..1.
 * Each required skill contributes 1 point if the candidate matches directly
 * or via a synonym/related term. Verified skills weigh full; near-matches
 * (via expansion in the candidate's direction) weigh partial.
 */
export function scoreCandidate(candidate: Candidate, required: string[]): {
  score: number;
  matched: string[];
  partial: string[];
} {
  if (required.length === 0) return { score: 0, matched: [], partial: [] };
  const candDirect = new Set(candidate.verifiedSkills.map(normalize));
  const candExpanded = new Set<string>();
  candidate.verifiedSkills.forEach((s) => expandSkill(s).forEach((v) => candExpanded.add(v)));

  const matched: string[] = [];
  const partial: string[] = [];
  let points = 0;
  for (const req of required) {
    const reqSet = expandSkill(req);
    let hit: "direct" | "partial" | null = null;
    for (const r of reqSet) {
      if (candDirect.has(r)) { hit = "direct"; break; }
      if (candExpanded.has(r)) hit = hit ?? "partial";
    }
    if (hit === "direct") { points += 1; matched.push(req); }
    else if (hit === "partial") { points += 0.7; partial.push(req); }
  }
  return { score: points / required.length, matched, partial };
}

export type RankedCandidate = Candidate & {
  score: number;
  matched: string[];
  partial: string[];
  tier: 100 | 90 | 75 | 50 | 0;
};

export function rankCandidates(candidates: Candidate[], required: string[]): RankedCandidate[] {
  const ranked = candidates.map((c) => {
    const { score, matched, partial } = scoreCandidate(c, required);
    const pct = score * 100;
    const tier: RankedCandidate["tier"] =
      pct >= 100 ? 100 : pct >= 90 ? 90 : pct >= 75 ? 75 : pct >= 50 ? 50 : 0;
    return { ...c, score, matched, partial, tier };
  });
  return ranked.sort((a, b) => b.score - a.score);
}
