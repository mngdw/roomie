/**
 * ROOMIE · Matching Engine Type Definitions
 */

export type CategoryKey =
  | "lifestyle"
  | "cleanliness"
  | "schedule_noise"
  | "social_space"
  | "financial"
  | "communication";

export type DimensionRule = "SYM" | "TIME" | "DIR" | "JAC" | "JOINT" | "MATRIX";

export interface DimensionConfig {
  code: string;
  category: CategoryKey;
  rule: DimensionRule;
  weight: number; // weight within its category (sums to 1.0 per category)
  name_vi: string;
  name_en: string;
  description_vi: string;
}

export interface DimensionScoreResult {
  code: string;
  category: CategoryKey;
  score: number; // 0 to 100, unrounded
  rule: DimensionRule;
  answered: boolean; // false if required answers were missing
  details?: Record<string, unknown>;
}

export interface CategoryScoreResult {
  category: CategoryKey;
  name_vi: string;
  score: number; // 0 to 100, unrounded
  weight: number; // 0.10 to 0.25 (sums to 1.0)
  answeredCount: number;
  totalDimensions: number;
  isFullyAnswered: boolean;
}

export interface PairScoreResult {
  finalScore: number; // 0 to 100, unrounded floating point
  displayScore: number; // Math.round(finalScore)
  categoryScores: Record<CategoryKey, CategoryScoreResult>;
  dimensionScores: Record<string, DimensionScoreResult>;
  isFullyAnswered: boolean;
  answeredQuestionCountA: number;
  answeredQuestionCountB: number;
}

export interface CompatibilityExplanation {
  overallPercentage: number;
  categoryScores: Record<CategoryKey, { score: number; displayScore: number; name_vi: string }>;
  whyYouMatch: Array<{
    dimensionCode: string;
    category: CategoryKey;
    title: string;
    detail: string;
    score: number;
  }>;
  thingsToDiscuss: Array<{
    dimensionCode: string;
    category: CategoryKey;
    title: string;
    detail: string;
    score: number;
    shortfall?: number;
  }>;
}

export interface CandidateUser {
  userId: string;
  displayName: string;
  age: number;
  gender: "male" | "female" | "other";
  housingStatus: "has_room" | "looking_for_room";
  isVerified: boolean;
  avatarPath?: string | null;
  bio?: string | null;
  occupation?: string | null;
  schoolOrWorkplace?: string | null;
  cityCode?: string | null;
  districtCode?: string | null;
  email?: string | null;
  phone?: string | null;
  zalo?: string | null;
  facebook?: string | null;
  isSmoker: boolean;
  createdAt: string;
  // Room info if has_room
  room?: {
    id: string;
    monthlyRent: number;
    perPersonRent: number;
    roomType: "private" | "shared";
    districtCode: string;
    cityCode?: string | null;
    availableFrom: string;
    facilities: string[];
    currentOccupants: number;
    capacityTotal: number;
    imagesCount?: number;
  } | null;
  // Roommate preferences
  roommatePreferences?: {
    acceptedGenders: Array<"male" | "female" | "other">;
    ageMin?: number | null;
    ageMax?: number | null;
    ageIsDealbreaker: boolean;
    smokingPolicy: "any" | "non_smoker_only";
    requirementTags: string[];
  } | null;
  // Room preferences if looking_for_room
  roomPreferences?: {
    preferredDistrictCodes: string[];
    budgetMin?: number | null;
    budgetMax: number;
    roomTypes: Array<"private" | "shared">;
    moveInDate: string;
    moveInFlexDays: number;
    mustHaveFacilities: string[];
    requireMedia: boolean;
  } | null;
  answers: Map<number, { optionValues: number[]; otherText?: string | null }>;
}

export interface RecommendationResult {
  candidate: CandidateUser;
  compatibility: PairScoreResult;
  explanation: CompatibilityExplanation;
  housingFit: number; // 0 to 1
  isEligible: boolean;
  ineligibilityReasons: string[];
}

export interface RecommendationFilters {
  gender?: "male" | "female" | "other";
  districtCodes?: string[];
  budgetMax?: number;
  isVerifiedOnly?: boolean;
  housingStatus?: "has_room" | "looking_for_room";
}

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

export interface PaginatedRecommendations {
  items: RecommendationResult[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
