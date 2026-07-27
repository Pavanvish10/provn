import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { rankCandidates, type Candidate, type RankedCandidate } from "@/lib/matching";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type SkillRow = Database["public"]["Tables"]["skills"]["Row"];

// ---------------------------------------------------------------------
// Recruiter Dashboard candidate search — platform-wide, not tied to a job.
//
// Visibility constraint (see RLS): only `profiles` and `skills` are
// publicly selectable across arbitrary users. `challenge_submissions`,
// `mock_interviews`, `resumes`, and `user_roadmap_progress` are all
// owner/admin-only, so coding score, interview score, ATS score, and
// roadmap progress cannot be honestly shown here — they only become
// visible once someone applies to one of your jobs (see company-client.ts
// useJobApplications). This search therefore ranks by verified-skill match
// only, and the UI must say so plainly.
// ---------------------------------------------------------------------

export type CandidateSearchFilters = {
  name: string;
  skillsQuery: string; // free-text skills/keywords, space/comma separated
  location: string;
  targetRole: string;
  verifiedOnly: boolean;
};

export const emptyCandidateFilters: CandidateSearchFilters = {
  name: "",
  skillsQuery: "",
  location: "",
  targetRole: "",
  verifiedOnly: false,
};

export type SearchedCandidate = RankedCandidate & {
  username: string | null;
  targetRole: string | null;
  bio: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  linkedinUrl: string | null;
};

function sanitizeIlike(v: string) {
  return v.trim().replace(/[%,]/g, "");
}

export function useCandidateSearch(filters: CandidateSearchFilters) {
  return useQuery({
    queryKey: ["candidate-search", filters],
    queryFn: async (): Promise<SearchedCandidate[]> => {
      const supabase = getSupabaseBrowserClient();

      let profileQuery = supabase
        .from("profiles")
        .select(
          "id, full_name, username, avatar_url, location, target_role, bio, github_url, portfolio_url, linkedin_url",
        )
        .limit(300);

      const name = sanitizeIlike(filters.name);
      if (name)
        profileQuery = profileQuery.or(`full_name.ilike.%${name}%,username.ilike.%${name}%`);
      const location = sanitizeIlike(filters.location);
      if (location) profileQuery = profileQuery.ilike("location", `%${location}%`);
      const targetRole = sanitizeIlike(filters.targetRole);
      if (targetRole) profileQuery = profileQuery.ilike("target_role", `%${targetRole}%`);

      const { data: profiles, error } = await profileQuery;
      if (error) throw error;
      if (!profiles || profiles.length === 0) return [];

      const ids = profiles.map((p) => p.id);
      let skillQuery = supabase.from("skills").select("*").in("profile_id", ids);
      if (filters.verifiedOnly) skillQuery = skillQuery.eq("verified", true);
      const { data: skills, error: skillError } = await skillQuery;
      if (skillError) throw skillError;

      const skillsByProfile = new Map<string, SkillRow[]>();
      for (const s of skills ?? []) {
        const list = skillsByProfile.get(s.profile_id!) ?? [];
        list.push(s);
        skillsByProfile.set(s.profile_id!, list);
      }

      const candidates: Candidate[] = profiles.map((p) => ({
        id: p.id,
        name: p.full_name ?? p.username ?? "Unnamed",
        avatar: p.avatar_url ?? "",
        headline: p.target_role ?? "",
        location: p.location ?? "",
        years: 0,
        verifiedSkills: (skillsByProfile.get(p.id) ?? [])
          .filter((s) => s.verified)
          .map((s) => s.skill_name ?? "")
          .filter(Boolean),
        streak: 0,
      }));

      const required = sanitizeIlike(filters.skillsQuery)
        ? filters.skillsQuery
            .split(/[\s,]+/)
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      const ranked: RankedCandidate[] =
        required.length > 0
          ? rankCandidates(candidates, required)
          : candidates.map((c) => ({ ...c, score: 0, matched: [], partial: [], tier: 0 as const }));

      const profileMap = new Map(profiles.map((p) => [p.id, p]));

      return ranked
        .filter((c) =>
          filters.verifiedOnly ? (skillsByProfile.get(c.id) ?? []).some((s) => s.verified) : true,
        )
        .map((c) => {
          const p = profileMap.get(c.id)!;
          return {
            ...c,
            username: p.username,
            targetRole: p.target_role,
            bio: p.bio,
            githubUrl: p.github_url,
            portfolioUrl: p.portfolio_url,
            linkedinUrl: p.linkedin_url,
          };
        })
        .sort((a, b) => b.score - a.score);
    },
  });
}
