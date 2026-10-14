"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId, setCurrentUserId, clearSession } from "@/lib/server/session";
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
    images?: string[];
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

function normalizeDistrict(d?: string | null): string {
  if (!d) return "hn-cau-giay";
  const trimmed = d.trim().toLowerCase();
  if (trimmed.startsWith("hn-")) return trimmed;
  return `hn-${trimmed.replace(/_/g, "-")}`;
}

const ALLOWED_REQUIREMENT_TAGS = new Set([
  "pays_on_time",
  "clean_tidy",
  "respects_privacy",
  "no_smoking",
  "share_costs",
]);

const REQUIREMENT_TAG_MAP: Record<string, string> = {
  khong_hut_thuoc: "no_smoking",
  no_smoking: "no_smoking",
  sach_se: "clean_tidy",
  clean_tidy: "clean_tidy",
  dong_tien_dung_han: "pays_on_time",
  pays_on_time: "pays_on_time",
  ton_trong_rieng_tu: "respects_privacy",
  respects_privacy: "respects_privacy",
  chia_se_chi_phi: "share_costs",
  share_costs: "share_costs",
};

function sanitizeRequirementTags(tags?: string[] | null): string[] {
  if (!tags || !Array.isArray(tags)) return ["clean_tidy", "no_smoking"];
  const mapped = tags
    .map((t) => REQUIREMENT_TAG_MAP[t.trim().toLowerCase()] || t.trim().toLowerCase())
    .filter((t) => ALLOWED_REQUIREMENT_TAGS.has(t));
  const res = Array.from(new Set(mapped));
  return res.length > 0 ? res : ["clean_tidy", "no_smoking"];
}

/**
 * Save complete onboarding data for the current user.
 */
export async function saveOnboardingAction(
  data: OnboardingPayload,
  explicitUserId?: string
): Promise<{ success: boolean; error?: string }> {
  const currentUserId = explicitUserId || (await getCurrentUserId());
  if (!currentUserId) {
    return { success: false, error: "Chưa đăng nhập" };
  }

  const normalizedDistrict = normalizeDistrict(data.districtCode);
  const sanitizedTags = sanitizeRequirementTags(data.requirementTags);
  const preferredDistricts = (data.roomPreferences?.preferredDistrictCodes || []).map(normalizeDistrict);
  const roomDistrict = normalizeDistrict(data.room?.districtCode);

  try {
    await withAdminDb(async (client) => {
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
          normalizedDistrict,
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
          sanitizedTags,
        ]
      );

      // 3. Housing details based on status
      if (data.housingStatus === "has_room" && data.room) {
        const roomRes = await client.query(
          `
          insert into public.rooms (
            owner_id, city_code, district_code, address_line, monthly_rent,
            room_type, capacity_total, current_occupants, available_from,
            facilities, notes, is_published
          ) values ($1, 'hn', $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
          on conflict (owner_id) where is_published do update set
            district_code = excluded.district_code,
            address_line = excluded.address_line,
            monthly_rent = excluded.monthly_rent,
            room_type = excluded.room_type,
            capacity_total = excluded.capacity_total,
            current_occupants = excluded.current_occupants,
            available_from = excluded.available_from,
            facilities = excluded.facilities,
            notes = excluded.notes,
            is_published = true
          returning id
        `,
          [
            currentUserId,
            roomDistrict,
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

        const roomId = roomRes.rows[0]?.id;
        if (roomId && data.room.images && Array.isArray(data.room.images) && data.room.images.length > 0) {
          await client.query("delete from public.room_images where room_id = $1", [roomId]);
          const imgs = data.room.images.slice(0, 10);
          for (let i = 0; i < imgs.length; i++) {
            const storagePath = `${currentUserId}/room_${i}_${Date.now()}.jpg`;
            await client.query(
              `insert into public.room_images (room_id, kind, storage_path, position)
               values ($1, 'image', $2, $3)
               on conflict do nothing`,
              [roomId, storagePath, i]
            );
          }
        }
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
            preferredDistricts,
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

    try {
      revalidatePath("/", "layout");
      revalidatePath("/discovery");
      revalidatePath("/profile");
      revalidatePath("/matches");
    } catch {}

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

  const normalizedDistrict = normalizeDistrict(data.districtCode);
  const sanitizedTags = data.requirementTags ? sanitizeRequirementTags(data.requirementTags) : undefined;

  try {
    await withAdminDb(async (client) => {
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
          normalizedDistrict,
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
            sanitizedTags ?? ["clean_tidy", "no_smoking"],
          ]
        );
      }
    });

    try {
      revalidatePath("/profile");
      revalidatePath("/profile/edit");
      revalidatePath("/discovery");
    } catch {}

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
    const result = await withAdminDb(async (client) => {
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

/**
 * Register a new real user account.
 */
export async function signUpAction(data: {
  fullName: string;
  email: string;
  password: string;
}): Promise<{ success: boolean; userId?: string; error?: string }> {
  const cleanName = data.fullName.trim();
  const cleanEmail = data.email.toLowerCase().trim();
  const cleanPass = data.password.trim();

  if (!cleanName || cleanName.length < 2) {
    return { success: false, error: "Họ và tên phải có ít nhất 2 ký tự" };
  }
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { success: false, error: "Địa chỉ email không hợp lệ" };
  }
  if (!cleanPass || cleanPass.length < 6) {
    return { success: false, error: "Mật khẩu phải có ít nhất 6 ký tự" };
  }

  try {
    const userId = await withAdminDb(async (client) => {
      // Check if email already registered
      const exist = await client.query(
        `select id from auth.users where lower(email) = $1`,
        [cleanEmail]
      );
      if (exist.rows.length > 0) {
        throw new Error("Email này đã được đăng ký tài khoản");
      }

      // Create in auth.users
      const authRes = await client.query(
        `
        insert into auth.users (
          instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) values (
          '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
          $1, extensions.crypt($2, extensions.gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
        ) returning id
      `,
        [cleanEmail, cleanPass]
      );

      const newId = authRes.rows[0].id;
      const displayName = cleanName.split(" ").slice(-1)[0] || cleanName;

      // Ensure public.profiles has basic skeleton
      await client.query(
        `
        insert into public.profiles (
          user_id, display_name, full_name, date_of_birth, gender,
          housing_status, verification_status
        ) values (
          $1, $2, $3, '2002-01-01', 'female',
          'looking_for_room', 'unverified'
        ) on conflict (user_id) do update set
          display_name = excluded.display_name,
          full_name = excluded.full_name
      `,
        [newId, displayName, cleanName]
      );

      return newId;
    });

    await setCurrentUserId(userId);
    revalidatePath("/", "layout");
    return { success: true, userId };
  } catch (err) {
    console.error("signUpAction error:", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Sign in with email & password.
 */
export async function signInAction(data: {
  email: string;
  password: string;
}): Promise<{ success: boolean; userId?: string; isCompleted?: boolean; error?: string }> {
  const cleanEmail = data.email.toLowerCase().trim();
  const cleanPass = data.password.trim();

  if (!cleanEmail || !cleanPass) {
    return { success: false, error: "Vui lòng nhập đầy đủ email và mật khẩu" };
  }

  // Check demo shortcuts
  const { DEMO_USERS } = await import("@/lib/constants/demo-users");
  const demoMatch = DEMO_USERS.find(
    (u) =>
      cleanEmail.includes(u.displayName.toLowerCase()) ||
      cleanEmail === `${u.displayName.toLowerCase()}@roomie.test`
  );

  try {
    const user = await withAdminDb(async (client) => {
      // 1. Try real password check in auth.users
      const res = await client.query(
        `
        select u.id, u.email,
               (select count(*)::int from public.user_answers a where a.user_id = u.id) as ans_count,
               (select completed_at from public.profiles p where p.user_id = u.id) as comp_at
        from auth.users u
        where lower(u.email) = $1
          and u.encrypted_password = extensions.crypt($2, u.encrypted_password)
      `,
        [cleanEmail, cleanPass]
      );

      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          id: row.id,
          isCompleted: row.comp_at !== null && row.ans_count >= 30,
        };
      }

      // 2. If password check didn't match, check if this is a demo email with any password
      if (demoMatch) {
        return {
          id: demoMatch.id,
          isCompleted: true,
        };
      }

      return null;
    });

    if (!user) {
      return { success: false, error: "Email hoặc mật khẩu không chính xác" };
    }

    await setCurrentUserId(user.id);
    revalidatePath("/", "layout");
    return { success: true, userId: user.id, isCompleted: user.isCompleted };
  } catch (err) {
    console.error("signInAction error:", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Sign out current user.
 */
export async function signOutAction(): Promise<void> {
  await clearSession();
  revalidatePath("/", "layout");
}

/**
 * Save personal evaluation & note for a candidate.
 */
export async function saveCandidateNoteAction(data: {
  candidateId: string;
  rating?: number | null;
  tags?: string[];
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) return { success: false, error: "Chưa đăng nhập" };

  try {
    await withAdminDb(async (client) => {
      await client.query(
        `
        insert into public.candidate_notes (user_id, candidate_id, rating, tags, notes, updated_at)
        values ($1, $2, $3, $4, $5, now())
        on conflict (user_id, candidate_id) do update set
          rating = excluded.rating,
          tags = excluded.tags,
          notes = excluded.notes,
          updated_at = now()
      `,
        [
          currentUserId,
          data.candidateId,
          data.rating ?? null,
          data.tags ?? [],
          data.notes ?? "",
        ]
      );
    });

    revalidatePath(`/compatibility/${data.candidateId}`);
    revalidatePath(`/profile/${data.candidateId}`);
    return { success: true };
  } catch (err) {
    console.error("saveCandidateNoteAction error:", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Fetch personal evaluation & note for a candidate.
 */
export async function getCandidateNoteAction(candidateId: string): Promise<{
  rating: number | null;
  tags: string[];
  notes: string;
  updatedAt: string | null;
} | null> {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) return null;

  try {
    return await withAdminDb(async (client) => {
      const res = await client.query(
        `
        select rating, tags, notes, updated_at
        from public.candidate_notes
        where user_id = $1 and candidate_id = $2
      `,
        [currentUserId, candidateId]
      );

      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        rating: r.rating,
        tags: r.tags || [],
        notes: r.notes || "",
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : null,
      };
    });
  } catch (err) {
    console.error("getCandidateNoteAction error:", err);
    return null;
  }
}

/**
 * Admin portal authentication action
 */
export async function adminLoginAction(
  passcode: string,
  email?: string
): Promise<{ success: boolean; error?: string }> {
  const { authenticateAdmin } = await import("@/lib/server/admin-auth");
  const res = await authenticateAdmin(passcode, email);
  if (res.success) {
    revalidatePath("/admin");
  }
  return res;
}

/**
 * Admin logout action
 */
export async function adminLogoutAction(): Promise<{ success: boolean }> {
  const { clearAdminSession } = await import("@/lib/server/admin-auth");
  await clearAdminSession();
  revalidatePath("/admin");
  return { success: true };
}

