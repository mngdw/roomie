import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";

export type VerificationRecordRow = Database["public"]["Tables"]["verification_records"]["Row"];

/**
 * Fetch the authenticated user's own verification record.
 * RLS restricts clients to non-secret columns (id_number_hmac and pii_ciphertext are null/hidden).
 */
export async function getMyVerificationRecord(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<Partial<VerificationRecordRow> | null> {
  const { data, error } = await client
    .from("verification_records")
    .select("id, user_id, method, status, id_number_last4, document_path, consent_version, consent_at, submitted_at, reviewed_at, reject_reason, created_at, updated_at")
    .eq("user_id", userId)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Admin action: review a verification record.
 */
export async function reviewVerificationRecord(
  client: SupabaseClient<Database>,
  recordId: string,
  approve: boolean,
  reason?: string,
): Promise<{ status: "verified" | "rejected" }> {
  const { data, error } = await client.rpc("rpc_review_verification", {
    p_record: recordId,
    p_approve: approve,
    p_reason: reason,
  });

  if (error) throw error;
  return data as unknown as { status: "verified" | "rejected" };
}
