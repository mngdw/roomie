"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, LogIn, AlertCircle } from "lucide-react";
import { signInAction } from "@/app/actions";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleStandardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await signInAction({ email, password });
      if (!res.success) {
        setError(res.error || "Đăng nhập không thành công");
      } else {
        if (res.isCompleted) {
          router.push("/discovery");
        } else {
          router.push("/onboarding");
        }
        router.refresh();
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link
          href="/"
          className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white mx-auto mb-3 shadow-lg shadow-blue-500/30 hover:scale-105 transition-transform"
        >
          <Home className="w-6 h-6 stroke-[2.5]" />
        </Link>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
          Đăng nhập ROOMIE
        </h2>
        <p className="mt-1.5 text-xs text-slate-500">
          Nền tảng ghép đôi bạn cùng phòng tương thích đa chiều
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-sm border border-slate-200 rounded-3xl">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Standard Login Form */}
          <form onSubmit={handleStandardSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Địa chỉ Email
              </label>
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mật khẩu
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{isPending ? "Đang đăng nhập..." : "Đăng nhập"}</span>
            </button>
          </form>

          {/* Signup Link */}
          <div className="mt-6 text-center text-xs text-slate-500">
            Chưa có tài khoản?{" "}
            <Link
              href="/signup"
              className="font-bold text-blue-600 hover:text-blue-700 underline"
            >
              Đăng ký ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
