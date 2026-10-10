"use client";

import React from "react";
import Link from "next/link";
import { Heart, Sparkles, MessageCircle, ArrowRight, X } from "lucide-react";

interface MutualMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: {
    id: string;
    displayName: string;
    avatarPath?: string | null;
    score?: number;
  };
  currentUser?: {
    displayName?: string;
    avatarPath?: string | null;
  } | null;
}

export function MutualMatchModal({
  isOpen,
  onClose,
  targetUser,
  currentUser,
}: MutualMatchModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl text-center border border-slate-100 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Celebration Header */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30 mb-4 animate-bounce">
          <Heart className="w-7 h-7 fill-white" />
        </div>

        <h3 className="text-2xl font-black text-slate-900 tracking-tight">
          Ghép đôi thành công!
        </h3>
        <p className="text-sm text-slate-600 mt-1.5">
          Cả bạn và{" "}
          <strong className="text-blue-600 font-bold">
            {targetUser.displayName}
          </strong>{" "}
          đều đã chọn thích nhau.
        </p>

        {/* Paired Avatars Display */}
        <div className="my-6 flex items-center justify-center -space-x-4">
          <div className="relative z-10 w-20 h-20 rounded-full border-4 border-white bg-blue-100 text-blue-700 font-bold text-2xl flex items-center justify-center shadow-md">
            {currentUser?.displayName?.[0] || "B"}
          </div>
          <div className="relative z-20 w-10 h-10 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-lg border-2 border-white">
            <Sparkles className="w-5 h-5 fill-white" />
          </div>
          <div className="relative z-10 w-20 h-20 rounded-full border-4 border-white bg-purple-100 text-purple-700 font-bold text-2xl flex items-center justify-center shadow-md">
            {targetUser.displayName?.[0] || "U"}
          </div>
        </div>

        {targetUser.score !== undefined && (
          <div className="mb-6 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
            <span>Chỉ số tương thích:</span>
            <span className="text-sm">{Math.round(targetUser.score)}%</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <Link
            href="/matches"
            onClick={onClose}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/25 transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Trò chuyện ngay</span>
          </Link>

          <Link
            href={`/profile/${targetUser.id}`}
            onClick={onClose}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm transition-colors"
          >
            <span>Xem hồ sơ bạn cùng phòng</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-600 pt-1 font-medium transition-colors"
          >
            Tiếp tục khám phá người khác
          </button>
        </div>
      </div>
    </div>
  );
}
