-- =============================================================================
-- ROOMIE · migration 0800 · Row Level Security, grants, public views, storage, realtime
--
-- Security model
--   1. Deny by default. Everything is revoked from anon / authenticated first, then
--      the minimum is granted back explicitly (table- and column-level).
--   2. Base tables hold private data and are readable only by their owner.
--      Other users never read base tables: they read the SECURITY DEFINER views
--      public_* below, which list only fields intended to be public and only for
--      users that fn_can_view_user() allows (self, active match, eligible pair,
--      someone who liked / passed you).
--      (The views deliberately run with the owner's rights - that is what lets them
--      expose a column subset of rows the caller could not select directly.)
--   3. Tables that must never be written by clients (likes, passes, matches,
--      conversations, notifications, compatibility_scores, profile_views, and the
--      server-controlled columns of users / profiles) have no write grant; they are
--      written by SECURITY DEFINER RPCs / triggers or by the service role.
--   4. CCCD data (verification_records) is written only by the server (service role,
--      which holds the HMAC / encryption secrets). The owner can read the non-secret
--      columns; id_number_hmac and pii_ciphertext are readable by nobody but the
--      service role. Documents live in a private bucket the client cannot read back.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Deny by default
-- ---------------------------------------------------------------------------
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

-- objects created by later migrations start closed as well
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from public, anon, authenticated;

grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

-- ---------------------------------------------------------------------------
-- 2. Enable RLS on every table (service_role bypasses RLS)
-- ---------------------------------------------------------------------------
alter table public.geo_units             enable row level security;
alter table public.users                 enable row level security;
alter table public.profiles              enable row level security;
alter table public.roommate_preferences  enable row level security;
alter table public.room_preferences      enable row level security;
alter table public.rooms                 enable row level security;
alter table public.room_images           enable row level security;
alter table public.question_categories   enable row level security;
alter table public.questions             enable row level security;
alter table public.question_options      enable row level security;
alter table public.user_answers          enable row level security;
alter table public.compatibility_scores  enable row level security;
alter table public.likes                 enable row level security;
alter table public.passes                enable row level security;
alter table public.profile_views         enable row level security;
alter table public.matches               enable row level security;
alter table public.conversations         enable row level security;
alter table public.messages              enable row level security;
alter table public.notifications         enable row level security;
alter table public.verification_records  enable row level security;

-- ---------------------------------------------------------------------------
-- 3. Reference data: readable by signed-in users, writable by nobody (migrations / service role)
-- ---------------------------------------------------------------------------
grant select on public.geo_units, public.question_categories, public.questions, public.question_options
  to authenticated;

create policy geo_units_read           on public.geo_units           for select to authenticated using (true);
create policy question_categories_read on public.question_categories for select to authenticated using (true);
create policy questions_read           on public.questions           for select to authenticated using (true);
create policy question_options_read    on public.question_options    for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 4. users: read own row; may only toggle is_searching
-- ---------------------------------------------------------------------------
grant select on public.users to authenticated;
grant update (is_searching) on public.users to authenticated;

create policy users_select_own on public.users for select to authenticated
  using (id = (select auth.uid()));
create policy users_update_own on public.users for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 5. profiles: owner-only. verification_status / completed_at are server-controlled.
-- ---------------------------------------------------------------------------
grant select on public.profiles to authenticated;
grant insert (user_id, display_name, full_name, date_of_birth, gender, school_or_workplace, occupation,
              city_code, district_code, hometown_code, bio, avatar_path, mbti_type, is_smoker, housing_status)
  on public.profiles to authenticated;
grant update (display_name, full_name, date_of_birth, gender, school_or_workplace, occupation,
              city_code, district_code, hometown_code, bio, avatar_path, mbti_type, is_smoker, housing_status)
  on public.profiles to authenticated;

create policy profiles_select_own on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));
create policy profiles_insert_own on public.profiles for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 6. roommate_preferences, room_preferences: owner-only
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.roommate_preferences to authenticated;
grant select, insert, update, delete on public.room_preferences     to authenticated;

create policy roommate_preferences_own on public.roommate_preferences for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy room_preferences_own on public.room_preferences for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 7. rooms, room_images: owner-only (others use public_rooms / public_room_media)
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.rooms to authenticated;
grant select, insert, update, delete on public.room_images to authenticated;

create policy rooms_own on public.rooms for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy room_images_own on public.room_images for all to authenticated
  using (exists (select 1 from public.rooms r where r.id = room_id and r.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.rooms r where r.id = room_id and r.owner_id = (select auth.uid())));

-- ---------------------------------------------------------------------------
-- 8. user_answers: owner-only
-- ---------------------------------------------------------------------------
grant select, delete on public.user_answers to authenticated;
grant insert (user_id, question_id, option_values, other_text) on public.user_answers to authenticated;
grant update (option_values, other_text) on public.user_answers to authenticated;

create policy user_answers_own on public.user_answers for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 9. Interactions: read-only for clients; every write goes through rpc_* functions
-- ---------------------------------------------------------------------------
grant select on public.likes, public.passes, public.matches, public.conversations,
                public.compatibility_scores to authenticated;

create policy likes_select_own  on public.likes  for select to authenticated
  using (from_user = (select auth.uid()));
create policy passes_select_own on public.passes for select to authenticated
  using (from_user = (select auth.uid()));
create policy matches_select_participant on public.matches for select to authenticated
  using ((select auth.uid()) in (user_a, user_b));
create policy conversations_select_participant on public.conversations for select to authenticated
  using (public.fn_conversation_access(id));
create policy compatibility_scores_select_participant on public.compatibility_scores for select to authenticated
  using ((select auth.uid()) in (user_low, user_high)
         and public.fn_can_view_user(case when user_low = (select auth.uid()) then user_high else user_low end));
-- profile_views: RLS on, no policy, no grant → invisible to clients

-- ---------------------------------------------------------------------------
-- 10. messages: participants of the conversation only; send only into an active match
-- ---------------------------------------------------------------------------
grant select on public.messages to authenticated;
grant insert (conversation_id, sender_id, body) on public.messages to authenticated;

create policy messages_select_participant on public.messages for select to authenticated
  using (public.fn_conversation_access(conversation_id));
create policy messages_insert_participant on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.fn_conversation_access(conversation_id, true));

-- ---------------------------------------------------------------------------
-- 11. notifications: read own, mark own as read
-- ---------------------------------------------------------------------------
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy notifications_select_own on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_update_own on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 12. verification_records: owner reads NON-SECRET columns; admin reads the same; writes = server only
--     (Inserting from the client would let anyone submit somebody else's ID hash and block it.)
-- ---------------------------------------------------------------------------
grant select (id, user_id, method, status, id_number_last4, document_path, consent_version,
              consent_at, submitted_at, reviewed_at, reject_reason, created_at, updated_at)
  on public.verification_records to authenticated;

create policy verification_records_select on public.verification_records for select to authenticated
  using (user_id = (select auth.uid()) or public.fn_is_admin());

-- ---------------------------------------------------------------------------
-- 13. Public views: the ONLY way to read another user's data
-- ---------------------------------------------------------------------------
create view public.public_profiles with (security_barrier = true) as
select p.user_id,
       p.display_name,
       date_part('year', age(current_date, p.date_of_birth))::int as age,
       p.gender,
       p.school_or_workplace,
       p.occupation,
       p.city_code,
       p.district_code,
       p.hometown_code,
       p.bio,
       p.avatar_path,
       p.mbti_type,
       p.is_smoker,
       p.housing_status,
       (p.verification_status = 'verified') as is_verified,     -- "Verified / Not verified" only
       p.created_at
  from public.profiles p
 where p.completed_at is not null
   and public.fn_can_view_user(p.user_id);

create view public.public_roommate_requirements with (security_barrier = true) as
select r.user_id, r.accepted_genders, r.age_min, r.age_max, r.smoking_policy, r.requirement_tags
  from public.roommate_preferences r
 where public.fn_can_view_user(r.user_id);

create view public.public_room_preferences with (security_barrier = true) as
select r.user_id, r.preferred_district_codes, r.budget_min, r.budget_max, r.room_types,
       r.move_in_date, r.must_have_facilities, r.require_media, r.notes
  from public.room_preferences r
 where public.fn_can_view_user(r.user_id);

-- published rooms only; the exact address (address_line) is never part of this view
create view public.public_rooms with (security_barrier = true) as
select r.id, r.owner_id, r.city_code, r.district_code, r.monthly_rent,
       round(r.monthly_rent::numeric / (r.current_occupants + 1))::bigint as rent_per_person,
       r.deposit, r.area_m2, r.room_type, r.capacity_total, r.current_occupants,
       r.facilities, r.services, r.utilities, r.available_from, r.notes, r.created_at
  from public.rooms r
 where r.is_published
   and public.fn_can_view_user(r.owner_id);

create view public.public_room_media with (security_barrier = true) as
select i.id, i.room_id, r.owner_id, i.kind, i.storage_path, i.position
  from public.room_images i
  join public.rooms r on r.id = i.room_id
 where r.is_published
   and public.fn_can_view_user(r.owner_id);

-- only questions flagged is_public; the free text of "Khác" is never exposed
create view public.public_lifestyle_answers with (security_barrier = true) as
select a.user_id, q.number as question_number, q.code as question_code, a.question_id, a.option_values
  from public.user_answers a
  join public.questions q on q.id = a.question_id
 where q.is_public
   and public.fn_can_view_user(a.user_id);

grant select on public.public_profiles, public.public_roommate_requirements,
                public.public_room_preferences, public.public_rooms,
                public.public_room_media, public.public_lifestyle_answers
  to authenticated;

-- ---------------------------------------------------------------------------
-- 14. Function privileges: client-callable surface is explicit and small
-- ---------------------------------------------------------------------------
-- needed because RLS policies / views call them with the caller's rights
grant execute on function public.fn_is_admin()                         to authenticated;
grant execute on function public.fn_is_active_match_with(uuid)         to authenticated;
grant execute on function public.fn_conversation_access(uuid, boolean) to authenticated;
grant execute on function public.fn_can_view_user(uuid)                to authenticated;
-- the application API
grant execute on function public.rpc_like_user(uuid)                       to authenticated;
grant execute on function public.rpc_pass_user(uuid)                       to authenticated;
grant execute on function public.rpc_record_profile_view(uuid)             to authenticated;
grant execute on function public.rpc_mark_read(uuid)                       to authenticated;
grant execute on function public.rpc_get_room_address(uuid)                to authenticated;
grant execute on function public.rpc_review_verification(uuid, boolean, text) to authenticated;  -- admin check inside
-- NOT granted (server only): fn_pair_ineligibility_reasons, fn_room_seeker_reasons,
--   fn_is_pair_eligible, fn_eligible_candidates - they would let a client probe other
--   users' private hard requirements.

-- ---------------------------------------------------------------------------
-- 15. Storage buckets (all private) and policies
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars',              'avatars',              false,  5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('room-media',           'room-media',           false, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']),
  ('verification-private', 'verification-private', false,  8388608, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- may the caller read this room-media object? (own file, or media of a published room they may view)
create or replace function public.fn_can_read_room_media(p_path text)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select auth.uid() is not null and (
         split_part(p_path, '/', 1) = auth.uid()::text
      or exists (select 1
                   from public.room_images i
                   join public.rooms r on r.id = i.room_id
                  where i.storage_path = p_path
                    and r.is_published
                    and public.fn_can_view_user(r.owner_id)));
$$;
grant execute on function public.fn_can_read_room_media(text) to authenticated;

-- avatars: write only inside your own folder; read your own or a visible user's
create policy avatars_read on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (
         (storage.foldername(name))[1] = (select auth.uid())::text
      or public.fn_can_view_user(
           case when (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                then (storage.foldername(name))[1]::uuid end)));
create policy avatars_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- room-media
create policy room_media_read on storage.objects for select to authenticated
  using (bucket_id = 'room-media' and public.fn_can_read_room_media(name));
create policy room_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'room-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy room_media_update on storage.objects for update to authenticated
  using (bucket_id = 'room-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'room-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy room_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'room-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- verification-private: owner may upload into their folder; nobody but admins reads back
create policy verification_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'verification-private' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy verification_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'verification-private' and public.fn_is_admin());

-- ---------------------------------------------------------------------------
-- 16. Realtime: chat and notifications (events are filtered by the RLS policies above)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages, public.notifications;
  end if;
end
$$;
