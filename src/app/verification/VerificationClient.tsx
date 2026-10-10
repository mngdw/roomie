"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  FileText,
  AlertCircle,
  ArrowLeft,
  Send,
  EyeOff,
} from "lucide-react";
import { submitVerificationAction } from "@/app/actions";

interface VerificationClientProps {
  isVerified: boolean;
  cccdLast4?: string | null;
  submittedAt?: string | null;
}

export function VerificationClient({
  isVerified: initialVerified,
  cccdLast4: initialLast4,
  submittedAt: initialSubmittedAt,
}: VerificationClientProps) {
  const [isVerified, setIsVerified] = useState(initialVerified);
  const [cccdLast4, setCccdLast4] = useState(initialLast4);
  const [idNumber, setIdNumber] = useState("");
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await submitVerificationAction(idNumber);
      if (res.success) {
        setIsVerified(true);
        setCccdLast4(idNumber.slice(-4));
        setSuccessMsg(
          "Yêu cầu xác minh đã được phê duyệt tự động trong môi trường Demo!"
        );
        setIdNumber("");
      } else {
        setErrorMsg(res.error || "Có lỗi xảy ra khi gửi yêu cầu xác minh.");
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Header */}
      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-200">
        <Link
          href="/profile"
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Xác minh danh tính (CCCD / Thẻ SV)
          </h1>
          <p className="text-xs text-slate-500">
            Gia tăng độ tin cậy và ưu tiên hiển thị trên bộ máy tìm bạn cùng phòng
          </p>
        </div>
      </div>

      {isVerified ? (
        <div className="bg-white rounded-3xl border border-emerald-200 p-8 shadow-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Hồ sơ của bạn đã được xác minh thành công!
          </h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed mb-6">
            Huy hiệu xanh xác thực đã được kích hoạt trên thẻ hồ sơ của bạn. Các bạn
            cùng phòng tiềm năng sẽ thấy bạn là người dùng đáng tin cậy.
          </p>

          <div className="inline-flex items-center gap-2 p-3 px-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium mb-6">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span>Mã định danh bảo mật: ••••••••{cccdLast4 || "8888"}</span>
          </div>

          <div>
            <Link
              href="/discovery"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all"
            >
              <span>Tiếp tục khám phá ứng viên</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          {errorMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Privacy Guarantee Box */}
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 text-xs text-slate-700 mb-6 flex items-start gap-3">
            <Lock className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-blue-900 block font-semibold mb-0.5">
                Bảo vệ dữ liệu & Quyền riêng tư theo chuẩn RLS
              </strong>
              Số CCCD của bạn sẽ được băm mã hóa một chiều (HMAC SHA-256) và chỉ
              lưu 4 số cuối. Hệ thống tuyệt đối không bao giờ hiển thị công khai
              số CCCD với người dùng khác.
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Số Căn cước công dân (CCCD) / Mã số sinh viên *
              </label>
              <input
                type="text"
                required
                placeholder="Nhập 12 số CCCD hoặc mã thẻ sinh viên..."
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 py-3 px-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isPending || !idNumber.trim()}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isPending ? "Đang gửi xác minh..." : "Gửi yêu cầu xác minh ngay"}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
