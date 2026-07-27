-- =====================================================================
-- PROVN social: posts, friends, messaging, notifications, XP ledger
-- =====================================================================

-- ---------------------------------------------------------------------
-- posts / comments / likes
-- ---------------------------------------------------------------------
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles (id) on delete cascade,
  content text,
  kind text not null default 'text',
  image_urls text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table posts drop constraint if exists posts_kind_check;
alter table posts add constraint posts_kind_check
  check (kind in ('text', 'project', 'achievement', 'challenge', 'job', 'image'));

create table if not exists post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, profile_id)
);

create table if not exists post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_author_id_idx on posts (author_id);
create index if not exists posts_created_at_idx on posts (created_at desc);
create index if not exists post_likes_post_id_idx on post_likes (post_id);
create index if not exists post_comments_post_id_idx on post_comments (post_id);

-- ---------------------------------------------------------------------
-- friendships
-- ---------------------------------------------------------------------
create table if not exists friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles (id) on delete cascade,
  addressee_id uuid not null references profiles (id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendships_no_self check (requester_id <> addressee_id),
  constraint friendships_unique_pair unique (requester_id, addressee_id)
);
alter table friendships drop constraint if exists friendships_status_check;
alter table friendships add constraint friendships_status_check
  check (status in ('pending', 'accepted', 'rejected', 'blocked'));

create index if not exists friendships_requester_idx on friendships (requester_id);
create index if not exists friendships_addressee_idx on friendships (addressee_id);

-- ---------------------------------------------------------------------
-- messaging
-- ---------------------------------------------------------------------
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  is_group boolean not null default false,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table if not exists conversation_participants (
  conversation_id uuid not null references conversations (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, profile_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  content text,
  image_url text,
  created_at timestamptz not null default now()
);

create index if not exists conversation_participants_profile_idx on conversation_participants (profile_id);
create index if not exists messages_conversation_id_idx on messages (conversation_id, created_at);

-- ---------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles (id) on delete cascade,
  actor_id uuid references profiles (id) on delete set null,
  type text not null,
  entity_type text,
  entity_id uuid,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check check (type in (
  'like', 'comment', 'friend_request', 'friend_accept', 'message',
  'resume_analysis', 'coding_test', 'mock_interview', 'challenge_completion',
  'job_update', 'profile_update', 'system'
));

create index if not exists notifications_recipient_idx on notifications (recipient_id, created_at desc);

-- ---------------------------------------------------------------------
-- XP ledger + learning activity log (feeds streak, XP, analytics)
-- ---------------------------------------------------------------------
create table if not exists xp_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  amount int not null,
  reason text not null,
  source_type text,
  source_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  activity_type text not null,
  minutes int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists xp_events_profile_idx on xp_events (profile_id, created_at desc);
create index if not exists activity_log_profile_idx on activity_log (profile_id, created_at desc);

-- ---------------------------------------------------------------------
-- Helper: create a notification (SECURITY DEFINER so RLS on notifications
-- never blocks the system from notifying someone other than the actor).
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
begin
  if p_recipient_id = p_actor_id then
    return;
  end if;
  insert into notifications (recipient_id, actor_id, type, message, entity_type, entity_id)
  values (p_recipient_id, p_actor_id, p_type, p_message, p_entity_type, p_entity_id);
end;
$$;

-- Award XP + bump streak/last_activity_date for a profile.
create or replace function public.award_xp(
  p_profile_id uuid,
  p_amount int,
  p_reason text,
  p_source_type text default null,
  p_source_id uuid default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last_activity date;
begin
  insert into xp_events (profile_id, amount, reason, source_type, source_id)
  values (p_profile_id, p_amount, p_reason, p_source_type, p_source_id);

  select last_activity_date into v_last_activity from profiles where id = p_profile_id;

  update profiles
  set xp = xp + p_amount,
      streak = case
        when v_last_activity = current_date then streak
        when v_last_activity = current_date - 1 then streak + 1
        else 1
      end,
      last_activity_date = current_date,
      updated_at = now()
  where id = p_profile_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Triggers: auto-notify on likes / comments / friend requests
-- ---------------------------------------------------------------------
create or replace function public.on_post_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
  v_actor_name text;
begin
  select author_id into v_author from posts where id = new.post_id;
  select full_name into v_actor_name from profiles where id = new.profile_id;
  perform public.create_notification(v_author, new.profile_id, 'like',
    coalesce(v_actor_name, 'Someone') || ' liked your post', 'post', new.post_id);
  return new;
end;
$$;

drop trigger if exists trg_post_like_notify on post_likes;
create trigger trg_post_like_notify after insert on post_likes
  for each row execute function public.on_post_like();

create or replace function public.on_post_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
  v_actor_name text;
begin
  select author_id into v_author from posts where id = new.post_id;
  select full_name into v_actor_name from profiles where id = new.author_id;
  perform public.create_notification(v_author, new.author_id, 'comment',
    coalesce(v_actor_name, 'Someone') || ' commented on your post', 'post', new.post_id);
  return new;
end;
$$;

drop trigger if exists trg_post_comment_notify on post_comments;
create trigger trg_post_comment_notify after insert on post_comments
  for each row execute function public.on_post_comment();

create or replace function public.on_friend_request_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_name text;
begin
  if tg_op = 'INSERT' then
    select full_name into v_actor_name from profiles where id = new.requester_id;
    perform public.create_notification(new.addressee_id, new.requester_id, 'friend_request',
      coalesce(v_actor_name, 'Someone') || ' sent you a friend request', 'friendship', new.id);
  elsif tg_op = 'UPDATE' and new.status = 'accepted' and old.status <> 'accepted' then
    select full_name into v_actor_name from profiles where id = new.addressee_id;
    perform public.create_notification(new.requester_id, new.addressee_id, 'friend_accept',
      coalesce(v_actor_name, 'Someone') || ' accepted your friend request', 'friendship', new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_friendship_notify on friendships;
create trigger trg_friendship_notify after insert or update on friendships
  for each row execute function public.on_friend_request_change();

create or replace function public.on_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_name text;
  v_participant record;
begin
  select full_name into v_actor_name from profiles where id = new.sender_id;
  for v_participant in
    select profile_id from conversation_participants
    where conversation_id = new.conversation_id and profile_id <> new.sender_id
  loop
    perform public.create_notification(v_participant.profile_id, new.sender_id, 'message',
      coalesce(v_actor_name, 'Someone') || ' sent you a message', 'conversation', new.conversation_id);
  end loop;
  update conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_message_notify on messages;
create trigger trg_message_notify after insert on messages
  for each row execute function public.on_new_message();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table posts enable row level security;
alter table post_likes enable row level security;
alter table post_comments enable row level security;
alter table friendships enable row level security;
alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table messages enable row level security;
alter table notifications enable row level security;
alter table xp_events enable row level security;
alter table activity_log enable row level security;

drop policy if exists posts_select_all on posts;
create policy posts_select_all on posts for select to authenticated using (true);
drop policy if exists posts_author_insert on posts;
create policy posts_author_insert on posts for insert to authenticated with check (author_id = auth.uid());
drop policy if exists posts_author_update on posts;
create policy posts_author_update on posts for update to authenticated using (author_id = auth.uid());
drop policy if exists posts_author_delete on posts;
create policy posts_author_delete on posts for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

drop policy if exists post_likes_select_all on post_likes;
create policy post_likes_select_all on post_likes for select to authenticated using (true);
drop policy if exists post_likes_owner_write on post_likes;
create policy post_likes_owner_write on post_likes for insert to authenticated with check (profile_id = auth.uid());
drop policy if exists post_likes_owner_delete on post_likes;
create policy post_likes_owner_delete on post_likes for delete to authenticated using (profile_id = auth.uid());

drop policy if exists post_comments_select_all on post_comments;
create policy post_comments_select_all on post_comments for select to authenticated using (true);
drop policy if exists post_comments_author_insert on post_comments;
create policy post_comments_author_insert on post_comments for insert to authenticated with check (author_id = auth.uid());
drop policy if exists post_comments_author_delete on post_comments;
create policy post_comments_author_delete on post_comments for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

drop policy if exists friendships_participant_select on friendships;
create policy friendships_participant_select on friendships for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());
drop policy if exists friendships_requester_insert on friendships;
create policy friendships_requester_insert on friendships for insert to authenticated
  with check (requester_id = auth.uid());
drop policy if exists friendships_participant_update on friendships;
create policy friendships_participant_update on friendships for update to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());
drop policy if exists friendships_participant_delete on friendships;
create policy friendships_participant_delete on friendships for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists conversations_participant_select on conversations;
create policy conversations_participant_select on conversations for select to authenticated
  using (exists (
    select 1 from conversation_participants cp
    where cp.conversation_id = conversations.id and cp.profile_id = auth.uid()
  ));
drop policy if exists conversations_authenticated_insert on conversations;
create policy conversations_authenticated_insert on conversations for insert to authenticated with check (true);

drop policy if exists conversation_participants_select on conversation_participants;
create policy conversation_participants_select on conversation_participants for select to authenticated
  using (exists (
    select 1 from conversation_participants cp2
    where cp2.conversation_id = conversation_participants.conversation_id and cp2.profile_id = auth.uid()
  ));
drop policy if exists conversation_participants_insert on conversation_participants;
create policy conversation_participants_insert on conversation_participants for insert to authenticated with check (true);
drop policy if exists conversation_participants_update_own on conversation_participants;
create policy conversation_participants_update_own on conversation_participants for update to authenticated
  using (profile_id = auth.uid());

drop policy if exists messages_participant_select on messages;
create policy messages_participant_select on messages for select to authenticated
  using (exists (
    select 1 from conversation_participants cp
    where cp.conversation_id = messages.conversation_id and cp.profile_id = auth.uid()
  ));
drop policy if exists messages_participant_insert on messages;
create policy messages_participant_insert on messages for insert to authenticated
  with check (
    sender_id = auth.uid() and exists (
      select 1 from conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.profile_id = auth.uid()
    )
  );

drop policy if exists notifications_recipient_select on notifications;
create policy notifications_recipient_select on notifications for select to authenticated
  using (recipient_id = auth.uid());
drop policy if exists notifications_recipient_update on notifications;
create policy notifications_recipient_update on notifications for update to authenticated
  using (recipient_id = auth.uid());
drop policy if exists notifications_recipient_delete on notifications;
create policy notifications_recipient_delete on notifications for delete to authenticated
  using (recipient_id = auth.uid());

drop policy if exists xp_events_owner_select on xp_events;
create policy xp_events_owner_select on xp_events for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());

drop policy if exists activity_log_owner_select on activity_log;
create policy activity_log_owner_select on activity_log for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());
drop policy if exists activity_log_owner_insert on activity_log;
create policy activity_log_owner_insert on activity_log for insert to authenticated
  with check (profile_id = auth.uid());

-- Realtime for messaging/notifications/feed
do $$
declare
  t text;
begin
  foreach t in array array['messages', 'conversation_participants', 'notifications', 'posts', 'post_likes', 'post_comments']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;
