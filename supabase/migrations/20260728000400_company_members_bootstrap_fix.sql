-- company_members_owner_write required has_company_role(company_id, [owner,admin])
-- for INSERT too, which made it impossible to ever insert the FIRST member of a
-- brand-new company (no membership exists yet to grant that permission).
-- Split the policy: reads/updates/deletes still require existing owner/admin
-- membership; inserts additionally allow a user to self-bootstrap as 'owner'
-- of a company that currently has zero members.
drop policy if exists company_members_owner_write on company_members;

-- (SELECT is already covered by the existing `company_members_visible` policy.)

create policy company_members_update_delete on company_members for update to authenticated
  using (public.has_company_role(company_id, array['owner', 'admin']) or public.is_admin());

create policy company_members_delete on company_members for delete to authenticated
  using (public.has_company_role(company_id, array['owner', 'admin']) or public.is_admin());

create policy company_members_insert on company_members for insert to authenticated
  with check (
    public.has_company_role(company_id, array['owner', 'admin'])
    or public.is_admin()
    or (
      profile_id = auth.uid()
      and role = 'owner'
      and not exists (select 1 from company_members cm where cm.company_id = company_members.company_id)
    )
  );
