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
 * In-memory TTL cache for CandidateUser objects and active profile ID list.
 * Eliminates redundant cross-region DB queries when switching between tabs.
 */
const CANDIDATE_CACHE_TTL_MS = 60_000; // 60 seconds
const candidateUserCache = new Map<
  string,
  { data: CandidateUser; expiresAt: number }
>();
let cachedAllProfileIds: { ids: string[]; expiresAt: number } | null = null;

export function invalidateCandidateCache(userId?: string): void {
  if (userId) {
    candidateUserCache.delete(userId);
  } else {
    candidateUserCache.clear();
  }
  cachedAllProfileIds = null;
}

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

function mapRowToCandidateUser(row: any): CandidateUser {
  const dob = new Date(row.date_of_birth);
  const diffMs = Date.now() - dob.getTime();
  const age = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));

  const isVerified = Boolean(row.is_verified_flag);
  const roommatePrefs = row.roommate_prefs_json || null;
  const roomPrefs = row.room_prefs_json || null;
  const dbRoom = row.room_json || null;

  let room: CandidateUser["room"] = null;
  if (row.housing_status === "has_room" && dbRoom && dbRoom.id) {
    const monthlyRent = Number(dbRoom.monthly_rent);
    const currentOccupants = Number(dbRoom.current_occupants ?? 1);
    const perPersonRent = monthlyRent / (currentOccupants + 1);
    room = {
      id: dbRoom.id,
      monthlyRent,
      perPersonRent: Number(perPersonRent),
      roomType: dbRoom.room_type,
      districtCode: dbRoom.district_code,
      cityCode: dbRoom.city_code,
      availableFrom: formatDate(dbRoom.available_from),
      facilities: parseArrayField(dbRoom.facilities),
      currentOccupants,
      capacityTotal: Number(dbRoom.capacity_total),
      imagesCount: Number(dbRoom.images_count ?? 0),
    };
  }

  const answersMap = new Map<
    number,
    { optionValues: number[]; otherText?: string | null }
  >();
  const rawAnswers = Array.isArray(row.answers_json) ? row.answers_json : [];
  for (const ans of rawAnswers) {
    if (ans && typeof ans.question_number === "number") {
      answersMap.set(ans.question_number, {
        optionValues: Array.isArray(ans.option_values)
          ? ans.option_values.map(Number)
          : [],
        otherText: ans.other_text ?? null,
      });
    }
  }

  const acceptedGenders = parseArrayField<"male" | "female" | "other">(
    roommatePrefs?.accepted_genders
  );

  return {
    userId: row.user_id,
    displayName: row.display_name,
    age,
    gender: row.gender,
    housingStatus: row.housing_status,
    isVerified,
    avatarPath: row.avatar_path,
    bio: row.bio,
    occupation: row.occupation,
    schoolOrWorkplace: row.school_or_workplace,
    cityCode: row.city_code,
    districtCode: row.district_code,
    email: row.auth_email || row.email || null,
    phone: row.phone || null,
    zalo: row.zalo || null,
    facebook: row.facebook || null,
    isSmoker: row.is_smoker,
    createdAt: row.created_at,
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

/**
 * Bulk-loads multiple CandidateUser domain objects in a SINGLE SQL query
 * with an in-memory TTL cache to eliminate redundant round-trips across tab transitions.
 */
export async function fetchCandidateUsersByIds(
  client: SupabaseClient<Database> | any,
  userIds: string[]
): Promise<Map<string, CandidateUser>> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  const resultMap = new Map<string, CandidateUser>();
  if (uniqueIds.length === 0) return resultMap;

  const now = Date.now();
  const missingIds: string[] = [];

  for (const id of uniqueIds) {
    const cached = candidateUserCache.get(id);
    if (cached && cached.expiresAt > now) {
      resultMap.set(id, cached.data);
    } else {
      missingIds.push(id);
    }
  }

  if (missingIds.length === 0) {
    return resultMap;
  }

  if (isPgClient(client)) {
    const res = await client.query(
      `
      select
        p.*,
        u.email as auth_email,
        (
          p.verification_status = 'verified'
          or exists (
            select 1 from public.verification_records vr
            where vr.user_id = p.user_id and vr.status = 'verified'
          )
        ) as is_verified_flag,
        to_jsonb(rmp) as roommate_prefs_json,
        to_jsonb(rp) as room_prefs_json,
        to_jsonb(rm) as room_json,
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'question_number', q.number,
                'option_values', a.option_values,
                'other_text', a.other_text
              )
            )
            from public.user_answers a
            join public.questions q on q.id = a.question_id
            where a.user_id = p.user_id
          ),
          '[]'::jsonb
        ) as answers_json
      from public.profiles p
      left join auth.users u on u.id = p.user_id
      left join public.roommate_preferences rmp on rmp.user_id = p.user_id
      left join public.room_preferences rp on rp.user_id = p.user_id
      left join lateral (
        select r.id, r.monthly_rent, r.room_type, r.district_code, r.city_code,
               r.available_from, r.facilities, r.current_occupants, r.capacity_total,
               (select count(*)::int from public.room_images i where i.room_id = r.id) as images_count
        from public.rooms r
        where r.owner_id = p.user_id and r.is_published
        limit 1
      ) rm on p.housing_status = 'has_room'
      where p.user_id = any($1::uuid[])
    `,
      [missingIds]
    );

    const expiresAt = Date.now() + CANDIDATE_CACHE_TTL_MS;
    for (const row of res.rows) {
      const candidate = mapRowToCandidateUser(row);
      resultMap.set(candidate.userId, candidate);
      candidateUserCache.set(candidate.userId, {
        data: candidate,
        expiresAt,
      });
    }
    return resultMap;
  }

  // Fallback for Supabase JS client
  const loaded = await Promise.all(
    missingIds.map((id) => fetchCandidateUser(client, id))
  );
  for (const c of loaded) {
    if (c) resultMap.set(c.userId, c);
  }
  return resultMap;
}

/**
 * Converts DB rows for a single user into a CandidateUser domain object.
 */
export async function fetchCandidateUser(
  client: SupabaseClient<Database> | any,
  userId: string
): Promise<CandidateUser | null> {
  if (!userId) return null;
  if (isPgClient(client)) {
    const map = await fetchCandidateUsersByIds(client, [userId]);
    return map.get(userId) ?? null;
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
    email: (profile as any).email || null,
    phone: (profile as any).phone || null,
    zalo: (profile as any).zalo || null,
    facebook: (profile as any).facebook || null,
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
 * 1. Fetches eligible candidate IDs using DB RPC fn_eligible_candidates.
 * 2. Bulk-loads viewer + candidate domain objects in 1 SQL query.
 * 3. Executes deterministic scoring, explanation, ranking, and pagination.
 */
export async function getRecommendedRoommates(
  client: SupabaseClient<Database> | any,
  viewerId: string,
  filters?: RecommendationFilters,
  pagination?: PaginationOptions
): Promise<PaginatedRecommendations> {
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

  const usersMap = await fetchCandidateUsersByIds(client, [viewerId, ...ids]);
  const viewer = usersMap.get(viewerId);
  if (!viewer) {
    throw new Error(`Viewer with ID ${viewerId} not found.`);
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

  const candidates: CandidateUser[] = [];
  for (const id of ids) {
    const candidate = usersMap.get(id);
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
 * for the "Khám phá tiếp" (Explore further) flow in just 2 fast SQL queries.
 */
export async function getDiscoveryFeed(
  client: SupabaseClient<Database> | any,
  viewerId: string
): Promise<DiscoveryFeedData> {
  if (isPgClient(client)) {
    // 1. Fetch all active/completed profile IDs + viewer's passed user IDs in 1 query
    const metaRes = await client.query(
      `
      select
        array(
          select p.user_id
          from public.profiles p
          where p.user_id = $1
             or p.completed_at is not null
             or exists (select 1 from public.user_answers ua where ua.user_id = p.user_id)
          order by p.created_at asc
        ) as all_user_ids,
        array(
          select ps.to_user
          from public.passes ps
          where ps.from_user = $1
        ) as passed_user_ids
    `,
      [viewerId]
    );

    const allUserIds: string[] = metaRes.rows[0]?.all_user_ids ?? [viewerId];
    const passedSet = new Set<string>(metaRes.rows[0]?.passed_user_ids ?? []);

    // 2. Bulk-load viewer + all candidates in 1 single SQL query
    const usersMap = await fetchCandidateUsersByIds(client, allUserIds);
    const viewer = usersMap.get(viewerId);
    if (!viewer) {
      throw new Error(`Viewer with ID ${viewerId} not found.`);
    }

    const unpassedCandidates: CandidateUser[] = [];
    const allCandidates: RecommendationResult[] = [];

    for (const id of allUserIds) {
      if (id === viewerId) continue;
      const candidate = usersMap.get(id);
      if (!candidate) continue;

      if (!passedSet.has(id)) {
        unpassedCandidates.push(candidate);
      }

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

    // Sort allCandidates by compatibility score descending
    allCandidates.sort(
      (a, b) => b.compatibility.finalScore - a.compatibility.finalScore
    );

    // Compute strict hard-filtered topRecommendations in memory (0 extra DB queries!)
    const rankedEligible = rankCandidates(viewer, unpassedCandidates);
    const topRecommendations = [...rankedEligible.items];

    // Ensure topRecommendations has at least top 4 matches with highest compatibility scores
    const topIds = new Set(topRecommendations.map((r) => r.candidate.userId));
    if (topRecommendations.length < 4 && allCandidates.length > 0) {
      for (const cand of allCandidates) {
        if (
          !topIds.has(cand.candidate.userId) &&
          !passedSet.has(cand.candidate.userId)
        ) {
          topRecommendations.push(cand);
          topIds.add(cand.candidate.userId);
          if (topRecommendations.length >= 4) break;
        }
      }
    }

    return {
      topRecommendations,
      allCandidates,
    };
  }

  // Fallback for non-pg client
  const viewer = await fetchCandidateUser(client, viewerId);
  if (!viewer) {
    throw new Error(`Viewer with ID ${viewerId} not found.`);
  }

  let topRecommendations: RecommendationResult[] = [];
  try {
    const recs = await getRecommendedRoommates(client, viewerId);
    topRecommendations = recs.items;
  } catch (err) {
    console.warn("Could not get RPC recommendations, using pure scoring fallback", err);
  }

  const { data: res } = await client
    .from("profiles")
    .select("user_id")
    .neq("user_id", viewerId)
    .not("completed_at", "is", null);
  const candidateIds = (res || []).map((r: any) => r.user_id);

  const usersMap = await fetchCandidateUsersByIds(client, candidateIds);
  const allCandidates: RecommendationResult[] = [];
  for (const id of candidateIds) {
    const candidate = usersMap.get(id);
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

  return {
    topRecommendations,
    allCandidates,
  };
}
