alter table companies
  add column if not exists cover_image text,
  add column if not exists linkedin_url text;
