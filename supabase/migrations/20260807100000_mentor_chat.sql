-- =====================================================================
-- Sprint 24: AI Mentor Chat & Career Coach
--
-- A distinct system from the existing global "Provn AI Assistant" widget
-- (src/components/AiChatWidget.tsx) — that widget is a floating, ephemeral,
-- single-turn-history chatbox with no persistence at all (history is round-
-- tripped from the client and never written to the database). Sprint 24
-- needs real persisted, multi-conversation chat history with rename/
-- delete/pin/search, which that widget's design cannot provide, so this
-- adds a dedicated schema for it rather than bolting persistence onto a
-- component built to not have any.
--
-- Structurally mirrors the human-DM schema (conversations + messages) that
-- already exists for a different purpose (person-to-person chat), but with
-- a `role` column distinguishing user/model turns instead of a sender_id,
-- and mentor-specific fields (title, pinning) — not reusable as the same
-- table since RLS/columns serve a different shape of data.
-- =====================================================================

create table if not exists mentor_conversations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  title text not null default 'New chat',
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create index if not exists mentor_conversations_profile_idx
  on mentor_conversations (profile_id, is_pinned desc, last_message_at desc);

create table if not exists mentor_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references mentor_conversations (id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);
alter table mentor_messages drop constraint if exists mentor_messages_role_check;
alter table mentor_messages add constraint mentor_messages_role_check
  check (role in ('user', 'model'));

create index if not exists mentor_messages_conversation_idx
  on mentor_messages (conversation_id, created_at asc);

alter table mentor_conversations enable row level security;
alter table mentor_messages enable row level security;

drop policy if exists mentor_conversations_owner_all on mentor_conversations;
create policy mentor_conversations_owner_all on mentor_conversations for all
  to authenticated using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid());

drop policy if exists mentor_messages_owner_all on mentor_messages;
create policy mentor_messages_owner_all on mentor_messages for all
  to authenticated using (exists (
    select 1 from mentor_conversations mc
    where mc.id = mentor_messages.conversation_id
      and (mc.profile_id = auth.uid() or public.is_admin())
  ))
  with check (exists (
    select 1 from mentor_conversations mc
    where mc.id = mentor_messages.conversation_id and mc.profile_id = auth.uid()
  ));
