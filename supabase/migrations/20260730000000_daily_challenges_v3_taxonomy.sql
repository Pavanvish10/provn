-- =====================================================================
-- Daily Challenges v3 — schema foundation.
--
-- Adds the grouping/taxonomy and columns needed for the redesigned Daily
-- Challenges module (single global daily challenge, company tags, and
-- non-coding "theory" questions for CS/Aptitude tracks) WITHOUT touching
-- any existing challenge data or breaking the current admin/editor/Judge0
-- flow. Everything here is additive.
-- =====================================================================

-- `tracks` groups categories into the top-level nav sections requested for
-- Daily Challenges (Programming, Programming Languages, Frontend, Backend,
-- Computer Science, SQL, Aptitude). Array because a category can span more
-- than one (e.g. JavaScript is both a Language and Frontend topic).
-- Categories outside the requested taxonomy (Docker, AWS, System Design,
-- etc.) are tagged 'other' so they stay functional/filterable without
-- cluttering the new grouped nav.
alter table challenge_categories add column if not exists tracks text[] not null default '{}';

update challenge_categories set tracks = case slug
  when 'data-structures' then array['dsa']
  when 'algorithms' then array['dsa']
  when 'arrays' then array['dsa']
  when 'strings' then array['dsa']
  when 'linked-lists' then array['dsa']
  when 'trees' then array['dsa']
  when 'graphs' then array['dsa']
  when 'dynamic-programming' then array['dsa']
  when 'greedy' then array['dsa']
  when 'recursion' then array['dsa']
  when 'backtracking' then array['dsa']
  when 'hash-maps' then array['dsa']
  when 'stacks' then array['dsa']
  when 'queues' then array['dsa']
  when 'binary-search' then array['dsa']
  when 'sliding-window' then array['dsa']
  when 'two-pointers' then array['dsa']
  when 'sql' then array['sql']
  when 'react' then array['frontend']
  when 'javascript' then array['language', 'frontend']
  when 'typescript' then array['language']
  when 'nodejs' then array['backend']
  when 'express' then array['backend']
  when 'nextjs' then array['frontend']
  when 'python' then array['language']
  when 'java' then array['language']
  when 'cpp' then array['language']
  when 'go' then array['language']
  when 'rest-apis' then array['backend']
  when 'databases' then array['backend']
  else array['other']
end
where tracks = '{}';

insert into challenge_categories (name, slug, tracks) values
  ('Binary Search Trees', 'binary-search-trees', array['dsa']),
  ('Heaps', 'heaps', array['dsa']),
  ('Bit Manipulation', 'bit-manipulation', array['dsa']),
  ('C', 'c', array['language']),
  ('HTML', 'html', array['frontend']),
  ('CSS', 'css', array['frontend']),
  ('Authentication', 'authentication', array['backend']),
  ('MongoDB', 'mongodb', array['backend']),
  ('Operating Systems', 'operating-systems', array['cs']),
  ('DBMS', 'dbms', array['cs']),
  ('OOP', 'oop', array['cs']),
  ('Computer Networks', 'computer-networks', array['cs']),
  ('Quantitative Aptitude', 'quantitative-aptitude', array['aptitude']),
  ('Logical Reasoning', 'logical-reasoning', array['aptitude']),
  ('Verbal Ability', 'verbal-ability', array['aptitude'])
on conflict (slug) do nothing;

-- `question_format` lets CS/Aptitude theory questions skip the code editor
-- entirely (no starter_code/test_cases expected) while staying in the same
-- `challenges` table/shape as coding problems, per spec.
alter table challenges add column if not exists question_format text not null default 'coding';
alter table challenges drop constraint if exists challenges_question_format_check;
alter table challenges add constraint challenges_question_format_check
  check (question_format in ('coding', 'theory'));

-- Companies that ask this question in real interviews — surfaced on the
-- challenge detail page and used as a search filter.
alter table challenges add column if not exists company_tags text[] not null default '{}';

-- Drives the single global daily-challenge rotation (see next migration):
-- "prevent repeating challenges until the pool is exhausted" is implemented
-- by always picking the least-recently-used active challenge.
alter table challenges add column if not exists last_daily_used_at date;
create index if not exists challenges_last_daily_used_idx on challenges (last_daily_used_at nulls first);
