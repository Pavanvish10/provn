-- =====================================================================
-- PROVN core: identity, RBAC helpers, profile enrichment, resume/skills
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles: link to auth.users, add full onboarding + gamification fields
-- ---------------------------------------------------------------------
alter table profiles
  add column if not exists username text,
  add column if not exists avatar_url text,
  add column if not exists bio text,
  add column if not exists target_role text,
  add column if not exists location text,
  add column if not exists github_url text,
  add column if not exists linkedin_url text,
  add column if not exists portfolio_url text,
  add column if not exists xp int not null default 0,
  add column if not exists streak int not null default 0,
  add column if not exists last_activity_date date,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists role text not null default 'user',
  add column if not exists is_banned boolean not null default false,
  add column if not exists is_online boolean not null default false,
  add column if not exists last_seen_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table profiles
  drop constraint if exists profiles_role_check;
alter table profiles
  add constraint profiles_role_check check (role in ('user', 'recruiter', 'company_admin', 'admin'));

alter table profiles alter column id drop default;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'profiles_id_fkey' and table_name = 'profiles'
  ) then
    alter table profiles
      add constraint profiles_id_fkey foreign key (id) references auth.users (id) on delete cascade;
  end if;
end $$;

create unique index if not exists profiles_username_key on profiles (lower(username)) where username is not null;

-- Auto-create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RBAC helper functions used across policies in later migrations.
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------
-- resumes: versioned, permanent storage metadata
-- ---------------------------------------------------------------------
alter table resumes
  add column if not exists file_name text,
  add column if not exists file_size bigint,
  add column if not exists storage_path text,
  add column if not exists version int not null default 1,
  add column if not exists is_current boolean not null default true,
  add column if not exists analysis jsonb,
  add column if not exists analyzed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table resumes drop constraint if exists resumes_profile_id_fkey;
alter table resumes
  add constraint resumes_profile_id_fkey foreign key (profile_id) references profiles (id) on delete cascade;

create index if not exists resumes_profile_id_idx on resumes (profile_id);
create unique index if not exists resumes_one_current_per_profile
  on resumes (profile_id) where is_current;

-- ---------------------------------------------------------------------
-- skills: verified skill ledger
-- ---------------------------------------------------------------------
alter table skills
  add column if not exists source text not null default 'manual',
  add column if not exists verified_at timestamptz,
  add column if not exists created_at timestamptz not null default now();

alter table skills drop constraint if exists skills_source_check;
alter table skills
  add constraint skills_source_check check (source in ('manual', 'resume', 'challenge', 'interview'));

alter table skills drop constraint if exists skills_profile_id_fkey;
alter table skills
  add constraint skills_profile_id_fkey foreign key (profile_id) references profiles (id) on delete cascade;

create index if not exists skills_profile_id_idx on skills (profile_id);
create unique index if not exists skills_unique_per_profile on skills (profile_id, lower(skill_name));

-- ---------------------------------------------------------------------
-- education / experience / projects / achievements (multi-entry profile data)
-- ---------------------------------------------------------------------
create table if not exists education (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  institution text not null,
  degree text,
  field text,
  start_year int,
  end_year int,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists experience (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  company_name text not null,
  title text not null,
  employment_type text,
  location text,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  title text not null,
  description text,
  project_url text,
  repo_url text,
  image_url text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  title text not null,
  description text,
  icon text,
  source text not null default 'manual',
  achieved_at timestamptz not null default now()
);

create index if not exists education_profile_id_idx on education (profile_id);
create index if not exists experience_profile_id_idx on experience (profile_id);
create index if not exists projects_profile_id_idx on projects (profile_id);
create index if not exists achievements_profile_id_idx on achievements (profile_id);

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table profiles enable row level security;
alter table resumes enable row level security;
alter table skills enable row level security;
alter table education enable row level security;
alter table experience enable row level security;
alter table projects enable row level security;
alter table achievements enable row level security;

drop policy if exists profiles_select_all on profiles;
create policy profiles_select_all on profiles for select to authenticated using (true);
drop policy if exists profiles_update_own on profiles;
create policy profiles_update_own on profiles for update to authenticated using (id = auth.uid());
drop policy if exists profiles_admin_update on profiles;
create policy profiles_admin_update on profiles for update to authenticated using (public.is_admin());

drop policy if exists resumes_owner_all on resumes;
create policy resumes_owner_all on resumes for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
-- resumes_recruiter_view policy is created in the companies/jobs migration
-- once job_applications/jobs/company_members exist.

drop policy if exists skills_select_all on skills;
create policy skills_select_all on skills for select to authenticated using (true);
drop policy if exists skills_owner_write on skills;
create policy skills_owner_write on skills for insert to authenticated with check (profile_id = auth.uid());
drop policy if exists skills_owner_update on skills;
create policy skills_owner_update on skills for update to authenticated using (profile_id = auth.uid());
drop policy if exists skills_owner_delete on skills;
create policy skills_owner_delete on skills for delete to authenticated using (profile_id = auth.uid());

drop policy if exists education_select_all on education;
create policy education_select_all on education for select to authenticated using (true);
drop policy if exists education_owner_write on education;
create policy education_owner_write on education for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists experience_select_all on experience;
create policy experience_select_all on experience for select to authenticated using (true);
drop policy if exists experience_owner_write on experience;
create policy experience_owner_write on experience for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists projects_select_all on projects;
create policy projects_select_all on projects for select to authenticated using (true);
drop policy if exists projects_owner_write on projects;
create policy projects_owner_write on projects for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists achievements_select_all on achievements;
create policy achievements_select_all on achievements for select to authenticated using (true);
drop policy if exists achievements_owner_write on achievements;
create policy achievements_owner_write on achievements for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
