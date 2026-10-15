"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  MapPin,
  GraduationCap,
  Building,
  Heart,
  X,
  Eye,
  Sparkles,
  Home,
  Moon,
  Clock,
  Sparkle,
  MessageCircle,
} from "lucide-react";
import { MatchScoreBadge } from "./MatchScoreBadge";
import type { RecommendationResult } from "@/lib/matching/types";

interface CandidateCardProps {
  item: RecommendationResult;
  onLike: (targetUserId: string, targetName: string, score: number) => Promise<boolean>;
  onPass: (targetUserId: string) => Promise<void>;
}

export function CandidateCard({ item, onLike, onPass }: CandidateCardProps) {
  const { candidate, compatibility, explanation } = item;
  const [isPending, startTransition] = useTransition();
  const [isRemoved, setIsRemoved] = useState(false);
  const [isMatched, setIsMatched] = useState(false);
  const [actionType, setActionType] = useState<"like" | "pass" | null>(null);

  if (isRemoved) return null;

  const handleLike = () => {
    setActionType("like");
    startTransition(async () => {
      const matched = await onLike(
        candidate.userId,
        candidate.displayName,
        compatibility.finalScore
      );
      if (matched) {
        setIsMatched(true);
      } else {
        setIsRemoved(true);
      }
    });
  };

  const handlePass = () => {
    setActionType("pass");
    startTransition(async () => {
      await onPass(candidate.userId);
      setIsRemoved(true);
    });
  };

  // District name mapping
  const DISTRICT_NAMES_MAP: Record<string, string> = {
    "hn-thanh-xuan": "Thanh Xuân",
    "thanh_xuan": "Thanh Xuân",
    "hn-cau-giay": "Cầu Giấy",
    "cau_giay": "Cầu Giấy",
    "hn-dong-da": "Đống Đa",
    "dong_da": "Đống Đa",
    "hn-hai-ba-trung": "Hai Bà Trưng",
    "hai_ba_trung": "Hai Bà Trưng",
    "hn-ba-dinh": "Ba Đình",
    "ba_dinh": "Ba Đình",
    "hn-hoang-mai": "Hoàng Mai",
    "hn-nam-tu-liem": "Nam Từ Liêm",
    "hn-bac-tu-liem": "Bắc Từ Liêm",
    "hn-ha-dong": "Hà Đông",
    "hn-tay-ho": "Tây Hồ",
    "hn-long-bien": "Long Biên",
  };

  const rawDistrict =
    candidate.housingStatus === "has_room" && candidate.room?.districtCode
      ? candidate.room.districtCode
      : candidate.districtCode;

  const districtName =
    (rawDistrict && DISTRICT_NAMES_MAP[rawDistrict]) || rawDistrict || "Hà Nội";

  // Calculate rent display
  let rentDisplay = "";
  if (candidate.housingStatus === "has_room" && candidate.room) {
    const rent = Math.round(candidate.room.perPersonRent / 100000) / 10;
    rentDisplay = `${rent} triệu/tháng (đã chia)`;
  } else if (candidate.roomPreferences) {
    const maxB = Math.round(candidate.roomPreferences.budgetMax / 100000) / 10;
    rentDisplay = `Ngân sách ~${maxB} triệu`;
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col">
      {/* Top Banner / Card Head */}
      <div className="p-5 sm:p-6 pb-4">
        <div className="flex items-start justify-between gap-3">
          {/* Avatar and Basic Identity */}
          <div className="flex items-center space-x-3.5">
            <div className="relative">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-blue-100 to-indigo-100 text-blue-700 font-bold text-xl sm:text-2xl flex items-center justify-center border border-blue-200 shadow-sm">
                {candidate.displayName[0]}
              </div>
              {candidate.isVerified && (
                <div
                  className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm"
                  title="Hồ sơ đã xác minh CCCD"
                >
                  <CheckCircle2 className="w-4 h-4 text-blue-600 fill-blue-50" />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-bold text-lg text-slate-900 tracking-tight">
                  {candidate.displayName}
                </h3>
                <span className="text-sm text-slate-500 font-medium">
                  {candidate.age} tuổi
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                  {candidate.gender === "female"
                    ? "Nữ"
                    : candidate.gender === "male"
                    ? "Nam"
                    : "Khác"}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                {candidate.schoolOrWorkplace && (
                  <span className="flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                    <span>{candidate.schoolOrWorkplace}</span>
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{districtName}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Match Score Badge */}
          <div className="flex-shrink-0">
            <MatchScoreBadge score={compatibility.finalScore} size="sm" />
          </div>
        </div>

        {/* Housing Status & Rent Tag */}
        <div className="mt-4 flex items-center gap-2 flex-wrap text-xs">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold ${
              candidate.housingStatus === "has_room"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-blue-50 text-blue-700 border border-blue-200"
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>
              {candidate.housingStatus === "has_room"
                ? "Đã có phòng"
                : "Đang tìm phòng"}
            </span>
          </span>

          {rentDisplay && (
            <span className="text-slate-600 font-medium bg-slate-100 px-2.5 py-1 rounded-lg">
              {rentDisplay}
            </span>
          )}

          {candidate.isSmoker ? (
            <span className="text-amber-700 bg-amber-50 px-2 py-1 rounded-lg text-[11px] font-medium border border-amber-200">
              Có hút thuốc
            </span>
          ) : (
            <span className="text-teal-700 bg-teal-50 px-2 py-1 rounded-lg text-[11px] font-medium border border-teal-200">
              Không hút thuốc
            </span>
          )}
        </div>

        {/* Bio */}
        {candidate.bio && (
          <p className="mt-3 text-xs text-slate-600 line-clamp-2 leading-relaxed italic">
            "{candidate.bio}"
          </p>
        )}

        {/* Top Compatibility Highlights (Why You Match) */}
        {explanation.whyYouMatch.length > 0 && (
          <div className="mt-4 pt-3.5 border-t border-slate-100">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-500" />
              <span>Điểm tương đồng nổi bật</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {explanation.whyYouMatch.slice(0, 2).map((h, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                  <span className="line-clamp-1">{h.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Card Action Footer */}
      <div className="mt-auto px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
        {/* Pass Button */}
        <button
          onClick={handlePass}
          disabled={isPending}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-sm transition-all hover:border-slate-300 disabled:opacity-50"
        >
          <X className="w-4 h-4 text-slate-400" />
          <span>Bỏ qua</span>
        </button>

        {/* View Profile Button */}
        <Link
          href={`/profile/${candidate.userId}`}
          className="inline-flex items-center justify-center gap-1 p-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors"
          title="Xem hồ sơ chi tiết"
        >
          <Eye className="w-4 h-4" />
          <span className="hidden sm:inline">Chi tiết</span>
        </Link>

        {/* Like or Matched Button */}
        {isMatched ? (
          <Link
            href="/matches"
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Đã ghép đôi · Nhắn tin</span>
          </Link>
        ) : (
          <button
            onClick={handleLike}
            disabled={isPending}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all disabled:opacity-50"
          >
            <Heart className="w-4 h-4 fill-white" />
            <span>Thích</span>
          </button>
        )}
      </div>
    </div>
  );
}
