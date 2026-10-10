-- =============================================================================
-- ROOMIE · migration 0400 · questionnaire (normalised) + user answers
-- =============================================================================

create table public.question_categories (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  name_vi        text not null,
  name_en        text,
  description_vi text,
  weight         numeric(4, 3) not null check (weight > 0 and weight <= 1),
  sort_order     smallint not null,
  created_at     timestamptz not null default now()
);

-- Category weights must always add up to exactly 1.000 (checked at commit time so
-- that all six rows can be inserted in one transaction).
create or replace function public.tg_category_weights_sum()
returns trigger
language plpgsql
as $$
declare
  v_sum numeric;
begin
  select coalesce(sum(weight), 1) into v_sum from public.question_categories;
  if v_sum <> 1.000 then
    raise exception 'question_categories.weight must sum to 1.000 (currently %)', v_sum
      using errcode = '23514';
  end if;
  return null;
end;
$$;
create constraint trigger question_categories_weights_sum
  after insert or update or delete on public.question_categories
  deferrable initially deferred
  for each row execute function public.tg_category_weights_sum();

create table public.questions (
  id          uuid primary key default gen_random_uuid(),
  number      smallint not null unique check (number > 0),   -- "Câu N" in the PDF
  category_id uuid not null references public.question_categories (id),
  code        text not null unique,                           -- stable key used by the matching engine
  type        public.question_type_t not null,
  text_vi     text not null,                                  -- verbatim from the PDF
  text_en     text,
  sort_order  smallint not null,
  is_required boolean not null default true,
  is_public   boolean not null default true,                  -- may other users see this answer on the profile?
  created_at  timestamptz not null default now()
);
create index questions_category_idx on public.questions (category_id, sort_order);

create table public.question_options (
  id                uuid primary key default gen_random_uuid(),
  question_id       uuid not null references public.questions (id) on delete cascade,
  value             smallint not null check (value > 0),       -- 1..5 for scales, 1..n for choices
  code              text,                                       -- stable key for categorical options
  label_vi          text not null,
  label_en          text,
  sort_order        smallint not null,
  allows_other      boolean not null default false,             -- "Khác" / "Cách khác": free text allowed
  is_proposed_label boolean not null default false,             -- true = label NOT in the source PDF (approved proposal)
  unique (question_id, value),
  unique (question_id, code)
);
create index question_options_question_idx on public.question_options (question_id, sort_order);

-- user_answers: ONE ROW PER (user, question) ----------------------------------------
create table public.user_answers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users (id) on delete cascade,
  question_id   uuid not null references public.questions (id),
  option_values smallint[] not null check (cardinality(option_values) >= 1),
  other_text    text check (char_length(other_text) <= 200),    -- free text of "Khác"; stored, never scored
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, question_id)
);
create index user_answers_question_idx on public.user_answers (question_id, user_id);
-- supports lifestyle filters such as "cleanliness >= 4" on scale questions
create index user_answers_scale_value_idx on public.user_answers (question_id, (option_values[1]));

create trigger user_answers_set_updated_at before update on public.user_answers
  for each row execute function public.tg_set_updated_at();

-- Validate every answer against the questionnaire definition.
create or replace function public.tg_user_answers_validate()
returns trigger
language plpgsql
as $$
declare
  v_type    public.question_type_t;
  v_bad     smallint;
  v_other   boolean;
begin
  select type into v_type from public.questions where id = new.question_id;
  if v_type is null then
    raise exception 'unknown question' using errcode = '23503';
  end if;

  if v_type <> 'multi_choice' and cardinality(new.option_values) <> 1 then
    raise exception 'question accepts exactly one value' using errcode = '23514';
  end if;

  -- no duplicate selections
  if cardinality(new.option_values) <> (select count(distinct v) from unnest(new.option_values) v) then
    raise exception 'duplicate option values' using errcode = '23514';
  end if;

  -- every value must be a defined option of this question
  select v into v_bad
    from unnest(new.option_values) as v
   where not exists (select 1 from public.question_options o
                      where o.question_id = new.question_id and o.value = v)
   limit 1;
  if v_bad is not null then
    raise exception 'value % is not a valid option for this question', v_bad using errcode = '23514';
  end if;

  -- free text only allowed when an "other" option is selected
  select exists (select 1 from public.question_options o
                  where o.question_id = new.question_id and o.allows_other
                    and o.value = any (new.option_values)) into v_other;
  if new.other_text is not null and not v_other then
    raise exception 'other_text is only allowed when the "other" option is selected' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger user_answers_validate before insert or update on public.user_answers
  for each row execute function public.tg_user_answers_validate();

-- Any change to a user's answers bumps users.answers_version (cache invalidation)
create or replace function public.tg_user_answers_bump_version()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.users
     set answers_version = answers_version + 1
   where id = coalesce(new.user_id, old.user_id);
  return null;
end;
$$;
create trigger user_answers_bump_version after insert or update or delete on public.user_answers
  for each row execute function public.tg_user_answers_bump_version();
