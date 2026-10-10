/**
 * ROOMIE · Deterministic Explanation Generator (Step 5)
 * Explains compatibility strengths ("Why you match") and potential friction points ("Things to discuss")
 * using actual answer values and transparent rules. No LLM generation.
 */
import type {
  CategoryKey,
  CandidateUser,
  PairScoreResult,
  CompatibilityExplanation,
} from "./types";
import {
  DIMENSIONS,
  CATEGORY_WEIGHTS,
  CATEGORY_META,
  EXPLANATION_THRESHOLDS,
  Q11_BEDTIME_HOURS,
  Q12_WAKE_HOURS,
} from "./constants";
import { getSingleOption, getOptionValues } from "./scoring";

const BEDTIME_LABELS: Record<number, string> = {
  1: "trước 22h",
  2: "khoảng 22h–23h",
  3: "khoảng 23h–00h",
  4: "khoảng 00h–01h",
  5: "sau 01h đêm",
};

const WAKE_LABELS: Record<number, string> = {
  1: "trước 6h sáng",
  2: "khoảng 6h–7h sáng",
  3: "khoảng 7h–8h sáng",
  4: "khoảng 8h–9h sáng",
  5: "sau 9h sáng",
};

const Q14_ACTIVITY_LABELS: Record<number, string> = {
  1: "Ngủ",
  2: "Học tập",
  3: "Làm việc",
  4: "Xem phim",
  5: "Chơi game",
  6: "Nói chuyện bạn bè",
  7: "Hoạt động khác",
};

const Q22_SPLIT_LABELS: Record<number, string> = {
  1: "chia đều 50/50",
  2: "chia theo mức độ sử dụng",
  3: "tùy theo từng trường hợp",
  4: "thỏa thuận cách khác",
};

/**
 * Builds why-match and things-to-discuss explanation texts for a dimension.
 */
function buildDimensionExplanation(
  dimCode: string,
  viewer: CandidateUser,
  candidate: CandidateUser,
  score: number,
  details?: Record<string, unknown>
): { whyTitle: string; whyDetail: string; discussTitle: string; discussDetail: string } {
  const nameA = "Bạn";
  const nameB = candidate.displayName || "Bạn cùng phòng";

  switch (dimCode) {
    case "L1_cooking": {
      const q1A = getSingleOption(viewer.answers, 1) ?? 3;
      const q1B = getSingleOption(candidate.answers, 1) ?? 3;
      return {
        whyTitle: "Thói quen nấu nướng tương đồng",
        whyDetail: `Cả hai đều có mức độ nấu ăn tại nhà tương đương nhau (mức ${q1A}/5 và ${q1B}/5).`,
        discussTitle: "Khác biệt về nấu ăn tại nhà",
        discussDetail: `${nameA} nấu ăn ở mức ${q1A}/5, trong khi ${nameB} ở mức ${q1B}/5. Hãy thống nhất việc sử dụng bếp chung.`,
      };
    }

    case "L2_eating": {
      const q2A = getSingleOption(viewer.answers, 2) ?? 3;
      const q2B = getSingleOption(candidate.answers, 2) ?? 3;
      return {
        whyTitle: "Thói quen ăn uống tại phòng",
        whyDetail: `Cả hai có tần suất dùng bữa tại phòng tương đồng (${q2A}/5 và ${q2B}/5).`,
        discussTitle: "Tần suất ăn uống tại phòng",
        discussDetail: `${nameA} ăn tại phòng ở mức ${q2A}/5, trong khi ${nameB} ở mức ${q2B}/5.`,
      };
    }

    case "L3_time_at_home": {
      const q3A = getSingleOption(viewer.answers, 3) ?? 3;
      const q3B = getSingleOption(candidate.answers, 3) ?? 3;
      return {
        whyTitle: "Thời lượng sinh hoạt tại phòng",
        whyDetail: `Thời gian ở nhà của cả hai khá tương đồng, dễ đồng điệu nhịp sinh hoạt.`,
        discussTitle: "Khác biệt thời gian ở nhà",
        discussDetail: `Một người ở nhà nhiều hơn hẳn người kia, cần lưu ý việc phân chia không gian sinh hoạt.`,
      };
    }

    case "L4_routine_flexibility": {
      const q4A = getSingleOption(viewer.answers, 4) ?? 3;
      const q5B = getSingleOption(candidate.answers, 5) ?? 3;
      const q4B = getSingleOption(candidate.answers, 4) ?? 3;
      const q5A = getSingleOption(viewer.answers, 5) ?? 3;
      return {
        whyTitle: "Hài hòa giữa nề nếp và sự linh hoạt",
        whyDetail: "Độ cố định lịch trình của người này phù hợp với độ linh hoạt và cởi mở của người kia.",
        discussTitle: "Kỳ vọng nề nếp sinh hoạt",
        discussDetail:
          q4A > q5B
            ? `${nameA} coi trọng lịch sinh hoạt cố định (mức ${q4A}), nhưng ${nameB} linh hoạt ở mức ${q5B}.`
            : `${nameB} có lịch sinh hoạt cố định (mức ${q4B}), cần ${nameA} thích nghi linh hoạt (mức ${q5A}).`,
      };
    }

    case "C1_cleanliness_standard": {
      const q6A = getSingleOption(viewer.answers, 6) ?? 3;
      const q6B = getSingleOption(candidate.answers, 6) ?? 3;
      return {
        whyTitle: "Tiêu chuẩn sạch sẽ đồng điệu",
        whyDetail: `Cả hai đều có kỳ vọng sạch sẽ tương đồng (${q6A}/5 và ${q6B}/5).`,
        discussTitle: "Tiêu chuẩn sạch sẽ khác nhau",
        discussDetail: `${nameA} kỳ vọng sạch sẽ mức ${q6A}/5, trong khi ${nameB} ở mức ${q6B}/5. Cần thống nhất quy chuẩn dọn dẹp.`,
      };
    }

    case "C2_chore_pace": {
      return {
        whyTitle: "Tự giác và tiến độ dọn dẹp ăn khớp",
        whyDetail: "Tần suất dọn phòng đáp ứng tốt kỳ vọng về tốc độ dọn khu vực dùng chung.",
        discussTitle: "Tốc độ dọn khu vực chung",
        discussDetail: "Có sự chênh lệch giữa kỳ vọng dọn dẹp ngay và tần suất dọn dẹp thực tế.",
      };
    }

    case "C3_mess_tolerance": {
      return {
        whyTitle: "Thấu hiểu về mức độ bừa bộn",
        whyDetail: "Mức độ sắp xếp đồ đạc của mỗi người nằm trong giới hạn chịu đựng của đối phương.",
        discussTitle: "Độ bừa bộn và giới hạn chịu đựng",
        discussDetail: "Một bên có thể cảm thấy khó chịu khi đồ đạc chưa được cất gọn gàng như mong đợi.",
      };
    }

    case "C4_tidiness": {
      return {
        whyTitle: "Mức độ ngăn nắp tương đương",
        whyDetail: "Cả hai có thói quen sắp đặt đồ đạc gọn gàng khá giống nhau.",
        discussTitle: "Thói quen ngăn nắp",
        discussDetail: "Cần trao đổi về việc quy định chỗ để đồ dùng cá nhân và đồ dùng chung.",
      };
    }

    case "S1_bedtime": {
      const q11A = getSingleOption(viewer.answers, 11) ?? 3;
      const q11B = getSingleOption(candidate.answers, 11) ?? 3;
      const labelA = BEDTIME_LABELS[q11A] || `mức ${q11A}`;
      const labelB = BEDTIME_LABELS[q11B] || `mức ${q11B}`;
      return {
        whyTitle: "Giờ đi ngủ rất khớp nhau",
        whyDetail:
          q11A === q11B
            ? `Cả hai thường đi ngủ cùng thời điểm (${labelA}).`
            : `${nameA} ngủ ${labelA}, ${nameB} ngủ ${labelB}, chênh lệch không đáng kể.`,
        discussTitle: "Lệch khung giờ ngủ",
        discussDetail: `${nameA} đi ngủ ${labelA}, trong khi ${nameB} đi ngủ ${labelB}. Cần thống nhất giờ tắt đèn.`,
      };
    }

    case "S2_wake_time": {
      const q12A = getSingleOption(viewer.answers, 12) ?? 3;
      const q12B = getSingleOption(candidate.answers, 12) ?? 3;
      const labelA = WAKE_LABELS[q12A] || `mức ${q12A}`;
      const labelB = WAKE_LABELS[q12B] || `mức ${q12B}`;
      return {
        whyTitle: "Khung giờ thức dậy tương đồng",
        whyDetail:
          q12A === q12B
            ? `Cả hai đều bắt đầu ngày mới ${labelA}.`
            : `${nameA} thức dậy ${labelA}, ${nameB} ${labelB}.`,
        discussTitle: "Chênh lệch giờ thức dậy buổi sáng",
        discussDetail: `${nameA} dậy ${labelA}, trong khi ${nameB} dậy ${labelB}. Chú ý tiếng chuông báo thức và tiếng động buổi sáng.`,
      };
    }

    case "S3_night_noise": {
      return {
        whyTitle: "Tương thích về tiếng ồn ban đêm",
        whyDetail: "Hoạt động ban đêm của mỗi người không gây ảnh hưởng đến giấc ngủ của người kia.",
        discussTitle: "Độ nhạy cảm tiếng ồn đêm",
        discussDetail: "Một bên có hoạt động đêm có thể phát ra âm thanh mà bên kia cần không gian yên tĩnh hơn.",
      };
    }

    case "S4_night_activities": {
      const actA = getOptionValues(viewer.answers, 14) ?? [];
      const actB = getOptionValues(candidate.answers, 14) ?? [];
      const common = actA
        .filter((a) => actB.includes(a))
        .map((a) => Q14_ACTIVITY_LABELS[a])
        .filter(Boolean);
      return {
        whyTitle: "Sở thích hoạt động ban đêm tương đồng",
        whyDetail:
          common.length > 0
            ? `Cả hai cùng có thói quen: ${common.join(", ")} vào ban đêm.`
            : "Hoạt động buổi tối của hai bạn khá tương đồng.",
        discussTitle: "Khác biệt hoạt động buổi tối",
        discussDetail: "Cần trao đổi cách dùng tai nghe hoặc phân chia không gian học tập/giải trí ban đêm.",
      };
    }

    case "S5_quiet_time": {
      return {
        whyTitle: "Đồng quan điểm về không gian yên tĩnh",
        whyDetail: "Cả hai đều có cùng mức độ coi trọng sự yên tĩnh tại phòng.",
        discussTitle: "Nhu cầu không gian yên tĩnh",
        discussDetail: "Mức độ cần thời gian yên tĩnh của hai bạn có sự chênh lệch.",
      };
    }

    case "P1_guests": {
      const q16A = getSingleOption(viewer.answers, 16) ?? 3;
      const q17B = getSingleOption(candidate.answers, 17) ?? 3;
      return {
        whyTitle: "Hài hòa về việc mời bạn bè đến phòng",
        whyDetail: "Tần suất mời khách và mức độ chào đón khách của hai bạn rất hòa hợp.",
        discussTitle: "Quy định mời khách về phòng",
        discussDetail:
          q16A > q17B
            ? `${nameA} muốn mời bạn đến chơi thường xuyên hơn mức ${nameB} cảm thấy thực sự thoải mái.`
            : `${nameB} có nhu cầu đón khách về phòng, cần thỏa thuận báo trước.`,
      };
    }

    case "P2_interaction_vs_space": {
      return {
        whyTitle: "Cân bằng giữa giao lưu và riêng tư",
        whyDetail: "Nhu cầu tương tác của người này vừa vặn với mong muốn không gian riêng của người kia.",
        discussTitle: "Mức độ giao lưu và không gian riêng",
        discussDetail: "Một người thích trò chuyện gắn kết nhiều hơn, trong khi người kia cần nhiều không gian cá nhân hơn.",
      };
    }

    case "P3_interaction_desire": {
      return {
        whyTitle: "Mong muốn gắn kết tương đồng",
        whyDetail: "Cả hai đều có mong muốn mức độ tương tác, trò chuyện tương đương nhau.",
        discussTitle: "Kỳ vọng về sự gắn kết",
        discussDetail: "Hãy tôn trọng nhịp sống riêng và cởi mở chia sẻ khi cần.",
      };
    }

    case "P4_personal_space_need": {
      return {
        whyTitle: "Thấu hiểu nhu cầu không gian riêng",
        whyDetail: "Cả hai đều tôn trọng góc riêng tư của nhau trong phòng.",
        discussTitle: "Không gian cá nhân",
        discussDetail: "Cần phân định rõ ranh giới đồ dùng và góc sinh hoạt riêng.",
      };
    }

    case "P5_privacy_importance": {
      return {
        whyTitle: "Rất coi trọng quyền riêng tư cá nhân",
        whyDetail: "Cả hai đều đề cao ranh giới cá nhân và tính bảo mật thông tin riêng.",
        discussTitle: "Ranh giới riêng tư",
        discussDetail: "Hãy thảo luận sớm về việc mượn đồ dùng hoặc tôn trọng cuộc gọi riêng.",
      };
    }

    case "F1_on_time_payment": {
      return {
        whyTitle: "Trách nhiệm tài chính nghiêm túc",
        whyDetail: "Cả hai đều đặt ưu tiên cao cho việc thanh toán tiền phòng và hóa đơn đúng hạn.",
        discussTitle: "Hạn thanh toán chi phí",
        discussDetail: "Cần chọn ngày cố định trong tháng để cùng chuyển khoản tiền nhà đúng hẹn.",
      };
    }

    case "F2_cost_split_method": {
      const q22A = getSingleOption(viewer.answers, 22) ?? 1;
      const q22B = getSingleOption(candidate.answers, 22) ?? 1;
      const lblA = Q22_SPLIT_LABELS[q22A] || `cách ${q22A}`;
      const lblB = Q22_SPLIT_LABELS[q22B] || `cách ${q22B}`;
      return {
        whyTitle: "Đồng thuận về phương thức chia chi phí",
        whyDetail: `Cả hai cùng ưu tiên phương án ${lblA}.`,
        discussTitle: "Phương thức chia hóa đơn chung",
        discussDetail: `${nameA} muốn ${lblA}, còn ${nameB} muốn ${lblB}. Cần thống nhất trước khi ký hợp đồng.`,
      };
    }

    case "F3_reminder_comfort": {
      return {
        whyTitle: "Cởi mở khi trao đổi về tiền bạc",
        whyDetail: "Cả hai đều cảm thấy thoải mái khi nhắc nhở hoặc trao đổi về các khoản chi.",
        discussTitle: "Sự ngại ngùng khi nhắc tiền",
        discussDetail: "Nên sử dụng ứng dụng ghi nợ chung để tránh ngại ngùng khi nhắc tiền trực tiếp.",
      };
    }

    case "F4_cost_sharing": {
      return {
        whyTitle: "Sẵn lòng chia sẻ chi phí đồ dùng chung",
        whyDetail: "Hai bên đều cởi mở trong việc cùng góp tiền mua sắm vật dụng phòng ở.",
        discussTitle: "Mua sắm đồ dùng chung",
        discussDetail: "Cần lập danh sách rõ ràng những đồ dùng chung và đồ dùng cá nhân tự mua.",
      };
    }

    case "F5_expense_tracking": {
      return {
        whyTitle: "Minh bạch hóa sổ sách chi tiêu",
        whyDetail: "Cả hai đều đánh giá cao việc ghi chép các khoản chi tiêu phòng.",
        discussTitle: "Ghi chép chi tiêu chung",
        discussDetail: "Nên lập nhóm chat hoặc bảng tính chung để ghi nhận các khoản điện nước hàng tháng.",
      };
    }

    case "M1_prefers_direct_talk": {
      return {
        whyTitle: "Thẳng thắn trao đổi khi có vấn đề",
        whyDetail: "Cả hai đều thích đối thoại trực tiếp để giải quyết khúc mắc một cách xây dựng.",
        discussTitle: "Phong cách giao tiếp khi có bất đồng",
        discussDetail: "Một bên thích trao đổi trực tiếp ngay, bên kia có thể cần thời gian suy nghĩ.",
      };
    }

    case "M2_voicing_vs_calm": {
      return {
        whyTitle: "Bình tĩnh lắng nghe và góp ý chân thành",
        whyDetail: "Khi có điều khó chịu, một bên biết nói ra và bên kia biết giữ bình tĩnh lắng nghe.",
        discussTitle: "Cách xử lý cảm xúc khi mâu thuẫn",
        discussDetail: "Cần chú ý giữ bình tĩnh và chọn thời điểm thích hợp để chia sẻ cảm xúc.",
      };
    }

    case "M3_willing_to_compromise": {
      return {
        whyTitle: "Tinh thần sẵn sàng thỏa hiệp cao",
        whyDetail: "Cả hai đều sẵn lòng nhường nhịn và tìm tiếng nói chung vì lợi ích tập thể.",
        discussTitle: "Khả năng nhượng bộ khi bất đồng",
        discussDetail: "Cần lắng nghe đối phương nhiều hơn để tìm điểm cân bằng thỏa đáng.",
      };
    }

    case "M4_different_lifestyles": {
      return {
        whyTitle: "Bao dung và cởi mở với sự khác biệt",
        whyDetail: "Cả hai đều thoải mái khi sống chung với người có nét văn hóa hay thói quen khác biệt.",
        discussTitle: "Thích nghi với sự khác biệt",
        discussDetail: "Cần thêm thời gian làm quen và tôn trọng lối sống độc lập của nhau.",
      };
    }

    default:
      return {
        whyTitle: DIMENSIONS[dimCode]?.name_vi || dimCode,
        whyDetail: `Điểm tương thích cao ở tiêu chí này (${Math.round(score)}%).`,
        discussTitle: DIMENSIONS[dimCode]?.name_vi || dimCode,
        discussDetail: `Cần trao đổi thêm về tiêu chí này (${Math.round(score)}%).`,
      };
  }
}

/**
 * Generates structured explanation for a pair of users.
 */
export function generateCompatibilityExplanation(
  viewer: CandidateUser,
  candidate: CandidateUser,
  pairScore: PairScoreResult
): CompatibilityExplanation {
  const categoryScores: Record<
    CategoryKey,
    { score: number; displayScore: number; name_vi: string }
  > = {} as Record<CategoryKey, { score: number; displayScore: number; name_vi: string }>;

  for (const [catKey, catRes] of Object.entries(pairScore.categoryScores) as [
    CategoryKey,
    PairScoreResult["categoryScores"][CategoryKey],
  ][]) {
    categoryScores[catKey] = {
      score: catRes.score,
      displayScore: Math.round(catRes.score),
      name_vi: catRes.name_vi,
    };
  }

  interface CandidateItem {
    dimensionCode: string;
    category: CategoryKey;
    title: string;
    detail: string;
    score: number;
    sortWeight: number;
    shortfall?: number;
  }

  const whyMatchCandidates: CandidateItem[] = [];
  const discussCandidates: CandidateItem[] = [];

  for (const [dimCode, dimRes] of Object.entries(pairScore.dimensionScores)) {
    if (!dimRes.answered) continue;
    const config = DIMENSIONS[dimCode];
    if (!config) continue;

    const catWeight = CATEGORY_WEIGHTS[config.category];
    const dimWeight = config.weight;
    const score = dimRes.score;

    const explanation = buildDimensionExplanation(
      dimCode,
      viewer,
      candidate,
      score,
      dimRes.details
    );

    // Directional shortfall check
    let shortfall = 0;
    if (dimRes.details && typeof dimRes.details === "object") {
      const sfAB = (dimRes.details as { shortfallAB?: number }).shortfallAB ?? 0;
      const sfBA = (dimRes.details as { shortfallBA?: number }).shortfallBA ?? 0;
      shortfall = Math.max(sfAB, sfBA);
    }

    // Why you match
    if (score >= EXPLANATION_THRESHOLDS.WHY_YOU_MATCH_MIN_SCORE) {
      whyMatchCandidates.push({
        dimensionCode: dimCode,
        category: config.category,
        title: explanation.whyTitle,
        detail: explanation.whyDetail,
        score,
        sortWeight: catWeight * dimWeight * score,
      });
    }

    // Things to discuss
    if (
      score <= EXPLANATION_THRESHOLDS.THINGS_TO_DISCUSS_MAX_SCORE ||
      shortfall >= EXPLANATION_THRESHOLDS.DIRECTIONAL_SHORTFALL_THRESHOLD
    ) {
      discussCandidates.push({
        dimensionCode: dimCode,
        category: config.category,
        title: explanation.discussTitle,
        detail: explanation.discussDetail,
        score,
        sortWeight: catWeight * dimWeight * (100 - score),
        shortfall: shortfall > 0 ? shortfall : undefined,
      });
    }
  }

  // Sort by impact
  whyMatchCandidates.sort((a, b) => b.sortWeight - a.sortWeight);
  discussCandidates.sort((a, b) => b.sortWeight - a.sortWeight);

  // Take top 3–4
  const whyYouMatch = whyMatchCandidates.slice(0, 4).map(({ sortWeight, ...rest }) => rest);
  const thingsToDiscuss = discussCandidates.slice(0, 4).map(({ sortWeight, ...rest }) => rest);

  // If whyYouMatch is empty, provide a reassuring summary
  if (whyYouMatch.length === 0) {
    whyYouMatch.push({
      dimensionCode: "overall",
      category: "lifestyle",
      title: "Mức độ phù hợp tổng thể",
      detail: "Hai bạn có mức độ tương thích cơ bản trên nhiều phương diện trong sinh hoạt.",
      score: pairScore.displayScore,
    });
  }

  // Check extra discuss criteria if list is small
  if (thingsToDiscuss.length < 4) {
    // Check soft age preference missed
    const agePref = viewer.roommatePreferences;
    if (agePref && !agePref.ageIsDealbreaker) {
      const { ageMin, ageMax } = agePref;
      if (
        (ageMin != null && candidate.age < ageMin) ||
        (ageMax != null && candidate.age > ageMax)
      ) {
        thingsToDiscuss.push({
          dimensionCode: "soft_age",
          category: "social_space",
          title: "Độ tuổi mong muốn",
          detail: `Độ tuổi của ${candidate.displayName} (${candidate.age} tuổi) nằm ngoài khoảng mong muốn ban đầu của bạn (${ageMin ?? "..."}–${ageMax ?? "..."} tuổi).`,
          score: 60,
        });
      }
    }

    // Check if both users rarely voice displeasure (Q27 <= 2)
    const q27A = getSingleOption(viewer.answers, 27);
    const q27B = getSingleOption(candidate.answers, 27);
    if (q27A !== undefined && q27B !== undefined && q27A <= 2 && q27B <= 2) {
      thingsToDiscuss.push({
        dimensionCode: "voicing_displeasure",
        category: "communication",
        title: "Chủ động nói ra khi có khúc mắc",
        detail: "Cả hai bạn đều có xu hướng ít nói ra khi cảm thấy khó chịu. Cần thống nhất thói quen chủ động góp ý chân thành.",
        score: 50,
      });
    }
  }

  if (thingsToDiscuss.length === 0) {
    thingsToDiscuss.push({
      dimensionCode: "none",
      category: "communication",
      title: "Không có xung đột lớn",
      detail: "Không phát hiện điểm khác biệt đáng kể trong các thói quen sinh hoạt cốt lõi.",
      score: pairScore.displayScore,
    });
  }

  return {
    overallPercentage: pairScore.displayScore,
    categoryScores,
    whyYouMatch,
    thingsToDiscuss,
  };
}
