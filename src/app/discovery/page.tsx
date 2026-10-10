import { getCurrentUserId, getCurrentUser } from "@/lib/server/session";
import { withAdminDb } from "@/lib/server/db";
import { getRecommendedRoommates } from "@/lib/matching/recommendations";
import { DiscoveryView } from "./DiscoveryView";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export default async function DiscoveryPage() {
  const currentUserId = await getCurrentUserId();
  const currentUser = await getCurrentUser();

  let recommendations: any[] = [];
  try {
    const result = await withAdminDb(async (client) => {
      return await getRecommendedRoommates(client, currentUserId);
    });
    recommendations = result.items;
  } catch (err) {
    console.error("Error fetching recommendations:", err);
  }

  return (
    <div>
      {/* Onboarding Banner if Profile Not Completed */}
      {currentUser && !currentUser.isCompleted && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-xs text-amber-800">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                Hồ sơ của bạn chưa hoàn thành 30 câu hỏi khảo sát ({currentUser.answeredCount}/30 câu).
                Hãy hoàn tất để nhận được điểm số tương thích chính xác nhất!
              </span>
            </div>
            <Link
              href="/onboarding"
              className="font-bold underline text-amber-900 hover:text-amber-700 whitespace-nowrap"
            >
              Hoàn thành ngay →
            </Link>
          </div>
        </div>
      )}

      <DiscoveryView
        initialRecommendations={recommendations}
        currentUser={currentUser}
      />
    </div>
  );
}
