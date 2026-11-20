"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, UserPlus, RefreshCw } from "lucide-react";

export const ACTIVE_USER_STORAGE_KEY = "roomie_active_user_id";
export const SESSION_COOKIE_KEY = "roomie_user_id";

export function syncClientSession(userId: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (userId) {
      window.localStorage.setItem(ACTIVE_USER_STORAGE_KEY, userId);
      document.cookie = `${SESSION_COOKIE_KEY}=${encodeURIComponent(
        userId
      )}; path=/; max-age=2592000; SameSite=Lax`;
    } else {
      window.localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
      document.cookie = `${SESSION_COOKIE_KEY}=; path=/; max-age=0; SameSite=Lax`;
    }
  } catch {
    // Ignore storage errors in private mode
  }
}

export function getSavedClientUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    // 1. Check document.cookie first
    const match = document.cookie.match(
      new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_KEY}=([^;]+)`)
    );
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
    // 2. Fallback to localStorage
    return window.localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Rendered when a protected server page did not receive the session cookie on initial request.
 * Automatically restores the session cookie from localStorage (if the user already logged in)
 * and refreshes the page in-place without kicking the user back to /login.
 */
export function SessionRestoreGuard() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const savedUserId = getSavedClientUserId();
    if (savedUserId) {
      // Restore cookie immediately and refresh current route in-place
      syncClientSession(savedUserId);
      fetch("/api/auth/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: savedUserId }),
      })
        .catch(() => {})
        .finally(() => {
          router.refresh();
        });
      return;
    }

    setChecking(false);
    router.replace("/login");
  }, [router]);

  if (checking) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 shadow-sm text-xs font-semibold text-slate-600">
          <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
          <span>Đang đồng bộ phiên đăng nhập của bạn...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <h2 className="text-lg font-extrabold text-slate-900 mb-2">
          Vui lòng đăng nhập để tiếp tục
        </h2>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          Bạn cần đăng nhập một lần duy nhất để sử dụng đầy đủ các tính năng Ghép đôi, Lịch sử thích, Bản khảo sát và Hồ sơ cá nhân.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Đăng nhập</span>
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Đăng ký</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
