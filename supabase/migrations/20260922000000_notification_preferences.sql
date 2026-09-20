-- =====================================================================
-- Sprint 29: Notification preferences, an admin-insert RLS fix, and
-- course/credit-pack payment notifications.
--
-- Reconnaissance (see .claude/project-history.md for the full audit)
-- found the notifications system itself is already extensive — table,
-- create_notification(), ~20 trigger call sites, full RLS, and a
-- complete client hook set (pagination, realtime, mark-read) already
-- existed before this sprint. This migration adds only the genuinely
-- missing pieces.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Admin-insert RLS fix. useSendSystemNotification
-- (admin-notifications-client.ts) has always done a raw client-side
-- insert into `notifications`, but no INSERT policy for `authenticated`
-- has ever existed on this table (confirmed by grepping every prior
-- migration) — meaning admin-sent system notifications have been
-- silently failing under RLS default-deny. Scoped narrowly to
-- type='system' only, so an admin session can never forge any other
-- notification type (e.g. a fake 'billing_update' to phish a user) —
-- every other type still only ever originates from the trusted
-- SECURITY DEFINER create_notification() function.
-- ---------------------------------------------------------------------
drop policy if exists notifications_admin_system_insert on notifications;
create policy notifications_admin_system_insert on notifications for insert to authenticated
  with check (public.is_admin() and type = 'system');

-- 1b. notifications_recipient_update has always had no column
-- restriction (using (recipient_id = auth.uid()) with no WITH CHECK) —
-- a recipient could rewrite their own notification's message/type/
-- entity_id, not just is_read. Same class of gap already found and
-- fixed twice this session for other tables (Sprint 26's
-- drive_applications/drive_notifications) — Phase 12 explicitly
-- requires "users cannot modify notification content", so closing it
-- here too via the same BEFORE UPDATE trigger pattern (chosen over a
-- WITH CHECK self-subquery for the same OLD/NEW-ambiguity reason as
-- those prior fixes).
create or replace function public.enforce_notification_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if old.recipient_id is distinct from new.recipient_id
     or old.actor_id is distinct from new.actor_id
     or old.type is distinct from new.type
     or old.entity_type is distinct from new.entity_type
     or old.entity_id is distinct from new.entity_id
     or old.message is distinct from new.message
     or old.created_at is distinct from new.created_at
  then
    raise exception 'Recipients may only mark a notification as read.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_notification_update on notifications;
create trigger trg_enforce_notification_update before update on notifications
  for each row execute function public.enforce_notification_update();

-- ---------------------------------------------------------------------
-- 2. notification_preferences — one row per profile, upserted by the
-- owner. billing/system categories are intentionally not represented as
-- columns at all (not just defaulted true) — Phase 8's "critical
-- notifications must not be disableable" requirement, enforced
-- structurally rather than by convention.
-- ---------------------------------------------------------------------
create table if not exists notification_preferences (
  profile_id uuid primary key references profiles (id) on delete cascade,
  social boolean not null default true,
  jobs boolean not null default true,
  placements boolean not null default true,
  learning boolean not null default true,
  email_notifications boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table notification_preferences enable row level security;

drop policy if exists notification_preferences_owner_select on notification_preferences;
create policy notification_preferences_owner_select on notification_preferences for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());
drop policy if exists notification_preferences_owner_upsert on notification_preferences;
create policy notification_preferences_owner_upsert on notification_preferences for insert to authenticated
  with check (profile_id = auth.uid());
drop policy if exists notification_preferences_owner_update on notification_preferences;
create policy notification_preferences_owner_update on notification_preferences for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ---------------------------------------------------------------------
-- 3. Extend create_notification() to consult preferences before
-- inserting. Same signature as every existing call site (~20 across the
-- codebase) — zero call-site changes needed anywhere. Categorizes by
-- `p_type`; billing_update/system always send regardless of preference
-- (no column exists to disable them, so they fall through to the
-- default "send" branch). No preference row yet (a brand-new user) also
-- defaults to "send" — sensible default per the task's own instruction.
-- ---------------------------------------------------------------------
create or replace function public.create_notification(
  p_recipient_id uuid,
  p_actor_id uuid,
  p_type text,
  p_message text,
  p_entity_type text default null,
  p_entity_id uuid default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category text;
  v_enabled boolean;
begin
  if p_recipient_id = p_actor_id then
    return;
  end if;

  v_category := case p_type
    when 'like' then 'social'
    when 'comment' then 'social'
    when 'friend_request' then 'social'
    when 'friend_accept' then 'social'
    when 'message' then 'social'
    when 'company_post' then 'social'
    when 'job_update' then 'jobs'
    when 'job_invite' then 'jobs'
    when 'interview' then 'jobs'
    when 'drive_update' then 'placements'
    when 'challenge_completion' then 'learning'
    when 'mock_interview' then 'learning'
    when 'resume_analysis' then 'learning'
    when 'coding_test' then 'learning'
    when 'profile_update' then 'learning'
    else null -- billing_update, system: no category column, always send
  end;

  if v_category is not null then
    select case v_category
      when 'social' then social
      when 'jobs' then jobs
      when 'placements' then placements
      when 'learning' then learning
    end into v_enabled
    from notification_preferences
    where profile_id = p_recipient_id;

    if v_enabled is false then
      return;
    end if;
  end if;

  insert into notifications (recipient_id, actor_id, type, message, entity_type, entity_id)
  values (p_recipient_id, p_actor_id, p_type, p_message, p_entity_type, p_entity_id);
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Course purchase / AI credit-pack purchase notifications. Only
-- subscriptions currently notify (via the pre-existing
-- on_subscription_status_change trigger on the subscriptions table).
-- Scoped to subscription_id is null so this never double-notifies a
-- subscription payment (those always carry a subscription_id; course
-- and credit-pack payments never do, at the data level, not by fragile
-- string-matching on `description`).
-- ---------------------------------------------------------------------
create or replace function public.on_payment_succeeded_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'succeeded' and new.subscription_id is null then
    perform public.create_notification(
      new.profile_id, null, 'billing_update',
      coalesce(new.description, 'Payment received') || ' — payment successful.',
      'payment', new.id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_payment_succeeded_notify on payments;
create trigger trg_payment_succeeded_notify after insert on payments
  for each row execute function public.on_payment_succeeded_notify();
