-- =============================================================================
-- ROOMIE · migration 0100 · enums, shared helpers, reference data tables
-- =============================================================================

create type public.gender_t              as enum ('male', 'female', 'other');            -- Nam / Nữ / Khác
create type public.housing_status_t      as enum ('has_room', 'looking_for_room');
create type public.verification_status_t as enum ('unverified', 'pending', 'verified', 'rejected');
create type public.question_type_t       as enum ('scale_1_5', 'single_choice', 'multi_choice');
create type public.room_type_t           as enum ('private', 'shared');
create type public.media_kind_t          as enum ('image', 'video');
create type public.match_status_t        as enum ('active', 'closed');
create type public.smoking_policy_t      as enum ('any', 'non_smoker_only');
create type public.notification_type_t   as enum (
  'mutual_match',        -- both users liked each other
  'new_like',            -- someone liked you (approved decision #4)
  'passed',              -- someone viewed your profile and chose "not a fit" (approved decision #4)
  'profile_view',        -- someone viewed your profile (throttled)
  'new_message',
  'verification_update'
);

-- Generic updated_at maintenance -------------------------------------------------
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Geography (provinces level 1, districts/areas level 2) --------------------------
-- MVP scope is Hà Nội only (approved decision #6). Hometown values for other
-- provinces will be added by a later reference-data migration.
create table public.geo_units (
  code        text primary key,
  level       smallint not null check (level in (1, 2)),
  parent_code text references public.geo_units (code),
  name_vi     text not null,
  name_en     text,
  created_at  timestamptz not null default now(),
  check ((level = 1 and parent_code is null) or (level = 2 and parent_code is not null))
);
create index geo_units_parent_idx on public.geo_units (parent_code);
