"use client";

import React, { useState, useEffect, useTransition } from "react";
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
  MessageCircle,
  PhoneCall,
  Mail,
  Copy,
  Check,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { MatchScoreBadge } from "./MatchScoreBadge";
import { MutualMatchModal } from "./MutualMatchModal";
import {
  likeUserAction,
  passUserAction,
  unlikeUserAction,
  getRelationshipStatusAction,
  type ContactInfo,
} from "@/app/actions";
import { getHanoiAreaLabel } from "@/lib/constants/hanoi-areas";
import type { CandidateUser, PairScoreResult } from "@/lib/matching/types";

interface CandidateProfileHeaderProps {
  candidate: CandidateUser;
  compatibility?: PairScoreResult;
  currentUser?: {
    id: string;
    displayName: string;
  } | null;
  initialRelationship?: {
    hasLiked: boolean;
    hasLikedViewer: boolean;
    isMatched: boolean;
    conversationId?: string | null;
    contactInfo?: ContactInfo;
  };
}

export function CandidateProfileHeader({
  candidate,
  compatibility,
  currentUser,
  initialRelationship,
}: CandidateProfileHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || (pathname.includes("/compatibility/") ? "compatibility" : "profile");

  const [isPending, startTransition] = useTransition();
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [hasLiked, setHasLiked] = useState(initialRelationship?.hasLiked ?? false);
  const [hasLikedViewer, setHasLikedViewer] = useState(initialRelationship?.hasLikedViewer ?? false);
  const [isMatched, setIsMatched] = useState(initialRelationship?.isMatched ?? false);
  const [conversationId, setConversationId] = useState<string | null>(initialRelationship?.conversationId ?? null);
  const [contactInfo, setContactInfo] = useState<ContactInfo | undefined>(
    initialRelationship?.contactInfo || {
      email: candidate.email,
      phone: candidate.phone,
      zalo: candidate.zalo,
      facebook: candidate.facebook,
    }
  );

  useEffect(() => {
    if (!initialRelationship && currentUser?.id) {
      getRelationshipStatusAction(candidate.userId).then((res) => {
        if (res.success) {
          setHasLiked(res.hasLiked);
          setHasLikedViewer(res.hasLikedViewer);
          setIsMatched(res.isMatched);
          if (res.conversationId) setConversationId(res.conversationId);
          if (res.contactInfo) setContactInfo(res.contactInfo);
        }
      });
    }
  }, [candidate.userId, currentUser?.id, initialRelationship]);

  const districtName = getHanoiAreaLabel(candidate.districtCode, {
    includeCluster: true,
  });

  const handleLike = () => {
    startTransition(async () => {
      const res = await likeUserAction(candidate.userId);
      setHasLiked(true);
      if (res.matched) {
        setIsMatched(true);
        if (res.conversationId) setConversationId(res.conversationId);
        if (res.contactInfo) setContactInfo(res.contactInfo);
        setMatchModalOpen(true);
      }
    });
  };

  const handleUnlike = () => {
    startTransition(async () => {
      const res = await unlikeUserAction(candidate.userId);
      if (res.success) {
        setHasLiked(false);
      }
    });
  };

  const handlePass = () => {
    startTransition(async () => {
      await passUserAction(candidate.userId);
      router.push("/discovery");
    });
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const isCompatibilityPath = pathname.startsWith(`/compatibility/${candidate.userId}`);

  return (
    <>
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-4">
          {/* Match Notification Banner (if they liked viewer) */}
          {hasLikedViewer && !isMatched && !hasLiked && (
            <div className="mb-4 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200 text-xs text-pink-800 flex items-center justify-between gap-3 font-medium shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-600 flex-shrink-0 animate-pulse" />
                <span>
                  <strong>{candidate.displayName}</strong> đã chọn thích bạn! Hãy bấm <strong>Thích</strong> để ghép đôi và liên hệ trò chuyện ngay.
                </span>
              </div>
              <button
                onClick={handleLike}
                disabled={isPending}
                className="px-3.5 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 flex-shrink-0 transition-colors"
              >
                <Heart className="w-3.5 h-3.5 fill-white" />
                <span>Ghép đôi ngay</span>
              </button>
            </div>
          )}

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
                  {isMatched && (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200 font-bold">
                      <Heart className="w-3 h-3 fill-pink-500 text-pink-500" />
                      <span>Đã ghép đôi</span>
                    </span>
                  )}
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

              {isMatched ? (
                /* When Matched: Direct Chat & Contact Buttons */
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={conversationId ? `/chat/${conversationId}` : "/matches"}
                    className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-2xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Nhắn tin ngay</span>
                  </Link>

                  <button
                    onClick={() => setContactModalOpen(true)}
                    className="inline-flex items-center gap-1.5 py-2.5 px-3.5 rounded-2xl font-semibold text-xs border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors shadow-sm"
                    title="Xem số điện thoại, Zalo, Email"
                  >
                    <PhoneCall className="w-4 h-4 text-emerald-600" />
                    <span>Thông tin liên hệ</span>
                  </button>
                </div>
              ) : (
                /* Not Matched: Like & Pass Buttons */
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePass}
                    disabled={isPending}
                    className="p-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-sm"
                    title="Bỏ qua hồ sơ này"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  {hasLiked ? (
                    <div className="flex items-center gap-1.5">
                      <Link
                        href="/matches?tab=history"
                        className="inline-flex items-center gap-1.5 py-2.5 px-3.5 rounded-2xl font-bold text-xs bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100 transition-colors"
                        title="Xem trong Lịch sử đã thích"
                      >
                        <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
                        <span>Đã gửi thích</span>
                      </Link>
                      <button
                        onClick={handleUnlike}
                        disabled={isPending}
                        className="p-2.5 rounded-2xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 transition-colors shadow-sm"
                        title="Hủy lượt thích"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleLike}
                      disabled={isPending}
                      className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-2xl font-semibold text-xs shadow-md transition-all bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/20"
                    >
                      <Heart className="w-4 h-4 fill-white" />
                      <span>Thích</span>
                    </button>
                  )}
                </div>
              )}
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

      {/* Mutual Match Modal */}
      <MutualMatchModal
        isOpen={matchModalOpen}
        onClose={() => setMatchModalOpen(false)}
        targetUser={{
          id: candidate.userId,
          displayName: candidate.displayName,
          score: compatibility?.finalScore,
          conversationId: conversationId,
          email: contactInfo?.email,
          phone: contactInfo?.phone,
          zalo: contactInfo?.zalo,
        }}
        currentUser={currentUser}
      />

      {/* Contact Info Modal */}
      {contactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setContactModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl border border-emerald-200">
                <PhoneCall className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Thông tin liên hệ trực tiếp
                </h3>
                <p className="text-xs text-slate-500">
                  Bạn cùng phòng: <strong className="text-slate-800">{candidate.displayName}</strong>
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Phone / Zalo */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Số điện thoại / Zalo</span>
                  {contactInfo?.phone && (
                    <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                      Sẵn sàng
                    </span>
                  )}
                </div>
                {contactInfo?.phone ? (
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-sm font-bold text-slate-900 font-mono">
                      {contactInfo.phone}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${contactInfo.phone}`}
                        className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors"
                      >
                        Gọi ngay
                      </a>
                      <a
                        href={`https://zalo.me/${contactInfo.phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors"
                      >
                        Mở Zalo
                      </a>
                      <button
                        onClick={() => copyToClipboard(contactInfo?.phone || "", "phone")}
                        className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600"
                        title="Sao chép"
                      >
                        {copiedField === "phone" ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    Thành viên chưa thêm số điện thoại cá nhân. Bạn hãy trao đổi qua tin nhắn ROOMIE hoặc Email nhé!
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Email tài khoản
                </div>
                {contactInfo?.email ? (
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      {contactInfo.email}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <a
                        href={`mailto:${contactInfo.email}`}
                        className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors"
                      >
                        Gửi mail
                      </a>
                      <button
                        onClick={() => copyToClipboard(contactInfo?.email || "", "email")}
                        className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600"
                        title="Sao chép"
                      >
                        {copiedField === "email" ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">Chưa có thông tin email.</p>
                )}
              </div>

              {/* In-app chat shortcut */}
              <div className="pt-2">
                <Link
                  href={conversationId ? `/chat/${conversationId}` : "/matches"}
                  onClick={() => setContactModalOpen(false)}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Mở khung chat trên ROOMIE</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
