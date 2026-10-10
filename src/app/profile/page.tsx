import { getCurrentUserId, getCurrentUser } from "@/lib/server/session";
import { withAdminDb } from "@/lib/server/db";
import { fetchCandidateUser } from "@/lib/matching/recommendations";
import Link from "next/link";
import {
  User,
  Edit3,
  ClipboardList,
  CheckCircle2,
  MapPin,
  GraduationCap,
  Home,
  ShieldCheck,
  Moon,
  Sun,
  Sparkles,
  Volume2,
  Users,
  Coffee,
} from "lucide-react";

export default async function MyProfilePage() {
  const currentUserId = await getCurrentUserId();
  const currentUser = await getCurrentUser();

  const user = await withAdminDb(async (client) => {
    return await fetchCandidateUser(client, currentUserId);
  });

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold text-slate-800">Không tìm thấy hồ sơ người dùng.</h2>
      </div>
    );
  }

  // Questionnaire answers lookup for lifestyle preview
  const q11Ans = user.answers.get(11)?.optionValues[0];
  const q12Ans = user.answers.get(12)?.optionValues[0];
  const q6Ans = user.answers.get(6)?.optionValues[0];
  const q13Ans = user.answers.get(13)?.optionValues[0];
  const q18Ans = user.answers.get(18)?.optionValues[0];
  const q10Ans = user.answers.get(10)?.optionValues[0];

  const districtName =
    user.districtCode === "thanh_xuan"
      ? "Thanh Xuân"
      : user.districtCode === "cau_giay"
      ? "Cầu Giấy"
      : user.districtCode === "dong_da"
      ? "Đống Đa"
      : user.districtCode === "hai_ba_trung"
      ? "Hai Bà Trưng"
      : user.districtCode === "ba_dinh"
      ? "Ba Đình"
      : user.districtCode || "Hà Nội";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-blue-600 text-white font-bold text-3xl flex items-center justify-center shadow-md shadow-blue-500/20">
                {user.displayName[0]}
              </div>
              {user.isVerified && (
                <div
                  className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm"
                  title="Đã xác minh danh tính"
                >
                  <CheckCircle2 className="w-5 h-5 text-blue-600 fill-blue-50" />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  {user.displayName}
                </h1>
                <span className="text-sm font-semibold text-slate-500">
                  {user.age} tuổi
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                  {user.gender === "female"
                    ? "Nữ"
                    : user.gender === "male"
                    ? "Nam"
                    : "Khác"}
                </span>
              </div>

              <div className="flex items-center gap-2.5 mt-1.5 text-xs text-slate-500 flex-wrap">
                {user.schoolOrWorkplace && (
                  <span className="flex items-center gap-1 font-medium text-slate-600">
                    <GraduationCap className="w-4 h-4 text-slate-400" />
                    <span>{user.schoolOrWorkplace}</span>
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{districtName}</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    user.isVerified
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {user.isVerified ? "Đã xác thực CCCD" : "Chưa xác thực"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/questionnaire"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-colors"
            >
              <ClipboardList className="w-4 h-4 text-blue-600" />
              <span>30 Câu khảo sát</span>
            </Link>

            <Link
              href="/onboarding"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              <span>Chỉnh sửa hồ sơ</span>
            </Link>
          </div>
        </div>

        {/* Bio */}
        {user.bio && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Giới thiệu bản thân
            </h4>
            <p className="text-sm text-slate-600 italic leading-relaxed">
              "{user.bio}"
            </p>
          </div>
        )}
      </div>

      {/* Grid: Housing Status & Lifestyle Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Housing Status */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              Tình trạng chỗ ở
            </span>
            {user.housingStatus === "has_room" && (
              <Link
                href="/room"
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Xem chi tiết phòng →
              </Link>
            )}
          </div>

          <h3 className="text-lg font-bold text-slate-900 mb-2">
            {user.housingStatus === "has_room"
              ? "Đang có phòng sẵn cho ở ghép"
              : "Đang tìm phòng & tìm bạn ghép"}
          </h3>

          {user.housingStatus === "has_room" && user.room ? (
            <div className="space-y-2 text-xs text-slate-600 mt-4">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Tiền thuê/người:</span>
                <span className="font-bold text-blue-600">
                  {Math.round(user.room.perPersonRent / 100000) / 10} triệu/tháng
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Loại phòng:</span>
                <span className="font-semibold text-slate-800">
                  {user.room.roomType === "private" ? "Phòng riêng" : "Ở chung"}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Đã có / Tối đa:</span>
                <span className="font-semibold text-slate-800">
                  {user.room.currentOccupants} / {user.room.capacityTotal} người
                </span>
              </div>
            </div>
          ) : user.roomPreferences ? (
            <div className="space-y-2 text-xs text-slate-600 mt-4">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Ngân sách tối đa:</span>
                <span className="font-bold text-blue-600">
                  {Math.round(user.roomPreferences.budgetMax / 100000) / 10} triệu/tháng
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Quận tìm kiếm:</span>
                <span className="font-semibold text-slate-800 capitalize">
                  {user.roomPreferences.preferredDistrictCodes
                    .map((d) => d.replace("_", " "))
                    .join(", ") || "Hà Nội"}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Roommate Criteria */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Tiêu chí bạn cùng phòng
          </span>
          <h3 className="text-lg font-bold text-slate-900 mt-0.5 mb-4">
            Kỳ vọng đối tác
          </h3>

          {user.roommatePreferences ? (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Giới tính mong muốn:</span>
                <span className="font-semibold text-slate-800">
                  {user.roommatePreferences.acceptedGenders
                    .map((g) => (g === "female" ? "Nữ" : g === "male" ? "Nam" : "Khác"))
                    .join(", ")}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Độ tuổi:</span>
                <span className="font-semibold text-slate-800">
                  {user.roommatePreferences.ageMin} – {user.roommatePreferences.ageMax} tuổi
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Quy định hút thuốc:</span>
                <span className="font-semibold text-slate-800">
                  {user.roommatePreferences.smokingPolicy === "non_smoker_only"
                    ? "Chỉ người không hút thuốc"
                    : "Chấp nhận hút ngoài ban công"}
                </span>
              </div>

              {user.roommatePreferences.requirementTags.length > 0 && (
                <div className="pt-2 flex flex-wrap gap-1.5">
                  {user.roommatePreferences.requirementTags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-semibold border border-blue-100"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400">Chưa thiết lập tiêu chí.</p>
          )}
        </div>
      </div>
    </div>
  );
}
