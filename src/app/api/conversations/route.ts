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

export async function GET(request: Request) {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    return NextResponse.json({ conversations: [] });
  }

  const { searchParams } = new URL(request.url);
  const specificConvId = searchParams.get("id");

  try {
    const data = await withAdminDb(async (client) => {
      // If fetching messages for a single conversation
      if (specificConvId) {
        const cRes = await client.query(
          `
          select c.id as conversation_id, m.user_a, m.user_b
          from public.conversations c
          join public.matches m on m.id = c.match_id
          where c.id = $1 and (m.user_a = $2 or m.user_b = $2)
        `,
          [specificConvId, currentUserId]
        );

        if (cRes.rows.length === 0) {
          return { error: "Không tìm thấy cuộc trò chuyện", status: 404 };
        }

        const conv = cRes.rows[0];
        const partnerId =
          conv.user_a === currentUserId ? conv.user_b : conv.user_a;
        const partner = await fetchCandidateUser(client, partnerId);
        const viewer = await fetchCandidateUser(client, currentUserId);

        const mRes = await client.query(
          `
          select id, sender_id, body, created_at
          from public.messages
          where conversation_id = $1
          order by created_at asc
        `,
          [specificConvId]
        );

        const compatibility =
          viewer && partner ? scorePair(viewer.answers, partner.answers) : null;

        return {
          conversation: {
            id: specificConvId,
            partner,
            compatibility,
            messages: mRes.rows,
          },
        };
      }

      // Fetch all conversations for current user
      const res = await client.query(
        `
        select m.id as match_id,
               m.created_at as matched_at,
               c.id as conversation_id,
               case when m.user_a = $1 then m.user_b else m.user_a end as partner_id
        from public.matches m
        left join public.conversations c on c.match_id = m.id
        where (m.user_a = $1 or m.user_b = $1)
          and m.status = 'active'
        order by m.created_at desc
      `,
        [currentUserId]
      );

      const viewer = await fetchCandidateUser(client, currentUserId);
      const list = [];

      for (const row of res.rows) {
        const partner = await fetchCandidateUser(client, row.partner_id);
        if (partner) {
          let convId = row.conversation_id;
          if (!convId) {
            const createConv = await client.query(
              `insert into public.conversations (match_id) values ($1) returning id`,
              [row.match_id]
            );
            convId = createConv.rows[0]?.id;
          }

          const lastMsgRes = await client.query(
            `
            select body, sender_id, created_at
            from public.messages
            where conversation_id = $1
            order by created_at desc
            limit 1
          `,
            [convId]
          );

          const compatibility = viewer
            ? scorePair(viewer.answers, partner.answers)
            : null;

          list.push({
            conversationId: convId,
            matchId: row.match_id,
            matchedAt: row.matched_at,
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
            lastMessage: lastMsgRes.rows[0] || null,
          });
        }
      }

      return { conversations: list };
    });

    return NextResponse.json(data);
  } catch (err) {
    console.warn("GET /api/conversations DB fallback active:", (err as Error).message);
    const viewer = getFallbackCandidateUser(currentUserId);

    if (specificConvId) {
      const match = FALLBACK_MATCHES.find(
        (m) =>
          m.conversationId === specificConvId &&
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
        (m) => m.conversation_id === specificConvId
      );

      return NextResponse.json({
        conversation: {
          id: specificConvId,
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
