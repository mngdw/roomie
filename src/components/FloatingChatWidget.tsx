"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageCircle,
  X,
  Send,
  ChevronDown,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  ArrowLeft,
  Compass,
  Users,
} from "lucide-react";
import { sendMessageAction } from "@/app/actions";

interface ConversationSummary {
  conversationId: string;
  matchId: string;
  matchedAt: string;
  partner: {
    userId: string;
    displayName: string;
    age: number;
    gender: string;
    districtCode?: string | null;
    housingStatus: string;
    isVerified: boolean;
    avatarPath?: string | null;
  };
  compatibility: {
    finalScore: number;
  } | null;
  lastMessage: {
    body: string;
    sender_id: string;
    created_at: string;
  } | null;
}

interface MessageItem {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export function FloatingChatWidget({ currentUserId }: { currentUserId: string | null }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedConv, setSelectedConv] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSending, startSending] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Don't show floating widget if already on the full-screen chat page
  const isOnChatPage = pathname.startsWith("/chat/");

  // Load conversation list
  const loadConversations = async () => {
    if (!currentUserId) return;
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      if (Array.isArray(data.conversations)) {
        setConversations(data.conversations);
      }
    } catch (err) {
      // Ignore background fetch errors
    }
  };

  // Poll conversations every 10 seconds or when opened
  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 10000);
    return () => clearInterval(interval);
  }, [currentUserId]);

  // Load messages when a conversation is selected
  const loadMessages = async (convId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/conversations?id=${convId}`);
      const data = await res.json();
      if (data.conversation?.messages) {
        setMessages(data.conversation.messages);
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (selectedConv) {
      loadMessages(selectedConv.conversationId);
      // Auto-poll messages for this conversation every 4 seconds while open
      const interval = setInterval(() => {
        loadMessages(selectedConv.conversationId);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [selectedConv?.conversationId]);

  useEffect(() => {
    if (selectedConv) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, selectedConv]);

  if (!currentUserId || isOnChatPage) {
    return null;
  }

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !selectedConv) return;

    setInputText("");

    // Optimistic UI append
    const tempId = "temp-" + Date.now();
    const optimisticMsg: MessageItem = {
      id: tempId,
      sender_id: currentUserId,
      body: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    startSending(async () => {
      const res = await sendMessageAction(selectedConv.conversationId, text);
      if (!res.success) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      } else {
        loadConversations();
      }
    });
  };

  const conversationStarters = [
    "Chào bạn! Rất vui được ghép đôi trên ROOMIE 😊",
    "Bạn dự định khi nào có thể chuyển đến ở cùng?",
    "Cho mình hỏi thêm về thói quen sinh hoạt và nấu nướng nhé?",
  ];

  return (
    <div className="fixed bottom-5 right-5 z-40 select-none">
      {/* Expanded Chat Drawer / Box */}
      {isOpen && (
        <div className="mb-3 w-[360px] sm:w-[390px] h-[520px] max-h-[calc(100vh-6rem)] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3.5 px-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-2">
              {selectedConv ? (
                <button
                  onClick={() => setSelectedConv(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white transition-colors"
                  title="Quay lại danh sách"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
              )}

              <div>
                <div className="font-bold text-sm tracking-tight flex items-center gap-1.5">
                  {selectedConv ? (
                    <>
                      <span>{selectedConv.partner.displayName}</span>
                      {selectedConv.partner.isVerified && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-200 fill-blue-500" />
                      )}
                    </>
                  ) : (
                    "Hộp trò chuyện ROOMIE"
                  )}
                </div>
                <div className="text-[10px] text-blue-100">
                  {selectedConv
                    ? selectedConv.compatibility
                      ? `${Math.round(selectedConv.compatibility.finalScore)}% tương thích`
                      : "Bạn cùng phòng đã ghép đôi"
                    : `${conversations.length} cuộc hội thoại`}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              {selectedConv && (
                <Link
                  href={`/chat/${selectedConv.conversationId}`}
                  target="_blank"
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/90 hover:text-white transition-colors"
                  title="Mở toàn màn hình"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/90 hover:text-white transition-colors"
                title="Thu nhỏ"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          {selectedConv ? (
            /* Inside Conversation Chat View */
            <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
              {/* Message Feed */}
              <div className="flex-1 p-3.5 overflow-y-auto space-y-2.5">
                {messages.length === 0 && !loadingMessages ? (
                  <div className="my-auto py-6 text-center">
                    <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="font-bold text-xs text-slate-800">
                      Bắt đầu cuộc trò chuyện!
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-[260px] mx-auto">
                      Chào hỏi và trao đổi ngay về dự định ở chung với {selectedConv.partner.displayName}.
                    </p>

                    <div className="mt-4 space-y-1.5 max-w-[280px] mx-auto">
                      {conversationStarters.map((starter, i) => (
                        <button
                          key={i}
                          onClick={() => handleSendMessage(starter)}
                          className="w-full text-left p-2 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 text-slate-700 hover:text-blue-700 text-[11px] transition-all shadow-2xs"
                        >
                          "{starter}"
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.sender_id === currentUserId;
                    const time = new Date(m.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${
                          isMe ? "items-end" : "items-start"
                        } space-y-0.5`}
                      >
                        <div
                          className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                            isMe
                              ? "bg-blue-600 text-white rounded-br-none"
                              : "bg-white text-slate-800 border border-slate-200 rounded-bl-none"
                          }`}
                        >
                          {m.body}
                        </div>
                        <span className="text-[9px] text-slate-400 px-1">{time}</span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-2.5 bg-white border-t border-slate-200">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Nhập tin nhắn..."
                    className="flex-1 bg-slate-100 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isSending}
                    className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 transition-colors shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* Conversation List View */
            <div className="flex-1 flex flex-col overflow-y-auto divide-y divide-slate-100 bg-white">
              {conversations.length === 0 ? (
                <div className="p-8 text-center my-auto">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">
                    Chưa có bạn ghép đôi
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    Box chat sẽ mở khóa khi bạn và một ứng viên cùng chọn "Thích" nhau.
                  </p>
                  <div className="p-3 bg-blue-50 rounded-2xl text-[11px] text-blue-800 text-left mb-4 border border-blue-100">
                    💡 <strong>Thử nghiệm ngay:</strong> Đổi hồ sơ sang <strong>Ngọc</strong> hoặc <strong>Linh</strong> (menu góc trên bên phải) để xem tin nhắn mẫu giữa hai người!
                  </div>
                  <Link
                    href="/discovery"
                    onClick={() => setIsOpen(false)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Khám phá ứng viên ngay</span>
                  </Link>
                </div>
              ) : (
                conversations.map((c) => {
                  const partner = c.partner;
                  const last = c.lastMessage;
                  const isMe = last?.sender_id === currentUserId;
                  const score = c.compatibility?.finalScore;

                  return (
                    <button
                      key={c.conversationId}
                      onClick={() => setSelectedConv(c)}
                      className="w-full text-left p-3.5 hover:bg-slate-50 transition-colors flex items-center gap-3"
                    >
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-100 to-blue-100 text-blue-700 font-bold text-base flex items-center justify-center border border-blue-200 shadow-2xs">
                          {partner.displayName[0]}
                        </div>
                        {partner.isVerified && (
                          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-2xs">
                            <CheckCircle2 className="w-3 h-3 text-blue-600 fill-blue-50" />
                          </div>
                        )}
                      </div>

                      {/* Info & Last snippet */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {partner.displayName}
                          </span>
                          {score !== undefined && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                              {Math.round(score)}%
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-500 truncate">
                          {last ? (
                            <span>
                              {isMe ? "Bạn: " : ""}
                              {last.body}
                            </span>
                          ) : (
                            <span className="italic text-slate-400">
                              Chưa có tin nhắn, nhấn để trò chuyện...
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center space-x-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-xl shadow-blue-600/30 hover:shadow-blue-600/40 hover:scale-105 active:scale-95 transition-all duration-200"
        title="Trò chuyện & Tin nhắn"
      >
        <div className="relative">
          <MessageCircle className="w-5 h-5 fill-white/20 stroke-[2.2]" />
          {conversations.length > 0 && !isOpen && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-white">
              {conversations.length}
            </span>
          )}
        </div>
        <span className="font-bold text-xs tracking-wide">
          {isOpen ? "Đóng chat" : "Tin nhắn & Trò chuyện"}
        </span>
      </button>
    </div>
  );
}
