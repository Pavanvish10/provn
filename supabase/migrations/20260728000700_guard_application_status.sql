-- job_applications_update's USING clause lets the applicant update their own
-- row (originally intended for a future "withdraw application" feature and
-- to let the AI match-scoring server function write ats_score/job_match_percentage/
-- skills_score on the applicant's own session) — but nothing stopped the
-- applicant from also setting `status` to 'shortlisted'/'selected'/'hired'
-- themselves. Only recruiters/admins may change status; applicants may still
-- update their own row's other columns (e.g. the scoring columns, cover_note).
create or replace function public.guard_job_application_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_is_recruiter boolean;
begin
  select company_id into v_company_id from jobs where id = new.job_id;
  v_is_recruiter := public.is_admin() or public.has_company_role(v_company_id, array['owner', 'admin', 'recruiter']);
  if not v_is_recruiter and new.status is distinct from old.status then
    raise exception 'Only recruiters can change an application''s status.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_job_application_update on job_applications;
create trigger trg_guard_job_application_update before update on job_applications
  for each row execute function public.guard_job_application_update();
