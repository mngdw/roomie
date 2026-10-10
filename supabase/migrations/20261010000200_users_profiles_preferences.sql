-- =============================================================================
-- ROOMIE · migration 0200 · users, profiles, roommate_preferences, room_preferences
-- =============================================================================

-- users: one app row per auth.users row -----------------------------------------
create table public.users (
  id              uuid primary key references auth.users (id) on delete cascade,
  role            text not null default 'user' check (role in ('user', 'admin')),
  is_searching    boolean not null default true,      -- "availability": paused users are not shown
  answers_version integer not null default 0,         -- bumped on any answer change; invalidates compatibility cache
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index users_active_idx on public.users (id) where is_searching and deleted_at is null;
create trigger users_set_updated_at before update on public.users
  for each row execute function public.tg_set_updated_at();

-- Auto-create the app row when someone registers (Supabase Auth inserts into auth.users)
create or replace function public.tg_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.users (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.tg_handle_new_user();

-- profiles ------------------------------------------------------------------------
create table public.profiles (
  user_id             uuid primary key references public.users (id) on delete cascade,
  display_name        text not null check (char_length(display_name) between 1 and 40),     -- PUBLIC (e.g. "Linh")
  full_name           text not null check (char_length(full_name) between 2 and 80),        -- PRIVATE (verification only)
  date_of_birth       date not null,                                                         -- PRIVATE; only age is exposed
  gender              public.gender_t not null,
  school_or_workplace text check (char_length(school_or_workplace) <= 120),
  occupation          text check (char_length(occupation) <= 80),
  city_code           text references public.geo_units (code),
  district_code       text references public.geo_units (code),
  hometown_code       text references public.geo_units (code),
  bio                 text check (char_length(bio) <= 500),
  avatar_path         text check (char_length(avatar_path) <= 300),                          -- storage path, never a public URL
  mbti_type           char(4) check (mbti_type ~ '^[EI][SN][TF][JP]$'),                      -- optional, display only, never scored
  is_smoker           boolean not null default false,
  housing_status      public.housing_status_t not null,
  verification_status public.verification_status_t not null default 'unverified',            -- clients cannot write this column
  completed_at        timestamptz,                                                           -- maintained by trigger
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index profiles_location_idx     on public.profiles (city_code, district_code);
create index profiles_gender_idx       on public.profiles (gender);
create index profiles_housing_idx      on public.profiles (housing_status);
create index profiles_verification_idx on public.profiles (verification_status);
create index profiles_dob_idx          on public.profiles (date_of_birth);

create or replace function public.tg_profiles_guard()
returns trigger
language plpgsql
as $$
begin
  -- minimum age 18 (approved decision #9)
  if new.date_of_birth > (current_date - interval '18 years')::date then
    raise exception 'users must be at least 18 years old' using errcode = '23514';
  end if;
  if new.date_of_birth < date '1900-01-01' then
    raise exception 'invalid date of birth' using errcode = '23514';
  end if;

  -- level / parent consistency of the chosen location
  if new.city_code is not null and not exists (
       select 1 from public.geo_units where code = new.city_code and level = 1) then
    raise exception 'city_code must be a level-1 geo unit' using errcode = '23514';
  end if;
  if new.district_code is not null and not exists (
       select 1 from public.geo_units
        where code = new.district_code and level = 2 and parent_code is not distinct from new.city_code) then
    raise exception 'district_code must be a district of city_code' using errcode = '23514';
  end if;
  if new.hometown_code is not null and not exists (
       select 1 from public.geo_units where code = new.hometown_code and level = 1) then
    raise exception 'hometown_code must be a level-1 geo unit' using errcode = '23514';
  end if;

  -- completed_at is derived: set once all required public-facing data exists
  if new.display_name is not null and new.full_name is not null and new.date_of_birth is not null
     and new.gender is not null and new.housing_status is not null
     and new.city_code is not null and new.district_code is not null then
    new.completed_at := coalesce(case when tg_op = 'UPDATE' then old.completed_at end, now());
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;
create trigger profiles_guard before insert or update on public.profiles
  for each row execute function public.tg_profiles_guard();
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.tg_set_updated_at();

-- roommate_preferences: requirements for the roommate (section B of the PDF) -------
create table public.roommate_preferences (
  user_id            uuid primary key references public.users (id) on delete cascade,
  accepted_genders   public.gender_t[] not null default '{male,female,other}'
                       check (cardinality(accepted_genders) >= 1),                   -- HARD filter H2
  age_min            smallint check (age_min >= 18),
  age_max            smallint check (age_max <= 99),
  age_is_dealbreaker boolean not null default false,                                  -- HARD filter H3 only when true
  smoking_policy     public.smoking_policy_t not null default 'any',                  -- HARD filter H4 when non_smoker_only
  requirement_tags   text[] not null default '{}'
                       check (requirement_tags <@ array['pays_on_time', 'clean_tidy', 'respects_privacy', 'no_smoking', 'share_costs']),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (age_min is null or age_max is null or age_min <= age_max)
);
create trigger roommate_preferences_set_updated_at before update on public.roommate_preferences
  for each row execute function public.tg_set_updated_at();

-- room_preferences: what a room-seeker wants (used when housing_status = looking_for_room)
create table public.room_preferences (
  user_id                  uuid primary key references public.users (id) on delete cascade,
  preferred_district_codes text[] not null default '{}',                              -- empty = anywhere in profile city
  budget_min               bigint check (budget_min >= 0),                            -- VND / person / month
  budget_max               bigint not null check (budget_max > 0),
  room_types               public.room_type_t[] not null default '{}',                -- empty = any
  move_in_date             date not null,
  move_in_flex_days        smallint not null default 30 check (move_in_flex_days between 0 and 180),
  must_have_facilities     text[] not null default '{}',
  require_media            boolean not null default false,                            -- "Yêu cầu video/hình ảnh"
  notes                    text check (char_length(notes) <= 500),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  check (budget_min is null or budget_min <= budget_max)
);
create index room_preferences_budget_idx    on public.room_preferences (budget_max);
create index room_preferences_move_in_idx   on public.room_preferences (move_in_date);
create index room_preferences_districts_gin on public.room_preferences using gin (preferred_district_codes);

create or replace function public.tg_room_preferences_guard()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
      from unnest(new.preferred_district_codes) as c(code)
      left join public.geo_units g on g.code = c.code and g.level = 2
     where g.code is null) then
    raise exception 'preferred_district_codes must all be level-2 geo units' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger room_preferences_guard before insert or update on public.room_preferences
  for each row execute function public.tg_room_preferences_guard();
create trigger room_preferences_set_updated_at before update on public.room_preferences
  for each row execute function public.tg_set_updated_at();
