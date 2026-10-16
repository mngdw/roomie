import { getCurrentUserId, getCurrentUser, DEFAULT_USER_ID } from "@/lib/server/session";
import { withAdminDb } from "@/lib/server/db";
import { getDiscoveryFeed, type DiscoveryFeedData } from "@/lib/matching/recommendations";
import { DiscoveryView } from "./DiscoveryView";
import Link from "next/link";
import { Sparkles, UserPlus, LogIn, Compass } from "lucide-react";

interface DiscoveryPageProps {
  searchParams: Promise<{
    completed?: string;
    tab?: string;
  }>;
}

export default async function DiscoveryPage({ searchParams }: DiscoveryPageProps) {
  const { completed, tab } = await searchParams;
  const currentUserId = await getCurrentUserId();
  const currentUser = await getCurrentUser();

  const isNewlyCompleted = completed === "true" || completed === "1";

  let feed: DiscoveryFeedData = {
    topRecommendations: [],
    allCandidates: [],
  };
  let initialLikedRecords: Array<{ userId: string; likedAt: string }> = [];
  let initialMatchedUserIds: string[] = [];

  try {
    const result = await withAdminDb(async (client) => {
      if (currentUserId) {
        const [f, likesRes, matchesRes] = await Promise.all([
          getDiscoveryFeed(client, currentUserId),
          client.query(
            `select to_user, created_at from public.likes where from_user = $1 order by created_at desc`,
            [currentUserId]
          ),
          client.query(
            `select case when user_a = $1 then user_b else user_a end as partner_id
             from public.matches
             where (user_a = $1 or user_b = $1) and status = 'active'`,
            [currentUserId]
          ),
        ]);

        return {
          feed: f,
          likedRecords: likesRes.rows.map((r: any) => ({
            userId: r.to_user,
            likedAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
          })),
          matchedIds: matchesRes.rows.map((r: any) => r.partner_id),
        };
      }

      const guestFeed = await getDiscoveryFeed(client, DEFAULT_USER_ID);
      return {
        feed: guestFeed,
        likedRecords: [],
        matchedIds: [],
      };
    });

    feed = result.feed;
    initialLikedRecords = result.likedRecords;
    initialMatchedUserIds = result.matchedIds;
  } catch (err) {
    console.error("Error fetching discovery feed in DiscoveryPage:", err);
  }

  return (
    <div>
      {/* Guest Mode Banner */}
      {!currentUser && (
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white px-4 py-3.5 text-xs shadow-inner">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-center sm:text-left">
              <Compass className="w-5 h-5 text-blue-200 flex-shrink-0 hidden sm:block" />
              <span>
                <strong>Chế độ Khách:</strong> Bạn đang xem danh sách bạn cùng phòng mẫu. Hãy <strong>Đăng ký</strong> hoặc <strong>Đăng nhập</strong> để hoàn tất khảo sát và nhận điểm tương thích đa chiều theo đúng tính cách của bạn!
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white text-blue-700 font-bold hover:bg-blue-50 transition-colors shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Đăng ký ngay</span>
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-500/40 hover:bg-blue-500/60 text-white font-semibold transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Đăng nhập</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Banner if Profile Not Completed */}
      {currentUser && !currentUser.isCompleted && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-xs text-amber-800">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                Hồ sơ của bạn chưa hoàn tất 30 câu hỏi khảo sát ({currentUser.answeredCount}/30 câu).
                Hãy hoàn tất ngay để hệ thống tính điểm số tương thích % chính xác nhất dành riêng cho bạn!
              </span>
            </div>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-1 font-bold text-amber-900 hover:text-amber-700 underline whitespace-nowrap"
            >
              Hoàn thành khảo sát (6 bước) →
            </Link>
          </div>
        </div>
      )}

      <DiscoveryView
        initialTopRecommendations={feed.topRecommendations}
        initialAllCandidates={feed.allCandidates}
        initialLikedRecords={initialLikedRecords}
        initialMatchedUserIds={initialMatchedUserIds}
        currentUser={currentUser}
        isNewlyCompleted={isNewlyCompleted}
        initialTab={
          tab === "explore"
            ? "all_explore"
            : tab === "liked"
            ? "liked_history"
            : "top_picks"
        }
      />
    </div>
  );
}
