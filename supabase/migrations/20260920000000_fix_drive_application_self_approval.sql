-- =====================================================================
-- Sprint 26 authorization fixes (post-hoc audit, see .claude/project-
-- history.md for full context). Two separate issues in
-- 20260807120000_campus_placement_drives.sql:
--
-- 1. drive_applications let a student change ANY column on
--    their own row, not just withdraw.
--
-- drive_applications_update (20260807120000_campus_placement_drives.sql)
-- only checked `student_id = auth.uid() OR is_admin() OR college admin`
-- with no WITH CHECK restricting which columns/values a plain applicant
-- may write. Since this app's convention (matching Sprint 25's
-- job_applications_update, which has the identical shape) is to call
-- Supabase directly from the browser under RLS with no server-side
-- re-check, a signed-in student could call:
--   supabase.from('drive_applications')
--     .update({ status: 'selected', ai_fit_score: 100 })
--     .eq('id', myApplicationId)
-- directly and it would succeed — self-approving/self-shortlisting for
-- a campus drive and forging their own AI fit score, bypassing the
-- college admin entirely. rejectApplicantFn (college.server.ts) also had
-- no app-level role check and relied solely on this same RLS policy, so
-- a student could reject their own application in place of withdrawing.
--
-- Fix: a BEFORE UPDATE trigger (not just a WITH CHECK) so OLD values are
-- unambiguously available. Non-privileged callers (i.e. not an admin and
-- not a college admin of the drive's college) may only flip status to
-- 'withdrawn' and may not touch any other column. College admins/platform
-- admins are unaffected. This also closes the same gap for
-- generateMissingSkillSuggestionsFn's status='rejected' precondition and
-- rejectApplicantFn, since both now require a real college-admin/admin
-- caller to ever reach status = 'rejected'.
--
-- drive_notifications had the same shape of gap on its recipient update
-- policy (a user could rewrite their own notification's message/type),
-- fixed the same way, scoped to the one legitimate field (is_read).
--
-- 2. college_admins_owner_write was a blanket `for all` policy whose
--    WITH CHECK accepted `profile_id = auth.uid()` unconditionally. That
--    lets ANY authenticated user INSERT themselves as 'owner' (or
--    'admin') into an EXISTING college's college_admins — or UPDATE their
--    own row to change college_id/role — fully hijacking that college's
--    placement drives and its real students' data (CSV export of PII,
--    shortlist/reject). The self-service path is only meant to cover
--    useCreateCollege's bootstrap (a user creating a brand-new college
--    immediately adds themselves as its first owner) — fixed by scoping
--    the self-insert clause to "this college has zero admins yet" and
--    role = 'owner' only, and dropping the self-service clause entirely
--    from update/delete (only an existing owner/admin or platform admin
--    may modify membership after that point).
-- =====================================================================

create or replace function public.enforce_drive_application_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_privileged boolean;
begin
  v_is_privileged := public.is_admin() or exists (
    select 1 from placement_drives pd
    where pd.id = new.drive_id
      and public.has_college_role(pd.college_id, array['owner', 'admin'])
  );

  if v_is_privileged then
    return new;
  end if;

  if new.status is distinct from 'withdrawn'
     or old.ai_fit_score is distinct from new.ai_fit_score
     or old.eligibility_snapshot is distinct from new.eligibility_snapshot
     or old.drive_id is distinct from new.drive_id
     or old.student_id is distinct from new.student_id
     or old.applied_at is distinct from new.applied_at
  then
    raise exception 'Only a college admin may change an application''s status or score; students may only withdraw.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_drive_application_update on drive_applications;
create trigger trg_enforce_drive_application_update before update on drive_applications
  for each row execute function public.enforce_drive_application_update();

create or replace function public.enforce_drive_notification_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.recipient_id is distinct from new.recipient_id
     or old.drive_id is distinct from new.drive_id
     or old.application_id is distinct from new.application_id
     or old.type is distinct from new.type
     or old.message is distinct from new.message
     or old.created_at is distinct from new.created_at
  then
    raise exception 'Recipients may only mark a notification as read.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_drive_notification_update on drive_notifications;
create trigger trg_enforce_drive_notification_update before update on drive_notifications
  for each row execute function public.enforce_drive_notification_update();

-- ---------------------------------------------------------------------
-- college_admins: replace the blanket self-service `for all` policy with
-- three narrower ones (insert / update / delete), closing the
-- join-any-existing-college hole while preserving useCreateCollege's
-- legitimate bootstrap flow.
-- ---------------------------------------------------------------------
drop policy if exists college_admins_owner_write on college_admins;

create policy college_admins_bootstrap_or_admin_insert on college_admins for insert to authenticated
  with check (
    public.has_college_role(college_id, array['owner', 'admin'])
    or public.is_admin()
    or (
      profile_id = auth.uid()
      and role = 'owner'
      and not exists (
        select 1 from college_admins ca2 where ca2.college_id = college_admins.college_id
      )
    )
  );

create policy college_admins_admin_update on college_admins for update to authenticated
  using (public.has_college_role(college_id, array['owner', 'admin']) or public.is_admin())
  with check (public.has_college_role(college_id, array['owner', 'admin']) or public.is_admin());

create policy college_admins_admin_delete on college_admins for delete to authenticated
  using (public.has_college_role(college_id, array['owner', 'admin']) or public.is_admin());
