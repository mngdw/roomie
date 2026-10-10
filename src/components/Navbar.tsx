"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Compass,
  Heart,
  User,
  ClipboardList,
  Sparkles,
  ChevronDown,
  CheckCircle2,
  Building,
  LogOut,
  Layers,
  Bell,
  ShieldCheck,
  Edit3,
  MessageCircle,
} from "lucide-react";
import { DEMO_USERS } from "@/lib/constants/demo-users";
import { markNotificationsReadAction } from "@/app/actions";

interface NavbarProps {
  currentUser: {
    id: string;
    displayName: string;
    fullName: string;
    housingStatus: "has_room" | "looking_for_room";
    isVerified: boolean;
    avatarPath: string | null;
  } | null;
  onSwitchUser?: (userId: string) => Promise<void>;
}

interface NotificationItem {
  id: string;
  type: string;
  actor_name?: string;
  created_at: string;
  read_at: string | null;
  payload: any;
}

export function Navbar({ currentUser, onSwitchUser }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isPending, startTransition] = useTransition();

  const [matchCount, setMatchCount] = useState<number>(0);

  // Load notifications and conversations count
  useEffect(() => {
    if (currentUser?.id) {
      fetch("/api/notifications")
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d.notifications)) {
            setNotifications(d.notifications);
          }
        })
        .catch(() => {});

      fetch("/api/conversations")
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d.conversations)) {
            setMatchCount(d.conversations.length);
          }
        })
        .catch(() => {});
    }
  }, [currentUser?.id, pathname]);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const handleOpenNotifications = async () => {
    const nextState = !notifOpen;
    setNotifOpen(nextState);
    if (nextState && unreadCount > 0) {
      await markNotificationsReadAction();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: new Date().toISOString() }))
      );
    }
  };

  const handleSelectUser = async (userId: string) => {
    setDropdownOpen(false);
    startTransition(async () => {
      if (onSwitchUser) {
        await onSwitchUser(userId);
      } else {
        await fetch("/api/auth/switch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        router.refresh();
      }
    });
  };

  const navLinks = [
    { href: "/discovery", label: "Khám phá", icon: Compass },
    { href: "/matches", label: "Tin nhắn & Ghép đôi", icon: MessageCircle, badge: matchCount },
    { href: "/questionnaire", label: "Bản khảo sát", icon: ClipboardList },
    { href: "/profile", label: "Hồ sơ của tôi", icon: User },
    ...(currentUser?.housingStatus === "has_room"
      ? [{ href: "/room", label: "Phòng trọ", icon: Building }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center space-x-6">
          <Link
            href="/"
            className="flex items-center space-x-2.5 text-blue-600 font-bold text-2xl tracking-tight hover:opacity-90 transition-opacity"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/30">
              <Home className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span>
              roomie<span className="text-blue-400">.</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "text-blue-600 bg-blue-50 font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Section: Notifications & Persona Switcher */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Notification Bell Dropdown */}
          <div className="relative">
            <button
              onClick={handleOpenNotifications}
              className="p-2 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-600 relative transition-colors"
              title="Thông báo"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-88 rounded-2xl bg-white shadow-xl border border-slate-200 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Thông báo gần đây
                  </span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      {unreadCount} mới
                    </span>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      Chưa có thông báo nào.
                    </div>
                  ) : (
                    notifications.map((n) => {
                      let title = "Thông báo mới";
                      let desc = "";
                      let icon = Bell;

                      if (n.type === "mutual_match") {
                        title = "Ghép đôi thành công! 🎉";
                        desc = `Bạn và ${n.actor_name || "người dùng"} đã thích nhau.`;
                        icon = Heart;
                      } else if (n.type === "new_like") {
                        title = "Lượt thích mới";
                        desc = `${n.actor_name || "Một người dùng"} đã thích hồ sơ của bạn.`;
                        icon = Sparkles;
                      } else if (n.type === "verification_result") {
                        title = "Xác thực danh tính";
                        desc = "Hồ sơ của bạn đã được quản trị viên xác minh CCCD.";
                        icon = CheckCircle2;
                      }

                      const Icon = icon;
                      return (
                        <div
                          key={n.id}
                          className={`p-3.5 px-4 text-xs transition-colors flex items-start space-x-3 ${
                            !n.read_at ? "bg-blue-50/50" : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="p-2 rounded-xl bg-blue-100 text-blue-600 flex-shrink-0 mt-0.5">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-slate-900">{title}</div>
                            <div className="text-slate-600 text-[11px] mt-0.5 leading-snug">
                              {desc}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">
                              {new Date(n.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="pt-2 px-4 border-t border-slate-100 text-center">
                  <Link
                    href="/matches"
                    onClick={() => setNotifOpen(false)}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                  >
                    Xem tất cả lượt ghép đôi →
                  </Link>
                </div>
              </div>
            )}
          </div>

          <Link
            href="/onboarding"
            className="hidden sm:inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Onboarding (6 bước)</span>
          </Link>

          {/* User Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 pl-2 pr-2.5 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 bg-slate-50 transition-all text-left"
            >
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold uppercase shadow-sm">
                {currentUser?.displayName?.[0] || "U"}
              </div>
              <div className="hidden sm:block text-xs">
                <div className="font-semibold text-slate-800 flex items-center gap-1">
                  {currentUser?.displayName || "Khách"}
                  {currentUser?.isVerified && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 fill-blue-50 inline" />
                  )}
                </div>
                <div className="text-[10px] text-slate-500">
                  {currentUser?.housingStatus === "has_room"
                    ? "Có phòng"
                    : "Tìm phòng"}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white shadow-xl border border-slate-200 py-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3.5 py-1.5 border-b border-slate-100 mb-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Chuyển đổi hồ sơ mẫu (Demo)
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Đổi người dùng để kiểm tra bộ máy matching & like/pass
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto px-1 space-y-0.5">
                  {DEMO_USERS.map((u) => {
                    const isCurrent = currentUser?.id === u.id;
                    return (
                      <button
                        key={u.id}
                        disabled={isPending}
                        onClick={() => handleSelectUser(u.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                          isCurrent
                            ? "bg-blue-50 text-blue-900 font-semibold"
                            : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                              isCurrent
                                ? "bg-blue-600 text-white"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {u.displayName[0]}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">
                              {u.fullName}{" "}
                              <span className="text-slate-400">({u.age}t)</span>
                            </div>
                            <div className="text-[11px] text-slate-500 line-clamp-1">
                              {u.roleDescription}
                            </div>
                          </div>
                        </div>
                        {isCurrent && (
                          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-slate-100 mt-1.5 pt-1.5 px-2 space-y-0.5">
                  <Link
                    href="/profile/edit"
                    onClick={() => setDropdownOpen(false)}
                    className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Chỉnh sửa hồ sơ</span>
                  </Link>

                  <Link
                    href="/verification"
                    onClick={() => setDropdownOpen(false)}
                    className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Xác minh CCCD</span>
                  </Link>

                  <Link
                    href="/onboarding"
                    onClick={() => setDropdownOpen(false)}
                    className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Khảo sát lại Onboarding</span>
                  </Link>

                  <Link
                    href="/login"
                    onClick={() => setDropdownOpen(false)}
                    className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 text-slate-400" />
                    <span>Trang Đăng nhập</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Nav Bar */}
      <div className="md:hidden border-t border-slate-100 bg-white px-2 py-1.5 flex justify-around">
        {navLinks.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-medium transition-colors ${
                isActive ? "text-blue-600 font-semibold" : "text-slate-500"
              }`}
            >
              <div className="relative">
                <Icon className="w-4 h-4 mb-0.5" />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 w-3.5 h-3.5 bg-blue-600 text-white rounded-full text-[8px] font-bold flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="truncate max-w-[65px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
