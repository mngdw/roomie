import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";
import type { ProfileFormInput } from "../validation/profile";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type PublicProfileRow = Database["public"]["Views"]["public_profiles"]["Row"];

/**
 * Fetch the authenticated user's own profile (includes private fields like full_name, date_of_birth).
 */
export async function getMyProfile(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<ProfileRow | null> {
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Upsert the authenticated user's own profile.
 */
export async function upsertMyProfile(
  client: SupabaseClient<Database>,
  userId: string,
  profile: ProfileFormInput,
): Promise<ProfileRow> {
  const { data, error } = await client
    .from("profiles")
    .upsert({
      user_id: userId,
      display_name: profile.display_name,
      full_name: profile.full_name,
      date_of_birth: profile.date_of_birth,
      gender: profile.gender,
      school_or_workplace: profile.school_or_workplace ?? null,
      occupation: profile.occupation ?? null,
      city_code: profile.city_code,
      district_code: profile.district_code,
      hometown_code: profile.hometown_code ?? null,
      bio: profile.bio ?? null,
      avatar_path: profile.avatar_path ?? null,
      mbti_type: profile.mbti_type ?? null,
      is_smoker: profile.is_smoker,
      housing_status: profile.housing_status,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch a user's public profile from the security-barrier public_profiles view.
 * Will only return data if fn_can_view_user(targetId) is true (self, active match, eligible pair, or liker/passer).
 */
export async function getPublicProfile(
  client: SupabaseClient<Database>,
  targetUserId: string,
): Promise<PublicProfileRow | null> {
  const { data, error } = await client
    .from("public_profiles")
    .select("*")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
