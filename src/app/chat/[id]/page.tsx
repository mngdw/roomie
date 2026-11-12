import { notFound, redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/server/session";
import { withAdminDb } from "@/lib/server/db";
import { fetchCandidateUsersByIds } from "@/lib/matching/recommendations";
import {
  getFallbackCandidateUser,
  getExactFallbackCandidateUser,
  FALLBACK_MATCHES,
  FALLBACK_MESSAGES,
} from "@/lib/data/fallback-candidates";
import { scorePair } from "@/lib/matching/scoring";
import { ChatClient } from "./ChatClient";

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { id: paramId } = await params;
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    redirect("/login");
  }

  let conversationData: {
    realConvId: string;
    partner: any;
    viewer: any;
    messages: any[];
  } | null = null;

  try {
    conversationData = await withAdminDb(async (client) => {
      // 1. Resolve conversation by conversation_id, match_id, or partner_id
      let cRes = await client.query(
        `
        select c.id as conversation_id, m.id as match_id, m.user_a, m.user_b, m.status
        from public.matches m
        left join public.conversations c on c.match_id = m.id
        where (c.id = $1 or m.id = $1)
          and (m.user_a = $2 or m.user_b = $2)
        limit 1
      `,
        [paramId, currentUserId]
      );

      if (cRes.rows.length === 0) {
        // Check if paramId is a partner user_id with an active match or mutual like
        cRes = await client.query(
          `
          select c.id as conversation_id, m.id as match_id, m.user_a, m.user_b, m.status
          from public.matches m
          left join public.conversations c on c.match_id = m.id
          where (m.user_a = least($1::uuid, $2::uuid) and m.user_b = greatest($1::uuid, $2::uuid))
          limit 1
        `,
          [paramId, currentUserId]
        );
      }

      const conv = cRes.rows[0];
      if (!conv) return null;

      if (conv.status !== "active") {
        await client.query(
          `update public.matches set status = 'active', updated_at = now() where id = $1`,
          [conv.match_id]
        );
      }

      let realConvId = conv.conversation_id;
      if (!realConvId) {
        const insC = await client.query(
          `insert into public.conversations (match_id) values ($1) on conflict (match_id) do update set updated_at = now() returning id`,
          [conv.match_id]
        );
        realConvId = insC.rows[0]?.id;
      }

      const partnerId =
        conv.user_a === currentUserId ? conv.user_b : conv.user_a;

      // 2. Fetch partner, viewer, and chronological messages in parallel (2 SQL queries total)
      const [usersMap, mRes] = await Promise.all([
        fetchCandidateUsersByIds(client, [partnerId, currentUserId]),
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

      return {
        realConvId,
        partner: usersMap.get(partnerId) ?? null,
        viewer: usersMap.get(currentUserId) ?? null,
        messages: mRes.rows,
      };
    });
  } catch (err) {
    console.warn("ChatPage DB fallback active:", (err as Error).message);
    const match = FALLBACK_MATCHES.find(
      (m) =>
        (m.conversationId === paramId || m.id === paramId) &&
        (m.userA === currentUserId || m.userB === currentUserId)
    );
    if (match) {
      const partnerId =
        match.userA === currentUserId ? match.userB : match.userA;
      conversationData = {
        realConvId: match.conversationId,
        partner: getExactFallbackCandidateUser(partnerId),
        viewer: getFallbackCandidateUser(currentUserId),
        messages: FALLBACK_MESSAGES.filter(
          (m) => m.conversation_id === match.conversationId
        ),
      };
    }
  }

  if (!conversationData || !conversationData.partner) {
    notFound();
  }

  const { realConvId, partner, viewer, messages } = conversationData;
  const compatibility =
    viewer && partner ? scorePair(viewer.answers, partner.answers) : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <ChatClient
        conversationId={realConvId}
        partner={partner}
        compatibility={compatibility}
        currentUserId={currentUserId}
        initialMessages={messages}
      />
    </div>
  );
}
