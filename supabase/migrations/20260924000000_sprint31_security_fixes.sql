-- =====================================================================
-- Sprint 31: production-readiness audit fixes.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. company_members cross-tenant hijack fix.
--
-- company_members_update_delete (20260728000400) has a USING clause
-- (caller must be owner/admin of the row's CURRENT company) but no WITH
-- CHECK. Since UPDATE's USING is only evaluated against the OLD row, an
-- owner/admin of Company A could UPDATE their own membership row and set
-- company_id to Company B (with role='owner'), self-promoting into a
-- company they have no legitimate membership in — full takeover of
-- another tenant's recruiter dashboard/billing/applicant data.
--
-- Same guard-trigger pattern already used 4 times this session
-- (drive_applications, drive_notifications, notifications,
-- job_applications) rather than a WITH CHECK, since the check needs to
-- compare OLD vs NEW. No legitimate app code currently calls UPDATE on
-- this table at all (grepped every *-client.ts/*.server.ts) — role
-- promotion within the SAME company is left possible for whatever
-- future admin workflow the UPDATE policy was meant for; only the
-- cross-tenant company_id/profile_id move is closed.
-- ---------------------------------------------------------------------
create or replace function public.guard_company_members_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.company_id is distinct from old.company_id
     or new.profile_id is distinct from old.profile_id
  then
    raise exception 'Cannot move a membership row to a different company or profile.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_company_members_update on company_members;
create trigger trg_guard_company_members_update before update on company_members
  for each row execute function public.guard_company_members_update();

-- ---------------------------------------------------------------------
-- 2. job_applications scoring-column tamper fix.
--
-- guard_job_application_update (20260728000700) already blocks non-
-- recruiters from changing `status`, but ats_score/job_match_percentage/
-- skills_score (added 20260728000000) have no restriction at all — an
-- applicant can directly overwrite their own row's scores, presenting a
-- fabricated match percentage to a recruiter, bypassing the real
-- computation in matching-scores.server.ts entirely.
--
-- That server function is being changed (see src/lib/matching-scores.server.ts)
-- to write via the admin/service-role client (auth.uid() is null) after
-- its own auth check, exactly the pattern already established for
-- payments/subscriptions/course_purchases/ai credits — so this trigger
-- only needs to block the columns for real (non-service-role, non-
-- recruiter) client sessions.
-- ---------------------------------------------------------------------
create or replace function public.guard_job_application_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_is_recruiter boolean;
begin
  select company_id into v_company_id from jobs where id = new.job_id;
  v_is_recruiter := public.is_admin() or public.has_company_role(v_company_id, array['owner', 'admin', 'recruiter']);
  if not v_is_recruiter and new.status is distinct from old.status then
    raise exception 'Only recruiters can change an application''s status.';
  end if;
  if auth.uid() is not null and not v_is_recruiter and (
    new.ats_score is distinct from old.ats_score
    or new.job_match_percentage is distinct from old.job_match_percentage
    or new.skills_score is distinct from old.skills_score
  ) then
    raise exception 'Application scores can only be set by the scoring system.';
  end if;
  return new;
end;
$$;

-- Trigger itself is unchanged (already created by 20260728000700); the
-- function body above replaces it in place.

-- ---------------------------------------------------------------------
-- 3. Real skill verification for passed challenges.
--
-- The `skills` schema (source/verified_at columns, source check allowing
-- 'challenge') was built for this but never wired up anywhere in the app
-- — profile.tsx has told users "Skills become verified by passing a
-- coding challenge in that category" since it was written, with no code
-- path that ever made it true. challenge_submissions rows are inserted
-- exclusively by judge0.server.ts's submitChallengeFn (a real,
-- Judge0-graded submission — not client-forgeable), using the
-- challenge's own `tags` (the same vocabulary jobs.tags/matching-scores
-- already use for skill matching), so this is a direct, minimal
-- implementation of an already-documented, already-scoped feature, not
-- a new one.
-- ---------------------------------------------------------------------
create or replace function public.verify_skills_on_challenge_pass()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tags text[];
  v_tag text;
begin
  if new.status is distinct from 'passed' then
    return new;
  end if;

  select tags into v_tags from challenges where id = new.challenge_id;
  if v_tags is null then
    return new;
  end if;

  foreach v_tag in array v_tags loop
    if coalesce(trim(v_tag), '') = '' then
      continue;
    end if;
    insert into skills (profile_id, skill_name, verified, source, verified_at)
    values (new.profile_id, v_tag, true, 'challenge', now())
    on conflict (profile_id, lower(skill_name))
    do update set verified = true, source = 'challenge', verified_at = now()
    where skills.verified is distinct from true;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_verify_skills_on_challenge_pass on challenge_submissions;
create trigger trg_verify_skills_on_challenge_pass after insert on challenge_submissions
  for each row execute function public.verify_skills_on_challenge_pass();

-- ---------------------------------------------------------------------
-- 9. Private chat-images bucket, mirroring the resumes bucket pattern
-- (private + signed URLs) instead of the public post-images bucket
-- messages-client.ts's uploadChatImage previously reused for private
-- 1:1 DM attachments.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-images', 'chat-images', false, 10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

drop policy if exists chat_images_owner_write on storage.objects;
create policy chat_images_owner_write on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists chat_images_owner_delete on storage.objects;
create policy chat_images_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'chat-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- Readable by the uploader, an admin, or anyone who shares ANY
-- conversation with the uploader (same coarser-join precedent as
-- resumes_recruiter_read — proportionate to this bucket's actual access
-- model, not scoped to the exact message/conversation the image is in).
drop policy if exists chat_images_participant_read on storage.objects;
create policy chat_images_participant_read on storage.objects for select to authenticated
  using (
    bucket_id = 'chat-images'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
      or exists (
        select 1
        from conversation_participants cp_me
        join conversation_participants cp_them
          on cp_them.conversation_id = cp_me.conversation_id
        where cp_me.profile_id = auth.uid()
          and cp_them.profile_id::text = (storage.foldername(name))[1]
      )
    )
  );

-- ---------------------------------------------------------------------
-- 10. Tighten company-logos allowed MIME types: drop image/svg+xml.
-- SVG can embed <script>; this bucket is public-read, so any company's
-- logo URL was a stored-XSS vector for that origin.
-- ---------------------------------------------------------------------
update storage.buckets
set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id = 'company-logos';
