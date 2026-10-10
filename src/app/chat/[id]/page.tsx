import { notFound } from "next/navigation";
import { getCurrentUserId } from "@/lib/server/session";
import { withAdminDb } from "@/lib/server/db";
import { fetchCandidateUser } from "@/lib/matching/recommendations";
import { scorePair } from "@/lib/matching/scoring";
import { ChatClient } from "./ChatClient";

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { id: conversationId } = await params;
  const currentUserId = await getCurrentUserId();

  const conversationData = await withAdminDb(async (client) => {
    // 1. Verify access to conversation
    const cRes = await client.query(
      `
      select c.id as conversation_id, m.user_a, m.user_b
      from public.conversations c
      join public.matches m on m.id = c.match_id
      where c.id = $1 and (m.user_a = $2 or m.user_b = $2)
    `,
      [conversationId, currentUserId]
    );

    const conv = cRes.rows[0];
    if (!conv) return null;

    const partnerId =
      conv.user_a === currentUserId ? conv.user_b : conv.user_a;

    // 2. Fetch partner and viewer
    const partner = await fetchCandidateUser(client, partnerId);
    const viewer = await fetchCandidateUser(client, currentUserId);

    // 3. Fetch chronological messages
    const mRes = await client.query(
      `
      select id, sender_id, body, created_at
      from public.messages
      where conversation_id = $1
      order by created_at asc
    `,
      [conversationId]
    );

    return {
      partner,
      viewer,
      messages: mRes.rows,
    };
  });

  if (!conversationData || !conversationData.partner) {
    notFound();
  }

  const { partner, viewer, messages } = conversationData;
  const compatibility =
    viewer && partner ? scorePair(viewer.answers, partner.answers) : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <ChatClient
        conversationId={conversationId}
        partner={partner}
        compatibility={compatibility}
        currentUserId={currentUserId}
        initialMessages={messages}
      />
    </div>
  );
}
