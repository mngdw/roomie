/**
 * ROOMIE · Built-in Offline / Paused-DB Fallback Candidate Pool & In-Memory Store
 *
 * Ensures ROOMIE works 100% seamlessly 24/7 even if the cloud PostgreSQL/Supabase
 * Free Tier database is temporarily paused or waking up.
 */
import type { CandidateUser, RecommendationResult } from "../matching/types";
import type { UserSummary } from "../server/session";
import { scorePair } from "../matching/scoring";
import { generateCompatibilityExplanation } from "../matching/explanation";
import { evaluateHousingFit } from "../matching/hard-filters";
import { rankCandidates, type DiscoveryFeedData } from "../matching/recommendations";
import { DEFAULT_USER_ID } from "../constants/demo-users";

function buildAnswersMap(
  raw: string[],
  custom?: Record<number, { optionValues: number[]; otherText?: string | null }>
): Map<number, { optionValues: number[]; otherText?: string | null }> {
  const map = new Map<number, { optionValues: number[]; otherText?: string | null }>();
  raw.forEach((str, idx) => {
    const qNum = idx + 1;
    if (custom && custom[qNum]) {
      map.set(qNum, custom[qNum]);
    } else {
      const vals = str
        .split(",")
        .map((x) => Number(x.trim()))
        .filter((n) => !Number.isNaN(n));
      map.set(qNum, { optionValues: vals, otherText: null });
    }
  });
  return map;
}

const SEED_CANDIDATES: CandidateUser[] = [
  {
    userId: "a0000000-0000-4000-8000-000000000001",
    displayName: "Ngọc",
    age: 22,
    gender: "female",
    housingStatus: "looking_for_room",
    isVerified: true,
    avatarPath: null,
    bio: "Sinh viên năm 3, thích nấu ăn đơn giản và giữ phòng gọn gàng.",
    occupation: "Sinh viên",
    schoolOrWorkplace: "Đại học Hà Nội (HANU)",
    cityCode: "hn",
    districtCode: "hn-thanh-xuan",
    email: "ngoc@roomie.test",
    phone: "0912345001",
    zalo: "0912345001",
    facebook: "fb.com/ngoc.roomie",
    isSmoker: false,
    createdAt: "2026-10-01T08:00:00.000Z",
    room: null,
    roommatePreferences: {
      acceptedGenders: ["female"],
      ageMin: 18,
      ageMax: 28,
      ageIsDealbreaker: false,
      smokingPolicy: "non_smoker_only",
      requirementTags: ["clean_tidy", "pays_on_time", "respects_privacy"],
    },
    roomPreferences: {
      preferredDistrictCodes: [
        "hn-thanh-xuan",
        "hn-cau-giay",
        "hn-dong-da",
        "hn-hai-ba-trung",
      ],
      budgetMin: 1500000,
      budgetMax: 2400000,
      roomTypes: [],
      moveInDate: "2026-11-01",
      moveInFlexDays: 30,
      mustHaveFacilities: ["wifi"],
      requireMedia: false,
    },
    answers: buildAnswersMap([
      "3", "3", "4", "4", "3",
      "4", "4", "3", "4", "4",
      "2", "3", "2", "1,2", "4",
      "2", "3", "4", "3", "4",
      "5", "1", "3", "4", "3",
      "4", "4", "4", "4", "4",
    ]),
  },
  {
    userId: "a0000000-0000-4000-8000-000000000002",
    displayName: "Linh",
    age: 23,
    gender: "female",
    housingStatus: "has_room",
    isVerified: true,
    avatarPath: null,
    bio: "Mình có phòng ở Thanh Xuân, tìm bạn nữ ở ghép sạch sẽ.",
    occupation: "Sinh viên",
    schoolOrWorkplace: "Đại học Kinh tế Quốc dân",
    cityCode: "hn",
    districtCode: "hn-thanh-xuan",
    email: "linh@roomie.test",
    phone: "0912345002",
    zalo: "0912345002",
    facebook: "fb.com/linh.roomie",
    isSmoker: false,
    createdAt: "2026-10-01T08:05:00.000Z",
    room: {
      id: "b0000000-0000-4000-8000-000000000002",
      monthlyRent: 4800000,
      perPersonRent: 2400000,
      roomType: "shared",
      districtCode: "hn-thanh-xuan",
      cityCode: "hn",
      availableFrom: "2026-11-01",
      facilities: ["wifi", "air_conditioner", "washing_machine", "fridge"],
      currentOccupants: 1,
      capacityTotal: 2,
      imagesCount: 3,
    },
    roommatePreferences: {
      acceptedGenders: ["female"],
      ageMin: 18,
      ageMax: 30,
      ageIsDealbreaker: false,
      smokingPolicy: "non_smoker_only",
      requirementTags: ["clean_tidy", "pays_on_time"],
    },
    roomPreferences: null,
    answers: buildAnswersMap([
      "4", "3", "4", "4", "3",
      "4", "4", "3", "4", "4",
      "2", "3", "2", "1,2", "4",
      "2", "4", "4", "3", "4",
      "5", "1", "3", "4", "3",
      "4", "4", "4", "4", "4",
    ]),
  },
  {
    userId: "a0000000-0000-4000-8000-000000000003",
    displayName: "Minh",
    age: 24,
    gender: "female",
    housingStatus: "has_room",
    isVerified: false,
    avatarPath: null,
    bio: "Đi làm giờ hành chính, cuối tuần hay đi cà phê.",
    occupation: "Nhân viên văn phòng",
    schoolOrWorkplace: "Công ty phần mềm ABC",
    cityCode: "hn",
    districtCode: "hn-cau-giay",
    email: "minh@roomie.test",
    phone: "0912345003",
    zalo: "0912345003",
    facebook: "fb.com/minh.roomie",
    isSmoker: false,
    createdAt: "2026-10-01T08:10:00.000Z",
    room: {
      id: "b0000000-0000-4000-8000-000000000003",
      monthlyRent: 4600000,
      perPersonRent: 2300000,
      roomType: "shared",
      districtCode: "hn-cau-giay",
      cityCode: "hn",
      availableFrom: "2026-11-05",
      facilities: ["wifi", "air_conditioner", "water_heater"],
      currentOccupants: 1,
      capacityTotal: 2,
      imagesCount: 1,
    },
    roommatePreferences: {
      acceptedGenders: ["female"],
      ageMin: null,
      ageMax: null,
      ageIsDealbreaker: false,
      smokingPolicy: "non_smoker_only",
      requirementTags: ["share_costs"],
    },
    roomPreferences: null,
    answers: buildAnswersMap([
      "3", "4", "4", "3", "3",
      "4", "3", "3", "4", "5",
      "2", "2", "2", "1,2", "4",
      "3", "3", "4", "3", "3",
      "5", "1", "3", "4", "3",
      "4", "3", "4", "4", "4",
    ]),
  },
  {
    userId: "a0000000-0000-4000-8000-000000000004",
    displayName: "Trang",
    age: 22,
    gender: "female",
    housingStatus: "has_room",
    isVerified: false,
    avatarPath: null,
    bio: "Cú đêm chính hiệu, hay rủ bạn bè về nhà chơi.",
    occupation: "Sinh viên",
    schoolOrWorkplace: "Học viện Báo chí và Tuyên truyền",
    cityCode: "hn",
    districtCode: "hn-hai-ba-trung",
    email: "trang@roomie.test",
    phone: "0912345004",
    zalo: "0912345004",
    facebook: "fb.com/trang.roomie",
    isSmoker: false,
    createdAt: "2026-10-01T08:15:00.000Z",
    room: {
      id: "b0000000-0000-4000-8000-000000000004",
      monthlyRent: 4400000,
      perPersonRent: 2200000,
      roomType: "shared",
      districtCode: "hn-hai-ba-trung",
      cityCode: "hn",
      availableFrom: "2026-11-15",
      facilities: ["wifi", "fridge"],
      currentOccupants: 1,
      capacityTotal: 2,
      imagesCount: 0,
    },
    roommatePreferences: {
      acceptedGenders: ["female"],
      ageMin: null,
      ageMax: null,
      ageIsDealbreaker: false,
      smokingPolicy: "any",
      requirementTags: ["share_costs"],
    },
    roomPreferences: null,
    answers: buildAnswersMap([
      "3", "3", "4", "4", "3",
      "4", "4", "3", "4", "4",
      "5", "5", "5", "3,4,5,6", "2",
      "5", "5", "2", "5", "2",
      "4", "3", "3", "4", "3",
      "4", "4", "4", "3", "4",
    ]),
  },
  {
    userId: "a0000000-0000-4000-8000-000000000005",
    displayName: "Mai",
    age: 21,
    gender: "female",
    housingStatus: "has_room",
    isVerified: false,
    avatarPath: null,
    bio: "Sống thoải mái, không quá câu nệ chuyện dọn dẹp.",
    occupation: "Sinh viên",
    schoolOrWorkplace: "Đại học Thương mại",
    cityCode: "hn",
    districtCode: "hn-dong-da",
    email: "mai@roomie.test",
    phone: "0912345005",
    zalo: "0912345005",
    facebook: "fb.com/mai.roomie",
    isSmoker: false,
    createdAt: "2026-10-01T08:20:00.000Z",
    room: {
      id: "b0000000-0000-4000-8000-000000000005",
      monthlyRent: 4000000,
      perPersonRent: 2000000,
      roomType: "shared",
      districtCode: "hn-dong-da",
      cityCode: "hn",
      availableFrom: "2026-11-01",
      facilities: ["wifi"],
      currentOccupants: 1,
      capacityTotal: 2,
      imagesCount: 0,
    },
    roommatePreferences: {
      acceptedGenders: ["female", "other"],
      ageMin: null,
      ageMax: null,
      ageIsDealbreaker: false,
      smokingPolicy: "any",
      requirementTags: [],
    },
    roomPreferences: null,
    answers: buildAnswersMap([
      "1", "1", "2", "1", "1",
      "1", "1", "1", "2", "1",
      "5", "5", "5", "4,5", "1",
      "5", "5", "2", "5", "1",
      "2", "4", "1", "2", "1",
      "1", "2", "2", "2", "1",
    ]),
  },
  {
    userId: "a0000000-0000-4000-8000-000000000006",
    displayName: "Hà",
    age: 23,
    gender: "male",
    housingStatus: "has_room",
    isVerified: false,
    avatarPath: null,
    bio: "Có phòng ở Thanh Xuân, ai cũng được miễn hợp tính.",
    occupation: "Sinh viên",
    schoolOrWorkplace: "Đại học Bách khoa Hà Nội",
    cityCode: "hn",
    districtCode: "hn-thanh-xuan",
    email: "ha@roomie.test",
    phone: "0912345006",
    zalo: "0912345006",
    facebook: "fb.com/ha.roomie",
    isSmoker: false,
    createdAt: "2026-10-01T08:25:00.000Z",
    room: {
      id: "b0000000-0000-4000-8000-000000000006",
      monthlyRent: 4600000,
      perPersonRent: 2300000,
      roomType: "shared",
      districtCode: "hn-thanh-xuan",
      cityCode: "hn",
      availableFrom: "2026-11-01",
      facilities: ["wifi", "air_conditioner"],
      currentOccupants: 1,
      capacityTotal: 2,
      imagesCount: 0,
    },
    roommatePreferences: {
      acceptedGenders: ["male", "female", "other"],
      ageMin: null,
      ageMax: null,
      ageIsDealbreaker: false,
      smokingPolicy: "any",
      requirementTags: ["pays_on_time"],
    },
    roomPreferences: null,
    answers: buildAnswersMap([
      "3", "3", "4", "4", "3",
      "4", "4", "3", "4", "4",
      "2", "3", "2", "1,2", "4",
      "2", "3", "4", "3", "4",
      "5", "1", "3", "4", "3",
      "4", "4", "4", "4", "4",
    ]),
  },
  {
    userId: "a0000000-0000-4000-8000-000000000007",
    displayName: "An",
    age: 24,
    gender: "female",
    housingStatus: "has_room",
    isVerified: true,
    avatarPath: null,
    bio: "Căn hộ rộng, đầy đủ tiện nghi.",
    occupation: "Chuyên viên",
    schoolOrWorkplace: "Ngân hàng XYZ",
    cityCode: "hn",
    districtCode: "hn-thanh-xuan",
    email: "an@roomie.test",
    phone: "0912345007",
    zalo: "0912345007",
    facebook: "fb.com/an.roomie",
    isSmoker: false,
    createdAt: "2026-10-01T08:30:00.000Z",
    room: {
      id: "b0000000-0000-4000-8000-000000000007",
      monthlyRent: 6200000,
      perPersonRent: 3100000,
      roomType: "private",
      districtCode: "hn-thanh-xuan",
      cityCode: "hn",
      availableFrom: "2026-11-01",
      facilities: [
        "wifi",
        "air_conditioner",
        "washing_machine",
        "fridge",
        "elevator",
        "security",
      ],
      currentOccupants: 1,
      capacityTotal: 2,
      imagesCount: 1,
    },
    roommatePreferences: {
      acceptedGenders: ["female"],
      ageMin: 22,
      ageMax: 35,
      ageIsDealbreaker: false,
      smokingPolicy: "non_smoker_only",
      requirementTags: ["clean_tidy", "pays_on_time"],
    },
    roomPreferences: null,
    answers: buildAnswersMap([
      "3", "3", "4", "4", "3",
      "4", "4", "3", "4", "4",
      "2", "3", "2", "1,2", "4",
      "2", "3", "4", "3", "4",
      "5", "1", "3", "4", "3",
      "4", "4", "4", "4", "4",
    ]),
  },
  {
    userId: "a0000000-0000-4000-8000-000000000008",
    displayName: "Hùng",
    age: 25,
    gender: "male",
    housingStatus: "has_room",
    isVerified: false,
    avatarPath: null,
    bio: "Ít nói, thích yên tĩnh, ngủ sớm dậy sớm.",
    occupation: "Kỹ sư",
    schoolOrWorkplace: "Công ty xây dựng DEF",
    cityCode: "hn",
    districtCode: "hn-ha-dong",
    email: "hung@roomie.test",
    phone: "0912345008",
    zalo: "0912345008",
    facebook: "fb.com/hung.roomie",
    isSmoker: false,
    createdAt: "2026-10-01T08:35:00.000Z",
    room: {
      id: "b0000000-0000-4000-8000-000000000008",
      monthlyRent: 5000000,
      perPersonRent: 2500000,
      roomType: "shared",
      districtCode: "hn-ha-dong",
      cityCode: "hn",
      availableFrom: "2026-11-01",
      facilities: ["wifi", "parking"],
      currentOccupants: 1,
      capacityTotal: 2,
      imagesCount: 0,
    },
    roommatePreferences: {
      acceptedGenders: ["male"],
      ageMin: 22,
      ageMax: 35,
      ageIsDealbreaker: true,
      smokingPolicy: "non_smoker_only",
      requirementTags: ["respects_privacy", "no_smoking"],
    },
    roomPreferences: null,
    answers: buildAnswersMap([
      "4", "4", "5", "5", "2",
      "5", "4", "4", "5", "5",
      "1", "1", "1", "1", "5",
      "1", "2", "5", "1", "5",
      "5", "3", "4", "3", "5",
      "3", "4", "2", "4", "2",
    ]),
  },
  {
    userId: "a0000000-0000-4000-8000-000000000009",
    displayName: "Lan",
    age: 20,
    gender: "female",
    housingStatus: "looking_for_room",
    isVerified: false,
    avatarPath: null,
    bio: "Thích nấu ăn cùng mọi người và trò chuyện.",
    occupation: "Sinh viên",
    schoolOrWorkplace: "Đại học Sư phạm Hà Nội",
    cityCode: "hn",
    districtCode: "hn-cau-giay",
    email: "lan@roomie.test",
    phone: "0912345009",
    zalo: "0912345009",
    facebook: "fb.com/lan.roomie",
    isSmoker: false,
    createdAt: "2026-10-01T08:40:00.000Z",
    room: null,
    roommatePreferences: {
      acceptedGenders: ["female"],
      ageMin: 18,
      ageMax: 25,
      ageIsDealbreaker: false,
      smokingPolicy: "non_smoker_only",
      requirementTags: ["share_costs"],
    },
    roomPreferences: {
      preferredDistrictCodes: ["hn-cau-giay", "hn-dong-da"],
      budgetMin: null,
      budgetMax: 3000000,
      roomTypes: [],
      moveInDate: "2026-11-10",
      moveInFlexDays: 30,
      mustHaveFacilities: [],
      requireMedia: false,
    },
    answers: buildAnswersMap([
      "5", "5", "3", "3", "4",
      "3", "3", "3", "3", "3",
      "3", "3", "3", "1,2,6", "3",
      "4", "5", "2", "5", "2",
      "4", "1", "4", "5", "3",
      "5", "4", "5", "5", "5",
    ]),
  },
  {
    userId: "a0000000-0000-4000-8000-00000000000a",
    displayName: "Khoa",
    age: 26,
    gender: "male",
    housingStatus: "looking_for_room",
    isVerified: false,
    avatarPath: null,
    bio: "Làm việc đêm, chơi game, có hút thuốc.",
    occupation: "Lập trình viên",
    schoolOrWorkplace: "Freelancer",
    cityCode: "hn",
    districtCode: "hn-long-bien",
    email: "khoa@roomie.test",
    phone: "0912345010",
    zalo: "0912345010",
    facebook: "fb.com/khoa.roomie",
    isSmoker: true,
    createdAt: "2026-10-01T08:45:00.000Z",
    room: null,
    roommatePreferences: {
      acceptedGenders: ["male", "female", "other"],
      ageMin: null,
      ageMax: null,
      ageIsDealbreaker: false,
      smokingPolicy: "any",
      requirementTags: [],
    },
    roomPreferences: {
      preferredDistrictCodes: ["hn-long-bien", "hn-hoang-mai"],
      budgetMin: 2000000,
      budgetMax: 3500000,
      roomTypes: ["private"],
      moveInDate: "2026-12-01",
      moveInFlexDays: 30,
      mustHaveFacilities: ["wifi", "air_conditioner"],
      requireMedia: false,
    },
    answers: buildAnswersMap(
      [
        "1", "2", "4", "1", "4",
        "2", "1", "1", "2", "1",
        "5", "5", "5", "3,5", "1",
        "3", "4", "2", "2", "3",
        "3", "2", "3", "3", "1",
        "3", "3", "4", "3", "4",
      ],
      {
        14: { optionValues: [3, 5, 7], otherText: "Livestream" },
      }
    ),
  },
];

const FULL_NAME_BY_ID: Record<string, string> = {
  "a0000000-0000-4000-8000-000000000001": "Nguyễn Bảo Ngọc",
  "a0000000-0000-4000-8000-000000000002": "Trần Thùy Linh",
  "a0000000-0000-4000-8000-000000000003": "Lê Ngọc Minh",
  "a0000000-0000-4000-8000-000000000004": "Phạm Thu Trang",
  "a0000000-0000-4000-8000-000000000005": "Đỗ Tuyết Mai",
  "a0000000-0000-4000-8000-000000000006": "Vũ Minh Hà",
  "a0000000-0000-4000-8000-000000000007": "Hoàng Thanh An",
  "a0000000-0000-4000-8000-000000000008": "Bùi Quốc Hùng",
  "a0000000-0000-4000-8000-000000000009": "Ngô Phương Lan",
  "a0000000-0000-4000-8000-00000000000a": "Đặng Minh Khoa",
};

export const FALLBACK_CANDIDATES_MAP = new Map<string, CandidateUser>(
  SEED_CANDIDATES.map((c) => [c.userId, c])
);

// In-memory interaction store for fallback mode (when DB is paused)
export interface FallbackLikeEdge {
  fromUser: string;
  toUser: string;
  createdAt: string;
}

export interface FallbackMatchEdge {
  id: string;
  userA: string;
  userB: string;
  conversationId: string;
  createdAt: string;
}

export interface FallbackMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export const FALLBACK_LIKES: FallbackLikeEdge[] = [
  {
    fromUser: "a0000000-0000-4000-8000-000000000001",
    toUser: "a0000000-0000-4000-8000-000000000002",
    createdAt: "2026-10-15T10:00:00.000Z",
  },
  {
    fromUser: "a0000000-0000-4000-8000-000000000002",
    toUser: "a0000000-0000-4000-8000-000000000001",
    createdAt: "2026-10-15T12:00:00.000Z",
  },
  {
    fromUser: "a0000000-0000-4000-8000-000000000003",
    toUser: "a0000000-0000-4000-8000-000000000001",
    createdAt: "2026-10-16T09:30:00.000Z",
  },
];

export const FALLBACK_MATCHES: FallbackMatchEdge[] = [
  {
    id: "d0000000-0000-4000-8000-000000000012",
    userA: "a0000000-0000-4000-8000-000000000001",
    userB: "a0000000-0000-4000-8000-000000000002",
    conversationId: "e0000000-0000-4000-8000-000000000012",
    createdAt: "2026-10-15T12:00:00.000Z",
  },
];

export const FALLBACK_MESSAGES: FallbackMessage[] = [
  {
    id: "msg-fallback-1",
    conversation_id: "e0000000-0000-4000-8000-000000000012",
    sender_id: "a0000000-0000-4000-8000-000000000001",
    body: "Chào Linh, mình thấy phòng của bạn rất hợp!",
    created_at: "2026-10-15T12:05:00.000Z",
  },
  {
    id: "msg-fallback-2",
    conversation_id: "e0000000-0000-4000-8000-000000000012",
    sender_id: "a0000000-0000-4000-8000-000000000002",
    body: "Chào Ngọc! Cuối tuần này bạn qua xem phòng nhé?",
    created_at: "2026-10-15T12:10:00.000Z",
  },
  {
    id: "msg-fallback-3",
    conversation_id: "e0000000-0000-4000-8000-000000000012",
    sender_id: "a0000000-0000-4000-8000-000000000001",
    body: "Ok bạn, chiều thứ Bảy nhé.",
    created_at: "2026-10-15T12:15:00.000Z",
  },
];

export function getFallbackCandidateUser(userId: string): CandidateUser | null {
  return (
    FALLBACK_CANDIDATES_MAP.get(userId) ||
    FALLBACK_CANDIDATES_MAP.get(DEFAULT_USER_ID) ||
    null
  );
}

export function getExactFallbackCandidateUser(userId: string): CandidateUser | null {
  return FALLBACK_CANDIDATES_MAP.get(userId) || null;
}

export function getFallbackUserSummary(userId: string): UserSummary | null {
  const c =
    FALLBACK_CANDIDATES_MAP.get(userId) ||
    FALLBACK_CANDIDATES_MAP.get(DEFAULT_USER_ID);
  if (!c) return null;

  return {
    id: c.userId,
    displayName: c.displayName,
    fullName: FULL_NAME_BY_ID[c.userId] || c.displayName,
    gender: c.gender,
    housingStatus: c.housingStatus,
    isCompleted: c.answers.size >= 30,
    answeredCount: c.answers.size,
    isVerified: c.isVerified,
    avatarPath: c.avatarPath ?? null,
    bio: c.bio ?? null,
    occupation: c.occupation ?? null,
    schoolOrWorkplace: c.schoolOrWorkplace ?? null,
    cityCode: c.cityCode ?? "hn",
    districtCode: c.districtCode ?? "hn-thanh-xuan",
  };
}

export function getFallbackDiscoveryFeed(viewerId?: string | null): {
  feed: DiscoveryFeedData;
  likedRecords: Array<{ userId: string; likedAt: string }>;
  matchedIds: string[];
} {
  const effectiveViewerId =
    viewerId && FALLBACK_CANDIDATES_MAP.has(viewerId)
      ? viewerId
      : DEFAULT_USER_ID;
  const viewer = FALLBACK_CANDIDATES_MAP.get(effectiveViewerId)!;

  const otherCandidates = Array.from(FALLBACK_CANDIDATES_MAP.values()).filter(
    (c) => c.userId !== viewer.userId
  );

  // Ranked eligible candidates
  const ranked = rankCandidates(viewer, otherCandidates);
  const topRecommendations: RecommendationResult[] = [...ranked.items];

  // All candidates scored
  const allCandidates: RecommendationResult[] = otherCandidates.map(
    (candidate) => {
      const compatibility = scorePair(viewer.answers, candidate.answers);
      const explanation = generateCompatibilityExplanation(
        viewer,
        candidate,
        compatibility
      );
      const housingFit = evaluateHousingFit(viewer, candidate);

      return {
        candidate,
        compatibility,
        explanation,
        housingFit,
        isEligible: true,
        ineligibilityReasons: [],
      };
    }
  );

  allCandidates.sort(
    (a, b) => b.compatibility.finalScore - a.compatibility.finalScore
  );

  const topIds = new Set(topRecommendations.map((r) => r.candidate.userId));
  if (topRecommendations.length < 4 && allCandidates.length > 0) {
    for (const cand of allCandidates) {
      if (!topIds.has(cand.candidate.userId)) {
        topRecommendations.push(cand);
        topIds.add(cand.candidate.userId);
        if (topRecommendations.length >= 4) break;
      }
    }
  }

  const likedRecords = FALLBACK_LIKES.filter(
    (l) => l.fromUser === effectiveViewerId
  ).map((l) => ({
    userId: l.toUser,
    likedAt: l.createdAt,
  }));

  const matchedIds = FALLBACK_MATCHES.filter(
    (m) => m.userA === effectiveViewerId || m.userB === effectiveViewerId
  ).map((m) => (m.userA === effectiveViewerId ? m.userB : m.userA));

  return {
    feed: {
      topRecommendations,
      allCandidates,
    },
    likedRecords,
    matchedIds,
  };
}
