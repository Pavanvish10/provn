-- =====================================================================
-- Fixes an XP-farming hole introduced by the soft-skills practice mode:
-- on_mock_interview_completed previously awarded XP + a notification for
-- ANY completed mock_interviews row. The soft-skills practice interview
-- (/interview-practice) is intentionally unlocked and meant to be repeated
-- freely, so it must not also pay out XP each time. Only the technical
-- mock interview (used by the /apply verification gate) awards XP; the
-- soft-skills mode still gets a completion notification, just no XP.
-- =====================================================================

create or replace function public.on_mock_interview_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and old.status <> 'completed' then
    if new.mode = 'technical' then
      perform public.award_xp(new.profile_id, 30, 'mock_interview_completed', 'mock_interview', new.id);
    end if;
    perform public.create_notification(new.profile_id, new.profile_id, 'mock_interview',
      'Your mock interview feedback is ready', 'mock_interview', new.id);
  end if;
  return new;
end;
$$;
