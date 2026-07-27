-- Plain-column unique constraint so PostgREST upsert(onConflict: "profile_id,skill_name") works.
-- (The previous lower(skill_name) expression index can't be targeted by ON CONFLICT.)
drop index if exists skills_unique_per_profile;
alter table skills drop constraint if exists skills_profile_id_skill_name_key;
alter table skills add constraint skills_profile_id_skill_name_key unique (profile_id, skill_name);
