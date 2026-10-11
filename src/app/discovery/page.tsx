import { getCurrentUserId, getCurrentUser, DEFAULT_USER_ID } from "@/lib/server/session";
import { withAdminDb } from "@/lib/server/db";
import { getRecommendedRoommates } from "@/lib/matching/recommendations";
import { DiscoveryView } from "./DiscoveryView";
import Link from "next/link";
import { Sparkles, UserPlus, LogIn, Compass } from "lucide-react";

export default async function DiscoveryPage() {
  const currentUserId = await getCurrentUserId();
  const currentUser = await getCurrentUser();

  let recommendations: any[] = [];
  try {
    const result = await withAdminDb(async (client) => {
      // 1. If user is logged in and has completed onboarding, calculate real personalized matches
      if (currentUserId && currentUser?.isCompleted) {
        const userRecs = await getRecommendedRoommates(client, currentUserId);
        if (userRecs.items.length > 0) {
          return userRecs;
        }
      }
      // 2. Fallback to reference demo pool so guests and new users always see rich candidate profiles
      return await getRecommendedRoommates(client, DEFAULT_USER_ID);
    });
    recommendations = result.items;
  } catch (err) {
    console.error("Error fetching recommendations in DiscoveryPage:", err);
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/40 hover:bg-blue-500/60 text-white font-semibold transition-colors"
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
        initialRecommendations={recommendations}
        currentUser={currentUser}
      />
    </div>
  );
}
