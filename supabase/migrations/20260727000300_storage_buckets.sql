-- =====================================================================
-- PROVN storage buckets: resumes, avatars, post images, company logos
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('resumes', 'resumes', false, 10485760, array['application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('avatars', 'avatars', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('post-images', 'post-images', true, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('company-logos', 'company-logos', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

-- Convention: object path is always `${auth.uid()}/...` for owner-scoped
-- buckets (resumes, avatars), so ownership can be checked from the path.

drop policy if exists resumes_owner_rw on storage.objects;
create policy resumes_owner_rw on storage.objects for all to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists resumes_recruiter_read on storage.objects;
create policy resumes_recruiter_read on storage.objects for select to authenticated
  using (
    bucket_id = 'resumes'
    and (
      public.is_admin()
      or exists (
        select 1 from job_applications ja
        join jobs j on j.id = ja.job_id
        where ja.applicant_id::text = (storage.foldername(name))[1]
          and public.has_company_role(j.company_id, array['owner', 'admin', 'recruiter'])
      )
    )
  );

drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects for select to public
  using (bucket_id = 'avatars');
drop policy if exists avatars_owner_write on storage.objects;
create policy avatars_owner_write on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists avatars_owner_update on storage.objects;
create policy avatars_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists avatars_owner_delete on storage.objects;
create policy avatars_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists post_images_public_read on storage.objects;
create policy post_images_public_read on storage.objects for select to public
  using (bucket_id = 'post-images');
drop policy if exists post_images_owner_write on storage.objects;
create policy post_images_owner_write on storage.objects for insert to authenticated
  with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists post_images_owner_delete on storage.objects;
create policy post_images_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists company_logos_public_read on storage.objects;
create policy company_logos_public_read on storage.objects for select to public
  using (bucket_id = 'company-logos');
drop policy if exists company_logos_member_write on storage.objects;
create policy company_logos_member_write on storage.objects for insert to authenticated
  with check (
    bucket_id = 'company-logos'
    and public.has_company_role((storage.foldername(name))[1]::uuid, array['owner', 'admin'])
  );
drop policy if exists company_logos_member_update on storage.objects;
create policy company_logos_member_update on storage.objects for update to authenticated
  using (
    bucket_id = 'company-logos'
    and public.has_company_role((storage.foldername(name))[1]::uuid, array['owner', 'admin'])
  );
