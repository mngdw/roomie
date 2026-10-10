import { getCurrentUserId } from "@/lib/server/session";
import { withAdminDb } from "@/lib/server/db";
import { fetchCandidateUser } from "@/lib/matching/recommendations";
import Link from "next/link";
import {
  Building,
  Check,
  MapPin,
  Calendar,
  Users,
  Home,
  ShieldCheck,
  Edit3,
} from "lucide-react";

export default async function RoomPage() {
  const currentUserId = await getCurrentUserId();

  const user = await withAdminDb(async (client) => {
    return await fetchCandidateUser(client, currentUserId);
  });

  const room = user?.room;

  if (!room) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
          <Home className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Bạn chưa đăng ký phòng trọ nào
        </h2>
        <p className="text-xs text-slate-500 mb-6 max-w-sm mx-auto">
          Hiện tại hồ sơ của bạn đang ở trạng thái "Đang tìm phòng". Nếu bạn đã
          thuê được phòng và muốn tìm bạn ở ghép, hãy cập nhật trạng thái trong
          phần Onboarding.
        </p>
        <Link
          href="/onboarding"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all"
        >
          <span>Cập nhật trạng thái phòng</span>
        </Link>
      </div>
    );
  }

  const districtName =
    room.districtCode === "thanh_xuan"
      ? "Thanh Xuân"
      : room.districtCode === "cau_giay"
      ? "Cầu Giấy"
      : room.districtCode === "dong_da"
      ? "Đống Đa"
      : room.districtCode === "hai_ba_trung"
      ? "Hai Bà Trưng"
      : room.districtCode || "Hà Nội";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-2">
            <Building className="w-3.5 h-3.5" />
            <span>Phòng trọ đang đăng tìm người</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Thông tin căn phòng của bạn
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Ứng viên tiềm năng trên ROOMIE sẽ nhìn thấy các thông tin này khi xem
            hồ sơ của bạn.
          </p>
        </div>

        <Link
          href="/onboarding"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <Edit3 className="w-4 h-4 text-blue-600" />
          <span>Chỉnh sửa thông tin phòng</span>
        </Link>
      </div>

      {/* Main Room Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span>Quận {districtName}, Hà Nội</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {room.roomType === "private"
                ? "Phòng ngủ riêng biệt"
                : "Phòng ngủ ở chung"}
            </h2>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-3xl font-black text-blue-600">
              {Math.round(room.perPersonRent / 100000) / 10} triệu
            </div>
            <div className="text-xs text-slate-500">
              VNĐ / người / tháng (Tổng {room.monthlyRent.toLocaleString()}đ)
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="text-xs text-slate-500 mb-1">Số người đang ở</div>
            <div className="text-base font-bold text-slate-800">
              {room.currentOccupants} người
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="text-xs text-slate-500 mb-1">Sức chứa tối đa</div>
            <div className="text-base font-bold text-slate-800">
              {room.capacityTotal} người
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="text-xs text-slate-500 mb-1">Chỗ còn trống</div>
            <div className="text-base font-bold text-emerald-600">
              {room.capacityTotal - room.currentOccupants} chỗ
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="text-xs text-slate-500 mb-1">Ngày dọn vào</div>
            <div className="text-base font-bold text-slate-800">
              {room.availableFrom || "Ngay lập tức"}
            </div>
          </div>
        </div>

        {/* Facilities */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            Danh sách tiện ích & cơ sở vật chất
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {room.facilities.map((fac, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-medium text-slate-700"
              >
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{fac}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
