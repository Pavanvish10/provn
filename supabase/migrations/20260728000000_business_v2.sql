-- =====================================================================
-- PROVN Business v2: richer jobs, feed distribution, follows, saves,
-- invitations, AI match scores, interview responses, live resume, and
-- a distinct company/student account_type for routing.
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles: account_type (routes business signups into their own
-- onboarding) + cached Live Resume export.
-- ---------------------------------------------------------------------
alter table profiles
  add column if not exists account_type text not null default 'student',
  add column if not exists live_resume_pdf_url text,
  add column if not exists live_resume_updated_at timestamptz;

alter table profiles drop constraint if exists profiles_account_type_check;
alter table profiles
  add constraint profiles_account_type_check check (account_type in ('student', 'company'));

-- Auto-profile trigger now also carries account_type from signup metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, account_type)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'account_type', 'student')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- jobs: full posting fields + feed distribution link
-- ---------------------------------------------------------------------
alter table jobs
  add column if not exists department text,
  add column if not exists work_mode text,
  add column if not exists experience_level text,
  add column if not exists responsibilities text,
  add column if not exists requirements text,
  add column if not exists benefits text,
  add column if not exists application_deadline date,
  add column if not exists openings_count int not null default 1,
  add column if not exists published_at timestamptz,
  add column if not exists feed_post_id uuid references posts (id) on delete set null;

alter table jobs drop constraint if exists jobs_work_mode_check;
alter table jobs add constraint jobs_work_mode_check
  check (work_mode is null or work_mode in ('remote', 'hybrid', 'office'));

-- ---------------------------------------------------------------------
-- job_applications: add "selected" stage + persisted AI match scores
-- ---------------------------------------------------------------------
alter table job_applications drop constraint if exists job_applications_status_check;
alter table job_applications add constraint job_applications_status_check
  check (status in ('applied', 'viewed', 'shortlisted', 'interview', 'selected', 'rejected', 'hired'));

alter table job_applications
  add column if not exists ats_score numeric,
  add column if not exists job_match_percentage numeric,
  add column if not exists skills_score numeric;

-- ---------------------------------------------------------------------
-- company follows (students follow companies)
-- ---------------------------------------------------------------------
create table if not exists company_follows (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (company_id, profile_id)
);
create index if not exists company_follows_company_idx on company_follows (company_id);
create index if not exists company_follows_profile_idx on company_follows (profile_id);

-- ---------------------------------------------------------------------
-- job saves (student bookmarks a job)
-- ---------------------------------------------------------------------
create table if not exists job_saves (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (job_id, profile_id)
);
create index if not exists job_saves_profile_idx on job_saves (profile_id);

-- ---------------------------------------------------------------------
-- job invitations ("Best Matching Students" -> Invite to Apply)
-- ---------------------------------------------------------------------
create table if not exists job_invitations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  invited_by uuid references profiles (id) on delete set null,
  status text not null default 'invited',
  created_at timestamptz not null default now(),
  unique (job_id, profile_id)
);
alter table job_invitations drop constraint if exists job_invitations_status_check;
alter table job_invitations add constraint job_invitations_status_check
  check (status in ('invited', 'viewed', 'applied', 'declined'));
create index if not exists job_invitations_job_idx on job_invitations (job_id);
create index if not exists job_invitations_profile_idx on job_invitations (profile_id);

-- ---------------------------------------------------------------------
-- interview_schedules: student response + richer scheduling fields
-- ---------------------------------------------------------------------
alter table interview_schedules
  add column if not exists interviewer_name text,
  add column if not exists meeting_link text,
  add column if not exists status text not null default 'proposed',
  add column if not exists responded_at timestamptz;

alter table interview_schedules drop constraint if exists interview_schedules_status_check;
alter table interview_schedules add constraint interview_schedules_status_check
  check (status in ('proposed', 'accepted', 'declined', 'reschedule_requested'));

-- ---------------------------------------------------------------------
-- notifications: widen allowed types for the new business events
-- ---------------------------------------------------------------------
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check check (type in (
  'like', 'comment', 'friend_request', 'friend_accept', 'message',
  'resume_analysis', 'coding_test', 'mock_interview', 'challenge_completion',
  'job_update', 'profile_update', 'system', 'job_invite', 'interview', 'company_post'
));

-- ---------------------------------------------------------------------
-- Notify followers when a job is published (status -> open for the
-- first time), and stamp published_at.
-- ---------------------------------------------------------------------
create or replace function public.on_job_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_name text;
  v_follower record;
begin
  if new.status = 'open' and (tg_op = 'INSERT' or old.status <> 'open') then
    if new.published_at is null then
      update jobs set published_at = now() where id = new.id;
    end if;
    select company_name into v_company_name from companies where id = new.company_id;
    for v_follower in
      select profile_id from company_follows where company_id = new.company_id
    loop
      perform public.create_notification(v_follower.profile_id, null, 'company_post',
        coalesce(v_company_name, 'A company you follow') || ' posted a new job: ' || new.title,
        'job', new.id);
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_job_published on jobs;
create trigger trg_job_published after insert or update on jobs
  for each row execute function public.on_job_published();

-- Notify a student when invited to apply.
create or replace function public.on_job_invitation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
begin
  select title into v_title from jobs where id = new.job_id;
  perform public.create_notification(new.profile_id, new.invited_by, 'job_invite',
    'You were invited to apply for "' || coalesce(v_title, 'a role') || '"', 'job', new.job_id);
  return new;
end;
$$;

drop trigger if exists trg_job_invitation_notify on job_invitations;
create trigger trg_job_invitation_notify after insert on job_invitations
  for each row execute function public.on_job_invitation();

-- Notify the applicant when an interview is scheduled or its status changes.
create or replace function public.on_interview_schedule_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_applicant_id uuid;
  v_title text;
begin
  select ja.applicant_id, j.title into v_applicant_id, v_title
  from job_applications ja join jobs j on j.id = ja.job_id
  where ja.id = new.application_id;

  if tg_op = 'INSERT' then
    perform public.create_notification(v_applicant_id, new.created_by, 'interview',
      'Interview scheduled for "' || coalesce(v_title, 'a role') || '"', 'interview_schedule', new.id);
  elsif tg_op = 'UPDATE' and new.status <> old.status then
    perform public.create_notification(v_applicant_id, new.created_by, 'interview',
      'Interview status updated to ' || new.status || ' for "' || coalesce(v_title, 'a role') || '"',
      'interview_schedule', new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_interview_schedule_notify on interview_schedules;
create trigger trg_interview_schedule_notify after insert or update on interview_schedules
  for each row execute function public.on_interview_schedule_change();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table company_follows enable row level security;
alter table job_saves enable row level security;
alter table job_invitations enable row level security;

drop policy if exists company_follows_select_all on company_follows;
create policy company_follows_select_all on company_follows for select to authenticated using (true);
drop policy if exists company_follows_owner_insert on company_follows;
create policy company_follows_owner_insert on company_follows for insert to authenticated
  with check (profile_id = auth.uid());
drop policy if exists company_follows_owner_delete on company_follows;
create policy company_follows_owner_delete on company_follows for delete to authenticated
  using (profile_id = auth.uid());

drop policy if exists job_saves_owner_all on job_saves;
create policy job_saves_owner_all on job_saves for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists job_invitations_visible on job_invitations;
create policy job_invitations_visible on job_invitations for select to authenticated
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from jobs j where j.id = job_invitations.job_id
        and public.has_company_role(j.company_id, array['owner', 'admin', 'recruiter'])
    )
  );
drop policy if exists job_invitations_recruiter_insert on job_invitations;
create policy job_invitations_recruiter_insert on job_invitations for insert to authenticated
  with check (exists (
    select 1 from jobs j where j.id = job_invitations.job_id
      and public.has_company_role(j.company_id, array['owner', 'admin', 'recruiter'])
  ));
drop policy if exists job_invitations_student_update on job_invitations;
create policy job_invitations_student_update on job_invitations for update to authenticated
  using (profile_id = auth.uid());

-- Realtime for the new business tables (mirrors the pattern used for social feed).
do $$
declare
  t text;
begin
  foreach t in array array['company_follows', 'job_invitations', 'jobs']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;
