import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";

export type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];
export type MessageRow = Database["public"]["Tables"]["messages"]["Row"];

export async function getMyConversations(
  client: SupabaseClient<Database>,
): Promise<ConversationRow[]> {
  const { data, error } = await client
    .from("conversations")
    .select("*")
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) throw error;
  return data ?? [];
}

export async function getConversationMessages(
  client: SupabaseClient<Database>,
  conversationId: string,
  limit = 50,
  beforeSeq?: number,
): Promise<MessageRow[]> {
  let query = client
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("seq", { ascending: false })
    .limit(limit);

  if (beforeSeq !== undefined) {
    query = query.lt("seq", beforeSeq);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Return in chronological order
  return (data ?? []).reverse();
}

export async function sendMessage(
  client: SupabaseClient<Database>,
  conversationId: string,
  senderId: string,
  body: string,
): Promise<MessageRow> {
  const { data, error } = await client
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      body,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function markConversationRead(
  client: SupabaseClient<Database>,
  conversationId: string,
): Promise<number> {
  const { data, error } = await client.rpc("rpc_mark_read", {
    p_conversation: conversationId,
  });

  if (error) throw error;
  return Number(data ?? 0);
}
