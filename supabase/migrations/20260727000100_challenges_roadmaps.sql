-- =====================================================================
-- PROVN challenges / coding platform / roadmaps / mock interviews
-- =====================================================================

create table if not exists challenge_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique
);

create table if not exists challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null,
  difficulty text not null,
  category_id uuid references challenge_categories (id) on delete set null,
  estimated_minutes int not null default 30,
  xp_reward int not null default 20,
  tags text[] not null default '{}',
  constraints text,
  input_format text,
  output_format text,
  starter_code jsonb not null default '{}'::jsonb,
  is_premium boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table challenges drop constraint if exists challenges_difficulty_check;
alter table challenges add constraint challenges_difficulty_check
  check (difficulty in ('easy', 'medium', 'hard'));

create table if not exists challenge_test_cases (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenges (id) on delete cascade,
  input text not null default '',
  expected_output text not null,
  is_hidden boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists challenge_submissions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenges (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  language text not null,
  source_code text not null,
  status text not null default 'pending',
  passed_count int not null default 0,
  total_count int not null default 0,
  runtime_ms int,
  stdout text,
  stderr text,
  created_at timestamptz not null default now()
);
alter table challenge_submissions drop constraint if exists challenge_submissions_status_check;
alter table challenge_submissions add constraint challenge_submissions_status_check
  check (status in ('pending', 'running', 'passed', 'failed', 'error'));

create table if not exists daily_challenge_assignments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  challenge_id uuid not null references challenges (id) on delete cascade,
  assigned_date date not null default current_date,
  completed boolean not null default false,
  completed_at timestamptz,
  unique (profile_id, challenge_id, assigned_date)
);

create index if not exists challenges_category_idx on challenges (category_id);
create index if not exists challenge_test_cases_challenge_idx on challenge_test_cases (challenge_id);
create index if not exists challenge_submissions_profile_idx on challenge_submissions (profile_id, created_at desc);
create index if not exists challenge_submissions_challenge_idx on challenge_submissions (challenge_id);
create index if not exists daily_assignments_profile_date_idx on daily_challenge_assignments (profile_id, assigned_date);

-- Award XP + notify when a submission first passes.
create or replace function public.on_challenge_submission_passed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_xp int;
  v_title text;
  v_already_passed boolean;
begin
  if new.status = 'passed' and (tg_op = 'INSERT' or old.status <> 'passed') then
    select exists (
      select 1 from challenge_submissions
      where challenge_id = new.challenge_id and profile_id = new.profile_id
        and status = 'passed' and id <> new.id
    ) into v_already_passed;

    select xp_reward, title into v_xp, v_title from challenges where id = new.challenge_id;

    if not v_already_passed then
      perform public.award_xp(new.profile_id, v_xp, 'challenge_passed', 'challenge', new.challenge_id);
    end if;

    perform public.create_notification(new.profile_id, new.profile_id, 'challenge_completion',
      'You solved "' || coalesce(v_title, 'a challenge') || '"', 'challenge', new.challenge_id);

    update daily_challenge_assignments
    set completed = true, completed_at = now()
    where profile_id = new.profile_id and challenge_id = new.challenge_id and completed = false;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_submission_passed on challenge_submissions;
create trigger trg_submission_passed after insert or update on challenge_submissions
  for each row execute function public.on_challenge_submission_passed();

-- ---------------------------------------------------------------------
-- roadmaps
-- ---------------------------------------------------------------------
create table if not exists roadmap_templates (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  title text not null,
  description text,
  is_premium boolean not null default false,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists roadmap_steps (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references roadmap_templates (id) on delete cascade,
  title text not null,
  description text,
  resource_url text,
  order_index int not null default 0,
  estimated_hours int not null default 1
);

create table if not exists user_roadmaps (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  roadmap_id uuid not null references roadmap_templates (id) on delete cascade,
  started_at timestamptz not null default now(),
  unique (profile_id, roadmap_id)
);

create table if not exists user_roadmap_progress (
  id uuid primary key default gen_random_uuid(),
  user_roadmap_id uuid not null references user_roadmaps (id) on delete cascade,
  step_id uuid not null references roadmap_steps (id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  unique (user_roadmap_id, step_id)
);

create index if not exists roadmap_steps_roadmap_idx on roadmap_steps (roadmap_id, order_index);
create index if not exists user_roadmaps_profile_idx on user_roadmaps (profile_id);
create index if not exists user_roadmap_progress_ur_idx on user_roadmap_progress (user_roadmap_id);

-- ---------------------------------------------------------------------
-- mock interviews
-- ---------------------------------------------------------------------
create table if not exists mock_interviews (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  role text not null,
  transcript jsonb not null default '[]'::jsonb,
  feedback jsonb,
  score int,
  status text not null default 'in_progress',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table mock_interviews drop constraint if exists mock_interviews_status_check;
alter table mock_interviews add constraint mock_interviews_status_check
  check (status in ('in_progress', 'completed'));

create index if not exists mock_interviews_profile_idx on mock_interviews (profile_id, created_at desc);

create or replace function public.on_mock_interview_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and old.status <> 'completed' then
    perform public.award_xp(new.profile_id, 30, 'mock_interview_completed', 'mock_interview', new.id);
    perform public.create_notification(new.profile_id, new.profile_id, 'mock_interview',
      'Your mock interview feedback is ready', 'mock_interview', new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_mock_interview_completed on mock_interviews;
create trigger trg_mock_interview_completed after update on mock_interviews
  for each row execute function public.on_mock_interview_completed();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table challenge_categories enable row level security;
alter table challenges enable row level security;
alter table challenge_test_cases enable row level security;
alter table challenge_submissions enable row level security;
alter table daily_challenge_assignments enable row level security;
alter table roadmap_templates enable row level security;
alter table roadmap_steps enable row level security;
alter table user_roadmaps enable row level security;
alter table user_roadmap_progress enable row level security;
alter table mock_interviews enable row level security;

drop policy if exists challenge_categories_select_all on challenge_categories;
create policy challenge_categories_select_all on challenge_categories for select to authenticated using (true);
drop policy if exists challenge_categories_admin_write on challenge_categories;
create policy challenge_categories_admin_write on challenge_categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists challenges_select_active on challenges;
create policy challenges_select_active on challenges for select to authenticated
  using (is_active or public.is_admin());
drop policy if exists challenges_admin_write on challenges;
create policy challenges_admin_write on challenges for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Hidden test cases are never exposed to the client; only admins (authoring)
-- and the service role (test execution) can read them.
drop policy if exists challenge_test_cases_visible on challenge_test_cases;
create policy challenge_test_cases_visible on challenge_test_cases for select to authenticated
  using (is_hidden = false or public.is_admin());
drop policy if exists challenge_test_cases_admin_write on challenge_test_cases;
create policy challenge_test_cases_admin_write on challenge_test_cases for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists challenge_submissions_owner_select on challenge_submissions;
create policy challenge_submissions_owner_select on challenge_submissions for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());
drop policy if exists challenge_submissions_owner_insert on challenge_submissions;
create policy challenge_submissions_owner_insert on challenge_submissions for insert to authenticated
  with check (profile_id = auth.uid());

drop policy if exists daily_assignments_owner_select on daily_challenge_assignments;
create policy daily_assignments_owner_select on daily_challenge_assignments for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());
drop policy if exists daily_assignments_owner_update on daily_challenge_assignments;
create policy daily_assignments_owner_update on daily_challenge_assignments for update to authenticated
  using (profile_id = auth.uid());
drop policy if exists daily_assignments_owner_insert on daily_challenge_assignments;
create policy daily_assignments_owner_insert on daily_challenge_assignments for insert to authenticated
  with check (profile_id = auth.uid());

drop policy if exists roadmap_templates_select_all on roadmap_templates;
create policy roadmap_templates_select_all on roadmap_templates for select to authenticated using (true);
drop policy if exists roadmap_templates_admin_write on roadmap_templates;
create policy roadmap_templates_admin_write on roadmap_templates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists roadmap_steps_select_all on roadmap_steps;
create policy roadmap_steps_select_all on roadmap_steps for select to authenticated using (true);
drop policy if exists roadmap_steps_admin_write on roadmap_steps;
create policy roadmap_steps_admin_write on roadmap_steps for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists user_roadmaps_owner_all on user_roadmaps;
create policy user_roadmaps_owner_all on user_roadmaps for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists user_roadmap_progress_owner_all on user_roadmap_progress;
create policy user_roadmap_progress_owner_all on user_roadmap_progress for all to authenticated
  using (exists (
    select 1 from user_roadmaps ur where ur.id = user_roadmap_progress.user_roadmap_id and ur.profile_id = auth.uid()
  ))
  with check (exists (
    select 1 from user_roadmaps ur where ur.id = user_roadmap_progress.user_roadmap_id and ur.profile_id = auth.uid()
  ));

drop policy if exists mock_interviews_owner_all on mock_interviews;
create policy mock_interviews_owner_all on mock_interviews for all to authenticated
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid());

-- Seed the fixed category taxonomy (idempotent).
insert into challenge_categories (name, slug) values
  ('Data Structures', 'data-structures'),
  ('Algorithms', 'algorithms'),
  ('Arrays', 'arrays'),
  ('Strings', 'strings'),
  ('Linked Lists', 'linked-lists'),
  ('Trees', 'trees'),
  ('Graphs', 'graphs'),
  ('Dynamic Programming', 'dynamic-programming'),
  ('SQL', 'sql'),
  ('React', 'react'),
  ('JavaScript', 'javascript'),
  ('TypeScript', 'typescript'),
  ('Node.js', 'nodejs'),
  ('Express', 'express'),
  ('Next.js', 'nextjs'),
  ('Python', 'python'),
  ('Java', 'java'),
  ('C++', 'cpp'),
  ('Go', 'go'),
  ('DevOps', 'devops'),
  ('Docker', 'docker'),
  ('Kubernetes', 'kubernetes'),
  ('AWS', 'aws'),
  ('Machine Learning', 'machine-learning'),
  ('Data Science', 'data-science'),
  ('Cybersecurity', 'cybersecurity'),
  ('System Design', 'system-design'),
  ('REST APIs', 'rest-apis'),
  ('Databases', 'databases')
on conflict (slug) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'daily_challenge_assignments'
  ) then
    execute 'alter publication supabase_realtime add table daily_challenge_assignments';
  end if;
end $$;
