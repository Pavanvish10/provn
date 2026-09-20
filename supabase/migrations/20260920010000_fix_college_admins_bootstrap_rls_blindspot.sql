-- =====================================================================
-- Fixes a self-referential RLS blind spot in
-- college_admins_bootstrap_or_admin_insert
-- (20260920000000_fix_drive_application_self_approval.sql), found via
-- live throwaway-account exploit testing after 3 separate applications
-- of that migration produced byte-identical, confirmed-correct policy
-- content (verified via pg_policy) yet the exploit still succeeded
-- every time. The SQL was applying correctly; the check's logic itself
-- was wrong.
--
-- That policy's bootstrap clause used a raw, non-security-definer
-- subquery to check "does this college already have any admin":
--   not exists (select 1 from college_admins ca2 where ca2.college_id = ...)
-- That subquery is itself subject to college_admins' own SELECT policy
-- (college_admins_visible: profile_id = auth.uid() OR
-- has_college_role(...) OR is_admin()). A caller with no existing
-- membership in the target college cannot SEE any of its admin rows
-- under RLS -- so from their perspective the college always looks like
-- it has zero admins, even when it genuinely has a real owner. That let
-- anyone self-insert as 'owner' into ANY existing college, because the
-- "only when empty" check could never truthfully return false for an
-- outsider.
--
-- Same class of bug as this codebase's own prior "infinite recursion in
-- conversation_participants RLS policy" incident: a table's RLS policy
-- recursing into that same table's RLS. Fixed the same way it was fixed
-- there, and the same pattern already used everywhere else in this
-- schema (has_company_role / has_college_role): move the existence
-- check into a SECURITY DEFINER function, which evaluates with the
-- function owner's privileges and so sees the table's true state
-- regardless of the calling user's own row visibility.
--
-- Does not touch college_admins_admin_update / college_admins_admin_delete
-- (no self-referential subquery in either -- both already correctly use
-- has_college_role/is_admin only) or anything in
-- 20260920000000_fix_drive_application_self_approval.sql's
-- drive_applications/drive_notifications triggers (independently
-- confirmed live and working via the same exploit test).
-- =====================================================================

create or replace function public.college_has_any_admin(p_college_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from college_admins where college_id = p_college_id);
$$;

drop policy if exists college_admins_bootstrap_or_admin_insert on college_admins;
create policy college_admins_bootstrap_or_admin_insert on college_admins for insert to authenticated
  with check (
    public.has_college_role(college_id, array['owner', 'admin'])
    or public.is_admin()
    or (
      profile_id = auth.uid()
      and role = 'owner'
      and not public.college_has_any_admin(college_id)
    )
  );
