-- =====================================================================
-- Seed real roadmap_templates + roadmap_steps content, migrated from the
-- previously hardcoded ROLES array in src/routes/job-preparation.tsx.
-- Idempotent: each role is only inserted if a roadmap_templates row with
-- that `role` slug does not already exist.
-- =====================================================================

do $$
declare
  v_roadmap_id uuid;
begin
  if not exists (select 1 from roadmap_templates where role = 'frontend') then
    insert into roadmap_templates (role, title, description, is_premium)
    values ('frontend', 'Frontend Developer',
      'React, TypeScript, performance, accessibility, design systems. (~10 week track)', false)
    returning id into v_roadmap_id;

    insert into roadmap_steps (roadmap_id, title, description, order_index, estimated_hours) values
      (v_roadmap_id, 'Foundations', 'HTML semantics & a11y; Modern CSS + Flex/Grid; TypeScript essentials', 0, 25),
      (v_roadmap_id, 'React deep-dive', 'Hooks & reconciliation; State: local, server, URL; Suspense & data loading', 1, 25),
      (v_roadmap_id, 'Systems & perf', 'Bundle & runtime perf; Design systems w/ Tailwind; Testing with Vitest + Playwright', 2, 25),
      (v_roadmap_id, 'Interview prep', '10 UI machine coding rounds; Frontend system design; Behavioral & STAR', 3, 25);
  end if;
end $$;

do $$
declare
  v_roadmap_id uuid;
begin
  if not exists (select 1 from roadmap_templates where role = 'backend') then
    insert into roadmap_templates (role, title, description, is_premium)
    values ('backend', 'Backend Developer',
      'APIs, databases, distributed systems, reliability. (~12 week track)', false)
    returning id into v_roadmap_id;

    insert into roadmap_steps (roadmap_id, title, description, order_index, estimated_hours) values
      (v_roadmap_id, 'Foundations', 'HTTP, REST, idempotency; SQL & indexing; Data modelling', 0, 30),
      (v_roadmap_id, 'Systems', 'Caching (Redis); Queues & workers; Auth & rate limiting', 1, 30),
      (v_roadmap_id, 'Scale', 'Sharding & replication; Observability; Failure modes', 2, 30),
      (v_roadmap_id, 'Interview prep', '12 API design drills; System design rounds; Behavioral & STAR', 3, 30);
  end if;
end $$;

do $$
declare
  v_roadmap_id uuid;
begin
  if not exists (select 1 from roadmap_templates where role = 'fullstack') then
    insert into roadmap_templates (role, title, description, is_premium)
    values ('fullstack', 'Full-stack Developer',
      'Ship end-to-end features across UI, API, and database. (~12 week track)', false)
    returning id into v_roadmap_id;

    insert into roadmap_steps (roadmap_id, title, description, order_index, estimated_hours) values
      (v_roadmap_id, 'Web fundamentals', 'TypeScript everywhere; React + a modern meta-framework; Postgres basics', 0, 30),
      (v_roadmap_id, 'Product engineering', 'Auth & billing flows; File uploads & storage; Background jobs', 1, 30),
      (v_roadmap_id, 'Delivery', 'CI/CD, previews; Observability; Cost & perf tuning', 2, 30),
      (v_roadmap_id, 'Interview prep', 'Product case rounds; Mixed FE + BE system design; Behavioral & STAR', 3, 30);
  end if;
end $$;

do $$
declare
  v_roadmap_id uuid;
begin
  if not exists (select 1 from roadmap_templates where role = 'data-analyst') then
    insert into roadmap_templates (role, title, description, is_premium)
    values ('data-analyst', 'Data Analyst',
      'SQL, dashboards, experimentation, business storytelling. (~8 week track)', false)
    returning id into v_roadmap_id;

    insert into roadmap_steps (roadmap_id, title, description, order_index, estimated_hours) values
      (v_roadmap_id, 'Foundations', 'Advanced SQL & window fns; Statistics for analysts; Excel / Sheets power moves', 0, 20),
      (v_roadmap_id, 'Tooling', 'Tableau or Metabase; Python (pandas) basics; dbt & modelling', 1, 20),
      (v_roadmap_id, 'Impact', 'Experiment design (A/B); Metric trees & north stars; Executive-ready dashboards', 2, 20),
      (v_roadmap_id, 'Interview prep', '10 SQL case interviews; Product-sense rounds; Guesstimates & PM cases', 3, 20);
  end if;
end $$;

do $$
declare
  v_roadmap_id uuid;
begin
  if not exists (select 1 from roadmap_templates where role = 'data-scientist') then
    insert into roadmap_templates (role, title, description, is_premium)
    values ('data-scientist', 'Data Scientist / ML',
      'Statistics, ML modelling, MLOps, and applied research. (~14 week track)', false)
    returning id into v_roadmap_id;

    insert into roadmap_steps (roadmap_id, title, description, order_index, estimated_hours) values
      (v_roadmap_id, 'Math & stats', 'Linear algebra refresh; Probability & inference; Hypothesis testing', 0, 35),
      (v_roadmap_id, 'ML core', 'Regression / trees / boosting; Deep learning basics; Evaluation & leakage', 1, 35),
      (v_roadmap_id, 'Applied', 'Feature stores; MLOps & deployment; LLM prompting & RAG', 2, 35),
      (v_roadmap_id, 'Interview prep', 'ML system design; Case studies; Behavioral & STAR', 3, 35);
  end if;
end $$;

do $$
declare
  v_roadmap_id uuid;
begin
  if not exists (select 1 from roadmap_templates where role = 'devops') then
    insert into roadmap_templates (role, title, description, is_premium)
    values ('devops', 'DevOps / SRE',
      'Cloud, CI/CD, observability, incident response. (~10 week track)', false)
    returning id into v_roadmap_id;

    insert into roadmap_steps (roadmap_id, title, description, order_index, estimated_hours) values
      (v_roadmap_id, 'Linux & networking', 'Bash & scripting; TCP, DNS, TLS; Containers 101', 0, 25),
      (v_roadmap_id, 'Cloud', 'AWS or GCP core; Kubernetes & Helm; IaC with Terraform', 1, 25),
      (v_roadmap_id, 'Reliability', 'SLIs / SLOs; Observability stack; Chaos & incident drills', 2, 25),
      (v_roadmap_id, 'Interview prep', 'Debugging rounds; Cloud system design; Behavioral & STAR', 3, 25);
  end if;
end $$;

do $$
declare
  v_roadmap_id uuid;
begin
  if not exists (select 1 from roadmap_templates where role = 'mobile') then
    insert into roadmap_templates (role, title, description, is_premium)
    values ('mobile', 'Mobile Developer',
      'iOS, Android, or React Native — ship shippable apps. (~10 week track)', false)
    returning id into v_roadmap_id;

    insert into roadmap_steps (roadmap_id, title, description, order_index, estimated_hours) values
      (v_roadmap_id, 'Foundations', 'Platform basics; Navigation & state; Offline & caching', 0, 25),
      (v_roadmap_id, 'Product polish', 'Animations; Push & deep links; Store submission', 1, 25),
      (v_roadmap_id, 'Perf & QA', 'Startup & jank; Automated tests; Crash triage', 2, 25),
      (v_roadmap_id, 'Interview prep', 'UI machine coding; Mobile system design; Behavioral & STAR', 3, 25);
  end if;
end $$;

do $$
declare
  v_roadmap_id uuid;
begin
  if not exists (select 1 from roadmap_templates where role = 'designer') then
    insert into roadmap_templates (role, title, description, is_premium)
    values ('designer', 'Product Designer',
      'UX research, IA, visual craft, and design systems. (~8 week track)', false)
    returning id into v_roadmap_id;

    insert into roadmap_steps (roadmap_id, title, description, order_index, estimated_hours) values
      (v_roadmap_id, 'Foundations', 'UX research basics; IA & flows; Typography & layout', 0, 20),
      (v_roadmap_id, 'Craft', 'Design systems in Figma; Motion & micro-interactions; Prototyping', 1, 20),
      (v_roadmap_id, 'Impact', 'Metrics-led design; Design critique; Stakeholder communication', 2, 20),
      (v_roadmap_id, 'Interview prep', 'Portfolio deep-dives; App critique rounds; Whiteboard challenges', 3, 20);
  end if;
end $$;

do $$
declare
  v_roadmap_id uuid;
begin
  if not exists (select 1 from roadmap_templates where role = 'sql') then
    insert into roadmap_templates (role, title, description, is_premium)
    values ('sql', 'Database / SQL Engineer',
      'Modelling, tuning, warehousing, and analytical SQL. (~8 week track)', false)
    returning id into v_roadmap_id;

    insert into roadmap_steps (roadmap_id, title, description, order_index, estimated_hours) values
      (v_roadmap_id, 'Foundations', 'Relational modelling; Indexes & execution plans; Transactions & isolation', 0, 20),
      (v_roadmap_id, 'Analytics', 'Window functions; Warehousing (Snowflake/BQ); dbt & data contracts', 1, 20),
      (v_roadmap_id, 'Scale', 'Sharding & partitioning; Replication; Query tuning', 2, 20),
      (v_roadmap_id, 'Interview prep', 'Advanced SQL sets; Schema design rounds; Behavioral & STAR', 3, 20);
  end if;
end $$;

do $$
declare
  v_roadmap_id uuid;
begin
  if not exists (select 1 from roadmap_templates where role = 'security') then
    insert into roadmap_templates (role, title, description, is_premium)
    values ('security', 'Security Engineer',
      'AppSec, cloud security, threat modelling, response. (~12 week track)', false)
    returning id into v_roadmap_id;

    insert into roadmap_steps (roadmap_id, title, description, order_index, estimated_hours) values
      (v_roadmap_id, 'Foundations', 'OWASP Top 10; AuthN vs AuthZ; Crypto basics', 0, 30),
      (v_roadmap_id, 'AppSec', 'Threat modelling; SAST / DAST; Secure code review', 1, 30),
      (v_roadmap_id, 'Cloud & IR', 'Cloud IAM; Detection engineering; Incident response', 2, 30),
      (v_roadmap_id, 'Interview prep', 'Vuln walkthroughs; Security system design; Behavioral & STAR', 3, 30);
  end if;
end $$;
