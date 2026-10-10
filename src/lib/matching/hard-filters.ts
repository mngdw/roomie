/**
 * ROOMIE · Hard-Filter Rules & Eligibility Engine (Step 1)
 * Evaluates candidates against strict non-negotiable filters H0 to H11.
 * Excluded candidates are never ranked and never scored.
 */
import type { CandidateUser } from "./types";
import { countAnsweredQuestions } from "./scoring";

/**
 * Calculates absolute calendar day difference between two date strings or Date objects.
 */
export function diffInDays(dateStrA: string | Date, dateStrB: string | Date): number {
  const dA = dateStrA instanceof Date ? dateStrA : new Date(dateStrA);
  const dB = dateStrB instanceof Date ? dateStrB : new Date(dateStrB);
  const utcA = Date.UTC(dA.getUTCFullYear(), dA.getUTCMonth(), dA.getUTCDate());
  const utcB = Date.UTC(dB.getUTCFullYear(), dB.getUTCMonth(), dB.getUTCDate());
  const diffMs = Math.abs(utcA - utcB);
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export interface EligibilityResult {
  isEligible: boolean;
  reasons: string[];
}

/**
 * Pure evaluator for pair eligibility (H0–H11) matching PostgreSQL fn_pair_ineligibility_reasons.
 */
export function evaluatePairEligibility(
  userA: CandidateUser,
  userB: CandidateUser
): EligibilityResult {
  const reasons: string[] = [];

  // H0 · Not self
  if (!userA || !userB || userA.userId === userB.userId) {
    return { isEligible: false, reasons: ["H0_self"] };
  }

  // H0 · Incomplete questionnaire (must have answered 30 questions)
  const answersCountA = countAnsweredQuestions(userA.answers);
  const answersCountB = countAnsweredQuestions(userB.answers);
  if (answersCountA < 30 || answersCountB < 30) {
    reasons.push("H0_incomplete_answers");
  }

  // H1 · Housing roles: has_room <-> has_room is excluded
  if (userA.housingStatus === "has_room" && userB.housingStatus === "has_room") {
    reasons.push("H1_housing_roles");
  }

  // H2 · Gender preference (both directions must be accepted)
  const allGenders: Array<"male" | "female" | "other"> = ["male", "female", "other"];
  const acceptedByA = userA.roommatePreferences?.acceptedGenders ?? allGenders;
  const acceptedByB = userB.roommatePreferences?.acceptedGenders ?? allGenders;

  if (!acceptedByA.includes(userB.gender) || !acceptedByB.includes(userA.gender)) {
    reasons.push("H2_gender");
  }

  // H3 · Age (evaluated only when marked as dealbreaker by either side)
  if (userA.roommatePreferences?.ageIsDealbreaker) {
    const min = userA.roommatePreferences.ageMin;
    const max = userA.roommatePreferences.ageMax;
    if ((min != null && userB.age < min) || (max != null && userB.age > max)) {
      reasons.push("H3_age");
    }
  }
  if (userB.roommatePreferences?.ageIsDealbreaker) {
    const min = userB.roommatePreferences.ageMin;
    const max = userB.roommatePreferences.ageMax;
    if ((min != null && userA.age < min) || (max != null && userA.age > max)) {
      if (!reasons.includes("H3_age")) {
        reasons.push("H3_age");
      }
    }
  }

  // H4 · Smoking policy
  const policyA = userA.roommatePreferences?.smokingPolicy ?? "any";
  const policyB = userB.roommatePreferences?.smokingPolicy ?? "any";
  if (
    (policyA === "non_smoker_only" && userB.isSmoker) ||
    (policyB === "non_smoker_only" && userA.isSmoker)
  ) {
    reasons.push("H4_smoking");
  }

  // Housing checks (H5–H11)
  if (userA.housingStatus === "has_room" && userB.housingStatus === "looking_for_room") {
    checkRoomSeekerPair(userA, userB, reasons);
  } else if (userA.housingStatus === "looking_for_room" && userB.housingStatus === "has_room") {
    checkRoomSeekerPair(userB, userA, reasons);
  } else if (
    userA.housingStatus === "looking_for_room" &&
    userB.housingStatus === "looking_for_room"
  ) {
    checkCoSearchPair(userA, userB, reasons);
  }

  return {
    isEligible: reasons.length === 0,
    reasons,
  };
}

/**
 * Evaluates room owner vs room seeker rules (H5–H11).
 */
function checkRoomSeekerPair(
  owner: CandidateUser,
  seeker: CandidateUser,
  reasons: string[]
): void {
  const room = owner.room;
  const rp = seeker.roomPreferences;

  if (!room) {
    reasons.push("H9_availability");
    return;
  }
  if (!rp) {
    reasons.push("H0_incomplete_profile");
    return;
  }

  // H9 · Availability: room must have space
  if (room.currentOccupants >= room.capacityTotal) {
    reasons.push("H9_availability");
  }

  // H5 · Location
  if (rp.preferredDistrictCodes && rp.preferredDistrictCodes.length > 0) {
    if (!rp.preferredDistrictCodes.includes(room.districtCode)) {
      reasons.push("H5_location");
    }
  } else if (room.cityCode && seeker.cityCode && room.cityCode !== seeker.cityCode) {
    reasons.push("H5_location");
  }

  // H6 · Budget: per-person cost <= seeker.budgetMax
  const perPersonCost =
    room.perPersonRent > 0
      ? room.perPersonRent
      : room.monthlyRent / (room.currentOccupants + 1);
  if (perPersonCost > rp.budgetMax) {
    reasons.push("H6_budget");
  }

  // H7 · Move-in window
  if (room.availableFrom && rp.moveInDate) {
    const daysApart = diffInDays(room.availableFrom, rp.moveInDate);
    const flexDays = rp.moveInFlexDays ?? 30;
    if (daysApart > flexDays) {
      reasons.push("H7_move_in");
    }
  }

  // H8 · Room type
  if (rp.roomTypes && rp.roomTypes.length > 0) {
    if (!rp.roomTypes.includes(room.roomType)) {
      reasons.push("H8_room_type");
    }
  }

  // H10 · Must-have facilities (must be subset of room.facilities)
  if (rp.mustHaveFacilities && rp.mustHaveFacilities.length > 0) {
    const roomFacs = new Set(room.facilities ?? []);
    const hasAll = rp.mustHaveFacilities.every((f) => roomFacs.has(f));
    if (!hasAll) {
      reasons.push("H10_facilities");
    }
  }

  // H11 · Media required
  if (rp.requireMedia) {
    const count = room.imagesCount ?? 0;
    if (count <= 0) {
      reasons.push("H11_media");
    }
  }
}

/**
 * Evaluates co-search pair rules (both looking_for_room).
 */
function checkCoSearchPair(
  userA: CandidateUser,
  userB: CandidateUser,
  reasons: string[]
): void {
  const rpA = userA.roomPreferences;
  const rpB = userB.roomPreferences;

  if (!rpA || !rpB) {
    reasons.push("H0_incomplete_profile");
    return;
  }

  // H5 · Location: preferred districts must intersect (or same city if empty)
  const distA = rpA.preferredDistrictCodes ?? [];
  const distB = rpB.preferredDistrictCodes ?? [];

  if (distA.length > 0 && distB.length > 0) {
    const hasOverlap = distA.some((code) => distB.includes(code));
    if (!hasOverlap) {
      reasons.push("H5_location");
    }
  } else if (distA.length === 0 && distB.length === 0) {
    if (userA.cityCode && userB.cityCode && userA.cityCode !== userB.cityCode) {
      reasons.push("H5_location");
    }
  }

  // H6 · Budget: budget bands must overlap
  const minA = rpA.budgetMin ?? 0;
  const minB = rpB.budgetMin ?? 0;
  if (Math.max(minA, minB) > Math.min(rpA.budgetMax, rpB.budgetMax)) {
    reasons.push("H6_budget");
  }

  // H7 · Move-in: flexibility windows must overlap
  if (rpA.moveInDate && rpB.moveInDate) {
    const daysApart = diffInDays(rpA.moveInDate, rpB.moveInDate);
    const flexSum = (rpA.moveInFlexDays ?? 30) + (rpB.moveInFlexDays ?? 30);
    if (daysApart > flexSum) {
      reasons.push("H7_move_in");
    }
  }
}

/**
 * Evaluates housing fit (0.0 to 1.0) used as the second tie-breaker in ranking.
 * For a seeker facing a room: (budget_max - per_person_cost) / budget_max, clamped to 0..1.
 * Otherwise 0.5.
 */
export function evaluateHousingFit(viewer: CandidateUser, candidate: CandidateUser): number {
  if (viewer.housingStatus === "looking_for_room" && candidate.housingStatus === "has_room") {
    const budgetMax = viewer.roomPreferences?.budgetMax;
    const room = candidate.room;
    if (budgetMax && budgetMax > 0 && room) {
      const perPersonRent =
        room.perPersonRent > 0
          ? room.perPersonRent
          : room.monthlyRent / (room.currentOccupants + 1);
      const fit = (budgetMax - perPersonRent) / budgetMax;
      return Math.max(0, Math.min(1, fit));
    }
  } else if (viewer.housingStatus === "has_room" && candidate.housingStatus === "looking_for_room") {
    const budgetMax = candidate.roomPreferences?.budgetMax;
    const room = viewer.room;
    if (budgetMax && budgetMax > 0 && room) {
      const perPersonRent =
        room.perPersonRent > 0
          ? room.perPersonRent
          : room.monthlyRent / (room.currentOccupants + 1);
      const fit = (budgetMax - perPersonRent) / budgetMax;
      return Math.max(0, Math.min(1, fit));
    }
  }
  return 0.5;
}
