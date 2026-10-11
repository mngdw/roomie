/**
 * ROOMIE · Recommendation Engine & Candidate Ranking (Steps 1–5)
 * Combines hard filtering, compatibility scoring, deterministic explanations,
 * four-tier tie-breaking, and pagination.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "../db/database.types";
import type {
  CandidateUser,
  RecommendationFilters,
  PaginationOptions,
  RecommendationResult,
  PaginatedRecommendations,
} from "./types";
import { evaluatePairEligibility, evaluateHousingFit } from "./hard-filters";
import { scorePair } from "./scoring";
import { generateCompatibilityExplanation } from "./explanation";
import { QUESTIONNAIRE_QUESTIONS } from "../questionnaire/catalog.generated";
import { ALGORITHM_VERSION } from "./constants";

/**
 * Maps DB questions by id for quick lookup.
 */
const QUESTION_BY_ID = new Map(QUESTIONNAIRE_QUESTIONS.map((q) => [q.id, q]));

/**
 * Pure, deterministic ranking of candidate users against a viewer.
 */
export function rankCandidates(
  viewer: CandidateUser,
  candidates: CandidateUser[],
  filters?: RecommendationFilters,
  pagination?: PaginationOptions
): PaginatedRecommendations {
  const eligibleResults: RecommendationResult[] = [];

  for (const candidate of candidates) {
    // 1. User-chosen UI filters
    if (filters) {
      if (filters.gender && candidate.gender !== filters.gender) {
        continue;
      }
      if (filters.isVerifiedOnly && !candidate.isVerified) {
        continue;
      }
      if (filters.housingStatus && candidate.housingStatus !== filters.housingStatus) {
        continue;
      }
      if (filters.districtCodes && filters.districtCodes.length > 0) {
        const candidateDistrict =
          candidate.housingStatus === "has_room"
            ? candidate.room?.districtCode
            : candidate.districtCode;
        if (!candidateDistrict || !filters.districtCodes.includes(candidateDistrict)) {
          continue;
        }
      }
      if (filters.budgetMax !== undefined) {
        if (candidate.housingStatus === "has_room" && candidate.room) {
          const rent =
            candidate.room.perPersonRent > 0
              ? candidate.room.perPersonRent
              : candidate.room.monthlyRent / (candidate.room.currentOccupants + 1);
          if (rent > filters.budgetMax) {
            continue;
          }
        }
      }
    }

    // 2. Hard filter eligibility check (H0–H11)
    const eligibility = evaluatePairEligibility(viewer, candidate);
    if (!eligibility.isEligible) {
      continue;
    }

    // 3. Compatibility score
    const compatibility = scorePair(viewer.answers, candidate.answers);

    // 4. Deterministic explanation
    const explanation = generateCompatibilityExplanation(viewer, candidate, compatibility);

    // 5. Housing fit (for 2nd-tier tie-breaking)
    const housingFit = evaluateHousingFit(viewer, candidate);

    eligibleResults.push({
      candidate,
      compatibility,
      explanation,
      housingFit,
      isEligible: true,
      ineligibilityReasons: [],
    });
  }

  // 6. Total Order Ranking with 4-tier tie-breakers:
  //    1. finalScore DESC (unrounded float)
  //    2. housingFit DESC
  //    3. isVerified DESC (trust signal)
  //    4. userId ASC (strict deterministic order)
  eligibleResults.sort((a, b) => {
    // Tier 1: finalScore descending
    if (Math.abs(a.compatibility.finalScore - b.compatibility.finalScore) > 1e-7) {
      return b.compatibility.finalScore - a.compatibility.finalScore;
    }

    // Tier 2: housingFit descending
    if (Math.abs(a.housingFit - b.housingFit) > 1e-7) {
      return b.housingFit - a.housingFit;
    }

    // Tier 3: isVerified descending
    if (a.candidate.isVerified !== b.candidate.isVerified) {
      return a.candidate.isVerified ? -1 : 1;
    }

    // Tier 4: userId ascending (lexicographical total order)
    return a.candidate.userId.localeCompare(b.candidate.userId);
  });

  // 7. Pagination
  const page = Math.max(1, pagination?.page ?? 1);
  const pageSize = Math.max(1, pagination?.pageSize ?? 10);
  const total = eligibleResults.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const startIndex = (page - 1) * pageSize;
  const items = eligibleResults.slice(startIndex, startIndex + pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
  };
}

function isPgClient(
  client: unknown
): client is { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }> } {
  return (
    typeof (client as any)?.query === "function" &&
    typeof (client as any)?.from !== "function"
  );
}

function parseArrayField<T = string>(val: unknown): T[] {
  if (!val) return [];
  if (Array.isArray(val)) return val as T[];
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const inner = trimmed.slice(1, -1).trim();
      if (!inner) return [];
      return inner
        .split(",")
        .map((s) => s.trim().replace(/^"|"$/g, ""))
        .filter(Boolean) as unknown as T[];
    }
    if (trimmed.length > 0) {
      return [trimmed as unknown as T];
    }
  }
  return [];
}

function formatDate(val: unknown): string {
  if (!val) return "";
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(val).slice(0, 10);
}

/**
 * Calculates and optionally caches compatibility score in PostgreSQL compatibility_scores table.
 */
export async function cacheCompatibilityScore(
  client: SupabaseClient<Database> | any,
  userAId: string,
  userBId: string,
  result: RecommendationResult
): Promise<void> {
  const [userLow, userHigh] =
    userAId < userBId ? [userAId, userBId] : [userBId, userAId];

  if (isPgClient(client)) {
    await client.query(
      `
      insert into public.compatibility_scores (user_low, user_high, algo_version, version_low, version_high, final_score, category_scores, dimension_scores, computed_at)
      values ($1, $2, $3, 1, 1, $4, $5, $6, now())
      on conflict (user_low, user_high) do update
      set final_score = excluded.final_score,
          category_scores = excluded.category_scores,
          dimension_scores = excluded.dimension_scores,
          computed_at = excluded.computed_at
    `,
      [
        userLow,
        userHigh,
        ALGORITHM_VERSION,
        result.compatibility.finalScore,
        JSON.stringify(result.compatibility.categoryScores),
        JSON.stringify(result.compatibility.dimensionScores),
      ]
    );
    return;
  }

  await client.from("compatibility_scores").upsert(
    {
      user_low: userLow,
      user_high: userHigh,
      algo_version: ALGORITHM_VERSION,
      version_low: 1,
      version_high: 1,
      final_score: result.compatibility.finalScore,
      category_scores: result.compatibility.categoryScores as unknown as Json,
      dimension_scores: result.compatibility.dimensionScores as unknown as Json,
      computed_at: new Date().toISOString(),
    },
    { onConflict: "user_low,user_high" }
  );
}

/**
 * Converts DB rows for a single user into a CandidateUser domain object.
 */
export async function fetchCandidateUser(
  client: SupabaseClient<Database> | any,
  userId: string
): Promise<CandidateUser | null> {
  if (isPgClient(client)) {
    // 1. Profile
    const pRes = await client.query(
      "select * from public.profiles where user_id = $1",
      [userId]
    );
    const profile = pRes.rows[0];
    if (!profile) return null;

    const dob = new Date(profile.date_of_birth);
    const diffMs = Date.now() - dob.getTime();
    const age = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));

    // 2. Verification
    const vRes = await client.query(
      "select status from public.verification_records where user_id = $1 order by created_at desc limit 1",
      [userId]
    );
    const isVerified = vRes.rows[0]?.status === "verified";

    // 3. Roommate preferences
    const rmpRes = await client.query(
      "select * from public.roommate_preferences where user_id = $1",
      [userId]
    );
    const roommatePrefs = rmpRes.rows[0];

    // 4. Room preferences
    const rpRes = await client.query(
      "select * from public.room_preferences where user_id = $1",
      [userId]
    );
    const roomPrefs = rpRes.rows[0];

    // 5. Room
    let room: CandidateUser["room"] = null;
    if (profile.housing_status === "has_room") {
      const rmRes = await client.query(
        `select r.*, (select count(*)::int from public.room_images i where i.room_id = r.id) as images_count
         from public.rooms r
         where r.owner_id = $1 and r.is_published
         limit 1`,
        [userId]
      );
      const dbRoom = rmRes.rows[0];
      if (dbRoom) {
        const perPersonRent =
          dbRoom.monthly_rent / (dbRoom.current_occupants + 1);
        room = {
          id: dbRoom.id,
          monthlyRent: Number(dbRoom.monthly_rent),
          perPersonRent: Number(perPersonRent),
          roomType: dbRoom.room_type,
          districtCode: dbRoom.district_code,
          cityCode: dbRoom.city_code,
          availableFrom: formatDate(dbRoom.available_from),
          facilities: parseArrayField(dbRoom.facilities),
          currentOccupants: Number(dbRoom.current_occupants),
          capacityTotal: Number(dbRoom.capacity_total),
          imagesCount: Number(dbRoom.images_count ?? 0),
        };
      }
    }

    // 6. Answers
    const ansRes = await client.query(
      `select a.option_values, a.other_text, q.number as question_number
       from public.user_answers a
       join public.questions q on q.id = a.question_id
       where a.user_id = $1`,
      [userId]
    );

    const answersMap = new Map<
      number,
      { optionValues: number[]; otherText?: string | null }
    >();
    for (const row of ansRes.rows) {
      answersMap.set(row.question_number, {
        optionValues: row.option_values ?? [],
        otherText: row.other_text,
      });
    }

    const acceptedGenders = parseArrayField<"male" | "female" | "other">(
      roommatePrefs?.accepted_genders
    );

    return {
      userId: profile.user_id,
      displayName: profile.display_name,
      age,
      gender: profile.gender,
      housingStatus: profile.housing_status,
      isVerified,
      avatarPath: profile.avatar_path,
      bio: profile.bio,
      occupation: profile.occupation,
      schoolOrWorkplace: profile.school_or_workplace,
      cityCode: profile.city_code,
      districtCode: profile.district_code,
      isSmoker: profile.is_smoker,
      createdAt: profile.created_at,
      room,
      roommatePreferences: roommatePrefs
        ? {
            acceptedGenders:
              acceptedGenders.length > 0
                ? acceptedGenders
                : ["male", "female", "other"],
            ageMin: roommatePrefs.age_min,
            ageMax: roommatePrefs.age_max,
            ageIsDealbreaker: roommatePrefs.age_is_dealbreaker ?? false,
            smokingPolicy: roommatePrefs.smoking_policy ?? "any",
            requirementTags: parseArrayField(roommatePrefs.requirement_tags),
          }
        : null,
      roomPreferences: roomPrefs
        ? {
            preferredDistrictCodes: parseArrayField(
              roomPrefs.preferred_district_codes
            ),
            budgetMin: roomPrefs.budget_min ? Number(roomPrefs.budget_min) : null,
            budgetMax: Number(roomPrefs.budget_max),
            roomTypes: parseArrayField<"private" | "shared">(roomPrefs.room_types),
            moveInDate: formatDate(roomPrefs.move_in_date),
            moveInFlexDays: roomPrefs.move_in_flex_days ?? 30,
            mustHaveFacilities: parseArrayField(roomPrefs.must_have_facilities),
            requireMedia: roomPrefs.require_media ?? false,
          }
        : null,
      answers: answersMap,
    };
  }

  // Fetch profile via Supabase
  const { data: profile, error: pError } = await client
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (pError || !profile) return null;

  const dob = new Date(profile.date_of_birth);
  const diffMs = Date.now() - dob.getTime();
  const age = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));

  const { data: verification } = await client
    .from("verification_records")
    .select("status")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const isVerified = verification?.status === "verified";

  const { data: roommatePrefs } = await client
    .from("roommate_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: roomPrefs } = await client
    .from("room_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  let room: CandidateUser["room"] = null;
  if (profile.housing_status === "has_room") {
    const { data: dbRoom } = await client
      .from("rooms")
      .select("*, room_images(count)")
      .eq("owner_id", userId)
      .eq("is_published", true)
      .maybeSingle();

    if (dbRoom) {
      const perPersonRent =
        dbRoom.monthly_rent / (dbRoom.current_occupants + 1);
      const imagesCount =
        Array.isArray(dbRoom.room_images) && dbRoom.room_images.length > 0
          ? (dbRoom.room_images[0] as unknown as { count: number }).count ?? 0
          : 0;

      room = {
        id: dbRoom.id,
        monthlyRent: dbRoom.monthly_rent,
        perPersonRent,
        roomType: dbRoom.room_type,
        districtCode: dbRoom.district_code,
        cityCode: dbRoom.city_code,
        availableFrom: dbRoom.available_from,
        facilities: dbRoom.facilities ?? [],
        currentOccupants: dbRoom.current_occupants,
        capacityTotal: dbRoom.capacity_total,
        imagesCount,
      };
    }
  }

  const { data: dbAnswers } = await client
    .from("user_answers")
    .select("*")
    .eq("user_id", userId);

  const answersMap = new Map<
    number,
    { optionValues: number[]; otherText?: string | null }
  >();

  for (const row of dbAnswers ?? []) {
    const question = QUESTION_BY_ID.get(row.question_id);
    if (!question) continue;

    answersMap.set(question.number, {
      optionValues: row.option_values ?? [],
      otherText: row.other_text,
    });
  }

  return {
    userId: profile.user_id,
    displayName: profile.display_name,
    age,
    gender: profile.gender,
    housingStatus: profile.housing_status,
    isVerified,
    avatarPath: profile.avatar_path,
    bio: profile.bio,
    occupation: profile.occupation,
    schoolOrWorkplace: profile.school_or_workplace,
    cityCode: profile.city_code,
    districtCode: profile.district_code,
    isSmoker: profile.is_smoker,
    createdAt: profile.created_at,
    room,
    roommatePreferences: roommatePrefs
      ? {
          acceptedGenders: roommatePrefs.accepted_genders ?? [
            "male",
            "female",
            "other",
          ],
          ageMin: roommatePrefs.age_min,
          ageMax: roommatePrefs.age_max,
          ageIsDealbreaker: roommatePrefs.age_is_dealbreaker ?? false,
          smokingPolicy: roommatePrefs.smoking_policy ?? "any",
          requirementTags: roommatePrefs.requirement_tags ?? [],
        }
      : null,
    roomPreferences: roomPrefs
      ? {
          preferredDistrictCodes: roomPrefs.preferred_district_codes ?? [],
          budgetMin: roomPrefs.budget_min,
          budgetMax: roomPrefs.budget_max,
          roomTypes: roomPrefs.room_types ?? [],
          moveInDate: roomPrefs.move_in_date,
          moveInFlexDays: roomPrefs.move_in_flex_days ?? 30,
          mustHaveFacilities: roomPrefs.must_have_facilities ?? [],
          requireMedia: roomPrefs.require_media ?? false,
        }
      : null,
    answers: answersMap,
  };
}

/**
 * End-to-end database recommendation pipeline:
 * 1. Fetches viewer profile and answers.
 * 2. Fetches eligible candidate IDs using DB RPC fn_eligible_candidates.
 * 3. Loads candidate domain objects.
 * 4. Executes deterministic scoring, explanation, ranking, and pagination.
 */
export async function getRecommendedRoommates(
  client: SupabaseClient<Database> | any,
  viewerId: string,
  filters?: RecommendationFilters,
  pagination?: PaginationOptions
): Promise<PaginatedRecommendations> {
  const viewer = await fetchCandidateUser(client, viewerId);
  if (!viewer) {
    throw new Error(`Viewer with ID ${viewerId} not found.`);
  }

  let ids: string[] = [];
  if (isPgClient(client)) {
    const candRes = await client.query(
      "select public.fn_eligible_candidates($1) as id",
      [viewerId]
    );
    ids = candRes.rows.map((r: any) => r.id).filter(Boolean);
  } else {
    const { data: candidateIds, error: rpcError } = await client.rpc(
      "fn_eligible_candidates" as unknown as never,
      { p_viewer: viewerId } as unknown as never
    );

    if (rpcError) {
      throw rpcError;
    }

    ids = (candidateIds as unknown as string[]) ?? [];
  }

  if (ids.length === 0) {
    return {
      items: [],
      total: 0,
      page: pagination?.page ?? 1,
      pageSize: pagination?.pageSize ?? 10,
      totalPages: 1,
    };
  }

  // Load candidate users
  const candidates: CandidateUser[] = [];
  for (const id of ids) {
    const candidate = await fetchCandidateUser(client, id);
    if (candidate) {
      candidates.push(candidate);
    }
  }

  // Rank in memory
  return rankCandidates(viewer, candidates, filters, pagination);
}

export interface DiscoveryFeedData {
  topRecommendations: RecommendationResult[];
  allCandidates: RecommendationResult[];
}

/**
 * Loads both top high-compatibility recommendations AND the broader candidate pool
 * for the "Khám phá tiếp" (Explore further) flow.
 */
export async function getDiscoveryFeed(
  client: SupabaseClient<Database> | any,
  viewerId: string
): Promise<DiscoveryFeedData> {
  const viewer = await fetchCandidateUser(client, viewerId);
  if (!viewer) {
    throw new Error(`Viewer with ID ${viewerId} not found.`);
  }

  // 1. Fetch eligible top recommendations
  let topRecommendations: RecommendationResult[] = [];
  try {
    const recs = await getRecommendedRoommates(client, viewerId);
    topRecommendations = recs.items;
  } catch (err) {
    console.warn("Could not get RPC recommendations, using pure scoring fallback", err);
  }

  // 2. Fetch all other candidate profiles from DB
  let candidateIds: string[] = [];
  if (isPgClient(client)) {
    const res = await client.query(
      `select user_id from public.profiles
       where user_id != $1
         and (completed_at is not null or (select count(*) from public.user_answers where user_id = profiles.user_id) > 0)
       order by created_at asc`,
      [viewerId]
    );
    candidateIds = res.rows.map((r: any) => r.user_id);
  } else {
    const { data: res } = await client
      .from("profiles")
      .select("user_id")
      .neq("user_id", viewerId)
      .not("completed_at", "is", null);
    candidateIds = (res || []).map((r: any) => r.user_id);
  }

  // 3. Load all candidates and score them against the viewer
  const allCandidates: RecommendationResult[] = [];
  for (const id of candidateIds) {
    const candidate = await fetchCandidateUser(client, id);
    if (!candidate) continue;

    const compatibility = scorePair(viewer.answers, candidate.answers);
    const explanation = generateCompatibilityExplanation(
      viewer,
      candidate,
      compatibility
    );
    const housingFit = evaluateHousingFit(viewer, candidate);

    allCandidates.push({
      candidate,
      compatibility,
      explanation,
      housingFit,
      isEligible: true,
      ineligibilityReasons: [],
    });
  }

  // Sort all candidates by compatibility score descending
  allCandidates.sort(
    (a, b) => b.compatibility.finalScore - a.compatibility.finalScore
  );

  // If topRecommendations is empty, pick top matches from allCandidates
  if (topRecommendations.length === 0 && allCandidates.length > 0) {
    topRecommendations = allCandidates.slice(0, Math.min(4, allCandidates.length));
  }

  return {
    topRecommendations,
    allCandidates,
  };
}
