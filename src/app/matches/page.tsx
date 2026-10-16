import { redirect } from "next/navigation";
import { getCurrentUserId, getCurrentUser } from "@/lib/server/session";
import { withAdminDb } from "@/lib/server/db";
import { fetchCandidateUser } from "@/lib/matching/recommendations";
import { scorePair } from "@/lib/matching/scoring";
import {
  MatchesClient,
  type MatchItem,
  type SentLikeItem,
  type ReceivedLikeItem,
} from "./MatchesClient";

interface MatchesPageProps {
  searchParams: Promise<{
    tab?: string;
  }>;
}

export default async function MatchesPage({ searchParams }: MatchesPageProps) {
  const { tab } = await searchParams;
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    redirect("/login");
  }
  const currentUser = await getCurrentUser();

  const { matchesData, sentLikesData, receivedLikesData } = await withAdminDb(
    async (client) => {
      const viewer = await fetchCandidateUser(client, currentUserId);

      // 1. Fetch active matches
      const matchRes = await client.query(
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

      const partnerConvMap = new Map<string, string>();
      const matches: MatchItem[] = [];

      for (const row of matchRes.rows) {
        const partner = await fetchCandidateUser(client, row.partner_id);
        if (partner) {
          let convId = row.conversation_id;
          if (!convId) {
            const ins = await client.query(
              `insert into public.conversations (match_id) values ($1) on conflict do nothing returning id`,
              [row.match_id]
            );
            convId = ins.rows[0]?.id;
            if (!convId) {
              const fetchConv = await client.query(
                `select id from public.conversations where match_id = $1`,
                [row.match_id]
              );
              convId = fetchConv.rows[0]?.id;
            }
          }
          if (convId) {
            partnerConvMap.set(row.partner_id, convId);
          }

          const compatibility = viewer
            ? scorePair(viewer.answers, partner.answers)
            : null;
          matches.push({
            matchId: row.match_id,
            matchedAt: row.matched_at
              ? new Date(row.matched_at).toISOString()
              : new Date().toISOString(),
            conversationId: convId,
            partner,
            compatibility,
          });
        }
      }

      // 2. Fetch Sent Likes ("Lịch sử đã thích")
      const sentRes = await client.query(
        `
        select to_user, created_at
        from public.likes
        where from_user = $1
        order by created_at desc
      `,
        [currentUserId]
      );

      const sentLikes: SentLikeItem[] = [];
      for (const row of sentRes.rows) {
        const target = await fetchCandidateUser(client, row.to_user);
        if (target) {
          const compatibility = viewer
            ? scorePair(viewer.answers, target.answers)
            : null;
          const isMatched = partnerConvMap.has(row.to_user);
          sentLikes.push({
            targetUserId: row.to_user,
            likedAt: row.created_at
              ? new Date(row.created_at).toISOString()
              : new Date().toISOString(),
            isMatched,
            conversationId: partnerConvMap.get(row.to_user) || null,
            target,
            compatibility,
          });
        }
      }

      // 3. Fetch Received Likes ("Người đã thích bạn")
      const recvRes = await client.query(
        `
        select from_user, created_at
        from public.likes
        where to_user = $1
        order by created_at desc
      `,
        [currentUserId]
      );

      const receivedLikes: ReceivedLikeItem[] = [];
      for (const row of recvRes.rows) {
        const sender = await fetchCandidateUser(client, row.from_user);
        if (sender) {
          const compatibility = viewer
            ? scorePair(viewer.answers, sender.answers)
            : null;
          const isMatched = partnerConvMap.has(row.from_user);
          receivedLikes.push({
            fromUserId: row.from_user,
            likedAt: row.created_at
              ? new Date(row.created_at).toISOString()
              : new Date().toISOString(),
            isMatched,
            conversationId: partnerConvMap.get(row.from_user) || null,
            sender,
            compatibility,
          });
        }
      }

      return {
        matchesData: matches,
        sentLikesData: sentLikes,
        receivedLikesData: receivedLikes,
      };
    }
  );

  const initialTab =
    tab === "history"
      ? "history"
      : tab === "received"
      ? "received"
      : "matches";

  return (
    <MatchesClient
      initialMatches={matchesData}
      initialSentLikes={sentLikesData}
      initialReceivedLikes={receivedLikesData}
      currentUser={currentUser}
      initialTab={initialTab}
    />
  );
}
