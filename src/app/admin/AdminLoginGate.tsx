"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldAlert, Lock, ArrowLeft, KeyRound, Loader2, AlertCircle } from "lucide-react";
import { adminLoginAction } from "@/app/actions";

export function AdminLoginGate() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await adminLoginAction(passcode, email || undefined);
      if (res.success) {
        router.refresh();
      } else {
        setError(res.error || "Mã truy cập hoặc thông tin quản trị không chính xác.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glowing effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-blue-400 shadow-xl shadow-blue-950/50 mb-6">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-center text-2xl font-black text-white tracking-tight">
          Cổng Quản Trị Hệ Thống
        </h2>
        <p className="mt-2 text-center text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
          Khu vực hạn chế chỉ dành cho Quản trị viên (Admin). Vui lòng nhập mã khóa bảo mật để xác thực.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-slate-800/90 backdrop-blur-xl py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-700/60">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Mã khóa truy cập (Admin Passkey)</span>
                <span className="text-[10px] text-slate-500 font-normal">Mã bảo mật</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Nhập mã truy cập Quản trị viên..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Email quản trị (Tùy chọn)</span>
                <span className="text-[10px] text-slate-500 font-normal">admin@roomie.test</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@roomie.test (nếu dùng tài khoản)"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending || !passcode}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xác thực...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Xác thực & Mở Dashboard</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700/50 flex items-center justify-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại trang chủ Roomie</span>
            </Link>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-500">
          Mã bảo vệ mặc định cho quản trị viên hệ thống: <code className="text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">roomie@admin2026</code>
        </p>
      </div>
    </div>
  );
}
