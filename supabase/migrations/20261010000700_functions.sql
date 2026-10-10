-- =============================================================================
-- ROOMIE · migration 0700 · business functions
--   * hard-filter predicate (fn_pair_ineligibility_reasons) — the SINGLE definition of eligibility
--   * RLS helper functions
--   * rpc_like_user / rpc_pass_user (atomic mutual match) / rpc_record_profile_view
--   * rpc_mark_read / rpc_get_room_address / rpc_review_verification
--   * triggers: messages (authorisation + notification), verification
-- All SECURITY DEFINER functions pin search_path.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------
create or replace function public.fn_is_admin()
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (select 1 from public.users
                  where id = auth.uid() and role = 'admin' and deleted_at is null);
$$;

create or replace function public.fn_is_active_match_with(p_other uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1 from public.matches m
     where m.status = 'active'
       and ((m.user_a = auth.uid() and m.user_b = p_other)
         or (m.user_b = auth.uid() and m.user_a = p_other)));
$$;

create or replace function public.fn_conversation_access(p_conversation uuid, p_active_only boolean default false)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
      from public.conversations c
      join public.matches m on m.id = c.match_id
     where c.id = p_conversation
       and auth.uid() in (m.user_a, m.user_b)
       and (not p_active_only or m.status = 'active'));
$$;

-- ---------------------------------------------------------------------------
-- Hard filters (spec section H). Returns the list of failed rule codes; empty = eligible.
-- The pair predicate is symmetric: every rule is checked in both directions.
-- Viewer-relative exclusions (already liked / passed / matched) live in fn_eligible_candidates.
-- ---------------------------------------------------------------------------
create or replace function public.fn_room_seeker_reasons(p_owner uuid, p_seeker uuid)
returns text[]
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  v_room    public.rooms;
  v_rp      public.room_preferences;
  v_seeker  public.profiles;
  v_reasons text[] := '{}';
begin
  select * into v_room from public.rooms where owner_id = p_owner and is_published limit 1;
  if not found then
    return array['H9_availability'];                       -- owner has no published room
  end if;
  select * into v_rp from public.room_preferences where user_id = p_seeker;
  if not found then
    return array['H0_incomplete_profile'];                 -- seeker has not set room preferences
  end if;
  select * into v_seeker from public.profiles where user_id = p_seeker;

  -- H9 availability: a free place in the room
  if v_room.current_occupants >= v_room.capacity_total then
    v_reasons := array_append(v_reasons, 'H9_availability');
  end if;
  -- H5 location
  if cardinality(v_rp.preferred_district_codes) > 0 then
    if not (v_room.district_code = any (v_rp.preferred_district_codes)) then
      v_reasons := array_append(v_reasons, 'H5_location');
    end if;
  elsif v_room.city_code is distinct from v_seeker.city_code then
    v_reasons := array_append(v_reasons, 'H5_location');
  end if;
  -- H6 budget: per-person cost = rent / (occupants + 1)  (integer-safe comparison)
  if v_room.monthly_rent > v_rp.budget_max * (v_room.current_occupants + 1) then
    v_reasons := array_append(v_reasons, 'H6_budget');
  end if;
  -- H7 move-in window
  if abs(v_room.available_from - v_rp.move_in_date) > v_rp.move_in_flex_days then
    v_reasons := array_append(v_reasons, 'H7_move_in');
  end if;
  -- H8 room type
  if cardinality(v_rp.room_types) > 0 and not (v_room.room_type = any (v_rp.room_types)) then
    v_reasons := array_append(v_reasons, 'H8_room_type');
  end if;
  -- H10 must-have facilities
  if not (v_rp.must_have_facilities <@ v_room.facilities) then
    v_reasons := array_append(v_reasons, 'H10_facilities');
  end if;
  -- H11 required photos/video
  if v_rp.require_media and not exists (select 1 from public.room_images where room_id = v_room.id) then
    v_reasons := array_append(v_reasons, 'H11_media');
  end if;
  return v_reasons;
end;
$$;

create or replace function public.fn_pair_ineligibility_reasons(p_a uuid, p_b uuid)
returns text[]
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  v_all_genders public.gender_t[] := '{male,female,other}';
  v_ua public.users;           v_ub public.users;
  v_pa public.profiles;        v_pb public.profiles;
  v_qa public.roommate_preferences; v_qb public.roommate_preferences;
  v_ra public.room_preferences;     v_rb public.room_preferences;
  v_required int;
  v_age_a int;  v_age_b int;
  v_reasons text[] := '{}';
  v_loc_ok boolean;
begin
  -- H0 · basic state
  if p_a is null or p_b is null or p_a = p_b then
    return array['H0_self'];
  end if;
  select * into v_ua from public.users where id = p_a;
  select * into v_ub from public.users where id = p_b;
  if v_ua.id is null or v_ub.id is null
     or v_ua.deleted_at is not null or v_ub.deleted_at is not null
     or not v_ua.is_searching or not v_ub.is_searching then
    return array['H0_inactive'];
  end if;
  select * into v_pa from public.profiles where user_id = p_a;
  select * into v_pb from public.profiles where user_id = p_b;
  if v_pa.completed_at is null or v_pb.completed_at is null then
    return array['H0_incomplete_profile'];
  end if;
  select count(*) into v_required from public.questions where is_required;
  if (select count(*) from public.user_answers a join public.questions q on q.id = a.question_id
       where a.user_id = p_a and q.is_required) < v_required
     or (select count(*) from public.user_answers a join public.questions q on q.id = a.question_id
          where a.user_id = p_b and q.is_required) < v_required then
    return array['H0_incomplete_answers'];
  end if;

  -- H1 · housing roles: has_room <-> has_room is excluded (approved decision #2)
  if v_pa.housing_status = 'has_room' and v_pb.housing_status = 'has_room' then
    return array['H1_housing_roles'];
  end if;

  select * into v_qa from public.roommate_preferences where user_id = p_a;
  select * into v_qb from public.roommate_preferences where user_id = p_b;

  -- H2 · gender (both directions)
  if not (v_pb.gender = any (coalesce(v_qa.accepted_genders, v_all_genders)))
     or not (v_pa.gender = any (coalesce(v_qb.accepted_genders, v_all_genders))) then
    v_reasons := array_append(v_reasons, 'H2_gender');
  end if;

  -- H3 · age (only when the side marked it as a dealbreaker)
  v_age_a := date_part('year', age(current_date, v_pa.date_of_birth))::int;
  v_age_b := date_part('year', age(current_date, v_pb.date_of_birth))::int;
  if (coalesce(v_qa.age_is_dealbreaker, false)
        and ((v_qa.age_min is not null and v_age_b < v_qa.age_min)
          or (v_qa.age_max is not null and v_age_b > v_qa.age_max)))
     or (coalesce(v_qb.age_is_dealbreaker, false)
        and ((v_qb.age_min is not null and v_age_a < v_qb.age_min)
          or (v_qb.age_max is not null and v_age_a > v_qb.age_max))) then
    v_reasons := array_append(v_reasons, 'H3_age');
  end if;

  -- H4 · smoking
  if (coalesce(v_qa.smoking_policy, 'any') = 'non_smoker_only' and v_pb.is_smoker)
     or (coalesce(v_qb.smoking_policy, 'any') = 'non_smoker_only' and v_pa.is_smoker) then
    v_reasons := array_append(v_reasons, 'H4_smoking');
  end if;

  -- H5-H11 · housing
  if v_pa.housing_status = 'has_room' and v_pb.housing_status = 'looking_for_room' then
    v_reasons := v_reasons || public.fn_room_seeker_reasons(p_a, p_b);
  elsif v_pa.housing_status = 'looking_for_room' and v_pb.housing_status = 'has_room' then
    v_reasons := v_reasons || public.fn_room_seeker_reasons(p_b, p_a);
  else
    -- both looking: co-search
    select * into v_ra from public.room_preferences where user_id = p_a;
    select * into v_rb from public.room_preferences where user_id = p_b;
    if v_ra.user_id is null or v_rb.user_id is null then
      return array_append(v_reasons, 'H0_incomplete_profile');
    end if;
    -- H5 · preferred areas must intersect (an empty list means "anywhere in my city")
    v_loc_ok := case
      when cardinality(v_ra.preferred_district_codes) > 0 and cardinality(v_rb.preferred_district_codes) > 0
        then v_ra.preferred_district_codes && v_rb.preferred_district_codes
      when cardinality(v_ra.preferred_district_codes) = 0 and cardinality(v_rb.preferred_district_codes) = 0
        then v_pa.city_code is not distinct from v_pb.city_code
      when cardinality(v_ra.preferred_district_codes) = 0
        then exists (select 1 from public.geo_units g
                      where g.code = any (v_rb.preferred_district_codes) and g.parent_code = v_pa.city_code)
      else exists (select 1 from public.geo_units g
                    where g.code = any (v_ra.preferred_district_codes) and g.parent_code = v_pb.city_code)
    end;
    if not v_loc_ok then
      v_reasons := array_append(v_reasons, 'H5_location');
    end if;
    -- H6 · budget bands must overlap
    if greatest(coalesce(v_ra.budget_min, 0), coalesce(v_rb.budget_min, 0))
         > least(v_ra.budget_max, v_rb.budget_max) then
      v_reasons := array_append(v_reasons, 'H6_budget');
    end if;
    -- H7 · move-in flexibility windows must overlap
    if abs(v_ra.move_in_date - v_rb.move_in_date) > (v_ra.move_in_flex_days + v_rb.move_in_flex_days) then
      v_reasons := array_append(v_reasons, 'H7_move_in');
    end if;
  end if;

  return v_reasons;
end;
$$;

create or replace function public.fn_is_pair_eligible(p_a uuid, p_b uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select cardinality(public.fn_pair_ineligibility_reasons(p_a, p_b)) = 0;
$$;

-- Candidate ids for a viewer: eligible AND not already liked / passed / matched.
-- Server-only (EXECUTE is revoked from clients; see the RLS migration).
create or replace function public.fn_eligible_candidates(p_viewer uuid)
returns setof uuid
language sql stable security definer set search_path = public, pg_temp
as $$
  select u.id
    from public.users u
   where u.id <> p_viewer
     and u.is_searching
     and u.deleted_at is null
     and not exists (select 1 from public.likes  l where l.from_user = p_viewer and l.to_user = u.id)
     and not exists (select 1 from public.passes p where p.from_user = p_viewer and p.to_user = u.id)
     and not exists (select 1 from public.matches m
                      where m.user_a = least(p_viewer, u.id) and m.user_b = greatest(p_viewer, u.id))
     and public.fn_is_pair_eligible(p_viewer, u.id);
$$;

-- May the caller see this user's public data?
-- self, an active match, an eligible pair, or someone who liked / passed the caller
-- (the "who liked you" / "profile rejected" notifications must be able to name them).
create or replace function public.fn_can_view_user(p_target uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select auth.uid() is not null and (
         p_target = auth.uid()
      or public.fn_is_active_match_with(p_target)
      or exists (select 1 from public.likes  l where l.from_user = p_target and l.to_user = auth.uid())
      or exists (select 1 from public.passes p where p.from_user = p_target and p.to_user = auth.uid())
      or public.fn_is_pair_eligible(auth.uid(), p_target));
$$;

-- ---------------------------------------------------------------------------
-- Likes / passes / mutual match  (atomic; the pair is serialised with an advisory lock so two
-- simultaneous likes can never miss each other)
-- ---------------------------------------------------------------------------
create or replace function public.rpc_like_user(p_target uuid)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_me        uuid := auth.uid();
  v_low       uuid;
  v_high      uuid;
  v_like_id   uuid;
  v_match_id  uuid;
  v_conv_id   uuid;
  v_status    public.match_status_t;
  v_score     numeric;
  v_new_match boolean := false;
begin
  if v_me is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_target is null or p_target = v_me then
    raise exception 'invalid target' using errcode = '22023';
  end if;
  v_low  := least(v_me, p_target);
  v_high := greatest(v_me, p_target);

  perform pg_advisory_xact_lock(hashtextextended(v_low::text || ':' || v_high::text, 0));

  if not public.fn_is_pair_eligible(v_me, p_target) then
    raise exception 'target is not eligible' using errcode = '42501';
  end if;

  -- already matched → idempotent answer
  select m.id, m.status into v_match_id, v_status
    from public.matches m where m.user_a = v_low and m.user_b = v_high;
  if v_match_id is not null and v_status = 'active' then
    select id into v_conv_id from public.conversations where match_id = v_match_id;
    return jsonb_build_object('matched', true, 'match_id', v_match_id, 'conversation_id', v_conv_id);
  end if;

  delete from public.passes where from_user = v_me and to_user = p_target;   -- changed my mind
  insert into public.likes (from_user, to_user) values (v_me, p_target)
    on conflict (from_user, to_user) do nothing
    returning id into v_like_id;                                              -- null when it already existed

  select final_score into v_score from public.compatibility_scores
   where user_low = v_low and user_high = v_high;

  if exists (select 1 from public.likes where from_user = p_target and to_user = v_me) then
    insert into public.matches (user_a, user_b) values (v_low, v_high)
      on conflict (user_a, user_b) do update set status = 'active'
      where public.matches.status = 'closed'
      returning id into v_match_id;
    if v_match_id is null then
      select id into v_match_id from public.matches where user_a = v_low and user_b = v_high;
    else
      v_new_match := true;
    end if;
    insert into public.conversations (match_id) values (v_match_id)
      on conflict (match_id) do nothing;
    select id into v_conv_id from public.conversations where match_id = v_match_id;

    if v_new_match then
      insert into public.notifications (user_id, type, actor_id, payload)
      select u.id, 'mutual_match', case when u.id = v_me then p_target else v_me end,
             jsonb_build_object('match_id', v_match_id, 'conversation_id', v_conv_id, 'score', v_score)
        from (values (v_me), (p_target)) as u(id);
    end if;
    return jsonb_build_object('matched', true, 'match_id', v_match_id, 'conversation_id', v_conv_id);
  end if;

  -- one-sided like → "who liked you" notification (only the first time)
  if v_like_id is not null then
    insert into public.notifications (user_id, type, actor_id, payload)
    values (p_target, 'new_like', v_me, jsonb_build_object('score', v_score));
  end if;
  return jsonb_build_object('matched', false);
end;
$$;

create or replace function public.rpc_pass_user(p_target uuid)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_me      uuid := auth.uid();
  v_low     uuid;
  v_high    uuid;
  v_pass_id uuid;
begin
  if v_me is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_target is null or p_target = v_me then
    raise exception 'invalid target' using errcode = '22023';
  end if;
  v_low  := least(v_me, p_target);
  v_high := greatest(v_me, p_target);
  perform pg_advisory_xact_lock(hashtextextended(v_low::text || ':' || v_high::text, 0));

  if not public.fn_is_pair_eligible(v_me, p_target) then
    raise exception 'target is not eligible' using errcode = '42501';
  end if;
  if exists (select 1 from public.matches where user_a = v_low and user_b = v_high and status = 'active') then
    raise exception 'already matched' using errcode = 'P0001';
  end if;

  delete from public.likes where from_user = v_me and to_user = p_target;    -- changed my mind
  insert into public.passes (from_user, to_user) values (v_me, p_target)
    on conflict (from_user, to_user) do nothing
    returning id into v_pass_id;

  if v_pass_id is not null then                                               -- "viewed and chose not a fit"
    insert into public.notifications (user_id, type, actor_id)
    values (p_target, 'passed', v_me);
  end if;
  return jsonb_build_object('passed', true);
end;
$$;

-- Records a profile view; creates at most one notification per viewer per 24 h.
create or replace function public.rpc_record_profile_view(p_target uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_target is null or p_target = v_me then
    return;
  end if;
  if not public.fn_can_view_user(p_target) then
    raise exception 'target is not visible' using errcode = '42501';
  end if;
  insert into public.profile_views (viewer_id, viewed_id) values (v_me, p_target)
    on conflict (viewer_id, viewed_id) do update set viewed_at = now();
  if not exists (select 1 from public.notifications
                  where user_id = p_target and actor_id = v_me and type = 'profile_view'
                    and created_at > now() - interval '24 hours') then
    insert into public.notifications (user_id, type, actor_id) values (p_target, 'profile_view', v_me);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Chat helpers
-- ---------------------------------------------------------------------------
create or replace function public.rpc_mark_read(p_conversation uuid)
returns integer
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  if not public.fn_conversation_access(p_conversation) then
    raise exception 'conversation not accessible' using errcode = '42501';
  end if;
  update public.messages
     set read_at = now()
   where conversation_id = p_conversation
     and sender_id <> auth.uid()
     and read_at is null;
  get diagnostics v_count = row_count;
  -- the related "new message" notification is now stale
  update public.notifications
     set read_at = now()
   where user_id = auth.uid() and type = 'new_message' and read_at is null
     and payload ->> 'conversation_id' = p_conversation::text;
  return v_count;
end;
$$;

-- Messages: defence in depth (RLS also checks) + conversation bookkeeping + notification
create or replace function public.tg_messages_before_insert()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_ok boolean;
begin
  select exists (
    select 1 from public.conversations c
      join public.matches m on m.id = c.match_id
     where c.id = new.conversation_id and m.status = 'active'
       and new.sender_id in (m.user_a, m.user_b)) into v_ok;
  if not v_ok then
    raise exception 'sender is not a participant of an active conversation' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger messages_before_insert before insert on public.messages
  for each row execute function public.tg_messages_before_insert();

create or replace function public.tg_messages_after_insert()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_recipient uuid;
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;

  select case when m.user_a = new.sender_id then m.user_b else m.user_a end into v_recipient
    from public.conversations c join public.matches m on m.id = c.match_id
   where c.id = new.conversation_id;

  -- coalesce: one unread "new message" notification per conversation
  if not exists (select 1 from public.notifications
                  where user_id = v_recipient and type = 'new_message' and read_at is null
                    and payload ->> 'conversation_id' = new.conversation_id::text) then
    insert into public.notifications (user_id, type, actor_id, payload)
    values (v_recipient, 'new_message', new.sender_id,
            jsonb_build_object('conversation_id', new.conversation_id));
  end if;
  return null;
end;
$$;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.tg_messages_after_insert();

-- ---------------------------------------------------------------------------
-- Rooms: exact address only for the owner and mutual matches
-- ---------------------------------------------------------------------------
create or replace function public.rpc_get_room_address(p_room uuid)
returns text
language sql stable security definer set search_path = public, pg_temp
as $$
  select r.address_line
    from public.rooms r
   where r.id = p_room
     and auth.uid() is not null
     and (r.owner_id = auth.uid() or public.fn_is_active_match_with(r.owner_id));
$$;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
create or replace function public.tg_verification_before_insert()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from public.profiles
              where user_id = new.user_id and verification_status = 'verified') then
    raise exception 'user is already verified' using errcode = '23505';
  end if;
  return new;
end;
$$;
create trigger verification_before_insert before insert on public.verification_records
  for each row execute function public.tg_verification_before_insert();

create or replace function public.tg_verification_after_insert()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  update public.profiles set verification_status = 'pending' where user_id = new.user_id;
  return null;
end;
$$;
create trigger verification_after_insert after insert on public.verification_records
  for each row execute function public.tg_verification_after_insert();

-- Admin decision. The only path that can set profiles.verification_status to verified/rejected.
create or replace function public.rpc_review_verification(p_record uuid, p_approve boolean, p_reason text default null)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_rec public.verification_records;
begin
  if not public.fn_is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  select * into v_rec from public.verification_records where id = p_record for update;
  if not found then
    raise exception 'verification record not found' using errcode = 'P0002';
  end if;
  if v_rec.status <> 'pending' then
    raise exception 'record already reviewed' using errcode = 'P0001';
  end if;
  if not p_approve and coalesce(btrim(p_reason), '') = '' then
    raise exception 'a rejection needs a reason' using errcode = '22023';
  end if;

  update public.verification_records
     set status = case when p_approve then 'verified'::public.verification_status_t
                       else 'rejected'::public.verification_status_t end,
         reviewed_by = auth.uid(), reviewed_at = now(),
         reject_reason = case when p_approve then null else left(p_reason, 300) end
   where id = p_record;

  update public.profiles
     set verification_status = case when p_approve then 'verified'::public.verification_status_t
                                    else 'rejected'::public.verification_status_t end
   where user_id = v_rec.user_id;

  insert into public.notifications (user_id, type, actor_id, payload)
  values (v_rec.user_id, 'verification_update', null,
          jsonb_build_object('status', case when p_approve then 'verified' else 'rejected' end,
                             'reason', case when p_approve then null else left(p_reason, 300) end));
  return jsonb_build_object('status', case when p_approve then 'verified' else 'rejected' end);
end;
$$;
