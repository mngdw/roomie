-- =============================================================================
-- ROOMIE · DEVELOPMENT SEED DATA (never run in production)
--
-- 10 personas with intentionally different lifestyles, plus one admin.
-- Every account's password: Password123!
--
--   #  id suffix  name   gender age  housing            notes
--   1  ...0001    Ngọc   F      22   looking_for_room   fixture viewer: budget 2.4M, TX/CG/ĐĐ/HBT, 01/11, women only, non-smokers only
--   2  ...0002    Linh   F      23   has_room TX 4.8M   answers ≈ Ngọc (2 answers differ by 1)       → eligible, already matched with Ngọc
--   3  ...0003    Minh   F      24   has_room CG 4.6M   ~8 answers differ by 1                        → eligible, liked Ngọc
--   4  ...0004    Trang  F      22   has_room HBT 4.4M  same G1-G2, night owl, many guests             → eligible
--   5  ...0005    Mai    F      21   has_room ĐĐ 4.0M   near-inverse answers                          → eligible (low score), passed Ngọc
--   6  ...0006    Hà     M      23   has_room TX 4.6M   answers identical to Ngọc                     → excluded H2 (gender)
--   7  ...0007    An     F      24   has_room TX 6.2M   answers identical to Ngọc                     → excluded H6 (budget)
--   8  ...0008    Hùng   M      25   has_room HĐ 5.0M   introvert, quiet, men only                    → excluded H2
--   9  ...0009    Lan    F      20   looking_for_room   social, cooks a lot, budget 3.0M, CG/ĐĐ       → eligible (co-search)
--  10  ...000a    Khoa   M      26   looking_for_room   smoker, night-owl gamer, LB/HM                → excluded H2
--  ff  ...00ff    Admin  -      -    -                  role = admin, no profile (reviews verification)
--
-- Expected for Ngọc: eligible pairs = Linh, Minh, Trang, Mai, Lan;
--                    discovery candidates = Minh, Trang, Mai, Lan (Linh is already a match).
-- =============================================================================

do $$
begin
  if exists (select 1 from auth.users where id = 'a0000000-0000-4000-8000-000000000001') then
    raise exception 'seed data is already loaded - run "npm run db:reset" for a clean database';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Auth accounts (public.users rows are created by the on_auth_user_created trigger)
-- ---------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
       extensions.crypt('Password123!', extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  from (values
    ('a0000000-0000-4000-8000-000000000001'::uuid, 'ngoc@roomie.test'),
    ('a0000000-0000-4000-8000-000000000002'::uuid, 'linh@roomie.test'),
    ('a0000000-0000-4000-8000-000000000003'::uuid, 'minh@roomie.test'),
    ('a0000000-0000-4000-8000-000000000004'::uuid, 'trang@roomie.test'),
    ('a0000000-0000-4000-8000-000000000005'::uuid, 'mai@roomie.test'),
    ('a0000000-0000-4000-8000-000000000006'::uuid, 'ha@roomie.test'),
    ('a0000000-0000-4000-8000-000000000007'::uuid, 'an@roomie.test'),
    ('a0000000-0000-4000-8000-000000000008'::uuid, 'hung@roomie.test'),
    ('a0000000-0000-4000-8000-000000000009'::uuid, 'lan@roomie.test'),
    ('a0000000-0000-4000-8000-00000000000a'::uuid, 'khoa@roomie.test'),
    ('a0000000-0000-4000-8000-0000000000ff'::uuid, 'admin@roomie.test')
  ) as u(id, email);

-- On a real Supabase instance e-mail sign-in also needs an identity row.
do $$
begin
  if to_regclass('auth.identities') is not null then
    execute $sql$
      insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      select gen_random_uuid(), u.id, u.id::text,
             jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
             'email', now(), now(), now()
        from auth.users u
       where u.email like '%@roomie.test'
    $sql$;
  end if;
end
$$;

update public.users set role = 'admin' where id = 'a0000000-0000-4000-8000-0000000000ff';

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
insert into public.profiles (user_id, display_name, full_name, date_of_birth, gender, school_or_workplace,
                             occupation, city_code, district_code, hometown_code, bio, mbti_type, is_smoker,
                             housing_status) values
  ('a0000000-0000-4000-8000-000000000001', 'Ngọc',  'Nguyễn Bảo Ngọc',  '2004-03-15', 'female', 'Đại học Hà Nội (HANU)',            'Sinh viên',            'hn', 'hn-thanh-xuan',   'hn', 'Sinh viên năm 3, thích nấu ăn đơn giản và giữ phòng gọn gàng.', 'ISFJ', false, 'looking_for_room'),
  ('a0000000-0000-4000-8000-000000000002', 'Linh',  'Trần Thùy Linh',   '2003-06-02', 'female', 'Đại học Kinh tế Quốc dân',         'Sinh viên',            'hn', 'hn-thanh-xuan',   'hn', 'Mình có phòng ở Thanh Xuân, tìm bạn nữ ở ghép sạch sẽ.',        'ISTJ', false, 'has_room'),
  ('a0000000-0000-4000-8000-000000000003', 'Minh',  'Lê Ngọc Minh',     '2002-01-20', 'female', 'Công ty phần mềm ABC',             'Nhân viên văn phòng',  'hn', 'hn-cau-giay',     'hn', 'Đi làm giờ hành chính, cuối tuần hay đi cà phê.',                'ESFJ', false, 'has_room'),
  ('a0000000-0000-4000-8000-000000000004', 'Trang', 'Phạm Thu Trang',   '2004-09-09', 'female', 'Học viện Báo chí và Tuyên truyền', 'Sinh viên',            'hn', 'hn-hai-ba-trung', 'hn', 'Cú đêm chính hiệu, hay rủ bạn bè về nhà chơi.',                  'ENFP', false, 'has_room'),
  ('a0000000-0000-4000-8000-000000000005', 'Mai',   'Đỗ Tuyết Mai',     '2005-02-11', 'female', 'Đại học Thương mại',               'Sinh viên',            'hn', 'hn-dong-da',      'hn', 'Sống thoải mái, không quá câu nệ chuyện dọn dẹp.',               null,   false, 'has_room'),
  ('a0000000-0000-4000-8000-000000000006', 'Hà',    'Vũ Minh Hà',       '2003-04-30', 'male',   'Đại học Bách khoa Hà Nội',         'Sinh viên',            'hn', 'hn-thanh-xuan',   'hn', 'Có phòng ở Thanh Xuân, ai cũng được miễn hợp tính.',             'INTJ', false, 'has_room'),
  ('a0000000-0000-4000-8000-000000000007', 'An',    'Hoàng Thanh An',   '2002-12-12', 'female', 'Ngân hàng XYZ',                    'Chuyên viên',          'hn', 'hn-thanh-xuan',   'hn', 'Căn hộ rộng, đầy đủ tiện nghi.',                                  'ESTJ', false, 'has_room'),
  ('a0000000-0000-4000-8000-000000000008', 'Hùng',  'Bùi Quốc Hùng',    '2001-07-07', 'male',   'Công ty xây dựng DEF',             'Kỹ sư',                'hn', 'hn-ha-dong',      'hn', 'Ít nói, thích yên tĩnh, ngủ sớm dậy sớm.',                        'INTP', false, 'has_room'),
  ('a0000000-0000-4000-8000-000000000009', 'Lan',   'Ngô Phương Lan',   '2006-05-25', 'female', 'Đại học Sư phạm Hà Nội',           'Sinh viên',            'hn', 'hn-cau-giay',     'hn', 'Thích nấu ăn cùng mọi người và trò chuyện.',                     'ESFP', false, 'looking_for_room'),
  ('a0000000-0000-4000-8000-00000000000a', 'Khoa',  'Đặng Minh Khoa',   '2000-11-03', 'male',   'Freelancer',                       'Lập trình viên',       'hn', 'hn-long-bien',    'hn', 'Làm việc đêm, chơi game, có hút thuốc.',                          'ENTP', true,  'looking_for_room');

-- ---------------------------------------------------------------------------
-- Roommate requirements
-- ---------------------------------------------------------------------------
insert into public.roommate_preferences (user_id, accepted_genders, age_min, age_max, age_is_dealbreaker,
                                         smoking_policy, requirement_tags) values
  ('a0000000-0000-4000-8000-000000000001', '{female}',             18, 28, false, 'non_smoker_only', '{clean_tidy,pays_on_time,respects_privacy}'),
  ('a0000000-0000-4000-8000-000000000002', '{female}',             18, 30, false, 'non_smoker_only', '{clean_tidy,pays_on_time}'),
  ('a0000000-0000-4000-8000-000000000003', '{female}',             null, null, false, 'non_smoker_only', '{share_costs}'),
  ('a0000000-0000-4000-8000-000000000004', '{female}',             null, null, false, 'any',             '{share_costs}'),
  ('a0000000-0000-4000-8000-000000000005', '{female,other}',       null, null, false, 'any',             '{}'),
  ('a0000000-0000-4000-8000-000000000006', '{male,female,other}',  null, null, false, 'any',             '{pays_on_time}'),
  ('a0000000-0000-4000-8000-000000000007', '{female}',             22, 35, false, 'non_smoker_only', '{clean_tidy,pays_on_time}'),
  ('a0000000-0000-4000-8000-000000000008', '{male}',               22, 35, true,  'non_smoker_only', '{respects_privacy,no_smoking}'),
  ('a0000000-0000-4000-8000-000000000009', '{female}',             18, 25, false, 'non_smoker_only', '{share_costs}'),
  ('a0000000-0000-4000-8000-00000000000a', '{male,female,other}',  null, null, false, 'any',             '{}');

-- ---------------------------------------------------------------------------
-- Room preferences (room seekers)
-- ---------------------------------------------------------------------------
insert into public.room_preferences (user_id, preferred_district_codes, budget_min, budget_max, room_types,
                                     move_in_date, move_in_flex_days, must_have_facilities, require_media, notes) values
  ('a0000000-0000-4000-8000-000000000001', '{hn-thanh-xuan,hn-cau-giay,hn-dong-da,hn-hai-ba-trung}', 1500000, 2400000, '{}',
   '2026-11-01', 30, '{wifi}', false, 'Gần trường HANU càng tốt.'),
  ('a0000000-0000-4000-8000-000000000009', '{hn-cau-giay,hn-dong-da}', null, 3000000, '{}',
   '2026-11-10', 30, '{}', false, null),
  ('a0000000-0000-4000-8000-00000000000a', '{hn-long-bien,hn-hoang-mai}', 2000000, 3500000, '{private}',
   '2026-12-01', 30, '{wifi,air_conditioner}', false, 'Cần chỗ yên tĩnh để làm việc ban đêm.');

-- ---------------------------------------------------------------------------
-- Rooms (owners) — address_line is private
-- ---------------------------------------------------------------------------
insert into public.rooms (id, owner_id, city_code, district_code, address_line, monthly_rent, deposit, area_m2,
                          room_type, capacity_total, current_occupants, facilities, services, utilities,
                          available_from, notes, is_published) values
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'hn', 'hn-thanh-xuan',
   'Ngõ 1 Nguyễn Trãi (dữ liệu mẫu)', 4800000, 4800000, 25.0, 'shared', 2, 1,
   '{wifi,air_conditioner,washing_machine,fridge}', '{cleaning,garbage}',
   '{"electricity_per_kwh": 3800, "water": 100000, "internet": 0, "notes": "Nước tính theo người"}',
   '2026-11-01', 'Phòng có cửa sổ, gần ĐH Hà Nội.', true),
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', 'hn', 'hn-cau-giay',
   'Ngõ 2 Xuân Thủy (dữ liệu mẫu)', 4600000, 4600000, 22.0, 'shared', 2, 1,
   '{wifi,air_conditioner,water_heater}', '{garbage}', '{"electricity_per_kwh": 3500}',
   '2026-11-05', null, true),
  ('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000004', 'hn', 'hn-hai-ba-trung',
   'Ngõ 3 Bạch Mai (dữ liệu mẫu)', 4400000, 2000000, 20.0, 'shared', 2, 1,
   '{wifi,fridge}', '{}', '{}', '2026-11-15', null, true),
  ('b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000005', 'hn', 'hn-dong-da',
   'Ngõ 4 Chùa Bộc (dữ liệu mẫu)', 4000000, 0, 18.0, 'shared', 2, 1,
   '{wifi}', '{}', '{}', '2026-11-01', null, true),
  ('b0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000006', 'hn', 'hn-thanh-xuan',
   'Ngõ 5 Khuất Duy Tiến (dữ liệu mẫu)', 4600000, 4600000, 24.0, 'shared', 2, 1,
   '{wifi,air_conditioner}', '{}', '{}', '2026-11-01', null, true),
  ('b0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000007', 'hn', 'hn-thanh-xuan',
   'Chung cư Royal (dữ liệu mẫu)', 6200000, 6200000, 35.0, 'private', 2, 1,
   '{wifi,air_conditioner,washing_machine,fridge,elevator,security}', '{cleaning,security_guard}',
   '{"service_fee": 300000}', '2026-11-01', 'Căn hộ chung cư, có bảo vệ 24/7.', true),
  ('b0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000008', 'hn', 'hn-ha-dong',
   'Ngõ 6 Quang Trung (dữ liệu mẫu)', 5000000, 5000000, 28.0, 'shared', 2, 1,
   '{wifi,parking}', '{}', '{}', '2026-11-01', null, true);

-- placeholder media (paths inside the owner's folder of the room-media bucket)
insert into public.room_images (room_id, kind, storage_path, position) values
  ('b0000000-0000-4000-8000-000000000002', 'image', 'a0000000-0000-4000-8000-000000000002/room-1.jpg', 0),
  ('b0000000-0000-4000-8000-000000000002', 'image', 'a0000000-0000-4000-8000-000000000002/room-2.jpg', 1),
  ('b0000000-0000-4000-8000-000000000002', 'video', 'a0000000-0000-4000-8000-000000000002/tour.mp4',   2),
  ('b0000000-0000-4000-8000-000000000003', 'image', 'a0000000-0000-4000-8000-000000000003/room-1.jpg', 0),
  ('b0000000-0000-4000-8000-000000000007', 'image', 'a0000000-0000-4000-8000-000000000007/room-1.jpg', 0);

-- ---------------------------------------------------------------------------
-- Questionnaire answers (Q1..Q30, in order). Q14 is multi-select ("1,2"), Q22 is 1..4.
--             G1 lifestyle    | G2 cleanliness | G3 schedule/noise   | G4 social/space | G5 money     | G6 communication
-- ---------------------------------------------------------------------------
with v(user_id, answers) as (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, array['3','3','4','4','3', '4','4','3','4','4', '2','3','2','1,2','4',     '2','3','4','3','4', '5','1','3','4','3', '4','4','4','4','4']),  -- Ngọc
  ('a0000000-0000-4000-8000-000000000002'::uuid, array['4','3','4','4','3', '4','4','3','4','4', '2','3','2','1,2','4',     '2','4','4','3','4', '5','1','3','4','3', '4','4','4','4','4']),  -- Linh
  ('a0000000-0000-4000-8000-000000000003'::uuid, array['3','4','4','3','3', '4','3','3','4','5', '2','2','2','1,2','4',     '3','3','4','3','3', '5','1','3','4','3', '4','3','4','4','4']),  -- Minh
  ('a0000000-0000-4000-8000-000000000004'::uuid, array['3','3','4','4','3', '4','4','3','4','4', '5','5','5','3,4,5,6','2', '5','5','2','5','2', '4','3','3','4','3', '4','4','4','3','4']),  -- Trang
  ('a0000000-0000-4000-8000-000000000005'::uuid, array['1','1','2','1','1', '1','1','1','2','1', '5','5','5','4,5','1',     '5','5','2','5','1', '2','4','1','2','1', '1','2','2','2','1']),  -- Mai
  ('a0000000-0000-4000-8000-000000000006'::uuid, array['3','3','4','4','3', '4','4','3','4','4', '2','3','2','1,2','4',     '2','3','4','3','4', '5','1','3','4','3', '4','4','4','4','4']),  -- Hà (= Ngọc)
  ('a0000000-0000-4000-8000-000000000007'::uuid, array['3','3','4','4','3', '4','4','3','4','4', '2','3','2','1,2','4',     '2','3','4','3','4', '5','1','3','4','3', '4','4','4','4','4']),  -- An (= Ngọc)
  ('a0000000-0000-4000-8000-000000000008'::uuid, array['4','4','5','5','2', '5','4','4','5','5', '1','1','1','1','5',       '1','2','5','1','5', '5','3','4','3','5', '3','4','2','4','2']),  -- Hùng
  ('a0000000-0000-4000-8000-000000000009'::uuid, array['5','5','3','3','4', '3','3','3','3','3', '3','3','3','1,2,6','3',   '4','5','2','5','2', '4','1','4','5','3', '5','4','5','5','5']),  -- Lan
  ('a0000000-0000-4000-8000-00000000000a'::uuid, array['1','2','4','1','4', '2','1','1','2','1', '5','5','5','3,5','1',     '3','4','2','2','3', '3','2','3','3','1', '3','3','4','3','4'])   -- Khoa
)
insert into public.user_answers (user_id, question_id, option_values)
select v.user_id, md5('roomie:question:' || t.n)::uuid, string_to_array(t.a, ',')::smallint[]
  from v, unnest(v.answers) with ordinality as t(a, n);

-- an "other" free-text answer (Q14 option 7 = Khác) — stored, never shown publicly, never scored
update public.user_answers
   set option_values = '{3,5,7}', other_text = 'Livestream'
 where user_id = 'a0000000-0000-4000-8000-00000000000a'
   and question_id = md5('roomie:question:14')::uuid;

-- ---------------------------------------------------------------------------
-- Verification (dummy values; real HMAC/ciphertext are produced by the server)
-- ---------------------------------------------------------------------------
insert into public.verification_records (id, user_id, status, id_number_hmac, id_number_last4, pii_ciphertext,
                                         document_path, consent_version, consent_at, submitted_at,
                                         reviewed_by, reviewed_at)
values
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'verified',
   extensions.hmac('001304000002', 'dev-only-secret', 'sha256'), '0002', null,
   null, 'v1', now() - interval '3 days', now() - interval '3 days',
   'a0000000-0000-4000-8000-0000000000ff', now() - interval '2 days'),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', 'pending',
   extensions.hmac('001302000003', 'dev-only-secret', 'sha256'), '0003', null,
   'a0000000-0000-4000-8000-000000000003/cccd-front.jpg', 'v1', now() - interval '1 day', now() - interval '1 day',
   null, null);
-- the insert trigger marks profiles as pending; Linh's request was already approved
update public.profiles set verification_status = 'verified' where user_id = 'a0000000-0000-4000-8000-000000000002';

-- ---------------------------------------------------------------------------
-- Interactions
-- ---------------------------------------------------------------------------
-- Ngọc ↔ Linh: mutual like → match → conversation with 3 messages
insert into public.likes (from_user, to_user, created_at) values
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', now() - interval '2 days'),
  ('a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', now() - interval '1 day 20 hours');
insert into public.matches (id, user_a, user_b, created_at) values
  ('d0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002',
   now() - interval '1 day 20 hours');
insert into public.conversations (id, match_id, created_at) values
  ('e0000000-0000-4000-8000-000000000012', 'd0000000-0000-4000-8000-000000000012', now() - interval '1 day 20 hours');
insert into public.notifications (user_id, type, actor_id, payload, created_at, read_at) values
  ('a0000000-0000-4000-8000-000000000001', 'new_like',     'a0000000-0000-4000-8000-000000000002', '{}', now() - interval '2 days', now() - interval '2 days'),
  ('a0000000-0000-4000-8000-000000000001', 'mutual_match', 'a0000000-0000-4000-8000-000000000002',
   '{"match_id":"d0000000-0000-4000-8000-000000000012","conversation_id":"e0000000-0000-4000-8000-000000000012"}',
   now() - interval '1 day 20 hours', now() - interval '1 day'),
  ('a0000000-0000-4000-8000-000000000002', 'mutual_match', 'a0000000-0000-4000-8000-000000000001',
   '{"match_id":"d0000000-0000-4000-8000-000000000012","conversation_id":"e0000000-0000-4000-8000-000000000012"}',
   now() - interval '1 day 20 hours', null);
-- messages fire the conversation/notification triggers
insert into public.messages (conversation_id, sender_id, body, created_at) values
  ('e0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000001', 'Chào Linh, mình thấy phòng của bạn rất hợp!', now() - interval '1 day 19 hours'),
  ('e0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000002', 'Chào Ngọc! Cuối tuần này bạn qua xem phòng nhé?', now() - interval '1 day 18 hours'),
  ('e0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000001', 'Ok bạn, chiều thứ Bảy nhé.', now() - interval '1 day 17 hours');

-- Minh liked Ngọc (one-sided) → "who liked you"
insert into public.likes (from_user, to_user) values
  ('a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001');
insert into public.notifications (user_id, type, actor_id, payload) values
  ('a0000000-0000-4000-8000-000000000001', 'new_like', 'a0000000-0000-4000-8000-000000000003', '{}');

-- Mai passed on Ngọc → "profile rejected"
insert into public.passes (from_user, to_user) values
  ('a0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001');
insert into public.notifications (user_id, type, actor_id, payload) values
  ('a0000000-0000-4000-8000-000000000001', 'passed', 'a0000000-0000-4000-8000-000000000005', '{}');
