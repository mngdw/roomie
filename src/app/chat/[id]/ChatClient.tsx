"use client";

import React, { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  Sparkles,
  Eye,
  MessageSquare,
  ShieldCheck,
  Calendar,
  DollarSign,
  Coffee,
  PhoneCall,
  Mail,
  Copy,
  Check,
  X,
} from "lucide-react";
import { MatchScoreBadge } from "@/components/MatchScoreBadge";
import { sendMessageAction } from "@/app/actions";
import type { CandidateUser, PairScoreResult } from "@/lib/matching/types";

interface MessageItem {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

interface ChatClientProps {
  conversationId: string;
  partner: CandidateUser;
  compatibility?: PairScoreResult | null;
  currentUserId: string;
  initialMessages: MessageItem[];
}

export function ChatClient({
  conversationId,
  partner,
  compatibility,
  currentUserId,
  initialMessages,
}: ChatClientProps) {
  const [messages, setMessages] = useState<MessageItem[]>(initialMessages);
  const [inputText, setInputText] = useState("");
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    setInputText("");

    // Optimistic message
    const tempId = "temp-" + Date.now();
    const optimisticMsg: MessageItem = {
      id: tempId,
      sender_id: currentUserId,
      body: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    startTransition(async () => {
      const res = await sendMessageAction(conversationId, text);
      if (!res.success) {
        // Rollback on error
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    });
  };

  // Conversation starters suggested by matching engine
  const conversationStarters = [
    "Chào bạn! Rất vui được ghép đôi với bạn trên ROOMIE 😊",
    "Hai đứa mình có điểm tương thích khá cao đấy! Bạn thường thức dậy lúc mấy giờ?",
    "Cho mình hỏi thêm về quy định phân chia tiền điện nước và dọn dẹp phòng nhé?",
    "Cuối tuần này bạn có rảnh để qua xem phòng trực tiếp không?",
  ];

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex flex-col h-[calc(100vh-5rem)]">
      {/* Chat Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center space-x-3.5">
          <Link
            href="/matches"
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-100 to-pink-100 text-purple-700 font-bold text-lg flex items-center justify-center border border-purple-200 shadow-sm">
              {partner.displayName[0]}
            </div>
            {partner.isVerified && (
              <div
                className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm"
                title="Đã xác thực CCCD"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 fill-blue-50" />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-sm sm:text-base text-slate-900">
                {partner.displayName}
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                ({partner.age}t)
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              {partner.housingStatus === "has_room"
                ? "Có phòng sẵn cho thuê ghép"
                : "Đang tìm phòng"}
            </div>
          </div>
        </div>

        {/* Right side: Match Badge, Contact & Profile Link */}
        <div className="flex items-center gap-2">
          {compatibility && (
            <Link
              href={`/compatibility/${partner.userId}`}
              title="Xem phân tích chi tiết độ tương thích"
            >
              <MatchScoreBadge score={compatibility.finalScore} size="sm" />
            </Link>
          )}

          <button
            onClick={() => setContactModalOpen(true)}
            className="p-2 px-2.5 sm:px-3 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            title="Xem số điện thoại, Zalo, Email"
          >
            <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
            <span>Liên hệ</span>
          </button>

          <Link
            href={`/profile/${partner.userId}`}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1"
          >
            <Eye className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">Hồ sơ</span>
          </Link>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm overflow-y-auto flex flex-col space-y-4">
        {/* Match Celebration Banner inside Chat */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-pink-50 to-indigo-50 border border-blue-100 text-center mx-auto max-w-md my-2">
          <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto mb-2 shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="font-bold text-xs text-slate-900">
            Hai bạn đã ghép đôi thành công!
          </div>
          <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
            Hãy bắt đầu cuộc trò chuyện để chia sẻ thêm về thói quen sinh hoạt và
            kế hoạch chuyển đến ở chung.
          </p>
        </div>

        {/* Conversation Starters Chips */}
        {messages.length === 0 && (
          <div className="my-auto text-center py-6">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Gợi ý câu mở đầu tiện lợi
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-2 max-w-xl mx-auto">
              {conversationStarters.map((starter, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(starter)}
                  className="p-2.5 px-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-700 border border-slate-200 text-xs text-left transition-all shadow-sm"
                >
                  "{starter}"
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Bubbles */}
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId;
          const time = new Date(msg.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${
                isMe ? "items-end" : "items-start"
              } space-y-1`}
            >
              <div
                className={`max-w-[75%] sm:max-w-[65%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                  isMe
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-slate-100 text-slate-900 rounded-bl-none"
                }`}
              >
                {msg.body}
              </div>
              <span className="text-[10px] text-slate-400 px-1">{time}</span>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box Footer */}
      <div className="mt-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 bg-white rounded-2xl border border-slate-200 p-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Nhắn tin cho ${partner.displayName}...`}
            className="flex-1 bg-transparent px-3 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isPending}
            className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-40 shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Contact Details Modal */}
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
                  Bạn cùng phòng: <strong className="text-slate-800">{partner.displayName}</strong>
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Phone / Zalo */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Số điện thoại / Zalo</span>
                  {partner.phone && (
                    <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                      Sẵn sàng
                    </span>
                  )}
                </div>
                {partner.phone ? (
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-sm font-bold text-slate-900 font-mono">
                      {partner.phone}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${partner.phone}`}
                        className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors"
                      >
                        Gọi ngay
                      </a>
                      <a
                        href={`https://zalo.me/${partner.phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors"
                      >
                        Mở Zalo
                      </a>
                      <button
                        onClick={() => copyToClipboard(partner.phone || "", "phone")}
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
                    Thành viên chưa thêm số điện thoại. Bạn có thể trò chuyện trực tiếp qua khung chat này hoặc Email nhé!
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Email tài khoản
                </div>
                {partner.email ? (
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      {partner.email}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <a
                        href={`mailto:${partner.email}`}
                        className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors"
                      >
                        Gửi mail
                      </a>
                      <button
                        onClick={() => copyToClipboard(partner.email || "", "email")}
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

              <div className="pt-2">
                <button
                  onClick={() => setContactModalOpen(false)}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
