-- =====================================================================
-- Sprint 33: College Management Platform.
--
-- The college side (colleges/placement_drives/drive_applications/
-- college_admins) never got the recruiter side's Sprint-25/27
-- "recruiter tools" pass — no notes table exists for drive applications
-- at all. Everything else this sprint needs (team management via
-- college_admins, analytics via drive_applications/drive_shortlists,
-- student comparison, a student detail drawer) reuses existing schema
-- and RLS with zero migration required — this is the one genuine
-- schema gap.
-- =====================================================================

-- ---------------------------------------------------------------------
-- College staff notes on a drive application — direct mirror of
-- application_notes (job_applications' recruiter-notes table), same
-- shape, same RLS pattern (has_college_role instead of
-- has_company_role, joined through placement_drives instead of jobs).
-- ---------------------------------------------------------------------
create table if not exists drive_application_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references drive_applications (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists drive_application_notes_application_idx
  on drive_application_notes (application_id, created_at asc);

alter table drive_application_notes enable row level security;
drop policy if exists drive_application_notes_college_staff_all on drive_application_notes;
create policy drive_application_notes_college_staff_all on drive_application_notes for all to authenticated
  using (exists (
    select 1 from drive_applications da
    join placement_drives pd on pd.id = da.drive_id
    where da.id = drive_application_notes.application_id
      and public.has_college_role(pd.college_id, array['owner', 'admin'])
  ) or public.is_admin())
  with check (exists (
    select 1 from drive_applications da
    join placement_drives pd on pd.id = da.drive_id
    where da.id = drive_application_notes.application_id
      and public.has_college_role(pd.college_id, array['owner', 'admin'])
  ));

-- ---------------------------------------------------------------------
-- College staff currently have NO way to view a drive applicant's
-- resume at all — resumes_recruiter_view (table) and
-- resumes_recruiter_read (storage.objects) only ever covered
-- job_applications/companies. "Candidate management: resume" is an
-- explicit Sprint 33 requirement, so this closes a real access gap,
-- not a hypothetical one — mirrors both existing recruiter-side
-- policies exactly, scoped through drive_applications/placement_drives
-- instead of job_applications/jobs.
-- ---------------------------------------------------------------------
drop policy if exists resumes_college_staff_view on resumes;
create policy resumes_college_staff_view on resumes for select to authenticated
  using (
    exists (
      select 1 from drive_applications da
      join placement_drives pd on pd.id = da.drive_id
      where da.student_id = resumes.profile_id
        and public.has_college_role(pd.college_id, array['owner', 'admin'])
    )
    or public.is_admin()
  );

drop policy if exists resumes_college_staff_read on storage.objects;
create policy resumes_college_staff_read on storage.objects for select to authenticated
  using (
    bucket_id = 'resumes'
    and (
      public.is_admin()
      or exists (
        select 1 from drive_applications da
        join placement_drives pd on pd.id = da.drive_id
        where da.student_id::text = (storage.foldername(name))[1]
          and public.has_college_role(pd.college_id, array['owner', 'admin'])
      )
    )
  );
