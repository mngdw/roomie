import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";

export interface LikeResult {
  matched: boolean;
  match_id?: string;
  conversation_id?: string;
}

export interface PassResult {
  passed: boolean;
}

export type MatchRow = Database["public"]["Tables"]["matches"]["Row"];
export type CompatibilityScoreRow = Database["public"]["Tables"]["compatibility_scores"]["Row"];

/**
 * Like another user via atomic RPC rpc_like_user.
 * If mutual, creates the match and conversation, and returns matched: true with the IDs.
 */
export async function likeUser(
  client: SupabaseClient<Database>,
  targetUserId: string,
): Promise<LikeResult> {
  const { data, error } = await client.rpc("rpc_like_user", {
    p_target: targetUserId,
  });

  if (error) throw error;
  return data as unknown as LikeResult;
}

/**
 * Pass on another user via atomic RPC rpc_pass_user.
 */
export async function passUser(
  client: SupabaseClient<Database>,
  targetUserId: string,
): Promise<PassResult> {
  const { data, error } = await client.rpc("rpc_pass_user", {
    p_target: targetUserId,
  });

  if (error) throw error;
  return data as unknown as PassResult;
}

/**
 * Record a profile view via rpc_record_profile_view.
 * Automatically throttles notifications to at most one per viewer per 24 hours.
 */
export async function recordProfileView(
  client: SupabaseClient<Database>,
  targetUserId: string,
): Promise<void> {
  const { error } = await client.rpc("rpc_record_profile_view", {
    p_target: targetUserId,
  });

  if (error) throw error;
}

/**
 * Get active matches for the authenticated user.
 */
export async function getMyMatches(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<MatchRow[]> {
  const { data, error } = await client
    .from("matches")
    .select("*")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Fetch compatibility score for a pair.
 */
export async function getCompatibilityScore(
  client: SupabaseClient<Database>,
  userId1: string,
  userId2: string,
): Promise<CompatibilityScoreRow | null> {
  const low = userId1 < userId2 ? userId1 : userId2;
  const high = userId1 < userId2 ? userId2 : userId1;

  const { data, error } = await client
    .from("compatibility_scores")
    .select("*")
    .eq("user_low", low)
    .eq("user_high", high)
    .maybeSingle();

  if (error) throw error;
  return data;
}
