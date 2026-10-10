-- =============================================================================
-- ROOMIE · migration 0300 · rooms, room_images
-- =============================================================================

create table public.rooms (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references public.users (id) on delete cascade,
  city_code         text not null references public.geo_units (code),
  district_code     text not null references public.geo_units (code),
  address_line      text check (char_length(address_line) <= 200),   -- PRIVATE: only owner + mutual matches (rpc_get_room_address)
  monthly_rent      bigint not null check (monthly_rent > 0),         -- VND / month for the whole room
  deposit           bigint check (deposit >= 0),
  area_m2           numeric(6, 1) check (area_m2 > 0),
  room_type         public.room_type_t not null,
  capacity_total    smallint not null check (capacity_total between 2 and 10),   -- including the owner
  current_occupants smallint not null check (current_occupants >= 1),
  facilities        text[] not null default '{}',                     -- e.g. wifi, washer, parking
  services          text[] not null default '{}',
  utilities         jsonb not null default '{}'
                      check (jsonb_typeof(utilities) = 'object'),     -- {electricity_per_kwh, water, internet, service_fee, notes}
  available_from    date not null,
  notes             text check (char_length(notes) <= 1000),
  is_published      boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (current_occupants <= capacity_total)
);
-- one published room per owner (MVP)
create unique index rooms_one_published_per_owner on public.rooms (owner_id) where is_published;
create index rooms_owner_idx           on public.rooms (owner_id);
create index rooms_location_rent_idx   on public.rooms (district_code, monthly_rent) where is_published;
create index rooms_available_from_idx  on public.rooms (available_from) where is_published;
create index rooms_room_type_idx       on public.rooms (room_type) where is_published;
create index rooms_facilities_gin      on public.rooms using gin (facilities);

create or replace function public.tg_rooms_guard()
returns trigger
language plpgsql
as $$
begin
  if not exists (select 1 from public.geo_units
                  where code = new.city_code and level = 1) then
    raise exception 'city_code must be a level-1 geo unit' using errcode = '23514';
  end if;
  if not exists (select 1 from public.geo_units
                  where code = new.district_code and level = 2 and parent_code = new.city_code) then
    raise exception 'district_code must be a district of city_code' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger rooms_guard before insert or update on public.rooms
  for each row execute function public.tg_rooms_guard();
create trigger rooms_set_updated_at before update on public.rooms
  for each row execute function public.tg_set_updated_at();

-- room_images: photos AND video (kind) --------------------------------------------
create table public.room_images (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references public.rooms (id) on delete cascade,
  kind         public.media_kind_t not null default 'image',
  storage_path text not null check (char_length(storage_path) between 3 and 300),
  position     smallint not null default 0 check (position >= 0),
  created_at   timestamptz not null default now(),
  unique (room_id, storage_path)
);
create index room_images_room_idx on public.room_images (room_id, position);

-- Limits: <= 10 images and <= 1 video per room; the storage path must live in the
-- owner's own folder so one user can never attach another user's files.
create or replace function public.tg_room_images_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid;
begin
  select owner_id into v_owner from public.rooms where id = new.room_id;
  if v_owner is null then
    raise exception 'room not found' using errcode = '23503';
  end if;
  if split_part(new.storage_path, '/', 1) <> v_owner::text then
    raise exception 'storage_path must start with the room owner id' using errcode = '23514';
  end if;
  if new.kind = 'image' and (select count(*) from public.room_images
                              where room_id = new.room_id and kind = 'image'
                                and id <> new.id) >= 10 then
    raise exception 'a room can have at most 10 images' using errcode = '23514';
  end if;
  if new.kind = 'video' and exists (select 1 from public.room_images
                                     where room_id = new.room_id and kind = 'video'
                                       and id <> new.id) then
    raise exception 'a room can have at most 1 video' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger room_images_guard before insert or update on public.room_images
  for each row execute function public.tg_room_images_guard();
