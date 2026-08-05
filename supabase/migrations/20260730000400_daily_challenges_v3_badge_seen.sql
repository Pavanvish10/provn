-- =====================================================================
-- Daily Challenges v3 — achievement popup support.
-- `seen` lets the client show a one-time "Achievement unlocked!" popup for
-- newly earned badges, then mark them acknowledged. user_badges already
-- has a public select policy (badges are shown on the leaderboard); this
-- adds a narrow owner-only update policy limited to acknowledging badges.
-- =====================================================================

alter table user_badges add column if not exists seen boolean not null default false;

drop policy if exists user_badges_owner_update on user_badges;
create policy user_badges_owner_update on user_badges for update
  to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
