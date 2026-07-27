import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { ADMIN_PAGE_SIZE, logAdminAction } from "@/lib/admin-shared";

export type Difficulty = "easy" | "medium" | "hard";
export type ChallengeCategory = Database["public"]["Tables"]["challenge_categories"]["Row"];
export type ChallengeTestCase = Database["public"]["Tables"]["challenge_test_cases"]["Row"];
export type AdminChallenge = Database["public"]["Tables"]["challenges"]["Row"] & {
  category: { name: string } | null;
};

export function slugify(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function useChallengeCategories() {
  return useQuery({
    queryKey: ["admin", "challenge-categories"],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.from("challenge_categories").select("*").order("name");
      if (error) throw error;
      return data as ChallengeCategory[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminChallenges(params: {
  search: string;
  difficulty: Difficulty | "all";
  categoryId: string | "all";
  activeOnly: "all" | "active" | "inactive";
  page: number;
}) {
  return useQuery({
    queryKey: ["admin", "challenges", params],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      let query = supabase
        .from("challenges")
        .select("*, category:challenge_categories(name)", { count: "exact" });

      const q = params.search.trim().replace(/[,()%]/g, "");
      if (q) query = query.ilike("title", `%${q}%`);
      if (params.difficulty !== "all") query = query.eq("difficulty", params.difficulty);
      if (params.categoryId !== "all") query = query.eq("category_id", params.categoryId);
      if (params.activeOnly === "active") query = query.eq("is_active", true);
      if (params.activeOnly === "inactive") query = query.eq("is_active", false);

      const from = params.page * ADMIN_PAGE_SIZE;
      const to = from + ADMIN_PAGE_SIZE - 1;
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { rows: (data ?? []) as unknown as AdminChallenge[], count: count ?? 0 };
    },
  });
}

export type ChallengeFormValues = {
  title: string;
  slug: string;
  description: string;
  difficulty: Difficulty;
  category_id: string | null;
  estimated_minutes: number;
  xp_reward: number;
  tags: string[];
  constraints: string | null;
  input_format: string | null;
  output_format: string | null;
  is_premium: boolean;
  is_active: boolean;
};

export function useCreateChallenge(adminId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: ChallengeFormValues) => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("challenges")
        .insert({ ...values, created_by: adminId ?? null })
        .select("id")
        .single();
      if (error) throw error;
      if (adminId) {
        await logAdminAction(supabase, {
          adminId,
          action: "create_challenge",
          targetType: "challenge",
          targetId: data.id,
          notes: `Created "${values.title}"`,
        });
      }
      return data.id as string;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "challenges"] }),
  });
}

export function useUpdateChallenge(adminId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: ChallengeFormValues }) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("challenges").update(values).eq("id", id);
      if (error) throw error;
      if (adminId) {
        await logAdminAction(supabase, {
          adminId,
          action: "update_challenge",
          targetType: "challenge",
          targetId: id,
          notes: `Updated "${values.title}"`,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "challenges"] }),
  });
}

export function useDeleteChallenge(adminId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("challenges").delete().eq("id", id);
      if (error) throw error;
      if (adminId) {
        await logAdminAction(supabase, {
          adminId,
          action: "delete_challenge",
          targetType: "challenge",
          targetId: id,
          notes: `Deleted "${title}" (test cases cascade-deleted)`,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "challenges"] }),
  });
}

export function useChallengeTestCases(challengeId: string | undefined) {
  return useQuery({
    queryKey: ["admin", "challenge-test-cases", challengeId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("challenge_test_cases")
        .select("*")
        .eq("challenge_id", challengeId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as ChallengeTestCase[];
    },
    enabled: !!challengeId,
  });
}

export function useAddTestCase(adminId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entry: Database["public"]["Tables"]["challenge_test_cases"]["Insert"]) => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("challenge_test_cases")
        .insert(entry)
        .select("id")
        .single();
      if (error) throw error;
      if (adminId) {
        await logAdminAction(supabase, {
          adminId,
          action: "add_test_case",
          targetType: "challenge_test_case",
          targetId: data.id,
        });
      }
    },
    onSuccess: (_data, vars) =>
      queryClient.invalidateQueries({
        queryKey: ["admin", "challenge-test-cases", vars.challenge_id],
      }),
  });
}

export function useUpdateTestCase(adminId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      challengeId,
      patch,
    }: {
      id: string;
      challengeId: string;
      patch: Database["public"]["Tables"]["challenge_test_cases"]["Update"];
    }) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("challenge_test_cases").update(patch).eq("id", id);
      if (error) throw error;
      if (adminId) {
        await logAdminAction(supabase, {
          adminId,
          action: "update_test_case",
          targetType: "challenge_test_case",
          targetId: id,
        });
      }
      return challengeId;
    },
    onSuccess: (challengeId) =>
      queryClient.invalidateQueries({ queryKey: ["admin", "challenge-test-cases", challengeId] }),
  });
}

export function useDeleteTestCase(adminId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, challengeId }: { id: string; challengeId: string }) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("challenge_test_cases").delete().eq("id", id);
      if (error) throw error;
      if (adminId) {
        await logAdminAction(supabase, {
          adminId,
          action: "delete_test_case",
          targetType: "challenge_test_case",
          targetId: id,
        });
      }
      return challengeId;
    },
    onSuccess: (challengeId) =>
      queryClient.invalidateQueries({ queryKey: ["admin", "challenge-test-cases", challengeId] }),
  });
}
