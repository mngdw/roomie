import { describe, it, expect } from "vitest";
import { withSession, USER_IDS } from "./test-helper";

describe("Interactions, RPCs & Messaging", () => {
  it("one-sided like creates a new_like notification", async () => {
    await withSession(async ({ asUser }) => {
      // Ngọc likes Trang
      await asUser(USER_IDS.ngoc, async (c) => {
        const res = await c.query(`select public.rpc_like_user($1) as result`, [USER_IDS.trang]);
        expect(res.rows[0].result.matched).toBe(false);
      });

      // Trang verifies her own notification
      await asUser(USER_IDS.trang, async (c) => {
        const notifRes = await c.query(
          `select * from public.notifications where user_id = $1 and type = 'new_like' and actor_id = $2`,
          [USER_IDS.trang, USER_IDS.ngoc],
        );
        expect(notifRes.rows.length).toBe(1);
      });
    });
  });

  it("mutual like creates a match, conversation, and mutual_match notifications", async () => {
    await withSession(async ({ asUser }) => {
      let matchId: string;

      // In seed, Minh already liked Ngọc. Now Ngọc likes Minh back!
      await asUser(USER_IDS.ngoc, async (c) => {
        const res = await c.query(`select public.rpc_like_user($1) as result`, [USER_IDS.minh]);
        const result = res.rows[0].result;
        expect(result.matched).toBe(true);
        expect(result.match_id).toBeDefined();
        expect(result.conversation_id).toBeDefined();
        matchId = result.match_id;

        // Ngọc sees her own mutual_match notification
        const ngocNotif = await c.query(
          `select * from public.notifications where user_id = $1 and type = 'mutual_match' and payload->>'match_id' = $2`,
          [USER_IDS.ngoc, matchId],
        );
        expect(ngocNotif.rows.length).toBe(1);
      });

      // Minh sees her own mutual_match notification
      await asUser(USER_IDS.minh, async (c) => {
        const minhNotif = await c.query(
          `select * from public.notifications where user_id = $1 and type = 'mutual_match' and payload->>'match_id' = $2`,
          [USER_IDS.minh, matchId],
        );
        expect(minhNotif.rows.length).toBe(1);
      });
    });
  });

  it("pass user removes existing like and sends passed notification", async () => {
    await withSession(async ({ asUser }) => {
      // Lan passes on Minh (eligible pair in Cầu Giấy area)
      await asUser(USER_IDS.lan, async (c) => {
        const res = await c.query(`select public.rpc_pass_user($1) as result`, [USER_IDS.minh]);
        expect(res.rows[0].result.passed).toBe(true);
      });

      // Minh sees the passed notification
      await asUser(USER_IDS.minh, async (c) => {
        const notifRes = await c.query(
          `select * from public.notifications where user_id = $1 and type = 'passed' and actor_id = $2`,
          [USER_IDS.minh, USER_IDS.lan],
        );
        expect(notifRes.rows.length).toBe(1);
      });
    });
  });

  it("rpc_record_profile_view is throttled within 24 hours", async () => {
    await withSession(async ({ asUser }) => {
      // Ngọc views Trang twice
      await asUser(USER_IDS.ngoc, async (c) => {
        await c.query(`select public.rpc_record_profile_view($1)`, [USER_IDS.trang]);
        await c.query(`select public.rpc_record_profile_view($1)`, [USER_IDS.trang]);
      });

      // Trang checks notifications: throttled to exactly 1
      await asUser(USER_IDS.trang, async (c) => {
        const notifRes = await c.query(
          `select * from public.notifications where user_id = $1 and actor_id = $2 and type = 'profile_view'`,
          [USER_IDS.trang, USER_IDS.ngoc],
        );
        expect(notifRes.rows.length).toBe(1);
      });
    });
  });

  it("messaging requires active match and updates unread notifications", async () => {
    await withSession(async ({ asUser }) => {
      // Ngọc & Linh match conversation
      const convId = "e0000000-0000-4000-8000-000000000012";

      // Ngọc sends message
      await asUser(USER_IDS.ngoc, async (c) => {
        const msgRes = await c.query(
          `insert into public.messages (conversation_id, sender_id, body) values ($1, $2, $3) returning *`,
          [convId, USER_IDS.ngoc, "Hẹn gặp bạn ngày mai nhé!"],
        );
        expect(msgRes.rows.length).toBe(1);
        expect(msgRes.rows[0].seq).toBeDefined();
      });

      // Linh sees notification and marks read
      await asUser(USER_IDS.linh, async (c) => {
        const notifRes = await c.query(
          `select * from public.notifications where user_id = $1 and type = 'new_message' and read_at is null`,
          [USER_IDS.linh],
        );
        expect(notifRes.rows.length).toBeGreaterThanOrEqual(1);

        const readRes = await c.query(`select public.rpc_mark_read($1) as read_count`, [convId]);
        expect(Number(readRes.rows[0].read_count)).toBeGreaterThanOrEqual(1);

        const unreadNotifs = await c.query(
          `select * from public.notifications where user_id = $1 and type = 'new_message' and read_at is null`,
          [USER_IDS.linh],
        );
        expect(unreadNotifs.rows.length).toBe(0);
      });
    });
  });
});
