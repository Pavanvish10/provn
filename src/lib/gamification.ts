/** Pure gamification helpers shared by the Daily Challenges dashboard,
 * challenge detail page, and leaderboard. No DB/network access here. */

export type LevelInfo = {
  level: number;
  currentLevelXp: number;
  xpForNextLevel: number;
  progressPct: number;
};

/** XP is stored uncapped in profiles.xp (see award_xp() in Postgres) — there
 * is no stored "level" column. Levels are a derived display concept: each
 * level requires 50 more XP than the last (100, 150, 200, ...), a simple
 * escalating curve that keeps early levels fast and later ones a grind. */
export function getLevelInfo(xp: number): LevelInfo {
  const safeXp = Math.max(0, Math.floor(xp || 0));
  let level = 1;
  let floor = 0;
  let step = 100;
  while (floor + step <= safeXp) {
    floor += step;
    level += 1;
    step = 100 + (level - 1) * 50;
  }
  const currentLevelXp = safeXp - floor;
  return {
    level,
    currentLevelXp,
    xpForNextLevel: step,
    progressPct: Math.round((currentLevelXp / step) * 100),
  };
}

export const BADGE_ICON_BY_CODE: Record<string, string> = {
  first_solve: "Trophy",
  streak_7: "Flame",
  streak_30: "Flame",
  streak_100: "Flame",
  daily_complete_1: "Sparkles",
  daily_complete_10: "Sparkles",
  topic_master: "Award",
};
