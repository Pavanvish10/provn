import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { startDailySessionFn } from "@/lib/daily-session.server";

export function useTopicQuestionCounts() {
  return useQuery({
    queryKey: ["topic-question-counts"],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("challenges")
        .select("category_id")
        .eq("is_active", true);
      if (error) throw error;
      const counts = new Map<string, number>();
      for (const row of data ?? []) {
        if (!row.category_id) continue;
        counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
      }
      return counts;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export type SessionTopicWithQuestions = {
  id: string;
  category_id: string;
  category_name: string;
  required_solved: number;
  solved_count: number;
  completed: boolean;
  questions: {
    id: string;
    challenge_id: string;
    slug: string;
    title: string;
    difficulty: string;
    estimated_minutes: number;
    xp_reward: number;
    tags: string[] | null;
    solved: boolean;
  }[];
};

export function todaysSessionQueryKey(profileId: string | undefined) {
  return ["daily-session", profileId, new Date().toISOString().slice(0, 10)] as const;
}

export function useTodaysSession(profileId: string | undefined) {
  return useQuery({
    queryKey: todaysSessionQueryKey(profileId),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const today = new Date().toISOString().slice(0, 10);

      const { data: session, error: sessionError } = await supabase
        .from("daily_challenge_sessions")
        .select("*")
        .eq("profile_id", profileId!)
        .eq("session_date", today)
        .maybeSingle();
      if (sessionError) throw sessionError;
      if (!session) return null;

      const { data: topics, error: topicsError } = await supabase
        .from("daily_session_topics")
        .select("*, category:challenge_categories(name)")
        .eq("session_id", session.id);
      if (topicsError) throw topicsError;

      const topicIds = (topics ?? []).map((t) => t.id);
      const { data: questions, error: questionsError } = await supabase
        .from("daily_session_questions")
        .select(
          "*, challenge:challenges(id, slug, title, difficulty, estimated_minutes, xp_reward, tags)",
        )
        .in(
          "session_topic_id",
          topicIds.length > 0 ? topicIds : ["00000000-0000-0000-0000-000000000000"],
        );
      if (questionsError) throw questionsError;

      const questionsByTopic = new Map<string, typeof questions>();
      for (const q of questions ?? []) {
        const list = questionsByTopic.get(q.session_topic_id) ?? [];
        list.push(q);
        questionsByTopic.set(q.session_topic_id, list);
      }

      const topicsWithQuestions: SessionTopicWithQuestions[] = (topics ?? []).map((t) => ({
        id: t.id,
        category_id: t.category_id,
        category_name:
          (t as unknown as { category: { name: string } | null }).category?.name ?? "Topic",
        required_solved: t.required_solved,
        solved_count: t.solved_count,
        completed: t.completed,
        questions: (questionsByTopic.get(t.id) ?? []).map((q) => {
          const c = (
            q as unknown as { challenge: SessionTopicWithQuestions["questions"][number] | null }
          ).challenge;
          return {
            id: q.id,
            challenge_id: q.challenge_id,
            slug: c?.slug ?? "",
            title: c?.title ?? "Untitled",
            difficulty: c?.difficulty ?? "easy",
            estimated_minutes: c?.estimated_minutes ?? 10,
            xp_reward: c?.xp_reward ?? 20,
            tags: c?.tags ?? [],
            solved: q.solved,
          };
        }),
      }));

      return { session, topics: topicsWithQuestions };
    },
    enabled: !!profileId,
  });
}

export function useStartDailySession(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (categoryIds: string[]) => startDailySessionFn({ data: { categoryIds } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: todaysSessionQueryKey(profileId) });
    },
  });
}
