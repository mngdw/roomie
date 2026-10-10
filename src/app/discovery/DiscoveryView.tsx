"use client";

import React, { useState, useTransition } from "react";
import {
  Filter,
  Sparkles,
  Users,
  Search,
  CheckCircle2,
  RefreshCw,
  Home,
  SlidersHorizontal,
} from "lucide-react";
import { CandidateCard } from "@/components/CandidateCard";
import { MutualMatchModal } from "@/components/MutualMatchModal";
import { likeUserAction, passUserAction } from "@/app/actions";
import type { RecommendationResult, RecommendationFilters } from "@/lib/matching/types";

interface DiscoveryViewProps {
  initialRecommendations: RecommendationResult[];
  currentUser: {
    id: string;
    displayName: string;
    gender: string;
    housingStatus: string;
    isCompleted: boolean;
  } | null;
}

const DISTRICT_OPTIONS = [
  { code: "", label: "Tất cả quận" },
  { code: "thanh_xuan", label: "Thanh Xuân" },
  { code: "cau_giay", label: "Cầu Giấy" },
  { code: "dong_da", label: "Đống Đa" },
  { code: "hai_ba_trung", label: "Hai Bà Trưng" },
  { code: "ba_dinh", label: "Ba Đình" },
];

export function DiscoveryView({
  initialRecommendations,
  currentUser,
}: DiscoveryViewProps) {
  const [candidates, setCandidates] = useState<RecommendationResult[]>(
    initialRecommendations
  );
  const [isPending, startTransition] = useTransition();

  // Filters state
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

  // Client-side quick filter
  const filteredCandidates = candidates.filter((item) => {
    const c = item.candidate;
    if (filterGender && c.gender !== filterGender) return false;
    if (filterVerifiedOnly && !c.isVerified) return false;
    if (filterHousing && c.housingStatus !== filterHousing) return false;
    if (filterDistrict) {
      const dCode =
        c.housingStatus === "has_room" ? c.room?.districtCode : c.districtCode;
      if (dCode !== filterDistrict) return false;
    }
    if (filterMaxBudget > 0) {
      if (c.housingStatus === "has_room" && c.room) {
        if (c.room.perPersonRent > filterMaxBudget) return false;
      }
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header and Value Proposition */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Thuật toán tương thích 30 chỉ số</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Khám phá bạn cùng phòng
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Các ứng viên được sắp xếp theo tỷ lệ tương thích đa chiều (Lối sống
            25%, Sạch sẽ 20%, Giờ giấc 15%, Xã hội 15%, Giao tiếp 15%, Tài chính 10%).
          </p>
        </div>

        {/* Counter Badge */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm">
          <Users className="w-4 h-4 text-blue-600" />
          <span className="text-xs text-slate-500">Phù hợp:</span>
          <span className="text-sm font-bold text-slate-900">
            {filteredCandidates.length} ứng viên
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="my-6 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
          <span>Bộ lọc tìm kiếm</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
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
              <option value="">Tất cả</option>
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
            </select>
          </div>

          {/* Verified Checkbox */}
          <div className="flex items-end col-span-2 sm:col-span-1">
            <label className="w-full flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs font-medium text-slate-700 select-none">
              <input
                type="checkbox"
                checked={filterVerifiedOnly}
                onChange={(e) => setFilterVerifiedOnly(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Đã xác minh</span>
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Candidate Feed / Grid */}
      {filteredCandidates.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto my-12 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
            <Search className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            Không tìm thấy ứng viên phù hợp
          </h3>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Bạn đã duyệt hết các hồ sơ đủ điều kiện hoặc các tiêu chí bộ lọc hiện
            tại quá hẹp. Hãy thử mở rộng khoảng giá hoặc khu vực quận.
          </p>
          <button
            onClick={() => {
              setFilterGender("");
              setFilterDistrict("");
              setFilterHousing("");
              setFilterVerifiedOnly(false);
              setFilterMaxBudget(0);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Đặt lại tất cả bộ lọc</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCandidates.map((item) => (
            <CandidateCard
              key={item.candidate.userId}
              item={item}
              onLike={handleLike}
              onPass={handlePass}
            />
          ))}
        </div>
      )}

      {/* Mutual Match Modal */}
      <MutualMatchModal
        isOpen={matchModalOpen}
        onClose={() => setMatchModalOpen(false)}
        targetUser={matchedUser}
        currentUser={currentUser}
      />
    </div>
  );
}
