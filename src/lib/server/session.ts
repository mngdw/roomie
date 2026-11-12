/**
 * ROOMIE · User Session & Demo Persona Management
 * Handles session cookies and provides seamless switching between demo personas.
 */
import { cache } from "react";
import { cookies } from "next/headers";
import { withAdminDb } from "./db";
import { DEMO_USERS, DEFAULT_USER_ID } from "@/lib/constants/demo-users";
import { getFallbackUserSummary } from "@/lib/data/fallback-candidates";

export const SESSION_COOKIE_NAME = "roomie_user_id";
export { DEMO_USERS, DEFAULT_USER_ID };

/**
 * Returns the current authenticated or demo user ID (deduplicated per request via React.cache).
 */
export const getCurrentUserId = cache(async (): Promise<string | null> => {
  const cookieStore = await cookies();
  const userIdCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return userIdCookie || null;
});

/**
 * Sets the current user ID in the session cookie.
 */
export async function setCurrentUserId(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, userId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

/**
 * Clears the session cookie.
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export interface UserSummary {
  id: string;
  displayName: string;
  fullName: string;
  gender: "male" | "female" | "other";
  housingStatus: "has_room" | "looking_for_room";
  isCompleted: boolean;
  answeredCount: number;
  isVerified: boolean;
  avatarPath: string | null;
  bio: string | null;
  occupation: string | null;
  schoolOrWorkplace: string | null;
  cityCode: string | null;
  districtCode: string | null;
}

/**
 * Loads the current user's profile and questionnaire completion status.
 * Automatically deduplicated per request via React.cache and falls back to seed persona if DB is unreachable.
 */
export const getCurrentUser = cache(async (): Promise<UserSummary | null> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return null;
  }

  try {
    return await withAdminDb(async (client) => {
      const pRes = await client.query(
        `select p.*, 
                (select status from public.verification_records v where v.user_id = p.user_id order by v.created_at desc limit 1) as verification_status,
                (select count(*)::int from public.user_answers a where a.user_id = p.user_id) as answered_count
         from public.profiles p
         where p.user_id = $1`,
        [userId]
      );

      const row = pRes.rows[0];
      if (!row) {
        return getFallbackUserSummary(userId);
      }

      return {
        id: row.user_id,
        displayName: row.display_name,
        fullName: row.full_name,
        gender: row.gender,
        housingStatus: row.housing_status,
        isCompleted: row.completed_at !== null && row.answered_count >= 30,
        answeredCount: row.answered_count,
        isVerified: row.verification_status === "verified",
        avatarPath: row.avatar_path,
        bio: row.bio,
        occupation: row.occupation,
        schoolOrWorkplace: row.school_or_workplace,
        cityCode: row.city_code,
        districtCode: row.district_code,
      };
    });
  } catch (err) {
    console.warn("getCurrentUser DB fallback active:", (err as Error).message);
    return getFallbackUserSummary(userId);
  }
});
