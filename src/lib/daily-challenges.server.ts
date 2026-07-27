import { createServerFn } from "@tanstack/react-start";

import { getSupabaseServerClient } from "@/lib/supabase/server";

type ChallengeRow = {
  id: string;
  title: string;
  slug: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[] | null;
  category_id: string | null;
  xp_reward: number;
  estimated_minutes: number;
};

function keywordsFrom(...values: (string | null | undefined)[]): string[] {
  return values
    .filter((v): v is string => !!v)
    .flatMap((v) => v.toLowerCase().split(/[^a-z0-9+.#]+/))
    .filter(Boolean);
}

export const ensureTodaysChallengesFn = createServerFn({ method: "POST" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Not signed in.", challengeIds: [] as string[] };

  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from("daily_challenge_assignments")
    .select("challenge_id")
    .eq("profile_id", auth.user.id)
    .eq("assigned_date", today);

  if (existing && existing.length > 0) {
    return { error: null, challengeIds: existing.map((r) => r.challenge_id) };
  }

  const [{ data: profile }, { data: skills }, { data: recentSubs }, { data: recentAssignments }] =
    await Promise.all([
      supabase.from("profiles").select("target_role").eq("id", auth.user.id).maybeSingle(),
      supabase.from("skills").select("skill_name, verified").eq("profile_id", auth.user.id),
      supabase
        .from("challenge_submissions")
        .select("status, challenge_id")
        .eq("profile_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("daily_challenge_assignments")
        .select("challenge_id")
        .eq("profile_id", auth.user.id)
        .gte(
          "assigned_date",
          new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        ),
    ]);

  const recentChallengeIds = new Set((recentAssignments ?? []).map((r) => r.challenge_id));

  // Adapt difficulty from recent pass rate.
  const recent = recentSubs ?? [];
  const passCount = recent.filter((s) => s.status === "passed").length;
  const passRate = recent.length > 0 ? passCount / recent.length : 0;
  let targetDifficulty: ("easy" | "medium" | "hard")[];
  if (recent.length === 0) targetDifficulty = ["easy", "medium"];
  else if (passRate >= 0.7) targetDifficulty = ["medium", "hard"];
  else if (passRate >= 0.4) targetDifficulty = ["easy", "medium"];
  else targetDifficulty = ["easy"];

  const interestKeywords = new Set(
    keywordsFrom(profile?.target_role, ...(skills ?? []).map((s) => s.skill_name)),
  );

  const { data: candidates } = await supabase
    .from("challenges")
    .select("id, title, slug, difficulty, tags, category_id, xp_reward, estimated_minutes")
    .eq("is_active", true)
    .eq("is_premium", false);

  const pool = (candidates ?? []) as ChallengeRow[];
  const notRecent = pool.filter((c) => !recentChallengeIds.has(c.id));
  const usablePool = notRecent.length >= 2 ? notRecent : pool;

  function score(c: ChallengeRow): number {
    let s = 0;
    if (targetDifficulty.includes(c.difficulty)) s += 3;
    const tagWords = keywordsFrom(...(c.tags ?? []), c.title);
    for (const w of tagWords) if (interestKeywords.has(w)) s += 2;
    return s;
  }

  const ranked = [...usablePool].sort((a, b) => score(b) - score(a));
  const chosen: ChallengeRow[] = [];
  for (const c of ranked) {
    if (chosen.length >= 2) break;
    // Prefer variety: avoid picking the same category twice if we have options.
    if (chosen.length === 1 && chosen[0].category_id === c.category_id && ranked.length > 2)
      continue;
    chosen.push(c);
  }
  if (chosen.length < 2) {
    for (const c of ranked) {
      if (chosen.length >= 2) break;
      if (!chosen.find((x) => x.id === c.id)) chosen.push(c);
    }
  }

  if (chosen.length === 0) {
    return { error: "No challenges are available yet.", challengeIds: [] as string[] };
  }

  const rows = chosen.map((c) => ({
    profile_id: auth.user!.id,
    challenge_id: c.id,
    assigned_date: today,
  }));
  const { error: insertError } = await supabase
    .from("daily_challenge_assignments")
    .upsert(rows, { onConflict: "profile_id,challenge_id,assigned_date", ignoreDuplicates: true });
  if (insertError)
    return { error: "Could not assign today's challenges.", challengeIds: [] as string[] };

  return { error: null, challengeIds: chosen.map((c) => c.id) };
});
