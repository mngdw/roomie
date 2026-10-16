"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  MapPin,
  GraduationCap,
  Heart,
  X,
  Eye,
  Sparkles,
  Home,
  MessageCircle,
  Check,
  RotateCcw,
} from "lucide-react";
import { MatchScoreBadge } from "./MatchScoreBadge";
import { getHanoiAreaLabel } from "@/lib/constants/hanoi-areas";
import type { RecommendationResult } from "@/lib/matching/types";

interface CandidateCardProps {
  item: RecommendationResult;
  onLike: (targetUserId: string, targetName: string, score: number) => Promise<boolean>;
  onPass: (targetUserId: string) => Promise<void>;
  onUnlike?: (targetUserId: string) => Promise<void>;
  initialLiked?: boolean;
  initialMatched?: boolean;
  likedAt?: string | null;
}

export function CandidateCard({
  item,
  onLike,
  onPass,
  onUnlike,
  initialLiked = false,
  initialMatched = false,
  likedAt = null,
}: CandidateCardProps) {
  const { candidate, compatibility, explanation } = item;
  const [isPending, startTransition] = useTransition();
  const [isRemoved, setIsRemoved] = useState(false);
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [isMatched, setIsMatched] = useState(initialMatched);

  // Sync with parent props if updated
  React.useEffect(() => {
    setIsLiked(initialLiked);
  }, [initialLiked]);

  React.useEffect(() => {
    setIsMatched(initialMatched);
  }, [initialMatched]);

  if (isRemoved) return null;

  const handleLike = () => {
    startTransition(async () => {
      const matched = await onLike(
        candidate.userId,
        candidate.displayName,
        compatibility.finalScore
      );
      setIsLiked(true);
      if (matched) {
        setIsMatched(true);
      }
    });
  };

  const handleUnlike = () => {
    if (!onUnlike) return;
    startTransition(async () => {
      await onUnlike(candidate.userId);
      setIsLiked(false);
    });
  };

  const handlePass = () => {
    startTransition(async () => {
      await onPass(candidate.userId);
      setIsRemoved(true);
    });
  };

  const rawDistrict =
    candidate.housingStatus === "has_room" && candidate.room?.districtCode
      ? candidate.room.districtCode
      : candidate.districtCode;

  const districtName = getHanoiAreaLabel(rawDistrict, { includeCluster: true });

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
    <div
      className={`bg-white rounded-3xl border transition-all duration-200 overflow-hidden flex flex-col ${
        isMatched
          ? "border-emerald-300 shadow-sm ring-1 ring-emerald-500/15"
          : isLiked
          ? "border-pink-200 shadow-sm ring-1 ring-pink-500/10"
          : "border-slate-200/90 shadow-sm hover:shadow-md"
      }`}
    >
      {/* Status Banner if Liked or Matched */}
      {(isLiked || isMatched) && (
        <div
          className={`px-5 py-1.5 text-[11px] font-bold flex items-center justify-between ${
            isMatched
              ? "bg-emerald-50 text-emerald-700 border-b border-emerald-100"
              : "bg-pink-50/80 text-pink-700 border-b border-pink-100"
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Heart
              className={`w-3 h-3 ${
                isMatched
                  ? "fill-emerald-600 text-emerald-600"
                  : "fill-pink-500 text-pink-500"
              }`}
            />
            <span>
              {isMatched ? "Đã ghép đôi hai chiều" : "Bạn đã nhấn Thích hồ sơ này"}
            </span>
          </span>
          {likedAt && !isMatched && (
            <span className="text-[10px] font-medium text-pink-600/80">
              {new Date(likedAt).toLocaleDateString("vi-VN")}
            </span>
          )}
        </div>
      )}

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
                <span className="flex items-center gap-1 text-slate-600 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-blue-500" />
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
        {/* Pass or Unlike Button */}
        {isLiked && !isMatched && onUnlike ? (
          <button
            onClick={handleUnlike}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            title="Hủy lượt thích này"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Bỏ thích</span>
          </button>
        ) : !isMatched ? (
          <button
            onClick={handlePass}
            disabled={isPending}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-sm transition-all hover:border-slate-300 disabled:opacity-50"
          >
            <X className="w-4 h-4 text-slate-400" />
            <span>Bỏ qua</span>
          </button>
        ) : null}

        {/* View Profile Button */}
        <Link
          href={`/profile/${candidate.userId}`}
          className="inline-flex items-center justify-center gap-1 p-2.5 px-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors"
          title="Xem hồ sơ chi tiết"
        >
          <Eye className="w-4 h-4" />
          <span>Chi tiết</span>
        </Link>

        {/* Like, Liked, or Matched Button */}
        {isMatched ? (
          <Link
            href="/matches"
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Đã ghép đôi · Nhắn tin</span>
          </Link>
        ) : isLiked ? (
          <Link
            href="/matches?tab=history"
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 text-xs font-bold transition-all"
            title="Xem trong Lịch sử đã thích"
          >
            <Heart className="w-4 h-4 fill-pink-500 text-pink-500" />
            <span>Đã thích ✓</span>
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
