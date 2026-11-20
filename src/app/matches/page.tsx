import { getCurrentUserId, getCurrentUser } from "@/lib/server/session";
import { withAdminDb } from "@/lib/server/db";
import { fetchCandidateUsersByIds } from "@/lib/matching/recommendations";
import { scorePair } from "@/lib/matching/scoring";
import { SessionRestoreGuard } from "@/components/SessionRestoreGuard";
import {
  getFallbackCandidateUser,
  getExactFallbackCandidateUser,
  FALLBACK_MATCHES,
  FALLBACK_LIKES,
} from "@/lib/data/fallback-candidates";
import {
  MatchesClient,
  type MatchItem,
  type SentLikeItem,
  type ReceivedLikeItem,
} from "./MatchesClient";

export const dynamic = "force-dynamic";

interface MatchesPageProps {
  searchParams: Promise<{
    tab?: string;
  }>;
}

export default async function MatchesPage({ searchParams }: MatchesPageProps) {
  const { tab } = await searchParams;
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    return <SessionRestoreGuard />;
  }
  const currentUser = await getCurrentUser();

  let matchesData: MatchItem[] = [];
  let sentLikesData: SentLikeItem[] = [];
  let receivedLikesData: ReceivedLikeItem[] = [];

  try {
    const dbResult = await withAdminDb(async (client) => {
      // Ensure every active match has a conversation row in 1 bulk query
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

      // 1. Fetch active matches, sent likes, and received likes
      const [matchRes, sentRes, recvRes] = await Promise.all([
        client.query(
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
        ),
        client.query(
          `
          select to_user, created_at
          from public.likes
          where from_user = $1
          order by created_at desc
        `,
          [currentUserId]
        ),
        client.query(
          `
          select from_user, created_at
          from public.likes
          where to_user = $1
          order by created_at desc
        `,
          [currentUserId]
        ),
      ]);

      // 2. Collect all unique user IDs and bulk-load in 1 single SQL query
      const allIds = new Set<string>([currentUserId]);
      for (const r of matchRes.rows) if (r.partner_id) allIds.add(r.partner_id);
      for (const r of sentRes.rows) if (r.to_user) allIds.add(r.to_user);
      for (const r of recvRes.rows) if (r.from_user) allIds.add(r.from_user);

      const usersMap = await fetchCandidateUsersByIds(
        client,
        Array.from(allIds)
      );
      const viewer = usersMap.get(currentUserId) ?? null;

      const partnerConvMap = new Map<string, string>();
      const matches: MatchItem[] = [];

      for (const row of matchRes.rows) {
        const partner = usersMap.get(row.partner_id);
        if (partner) {
          const convId = row.conversation_id || null;
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

      const sentLikes: SentLikeItem[] = [];
      for (const row of sentRes.rows) {
        const target = usersMap.get(row.to_user);
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

      const receivedLikes: ReceivedLikeItem[] = [];
      for (const row of recvRes.rows) {
        const sender = usersMap.get(row.from_user);
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
    });

    matchesData = dbResult.matchesData;
    sentLikesData = dbResult.sentLikesData;
    receivedLikesData = dbResult.receivedLikesData;
  } catch (err) {
    console.warn("MatchesPage DB fallback active:", (err as Error).message);
    const viewer = getFallbackCandidateUser(currentUserId);
    const partnerConvMap = new Map<string, string>();

    for (const m of FALLBACK_MATCHES) {
      if (m.userA === currentUserId || m.userB === currentUserId) {
        const partnerId = m.userA === currentUserId ? m.userB : m.userA;
        const partner = getExactFallbackCandidateUser(partnerId);
        if (partner) {
          partnerConvMap.set(partnerId, m.conversationId);
          matchesData.push({
            matchId: m.id,
            matchedAt: m.createdAt,
            conversationId: m.conversationId,
            partner,
            compatibility: viewer
              ? scorePair(viewer.answers, partner.answers)
              : null,
          });
        }
      }
    }

    for (const l of FALLBACK_LIKES) {
      if (l.fromUser === currentUserId) {
        const target = getExactFallbackCandidateUser(l.toUser);
        if (target) {
          sentLikesData.push({
            targetUserId: l.toUser,
            likedAt: l.createdAt,
            isMatched: partnerConvMap.has(l.toUser),
            conversationId: partnerConvMap.get(l.toUser) || null,
            target,
            compatibility: viewer
              ? scorePair(viewer.answers, target.answers)
              : null,
          });
        }
      }
      if (l.toUser === currentUserId) {
        const sender = getExactFallbackCandidateUser(l.fromUser);
        if (sender) {
          receivedLikesData.push({
            fromUserId: l.fromUser,
            likedAt: l.createdAt,
            isMatched: partnerConvMap.has(l.fromUser),
            conversationId: partnerConvMap.get(l.fromUser) || null,
            sender,
            compatibility: viewer
              ? scorePair(viewer.answers, sender.answers)
              : null,
          });
        }
      }
    }
  }

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
