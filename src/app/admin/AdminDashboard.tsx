"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Users,
  CheckCircle2,
  Clock,
  Home,
  Building,
  FileSpreadsheet,
  Download,
  Search,
  ChevronRight,
  X,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Eye,
  Sparkles,
  ClipboardList,
  Database,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import {
  QUESTIONNAIRE_QUESTIONS,
  QUESTIONNAIRE_CATEGORIES,
} from "@/lib/questionnaire/catalog.generated";

export interface AdminUserRecord {
  id: string;
  email: string;
  displayName: string;
  fullName: string;
  gender: "male" | "female" | "other";
  dateOfBirth?: string;
  occupation?: string;
  schoolOrWorkplace?: string;
  districtCode?: string;
  housingStatus: "has_room" | "looking_for_room";
  isCompleted: boolean;
  answeredCount: number;
  completedAt?: string | null;
  createdAt: string;
  isVerified: boolean;
  answers: Array<{
    questionNumber: number;
    optionValues: number[];
    otherText?: string | null;
  }>;
}

interface AdminDashboardProps {
  initialUsers: AdminUserRecord[];
}

const DISTRICT_NAMES: Record<string, string> = {
  "hn-thanh-xuan": "Thanh Xuân",
  "hn-cau-giay": "Cầu Giấy",
  "hn-dong-da": "Đống Đa",
  "hn-hai-ba-trung": "Hai Bà Trưng",
  "hn-ba-dinh": "Ba Đình",
  "hn-hoang-mai": "Hoàng Mai",
  "hn-nam-tu-liem": "Nam Từ Liêm",
  "hn-bac-tu-liem": "Bắc Từ Liêm",
  "hn-ha-dong": "Hà Đông",
  "hn-tay-ho": "Tây Hồ",
};

export function AdminDashboard({ initialUsers }: AdminDashboardProps) {
  const [users] = useState<AdminUserRecord[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "pending">("all");
  const [filterHousing, setFilterHousing] = useState<"all" | "has_room" | "looking_for_room">("all");
  const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(null);

  // Metrics
  const totalUsers = users.length;
  const completedCount = users.filter((u) => u.isCompleted).length;
  const pendingCount = totalUsers - completedCount;
  const hasRoomCount = users.filter((u) => u.housingStatus === "has_room").length;
  const lookingRoomCount = users.filter((u) => u.housingStatus === "looking_for_room").length;
  const totalAnswersSubmitted = users.reduce((acc, u) => acc + (u.answeredCount || 0), 0);

  // Filtered users
  const filteredUsers = users.filter((u) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = u.fullName?.toLowerCase().includes(q) || u.displayName?.toLowerCase().includes(q);
      const matchEmail = u.email?.toLowerCase().includes(q);
      if (!matchName && !matchEmail) return false;
    }
    if (filterStatus === "completed" && !u.isCompleted) return false;
    if (filterStatus === "pending" && u.isCompleted) return false;
    if (filterHousing !== "all" && u.housingStatus !== filterHousing) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-2">
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span>Nền tảng Quản trị Cơ sở Dữ liệu ROOMIE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Quản trị Người dùng & Kết quả Bài test
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Theo dõi dữ liệu thực tế được lưu vào PostgreSQL Tokyo: hồ sơ người dùng, tình trạng nhà ở và chi tiết 30 câu hỏi tương thích.
          </p>
        </div>

        {/* Quick CSV Export Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="/api/admin/export?type=users"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-all hover:border-slate-300"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Xuất User (CSV)</span>
          </a>

          <a
            href="/api/admin/export?type=answers"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Xuất 30 câu khảo sát (CSV)</span>
          </a>
        </div>
      </div>

      {/* 4 Overview Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        {/* Card 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Tổng tài khoản đăng ký</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{totalUsers}</div>
          <div className="text-[11px] text-slate-400 mt-1">Tài khoản trong auth.users</div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Đã hoàn tất khảo sát</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {completedCount}{" "}
            <span className="text-xs font-medium text-slate-400">
              ({totalUsers > 0 ? Math.round((completedCount / totalUsers) * 100) : 0}%)
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Đủ 30/30 câu trả lời</div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Tình trạng nhà ở</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Home className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="text-blue-600">{hasRoomCount} có phòng</span>
            <span className="text-slate-300">/</span>
            <span className="text-emerald-600">{lookingRoomCount} tìm phòng</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Phân bổ vai trò ở ghép</div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Dữ liệu khảo sát</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">{totalAnswersSubmitted}</div>
          <div className="text-[11px] text-slate-400 mt-1">Câu trả lời trong user_answers</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="text-xs rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tất cả tiến độ</option>
            <option value="completed">Đã làm 30 câu (Hoàn tất)</option>
            <option value="pending">Chưa hoàn thành</option>
          </select>

          <select
            value={filterHousing}
            onChange={(e) => setFilterHousing(e.target.value as any)}
            className="text-xs rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tất cả tình trạng</option>
            <option value="has_room">Đã có phòng sẵn</option>
            <option value="looking_for_room">Đang tìm phòng</option>
          </select>

          <span className="text-xs text-slate-400 hidden sm:inline">
            ({filteredUsers.length} kết quả)
          </span>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Người dùng</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Khu vực / Nghề</th>
                <th className="py-3.5 px-4">Tình trạng phòng</th>
                <th className="py-3.5 px-4">Bài test (30 câu)</th>
                <th className="py-3.5 px-4">Ngày đăng ký</th>
                <th className="py-3.5 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Không tìm thấy người dùng nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* User Profile */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-100 to-indigo-100 text-blue-700 font-bold text-sm flex items-center justify-center flex-shrink-0 border border-blue-200">
                          {u.displayName?.[0] || u.fullName?.[0] || "U"}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{u.displayName || u.fullName}</span>
                            {u.isVerified && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 inline" />
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {u.fullName !== u.displayName && u.fullName} •{" "}
                            {u.gender === "female" ? "Nữ" : u.gender === "male" ? "Nam" : "Khác"}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                      {u.email}
                    </td>

                    {/* District & School */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">
                        {DISTRICT_NAMES[u.districtCode || ""] || u.districtCode || "Hà Nội"}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                        {u.schoolOrWorkplace || u.occupation || "Chưa cập nhật"}
                      </div>
                    </td>

                    {/* Housing Status */}
                    <td className="py-3.5 px-4">
                      {u.housingStatus === "has_room" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          <Home className="w-3 h-3" />
                          <span>Có phòng</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <Building className="w-3 h-3" />
                          <span>Tìm phòng</span>
                        </span>
                      )}
                    </td>

                    {/* Survey Completion */}
                    <td className="py-3.5 px-4">
                      {u.isCompleted ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Đã làm 30/30 câu</span>
                          </span>
                          {u.completedAt && (
                            <div className="text-[10px] text-slate-400">
                              {new Date(u.completedAt).toLocaleDateString("vi-VN")}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" />
                          <span>{u.answeredCount}/30 câu</span>
                        </span>
                      )}
                    </td>

                    {/* Registration Date */}
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem 30 câu</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==============================================================
          SURVEY ANSWERS INSPECTOR MODAL
          ============================================================== */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white font-bold text-lg flex items-center justify-center shadow-md">
                  {selectedUser.displayName?.[0] || "U"}
                </div>
                <div>
                  <div className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <span>{selectedUser.fullName || selectedUser.displayName}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      {selectedUser.email}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Tình trạng:{" "}
                    <strong>
                      {selectedUser.housingStatus === "has_room" ? "Đã có phòng sẵn" : "Đang tìm phòng"}
                    </strong>{" "}
                    • Trả lời: <strong>{selectedUser.answers.length}/30 câu</strong>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {selectedUser.answers.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                  <p className="font-bold text-slate-700">Người dùng này chưa nộp câu trả lời bài test.</p>
                  <p className="text-xs mt-1">Họ chỉ mới đăng ký tài khoản nhưng chưa hoàn tất Bước 5 Onboarding.</p>
                </div>
              ) : (
                QUESTIONNAIRE_CATEGORIES.map((cat) => {
                  const questionsInCat = QUESTIONNAIRE_QUESTIONS.filter(
                    (q) => q.category_id === cat.id
                  );
                  const userAnswersMap = new Map(
                    selectedUser.answers.map((a) => [a.questionNumber, a])
                  );

                  return (
                    <div key={cat.id} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                        <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                          <span>{cat.name_vi}</span>
                        </h4>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          {Math.round(cat.weight * 100)}% trọng số
                        </span>
                      </div>

                      <div className="space-y-3">
                        {questionsInCat.map((q) => {
                          const userAns = userAnswersMap.get(q.number);
                          const chosenVals = userAns?.optionValues || [];
                          const chosenLabels = q.options
                            .filter((opt) => chosenVals.includes(opt.value))
                            .map((opt) => opt.label_vi);

                          return (
                            <div key={q.id} className="bg-white p-3 rounded-xl border border-slate-200/80">
                              <div className="flex items-start gap-2 mb-1.5">
                                <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center flex-shrink-0">
                                  {q.number}
                                </span>
                                <span className="font-semibold text-xs text-slate-800">
                                  {q.text_vi}
                                </span>
                              </div>

                              <div className="ml-7 mt-1">
                                {chosenLabels.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {chosenLabels.map((lbl, i) => (
                                      <span
                                        key={i}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200"
                                      >
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        <span>{lbl}</span>
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[11px] italic text-slate-400">
                                    Chưa có câu trả lời
                                  </span>
                                )}

                                {userAns?.otherText && (
                                  <div className="mt-1 text-[11px] text-slate-600 italic">
                                    Ghi chú thêm: "{userAns.otherText}"
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Mã người dùng: <code className="bg-white px-1.5 py-0.5 rounded border">{selectedUser.id}</code>
              </span>
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
