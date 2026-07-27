-- =====================================================================
-- PROVN companies / jobs / recruiting / admin / premium
-- =====================================================================

-- ---------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------
alter table companies
  add column if not exists website text,
  add column if not exists industry text,
  add column if not exists company_size text,
  add column if not exists location text,
  add column if not exists verified boolean not null default false,
  add column if not exists created_by uuid references profiles (id) on delete set null,
  add column if not exists created_at timestamptz not null default now();

create table if not exists company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  role text not null default 'recruiter',
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  unique (company_id, profile_id)
);
alter table company_members drop constraint if exists company_members_role_check;
alter table company_members add constraint company_members_role_check
  check (role in ('owner', 'admin', 'recruiter'));

create index if not exists company_members_profile_idx on company_members (profile_id);
create index if not exists company_members_company_idx on company_members (company_id);

create or replace function public.has_company_role(p_company_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from company_members
    where company_id = p_company_id and profile_id = auth.uid() and role = any(p_roles)
  );
$$;

-- ---------------------------------------------------------------------
-- jobs (rename from the original bare job_roles table + enrich)
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'job_roles')
     and not exists (select 1 from information_schema.tables where table_name = 'jobs') then
    alter table job_roles rename to jobs;
  end if;
end $$;

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies (id) on delete cascade,
  description text,
  created_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1 from information_schema.columns where table_name = 'jobs' and column_name = 'role_name'
  ) and not exists (
    select 1 from information_schema.columns where table_name = 'jobs' and column_name = 'title'
  ) then
    alter table jobs rename column role_name to title;
  end if;
end $$;

alter table jobs add column if not exists title text;
alter table jobs
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists employment_type text,
  add column if not exists location text,
  add column if not exists salary_min int,
  add column if not exists salary_max int,
  add column if not exists currency text not null default 'INR',
  add column if not exists tags text[] not null default '{}',
  add column if not exists status text not null default 'open',
  add column if not exists created_by uuid references profiles (id) on delete set null,
  add column if not exists posted_at timestamptz not null default now(),
  add column if not exists closed_at timestamptz;

alter table jobs drop constraint if exists jobs_status_check;
alter table jobs add constraint jobs_status_check
  check (status in ('draft', 'open', 'paused', 'closed'));

create index if not exists jobs_company_idx on jobs (company_id);
create index if not exists jobs_status_idx on jobs (status);

-- ---------------------------------------------------------------------
-- job applications + interview scheduling
-- ---------------------------------------------------------------------
create table if not exists job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  applicant_id uuid not null references profiles (id) on delete cascade,
  status text not null default 'applied',
  cover_note text,
  applied_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, applicant_id)
);
alter table job_applications drop constraint if exists job_applications_status_check;
alter table job_applications add constraint job_applications_status_check
  check (status in ('applied', 'viewed', 'shortlisted', 'interview', 'rejected', 'hired'));

create table if not exists interview_schedules (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references job_applications (id) on delete cascade,
  scheduled_at timestamptz not null,
  mode text not null default 'video',
  notes text,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists job_applications_job_idx on job_applications (job_id);
create index if not exists job_applications_applicant_idx on job_applications (applicant_id);
create index if not exists interview_schedules_application_idx on interview_schedules (application_id);

create or replace function public.on_job_application_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
begin
  if tg_op = 'UPDATE' and new.status <> old.status then
    select title into v_title from jobs where id = new.job_id;
    perform public.create_notification(new.applicant_id, new.applicant_id, 'job_update',
      'Your application for "' || coalesce(v_title, 'a role') || '" is now ' || new.status,
      'job_application', new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_application_status_notify on job_applications;
create trigger trg_application_status_notify after update on job_applications
  for each row execute function public.on_job_application_status_change();

-- ---------------------------------------------------------------------
-- admin: audit log + user reports/moderation
-- ---------------------------------------------------------------------
create table if not exists admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references profiles (id) on delete cascade,
  action text not null,
  target_type text not null,
  target_id uuid,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles (id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  status text not null default 'open',
  reviewed_by uuid references profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table reports drop constraint if exists reports_target_type_check;
alter table reports add constraint reports_target_type_check
  check (target_type in ('post', 'comment', 'user', 'company', 'job'));
alter table reports drop constraint if exists reports_status_check;
alter table reports add constraint reports_status_check
  check (status in ('open', 'reviewed', 'dismissed', 'actioned'));

create index if not exists reports_status_idx on reports (status);

-- ---------------------------------------------------------------------
-- premium membership (entitlement state; payment wiring deferred)
-- ---------------------------------------------------------------------
create table if not exists premium_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles (id) on delete cascade,
  plan text not null default 'free',
  status text not null default 'active',
  started_at timestamptz not null default now(),
  current_period_end timestamptz,
  payment_provider text,
  external_reference text,
  updated_at timestamptz not null default now()
);
alter table premium_subscriptions drop constraint if exists premium_subscriptions_plan_check;
alter table premium_subscriptions add constraint premium_subscriptions_plan_check
  check (plan in ('free', 'premium'));
alter table premium_subscriptions drop constraint if exists premium_subscriptions_status_check;
alter table premium_subscriptions add constraint premium_subscriptions_status_check
  check (status in ('active', 'canceled', 'expired'));

create or replace function public.is_premium(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from premium_subscriptions
    where profile_id = p_profile_id and plan = 'premium' and status = 'active'
      and (current_period_end is null or current_period_end > now())
  );
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table companies enable row level security;
alter table company_members enable row level security;
alter table jobs enable row level security;
alter table job_applications enable row level security;
alter table interview_schedules enable row level security;
alter table admin_actions enable row level security;
alter table reports enable row level security;
alter table premium_subscriptions enable row level security;

drop policy if exists companies_select_visible on companies;
create policy companies_select_visible on companies for select to authenticated
  using (
    verified
    or created_by = auth.uid()
    or public.is_admin()
    or exists (select 1 from company_members cm where cm.company_id = companies.id and cm.profile_id = auth.uid())
  );
drop policy if exists companies_authenticated_insert on companies;
create policy companies_authenticated_insert on companies for insert to authenticated
  with check (created_by = auth.uid());
drop policy if exists companies_owner_update on companies;
create policy companies_owner_update on companies for update to authenticated
  using (public.has_company_role(id, array['owner', 'admin']) or public.is_admin());

drop policy if exists company_members_visible on company_members;
create policy company_members_visible on company_members for select to authenticated
  using (profile_id = auth.uid() or public.has_company_role(company_id, array['owner', 'admin', 'recruiter']) or public.is_admin());
drop policy if exists company_members_owner_write on company_members;
create policy company_members_owner_write on company_members for all to authenticated
  using (public.has_company_role(company_id, array['owner', 'admin']) or public.is_admin())
  with check (public.has_company_role(company_id, array['owner', 'admin']) or public.is_admin());

drop policy if exists jobs_select_visible on jobs;
create policy jobs_select_visible on jobs for select to authenticated
  using (status = 'open' or public.has_company_role(company_id, array['owner', 'admin', 'recruiter']) or public.is_admin());
drop policy if exists jobs_recruiter_write on jobs;
create policy jobs_recruiter_write on jobs for all to authenticated
  using (public.has_company_role(company_id, array['owner', 'admin', 'recruiter']) or public.is_admin())
  with check (public.has_company_role(company_id, array['owner', 'admin', 'recruiter']) or public.is_admin());

drop policy if exists job_applications_visible on job_applications;
create policy job_applications_visible on job_applications for select to authenticated
  using (
    applicant_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from jobs j where j.id = job_applications.job_id
        and public.has_company_role(j.company_id, array['owner', 'admin', 'recruiter'])
    )
  );
drop policy if exists job_applications_applicant_insert on job_applications;
create policy job_applications_applicant_insert on job_applications for insert to authenticated
  with check (applicant_id = auth.uid());
drop policy if exists job_applications_update on job_applications;
create policy job_applications_update on job_applications for update to authenticated
  using (
    applicant_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from jobs j where j.id = job_applications.job_id
        and public.has_company_role(j.company_id, array['owner', 'admin', 'recruiter'])
    )
  );

drop policy if exists interview_schedules_visible on interview_schedules;
create policy interview_schedules_visible on interview_schedules for select to authenticated
  using (exists (
    select 1 from job_applications ja
    join jobs j on j.id = ja.job_id
    where ja.id = interview_schedules.application_id
      and (ja.applicant_id = auth.uid() or public.has_company_role(j.company_id, array['owner', 'admin', 'recruiter']))
  ) or public.is_admin());
drop policy if exists interview_schedules_recruiter_write on interview_schedules;
create policy interview_schedules_recruiter_write on interview_schedules for insert to authenticated
  with check (exists (
    select 1 from job_applications ja
    join jobs j on j.id = ja.job_id
    where ja.id = interview_schedules.application_id
      and public.has_company_role(j.company_id, array['owner', 'admin', 'recruiter'])
  ));

drop policy if exists admin_actions_admin_only on admin_actions;
create policy admin_actions_admin_only on admin_actions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists reports_reporter_insert on reports;
create policy reports_reporter_insert on reports for insert to authenticated with check (reporter_id = auth.uid());
drop policy if exists reports_visible on reports;
create policy reports_visible on reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());
drop policy if exists reports_admin_update on reports;
create policy reports_admin_update on reports for update to authenticated using (public.is_admin());

drop policy if exists premium_subscriptions_owner_select on premium_subscriptions;
create policy premium_subscriptions_owner_select on premium_subscriptions for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());
drop policy if exists premium_subscriptions_admin_write on premium_subscriptions;
create policy premium_subscriptions_admin_write on premium_subscriptions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Now that jobs/job_applications/company_members exist, add the deferred
-- recruiter resume-visibility policy from the core migration.
drop policy if exists resumes_recruiter_view on resumes;
create policy resumes_recruiter_view on resumes for select to authenticated
  using (
    exists (
      select 1 from job_applications ja
      join jobs j on j.id = ja.job_id
      where ja.applicant_id = resumes.profile_id
        and public.has_company_role(j.company_id, array['owner', 'admin', 'recruiter'])
    )
    or public.is_admin()
  );
