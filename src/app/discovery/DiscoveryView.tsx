"use client";

import React, { useState, useTransition } from "react";
import {
  Sparkles,
  Users,
  Search,
  CheckCircle2,
  RefreshCw,
  SlidersHorizontal,
  Compass,
  ArrowRight,
  X,
  Star,
  Award,
  ChevronRight,
  Check,
  TrendingUp,
} from "lucide-react";
import { CandidateCard } from "@/components/CandidateCard";
import { MutualMatchModal } from "@/components/MutualMatchModal";
import { likeUserAction, passUserAction } from "@/app/actions";
import type { RecommendationResult } from "@/lib/matching/types";

interface DiscoveryViewProps {
  initialTopRecommendations: RecommendationResult[];
  initialAllCandidates: RecommendationResult[];
  currentUser: {
    id: string;
    displayName: string;
    gender: string;
    housingStatus: string;
    isCompleted: boolean;
  } | null;
  isNewlyCompleted?: boolean;
  initialTab?: "top_picks" | "all_explore";
}

const DISTRICT_OPTIONS = [
  { code: "", label: "Tất cả quận" },
  { code: "hn-thanh-xuan", label: "Thanh Xuân" },
  { code: "hn-cau-giay", label: "Cầu Giấy" },
  { code: "hn-dong-da", label: "Đống Đa" },
  { code: "hn-hai-ba-trung", label: "Hai Bà Trưng" },
  { code: "hn-ba-dinh", label: "Ba Đình" },
  { code: "hn-hoang-mai", label: "Hoàng Mai" },
  { code: "hn-nam-tu-liem", label: "Nam Từ Liêm" },
  { code: "hn-bac-tu-liem", label: "Bắc Từ Liêm" },
  { code: "hn-ha-dong", label: "Hà Đông" },
  { code: "hn-tay-ho", label: "Tây Hồ" },
  { code: "hn-long-bien", label: "Long Biên" },
];

export function DiscoveryView({
  initialTopRecommendations,
  initialAllCandidates,
  currentUser,
  isNewlyCompleted = false,
  initialTab = "top_picks",
}: DiscoveryViewProps) {
  const [activeTab, setActiveTab] = useState<"top_picks" | "all_explore">(
    initialTab
  );
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(isNewlyCompleted);
  const [isPending, startTransition] = useTransition();

  // Candidates state
  const [topCandidates, setTopCandidates] = useState<RecommendationResult[]>(
    initialTopRecommendations
  );
  const [allCandidates, setAllCandidates] = useState<RecommendationResult[]>(
    initialAllCandidates
  );

  // Filters state (for Explore Further mode)
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterGender, setFilterGender] = useState<string>("");
  const [filterDistrict, setFilterDistrict] = useState<string>("");
  const [filterHousing, setFilterHousing] = useState<string>("");
  const [filterVerifiedOnly, setFilterVerifiedOnly] = useState<boolean>(false);
  const [filterMaxBudget, setFilterMaxBudget] = useState<number>(0);

  // Mutual match modal state
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [matchedUser, setMatchedUser] = useState<{
    id: string;
    displayName: string;
    score?: number;
  }>({ id: "", displayName: "" });

  const handleLike = async (
    targetUserId: string,
    targetName: string,
    score: number
  ): Promise<boolean> => {
    const res = await likeUserAction(targetUserId);
    if (res.matched) {
      setMatchedUser({
        id: targetUserId,
        displayName: targetName,
        score,
      });
      setMatchModalOpen(true);
      return true;
    }
    return false;
  };

  const handlePass = async (targetUserId: string) => {
    await passUserAction(targetUserId);
  };

  // Filtered list for "Khám phá tiếp" (all candidates)
  const filteredExploreCandidates = allCandidates.filter((item) => {
    const c = item.candidate;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = c.displayName.toLowerCase().includes(q);
      const bioMatch = c.bio?.toLowerCase().includes(q) ?? false;
      const schoolMatch =
        c.schoolOrWorkplace?.toLowerCase().includes(q) ?? false;
      if (!nameMatch && !bioMatch && !schoolMatch) return false;
    }
    if (filterGender && c.gender !== filterGender) return false;
    if (filterVerifiedOnly && !c.isVerified) return false;
    if (filterHousing && c.housingStatus !== filterHousing) return false;
    if (filterDistrict) {
      const dCode =
        c.housingStatus === "has_room" ? c.room?.districtCode : c.districtCode;
      if (
        dCode !== filterDistrict &&
        dCode !== filterDistrict.replace(/^hn-/, "") &&
        `hn-${dCode}` !== filterDistrict
      ) {
        return false;
      }
    }
    if (filterMaxBudget > 0) {
      if (c.housingStatus === "has_room" && c.room) {
        if (c.room.perPersonRent > filterMaxBudget) return false;
      } else if (c.roomPreferences?.budgetMax) {
        if (c.roomPreferences.budgetMax > filterMaxBudget) return false;
      }
    }
    return true;
  });

  const resetFilters = () => {
    setSearchQuery("");
    setFilterGender("");
    setFilterDistrict("");
    setFilterHousing("");
    setFilterVerifiedOnly(false);
    setFilterMaxBudget(0);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* ==============================================================
          1. CELEBRATION / POST-ONBOARDING BANNER
          ============================================================== */}
      {showWelcomeBanner && (
        <div className="mb-8 relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-6 sm:p-8 shadow-xl shadow-blue-500/10">
          <button
            onClick={() => setShowWelcomeBanner(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
            title="Đóng thông báo"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-blue-100 text-xs font-bold mb-3 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>Hoàn tất trắc nghiệm tương thích 30 chỉ số 🎉</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
              Chào mừng {currentUser?.displayName || "bạn"}! Đây là các đề xuất phù hợp nhất dành cho bạn
            </h2>
            <p className="text-sm text-blue-100 leading-relaxed mb-5">
              Hệ thống đã phân tích lối sống, giờ giấc sinh hoạt và tiêu chí phòng trọ của bạn.
              Dưới đây là danh sách những bạn cùng phòng có <strong>mức độ tương thích cao nhất</strong>.
              Hãy xem qua hồ sơ của họ, hoặc nhấn <strong>"Khám phá tiếp"</strong> nếu bạn muốn tìm kiếm thêm theo các tiêu chí khác!
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  setActiveTab("top_picks");
                  setShowWelcomeBanner(false);
                }}
                className="px-4 py-2.5 rounded-xl bg-white text-blue-700 font-bold text-xs shadow-md hover:bg-blue-50 transition-all flex items-center gap-1.5"
              >
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                <span>Xem người dùng đề xuất cao</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab("all_explore");
                  setShowWelcomeBanner(false);
                }}
                className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 backdrop-blur-sm"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Khám phá tiếp tất cả ứng viên →</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          2. HEADER & MODE SWITCHER TABS
          ============================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Thuật toán so khớp tương thích đa chiều</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {activeTab === "top_picks"
              ? "Người dùng đề xuất tương thích cao"
              : "Khám phá tất cả bạn cùng phòng"}
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            {activeTab === "top_picks"
              ? "Danh sách các ứng viên đạt độ tương thích cao nhất được thuật toán tuyển chọn riêng cho bạn dựa trên 30 câu hỏi khảo sát."
              : "Tìm kiếm mở rộng trong toàn bộ cộng đồng với bộ lọc chi tiết theo quận Hà Nội, ngân sách, giới tính và thói quen sinh hoạt."}
          </p>
        </div>

        {/* Tab Switcher (Segmented Control) */}
        <div className="flex items-center p-1.5 rounded-2xl bg-slate-100 border border-slate-200 self-start lg:self-auto shadow-inner">
          <button
            onClick={() => setActiveTab("top_picks")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "top_picks"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Star
              className={`w-3.5 h-3.5 ${
                activeTab === "top_picks"
                  ? "text-yellow-500 fill-yellow-500"
                  : "text-slate-400"
              }`}
            />
            <span>Đề xuất tương thích cao</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === "top_picks"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {topCandidates.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("all_explore")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "all_explore"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Compass
              className={`w-3.5 h-3.5 ${
                activeTab === "all_explore" ? "text-blue-600" : "text-slate-400"
              }`}
            />
            <span>Khám phá tiếp</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === "all_explore"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {allCandidates.length}
            </span>
          </button>
        </div>
      </div>

      {/* ==============================================================
          3. TAB 1: ĐỀ XUẤT TƯƠNG THÍCH CAO (TOP PICKS)
          ============================================================== */}
      {activeTab === "top_picks" && (
        <div className="py-6">
          {/* Top Recommendations Feed */}
          {topCandidates.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto my-8 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
                <Compass className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Chưa có đề cử khắt khe thỏa mãn 100% tiêu chí cứng
              </h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                Tiêu chuẩn tìm bạn cùng phòng hiện tại khá chặt chẽ. Hãy bấm{" "}
                <strong>"Khám phá tiếp"</strong> để xem các bạn cùng phòng tiềm năng
                khác trong cộng đồng có độ tương thích cao về lối sống!
              </p>
              <button
                onClick={() => setActiveTab("all_explore")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-colors"
              >
                <Compass className="w-4 h-4" />
                <span>Khám phá tiếp tất cả ứng viên ({allCandidates.length})</span>
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>
                    Hiển thị <strong>{topCandidates.length}</strong> ứng viên tương thích cao nhất
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab("all_explore")}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                >
                  <span>Xem tất cả ứng viên</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {topCandidates.map((item) => (
                  <CandidateCard
                    key={item.candidate.userId}
                    item={item}
                    onLike={handleLike}
                    onPass={handlePass}
                  />
                ))}
              </div>

              {/* Transition Banner: "Nếu không có ai phù hợp -> Khám phá tiếp" */}
              <div className="mt-12 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-700/60">
                <div className="space-y-2 text-center md:text-left">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold">
                    <Compass className="w-3.5 h-3.5 text-blue-400" />
                    <span>Mở rộng cơ hội tìm bạn cùng phòng</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
                    Chưa thấy ai phù hợp với nhu cầu trong những người được đề cử?
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                    Đừng ngần ngại! Bạn có thể tiếp tục <strong>khám phá toàn bộ danh sách bạn cùng phòng</strong> trong hệ thống với bộ lọc linh hoạt theo quận, ngân sách và thói quen sinh hoạt để chủ động tìm kiếm người ưng ý nhất.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveTab("all_explore");
                    window.scrollTo({ top: 180, behavior: "smooth" });
                  }}
                  className="px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition-all hover:scale-105 flex items-center gap-2 flex-shrink-0"
                >
                  <span>Khám phá tiếp tất cả ứng viên ({allCandidates.length})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ==============================================================
          4. TAB 2: KHÁM PHÁ TIẾP (TẤT CẢ ỨNG VIÊN & BỘ LỌC)
          ============================================================== */}
      {activeTab === "all_explore" && (
        <div className="py-6">
          {/* Quick back pill */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setActiveTab("top_picks")}
              className="text-xs font-semibold text-slate-500 hover:text-blue-600 inline-flex items-center gap-1 transition-colors"
            >
              <span>← Quay lại danh sách đề xuất tương thích cao</span>
            </button>
            <div className="text-xs font-bold text-slate-700">
              Tìm thấy {filteredExploreCandidates.length} / {allCandidates.length} ứng viên
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="mb-6 bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                <span>Bộ lọc tìm kiếm chi tiết</span>
              </div>
              {(searchQuery ||
                filterGender ||
                filterDistrict ||
                filterHousing ||
                filterVerifiedOnly ||
                filterMaxBudget > 0) && (
                <button
                  onClick={resetFilters}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Đặt lại bộ lọc</span>
                </button>
              )}
            </div>

            {/* Keyword Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên bạn cùng phòng, trường đại học hoặc từ khóa trong giới thiệu..."
                className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter Dropdowns Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-1">
              {/* Gender Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Giới tính
                </label>
                <select
                  value={filterGender}
                  onChange={(e) => setFilterGender(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 py-2 px-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tất cả giới tính</option>
                  <option value="female">Nữ</option>
                  <option value="male">Nam</option>
                </select>
              </div>

              {/* District Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Khu vực (Hà Nội)
                </label>
                <select
                  value={filterDistrict}
                  onChange={(e) => setFilterDistrict(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 py-2 px-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DISTRICT_OPTIONS.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Housing Status Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Tình trạng phòng
                </label>
                <select
                  value={filterHousing}
                  onChange={(e) => setFilterHousing(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 py-2 px-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tất cả tình trạng</option>
                  <option value="has_room">Đã có phòng sẵn</option>
                  <option value="looking_for_room">Đang tìm phòng</option>
                </select>
              </div>

              {/* Budget Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Ngân sách tối đa
                </label>
                <select
                  value={filterMaxBudget}
                  onChange={(e) => setFilterMaxBudget(Number(e.target.value))}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 py-2 px-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="0">Tất cả mức giá</option>
                  <option value="2000000">≤ 2.0 triệu/tháng</option>
                  <option value="2500000">≤ 2.5 triệu/tháng</option>
                  <option value="3000000">≤ 3.0 triệu/tháng</option>
                  <option value="4000000">≤ 4.0 triệu/tháng</option>
                  <option value="5000000">≤ 5.0 triệu/tháng</option>
                </select>
              </div>

              {/* Verified Only Checkbox */}
              <div className="flex items-end col-span-2 sm:col-span-1">
                <label className="w-full flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs font-medium text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={filterVerifiedOnly}
                    onChange={(e) => setFilterVerifiedOnly(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span className="flex items-center gap-1 truncate">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Đã xác minh</span>
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Candidates Grid */}
          {filteredExploreCandidates.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto my-12 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
                <Search className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Không tìm thấy ứng viên phù hợp với bộ lọc
              </h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                Các tiêu chí tìm kiếm hiện tại có thể hơi chặt chẽ. Bạn hãy thử mở rộng khoảng giá hoặc chọn tất cả quận để xem thêm nhiều hồ sơ bạn cùng phòng nhé.
              </p>
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Đặt lại tất cả bộ lọc</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExploreCandidates.map((item) => (
                <CandidateCard
                  key={item.candidate.userId}
                  item={item}
                  onLike={handleLike}
                  onPass={handlePass}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==============================================================
          5. MUTUAL MATCH CELEBRATION MODAL
          ============================================================== */}
      <MutualMatchModal
        isOpen={matchModalOpen}
        onClose={() => setMatchModalOpen(false)}
        targetUser={matchedUser}
        currentUser={currentUser}
      />
    </div>
  );
}
