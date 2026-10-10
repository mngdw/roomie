"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId, setCurrentUserId } from "@/lib/server/session";
import { withSessionDb, withAdminDb } from "@/lib/server/db";
import { QUESTIONNAIRE_QUESTIONS } from "@/lib/questionnaire/catalog.generated";

export interface LikeResponse {
  success: boolean;
  matched: boolean;
  matchId?: string;
  conversationId?: string;
  error?: string;
}

export interface PassResponse {
  success: boolean;
  passed: boolean;
  error?: string;
}

/**
 * Server action to like a target user.
 * Triggers mutual match if the other user has already liked this user.
 */
export async function likeUserAction(targetUserId: string): Promise<LikeResponse> {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    return { success: false, matched: false, error: "Chưa đăng nhập" };
  }

  try {
    const result = await withSessionDb(currentUserId, async (client) => {
      const res = await client.query(
        "select public.rpc_like_user($1) as data",
        [targetUserId]
      );
      return res.rows[0]?.data;
    });

    revalidatePath("/discovery");
    revalidatePath("/matches");
    revalidatePath(`/profile/${targetUserId}`);
    revalidatePath(`/compatibility/${targetUserId}`);

    return {
      success: true,
      matched: !!result?.matched,
      matchId: result?.match_id,
      conversationId: result?.conversation_id,
    };
  } catch (err) {
    console.error("likeUserAction error:", err);
    return {
      success: false,
      matched: false,
      error: (err as Error).message,
    };
  }
}

/**
 * Server action to pass on a candidate user.
 */
export async function passUserAction(targetUserId: string): Promise<PassResponse> {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    return { success: false, passed: false, error: "Chưa đăng nhập" };
  }

  try {
    const result = await withSessionDb(currentUserId, async (client) => {
      const res = await client.query(
        "select public.rpc_pass_user($1) as data",
        [targetUserId]
      );
      return res.rows[0]?.data;
    });

    revalidatePath("/discovery");
    return {
      success: true,
      passed: !!result?.passed,
    };
  } catch (err) {
    console.error("passUserAction error:", err);
    return {
      success: false,
      passed: false,
      error: (err as Error).message,
    };
  }
}

/**
 * Switch the currently active demo persona.
 */
export async function switchUserAction(userId: string): Promise<void> {
  await setCurrentUserId(userId);
  revalidatePath("/", "layout");
}

export interface OnboardingPayload {
  // Step 1: Personal info
  displayName: string;
  fullName: string;
  gender: "male" | "female" | "other";
  dateOfBirth: string; // YYYY-MM-DD
  occupation: string;
  schoolOrWorkplace: string;
  cityCode: string;
  districtCode: string;
  bio: string;
  isSmoker: boolean;
  mbti?: string;

  // Step 2: Roommate preferences
  acceptedGenders: Array<"male" | "female" | "other">;
  ageMin: number;
  ageMax: number;
  ageIsDealbreaker: boolean;
  smokingPolicy: "non_smoker_only" | "outside_only" | "any";
  requirementTags: string[];

  // Step 3: Housing status
  housingStatus: "has_room" | "looking_for_room";

  // Step 4A: Room details (if has_room)
  room?: {
    districtCode: string;
    addressStreet: string;
    monthlyRent: number;
    roomType: "private" | "shared";
    capacityTotal: number;
    currentOccupants: number;
    availableFrom: string;
    facilities: string[];
    description: string;
  };

  // Step 4B: Room preferences (if looking_for_room)
  roomPreferences?: {
    preferredDistrictCodes: string[];
    budgetMin: number | null;
    budgetMax: number;
    roomTypes: Array<"private" | "shared">;
    moveInDate: string;
    moveInFlexDays: number;
    mustHaveFacilities: string[];
    requireMedia: boolean;
  };

  // Step 5: 30 questionnaire answers
  answers: Array<{
    questionNumber: number;
    optionValues: number[];
    otherText?: string | null;
  }>;
}

/**
 * Save complete onboarding data for the current user.
 */
export async function saveOnboardingAction(
  data: OnboardingPayload
): Promise<{ success: boolean; error?: string }> {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    return { success: false, error: "Chưa đăng nhập" };
  }

  try {
    await withSessionDb(currentUserId, async (client) => {
      // 1. Upsert Profile
      await client.query(
        `
        update public.profiles
        set display_name = $1,
            full_name = $2,
            gender = $3,
            date_of_birth = $4,
            occupation = $5,
            school_or_workplace = $6,
            city_code = $7,
            district_code = $8,
            bio = $9,
            is_smoker = $10,
            housing_status = $11,
            completed_at = now()
        where user_id = $12
      `,
        [
          data.displayName,
          data.fullName,
          data.gender,
          data.dateOfBirth,
          data.occupation,
          data.schoolOrWorkplace,
          data.cityCode || "hn",
          data.districtCode,
          data.bio,
          data.isSmoker,
          data.housingStatus,
          currentUserId,
        ]
      );

      // 2. Upsert Roommate Preferences
      await client.query(
        `
        insert into public.roommate_preferences (
          user_id, accepted_genders, age_min, age_max, age_is_dealbreaker, smoking_policy, requirement_tags
        ) values ($1, $2, $3, $4, $5, $6, $7)
        on conflict (user_id) do update set
          accepted_genders = excluded.accepted_genders,
          age_min = excluded.age_min,
          age_max = excluded.age_max,
          age_is_dealbreaker = excluded.age_is_dealbreaker,
          smoking_policy = excluded.smoking_policy,
          requirement_tags = excluded.requirement_tags
      `,
        [
          currentUserId,
          data.acceptedGenders,
          data.ageMin,
          data.ageMax,
          data.ageIsDealbreaker,
          data.smokingPolicy,
          data.requirementTags,
        ]
      );

      // 3. Housing details based on status
      if (data.housingStatus === "has_room" && data.room) {
        await client.query(
          `
          insert into public.rooms (
            owner_id, city_code, district_code, address_street, monthly_rent,
            room_type, capacity_total, current_occupants, available_from,
            facilities, description, is_published
          ) values ($1, 'hn', $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
          on conflict (owner_id) do update set
            district_code = excluded.district_code,
            address_street = excluded.address_street,
            monthly_rent = excluded.monthly_rent,
            room_type = excluded.room_type,
            capacity_total = excluded.capacity_total,
            current_occupants = excluded.current_occupants,
            available_from = excluded.available_from,
            facilities = excluded.facilities,
            description = excluded.description,
            is_published = true
        `,
          [
            currentUserId,
            data.room.districtCode,
            data.room.addressStreet,
            data.room.monthlyRent,
            data.room.roomType,
            data.room.capacityTotal,
            data.room.currentOccupants,
            data.room.availableFrom,
            data.room.facilities,
            data.room.description,
          ]
        );
      } else if (data.housingStatus === "looking_for_room" && data.roomPreferences) {
        await client.query(
          `
          insert into public.room_preferences (
            user_id, preferred_district_codes, budget_min, budget_max,
            room_types, move_in_date, move_in_flex_days, must_have_facilities, require_media
          ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          on conflict (user_id) do update set
            preferred_district_codes = excluded.preferred_district_codes,
            budget_min = excluded.budget_min,
            budget_max = excluded.budget_max,
            room_types = excluded.room_types,
            move_in_date = excluded.move_in_date,
            move_in_flex_days = excluded.move_in_flex_days,
            must_have_facilities = excluded.must_have_facilities,
            require_media = excluded.require_media
        `,
          [
            currentUserId,
            data.roomPreferences.preferredDistrictCodes,
            data.roomPreferences.budgetMin,
            data.roomPreferences.budgetMax,
            data.roomPreferences.roomTypes,
            data.roomPreferences.moveInDate,
            data.roomPreferences.moveInFlexDays,
            data.roomPreferences.mustHaveFacilities,
            data.roomPreferences.requireMedia,
          ]
        );
      }

      // 4. Upsert 30 questionnaire answers
      const numToId = new Map(QUESTIONNAIRE_QUESTIONS.map((q) => [q.number, q.id]));

      for (const ans of data.answers) {
        const questionId = numToId.get(ans.questionNumber);
        if (!questionId) continue;

        await client.query(
          `
          insert into public.user_answers (
            user_id, question_id, option_values, other_text
          ) values ($1, $2, $3, $4)
          on conflict (user_id, question_id) do update set
            option_values = excluded.option_values,
            other_text = excluded.other_text,
            updated_at = now()
        `,
          [currentUserId, questionId, ans.optionValues, ans.otherText || null]
        );
      }
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error("saveOnboardingAction error:", err);
    return { success: false, error: (err as Error).message };
  }
}

export interface UpdateProfilePayload {
  displayName: string;
  fullName: string;
  occupation?: string;
  schoolOrWorkplace?: string;
  districtCode: string;
  bio: string;
  isSmoker: boolean;
  acceptedGenders?: Array<"male" | "female" | "other">;
  ageMin?: number;
  ageMax?: number;
  smokingPolicy?: "non_smoker_only" | "outside_only" | "any";
  requirementTags?: string[];
}

/**
 * Update personal profile and roommate criteria.
 */
export async function updateProfileAction(
  data: UpdateProfilePayload
): Promise<{ success: boolean; error?: string }> {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    return { success: false, error: "Chưa đăng nhập" };
  }

  try {
    await withSessionDb(currentUserId, async (client) => {
      await client.query(
        `
        update public.profiles
        set display_name = $1,
            full_name = $2,
            occupation = $3,
            school_or_workplace = $4,
            district_code = $5,
            bio = $6,
            is_smoker = $7,
            updated_at = now()
        where user_id = $8
      `,
        [
          data.displayName,
          data.fullName,
          data.occupation || null,
          data.schoolOrWorkplace || null,
          data.districtCode,
          data.bio,
          data.isSmoker,
          currentUserId,
        ]
      );

      if (data.acceptedGenders && data.acceptedGenders.length > 0) {
        await client.query(
          `
          insert into public.roommate_preferences (
            user_id, accepted_genders, age_min, age_max, smoking_policy, requirement_tags
          ) values ($1, $2, $3, $4, $5, $6)
          on conflict (user_id) do update set
            accepted_genders = excluded.accepted_genders,
            age_min = excluded.age_min,
            age_max = excluded.age_max,
            smoking_policy = excluded.smoking_policy,
            requirement_tags = excluded.requirement_tags,
            updated_at = now()
        `,
          [
            currentUserId,
            data.acceptedGenders,
            data.ageMin ?? 18,
            data.ageMax ?? 30,
            data.smokingPolicy ?? "any",
            data.requirementTags ?? [],
          ]
        );
      }
    });

    revalidatePath("/profile");
    revalidatePath("/profile/edit");
    revalidatePath("/discovery");
    return { success: true };
  } catch (err) {
    console.error("updateProfileAction error:", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Send a message in a mutual-match conversation.
 */
export async function sendMessageAction(
  conversationId: string,
  body: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    return { success: false, error: "Chưa đăng nhập" };
  }

  const trimmed = body.trim();
  if (!trimmed) {
    return { success: false, error: "Nội dung tin nhắn không được để trống" };
  }

  try {
    const result = await withSessionDb(currentUserId, async (client) => {
      const res = await client.query(
        `
        insert into public.messages (conversation_id, sender_id, body)
        values ($1, $2, $3)
        returning id
      `,
        [conversationId, currentUserId, trimmed]
      );
      return res.rows[0];
    });

    revalidatePath(`/chat/${conversationId}`);
    revalidatePath("/matches");
    return { success: true, messageId: result?.id };
  } catch (err) {
    console.error("sendMessageAction error:", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Submit CCCD / Student verification request.
 */
export async function submitVerificationAction(
  idNumber: string,
  photoUrl?: string
): Promise<{ success: boolean; error?: string }> {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    return { success: false, error: "Chưa đăng nhập" };
  }

  const cleanNum = idNumber.trim();
  if (cleanNum.length < 9) {
    return { success: false, error: "Số CCCD / Thẻ sinh viên không hợp lệ (tối thiểu 9 số)" };
  }

  try {
    await withAdminDb(async (client) => {
      const last4 = cleanNum.slice(-4);
      const crypto = await import("crypto");
      const hmac = crypto.createHash("sha256").update(cleanNum).digest();

      // Check if already verified
      const checkProf = await client.query(
        `select verification_status from public.profiles where user_id = $1`,
        [currentUserId]
      );
      if (checkProf.rows[0]?.verification_status === "verified") {
        return;
      }

      // Clear any pending verification
      await client.query(
        `delete from public.verification_records where user_id = $1 and status = 'pending'`,
        [currentUserId]
      );

      await client.query(
        `
        insert into public.verification_records (
          user_id, status, id_number_last4, id_number_hmac, consent_version, consent_at, submitted_at, reviewed_at
        ) values ($1, 'verified', $2, $3, '1.0', now(), now(), now())
      `,
        [currentUserId, last4, hmac]
      );

      await client.query(
        `update public.profiles set verification_status = 'verified' where user_id = $1`,
        [currentUserId]
      );

      // Create a notification for the user
      await client.query(
        `
        insert into public.notifications (user_id, type, actor_id, payload)
        values ($1, 'verification_update', $1, $2)
      `,
        [
          currentUserId,
          JSON.stringify({
            status: "verified",
            message: "Hồ sơ của bạn đã được xác minh thành công!",
          }),
        ]
      );
    });

    revalidatePath("/profile");
    revalidatePath("/discovery");
    return { success: true };
  } catch (err) {
    console.error("submitVerificationAction error:", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Mark all notifications as read.
 */
export async function markNotificationsReadAction(): Promise<void> {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) return;

  try {
    await withAdminDb(async (client) => {
      await client.query(
        `update public.notifications set read_at = now() where user_id = $1 and read_at is null`,
        [currentUserId]
      );
    });
    revalidatePath("/", "layout");
  } catch (err) {
    console.error("markNotificationsReadAction error:", err);
  }
}

