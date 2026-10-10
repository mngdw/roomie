import { describe, it, expect } from "vitest";
import { withUser, withAnon, USER_IDS } from "./test-helper";

describe("Row Level Security & Data Protection Policies", () => {

  it("anon role cannot access private tables", async () => {
    await withAnon(async (c) => {
      await expect(c.query("select * from public.profiles")).rejects.toThrow();
      await expect(c.query("select * from public.users")).rejects.toThrow();
      await expect(c.query("select * from public.messages")).rejects.toThrow();
    });
  });

  it("authenticated user can only read their own profile row from profiles table", async () => {
    await withUser(USER_IDS.ngoc, async (c) => {
      const res = await c.query("select user_id, display_name from public.profiles");
      expect(res.rows.length).toBe(1);
      expect(res.rows[0].user_id).toBe(USER_IDS.ngoc);
    });
  });

  it("authenticated user cannot update another user's profile", async () => {
    await withUser(USER_IDS.ngoc, async (c) => {
      const res = await c.query(
        "update public.profiles set display_name = 'Hacked' where user_id = $1",
        [USER_IDS.linh],
      );
      // RLS policy with check ensures 0 rows affected
      expect(res.rowCount).toBe(0);
    });
  });

  it("public_profiles view exposes only intended public fields and omits DOB / full_name", async () => {
    await withUser(USER_IDS.ngoc, async (c) => {
      // Linh is visible to Ngọc (matched / eligible)
      const res = await c.query(
        "select * from public.public_profiles where user_id = $1",
        [USER_IDS.linh],
      );
      expect(res.rows.length).toBe(1);
      const row = res.rows[0];

      // Public fields exist
      expect(row.display_name).toBe("Linh");
      expect(row.age).toBeDefined();
      expect(row.is_verified).toBe(true);

      // Private fields do NOT exist in public_profiles view schema
      expect(row.date_of_birth).toBeUndefined();
      expect(row.full_name).toBeUndefined();
    });
  });

  it("rooms table is private to the owner; public_rooms hides exact address_line", async () => {
    await withUser(USER_IDS.ngoc, async (c) => {
      // Direct rooms table: Ngọc has no room, so sees 0 rows
      const direct = await c.query("select * from public.rooms");
      expect(direct.rows.length).toBe(0);

      // Public rooms view: Linh's room is visible, but address_line is not in the view!
      const pub = await c.query(
        "select * from public.public_rooms where owner_id = $1",
        [USER_IDS.linh],
      );
      expect(pub.rows.length).toBe(1);
      expect(pub.rows[0].address_line).toBeUndefined();
      expect(pub.rows[0].monthly_rent).toBeDefined();
      expect(pub.rows[0].rent_per_person).toBeDefined();
    });
  });

  it("rpc_get_room_address reveals address only to owner and active mutual matches", async () => {
    const linhRoomId = "b0000000-0000-4000-8000-000000000002";

    // 1. Linh is owner -> gets address
    await withUser(USER_IDS.linh, async (c) => {
      const res = await c.query("select public.rpc_get_room_address($1) as addr", [linhRoomId]);
      expect(res.rows[0].addr).toBeTruthy();
    });

    // 2. Ngọc is active match with Linh -> gets address
    await withUser(USER_IDS.ngoc, async (c) => {
      const res = await c.query("select public.rpc_get_room_address($1) as addr", [linhRoomId]);
      expect(res.rows[0].addr).toBeTruthy();
    });

    // 3. Mai is NOT a match with Linh -> address is null
    await withUser(USER_IDS.mai, async (c) => {
      const res = await c.query("select public.rpc_get_room_address($1) as addr", [linhRoomId]);
      expect(res.rows[0].addr).toBeNull();
    });
  });

  it("chat isolation: third-party user cannot view or send messages into other users' conversation", async () => {
    const ngocLinhConv = "e0000000-0000-4000-8000-000000000012";

    // Mai is not a participant
    await withUser(USER_IDS.mai, async (c) => {
      // Attempt to read messages
      const res = await c.query(
        "select * from public.messages where conversation_id = $1",
        [ngocLinhConv],
      );
      expect(res.rows.length).toBe(0);

      // Attempt to send message
      await expect(
        c.query(
          "insert into public.messages (conversation_id, sender_id, body) values ($1, $2, $3)",
          [ngocLinhConv, USER_IDS.mai, "Spam message"],
        ),
      ).rejects.toThrow();
    });
  });

  it("verification_records: authenticated user cannot read sensitive CCCD HMAC or ciphertext", async () => {
    // 1. Trying to select id_number_hmac is denied
    await withUser(USER_IDS.linh, async (c) => {
      await expect(
        c.query("select id_number_hmac from public.verification_records"),
      ).rejects.toThrow(/permission denied/);
    });

    // 2. Trying to select pii_ciphertext is denied
    await withUser(USER_IDS.linh, async (c) => {
      await expect(
        c.query("select pii_ciphertext from public.verification_records"),
      ).rejects.toThrow(/permission denied/);
    });

    // 3. But non-secret columns are readable by the owner
    await withUser(USER_IDS.linh, async (c) => {
      const res = await c.query(
        "select id, user_id, status, id_number_last4 from public.verification_records where user_id = $1",
        [USER_IDS.linh],
      );
      expect(res.rows.length).toBe(1);
      expect(res.rows[0].id_number_last4).toBe("0002");
      expect(res.rows[0].status).toBe("verified");
    });
  });
});
