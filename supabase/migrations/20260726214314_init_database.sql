-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Profiles
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  email text unique,
  mobile text,
  college text,
  degree text,
  branch text,
  year_of_study int,
  graduation_year int,
  created_at timestamp default now()
);

-- Resumes
create table if not exists resumes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  resume_url text,
  ats_score int,
  created_at timestamp default now()
);

-- Skills
create table if not exists skills (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  skill_name text,
  level text,
  verified boolean default false
);

-- Companies
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  company_name text,
  logo text,
  description text
);

-- Roles
create table if not exists job_roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  role_name text,
  description text
);