-- Students need to update their own interview_schedules row (accept/decline/
-- request another time) — this policy was missing, blocking /my-interviews.
drop policy if exists interview_schedules_applicant_update on interview_schedules;
create policy interview_schedules_applicant_update on interview_schedules for update to authenticated
  using (exists (
    select 1 from job_applications ja
    where ja.id = interview_schedules.application_id and ja.applicant_id = auth.uid()
  ));
