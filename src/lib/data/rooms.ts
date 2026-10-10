import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "../db/database.types";
import type { RoomFormInput, RoomImageInput } from "../validation/room";

export type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];
export type RoomImageRow = Database["public"]["Tables"]["room_images"]["Row"];
export type PublicRoomRow = Database["public"]["Views"]["public_rooms"]["Row"];
export type PublicRoomMediaRow = Database["public"]["Views"]["public_room_media"]["Row"];

export async function getMyRoom(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<RoomRow | null> {
  const { data, error } = await client
    .from("rooms")
    .select("*")
    .eq("owner_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createOrUpdateMyRoom(
  client: SupabaseClient<Database>,
  userId: string,
  room: RoomFormInput,
  existingRoomId?: string,
): Promise<RoomRow> {
  const payload = {
    owner_id: userId,
    city_code: room.city_code,
    district_code: room.district_code,
    address_line: room.address_line ?? null,
    monthly_rent: room.monthly_rent,
    deposit: room.deposit ?? null,
    area_m2: room.area_m2 ?? null,
    room_type: room.room_type,
    capacity_total: room.capacity_total,
    current_occupants: room.current_occupants,
    facilities: room.facilities,
    services: room.services,
    utilities: room.utilities as Json,
    available_from: room.available_from,
    notes: room.notes ?? null,
    is_published: room.is_published,
  };

  if (existingRoomId) {
    const { data, error } = await client
      .from("rooms")
      .update(payload)
      .eq("id", existingRoomId)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await client
      .from("rooms")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

export async function getMyRoomImages(
  client: SupabaseClient<Database>,
  roomId: string,
): Promise<RoomImageRow[]> {
  const { data, error } = await client
    .from("room_images")
    .select("*")
    .eq("room_id", roomId)
    .order("position", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function addRoomImage(
  client: SupabaseClient<Database>,
  image: RoomImageInput,
): Promise<RoomImageRow> {
  const { data, error } = await client
    .from("room_images")
    .insert(image)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteRoomImage(
  client: SupabaseClient<Database>,
  imageId: string,
): Promise<void> {
  const { error } = await client.from("room_images").delete().eq("id", imageId);
  if (error) throw error;
}

export async function getPublicRooms(
  client: SupabaseClient<Database>,
): Promise<PublicRoomRow[]> {
  const { data, error } = await client
    .from("public_rooms")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getPublicRoom(
  client: SupabaseClient<Database>,
  roomId: string,
): Promise<PublicRoomRow | null> {
  const { data, error } = await client
    .from("public_rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getPublicRoomMedia(
  client: SupabaseClient<Database>,
  roomId: string,
): Promise<PublicRoomMediaRow[]> {
  const { data, error } = await client
    .from("public_room_media")
    .select("*")
    .eq("room_id", roomId)
    .order("position", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Access the private address of a room.
 * Only the room owner and active mutual matches are authorized by rpc_get_room_address.
 */
export async function getRoomAddress(
  client: SupabaseClient<Database>,
  roomId: string,
): Promise<string | null> {
  const { data, error } = await client.rpc("rpc_get_room_address", {
    p_room: roomId,
  });

  if (error) throw error;
  return data;
}
