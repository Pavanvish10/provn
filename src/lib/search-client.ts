import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type SearchProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  target_role: string | null;
};

export type SearchPost = {
  id: string;
  content: string | null;
  created_at: string;
  author: { full_name: string | null; username: string | null } | null;
};

export type SearchJob = {
  id: string;
  title: string | null;
  location: string | null;
};

export type SearchCompany = {
  id: string;
  company_name: string | null;
};

export type SearchChallenge = {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
};

export type GlobalSearchResults = {
  profiles: SearchProfile[];
  posts: SearchPost[];
  skills: string[];
  jobs: SearchJob[];
  companies: SearchCompany[];
  challenges: SearchChallenge[];
};

const EMPTY_RESULTS: GlobalSearchResults = {
  profiles: [],
  posts: [],
  skills: [],
  jobs: [],
  companies: [],
  challenges: [],
};

export function useGlobalSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ["search", q],
    queryFn: async (): Promise<GlobalSearchResults> => {
      if (q.length < 2) return EMPTY_RESULTS;

      const supabase = getSupabaseBrowserClient();
      const like = `%${q}%`;

      const [profiles, posts, skills, jobs, companies, challenges] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url, target_role")
          .or(`full_name.ilike.${like},username.ilike.${like}`)
          .limit(10),
        supabase
          .from("posts")
          .select(
            "id, content, created_at, author:profiles!posts_author_id_fkey(full_name, username)",
          )
          .ilike("content", like)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase.from("skills").select("skill_name").ilike("skill_name", like).limit(50),
        supabase
          .from("jobs")
          .select("id, title, location")
          .eq("status", "open")
          .ilike("title", like)
          .limit(10),
        supabase
          .from("companies")
          .select("id, company_name")
          .eq("verified", true)
          .ilike("company_name", like)
          .limit(10),
        supabase
          .from("challenges")
          .select("id, title, slug, difficulty")
          .eq("is_active", true)
          .ilike("title", like)
          .limit(10),
      ]);

      for (const result of [profiles, posts, skills, jobs, companies, challenges]) {
        if (result.error) throw result.error;
      }

      const distinctSkills = Array.from(
        new Set((skills.data ?? []).map((s) => s.skill_name).filter((n): n is string => !!n)),
      ).slice(0, 10);

      return {
        profiles: (profiles.data ?? []) as SearchProfile[],
        posts: (posts.data ?? []) as unknown as SearchPost[],
        skills: distinctSkills,
        jobs: (jobs.data ?? []) as SearchJob[],
        companies: (companies.data ?? []) as SearchCompany[],
        challenges: (challenges.data ?? []) as SearchChallenge[],
      };
    },
    enabled: q.length >= 2,
  });
}
