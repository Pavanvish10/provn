-- Close two notification gaps on the business side:
--  1. HR/recruiters get no signal when a student applies to their job.
--  2. HR/recruiters get no signal when a student responds to a scheduled interview.

create or replace function public.on_job_application_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
  v_company_id uuid;
  v_applicant_name text;
  v_member record;
begin
  select j.title, j.company_id into v_title, v_company_id from jobs j where j.id = new.job_id;
  select full_name into v_applicant_name from profiles where id = new.applicant_id;

  for v_member in
    select profile_id from company_members
    where company_id = v_company_id and role in ('owner', 'admin', 'recruiter') and joined_at is not null
  loop
    perform public.create_notification(v_member.profile_id, new.applicant_id, 'job_update',
      coalesce(v_applicant_name, 'A candidate') || ' applied for "' || coalesce(v_title, 'a role') || '"',
      'job_application', new.id);
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_job_application_created on job_applications;
create trigger trg_job_application_created after insert on job_applications
  for each row execute function public.on_job_application_created();

create or replace function public.on_interview_schedule_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_applicant_id uuid;
  v_title text;
  v_company_id uuid;
  v_student_name text;
  v_member record;
begin
  select ja.applicant_id, j.title, j.company_id into v_applicant_id, v_title, v_company_id
  from job_applications ja join jobs j on j.id = ja.job_id
  where ja.id = new.application_id;

  if tg_op = 'INSERT' then
    perform public.create_notification(v_applicant_id, new.created_by, 'interview',
      'Interview scheduled for "' || coalesce(v_title, 'a role') || '"', 'interview_schedule', new.id);
  elsif tg_op = 'UPDATE' and new.status <> old.status then
    if new.status in ('accepted', 'declined', 'reschedule_requested') then
      select full_name into v_student_name from profiles where id = v_applicant_id;
      for v_member in
        select profile_id from company_members
        where company_id = v_company_id and role in ('owner', 'admin', 'recruiter') and joined_at is not null
      loop
        perform public.create_notification(v_member.profile_id, v_applicant_id, 'interview',
          coalesce(v_student_name, 'The candidate') || ' ' ||
          case new.status
            when 'accepted' then 'accepted'
            when 'declined' then 'declined'
            else 'requested a new time for'
          end || ' the interview for "' || coalesce(v_title, 'a role') || '"',
          'interview_schedule', new.id);
      end loop;
    else
      perform public.create_notification(v_applicant_id, new.created_by, 'interview',
        'Interview status updated to ' || new.status || ' for "' || coalesce(v_title, 'a role') || '"',
        'interview_schedule', new.id);
    end if;
  end if;
  return new;
end;
$$;
