-- =============================================================================
-- ROOMIE · migration 0900 · candidate_notes and user evaluations
-- Allows users to write personal notes, tags, and ratings for candidates
-- =============================================================================

create table if not exists public.candidate_notes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id) on delete cascade,
  candidate_id uuid not null references public.users (id) on delete cascade,
  rating       integer check (rating between 1 and 5),
  tags         text[] not null default '{}',
  notes        text check (char_length(notes) <= 2000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, candidate_id),
  check (user_id <> candidate_id)
);

create index if not exists candidate_notes_user_idx on public.candidate_notes (user_id, updated_at desc);

alter table public.candidate_notes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'candidate_notes' and policyname = 'candidate_notes_owner_all'
  ) then
    create policy candidate_notes_owner_all on public.candidate_notes
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end
$$;

grant select, insert, update, delete on public.candidate_notes to authenticated;
grant select, insert, update, delete on public.candidate_notes to service_role;
