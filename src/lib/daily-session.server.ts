import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export const startDailySessionFn = createServerFn({ method: "POST" })
  .validator(z.object({ categoryIds: z.array(z.string().uuid()).min(1).max(8) }))
  .handler(async ({ data }): Promise<{ error: string | null; sessionId?: string }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    const today = new Date().toISOString().slice(0, 10);

    const { data: existing } = await supabase
      .from("daily_challenge_sessions")
      .select("id")
      .eq("profile_id", auth.user.id)
      .eq("session_date", today)
      .maybeSingle();
    if (existing) {
      return { error: null, sessionId: existing.id };
    }

    const { data: session, error: sessionError } = await supabase
      .from("daily_challenge_sessions")
      .insert({ profile_id: auth.user.id, session_date: today })
      .select()
      .single();
    if (sessionError || !session) return { error: "Could not start today's session." };

    const { data: recentlyPassed } = await supabase
      .from("challenge_submissions")
      .select("challenge_id")
      .eq("profile_id", auth.user.id)
      .eq("status", "passed");
    const passedIds = new Set((recentlyPassed ?? []).map((r) => r.challenge_id));

    for (const categoryId of data.categoryIds) {
      const { data: topic, error: topicError } = await supabase
        .from("daily_session_topics")
        .insert({ session_id: session.id, category_id: categoryId, required_solved: 2 })
        .select()
        .single();
      if (topicError || !topic) continue;

      const { data: candidates } = await supabase
        .from("challenges")
        .select("id")
        .eq("category_id", categoryId)
        .eq("is_active", true);

      const pool = candidates ?? [];
      const fresh = pool.filter((c) => !passedIds.has(c.id));
      const chosen = (
        fresh.length >= 5 ? fresh : [...fresh, ...pool.filter((c) => passedIds.has(c.id))]
      ).slice(0, 5);

      if (chosen.length > 0) {
        await supabase
          .from("daily_session_questions")
          .insert(chosen.map((c) => ({ session_topic_id: topic.id, challenge_id: c.id })));
      }
    }

    return { error: null, sessionId: session.id };
  });
