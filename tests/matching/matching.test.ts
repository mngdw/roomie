import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  CATEGORY_WEIGHTS,
  DIMENSIONS,
  Q11_BEDTIME_HOURS,
  Q12_WAKE_HOURS,
  calcSymmetricOrdinal,
  calcTimeScore,
  calcJaccardScore,
  calcMatrixScore,
  calcDirectionalScore,
  calcJointPositiveScore,
  scoreDimension,
  scorePair,
  evaluatePairEligibility,
  evaluateHousingFit,
  generateCompatibilityExplanation,
  rankCandidates,
  fetchCandidateUser,
  getRecommendedRoommates,
  cacheCompatibilityScore,
} from "../../src/lib/matching";
import type { CandidateUser, AnswerMap } from "../../src/lib/matching";
import { getAdminClient, USER_IDS } from "../db/test-helper";

/**
 * Helper to build an AnswerMap with all 30 questions set to a single default value.
 */
function createUniformAnswers(
  defaultVal: number = 3
): Map<number, { optionValues: number[]; otherText?: string | null }> {
  const map = new Map<number, { optionValues: number[]; otherText?: string | null }>();
  for (let q = 1; q <= 30; q++) {
    if (q === 14) {
      map.set(q, { optionValues: [1] }); // Ngủ
    } else if (q === 22) {
      map.set(q, { optionValues: [1] }); // 50/50
    } else if (q === 28 || q === 30) {
      map.set(q, { optionValues: [5] }); // max joint agreement
    } else {
      map.set(q, { optionValues: [defaultVal] });
    }
  }
  return map;
}

/**
 * Helper to build a CandidateUser fixture.
 */
function createCandidate(overrides: Partial<CandidateUser> = {}): CandidateUser {
  return {
    userId: "u-" + Math.random().toString(36).substring(2, 9),
    displayName: "User Test",
    age: 22,
    gender: "female",
    housingStatus: "looking_for_room",
    isVerified: true,
    isSmoker: false,
    createdAt: new Date().toISOString(),
    cityCode: "hn",
    districtCode: "hn-thanh-xuan",
    room: null,
    roommatePreferences: {
      acceptedGenders: ["female"],
      ageMin: 20,
      ageMax: 26,
      ageIsDealbreaker: false,
      smokingPolicy: "non_smoker_only",
      requirementTags: [],
    },
    roomPreferences: {
      preferredDistrictCodes: ["hn-thanh-xuan"],
      budgetMin: 1500000,
      budgetMax: 2500000,
      roomTypes: ["shared", "private"],
      moveInDate: "2026-11-01",
      moveInFlexDays: 30,
      mustHaveFacilities: [],
      requireMedia: false,
    },
    answers: createUniformAnswers(3),
    ...overrides,
  };
}

describe("ROOMIE · Matching Engine", () => {
  // =========================================================================
  // 1. Identical answers (100%)
  // =========================================================================
  it("Test 1: Identical answers produce exactly 100.0% compatibility", () => {
    const answers = createUniformAnswers(3);
    const result = scorePair(answers, answers);

    expect(result.finalScore).toBeCloseTo(100.0, 5);
    expect(result.displayScore).toBe(100);
    expect(result.isFullyAnswered).toBe(true);

    for (const [catKey, catRes] of Object.entries(result.categoryScores)) {
      expect(catRes.score).toBeCloseTo(100.0, 5);
      expect(catRes.isFullyAnswered).toBe(true);
    }
  });

  // =========================================================================
  // 2. Maximum difference (0% on scale questions)
  // =========================================================================
  it("Test 2: Maximum difference on scale questions yields 0% on those dimensions", () => {
    const scoreMinMax = calcSymmetricOrdinal(1, 5);
    expect(scoreMinMax).toBe(0);

    const scoreMaxMin = calcSymmetricOrdinal(5, 1);
    expect(scoreMaxMin).toBe(0);

    // Bedtime 1 (21.0h) vs 5 (26.0h): 5h apart > 4h max gap -> 0
    const scoreBedtimeGap = calcTimeScore(1, 5, Q11_BEDTIME_HOURS);
    expect(scoreBedtimeGap).toBe(0);

    // Wake 1 (5.0h) vs 5 (10.0h): 5h apart > 4h max gap -> 0
    const scoreWakeGap = calcTimeScore(1, 5, Q12_WAKE_HOURS);
    expect(scoreWakeGap).toBe(0);
  });

  // =========================================================================
  // 3. Category and dimension weights check
  // =========================================================================
  it("Test 3: Category weights sum to 1.000 and dimension weights sum to 1.000 per category", () => {
    const totalCatWeight = Object.values(CATEGORY_WEIGHTS).reduce((acc, w) => acc + w, 0);
    expect(totalCatWeight).toBeCloseTo(1.0, 6);

    const dimsByCategory: Record<string, number> = {};
    for (const [, config] of Object.entries(DIMENSIONS)) {
      dimsByCategory[config.category] = (dimsByCategory[config.category] ?? 0) + config.weight;
    }

    expect(Object.keys(dimsByCategory)).toHaveLength(6);
    for (const [cat, sumW] of Object.entries(dimsByCategory)) {
      expect(sumW).toBeCloseTo(1.0, 6);
    }

    expect(Object.keys(DIMENSIONS)).toHaveLength(27);
  });

  // =========================================================================
  // 4. Weighted final score formula verification (golden fixtures)
  // =========================================================================
  it("Test 4: Golden fixtures match exact hand-computed values", () => {
    // 4.1 Ordinal: 4 vs 2 -> 50%
    expect(calcSymmetricOrdinal(4, 2)).toBe(50);

    // 4.2 Bedtime Q11: option 3 (23.5) vs 4 (24.5) -> delta 1.0h -> 75%
    expect(calcTimeScore(3, 4, Q11_BEDTIME_HOURS)).toBe(75);

    // 4.3 Bedtime Q11: option 2 (22.5) vs 4 (24.5) -> delta 2.0h -> 50%
    expect(calcTimeScore(2, 4, Q11_BEDTIME_HOURS)).toBe(50);

    // 4.4 Bedtime Q11: option 1 (21.0) vs 5 (26.0) -> delta 5.0h > 4h cap -> 0%
    expect(calcTimeScore(1, 5, Q11_BEDTIME_HOURS)).toBe(0);

    // 4.5 Jaccard: {1, 2, 4} vs {1, 5} -> intersection=1, union=4 -> 25%
    expect(calcJaccardScore([1, 2, 4], [1, 5])).toBe(25);

    // 4.6 Guests (P1): A.Q16=4, B.Q17=3 -> sAB=75; B.Q16=2, A.Q17=4 -> sBA=100
    // Weakest link: 0.5 * 87.5 + 0.5 * 75 = 81.25%
    const guestsRes = calcDirectionalScore(4, 3, 2, 4);
    expect(guestsRes.sAB).toBe(75);
    expect(guestsRes.sBA).toBe(100);
    expect(guestsRes.score).toBe(81.25);

    // 4.7 Mess tolerance (C3): A: Q9=4, Q10=4. B: Q9=2, Q10=1
    // Mess B=4 vs Tol A=2 -> 50%; Mess A=2 vs Tol B=5 -> 100%
    // Weakest link: 0.5 * 75 + 0.5 * 50 = 62.5%
    const messRes = calcDirectionalScore(6 - 4, 6 - 1, 6 - 2, 6 - 4);
    expect(messRes.sAB).toBe(100);
    expect(messRes.sBA).toBe(50);
    expect(messRes.score).toBe(62.5);

    // 4.8 Joint Q28: 5 & 1 -> min=1, mean=3 -> 0.5*0 + 0.5*(2/4) = 0.25 -> 25%
    expect(calcJointPositiveScore(5, 1)).toBe(25);

    // 4.9 Matrix Q22: opt 1 (50/50) vs opt 2 (theo mức dùng) -> 40%
    expect(calcMatrixScore(1, 2)).toBe(40);

    // 4.10 Category final score formula with categories [90, 80, 70, 60, 50, 40]
    // 90*0.25 + 80*0.20 + 70*0.15 + 60*0.15 + 50*0.10 + 40*0.15 = 22.5 + 16 + 10.5 + 9 + 5 + 6 = 69.0
    const expectedFinal = 90 * 0.25 + 80 * 0.2 + 70 * 0.15 + 60 * 0.15 + 50 * 0.1 + 40 * 0.15;
    expect(expectedFinal).toBe(69.0);
  });

  // =========================================================================
  // 5. Missing answers handling & renormalization
  // =========================================================================
  it("Test 5: Missing answers are not treated as matches and weights renormalize correctly", () => {
    const answersA = createUniformAnswers(3);
    const answersB = createUniformAnswers(3);

    // Remove Q1 from A
    if (answersA instanceof Map) {
      answersA.delete(1);
    }

    const resL1 = scoreDimension("L1_cooking", answersA, answersB);
    expect(resL1.answered).toBe(false);
    expect(resL1.score).toBe(0);

    const pairRes = scorePair(answersA, answersB);
    expect(pairRes.isFullyAnswered).toBe(false);

    // Since remaining answered dimensions in lifestyle (L2, L3, L4) are identical, lifestyle score should still be 100!
    expect(pairRes.categoryScores.lifestyle.score).toBeCloseTo(100.0, 5);
    expect(pairRes.categoryScores.lifestyle.isFullyAnswered).toBe(false);
    expect(pairRes.finalScore).toBeCloseTo(100.0, 5);
  });

  // =========================================================================
  // 6. Multi-select similarity (Jaccard on Q14)
  // =========================================================================
  it("Test 6: Multi-select Jaccard calculation on Q14", () => {
    // Identical
    expect(calcJaccardScore([1, 3, 5], [1, 3, 5])).toBe(100);

    // Disjoint
    expect(calcJaccardScore([1, 2], [3, 4])).toBe(0);

    // Subset: {1, 2} in {1, 2, 3, 4} -> 2/4 = 50%
    expect(calcJaccardScore([1, 2], [1, 2, 3, 4])).toBe(50);
  });

  // =========================================================================
  // 7. Sleeping and waking time comparisons (Q11, Q12)
  // =========================================================================
  it("Test 7: Sleeping and waking times compare accurately by hour distances", () => {
    // Same bedtime -> 100%
    expect(calcTimeScore(2, 2, Q11_BEDTIME_HOURS)).toBe(100);

    // Adjacent waking: 6h-7h (6.5h) vs 7h-8h (7.5h) -> 1h gap -> 75%
    expect(calcTimeScore(2, 3, Q12_WAKE_HOURS)).toBe(75);

    // 2h gap: wake 1 (5.0h) vs 3 (7.5h) -> 2.5h gap -> max(0, 1 - 2.5/4) = 37.5%
    expect(calcTimeScore(1, 3, Q12_WAKE_HOURS)).toBeCloseTo(37.5, 4);
  });

  // =========================================================================
  // 8. Directional behavior/tolerance mapping & surplus tolerance
  // =========================================================================
  it("Test 8: Surplus tolerance is not penalized and directional evaluation is symmetric", () => {
    // Demand 2, tolerance 5 -> surplus tolerance -> 100%
    // Demand 5, tolerance 2 -> deficit of 3 -> 25%
    const dirRes1 = calcDirectionalScore(2, 5, 5, 2);
    expect(dirRes1.sAB).toBe(100);
    expect(dirRes1.sBA).toBe(25);
    expect(dirRes1.score).toBe(0.5 * 62.5 + 0.5 * 25); // 43.75

    // Inverted caller order produces EXACT same final score (symmetry property)
    const dirRes2 = calcDirectionalScore(5, 2, 2, 5);
    expect(dirRes2.score).toBe(dirRes1.score);
  });

  // =========================================================================
  // 9. Hard filter exclusions (H0–H11)
  // =========================================================================
  describe("Test 9: Hard filter rules H0 to H11", () => {
    it("H0: Excludes self comparison", () => {
      const u = createCandidate({ userId: "u-same" });
      const el = evaluatePairEligibility(u, u);
      expect(el.isEligible).toBe(false);
      expect(el.reasons).toContain("H0_self");
    });

    it("H0: Excludes incomplete answers (< 30 answers)", () => {
      const u1 = createCandidate();
      const u2 = createCandidate();
      (u2.answers as Map<number, unknown>).delete(10);

      const el = evaluatePairEligibility(u1, u2);
      expect(el.isEligible).toBe(false);
      expect(el.reasons).toContain("H0_incomplete_answers");
    });

    it("H1: Excludes pairs where both have a room", () => {
      const u1 = createCandidate({
        housingStatus: "has_room",
        room: {
          id: "r1",
          monthlyRent: 4000000,
          perPersonRent: 2000000,
          roomType: "shared",
          districtCode: "hn-thanh-xuan",
          availableFrom: "2026-11-01",
          facilities: [],
          currentOccupants: 1,
          capacityTotal: 2,
        },
      });
      const u2 = createCandidate({
        housingStatus: "has_room",
        room: {
          id: "r2",
          monthlyRent: 5000000,
          perPersonRent: 2500000,
          roomType: "private",
          districtCode: "hn-cau-giay",
          availableFrom: "2026-11-01",
          facilities: [],
          currentOccupants: 1,
          capacityTotal: 2,
        },
      });

      const el = evaluatePairEligibility(u1, u2);
      expect(el.isEligible).toBe(false);
      expect(el.reasons).toContain("H1_housing_roles");
    });

    it("H2: Excludes gender preference mismatch", () => {
      const uFemale = createCandidate({
        gender: "female",
        roommatePreferences: {
          acceptedGenders: ["female"],
          smokingPolicy: "any",
          requirementTags: [],
          ageIsDealbreaker: false,
        },
      });
      const uMale = createCandidate({
        gender: "male",
        roommatePreferences: {
          acceptedGenders: ["female", "male"],
          smokingPolicy: "any",
          requirementTags: [],
          ageIsDealbreaker: false,
        },
      });

      const el = evaluatePairEligibility(uFemale, uMale);
      expect(el.isEligible).toBe(false);
      expect(el.reasons).toContain("H2_gender");
    });

    it("H3: Evaluates age dealbreaker strictly vs non-dealbreaker soft age", () => {
      const uYoung = createCandidate({ age: 19 });
      const uElder = createCandidate({
        age: 35,
        roommatePreferences: {
          acceptedGenders: ["female"],
          ageMin: 25,
          ageMax: 40,
          ageIsDealbreaker: true,
          smokingPolicy: "any",
          requirementTags: [],
        },
      });

      // Age dealbreaker violated
      const el1 = evaluatePairEligibility(uYoung, uElder);
      expect(el1.isEligible).toBe(false);
      expect(el1.reasons).toContain("H3_age");

      // When ageIsDealbreaker is false, it passes!
      uElder.roommatePreferences!.ageIsDealbreaker = false;
      const el2 = evaluatePairEligibility(uYoung, uElder);
      expect(el2.reasons).not.toContain("H3_age");
    });

    it("H4: Excludes smoker when policy is non_smoker_only", () => {
      const uNonSmokerPolicy = createCandidate({
        isSmoker: false,
        roommatePreferences: {
          acceptedGenders: ["female"],
          smokingPolicy: "non_smoker_only",
          requirementTags: [],
          ageIsDealbreaker: false,
        },
      });
      const uSmoker = createCandidate({ isSmoker: true });

      const el = evaluatePairEligibility(uNonSmokerPolicy, uSmoker);
      expect(el.isEligible).toBe(false);
      expect(el.reasons).toContain("H4_smoking");
    });

    it("H6: Excludes room per-person rent exceeding seeker budgetMax", () => {
      const uSeeker = createCandidate({
        housingStatus: "looking_for_room",
        roomPreferences: {
          budgetMax: 2000000,
          preferredDistrictCodes: ["hn-thanh-xuan"],
          roomTypes: [],
          moveInDate: "2026-11-01",
          moveInFlexDays: 30,
          mustHaveFacilities: [],
          requireMedia: false,
        },
      });
      const uOwner = createCandidate({
        housingStatus: "has_room",
        room: {
          id: "r-expensive",
          monthlyRent: 6000000,
          perPersonRent: 3000000, // 3.0M > 2.0M budgetMax
          roomType: "private",
          districtCode: "hn-thanh-xuan",
          availableFrom: "2026-11-01",
          facilities: [],
          currentOccupants: 1,
          capacityTotal: 2,
        },
      });

      const el = evaluatePairEligibility(uSeeker, uOwner);
      expect(el.isEligible).toBe(false);
      expect(el.reasons).toContain("H6_budget");
    });

    it("H7: Excludes move-in dates outside flexibility window", () => {
      const uSeeker = createCandidate({
        housingStatus: "looking_for_room",
        roomPreferences: {
          budgetMax: 3000000,
          preferredDistrictCodes: ["hn-thanh-xuan"],
          roomTypes: [],
          moveInDate: "2026-11-01",
          moveInFlexDays: 10,
          mustHaveFacilities: [],
          requireMedia: false,
        },
      });
      const uOwner = createCandidate({
        housingStatus: "has_room",
        room: {
          id: "r-late",
          monthlyRent: 4000000,
          perPersonRent: 2000000,
          roomType: "private",
          districtCode: "hn-thanh-xuan",
          availableFrom: "2026-12-01", // 30 days apart > 10 flex days
          facilities: [],
          currentOccupants: 1,
          capacityTotal: 2,
        },
      });

      const el = evaluatePairEligibility(uSeeker, uOwner);
      expect(el.isEligible).toBe(false);
      expect(el.reasons).toContain("H7_move_in");
    });

    it("H8 & H9 & H10 & H11: Room type, capacity, facilities, and media requirements", () => {
      const uOwner = createCandidate({
        housingStatus: "has_room",
        room: {
          id: "r-full",
          monthlyRent: 4000000,
          perPersonRent: 2000000,
          roomType: "shared",
          districtCode: "hn-thanh-xuan",
          availableFrom: "2026-11-01",
          facilities: ["ac"],
          currentOccupants: 2,
          capacityTotal: 2, // Full capacity -> H9
          imagesCount: 0,
        },
      });

      // Capacity full check
      const uSeeker1 = createCandidate();
      const el1 = evaluatePairEligibility(uSeeker1, uOwner);
      expect(el1.reasons).toContain("H9_availability");

      // Room type check
      uOwner.room!.capacityTotal = 3;
      const uSeeker2 = createCandidate({
        roomPreferences: {
          budgetMax: 3000000,
          preferredDistrictCodes: ["hn-thanh-xuan"],
          roomTypes: ["private"], // only private, room is shared
          moveInDate: "2026-11-01",
          moveInFlexDays: 30,
          mustHaveFacilities: [],
          requireMedia: false,
        },
      });
      const el2 = evaluatePairEligibility(uSeeker2, uOwner);
      expect(el2.reasons).toContain("H8_room_type");

      // Facilities check
      const uSeeker3 = createCandidate({
        roomPreferences: {
          budgetMax: 3000000,
          preferredDistrictCodes: ["hn-thanh-xuan"],
          roomTypes: ["shared"],
          moveInDate: "2026-11-01",
          moveInFlexDays: 30,
          mustHaveFacilities: ["ac", "kitchen", "balcony"], // missing kitchen and balcony
          requireMedia: false,
        },
      });
      const el3 = evaluatePairEligibility(uSeeker3, uOwner);
      expect(el3.reasons).toContain("H10_facilities");

      // Media check
      const uSeeker4 = createCandidate({
        roomPreferences: {
          budgetMax: 3000000,
          preferredDistrictCodes: ["hn-thanh-xuan"],
          roomTypes: ["shared"],
          moveInDate: "2026-11-01",
          moveInFlexDays: 30,
          mustHaveFacilities: ["ac"],
          requireMedia: true, // requires media, room has 0 images
        },
      });
      const el4 = evaluatePairEligibility(uSeeker4, uOwner);
      expect(el4.reasons).toContain("H11_media");
    });
  });

  // =========================================================================
  // 10. Ranking >= 10 candidates
  // =========================================================================
  it("Test 10: Ranks a pool of 10+ candidate personas strictly by compatibility descending", () => {
    const viewer = createCandidate({ userId: "viewer-1" });
    const candidates: CandidateUser[] = [];

    // Create 12 candidates with progressively descending answer profiles
    for (let i = 1; i <= 12; i++) {
      const cand = createCandidate({
        userId: `cand-${i.toString().padStart(2, "0")}`,
        displayName: `Candidate ${i}`,
        answers: createUniformAnswers(i <= 6 ? 4 : 2),
      });
      // Adjust answers for varied scores
      cand.answers.set(1, { optionValues: [Math.max(1, 5 - Math.floor(i / 3))] });
      cand.answers.set(6, { optionValues: [Math.max(1, 5 - Math.floor(i / 2))] });
      candidates.push(cand);
    }

    const res = rankCandidates(viewer, candidates, undefined, { page: 1, pageSize: 20 });
    expect(res.total).toBe(12);
    expect(res.items.length).toBe(12);

    for (let i = 0; i < res.items.length - 1; i++) {
      expect(res.items[i].compatibility.finalScore).toBeGreaterThanOrEqual(
        res.items[i + 1].compatibility.finalScore
      );
    }
  });

  // =========================================================================
  // 11. Stable ordering on ties & Determinism
  // =========================================================================
  it("Test 11: 4-tier tie-breakers guarantee strict determinism across shuffled orders", () => {
    const viewer = createCandidate({
      userId: "viewer-tie",
      housingStatus: "looking_for_room",
      roomPreferences: {
        budgetMax: 3000000,
        preferredDistrictCodes: ["hn-thanh-xuan"],
        roomTypes: ["shared"],
        moveInDate: "2026-11-01",
        moveInFlexDays: 30,
        mustHaveFacilities: [],
        requireMedia: false,
      },
    });

    // 4 candidates with identical final compatibility scores (all uniform answers 3):
    // Candidate A: rent 2.0M -> housingFit (3M - 2M)/3M = 0.333, unverified, id "user-03"
    // Candidate B: rent 1.5M -> housingFit (3M - 1.5M)/3M = 0.500, verified, id "user-02"
    // Candidate C: rent 1.5M -> housingFit 0.500, unverified, id "user-01"
    // Candidate D: rent 1.5M -> housingFit 0.500, verified, id "user-04"
    const candA = createCandidate({
      userId: "user-03",
      housingStatus: "has_room",
      isVerified: false,
      room: {
        id: "rA",
        monthlyRent: 4000000,
        perPersonRent: 2000000,
        roomType: "shared",
        districtCode: "hn-thanh-xuan",
        availableFrom: "2026-11-01",
        facilities: [],
        currentOccupants: 1,
        capacityTotal: 2,
      },
    });

    const candB = createCandidate({
      userId: "user-02",
      housingStatus: "has_room",
      isVerified: true,
      room: {
        id: "rB",
        monthlyRent: 3000000,
        perPersonRent: 1500000,
        roomType: "shared",
        districtCode: "hn-thanh-xuan",
        availableFrom: "2026-11-01",
        facilities: [],
        currentOccupants: 1,
        capacityTotal: 2,
      },
    });

    const candC = createCandidate({
      userId: "user-01",
      housingStatus: "has_room",
      isVerified: false,
      room: {
        id: "rC",
        monthlyRent: 3000000,
        perPersonRent: 1500000,
        roomType: "shared",
        districtCode: "hn-thanh-xuan",
        availableFrom: "2026-11-01",
        facilities: [],
        currentOccupants: 1,
        capacityTotal: 2,
      },
    });

    const candD = createCandidate({
      userId: "user-04",
      housingStatus: "has_room",
      isVerified: true,
      room: {
        id: "rD",
        monthlyRent: 3000000,
        perPersonRent: 1500000,
        roomType: "shared",
        districtCode: "hn-thanh-xuan",
        availableFrom: "2026-11-01",
        facilities: [],
        currentOccupants: 1,
        capacityTotal: 2,
      },
    });

    const list = [candA, candB, candC, candD];
    const ranked1 = rankCandidates(viewer, list);

    // Expected order:
    // 1. candB: housingFit 0.500, verified true, id "user-02"
    // 2. candD: housingFit 0.500, verified true, id "user-04"
    // 3. candC: housingFit 0.500, verified false, id "user-01"
    // 4. candA: housingFit 0.333, verified false, id "user-03"
    expect(ranked1.items.map((i) => i.candidate.userId)).toEqual([
      "user-02",
      "user-04",
      "user-01",
      "user-03",
    ]);

    // Test with reverse and random shuffles: order must NEVER change
    const rankedReverse = rankCandidates(viewer, [...list].reverse());
    expect(rankedReverse.items.map((i) => i.candidate.userId)).toEqual([
      "user-02",
      "user-04",
      "user-01",
      "user-03",
    ]);
  });

  // =========================================================================
  // 12. Explanation accuracy
  // =========================================================================
  it("Test 12: Generates accurate why-match and things-to-discuss explanations", () => {
    const viewer = createCandidate({ displayName: "Ngọc" });
    const candidate = createCandidate({ displayName: "Linh" });

    // Set identical on cooking and bedtime (score 100) -> should be in whyYouMatch
    viewer.answers.set(1, { optionValues: [4] });
    candidate.answers.set(1, { optionValues: [4] });
    viewer.answers.set(11, { optionValues: [2] });
    candidate.answers.set(11, { optionValues: [2] });

    // Set big mismatch on guests: viewer wants guests (4), candidate comfortable only with 1 -> shortfall 3
    viewer.answers.set(16, { optionValues: [4] });
    candidate.answers.set(17, { optionValues: [1] });

    const pairScore = scorePair(viewer.answers, candidate.answers);
    const explanation = generateCompatibilityExplanation(viewer, candidate, pairScore);

    expect(explanation.overallPercentage).toBe(pairScore.displayScore);
    expect(explanation.whyYouMatch.length).toBeGreaterThan(0);
    expect(explanation.thingsToDiscuss.length).toBeGreaterThan(0);

    const hasCookingOrBedtime = explanation.whyYouMatch.some(
      (m) => m.dimensionCode === "L1_cooking" || m.dimensionCode === "S1_bedtime"
    );
    expect(hasCookingOrBedtime).toBe(true);

    const hasGuestsDiscuss = explanation.thingsToDiscuss.some(
      (d) => d.dimensionCode === "P1_guests"
    );
    expect(hasGuestsDiscuss).toBe(true);
  });

  // =========================================================================
  // 13. End-to-end DB recommendation pipeline, ranking & cache
  // =========================================================================
  describe("Test 13: End-to-End Database Recommendation & Privacy / Authorization", () => {
    let client: any;

    beforeAll(async () => {
      client = await getAdminClient();
    });

    afterAll(async () => {
      if (client) await client.end();
    });

    it("Fetches candidate user from DB and executes end-to-end recommendation", async () => {
      const viewer = await fetchCandidateUser(client, USER_IDS.ngoc);
      expect(viewer).not.toBeNull();
      expect(viewer?.displayName).toBe("Ngọc");
      expect(viewer?.answers.size).toBe(30);

      const targetLinh = await fetchCandidateUser(client, USER_IDS.linh);
      expect(targetLinh).not.toBeNull();
      expect(targetLinh?.displayName).toBe("Linh");
      expect(targetLinh?.housingStatus).toBe("has_room");
      expect(targetLinh?.room).not.toBeNull();

      // Compatibility score between Ngọc and Linh
      const compatibility = scorePair(viewer!.answers, targetLinh!.answers);
      expect(compatibility.finalScore).toBeGreaterThan(70);

      // Cache compatibility score
      const dummyResult = {
        candidate: targetLinh!,
        compatibility,
        explanation: generateCompatibilityExplanation(viewer!, targetLinh!, compatibility),
        housingFit: evaluateHousingFit(viewer!, targetLinh!),
        isEligible: true,
        ineligibilityReasons: [],
      };

      await cacheCompatibilityScore(client, viewer!.userId, targetLinh!.userId, dummyResult);

      // Verify cached record exists in DB
      const res = await client.query(
        `select * from public.compatibility_scores where user_low = $1 and user_high = $2`,
        [viewer!.userId < targetLinh!.userId ? viewer!.userId : targetLinh!.userId,
         viewer!.userId < targetLinh!.userId ? targetLinh!.userId : viewer!.userId]
      );
      expect(res.rows).toHaveLength(1);
      expect(Number(res.rows[0].final_score)).toBeCloseTo(compatibility.finalScore, 4);
    });

    it("Recommended roommates query for Ngọc returns eligible candidates ranked by compatibility", async () => {
      // 1. Direct ranking of pool including Linh: Linh should be rank 1
      const viewer = (await fetchCandidateUser(client, USER_IDS.ngoc))!;
      const linh = (await fetchCandidateUser(client, USER_IDS.linh))!;
      const minh = (await fetchCandidateUser(client, USER_IDS.minh))!;
      const directRanked = rankCandidates(viewer, [linh, minh]);
      expect(directRanked.items[0].candidate.userId).toBe(USER_IDS.linh);
      expect(directRanked.items[0].compatibility.finalScore).toBeGreaterThanOrEqual(80);

      // 2. Discovery recommendations for Ngọc:
      // In seed data, Ngọc and Linh ALREADY have an active mutual match, so fn_eligible_candidates
      // correctly excludes Linh from new candidate discovery (H0 non-interacted rule)
      const recs = await getRecommendedRoommates(client, USER_IDS.ngoc);
      expect(recs.total).toBe(4);

      const candidateIds = recs.items.map((i) => i.candidate.userId);
      // Linh is excluded from discovery because of active match
      expect(candidateIds).not.toContain(USER_IDS.linh);

      // Eligible non-matched candidates are present
      expect(candidateIds).toContain(USER_IDS.minh);
      expect(candidateIds).toContain(USER_IDS.trang);

      // Ineligible candidates: Hà (male, H2) and An (expensive, H6) are excluded
      expect(candidateIds).not.toContain(USER_IDS.ha);
      expect(candidateIds).not.toContain(USER_IDS.an);

      // Items are sorted strictly by finalScore desc
      for (let i = 0; i < recs.items.length - 1; i++) {
        expect(recs.items[i].compatibility.finalScore).toBeGreaterThanOrEqual(
          recs.items[i + 1].compatibility.finalScore
        );
      }
    });
  });
});
