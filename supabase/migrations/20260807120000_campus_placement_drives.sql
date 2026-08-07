-- =====================================================================
-- Sprint 26: AI Campus Placement Drive System
--
-- A genuinely new actor type — confirmed via research that no college/
-- institution concept exists anywhere in the schema today (profiles.college
-- is free text, no FK). Mirrors the companies/company_members pattern from
-- Sprint 25 exactly (colleges/college_admins + has_college_role()), since
-- that pattern is this codebase's established convention for "an
-- organization with member-based RLS-gated write access."
--
-- Drives are owned by a college (not a company) even though they reference
-- a company/role — this is why placement_drives is a new table rather than
-- reusing Sprint 25's `jobs` (company-owned, no eligibility-criteria
-- concept, no test/interview-date fields, no max-applicants cap).
-- drive_applications is likewise separate from job_applications: campus
-- drive eligibility is CGPA/branch/year-based, not skill-tag-based.
-- =====================================================================

-- ---------------------------------------------------------------------
-- New account type: 'college' alongside existing 'student'/'company'.
-- ---------------------------------------------------------------------
alter table profiles drop constraint if exists profiles_account_type_check;
alter table profiles add constraint profiles_account_type_check
  check (account_type in ('student', 'company', 'college'));

-- CGPA doesn't exist anywhere in the schema (confirmed) — needed for
-- drive eligibility criteria alongside the already-existing branch/
-- graduation_year/year_of_study columns.
alter table profiles add column if not exists cgpa numeric;

-- ---------------------------------------------------------------------
-- colleges / college_admins (mirrors companies / company_members)
-- ---------------------------------------------------------------------
create table if not exists colleges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  website text,
  verified boolean not null default false,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists college_admins (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references colleges (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  role text not null default 'admin',
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  unique (college_id, profile_id)
);
alter table college_admins drop constraint if exists college_admins_role_check;
alter table college_admins add constraint college_admins_role_check
  check (role in ('owner', 'admin'));

create index if not exists college_admins_profile_idx on college_admins (profile_id);
create index if not exists college_admins_college_idx on college_admins (college_id);

create or replace function public.has_college_role(p_college_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from college_admins
    where college_id = p_college_id and profile_id = auth.uid() and role = any(p_roles)
  );
$$;

-- ---------------------------------------------------------------------
-- placement_drives
-- ---------------------------------------------------------------------
create table if not exists placement_drives (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references colleges (id) on delete cascade,
  company_id uuid references companies (id) on delete set null,
  company_name_override text,
  role text not null,
  package_min numeric,
  package_max numeric,
  currency text not null default 'INR',
  location text,
  employment_type text,
  min_cgpa numeric,
  allowed_branches text[] not null default '{}',
  allowed_graduation_years int[] not null default '{}',
  min_year_of_study int,
  eligibility_notes text,
  application_deadline timestamptz,
  test_date timestamptz,
  interview_date timestamptz,
  max_applicants int,
  status text not null default 'draft',
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);
alter table placement_drives drop constraint if exists placement_drives_status_check;
alter table placement_drives add constraint placement_drives_status_check
  check (status in ('draft', 'published', 'paused', 'closed'));

create index if not exists placement_drives_college_idx on placement_drives (college_id, status);

-- ---------------------------------------------------------------------
-- drive_applications
-- ---------------------------------------------------------------------
create table if not exists drive_applications (
  id uuid primary key default gen_random_uuid(),
  drive_id uuid not null references placement_drives (id) on delete cascade,
  student_id uuid not null references profiles (id) on delete cascade,
  status text not null default 'applied',
  ai_fit_score numeric,
  eligibility_snapshot jsonb not null default '{}'::jsonb,
  applied_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  unique (drive_id, student_id)
);
alter table drive_applications drop constraint if exists drive_applications_status_check;
alter table drive_applications add constraint drive_applications_status_check
  check (status in ('applied', 'shortlisted', 'interview_scheduled', 'selected', 'rejected', 'withdrawn'));

create index if not exists drive_applications_drive_idx on drive_applications (drive_id);
create index if not exists drive_applications_student_idx on drive_applications (student_id);

-- ---------------------------------------------------------------------
-- drive_shortlists — per-round shortlist events, distinct from the single
-- current-state `drive_applications.status` (a drive can shortlist for a
-- test round, then again for an interview round; this keeps that history).
-- ---------------------------------------------------------------------
create table if not exists drive_shortlists (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references drive_applications (id) on delete cascade,
  stage text not null default 'shortlisted',
  fit_score numeric,
  notes text,
  shortlisted_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table drive_shortlists drop constraint if exists drive_shortlists_stage_check;
alter table drive_shortlists add constraint drive_shortlists_stage_check
  check (stage in ('shortlisted', 'interview', 'selected'));

create index if not exists drive_shortlists_application_idx on drive_shortlists (application_id);

-- ---------------------------------------------------------------------
-- drive_notifications — drive-scoped notification log (application
-- submitted/shortlisted/rejected/interview scheduled/drive closed).
-- Populated by triggers below, which also fan out into the existing
-- generic `notifications` table (widened with a 'drive_update' type) so
-- these events still surface in the app's one notification bell/feed —
-- this table exists for drive-scoped querying/audit, not to fragment the
-- unified notification UX.
-- ---------------------------------------------------------------------
create table if not exists drive_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles (id) on delete cascade,
  drive_id uuid references placement_drives (id) on delete cascade,
  application_id uuid references drive_applications (id) on delete cascade,
  type text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table drive_notifications drop constraint if exists drive_notifications_type_check;
alter table drive_notifications add constraint drive_notifications_type_check
  check (type in ('application_submitted', 'shortlisted', 'rejected', 'interview_scheduled', 'drive_closed'));

create index if not exists drive_notifications_recipient_idx
  on drive_notifications (recipient_id, created_at desc);

alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in (
    'like', 'comment', 'friend_request', 'friend_accept', 'message',
    'resume_analysis', 'coding_test', 'mock_interview', 'challenge_completion',
    'job_update', 'profile_update', 'system', 'job_invite', 'interview', 'company_post',
    'drive_update'
  ));

-- ---------------------------------------------------------------------
-- Triggers: drive_applications status change -> drive_notifications +
-- generic notifications (mirrors on_job_application_status_change).
-- ---------------------------------------------------------------------
create or replace function public.on_drive_application_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_drive_type text;
  v_message text;
begin
  if tg_op = 'UPDATE' and new.status <> old.status then
    select role into v_role from placement_drives where id = new.drive_id;
    v_drive_type := case new.status
      when 'shortlisted' then 'shortlisted'
      when 'rejected' then 'rejected'
      when 'interview_scheduled' then 'interview_scheduled'
      else null
    end;
    if v_drive_type is not null then
      v_message := 'Your application for "' || coalesce(v_role, 'a drive') || '" is now ' || new.status;
      insert into drive_notifications (recipient_id, drive_id, application_id, type, message)
      values (new.student_id, new.drive_id, new.id, v_drive_type, v_message);
      perform public.create_notification(new.student_id, auth.uid(), 'drive_update', v_message, 'drive_application', new.id);
    end if;
  end if;
  if tg_op = 'INSERT' then
    select role into v_role from placement_drives where id = new.drive_id;
    v_message := 'Application submitted for "' || coalesce(v_role, 'a drive') || '".';
    insert into drive_notifications (recipient_id, drive_id, application_id, type, message)
    values (new.student_id, new.drive_id, new.id, 'application_submitted', v_message);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_drive_application_status_notify on drive_applications;
create trigger trg_drive_application_status_notify after insert or update on drive_applications
  for each row execute function public.on_drive_application_status_change();

-- Drive closed -> notify every applicant.
create or replace function public.on_drive_closed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app record;
  v_message text;
begin
  if tg_op = 'UPDATE' and new.status = 'closed' and old.status <> 'closed' then
    v_message := 'The "' || coalesce(new.role, 'drive') || '" placement drive has closed.';
    for v_app in select id, student_id from drive_applications where drive_id = new.id loop
      insert into drive_notifications (recipient_id, drive_id, application_id, type, message)
      values (v_app.student_id, new.id, v_app.id, 'drive_closed', v_message);
      perform public.create_notification(v_app.student_id, auth.uid(), 'drive_update', v_message, 'placement_drive', new.id);
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_drive_closed_notify on placement_drives;
create trigger trg_drive_closed_notify after update on placement_drives
  for each row execute function public.on_drive_closed();

-- ---------------------------------------------------------------------
-- RLS — same has_college_role-gated shape as Sprint 25's has_company_role
-- policies.
-- ---------------------------------------------------------------------
alter table colleges enable row level security;
alter table college_admins enable row level security;
alter table placement_drives enable row level security;
alter table drive_applications enable row level security;
alter table drive_shortlists enable row level security;
alter table drive_notifications enable row level security;

drop policy if exists colleges_select_all on colleges;
create policy colleges_select_all on colleges for select to authenticated using (true);
drop policy if exists colleges_owner_insert on colleges;
create policy colleges_owner_insert on colleges for insert to authenticated
  with check (created_by = auth.uid());
drop policy if exists colleges_owner_update on colleges;
create policy colleges_owner_update on colleges for update to authenticated
  using (public.has_college_role(id, array['owner', 'admin']) or public.is_admin());

drop policy if exists college_admins_visible on college_admins;
create policy college_admins_visible on college_admins for select to authenticated
  using (profile_id = auth.uid() or public.has_college_role(college_id, array['owner', 'admin']) or public.is_admin());
drop policy if exists college_admins_owner_write on college_admins;
create policy college_admins_owner_write on college_admins for all to authenticated
  using (public.has_college_role(college_id, array['owner', 'admin']) or public.is_admin() or profile_id = auth.uid())
  with check (public.has_college_role(college_id, array['owner', 'admin']) or public.is_admin() or profile_id = auth.uid());

drop policy if exists placement_drives_select_visible on placement_drives;
create policy placement_drives_select_visible on placement_drives for select to authenticated
  using (status = 'published' or public.has_college_role(college_id, array['owner', 'admin']) or public.is_admin());
drop policy if exists placement_drives_admin_write on placement_drives;
create policy placement_drives_admin_write on placement_drives for all to authenticated
  using (public.has_college_role(college_id, array['owner', 'admin']) or public.is_admin())
  with check (public.has_college_role(college_id, array['owner', 'admin']) or public.is_admin());

drop policy if exists drive_applications_visible on drive_applications;
create policy drive_applications_visible on drive_applications for select to authenticated
  using (
    student_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from placement_drives pd where pd.id = drive_applications.drive_id
        and public.has_college_role(pd.college_id, array['owner', 'admin'])
    )
  );
drop policy if exists drive_applications_student_insert on drive_applications;
create policy drive_applications_student_insert on drive_applications for insert to authenticated
  with check (student_id = auth.uid());
drop policy if exists drive_applications_update on drive_applications;
create policy drive_applications_update on drive_applications for update to authenticated
  using (
    student_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from placement_drives pd where pd.id = drive_applications.drive_id
        and public.has_college_role(pd.college_id, array['owner', 'admin'])
    )
  );

drop policy if exists drive_shortlists_visible on drive_shortlists;
create policy drive_shortlists_visible on drive_shortlists for select to authenticated
  using (exists (
    select 1 from drive_applications da
    join placement_drives pd on pd.id = da.drive_id
    where da.id = drive_shortlists.application_id
      and (da.student_id = auth.uid() or public.has_college_role(pd.college_id, array['owner', 'admin']))
  ) or public.is_admin());
drop policy if exists drive_shortlists_admin_insert on drive_shortlists;
create policy drive_shortlists_admin_insert on drive_shortlists for insert to authenticated
  with check (exists (
    select 1 from drive_applications da
    join placement_drives pd on pd.id = da.drive_id
    where da.id = drive_shortlists.application_id
      and public.has_college_role(pd.college_id, array['owner', 'admin'])
  ));

drop policy if exists drive_notifications_recipient_select on drive_notifications;
create policy drive_notifications_recipient_select on drive_notifications for select to authenticated
  using (recipient_id = auth.uid() or public.is_admin());
drop policy if exists drive_notifications_recipient_update on drive_notifications;
create policy drive_notifications_recipient_update on drive_notifications for update to authenticated
  using (recipient_id = auth.uid());
-- No direct insert policy: rows are written only by the security-definer
-- trigger functions above.
