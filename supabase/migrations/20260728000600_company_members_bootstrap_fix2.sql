-- The previous bootstrap-insert policy's `not exists (select ... from
-- company_members ...)` subquery is itself subject to company_members' own
-- SELECT RLS policy, which hides other members' rows from a user with no
-- role in that company — so the "no members yet" check always looked true
-- to an outsider, letting anyone self-insert as a second "owner" of an
-- already-owned company. Use a SECURITY DEFINER helper (bypasses RLS) instead.
create or replace function public.company_has_any_members(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from company_members where company_id = p_company_id);
$$;

drop policy if exists company_members_insert on company_members;
create policy company_members_insert on company_members for insert to authenticated
  with check (
    public.has_company_role(company_id, array['owner', 'admin'])
    or public.is_admin()
    or (
      profile_id = auth.uid()
      and role = 'owner'
      and not public.company_has_any_members(company_id)
    )
  );

drop function if exists public.debug_list_policies(text);
