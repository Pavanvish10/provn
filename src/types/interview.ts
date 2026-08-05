import type { LucideIcon } from "lucide-react";

export interface InterviewUser {
  name: string;
  role: string;
  avatarUrl?: string;
  initials: string;
}

export interface InterviewStat {
  id: string;
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "neutral";
  icon: LucideIcon;
  gradient: string;
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
}

export type InterviewScoreBand = "excellent" | "good" | "average" | "needsWork";

export interface RecentInterview {
  id: string;
  company: string;
  role: string;
  logoInitials: string;
  logoGradient: string;
  score: number;
  scoreBand: InterviewScoreBand;
  date: string;
}

export interface UpcomingInterview {
  company: string;
  role: string;
  logoInitials: string;
  logoGradient: string;
  date: string;
  time: string;
  daysAway: number;
  interviewType: string;
}
