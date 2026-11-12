"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageCircle,
  Send,
  ChevronDown,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  ArrowLeft,
  Compass,
  Users,
  RotateCcw,
} from "lucide-react";

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
  status?: "sending" | "sent" | "error";
}

export function FloatingChatWidget({ currentUserId }: { currentUserId: string | null }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedConv, setSelectedConv] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastScrolledMsgIdRef = useRef<string | null>(null);

  // Don't show floating widget if already on the full-screen chat page
  const isOnChatPage = pathname.startsWith("/chat/");

  // Load conversation list (skips when tab is hidden)
  const loadConversations = useCallback(async () => {
    if (!currentUserId) return;
    if (typeof document !== "undefined" && document.hidden) return;
    try {
      const res = await fetch("/api/conversations", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.conversations)) {
        setConversations(data.conversations);
      }
    } catch {
      // Ignore background fetch errors
    }
  }, [currentUserId]);

  // Poll conversations every 10 seconds or when opened
  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 10000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  // Load messages for selected conversation (fast single-query endpoint)
  const loadMessages = useCallback(
    async (convId: string, isInitial = false) => {
      if (!isInitial && typeof document !== "undefined" && document.hidden) {
        return;
      }
      if (isInitial) {
        setLoadingMessages(true);
      }
      try {
        const res = await fetch(
          `/api/conversations?id=${encodeURIComponent(convId)}&messagesOnly=1`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const data = await res.json();
        const serverMsgs: MessageItem[] = data.conversation?.messages || [];
        if (Array.isArray(serverMsgs)) {
          setMessages((prev) => {
            // Preserve any in-flight or errored optimistic messages so they never vanish during polling
            const pendingOptimistic = prev.filter(
              (m) =>
                m.id.startsWith("temp-") &&
                (m.status === "sending" || m.status === "error")
            );
            const serverIds = new Set(serverMsgs.map((m) => m.id));
            const merged = [
              ...serverMsgs,
              ...pendingOptimistic.filter((m) => !serverIds.has(m.id)),
            ];
            return merged;
          });
        }
      } catch (err) {
        console.error("Failed to load messages:", err);
      } finally {
        if (isInitial) {
          setLoadingMessages(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (selectedConv) {
      lastScrolledMsgIdRef.current = null;
      loadMessages(selectedConv.conversationId, true);
      // Fast 2.5s poll using lightweight messagesOnly=1 query
      const interval = setInterval(() => {
        loadMessages(selectedConv.conversationId, false);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [selectedConv?.conversationId, loadMessages]);

  // Smart auto-scroll: only scroll when the last message ID actually changes
  useEffect(() => {
    if (!selectedConv || messages.length === 0) return;
    const lastId = messages[messages.length - 1]?.id;
    if (lastId && lastId !== lastScrolledMsgIdRef.current) {
      lastScrolledMsgIdRef.current = lastId;
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, selectedConv]);

  if (!currentUserId || isOnChatPage) {
    return null;
  }

  const dispatchMessage = async (convId: string, tempId: string, text: string) => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convId, body: text }),
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, status: "error" } : m))
        );
        return;
      }

      const savedMsg: MessageItem | undefined = data.message;
      setMessages((prev) => {
        if (!savedMsg) {
          return prev.map((m) =>
            m.id === tempId ? { ...m, status: "sent" } : m
          );
        }
        // If poll already inserted savedMsg.id, remove tempId; otherwise replace tempId with savedMsg
        const alreadyInList = prev.some((m) => m.id === savedMsg.id);
        if (alreadyInList) {
          return prev.filter((m) => m.id !== tempId);
        }
        return prev.map((m) =>
          m.id === tempId ? { ...savedMsg, status: "sent" } : m
        );
      });

      // Update conversation snippet immediately
      setConversations((prev) =>
        prev.map((c) =>
          c.conversationId === convId
            ? {
                ...c,
                lastMessage: {
                  body: text,
                  sender_id: currentUserId,
                  created_at: savedMsg?.created_at || new Date().toISOString(),
                },
              }
            : c
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "error" } : m))
      );
    }
  };

  const handleSendMessage = (textToSend?: string) => {
    const raw = textToSend !== undefined ? textToSend : inputText;
    const text = raw.trim().slice(0, 2000);
    if (!text || !selectedConv) return;

    if (textToSend === undefined) {
      setInputText("");
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const optimisticMsg: MessageItem = {
      id: tempId,
      sender_id: currentUserId,
      body: text,
      created_at: new Date().toISOString(),
      status: "sending",
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    void dispatchMessage(selectedConv.conversationId, tempId, text);
  };

  const handleRetryMessage = (failedMsg: MessageItem) => {
    if (!selectedConv) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === failedMsg.id ? { ...m, status: "sending" } : m))
    );
    void dispatchMessage(selectedConv.conversationId, failedMsg.id, failedMsg.body);
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
            <div className="flex items-center space-x-2 min-w-0">
              {selectedConv ? (
                <button
                  onClick={() => setSelectedConv(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white transition-colors flex-shrink-0"
                  title="Quay lại danh sách"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
              )}

              <div className="min-w-0">
                <div className="font-bold text-sm tracking-tight flex items-center gap-1.5 truncate">
                  {selectedConv ? (
                    <>
                      <span className="truncate">{selectedConv.partner.displayName}</span>
                      {selectedConv.partner.isVerified && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-200 fill-blue-500 flex-shrink-0" />
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

            <div className="flex items-center space-x-1 flex-shrink-0">
              {selectedConv && (
                <Link
                  href={`/chat/${selectedConv.conversationId}`}
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
              <div className="flex-1 p-3.5 overflow-y-auto overflow-x-hidden space-y-2.5">
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
                        className={`flex flex-col min-w-0 max-w-full ${
                          isMe ? "items-end" : "items-start"
                        } space-y-0.5`}
                      >
                        <div
                          className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed shadow-2xs break-words [overflow-wrap:anywhere] [word-break:break-word] whitespace-pre-wrap select-text ${
                            isMe
                              ? "bg-blue-600 text-white rounded-br-none"
                              : "bg-white text-slate-800 border border-slate-200 rounded-bl-none"
                          } ${m.status === "sending" ? "opacity-80" : ""}`}
                        >
                          {m.body}
                        </div>

                        {m.status === "error" ? (
                          <button
                            onClick={() => handleRetryMessage(m)}
                            className="inline-flex items-center gap-1 text-[10px] text-rose-600 hover:text-rose-700 font-semibold px-1"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>Chưa gửi được · Nhấn để gửi lại</span>
                          </button>
                        ) : (
                          <span className="text-[9px] text-slate-400 px-1">
                            {m.status === "sending" ? "Đang gửi..." : time}
                          </span>
                        )}
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
                    maxLength={2000}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Nhập tin nhắn..."
                    className="flex-1 min-w-0 bg-slate-100 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 select-text"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 transition-colors shadow-sm flex-shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* Conversation List View */
            <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden divide-y divide-slate-100 bg-white">
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
                      className="w-full text-left p-3.5 hover:bg-slate-50 transition-colors flex items-center gap-3 min-w-0"
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
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {partner.displayName}
                          </span>
                          {score !== undefined && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200 flex-shrink-0">
                              {Math.round(score)}%
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-500 truncate break-all">
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
