"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Eye,
  Sparkles,
  MapPin,
  CheckCircle2,
  Compass,
  PhoneCall,
  Mail,
  History,
  Clock,
  RotateCcw,
  UserCheck,
  Home,
} from "lucide-react";
import { MatchScoreBadge } from "@/components/MatchScoreBadge";
import { MutualMatchModal } from "@/components/MutualMatchModal";
import { likeUserAction, unlikeUserAction } from "@/app/actions";
import { getHanoiAreaLabel } from "@/lib/constants/hanoi-areas";
import type { CandidateUser, PairScoreResult } from "@/lib/matching/types";

export interface MatchItem {
  matchId: string;
  matchedAt: string;
  conversationId?: string | null;
  partner: CandidateUser;
  compatibility: PairScoreResult | null;
}

export interface SentLikeItem {
  targetUserId: string;
  likedAt: string;
  isMatched: boolean;
  conversationId?: string | null;
  target: CandidateUser;
  compatibility: PairScoreResult | null;
}

export interface ReceivedLikeItem {
  fromUserId: string;
  likedAt: string;
  isMatched: boolean;
  conversationId?: string | null;
  sender: CandidateUser;
  compatibility: PairScoreResult | null;
}

interface MatchesClientProps {
  initialMatches: MatchItem[];
  initialSentLikes: SentLikeItem[];
  initialReceivedLikes: ReceivedLikeItem[];
  currentUser: {
    id: string;
    displayName: string;
  } | null;
  initialTab?: "matches" | "history" | "received";
}

export function MatchesClient({
  initialMatches,
  initialSentLikes,
  initialReceivedLikes,
  currentUser,
  initialTab = "matches",
}: MatchesClientProps) {
  const [activeTab, setActiveTab] = useState<"matches" | "history" | "received">(
    initialTab
  );
  const [matches, setMatches] = useState<MatchItem[]>(initialMatches);
  const [sentLikes, setSentLikes] = useState<SentLikeItem[]>(initialSentLikes);
  const [receivedLikes, setReceivedLikes] =
    useState<ReceivedLikeItem[]>(initialReceivedLikes);
  const [isPending, startTransition] = useTransition();

  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [newlyMatchedUser, setNewlyMatchedUser] = useState<{
    id: string;
    displayName: string;
    score?: number;
    conversationId?: string | null;
    email?: string | null;
    phone?: string | null;
    zalo?: string | null;
  }>({ id: "", displayName: "" });

  const handleUnlike = (targetUserId: string) => {
    startTransition(async () => {
      const res = await unlikeUserAction(targetUserId);
      if (res.success) {
        setSentLikes((prev) =>
          prev.filter((item) => item.targetUserId !== targetUserId)
        );
      }
    });
  };

  const handleLikeBack = (item: ReceivedLikeItem) => {
    startTransition(async () => {
      const res = await likeUserAction(item.fromUserId);
      if (res.success) {
        const convId = res.conversationId || item.conversationId || null;
        // Mark as matched in receivedLikes
        setReceivedLikes((prev) =>
          prev.map((r) =>
            r.fromUserId === item.fromUserId
              ? { ...r, isMatched: true, conversationId: convId }
              : r
          )
        );
        // Add to sentLikes if not already present
        setSentLikes((prev) => {
          const exists = prev.some((s) => s.targetUserId === item.fromUserId);
          if (exists) {
            return prev.map((s) =>
              s.targetUserId === item.fromUserId
                ? { ...s, isMatched: true, conversationId: convId }
                : s
            );
          }
          return [
            {
              targetUserId: item.fromUserId,
              likedAt: new Date().toISOString(),
              isMatched: true,
              conversationId: convId,
              target: item.sender,
              compatibility: item.compatibility,
            },
            ...prev,
          ];
        });
        // Add to matches
        if (res.matched) {
          setMatches((prev) => {
            if (prev.some((m) => m.partner.userId === item.fromUserId)) {
              return prev;
            }
            return [
              {
                matchId: res.matchId || `match-${item.fromUserId}`,
                matchedAt: new Date().toISOString(),
                conversationId: convId,
                partner: {
                  ...item.sender,
                  email: res.contactInfo?.email ?? item.sender.email,
                  phone: res.contactInfo?.phone ?? item.sender.phone,
                  zalo: res.contactInfo?.zalo ?? item.sender.zalo,
                },
                compatibility: item.compatibility,
              },
              ...prev,
            ];
          });

          setNewlyMatchedUser({
            id: item.fromUserId,
            displayName: item.sender.displayName,
            score: item.compatibility?.finalScore,
            conversationId: convId,
            email: res.contactInfo?.email ?? item.sender.email,
            phone: res.contactInfo?.phone ?? item.sender.phone,
            zalo: res.contactInfo?.zalo ?? item.sender.zalo,
          });
          setMatchModalOpen(true);
        }
      }
    });
  };

  const pendingReceivedCount = receivedLikes.filter((r) => !r.isMatched).length;

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header & Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-8 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 text-pink-700 text-xs font-bold mb-2">
            <Heart className="w-3.5 h-3.5 fill-pink-500 text-pink-500" />
            <span>Kết nối & Lịch sử tương tác</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {activeTab === "matches"
              ? "Danh sách bạn cùng phòng đã ghép đôi"
              : activeTab === "history"
              ? "Lịch sử những người bạn đã nhấn Thích"
              : "Những người đã nhấn Thích bạn"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            {activeTab === "matches"
              ? "Đây là những người đã thích bạn và bạn cũng đã thích họ. Hãy bắt đầu trò chuyện để thảo luận chi tiết về việc ở chung!"
              : activeTab === "history"
              ? "Xem lại toàn bộ những người bạn đã nhấn Thích, thời điểm thích và trạng thái phản hồi của họ."
              : "Những thành viên ấn tượng với hồ sơ của bạn. Nhấn Thích lại để ghép đôi hai chiều và trò chuyện ngay!"}
          </p>
        </div>

        {/* Segmented Control Tabs */}
        <div className="flex flex-wrap items-center p-1.5 rounded-2xl bg-slate-100 border border-slate-200 self-start lg:self-auto shadow-inner gap-1">
          <button
            onClick={() => setActiveTab("matches")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "matches"
                ? "bg-white text-pink-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Heart
              className={`w-3.5 h-3.5 ${
                activeTab === "matches"
                  ? "fill-pink-500 text-pink-500"
                  : "text-slate-400"
              }`}
            />
            <span>Đã ghép đôi</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === "matches"
                  ? "bg-pink-100 text-pink-700"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {matches.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "history"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <History
              className={`w-3.5 h-3.5 ${
                activeTab === "history" ? "text-blue-600" : "text-slate-400"
              }`}
            />
            <span>Lịch sử đã thích</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === "history"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {sentLikes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("received")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "received"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UserCheck
              className={`w-3.5 h-3.5 ${
                activeTab === "received" ? "text-emerald-600" : "text-slate-400"
              }`}
            />
            <span>Đã thích bạn</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                pendingReceivedCount > 0
                  ? "bg-rose-500 text-white"
                  : activeTab === "received"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {receivedLikes.length}
            </span>
          </button>
        </div>
      </div>

      {/* ==============================================================
          TAB 1: ĐÃ GHÉP ĐÔI (MUTUAL MATCHES)
          ============================================================== */}
      {activeTab === "matches" && (
        <>
          {matches.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-10 sm:p-12 text-center max-w-lg mx-auto my-8 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-pink-50 text-pink-500 flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 fill-pink-100" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Chưa có bạn cùng phòng nào ghép đôi hai chiều
              </h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                Khi bạn và một người khác cùng chọn "Thích" nhau, họ sẽ xuất hiện tại
                đây để bạn bắt đầu làm quen và trò chuyện.
                {sentLikes.length > 0 && (
                  <span className="block mt-2 font-semibold text-blue-600">
                    Bạn hiện đã nhấn thích {sentLikes.length} người — hãy bấm sang tab "Lịch sử đã thích" để xem lại!
                  </span>
                )}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {sentLikes.length > 0 && (
                  <button
                    onClick={() => setActiveTab("history")}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 font-bold text-xs transition-all"
                  >
                    <History className="w-4 h-4" />
                    <span>Xem Lịch sử đã thích ({sentLikes.length})</span>
                  </button>
                )}
                <Link
                  href="/discovery"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all"
                >
                  <Compass className="w-4 h-4" />
                  <span>Khám phá ứng viên ngay</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {matches.map((m) => {
                const areaLabel = getHanoiAreaLabel(
                  m.partner.housingStatus === "has_room" && m.partner.room?.districtCode
                    ? m.partner.room.districtCode
                    : m.partner.districtCode,
                  { includeCluster: true }
                );
                return (
                  <div
                    key={m.matchId}
                    className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center space-x-3.5">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-100 to-purple-100 text-purple-700 font-bold text-xl flex items-center justify-center border border-purple-200 shadow-sm">
                            {m.partner.displayName[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-bold text-base text-slate-900">
                                {m.partner.displayName}
                              </h3>
                              {m.partner.isVerified && (
                                <CheckCircle2 className="w-4 h-4 text-blue-600 fill-blue-50" />
                              )}
                              <span className="text-xs text-slate-500">
                                ({m.partner.age}t)
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-blue-500" />
                              <span>{areaLabel}</span>
                            </div>
                          </div>
                        </div>

                        {m.compatibility && (
                          <MatchScoreBadge
                            score={m.compatibility.finalScore}
                            size="sm"
                          />
                        )}
                      </div>

                      {m.partner.bio && (
                        <p className="text-xs text-slate-600 italic line-clamp-2 mb-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                          "{m.partner.bio}"
                        </p>
                      )}

                      {/* Direct Contact Channels */}
                      <div className="mb-4 p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between text-xs text-slate-700 flex-wrap gap-2">
                        <div
                          className="flex items-center gap-1.5 truncate max-w-[210px]"
                          title={m.partner.email || "Email"}
                        >
                          <Mail className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                          <span className="truncate text-[11px] font-medium">
                            {m.partner.email || "Liên hệ qua chat"}
                          </span>
                        </div>
                        {m.partner.phone && (
                          <div className="flex items-center gap-1.5 font-bold text-slate-900 text-[11px]">
                            <PhoneCall className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            <span>{m.partner.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 border-t border-slate-100 flex items-center gap-2">
                      <Link
                        href={`/profile/${m.partner.userId}`}
                        className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                        title="Xem hồ sơ"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span className="hidden sm:inline">Hồ sơ</span>
                      </Link>

                      <Link
                        href={`/compatibility/${m.partner.userId}`}
                        className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors"
                        title="Điểm tương thích"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Tương thích</span>
                      </Link>

                      {m.conversationId && (
                        <Link
                          href={`/chat/${m.conversationId}`}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Nhắn tin</span>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ==============================================================
          TAB 2: LỊCH SỬ ĐÃ THÍCH (SENT LIKES HISTORY)
          ============================================================== */}
      {activeTab === "history" && (
        <>
          {sentLikes.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-10 sm:p-12 text-center max-w-md mx-auto my-8 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
                <History className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Lịch sử thích đang trống
              </h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                Bạn chưa nhấn "Thích" ứng viên nào. Hãy vào trang Khám phá để tìm kiếm bạn cùng phòng phù hợp và nhấn Thích nhé!
              </p>
              <Link
                href="/discovery"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all"
              >
                <Compass className="w-4 h-4" />
                <span>Khám phá ứng viên ngay</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sentLikes.map((item) => {
                const areaLabel = getHanoiAreaLabel(
                  item.target.housingStatus === "has_room" &&
                    item.target.room?.districtCode
                    ? item.target.room.districtCode
                    : item.target.districtCode,
                  { includeCluster: true }
                );
                return (
                  <div
                    key={item.targetUserId}
                    className={`bg-white rounded-3xl border p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                      item.isMatched
                        ? "border-emerald-200 ring-1 ring-emerald-500/10"
                        : "border-slate-200"
                    }`}
                  >
                    <div>
                      {/* Top Status & Timestamp */}
                      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            item.isMatched
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-pink-50 text-pink-700 border border-pink-200"
                          }`}
                        >
                          <Heart
                            className={`w-3 h-3 ${
                              item.isMatched
                                ? "fill-emerald-600 text-emerald-600"
                                : "fill-pink-500 text-pink-500"
                            }`}
                          />
                          <span>
                            {item.isMatched
                              ? "Đã ghép đôi hai chiều"
                              : "Đã gửi thích · Chờ phản hồi"}
                          </span>
                        </span>

                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimestamp(item.likedAt)}</span>
                        </span>
                      </div>

                      {/* Identity */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center space-x-3.5">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-100 to-indigo-100 text-blue-700 font-bold text-xl flex items-center justify-center border border-blue-200 shadow-sm">
                            {item.target.displayName[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-bold text-base text-slate-900">
                                {item.target.displayName}
                              </h3>
                              {item.target.isVerified && (
                                <CheckCircle2 className="w-4 h-4 text-blue-600 fill-blue-50" />
                              )}
                              <span className="text-xs text-slate-500">
                                ({item.target.age}t)
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-1 font-medium">
                              <MapPin className="w-3.5 h-3.5 text-blue-500" />
                              <span>{areaLabel}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                              <Home className="w-3 h-3 text-slate-400" />
                              <span>
                                {item.target.housingStatus === "has_room"
                                  ? "Đã có phòng sẵn"
                                  : "Đang tìm phòng"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {item.compatibility && (
                          <MatchScoreBadge
                            score={item.compatibility.finalScore}
                            size="sm"
                          />
                        )}
                      </div>

                      {item.target.bio && (
                        <p className="text-xs text-slate-600 italic line-clamp-2 mb-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                          "{item.target.bio}"
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/profile/${item.target.userId}`}
                        className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>Hồ sơ</span>
                      </Link>

                      <Link
                        href={`/compatibility/${item.target.userId}`}
                        className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Tương thích</span>
                      </Link>

                      {item.isMatched && item.conversationId ? (
                        <Link
                          href={`/chat/${item.conversationId}`}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Nhắn tin</span>
                        </Link>
                      ) : (
                        <button
                          onClick={() => handleUnlike(item.targetUserId)}
                          disabled={isPending}
                          className="ml-auto inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors disabled:opacity-50"
                          title="Hủy lượt thích này"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Bỏ thích</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ==============================================================
          TAB 3: NGƯỜI ĐÃ THÍCH BẠN (RECEIVED LIKES)
          ============================================================== */}
      {activeTab === "received" && (
        <>
          {receivedLikes.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-10 sm:p-12 text-center max-w-md mx-auto my-8 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <UserCheck className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Chưa có lượt thích mới nào đến bạn
              </h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                Hãy cập nhật đầy đủ lời giới thiệu và 30 câu hỏi khảo sát để hồ sơ của bạn nổi bật hơn trong danh sách đề xuất của cộng đồng!
              </p>
              <Link
                href="/discovery"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all"
              >
                <Compass className="w-4 h-4" />
                <span>Chủ động khám phá ứng viên</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {receivedLikes.map((item) => {
                const areaLabel = getHanoiAreaLabel(
                  item.sender.housingStatus === "has_room" &&
                    item.sender.room?.districtCode
                    ? item.sender.room.districtCode
                    : item.sender.districtCode,
                  { includeCluster: true }
                );
                return (
                  <div
                    key={item.fromUserId}
                    className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            item.isMatched
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          <span>
                            {item.isMatched
                              ? "Đã ghép đôi với bạn"
                              : "Đã thích hồ sơ của bạn"}
                          </span>
                        </span>

                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimestamp(item.likedAt)}</span>
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center space-x-3.5">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-100 to-teal-100 text-emerald-800 font-bold text-xl flex items-center justify-center border border-emerald-200 shadow-sm">
                            {item.sender.displayName[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-bold text-base text-slate-900">
                                {item.sender.displayName}
                              </h3>
                              {item.sender.isVerified && (
                                <CheckCircle2 className="w-4 h-4 text-blue-600 fill-blue-50" />
                              )}
                              <span className="text-xs text-slate-500">
                                ({item.sender.age}t)
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-1 font-medium">
                              <MapPin className="w-3.5 h-3.5 text-blue-500" />
                              <span>{areaLabel}</span>
                            </div>
                          </div>
                        </div>

                        {item.compatibility && (
                          <MatchScoreBadge
                            score={item.compatibility.finalScore}
                            size="sm"
                          />
                        )}
                      </div>

                      {item.sender.bio && (
                        <p className="text-xs text-slate-600 italic line-clamp-2 mb-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                          "{item.sender.bio}"
                        </p>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center gap-2">
                      <Link
                        href={`/profile/${item.sender.userId}`}
                        className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>Hồ sơ</span>
                      </Link>

                      <Link
                        href={`/compatibility/${item.sender.userId}`}
                        className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Tương thích</span>
                      </Link>

                      {item.isMatched ? (
                        <Link
                          href={
                            item.conversationId
                              ? `/chat/${item.conversationId}`
                              : "/matches"
                          }
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Nhắn tin ngay</span>
                        </Link>
                      ) : (
                        <button
                          onClick={() => handleLikeBack(item)}
                          disabled={isPending}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white text-xs font-bold shadow-sm shadow-pink-500/20 transition-all disabled:opacity-50"
                        >
                          <Heart className="w-3.5 h-3.5 fill-white" />
                          <span>Thích lại & Ghép đôi</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Mutual Match Modal */}
      <MutualMatchModal
        isOpen={matchModalOpen}
        onClose={() => setMatchModalOpen(false)}
        targetUser={newlyMatchedUser}
        currentUser={currentUser}
      />
    </div>
  );
}
