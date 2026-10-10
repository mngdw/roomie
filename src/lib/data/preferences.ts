import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";
import type { RoommatePreferencesInput, RoomPreferencesInput } from "../validation/preferences";

export type RoommatePreferencesRow = Database["public"]["Tables"]["roommate_preferences"]["Row"];
export type RoomPreferencesRow = Database["public"]["Tables"]["room_preferences"]["Row"];
export type PublicRoommateRequirementsRow = Database["public"]["Views"]["public_roommate_requirements"]["Row"];
export type PublicRoomPreferencesRow = Database["public"]["Views"]["public_room_preferences"]["Row"];

export async function getMyRoommatePreferences(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<RoommatePreferencesRow | null> {
  const { data, error } = await client
    .from("roommate_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertMyRoommatePreferences(
  client: SupabaseClient<Database>,
  userId: string,
  prefs: RoommatePreferencesInput,
): Promise<RoommatePreferencesRow> {
  const { data, error } = await client
    .from("roommate_preferences")
    .upsert({
      user_id: userId,
      accepted_genders: prefs.accepted_genders,
      age_min: prefs.age_min ?? null,
      age_max: prefs.age_max ?? null,
      age_is_dealbreaker: prefs.age_is_dealbreaker,
      smoking_policy: prefs.smoking_policy,
      requirement_tags: prefs.requirement_tags,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getMyRoomPreferences(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<RoomPreferencesRow | null> {
  const { data, error } = await client
    .from("room_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertMyRoomPreferences(
  client: SupabaseClient<Database>,
  userId: string,
  prefs: RoomPreferencesInput,
): Promise<RoomPreferencesRow> {
  const { data, error } = await client
    .from("room_preferences")
    .upsert({
      user_id: userId,
      preferred_district_codes: prefs.preferred_district_codes,
      budget_min: prefs.budget_min ?? null,
      budget_max: prefs.budget_max,
      room_types: prefs.room_types,
      move_in_date: prefs.move_in_date,
      move_in_flex_days: prefs.move_in_flex_days,
      must_have_facilities: prefs.must_have_facilities,
      require_media: prefs.require_media,
      notes: prefs.notes ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPublicRoommateRequirements(
  client: SupabaseClient<Database>,
  targetUserId: string,
): Promise<PublicRoommateRequirementsRow | null> {
  const { data, error } = await client
    .from("public_roommate_requirements")
    .select("*")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getPublicRoomPreferences(
  client: SupabaseClient<Database>,
  targetUserId: string,
): Promise<PublicRoomPreferencesRow | null> {
  const { data, error } = await client
    .from("public_room_preferences")
    .select("*")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
