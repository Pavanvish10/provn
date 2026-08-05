-- =====================================================================
-- AI Voice Interview module — a separate feature from the existing
-- text-based `mock_interviews` table (still used by /interview-practice
-- and the /apply verification gate; left untouched). This is a full
-- configurable, multi-question, voice-driven interview with a
-- structured multi-dimension score report at the end.
-- =====================================================================

create table if not exists voice_interview_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,

  interview_type text not null check (interview_type in ('hr', 'technical', 'manager', 'startup', 'faang')),
  company text,
  role text not null,
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  duration_minutes int not null default 30 check (duration_minutes in (15, 30, 45, 60)),
  language text not null default 'english' check (language in ('english', 'hindi', 'hinglish')),
  voice_gender text not null default 'female' check (voice_gender in ('male', 'female')),

  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  -- [{ index, question, answer, askedAt, answeredAt }]
  questions jsonb not null default '[]'::jsonb,

  overall_score int,
  communication_score int,
  confidence_score int,
  grammar_score int,
  technical_score int,
  leadership_score int,
  problem_solving_score int,
  professionalism_score int,
  strengths text[],
  weaknesses text[],
  improvement_plan text[],
  hiring_recommendation text,
  summary text,

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists voice_interview_sessions_profile_idx
  on voice_interview_sessions (profile_id, created_at desc);

alter table voice_interview_sessions enable row level security;
drop policy if exists voice_interview_sessions_owner_all on voice_interview_sessions;
create policy voice_interview_sessions_owner_all on voice_interview_sessions for all
  to authenticated using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid());

-- Award XP + a completion notification once, on the transition into
-- 'completed' — same pattern as on_mock_interview_completed.
create or replace function public.on_voice_interview_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and old.status <> 'completed' then
    perform public.award_xp(new.profile_id, 50, 'voice_interview_completed', 'voice_interview', new.id);
    perform public.create_notification(new.profile_id, new.profile_id, 'mock_interview',
      'Your AI voice interview report is ready', 'voice_interview', new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_voice_interview_completed on voice_interview_sessions;
create trigger trg_voice_interview_completed
  after update on voice_interview_sessions
  for each row execute function public.on_voice_interview_completed();
