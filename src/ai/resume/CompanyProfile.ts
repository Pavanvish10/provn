import type { DifficultyLevel } from "@/ai/QuestionDifficulty";

// Static knowledge about each supported company's interview culture —
// used by CompanyQuestionStrategy to shape focus areas and question
// phrasing (e.g. Amazon's leadership principles, Google's bar for
// technical depth) without any of that living as scattered literals
// elsewhere in the codebase.

export type CompanyId =
  | "google"
  | "amazon"
  | "microsoft"
  | "meta"
  | "netflix"
  | "apple"
  | "adobe"
  | "uber"
  | "airbnb"
  | "atlassian"
  | "flipkart"
  | "razorpay"
  | "phonepe"
  | "swiggy"
  | "zomato"
  | "tcs"
  | "infosys"
  | "wipro"
  | "accenture"
  | "capgemini"
  | "cred"
  | "meesho";

export interface CompanyProfileData {
  id: CompanyId;
  name: string;
  interviewStyle: string;
  difficulty: DifficultyLevel;
  leadershipPrinciples: string[];
  preferredTopics: string[];
}

export const COMPANY_PROFILES: Record<CompanyId, CompanyProfileData> = {
  google: {
    id: "google",
    name: "Google",
    interviewStyle: "Structured, data-driven, evaluated on technical depth and 'Googleyness'.",
    difficulty: "hard",
    leadershipPrinciples: ["Googleyness", "General Cognitive Ability", "Role-Related Knowledge"],
    preferredTopics: ["system design", "algorithms", "scalability", "data structures"],
  },
  amazon: {
    id: "amazon",
    name: "Amazon",
    interviewStyle: "Behavioral-heavy, STAR-format, every answer mapped to a leadership principle.",
    difficulty: "hard",
    leadershipPrinciples: [
      "Customer Obsession",
      "Ownership",
      "Invent and Simplify",
      "Bias for Action",
      "Deliver Results",
    ],
    preferredTopics: ["ownership stories", "scale", "customer impact", "trade-offs"],
  },
  microsoft: {
    id: "microsoft",
    name: "Microsoft",
    interviewStyle: "Collaborative, growth-mindset focused, mixes technical and behavioral rounds.",
    difficulty: "medium",
    leadershipPrinciples: [
      "Growth Mindset",
      "Customer Obsessed",
      "One Microsoft",
      "Diversity & Inclusion",
    ],
    preferredTopics: ["collaboration", "learning agility", "system design", "cloud (Azure)"],
  },
  meta: {
    id: "meta",
    name: "Meta",
    interviewStyle: "Fast-paced, execution-focused, strong emphasis on measurable impact.",
    difficulty: "hard",
    leadershipPrinciples: ["Move Fast", "Be Bold", "Focus on Impact", "Be Open"],
    preferredTopics: ["impact metrics", "scale", "product sense", "execution speed"],
  },
  netflix: {
    id: "netflix",
    name: "Netflix",
    interviewStyle: "Direct, high-autonomy, heavy culture fit around Freedom & Responsibility.",
    difficulty: "hard",
    leadershipPrinciples: ["Judgment", "Communication", "Impact", "Courage"],
    preferredTopics: ["autonomy", "judgment calls", "high performance", "candor"],
  },
  apple: {
    id: "apple",
    name: "Apple",
    interviewStyle:
      "Detail-oriented, quality-obsessed, strong cross-functional collaboration focus.",
    difficulty: "hard",
    leadershipPrinciples: ["Innovation", "Quality Obsession", "Simplicity", "Discretion"],
    preferredTopics: ["attention to detail", "design quality", "cross-team collaboration"],
  },
  adobe: {
    id: "adobe",
    name: "Adobe",
    interviewStyle: "Creativity-driven, collaborative, growth-focused.",
    difficulty: "medium",
    leadershipPrinciples: ["Genuine", "Exceptional", "Innovative", "Involved"],
    preferredTopics: ["creativity", "user experience", "collaboration"],
  },
  uber: {
    id: "uber",
    name: "Uber",
    interviewStyle: "Execution-heavy, metrics-driven, scrappy problem solving.",
    difficulty: "hard",
    leadershipPrinciples: ["Customer Obsession", "Big Bold Bets", "Execution Excellence"],
    preferredTopics: ["scale", "real-time systems", "metrics-driven decisions"],
  },
  airbnb: {
    id: "airbnb",
    name: "Airbnb",
    interviewStyle: "Values-driven, storytelling-heavy, strong belonging culture.",
    difficulty: "medium",
    leadershipPrinciples: [
      "Champion the Mission",
      "Be a Host",
      "Embrace the Adventure",
      "Cereal Entrepreneur",
    ],
    preferredTopics: ["belonging", "hospitality mindset", "community trust"],
  },
  flipkart: {
    id: "flipkart",
    name: "Flipkart",
    interviewStyle: "Fast-paced e-commerce, strong focus on scale and ownership.",
    difficulty: "medium",
    leadershipPrinciples: ["Customer First", "Bias for Action", "Ownership"],
    preferredTopics: ["e-commerce scale", "ownership", "fast iteration"],
  },
  razorpay: {
    id: "razorpay",
    name: "Razorpay",
    interviewStyle: "Fintech rigor with a startup pace, product-and-engineering hybrid rounds.",
    difficulty: "medium",
    leadershipPrinciples: ["Solve for India", "Speed", "Integrity"],
    preferredTopics: ["fintech reliability", "payments", "startup ownership"],
  },
  tcs: {
    id: "tcs",
    name: "TCS",
    interviewStyle: "Structured, process-oriented, fundamentals-focused.",
    difficulty: "easy",
    leadershipPrinciples: ["Integrity", "Customer Centricity", "Excellence"],
    preferredTopics: ["fundamentals", "process adherence", "teamwork"],
  },
  infosys: {
    id: "infosys",
    name: "Infosys",
    interviewStyle: "Fundamentals and aptitude focused, structured multi-round process.",
    difficulty: "easy",
    leadershipPrinciples: ["Client Value", "Leadership by Example", "Fairness"],
    preferredTopics: ["fundamentals", "learning ability", "communication"],
  },
  wipro: {
    id: "wipro",
    name: "Wipro",
    interviewStyle: "Process-driven, fundamentals plus communication focus.",
    difficulty: "easy",
    leadershipPrinciples: ["Spirit of Wipro", "Integrity", "Respect"],
    preferredTopics: ["fundamentals", "adaptability", "client focus"],
  },
  accenture: {
    id: "accenture",
    name: "Accenture",
    interviewStyle: "Client-facing consulting style, structured behavioral plus technical rounds.",
    difficulty: "medium",
    leadershipPrinciples: [
      "Stewardship",
      "Best People",
      "Client Value Creation",
      "One Global Network",
    ],
    preferredTopics: ["client communication", "consulting mindset", "adaptability"],
  },
  atlassian: {
    id: "atlassian",
    name: "Atlassian",
    interviewStyle: "Values-driven, collaborative, strong focus on open teamwork and candor.",
    difficulty: "medium",
    leadershipPrinciples: [
      "Open Company, No Bullshit",
      "Build with Heart and Balance",
      "Don't #@!% the Customer",
      "Play, as a Team",
    ],
    preferredTopics: ["collaboration", "teamwork tools", "openness", "customer trust"],
  },
  phonepe: {
    id: "phonepe",
    name: "PhonePe",
    interviewStyle: "Fintech-at-scale rigor, deep dives on reliability and ownership.",
    difficulty: "hard",
    leadershipPrinciples: ["Ownership", "Customer Trust", "Speed with Reliability"],
    preferredTopics: ["payments scale", "reliability", "fintech security", "ownership"],
  },
  swiggy: {
    id: "swiggy",
    name: "Swiggy",
    interviewStyle: "Fast-paced consumer-tech, strong bias toward metrics and execution.",
    difficulty: "medium",
    leadershipPrinciples: ["Customer Obsession", "Bias for Action", "Data-Driven Decisions"],
    preferredTopics: ["real-time logistics", "scale", "product metrics", "execution speed"],
  },
  zomato: {
    id: "zomato",
    name: "Zomato",
    interviewStyle: "Consumer-tech, product-and-scale focused, informal but rigorous.",
    difficulty: "medium",
    leadershipPrinciples: ["Customer First", "Ownership", "Extreme Ownership"],
    preferredTopics: ["consumer scale", "product thinking", "ownership", "fast iteration"],
  },
  capgemini: {
    id: "capgemini",
    name: "Capgemini",
    interviewStyle: "Structured, process-oriented consulting rounds with fundamentals focus.",
    difficulty: "easy",
    leadershipPrinciples: ["Honesty", "Boldness", "Trust", "Freedom"],
    preferredTopics: ["fundamentals", "client communication", "adaptability"],
  },
  cred: {
    id: "cred",
    name: "CRED",
    interviewStyle: "Design-and-quality obsessed fintech, high bar on craftsmanship and ownership.",
    difficulty: "hard",
    leadershipPrinciples: ["Obsess Over Craft", "Ownership", "Speed with Quality"],
    preferredTopics: ["fintech reliability", "system design", "product craftsmanship", "scale"],
  },
  meesho: {
    id: "meesho",
    name: "Meesho",
    interviewStyle: "Fast-paced e-commerce at scale, strong bias toward data-driven decisions.",
    difficulty: "medium",
    leadershipPrinciples: ["Customer Obsession", "Bias for Action", "Data-Driven Decisions"],
    preferredTopics: ["e-commerce scale", "system design", "product metrics", "ownership"],
  },
};

const ALIASES: Record<string, CompanyId> = { fb: "meta", facebook: "meta", "google llc": "google" };

export function getCompanyProfile(idOrName: string): CompanyProfileData | null {
  const key = idOrName.trim().toLowerCase();
  if (key in COMPANY_PROFILES) return COMPANY_PROFILES[key as CompanyId];
  if (key in ALIASES) return COMPANY_PROFILES[ALIASES[key]];
  return null;
}

export function listCompanyProfiles(): CompanyProfileData[] {
  return Object.values(COMPANY_PROFILES);
}
