import Link from "next/link";
import { getCurrentUserId, getCurrentUser, DEMO_USERS } from "@/lib/server/session";
import {
  Sparkles,
  Compass,
  Heart,
  ShieldCheck,
  CheckCircle2,
  Users,
  Home,
  ArrowRight,
  TrendingUp,
  Layers,
  UserPlus,
  LogIn,
} from "lucide-react";
import { CATEGORY_META, CATEGORY_WEIGHTS } from "@/lib/matching/constants";

export default async function LandingPage() {
  const currentUserId = await getCurrentUserId();
  const currentUser = await getCurrentUser();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/70 via-white to-slate-50 pt-16 pb-20 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold mb-6 shadow-sm border border-blue-200 animate-in fade-in duration-300">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Thuật toán ghép bạn cùng phòng thông minh theo 30 chỉ số</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight sm:leading-tight">
            Tìm bạn cùng phòng hoàn hảo dựa trên{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              sự tương thích thực sự
            </span>
          </h1>

          {/* Subheading */}
          <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            ROOMIE không chỉ đơn thuần là nơi đăng tin phòng trọ. Chúng tôi phân
            tích lối sống, mức độ sạch sẽ, giờ giấc sinh hoạt và tính cách để tìm
            cho bạn người bạn cùng sống hòa hợp và bền lâu nhất.
          </p>

          {/* Main Action CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            {currentUser ? (
              <>
                <Link
                  href="/discovery"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-xl shadow-blue-500/25 transition-all transform hover:-translate-y-0.5"
                >
                  <Compass className="w-5 h-5" />
                  <span>Khám phá ứng viên phù hợp</span>
                </Link>

                <Link
                  href="/onboarding"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm shadow-sm transition-all"
                >
                  <Layers className="w-5 h-5 text-blue-600" />
                  <span>Khảo sát lại Onboarding (6 bước)</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-xl shadow-blue-500/25 transition-all transform hover:-translate-y-0.5"
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Đăng ký tài khoản miễn phí</span>
                </Link>

                <Link
                  href="/discovery"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm shadow-sm transition-all"
                >
                  <Compass className="w-5 h-5 text-blue-600" />
                  <span>Xem trước danh sách bạn cùng phòng</span>
                </Link>

                <Link
                  href="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-all shadow-sm"
                >
                  <LogIn className="w-5 h-5 text-slate-500" />
                  <span>Đăng nhập</span>
                </Link>
              </>
            )}
          </div>

          {/* Current Persona / Guest Pill */}
          {currentUser ? (
            <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-200 text-xs text-slate-600 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Đang đăng nhập:</span>
              <strong className="text-slate-900 font-bold">
                {currentUser.displayName}
              </strong>
              <span className="text-slate-400">
                ({currentUser.housingStatus === "has_room" ? "Có phòng" : "Tìm phòng"})
              </span>
            </div>
          ) : (
            <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-200 text-xs text-slate-500 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Chế độ Khách (Chưa đăng nhập) · Đăng ký để bắt đầu ghép đôi thực tế</span>
            </div>
          )}
        </div>
      </section>

      {/* 6 Categories Weight Grid */}
      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              Khoa học tương thích
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              6 Trọng số cốt lõi tạo nên sự hòa hợp
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Bộ máy ROOMIE Matching Engine tính toán tổng điểm 100% dựa trên công
              thức phân bổ trọng số chuẩn mực:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(
              [
                "lifestyle",
                "cleanliness",
                "schedule_noise",
                "social_space",
                "communication",
                "financial",
              ] as const
            ).map((catKey) => {
              const meta = CATEGORY_META[catKey];
              const weightPct = Math.round(CATEGORY_WEIGHTS[catKey] * 100);

              return (
                <div
                  key={catKey}
                  className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black text-blue-600 bg-blue-100/70 px-3 py-1 rounded-full">
                      {weightPct}% Trọng số
                    </span>
                    <TrendingUp className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                  <h3 className="font-bold text-base text-slate-900 mb-1.5">
                    {meta.name_vi}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {meta.description_vi}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Demo Switcher Quick Bar */}
      <section className="py-14 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Kiểm thử thuật toán
            </span>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">
              Chọn hồ sơ mẫu để trải nghiệm góc nhìn matching
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {DEMO_USERS.map((u) => {
              const isCurrent = u.id === currentUserId;
              return (
                <form
                  key={u.id}
                  action="/api/auth/switch"
                  method="POST"
                  className="flex flex-col"
                >
                  <input type="hidden" name="userId" value={u.id} />
                  <a
                    href={`/api/auth/switch-redirect?userId=${u.id}`}
                    className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center h-full ${
                      isCurrent
                        ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                        : "bg-white text-slate-800 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm mb-2 ${
                        isCurrent
                          ? "bg-white text-blue-600"
                          : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      {u.displayName[0]}
                    </div>
                    <div className="font-bold text-xs">{u.fullName}</div>
                    <div
                      className={`text-[10px] mt-1 line-clamp-1 ${
                        isCurrent ? "text-blue-100" : "text-slate-400"
                      }`}
                    >
                      {u.roleDescription}
                    </div>
                  </a>
                </form>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
