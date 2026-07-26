export const AVATARS = [
  "https://api.dicebear.com/9.x/notionists/svg?seed=Ava",
  "https://api.dicebear.com/9.x/notionists/svg?seed=Kai",
  "https://api.dicebear.com/9.x/notionists/svg?seed=Rhea",
  "https://api.dicebear.com/9.x/notionists/svg?seed=Milo",
  "https://api.dicebear.com/9.x/notionists/svg?seed=Zara",
  "https://api.dicebear.com/9.x/notionists/svg?seed=Ishaan",
  "https://api.dicebear.com/9.x/notionists/svg?seed=Nova",
  "https://api.dicebear.com/9.x/notionists/svg?seed=Owen",
];

export const FEED_POSTS = [
  {
    id: "p1",
    author: "Ananya Rao",
    handle: "@ananya",
    avatar: AVATARS[0],
    time: "2h",
    kind: "project" as const,
    content:
      "Shipped a full‑stack expense tracker with a receipt OCR pipeline. Verified my Next.js + Postgres skills on Provn 🟢",
    tags: ["Next.js", "Postgres", "Verified"],
    likes: 128,
    comments: 24,
  },
  {
    id: "p2",
    author: "Kartik Menon",
    handle: "@kartik",
    avatar: AVATARS[1],
    time: "4h",
    kind: "daily" as const,
    content:
      "Day 47 of the streak. Two DP problems + one system design write‑up. Feeling the compounding.",
    tags: ["Streak"],
    likes: 62,
    comments: 9,
  },
  {
    id: "p3",
    author: "Priya Iyer",
    handle: "@priya",
    avatar: AVATARS[2],
    time: "6h",
    kind: "market" as const,
    content:
      "I built a Figma → React converter that ships pixel‑perfect Tailwind. Recruiters — DM if you want a demo.",
    tags: ["Design Eng", "Hiring"],
    likes: 341,
    comments: 51,
  },
  {
    id: "p4",
    author: "Dev Sharma",
    handle: "@dev",
    avatar: AVATARS[3],
    time: "1d",
    kind: "video" as const,
    content: "60‑second walkthrough of my ML pipeline for detecting insurance fraud.",
    tags: ["ML", "Video"],
    likes: 208,
    comments: 33,
  },
];

export const LEADERBOARD = [
  { name: "Kartik Menon", streak: 214, avatar: AVATARS[1] },
  { name: "Priya Iyer", streak: 198, avatar: AVATARS[2] },
  { name: "Ananya Rao", streak: 187, avatar: AVATARS[0] },
  { name: "Dev Sharma", streak: 164, avatar: AVATARS[3] },
  { name: "Nikita Verma", streak: 152, avatar: AVATARS[4] },
  { name: "Ishaan Kapoor", streak: 141, avatar: AVATARS[5] },
  { name: "Rhea Nair", streak: 133, avatar: AVATARS[6] },
  { name: "Owen Fernandez", streak: 121, avatar: AVATARS[7] },
];

export const FRIEND_SUGGESTIONS = [
  { id: "u_9021", name: "Rohan Bhat", role: "CS @ IIIT‑Delhi", avatar: AVATARS[5] },
  { id: "u_9022", name: "Meera Krishnan", role: "Fresh Grad · Frontend", avatar: AVATARS[2] },
  { id: "u_9023", name: "Sam O'Neil", role: "Job Switcher · Backend", avatar: AVATARS[7] },
  { id: "u_9024", name: "Aditi Ghosh", role: "Designer · Product", avatar: AVATARS[4] },
];

export const CONVERSATIONS = [
  { id: "c1", name: "Priya Iyer", avatar: AVATARS[2], last: "sent you the repo link", time: "12m", unread: 2 },
  { id: "c2", name: "Kartik Menon", avatar: AVATARS[1], last: "let's pair on the DP set", time: "1h", unread: 0 },
  { id: "c3", name: "Recruiter · Linear", avatar: AVATARS[6], last: "loved your verified profile", time: "3h", unread: 1 },
  { id: "c4", name: "Dev Sharma", avatar: AVATARS[3], last: "streak buddy?", time: "1d", unread: 0 },
];

export const CHALLENGES = [
  { id: "ch1", title: "LRU Cache — design & implement", domain: "Data Structures", difficulty: "Moderate", tags: ["Hash Map", "Doubly Linked List"], minutes: 30 },
  { id: "ch2", title: "Rate limiter for a public API", domain: "System Design", difficulty: "Moderate", tags: ["Token Bucket", "Redis"], minutes: 30 },
  { id: "ch3", title: "SQL: top 3 products per category", domain: "SQL / Data", difficulty: "Moderate", tags: ["Window Functions", "CTE"], minutes: 25 },
  { id: "ch4", title: "Debounced search with cancellation", domain: "Frontend", difficulty: "Moderate", tags: ["React", "AbortController"], minutes: 25 },
  { id: "ch5", title: "REST endpoint: idempotent payment", domain: "Backend", difficulty: "Moderate", tags: ["Node", "Postgres"], minutes: 30 },
  { id: "ch6", title: "Detect fraud from transaction stream", domain: "Machine Learning", difficulty: "Moderate", tags: ["Features", "Sklearn"], minutes: 35 },
  { id: "ch7", title: "Kubernetes rolling deploy debug", domain: "DevOps", difficulty: "Moderate", tags: ["K8s", "Probes"], minutes: 25 },
  { id: "ch8", title: "A/B test — pick the winner", domain: "Data Analytics", difficulty: "Moderate", tags: ["Statistics", "p-value"], minutes: 25 },
];


export const JOBS = [
  { id: "j1", role: "Frontend Engineer", company: "Loom Labs", location: "Bengaluru · Hybrid", salary: "₹18–28 LPA", tags: ["React", "TypeScript"] },
  { id: "j2", role: "ML Engineer", company: "Northwind AI", location: "Remote · India", salary: "₹22–34 LPA", tags: ["Python", "PyTorch"] },
  { id: "j3", role: "Product Designer", company: "Kite", location: "Bengaluru", salary: "₹16–24 LPA", tags: ["Figma", "Systems"] },
  { id: "j4", role: "Backend Engineer", company: "Ledgerly", location: "Hyderabad · Onsite", salary: "₹20–30 LPA", tags: ["Go", "Postgres"] },
];

export const NOTIFICATIONS = [
  { id: "n1", text: "Priya liked your project post", time: "5m", unread: true },
  { id: "n2", text: "New coding challenge unlocked: Sliding Window Maximum", time: "1h", unread: true },
  { id: "n3", text: "Recruiter from Linear viewed your verified profile", time: "3h", unread: false },
  { id: "n4", text: "You extended your streak — 12 days 🔥", time: "1d", unread: false },
];

// Candidate pool used by the Business/ATS matching engine. Each candidate has
// a set of verified skills; matching is computed against a JD/requirements.
export type Candidate = {
  id: string;
  name: string;
  avatar: string;
  headline: string;
  location: string;
  years: number;
  verifiedSkills: string[];
  streak: number;
};

export const CANDIDATES: Candidate[] = [
  { id: "cand_1", name: "Ananya Rao", avatar: AVATARS[0], headline: "Full‑stack engineer", location: "Bengaluru", years: 3, verifiedSkills: ["React", "TypeScript", "Next.js", "Node.js", "Postgres"], streak: 187 },
  { id: "cand_2", name: "Kartik Menon", avatar: AVATARS[1], headline: "Backend engineer", location: "Pune", years: 4, verifiedSkills: ["Go", "Postgres", "Kubernetes", "System Design", "Redis"], streak: 214 },
  { id: "cand_3", name: "Priya Iyer", avatar: AVATARS[2], headline: "Design engineer", location: "Bengaluru", years: 2, verifiedSkills: ["React", "TypeScript", "Figma", "CSS", "Tailwind"], streak: 198 },
  { id: "cand_4", name: "Dev Sharma", avatar: AVATARS[3], headline: "ML engineer", location: "Remote · IN", years: 3, verifiedSkills: ["Python", "PyTorch", "Sklearn", "SQL", "MLOps"], streak: 164 },
  { id: "cand_5", name: "Nikita Verma", avatar: AVATARS[4], headline: "Frontend engineer", location: "Delhi NCR", years: 2, verifiedSkills: ["JavaScript", "Vue", "CSS", "Tailwind", "Accessibility"], streak: 152 },
  { id: "cand_6", name: "Ishaan Kapoor", avatar: AVATARS[5], headline: "DevOps engineer", location: "Hyderabad", years: 5, verifiedSkills: ["AWS", "Kubernetes", "Terraform", "Docker", "Linux"], streak: 141 },
  { id: "cand_7", name: "Rhea Nair", avatar: AVATARS[6], headline: "Data scientist", location: "Bengaluru", years: 3, verifiedSkills: ["Python", "SQL", "Pandas", "Statistics", "Sklearn"], streak: 133 },
  { id: "cand_8", name: "Owen Fernandez", avatar: AVATARS[7], headline: "Full‑stack engineer", location: "Goa", years: 4, verifiedSkills: ["React", "Node.js", "GraphQL", "MongoDB", "TypeScript"], streak: 121 },
  { id: "cand_9", name: "Rohan Bhat", avatar: AVATARS[5], headline: "Mobile engineer", location: "Bengaluru", years: 2, verifiedSkills: ["React Native", "Swift", "Kotlin", "TypeScript"], streak: 88 },
  { id: "cand_10", name: "Meera Krishnan", avatar: AVATARS[2], headline: "Frontend engineer", location: "Chennai", years: 1, verifiedSkills: ["React", "TypeScript", "Next.js", "Tailwind"], streak: 74 },
  { id: "cand_11", name: "Sam O'Neil", avatar: AVATARS[7], headline: "Backend engineer", location: "Remote · IN", years: 6, verifiedSkills: ["Java", "Spring", "Kafka", "Postgres", "System Design"], streak: 66 },
  { id: "cand_12", name: "Aditi Ghosh", avatar: AVATARS[4], headline: "Product designer", location: "Kolkata", years: 4, verifiedSkills: ["Figma", "Design Systems", "Prototyping", "UX Research"], streak: 59 },
];
