"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  MapPin,
  GraduationCap,
  Sparkles,
  Heart,
  X,
  User,
  Home,
  Sliders,
} from "lucide-react";
import { MatchScoreBadge } from "./MatchScoreBadge";
import { MutualMatchModal } from "./MutualMatchModal";
import { likeUserAction, passUserAction } from "@/app/actions";
import type { CandidateUser, PairScoreResult } from "@/lib/matching/types";

interface CandidateProfileHeaderProps {
  candidate: CandidateUser;
  compatibility?: PairScoreResult;
  currentUser?: {
    id: string;
    displayName: string;
  } | null;
}

export function CandidateProfileHeader({
  candidate,
  compatibility,
  currentUser,
}: CandidateProfileHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || (pathname.includes("/compatibility/") ? "compatibility" : "profile");

  const [isPending, startTransition] = useTransition();
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);

  const districtName =
    candidate.districtCode === "thanh_xuan"
      ? "Thanh Xuân"
      : candidate.districtCode === "cau_giay"
      ? "Cầu Giấy"
      : candidate.districtCode === "dong_da"
      ? "Đống Đa"
      : candidate.districtCode === "hai_ba_trung"
      ? "Hai Bà Trưng"
      : candidate.districtCode || "Hà Nội";

  const handleLike = () => {
    startTransition(async () => {
      const res = await likeUserAction(candidate.userId);
      setHasLiked(true);
      if (res.matched) {
        setMatchModalOpen(true);
      }
    });
  };

  const handlePass = () => {
    startTransition(async () => {
      await passUserAction(candidate.userId);
      router.push("/discovery");
    });
  };

  const isCompatibilityPath = pathname.startsWith(`/compatibility/${candidate.userId}`);

  return (
    <>
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-4">
          {/* Top Identity Block */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-blue-100 to-indigo-100 text-blue-700 font-bold text-2xl sm:text-3xl flex items-center justify-center border-2 border-white shadow-md">
                  {candidate.displayName[0]}
                </div>
                {candidate.isVerified && (
                  <div
                    className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm"
                    title="Đã xác minh CCCD"
                  >
                    <CheckCircle2 className="w-4 h-4 text-blue-600 fill-blue-50" />
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {candidate.displayName}
                  </h1>
                  <span className="text-sm font-semibold text-slate-500">
                    {candidate.age} tuổi
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                    {candidate.gender === "female"
                      ? "Nữ"
                      : candidate.gender === "male"
                      ? "Nam"
                      : "Khác"}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 mt-1.5 text-xs text-slate-500 flex-wrap">
                  {candidate.schoolOrWorkplace && (
                    <span className="flex items-center gap-1 font-medium text-slate-600">
                      <GraduationCap className="w-4 h-4 text-slate-400" />
                      <span>{candidate.schoolOrWorkplace}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>{districtName}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Match Badge & Action Buttons */}
            <div className="flex items-center gap-3">
              {compatibility && (
                <Link
                  href={`/compatibility/${candidate.userId}`}
                  className="hover:opacity-90 transition-opacity"
                  title="Xem phân tích chi tiết độ tương thích"
                >
                  <MatchScoreBadge score={compatibility.finalScore} size="md" />
                </Link>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePass}
                  disabled={isPending}
                  className="p-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-sm"
                  title="Bỏ qua hồ sơ này"
                >
                  <X className="w-5 h-5" />
                </button>

                <button
                  onClick={handleLike}
                  disabled={isPending || hasLiked}
                  className={`inline-flex items-center gap-1.5 py-2.5 px-4 rounded-2xl font-semibold text-xs shadow-md transition-all ${
                    hasLiked
                      ? "bg-emerald-600 text-white cursor-default"
                      : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/20"
                  }`}
                >
                  <Heart className="w-4 h-4 fill-white" />
                  <span>{hasLiked ? "Đã thích" : "Thích"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Tabs (1/3 Profile, 2/3 Lifestyle & Room, 3/3 Compatibility) */}
          <div className="mt-6 flex space-x-1 border-b border-slate-200">
            <Link
              href={`/profile/${candidate.userId}`}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 font-semibold text-xs transition-colors ${
                !isCompatibilityPath && currentTab !== "lifestyle"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <User className="w-4 h-4" />
              <span>1. Thông tin cá nhân</span>
            </Link>

            <Link
              href={`/profile/${candidate.userId}?tab=lifestyle`}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 font-semibold text-xs transition-colors ${
                !isCompatibilityPath && currentTab === "lifestyle"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Home className="w-4 h-4" />
              <span>2. Lối sống & Phòng trọ</span>
            </Link>

            <Link
              href={`/compatibility/${candidate.userId}`}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 font-semibold text-xs transition-colors ${
                isCompatibilityPath
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>3. Phân tích tương thích</span>
            </Link>
          </div>
        </div>
      </div>

      <MutualMatchModal
        isOpen={matchModalOpen}
        onClose={() => setMatchModalOpen(false)}
        targetUser={{
          id: candidate.userId,
          displayName: candidate.displayName,
          score: compatibility?.finalScore,
        }}
        currentUser={currentUser}
      />
    </>
  );
}
