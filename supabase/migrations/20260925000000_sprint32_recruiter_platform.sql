-- =====================================================================
-- Sprint 32: Advanced Recruiter Platform.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Interview-schedule notifications only ever address the applicant,
-- even on UPDATE — but interview_schedules has exactly one UPDATE
-- policy (interview_schedules_applicant_update, migration
-- 20260728000300), so every UPDATE this trigger sees is the candidate
-- responding (accept/decline/reschedule_requested). The recruiter who
-- scheduled it currently gets no notification at all when that happens.
-- Flips the UPDATE branch to notify the recruiter (new.created_by) with
-- the candidate as actor; the INSERT branch (recruiter scheduling it)
-- is unchanged — that one is correctly addressed to the applicant.
-- ---------------------------------------------------------------------
create or replace function public.on_interview_schedule_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_applicant_id uuid;
  v_title text;
begin
  select ja.applicant_id, j.title into v_applicant_id, v_title
  from job_applications ja join jobs j on j.id = ja.job_id
  where ja.id = new.application_id;

  if tg_op = 'INSERT' then
    perform public.create_notification(v_applicant_id, new.created_by, 'interview',
      'Interview scheduled for "' || coalesce(v_title, 'a role') || '"', 'interview_schedule', new.id);
  elsif tg_op = 'UPDATE' and new.status <> old.status then
    -- The only UPDATE path today is the applicant responding — notify
    -- whoever scheduled it, not the applicant who just acted.
    perform public.create_notification(new.created_by, v_applicant_id, 'interview',
      'Interview ' || new.status || ' by the candidate for "' || coalesce(v_title, 'a role') || '"',
      'interview_schedule', new.id);
  end if;
  return new;
end;
$$;
