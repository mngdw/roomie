"use client";

import React from "react";
import Link from "next/link";
import {
  Heart,
  Sparkles,
  MessageCircle,
  ArrowRight,
  X,
  PhoneCall,
  Mail,
  Copy,
  Check,
} from "lucide-react";

interface MutualMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: {
    id: string;
    displayName: string;
    avatarPath?: string | null;
    score?: number;
    conversationId?: string | null;
    email?: string | null;
    phone?: string | null;
    zalo?: string | null;
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
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const chatHref = targetUser.conversationId
    ? `/chat/${targetUser.conversationId}`
    : "/matches";

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
          <div className="mb-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
            <span>Chỉ số tương thích:</span>
            <span className="text-sm">{Math.round(targetUser.score)}%</span>
          </div>
        )}

        {/* Contact Info Card */}
        {(targetUser.email || targetUser.phone || targetUser.zalo) && (
          <div className="mb-5 p-3.5 bg-blue-50/80 border border-blue-100 rounded-2xl text-left text-xs space-y-2.5">
            <div className="font-bold text-blue-900 flex items-center gap-1.5 text-xs">
              <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
              <span>Thông tin liên hệ trực tiếp:</span>
            </div>

            {targetUser.phone && (
              <div className="flex items-center justify-between gap-2 text-slate-700 bg-white p-2 rounded-xl border border-blue-100/80">
                <div className="flex items-center gap-1.5 truncate">
                  <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
                  <span>SĐT / Zalo: <strong>{targetUser.phone}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <a
                    href={`tel:${targetUser.phone}`}
                    className="text-[11px] bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-0.5 rounded-lg font-semibold"
                  >
                    Gọi
                  </a>
                  <button
                    onClick={() => copyToClipboard(targetUser.phone || "", "phone")}
                    className="text-[11px] text-slate-600 hover:text-slate-900 p-1"
                    title="Sao chép"
                  >
                    {copiedField === "phone" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {targetUser.email && (
              <div className="flex items-center justify-between gap-2 text-slate-700 bg-white p-2 rounded-xl border border-blue-100/80">
                <div className="flex items-center gap-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">Email: <strong>{targetUser.email}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <a
                    href={`mailto:${targetUser.email}`}
                    className="text-[11px] bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-0.5 rounded-lg font-semibold"
                  >
                    Gửi mail
                  </a>
                  <button
                    onClick={() => copyToClipboard(targetUser.email || "", "email")}
                    className="text-[11px] text-slate-600 hover:text-slate-900 p-1"
                    title="Sao chép"
                  >
                    {copiedField === "email" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <Link
            href={chatHref}
            onClick={onClose}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/25 transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Nhắn tin ngay trên ROOMIE</span>
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
