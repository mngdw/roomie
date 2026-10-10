-- =============================================================================
-- ROOMIE · migration 0500 · compatibility cache, likes/passes/views, matches, chat, notifications
-- =============================================================================

-- compatibility_scores: one row per UNORDERED pair (the score is symmetric) --------------
create table public.compatibility_scores (
  id               uuid primary key default gen_random_uuid(),
  user_low         uuid not null references public.users (id) on delete cascade,
  user_high        uuid not null references public.users (id) on delete cascade,
  algo_version     text not null,
  version_low      integer not null,                 -- users.answers_version when computed
  version_high     integer not null,
  final_score      numeric(6, 3) not null check (final_score between 0 and 100),
  category_scores  jsonb not null check (jsonb_typeof(category_scores) = 'object'),
  dimension_scores jsonb not null check (jsonb_typeof(dimension_scores) = 'object'),
  computed_at      timestamptz not null default now(),
  unique (user_low, user_high),
  check (user_low < user_high)
);
create index compatibility_scores_high_idx  on public.compatibility_scores (user_high);
create index compatibility_scores_score_idx on public.compatibility_scores (user_low, final_score desc);

-- likes / passes ------------------------------------------------------------------------
create table public.likes (
  id         uuid primary key default gen_random_uuid(),
  from_user  uuid not null references public.users (id) on delete cascade,
  to_user    uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (from_user, to_user),
  check (from_user <> to_user)
);
create index likes_to_user_idx on public.likes (to_user, from_user);

create table public.passes (
  id         uuid primary key default gen_random_uuid(),
  from_user  uuid not null references public.users (id) on delete cascade,
  to_user    uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (from_user, to_user),
  check (from_user <> to_user)
);
create index passes_to_user_idx on public.passes (to_user, from_user);

-- profile_views: backs the "viewed your profile" notification ---------------------------
create table public.profile_views (
  id        uuid primary key default gen_random_uuid(),
  viewer_id uuid not null references public.users (id) on delete cascade,
  viewed_id uuid not null references public.users (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique (viewer_id, viewed_id),
  check (viewer_id <> viewed_id)
);
create index profile_views_viewed_idx on public.profile_views (viewed_id, viewed_at desc);

-- matches: a MUTUAL like. Canonical ordering (user_a < user_b) prevents duplicates. -------
create table public.matches (
  id         uuid primary key default gen_random_uuid(),
  user_a     uuid not null references public.users (id) on delete cascade,
  user_b     uuid not null references public.users (id) on delete cascade,
  status     public.match_status_t not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_a, user_b),
  check (user_a < user_b)
);
create index matches_user_b_idx on public.matches (user_b);
create trigger matches_set_updated_at before update on public.matches
  for each row execute function public.tg_set_updated_at();

-- conversations: exactly one per match ----------------------------------------------------
create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  match_id        uuid not null unique references public.matches (id) on delete cascade,
  last_message_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index conversations_last_message_idx on public.conversations (last_message_at desc nulls last);
create trigger conversations_set_updated_at before update on public.conversations
  for each row execute function public.tg_set_updated_at();

-- messages ----------------------------------------------------------------------------------
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  seq             bigint generated always as identity,       -- stable ordering / cursor pagination
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid not null references public.users (id),
  body            text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at      timestamptz not null default now(),
  read_at         timestamptz
);
create index messages_conversation_idx on public.messages (conversation_id, seq desc);
create index messages_unread_idx       on public.messages (conversation_id, sender_id) where read_at is null;

-- notifications -------------------------------------------------------------------------------
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  type       public.notification_type_t not null,
  actor_id   uuid references public.users (id) on delete set null,
  payload    jsonb not null default '{}' check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
create index notifications_user_idx   on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;
create index notifications_actor_idx  on public.notifications (actor_id, type, created_at desc);
