import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/server/session";
import { withAdminDb } from "@/lib/server/db";
import { fetchCandidateUser } from "@/lib/matching/recommendations";
import {
  getFallbackCandidateUser,
  getExactFallbackCandidateUser,
  FALLBACK_MATCHES,
  FALLBACK_MESSAGES,
} from "@/lib/data/fallback-candidates";
import { scorePair } from "@/lib/matching/scoring";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    return NextResponse.json({ conversations: [] });
  }

  const { searchParams } = new URL(request.url);
  const specificConvId = searchParams.get("id");
  const messagesOnly = searchParams.get("messagesOnly") === "1";

  try {
    const data = await withAdminDb(async (client) => {
      // Fast path: polling messages for an open conversation (1 single indexed SQL query!)
      if (specificConvId && messagesOnly) {
        const cRes = await client.query(
          `
          select c.id as conversation_id
          from public.conversations c
          join public.matches m on m.id = c.match_id
          where (c.id = $1 or m.id = $1)
            and (m.user_a = $2 or m.user_b = $2)
          limit 1
        `,
          [specificConvId, currentUserId]
        );

        if (cRes.rows.length === 0) {
          return { error: "Không tìm thấy cuộc trò chuyện", status: 404 };
        }

        const realConvId = cRes.rows[0].conversation_id;
        const mRes = await client.query(
          `
          select id, sender_id, body, created_at
          from public.messages
          where conversation_id = $1
          order by created_at asc, seq asc
        `,
          [realConvId]
        );

        return {
          conversation: {
            id: realConvId,
            messages: mRes.rows,
          },
        };
      }

      // Full single conversation fetch
      if (specificConvId) {
        const cRes = await client.query(
          `
          select c.id as conversation_id, m.id as match_id, m.user_a, m.user_b
          from public.matches m
          left join public.conversations c on c.match_id = m.id
          where (c.id = $1 or m.id = $1)
            and (m.user_a = $2 or m.user_b = $2)
          limit 1
        `,
          [specificConvId, currentUserId]
        );

        if (cRes.rows.length === 0) {
          return { error: "Không tìm thấy cuộc trò chuyện", status: 404 };
        }

        const conv = cRes.rows[0];
        let realConvId = conv.conversation_id;
        if (!realConvId) {
          const insConv = await client.query(
            `insert into public.conversations (match_id) values ($1) on conflict (match_id) do update set updated_at = now() returning id`,
            [conv.match_id]
          );
          realConvId = insConv.rows[0]?.id;
        }

        const partnerId =
          conv.user_a === currentUserId ? conv.user_b : conv.user_a;
        const [partner, viewer, mRes] = await Promise.all([
          fetchCandidateUser(client, partnerId),
          fetchCandidateUser(client, currentUserId),
          client.query(
            `
            select id, sender_id, body, created_at
            from public.messages
            where conversation_id = $1
            order by created_at asc, seq asc
          `,
            [realConvId]
          ),
        ]);

        const compatibility =
          viewer && partner ? scorePair(viewer.answers, partner.answers) : null;

        return {
          conversation: {
            id: realConvId,
            partner,
            compatibility,
            messages: mRes.rows,
          },
        };
      }

      // Ensure every active match for currentUserId has a conversation row
      await client.query(
        `
        insert into public.conversations (match_id)
        select m.id
        from public.matches m
        left join public.conversations c on c.match_id = m.id
        where (m.user_a = $1 or m.user_b = $1)
          and m.status = 'active'
          and c.id is null
        on conflict (match_id) do nothing
      `,
        [currentUserId]
      );

      // Fast 1-query fetch for all conversations of current user
      const res = await client.query(
        `
        select
          m.id as match_id,
          m.created_at as matched_at,
          c.id as conversation_id,
          c.last_message_at,
          p.user_id as partner_id,
          p.display_name,
          date_part('year', age(current_date, p.date_of_birth))::int as age,
          p.gender,
          p.district_code,
          p.housing_status,
          p.verification_status,
          p.avatar_path,
          p.phone,
          p.zalo,
          u.email,
          cs.final_score,
          lm.body as last_body,
          lm.sender_id as last_sender_id,
          lm.created_at as last_created_at
        from public.matches m
        join public.conversations c on c.match_id = m.id
        join public.profiles p on p.user_id = (case when m.user_a = $1 then m.user_b else m.user_a end)
        left join auth.users u on u.id = p.user_id
        left join public.compatibility_scores cs
          on cs.user_low = least(m.user_a, m.user_b)
         and cs.user_high = greatest(m.user_a, m.user_b)
        left join lateral (
          select body, sender_id, created_at
          from public.messages msg
          where msg.conversation_id = c.id
          order by msg.created_at desc, msg.seq desc
          limit 1
        ) lm on true
        where (m.user_a = $1 or m.user_b = $1)
          and m.status = 'active'
        order by coalesce(lm.created_at, m.created_at) desc
      `,
        [currentUserId]
      );

      const list = res.rows.map((row) => ({
        conversationId: row.conversation_id,
        matchId: row.match_id,
        matchedAt: row.matched_at,
        partner: {
          userId: row.partner_id,
          displayName: row.display_name,
          age: Number(row.age || 22),
          gender: row.gender,
          districtCode: row.district_code,
          housingStatus: row.housing_status,
          isVerified: row.verification_status === "verified",
          avatarPath: row.avatar_path,
          email: row.email || null,
          phone: row.phone || null,
          zalo: row.zalo || null,
        },
        compatibility:
          row.final_score !== null && row.final_score !== undefined
            ? { finalScore: Number(row.final_score) }
            : null,
        lastMessage: row.last_body
          ? {
              body: row.last_body,
              sender_id: row.last_sender_id,
              created_at: row.last_created_at,
            }
          : null,
      }));

      return { conversations: list };
    });

    if ((data as any)?.status === 404) {
      return NextResponse.json({ error: (data as any).error }, { status: 404 });
    }

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err) {
    console.warn("GET /api/conversations DB fallback active:", (err as Error).message);
    const viewer = getFallbackCandidateUser(currentUserId);

    if (specificConvId) {
      const match = FALLBACK_MATCHES.find(
        (m) =>
          (m.conversationId === specificConvId || m.id === specificConvId) &&
          (m.userA === currentUserId || m.userB === currentUserId)
      );
      if (!match) {
        return NextResponse.json(
          { error: "Không tìm thấy cuộc trò chuyện" },
          { status: 404 }
        );
      }
      const partnerId =
        match.userA === currentUserId ? match.userB : match.userA;
      const partner = getExactFallbackCandidateUser(partnerId);
      const compatibility =
        viewer && partner ? scorePair(viewer.answers, partner.answers) : null;
      const messages = FALLBACK_MESSAGES.filter(
        (m) => m.conversation_id === match.conversationId
      );

      return NextResponse.json({
        conversation: {
          id: match.conversationId,
          partner,
          compatibility,
          messages,
        },
      });
    }

    const list = [];
    for (const m of FALLBACK_MATCHES) {
      if (m.userA === currentUserId || m.userB === currentUserId) {
        const partnerId = m.userA === currentUserId ? m.userB : m.userA;
        const partner = getExactFallbackCandidateUser(partnerId);
        if (partner) {
          const compatibility = viewer
            ? scorePair(viewer.answers, partner.answers)
            : null;
          const convMsgs = FALLBACK_MESSAGES.filter(
            (msg) => msg.conversation_id === m.conversationId
          );
          const lastMessage =
            convMsgs.length > 0 ? convMsgs[convMsgs.length - 1] : null;

          list.push({
            conversationId: m.conversationId,
            matchId: m.id,
            matchedAt: m.createdAt,
            partner: {
              userId: partner.userId,
              displayName: partner.displayName,
              age: partner.age,
              gender: partner.gender,
              districtCode: partner.districtCode,
              housingStatus: partner.housingStatus,
              isVerified: partner.isVerified,
              avatarPath: partner.avatarPath,
              email: partner.email,
              phone: partner.phone,
              zalo: partner.zalo,
            },
            compatibility: compatibility
              ? { finalScore: compatibility.finalScore }
              : null,
            lastMessage,
          });
        }
      }
    }

    return NextResponse.json({ conversations: list });
  }
}

/**
 * POST /api/conversations
 * Fast, non-blocking endpoint to send a chat message without triggering full-page RSC re-renders.
 */
export async function POST(request: Request) {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    return NextResponse.json(
      { success: false, error: "Chưa đăng nhập" },
      { status: 401 }
    );
  }

  let payload: { conversationId?: string; body?: string } = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Dữ liệu không hợp lệ" },
      { status: 400 }
    );
  }

  const rawConvId = (payload.conversationId || "").trim();
  const trimmedBody = (payload.body || "").trim();

  if (!rawConvId || !trimmedBody) {
    return NextResponse.json(
      { success: false, error: "Nội dung tin nhắn không được để trống" },
      { status: 400 }
    );
  }

  // Enforce DB constraint: char_length(btrim(body)) between 1 and 2000
  const safeBody = trimmedBody.slice(0, 2000);

  try {
    const savedMsg = await withAdminDb(async (client) => {
      // 1. Verify conversation (or match) belongs to currentUserId and ensure match is active
      const checkRes = await client.query(
        `
        select c.id as conversation_id, m.id as match_id, m.status, m.user_a, m.user_b
        from public.matches m
        left join public.conversations c on c.match_id = m.id
        where (c.id = $1 or m.id = $1)
          and (m.user_a = $2 or m.user_b = $2)
        limit 1
      `,
        [rawConvId, currentUserId]
      );

      if (checkRes.rows.length === 0) {
        throw new Error("CONVERSATION_NOT_FOUND");
      }

      const row = checkRes.rows[0];
      if (row.status !== "active") {
        await client.query(
          `update public.matches set status = 'active', updated_at = now() where id = $1`,
          [row.match_id]
        );
      }

      let realConvId = row.conversation_id;
      if (!realConvId) {
        const insC = await client.query(
          `insert into public.conversations (match_id) values ($1) on conflict (match_id) do update set updated_at = now() returning id`,
          [row.match_id]
        );
        realConvId = insC.rows[0]?.id;
      }

      // 2. Insert message
      const insMsg = await client.query(
        `
        insert into public.messages (conversation_id, sender_id, body)
        values ($1, $2, $3)
        returning id, sender_id, body, created_at
      `,
        [realConvId, currentUserId, safeBody]
      );

      return insMsg.rows[0];
    });

    return NextResponse.json({
      success: true,
      messageId: savedMsg.id,
      message: savedMsg,
    });
  } catch (err) {
    const errMsg = (err as Error).message || "";
    if (errMsg === "CONVERSATION_NOT_FOUND") {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy cuộc trò chuyện hợp lệ" },
        { status: 404 }
      );
    }

    console.warn("POST /api/conversations DB fallback active:", errMsg);
    const fallbackMsg = {
      id: `msg-fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      conversation_id: rawConvId,
      sender_id: currentUserId,
      body: safeBody,
      created_at: new Date().toISOString(),
    };
    FALLBACK_MESSAGES.push(fallbackMsg);

    return NextResponse.json({
      success: true,
      messageId: fallbackMsg.id,
      message: fallbackMsg,
      fallback: true,
    });
  }
}
