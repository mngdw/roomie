/**
 * ROOMIE · Matching Engine Constants & Dimension Configuration
 */
import type { CategoryKey, DimensionConfig } from "./types";

export const ALGORITHM_VERSION = "1.0.0";

/**
 * Exact category weights as specified:
 * Total = 100% (1.00)
 */
export const CATEGORY_WEIGHTS: Record<CategoryKey, number> = {
  lifestyle: 0.25,
  cleanliness: 0.20,
  schedule_noise: 0.15,
  social_space: 0.15,
  financial: 0.10,
  communication: 0.15,
};

export const CATEGORY_META: Record<
  CategoryKey,
  { name_vi: string; name_en: string; description_vi: string }
> = {
  lifestyle: {
    name_vi: "Thói quen sinh hoạt",
    name_en: "Lifestyle Habits",
    description_vi: "Hai người có cách sinh hoạt hàng ngày tương đồng đến mức nào",
  },
  cleanliness: {
    name_vi: "Sạch sẽ & ngăn nắp",
    name_en: "Cleanliness & Organization",
    description_vi: "Tiêu chuẩn vệ sinh và mức độ gọn gàng trong không gian sống chung",
  },
  schedule_noise: {
    name_vi: "Lịch sinh hoạt & tiếng ồn",
    name_en: "Schedule & Noise",
    description_vi: "Thời gian biểu ngủ nghỉ và mức độ nhạy cảm với tiếng ồn",
  },
  social_space: {
    name_vi: "Đời sống xã hội & không gian riêng",
    name_en: "Social Life & Personal Space",
    description_vi: "Tần suất mời khách về nhà và nhu cầu không gian riêng tư",
  },
  financial: {
    name_vi: "Tiền bạc & trách nhiệm",
    name_en: "Money & Responsibility",
    description_vi: "Quan điểm thanh toán đúng hạn và cách chia sẻ chi phí chung",
  },
  communication: {
    name_vi: "Tính cách & giao tiếp",
    name_en: "Personality & Communication",
    description_vi: "Cách ứng xử khi xảy ra bất đồng và mức độ sẵn sàng thỏa hiệp",
  },
};

/**
 * 22 Dimensions across 6 categories.
 * Dimension weights within each category sum to 1.00.
 */
export const DIMENSIONS: Record<string, DimensionConfig> = {
  // --- Group 1: Lifestyle (25%) ---
  L1_cooking: {
    code: "L1_cooking",
    category: "lifestyle",
    rule: "SYM",
    weight: 0.20,
    name_vi: "Nấu ăn tại nhà",
    name_en: "Cooking Frequency",
    description_vi: "Tần suất nấu nướng trong phòng",
  },
  L2_eating: {
    code: "L2_eating",
    category: "lifestyle",
    rule: "SYM",
    weight: 0.15,
    name_vi: "Ăn uống tại nhà",
    name_en: "Eating at Home",
    description_vi: "Thói quen ăn uống tại phòng",
  },
  L3_time_at_home: {
    code: "L3_time_at_home",
    category: "lifestyle",
    rule: "SYM",
    weight: 0.20,
    name_vi: "Thời gian ở nhà",
    name_en: "Time Spent at Home",
    description_vi: "Thời lượng sinh hoạt tại phòng mỗi ngày",
  },
  L4_routine_flexibility: {
    code: "L4_routine_flexibility",
    category: "lifestyle",
    rule: "DIR",
    weight: 0.45,
    name_vi: "Kỷ luật sinh hoạt ↔ Linh hoạt",
    name_en: "Routine vs Flexibility",
    description_vi: "Độ cố định của lịch sinh hoạt kết hợp với độ linh hoạt của người ở cùng",
  },

  // --- Group 2: Cleanliness & Organization (20%) ---
  C1_cleanliness_standard: {
    code: "C1_cleanliness_standard",
    category: "cleanliness",
    rule: "SYM",
    weight: 0.30,
    name_vi: "Tiêu chuẩn sạch sẽ",
    name_en: "Cleanliness Standard",
    description_vi: "Mức độ kỳ vọng về không gian sống sạch sẽ",
  },
  C2_chore_pace: {
    code: "C2_chore_pace",
    category: "cleanliness",
    rule: "DIR",
    weight: 0.25,
    name_vi: "Tiến độ dọn khu vực chung",
    name_en: "Shared Chore Pace",
    description_vi: "Kỳ vọng dọn dẹp khu vực chung so với tần suất dọn phòng thực tế",
  },
  C3_mess_tolerance: {
    code: "C3_mess_tolerance",
    category: "cleanliness",
    rule: "DIR",
    weight: 0.30,
    name_vi: "Độ bừa bộn ↔ Khả năng chịu đựng",
    name_en: "Mess vs Annoyance",
    description_vi: "Mức độ bừa bộn so với khả năng chịu đựng đồ đạc chưa gọn gàng",
  },
  C4_tidiness: {
    code: "C4_tidiness",
    category: "cleanliness",
    rule: "SYM",
    weight: 0.15,
    name_vi: "Mức độ ngăn nắp",
    name_en: "Tidiness",
    description_vi: "Thói quen xếp đặt đồ đạc gọn gàng",
  },

  // --- Group 3: Schedule & Noise (15%) ---
  S1_bedtime: {
    code: "S1_bedtime",
    category: "schedule_noise",
    rule: "TIME",
    weight: 0.20,
    name_vi: "Giờ đi ngủ",
    name_en: "Bedtime",
    description_vi: "Khung giờ tắt đèn đi ngủ buổi tối",
  },
  S2_wake_time: {
    code: "S2_wake_time",
    category: "schedule_noise",
    rule: "TIME",
    weight: 0.20,
    name_vi: "Giờ thức dậy",
    name_en: "Wake-up Time",
    description_vi: "Khung giờ bắt đầu ngày mới vào buổi sáng",
  },
  S3_night_noise: {
    code: "S3_night_noise",
    category: "schedule_noise",
    rule: "DIR",
    weight: 0.25,
    name_vi: "Tiếng ồn ban đêm ↔ Khả năng chịu ồn",
    name_en: "Night Noise Emission vs Tolerance",
    description_vi: "Mức độ gây ồn từ hoạt động ban đêm so với độ nhạy cảm tiếng ồn",
  },
  S4_night_activities: {
    code: "S4_night_activities",
    category: "schedule_noise",
    rule: "JAC",
    weight: 0.10,
    name_vi: "Hoạt động ban đêm",
    name_en: "Night Activities Overlap",
    description_vi: "Mức độ tương đồng các sở thích/hoạt động vào ban đêm",
  },
  S5_quiet_time: {
    code: "S5_quiet_time",
    category: "schedule_noise",
    rule: "SYM",
    weight: 0.25,
    name_vi: "Nhu cầu không gian yên tĩnh",
    name_en: "Quiet Time Need",
    description_vi: "Mức độ quan trọng của khoảng thời gian yên tĩnh tại phòng",
  },

  // --- Group 4: Social Life & Personal Space (15%) ---
  P1_guests: {
    code: "P1_guests",
    category: "social_space",
    rule: "DIR",
    weight: 0.30,
    name_vi: "Mời bạn về nhà ↔ Thoải mái với khách",
    name_en: "Guest Inviting vs Comfort",
    description_vi: "Nhu cầu mời khách so với mức độ thoải mái khi bạn mời người lạ",
  },
  P2_interaction_vs_space: {
    code: "P2_interaction_vs_space",
    category: "social_space",
    rule: "DIR",
    weight: 0.25,
    name_vi: "Mong muốn giao lưu ↔ Nhu cầu riêng tư",
    name_en: "Interaction vs Personal Space",
    description_vi: "Mức độ muốn trò chuyện kết bạn so với nhu cầu khép kín riêng tư",
  },
  P3_interaction_desire: {
    code: "P3_interaction_desire",
    category: "social_space",
    rule: "SYM",
    weight: 0.15,
    name_vi: "Tần suất tương tác mong muốn",
    name_en: "Interaction Desire",
    description_vi: "Mong muốn gắn kết bạn cùng phòng",
  },
  P4_personal_space_need: {
    code: "P4_personal_space_need",
    category: "social_space",
    rule: "SYM",
    weight: 0.10,
    name_vi: "Nhu cầu không gian riêng",
    name_en: "Personal Space Need",
    description_vi: "Mức độ cần góc riêng tư trong sinh hoạt chung",
  },
  P5_privacy_importance: {
    code: "P5_privacy_importance",
    category: "social_space",
    rule: "SYM",
    weight: 0.20,
    name_vi: "Tầm quan trọng của sự riêng tư",
    name_en: "Privacy Importance",
    description_vi: "Sự bảo mật và ranh giới cá nhân",
  },

  // --- Group 5: Money & Responsibility (10%) ---
  F1_on_time_payment: {
    code: "F1_on_time_payment",
    category: "financial",
    rule: "SYM",
    weight: 0.30,
    name_vi: "Đóng tiền nhà đúng hạn",
    name_en: "On-time Payment",
    description_vi: "Sự nghiêm túc với hạn thanh toán hóa đơn",
  },
  F2_cost_split_method: {
    code: "F2_cost_split_method",
    category: "financial",
    rule: "MATRIX",
    weight: 0.25,
    name_vi: "Phương thức chia chi phí",
    name_en: "Cost Splitting Method",
    description_vi: "Cách phân chia chi phí sinh hoạt chung (50/50, theo mức dùng,...)",
  },
  F3_reminder_comfort: {
    code: "F3_reminder_comfort",
    category: "financial",
    rule: "SYM",
    weight: 0.15,
    name_vi: "Thoải mái khi nhắc nhở tiền bạc",
    name_en: "Reminder Comfort",
    description_vi: "Độ cởi mở khi thảo luận các khoản nợ/tiền chung",
  },
  F4_cost_sharing: {
    code: "F4_cost_sharing",
    category: "financial",
    rule: "SYM",
    weight: 0.20,
    name_vi: "Sẵn sàng chia sẻ chi phí chung",
    name_en: "Willingness to Share",
    description_vi: "Mức độ sẵn sàng đóng góp cho đồ dùng chung",
  },
  F5_expense_tracking: {
    code: "F5_expense_tracking",
    category: "financial",
    rule: "SYM",
    weight: 0.10,
    name_vi: "Ghi chép chi tiêu",
    name_en: "Expense Tracking",
    description_vi: "Thói quen minh bạch hóa các khoản chi qua sổ sách",
  },

  // --- Group 6: Personality & Communication (15%) ---
  M1_prefers_direct_talk: {
    code: "M1_prefers_direct_talk",
    category: "communication",
    rule: "SYM",
    weight: 0.20,
    name_vi: "Thẳng thắn trao đổi",
    name_en: "Direct Communication",
    description_vi: "Ưa thích nói chuyện trực tiếp khi có vấn đề",
  },
  M2_voicing_vs_calm: {
    code: "M2_voicing_vs_calm",
    category: "communication",
    rule: "DIR",
    weight: 0.30,
    name_vi: "Bày tỏ bất bình ↔ Giữ bình tĩnh",
    name_en: "Speaking Up vs Staying Calm",
    description_vi: "Thói quen nói ra điều khó chịu kết hợp với khả năng giữ bình tĩnh",
  },
  M3_willing_to_compromise: {
    code: "M3_willing_to_compromise",
    category: "communication",
    rule: "JOINT",
    weight: 0.25,
    name_vi: "Sẵn sàng thỏa hiệp",
    name_en: "Compromise Willingness",
    description_vi: "Mức độ sẵn lòng nhường nhịn và tìm tiếng nói chung",
  },
  M4_different_lifestyles: {
    code: "M4_different_lifestyles",
    category: "communication",
    rule: "JOINT",
    weight: 0.25,
    name_vi: "Thoải mái với sự khác biệt",
    name_en: "Lifestyle Tolerance",
    description_vi: "Khả năng hòa nhập khi sống cùng người khác biệt lối sống",
  },
};

/**
 * Bedtime options (Q11) converted to continuous hours after 18:00:
 * Option 1: Trước 22h -> 21.0
 * Option 2: 22h–23h -> 22.5
 * Option 3: 23h–00h -> 23.5
 * Option 4: 00h–01h -> 24.5
 * Option 5: Sau 01h  -> 26.0
 */
export const Q11_BEDTIME_HOURS: Record<number, number> = {
  1: 21.0,
  2: 22.5,
  3: 23.5,
  4: 24.5,
  5: 26.0,
};

/**
 * Wake-up options (Q12) converted to morning clock hours:
 * Option 1: Trước 6h -> 5.0
 * Option 2: 6h–7h    -> 6.5
 * Option 3: 7h–8h    -> 7.5
 * Option 4: 8h–9h    -> 8.5
 * Option 5: Sau 9h   -> 10.0
 */
export const Q12_WAKE_HOURS: Record<number, number> = {
  1: 5.0,
  2: 6.5,
  3: 7.5,
  4: 8.5,
  5: 10.0,
};

export const MAX_TIME_GAP_HOURS = 4.0;

/**
 * Q14 night activities noise emission weight table (0.0 to 0.75):
 * Option 1: Ngủ -> 0.00
 * Option 2: Học -> 0.00
 * Option 3: Làm việc -> 0.15
 * Option 4: Xem phim -> 0.50
 * Option 5: Chơi game -> 0.75
 * Option 6: Nói chuyện bạn bè -> 0.75
 * Option 7: Khác -> 0.40
 */
export const Q14_NOISE_EMISSION_WEIGHTS: Record<number, number> = {
  1: 0.0,
  2: 0.0,
  3: 0.15,
  4: 0.5,
  5: 0.75,
  6: 0.75,
  7: 0.4,
};

/**
 * Q22 cost split method compatibility matrix (values 1..4):
 * 1: 50/50
 * 2: Theo mức sử dụng
 * 3: Tùy từng trường hợp
 * 4: Cách khác
 */
export const Q22_COST_SPLIT_MATRIX: Record<number, Record<number, number>> = {
  1: { 1: 1.0, 2: 0.4, 3: 0.7, 4: 0.5 },
  2: { 1: 0.4, 2: 1.0, 3: 0.7, 4: 0.5 },
  3: { 1: 0.7, 2: 0.7, 3: 1.0, 4: 0.6 },
  4: { 1: 0.5, 2: 0.5, 3: 0.6, 4: 0.6 },
};

/** Weakest-link blend factor for directional comparisons: 0.5 mean + 0.5 min */
export const DIRECTIONAL_WEAKEST_LINK_WEIGHT = 0.5;

/** Thresholds for explanations */
export const EXPLANATION_THRESHOLDS = {
  WHY_YOU_MATCH_MIN_SCORE: 85,
  THINGS_TO_DISCUSS_MAX_SCORE: 65,
  DIRECTIONAL_SHORTFALL_THRESHOLD: 1.5,
};
