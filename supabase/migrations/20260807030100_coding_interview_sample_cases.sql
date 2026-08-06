-- test_cases (all cases, including hidden expected outputs) must never be
-- readable by the browser client, or a candidate could read hidden-case
-- answers straight out of the network tab. sample_test_cases duplicates
-- just the non-hidden subset so the "Run sample" UI survives a page
-- reload without ever exposing the hidden cases.
alter table coding_interview_sessions
  add column if not exists sample_test_cases jsonb not null default '[]'::jsonb;
