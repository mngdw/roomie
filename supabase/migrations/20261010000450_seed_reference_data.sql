-- =============================================================================
-- ROOMIE · migration 0450 · reference data: Hà Nội areas + the 30-question questionnaire
-- Source of truth: "ENP - Prototype.pdf" (section D). Question text is verbatim.
-- Ids are deterministic (md5-derived UUIDs) so every environment, and the generated
-- TypeScript catalog, refer to identical rows.
-- =============================================================================

-- Geography: Hà Nội (level 1) and its 30 legacy districts / areas (level 2) ---------
insert into public.geo_units (code, level, parent_code, name_vi, name_en) values
  ('hn', 1, null, 'Hà Nội', 'Hanoi');

insert into public.geo_units (code, level, parent_code, name_vi, name_en) values
  ('hn-ba-dinh',       2, 'hn', 'Ba Đình',       'Ba Dinh'),
  ('hn-hoan-kiem',     2, 'hn', 'Hoàn Kiếm',     'Hoan Kiem'),
  ('hn-hai-ba-trung',  2, 'hn', 'Hai Bà Trưng',  'Hai Ba Trung'),
  ('hn-dong-da',       2, 'hn', 'Đống Đa',       'Dong Da'),
  ('hn-tay-ho',        2, 'hn', 'Tây Hồ',        'Tay Ho'),
  ('hn-cau-giay',      2, 'hn', 'Cầu Giấy',      'Cau Giay'),
  ('hn-thanh-xuan',    2, 'hn', 'Thanh Xuân',    'Thanh Xuan'),
  ('hn-hoang-mai',     2, 'hn', 'Hoàng Mai',     'Hoang Mai'),
  ('hn-long-bien',     2, 'hn', 'Long Biên',     'Long Bien'),
  ('hn-nam-tu-liem',   2, 'hn', 'Nam Từ Liêm',   'Nam Tu Liem'),
  ('hn-bac-tu-liem',   2, 'hn', 'Bắc Từ Liêm',   'Bac Tu Liem'),
  ('hn-ha-dong',       2, 'hn', 'Hà Đông',       'Ha Dong'),
  ('hn-son-tay',       2, 'hn', 'Sơn Tây',       'Son Tay'),
  ('hn-ba-vi',         2, 'hn', 'Ba Vì',         'Ba Vi'),
  ('hn-chuong-my',     2, 'hn', 'Chương Mỹ',     'Chuong My'),
  ('hn-dan-phuong',    2, 'hn', 'Đan Phượng',    'Dan Phuong'),
  ('hn-dong-anh',      2, 'hn', 'Đông Anh',      'Dong Anh'),
  ('hn-gia-lam',       2, 'hn', 'Gia Lâm',       'Gia Lam'),
  ('hn-hoai-duc',      2, 'hn', 'Hoài Đức',      'Hoai Duc'),
  ('hn-me-linh',       2, 'hn', 'Mê Linh',       'Me Linh'),
  ('hn-my-duc',        2, 'hn', 'Mỹ Đức',        'My Duc'),
  ('hn-phu-xuyen',     2, 'hn', 'Phú Xuyên',     'Phu Xuyen'),
  ('hn-phuc-tho',      2, 'hn', 'Phúc Thọ',      'Phuc Tho'),
  ('hn-quoc-oai',      2, 'hn', 'Quốc Oai',      'Quoc Oai'),
  ('hn-soc-son',       2, 'hn', 'Sóc Sơn',       'Soc Son'),
  ('hn-thach-that',    2, 'hn', 'Thạch Thất',    'Thach That'),
  ('hn-thanh-oai',     2, 'hn', 'Thanh Oai',     'Thanh Oai'),
  ('hn-thanh-tri',     2, 'hn', 'Thanh Trì',     'Thanh Tri'),
  ('hn-thuong-tin',    2, 'hn', 'Thường Tín',    'Thuong Tin'),
  ('hn-ung-hoa',       2, 'hn', 'Ứng Hòa',       'Ung Hoa');

-- Categories (weights from the approved spec; trigger enforces SUM = 1.000) ----------
insert into public.question_categories (id, code, name_vi, name_en, description_vi, weight, sort_order) values
  (md5('roomie:category:lifestyle')::uuid,      'lifestyle',      'Thói quen sinh hoạt',            'Lifestyle habits',              'Hai người có cách sinh hoạt hàng ngày tương đồng đến mức nào?', 0.250, 1),
  (md5('roomie:category:cleanliness')::uuid,    'cleanliness',    'Sạch sẽ & ngăn nắp',             'Cleanliness & organization',    'Đây là nhóm rất quan trọng vì khác biệt về tiêu chuẩn sạch sẽ là một nguồn xung đột roommate rất phổ biến.', 0.200, 2),
  (md5('roomie:category:schedule_noise')::uuid, 'schedule_noise', 'Lịch sinh hoạt & tiếng ồn',      'Schedule & noise',              null, 0.150, 3),
  (md5('roomie:category:social_space')::uuid,   'social_space',   'Đời sống xã hội & không gian riêng', 'Social life & personal space', null, 0.150, 4),
  (md5('roomie:category:financial')::uuid,      'financial',      'Tiền bạc & trách nhiệm',         'Money & responsibility',        null, 0.100, 5),
  (md5('roomie:category:communication')::uuid,  'communication',  'Tính cách & giao tiếp',          'Personality & communication',   null, 0.150, 6);

-- Questions (text_vi verbatim from the PDF) -------------------------------------------
insert into public.questions (id, number, category_id, code, type, text_vi, sort_order, is_public)
select md5('roomie:question:' || q.number)::uuid,
       q.number,
       md5('roomie:category:' || q.cat)::uuid,
       q.code,
       q.type::public.question_type_t,
       q.text_vi,
       q.number,
       q.is_public
  from (values
    ( 1, 'lifestyle',      'cooking_frequency',                  'scale_1_5',     'Bạn nấu ăn ở nhà thường xuyên như thế nào?', true),
    ( 2, 'lifestyle',      'eating_at_home',                     'scale_1_5',     'Bạn ăn uống ở nhà thường xuyên như thế nào?', true),
    ( 3, 'lifestyle',      'time_at_home',                       'scale_1_5',     'Bạn thường dành bao nhiêu thời gian ở nhà?', true),
    ( 4, 'lifestyle',      'routine_importance',                 'scale_1_5',     'Việc duy trì một lịch sinh hoạt cố định quan trọng với bạn như thế nào?', true),
    ( 5, 'lifestyle',      'flexibility_with_habits',            'scale_1_5',     'Bạn linh hoạt đến mức nào khi roommate có thói quen khác bạn?', true),
    ( 6, 'cleanliness',    'cleanliness_standard',               'scale_1_5',     'Bạn muốn không gian sống sạch sẽ đến mức nào?', true),
    ( 7, 'cleanliness',    'cleaning_frequency',                 'scale_1_5',     'Bạn dọn phòng thường xuyên như thế nào?', true),
    ( 8, 'cleanliness',    'shared_area_cleaning_pace',          'scale_1_5',     'Theo bạn, khu vực dùng chung nên được dọn sau bao lâu?', true),
    ( 9, 'cleanliness',    'tidiness',                           'scale_1_5',     'Bạn ngăn nắp đến mức nào?', true),
    (10, 'cleanliness',    'mess_annoyance',                     'scale_1_5',     'Bạn cảm thấy khó chịu đến mức nào khi roommate để đồ đạc bừa bộn?', true),
    (11, 'schedule_noise', 'bedtime',                            'scale_1_5',     'Bạn thường đi ngủ lúc mấy giờ?', true),
    (12, 'schedule_noise', 'wake_time',                          'scale_1_5',     'Bạn thường thức dậy lúc mấy giờ?', true),
    (13, 'schedule_noise', 'night_noise_tolerance',              'scale_1_5',     'Bạn chịu được tiếng ồn vào ban đêm đến mức nào?', true),
    (14, 'schedule_noise', 'night_activities',                   'multi_choice',  'Bạn thường làm gì vào ban đêm?', true),
    (15, 'schedule_noise', 'quiet_time_importance',              'scale_1_5',     'Việc có khoảng thời gian yên tĩnh ở nhà quan trọng với bạn như thế nào?', true),
    (16, 'social_space',   'guest_invite_frequency',             'scale_1_5',     'Bạn muốn mời bạn bè/người khác về nhà thường xuyên đến mức nào?', true),
    (17, 'social_space',   'guest_comfort',                      'scale_1_5',     'Bạn cảm thấy thoải mái đến mức nào khi roommate mời bạn bè về nhà?', true),
    (18, 'social_space',   'personal_space_need',                'scale_1_5',     'Bạn cần không gian riêng tư ở mức nào?', true),
    (19, 'social_space',   'interaction_desire',                 'scale_1_5',     'Bạn muốn tương tác/giao lưu với roommate thường xuyên đến mức nào?', true),
    (20, 'social_space',   'privacy_importance',                 'scale_1_5',     'Sự riêng tư quan trọng với bạn đến mức nào?', true),
    (21, 'financial',      'payment_punctuality_importance',     'scale_1_5',     'Việc thanh toán tiền thuê nhà/hóa đơn đúng hạn quan trọng với bạn đến mức nào?', true),
    (22, 'financial',      'cost_split_method',                  'single_choice', 'Bạn muốn chia các khoản chi phí chung như thế nào?', true),
    (23, 'financial',      'reminder_comfort',                   'scale_1_5',     'Bạn cảm thấy thoải mái đến mức nào khi nhắc roommate về khoản tiền chưa thanh toán?', false),
    (24, 'financial',      'cost_sharing_willingness',           'scale_1_5',     'Bạn sẵn sàng chia sẻ các khoản chi phí sinh hoạt chung đến mức nào?', true),
    (25, 'financial',      'expense_tracking_importance',        'scale_1_5',     'Việc ghi chép/theo dõi các khoản chi chung quan trọng với bạn đến mức nào?', false),
    (26, 'communication',  'prefers_direct_talk',                'scale_1_5',     'Khi có vấn đề với roommate, tôi thích nói chuyện trực tiếp để giải quyết.', true),
    (27, 'communication',  'speaks_up_when_bothered',            'scale_1_5',     'Tôi thường nói ra khi có điều gì đó khiến tôi khó chịu.', false),
    (28, 'communication',  'willing_to_compromise',              'scale_1_5',     'Tôi sẵn sàng thỏa hiệp khi sống cùng người khác.', true),
    (29, 'communication',  'stays_calm_in_conflict',             'scale_1_5',     'Tôi có thể giữ bình tĩnh khi xảy ra bất đồng.', false),
    (30, 'communication',  'comfortable_with_different_lifestyle','scale_1_5',    'Tôi cảm thấy thoải mái khi sống cùng người có lối sống khác mình.', true)
  ) as q(number, cat, code, type, text_vi, is_public);

-- Options for 5-point scales. Labels are from the PDF except where is_proposed_label
-- is true (Q21, Q23, Q24, Q25, Q27-Q30: the PDF only says "1–5"; labels approved by the product owner).
insert into public.question_options (id, question_id, value, label_vi, sort_order, is_proposed_label)
select md5('roomie:option:' || s.number || ':' || l.ord)::uuid,
       md5('roomie:question:' || s.number)::uuid,
       l.ord::smallint,
       l.label,
       l.ord::smallint,
       s.proposed
  from (values
    ( 1, 'Không bao giờ|Hiếm khi|Thỉnh thoảng|Thường xuyên|Gần như mỗi ngày', false),
    ( 2, 'Gần như không bao giờ|Hiếm khi|Thỉnh thoảng|Thường xuyên|Gần như luôn luôn', false),
    ( 3, 'Rất ít|Ít|Mức trung bình|Khá nhiều|Gần như cả ngày', false),
    ( 4, 'Hoàn toàn không quan trọng|Hơi quan trọng|Khá quan trọng|Rất quan trọng|Cực kỳ quan trọng', false),
    ( 5, 'Hoàn toàn không linh hoạt|Ít linh hoạt|Khá linh hoạt|Rất linh hoạt|Cực kỳ linh hoạt', false),
    ( 6, 'Không quá quan tâm|Hơi quan tâm|Khá sạch|Rất sạch|Luôn muốn mọi thứ thật sạch', false),
    ( 7, 'Chỉ dọn khi thực sự cần|Thỉnh thoảng|Khoảng 1 lần/tuần|Vài lần/tuần|Gần như mỗi ngày', false),
    ( 8, 'Khi nào có thời gian thì dọn|Trong vài ngày|Trong ngày|Trong ngày và càng sớm càng tốt|Gần như ngay lập tức', false),
    ( 9, 'Rất bừa bộn|Khá bừa bộn|Bình thường|Khá ngăn nắp|Rất ngăn nắp', false),
    (10, 'Không khó chịu|Hơi khó chịu|Khá khó chịu|Rất khó chịu|Cực kỳ khó chịu', false),
    (11, 'Trước 22h|22h–23h|23h–00h|00h–01h|Sau 01h', false),
    (12, 'Trước 6h|6h–7h|7h–8h|8h–9h|Sau 9h', false),
    (13, 'Cần hoàn toàn yên tĩnh|Chỉ chịu được rất ít tiếng ồn|Có thể chịu được mức vừa phải|Khá thoải mái với tiếng ồn|Tiếng ồn gần như không ảnh hưởng', false),
    (15, 'Không quan trọng|Hơi quan trọng|Khá quan trọng|Rất quan trọng|Cực kỳ quan trọng', false),
    (16, 'Không bao giờ|Hiếm khi|Thỉnh thoảng|Thường xuyên|Rất thường xuyên', false),
    (17, 'Hoàn toàn không thoải mái|Không thoải mái lắm|Bình thường|Khá thoải mái|Hoàn toàn thoải mái', false),
    (18, 'Rất ít|Ít|Trung bình|Nhiều|Rất nhiều', false),
    (19, 'Gần như không muốn|Hiếm khi|Thỉnh thoảng|Thường xuyên|Rất thường xuyên', false),
    (20, 'Không quan trọng|Hơi quan trọng|Khá quan trọng|Rất quan trọng|Cực kỳ quan trọng', false),
    (21, 'Không quan trọng|Hơi quan trọng|Khá quan trọng|Rất quan trọng|Cực kỳ quan trọng', true),
    (23, 'Hoàn toàn không thoải mái|Không thoải mái lắm|Bình thường|Khá thoải mái|Hoàn toàn thoải mái', true),
    (24, 'Hoàn toàn không sẵn sàng|Không sẵn sàng lắm|Bình thường|Khá sẵn sàng|Cực kỳ sẵn sàng', true),
    (25, 'Không quan trọng|Hơi quan trọng|Khá quan trọng|Rất quan trọng|Cực kỳ quan trọng', true),
    (26, 'Hoàn toàn không đồng ý|Không đồng ý|Trung lập|Đồng ý|Hoàn toàn đồng ý', false),
    (27, 'Hoàn toàn không đồng ý|Không đồng ý|Trung lập|Đồng ý|Hoàn toàn đồng ý', true),
    (28, 'Hoàn toàn không đồng ý|Không đồng ý|Trung lập|Đồng ý|Hoàn toàn đồng ý', true),
    (29, 'Hoàn toàn không đồng ý|Không đồng ý|Trung lập|Đồng ý|Hoàn toàn đồng ý', true),
    (30, 'Hoàn toàn không đồng ý|Không đồng ý|Trung lập|Đồng ý|Hoàn toàn đồng ý', true)
  ) as s(number, labels, proposed)
  cross join lateral unnest(string_to_array(s.labels, '|')) with ordinality as l(label, ord);

-- Q14 (multi-select) and Q22 (single choice) -----------------------------------------
insert into public.question_options (id, question_id, value, code, label_vi, sort_order, allows_other)
select md5('roomie:option:' || o.number || ':' || o.value)::uuid,
       md5('roomie:question:' || o.number)::uuid,
       o.value, o.code, o.label_vi, o.value, o.allows_other
  from (values
    (14, 1, 'sleep',             'Ngủ',                  false),
    (14, 2, 'study',             'Học',                  false),
    (14, 3, 'work',              'Làm việc',             false),
    (14, 4, 'movies',            'Xem phim',             false),
    (14, 5, 'gaming',            'Chơi game',            false),
    (14, 6, 'chatting_friends',  'Nói chuyện với bạn bè', false),
    (14, 7, 'other',             'Khác',                 true),
    (22, 1, 'split_equal',       'Chia 50/50',           false),
    (22, 2, 'split_usage',       'Chia theo mức sử dụng', false),
    (22, 3, 'split_case_by_case','Tùy từng trường hợp',  false),
    (22, 4, 'split_other',       'Cách khác',            true)
  ) as o(number, value, code, label_vi, allows_other);
