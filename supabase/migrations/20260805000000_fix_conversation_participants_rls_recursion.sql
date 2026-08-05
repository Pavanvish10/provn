-- conversation_participants_select subqueried conversation_participants from
-- within its own USING clause, which re-triggers the same policy for every
-- row of the inner query -> Postgres detects infinite recursion (42P17) and
-- the select fails outright. This 500s on every page load (AppNav polls it
-- for the unread-messages badge).
--
-- Fix: check membership through a SECURITY DEFINER function, which runs
-- with the function owner's privileges and so bypasses RLS for its internal
-- lookup instead of re-entering the policy.

create or replace function is_conversation_participant(p_conversation_id uuid, p_profile_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from conversation_participants
    where conversation_id = p_conversation_id and profile_id = p_profile_id
  );
$$;

drop policy if exists conversation_participants_select on conversation_participants;
create policy conversation_participants_select on conversation_participants for select to authenticated
  using (is_conversation_participant(conversation_id, auth.uid()));
