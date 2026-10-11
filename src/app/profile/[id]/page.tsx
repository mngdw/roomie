import { notFound } from "next/navigation";
import { getCurrentUserId, getCurrentUser } from "@/lib/server/session";
import { withAdminDb } from "@/lib/server/db";
import { fetchCandidateUser } from "@/lib/matching/recommendations";
import { scorePair } from "@/lib/matching/scoring";
import { CandidateProfileHeader } from "@/components/CandidateProfileHeader";
import { CandidateNoteCard } from "@/components/CandidateNoteCard";
import { getCandidateNoteAction } from "@/app/actions";
import {
  Heart,
  Clock,
  Sparkles,
  ShieldCheck,
  Check,
  AlertCircle,
  Home,
  CheckCircle2,
  Users,
  Calendar,
  Building,
  Coffee,
  Volume2,
  Moon,
  Sun,
  Flame,
  Cat,
} from "lucide-react";
import Link from "next/link";

interface ProfilePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function CandidateProfilePage({
  params,
  searchParams,
}: ProfilePageProps) {
  const { id } = await params;
  const { tab } = await searchParams;

  const currentUserId = await getCurrentUserId();
  const currentUser = await getCurrentUser();

  const { candidate, viewer } = await withAdminDb(async (client) => {
    const c = await fetchCandidateUser(client, id);
    const v = await fetchCandidateUser(client, currentUserId);
    return { candidate: c, viewer: v };
  });

  if (!candidate) {
    notFound();
  }

  let compatibility = viewer
    ? scorePair(viewer.answers, candidate.answers)
    : undefined;

  const existingNote = await getCandidateNoteAction(id);

  // Derive 3 personality trait percentages from Q28, Q29, Q30
  // Values are 1 to 5 scale -> convert to percentage: (val / 5) * 100
  const q28Ans = candidate.answers.get(28)?.optionValues[0] ?? 4;
  const q29Ans = candidate.answers.get(29)?.optionValues[0] ?? 4;
  const q30Ans = candidate.answers.get(30)?.optionValues[0] ?? 4;

  const responsibilityPct = Math.round((q28Ans / 5) * 100);
  const patiencePct = Math.round((q29Ans / 5) * 100);
  const opennessPct = Math.round((q30Ans / 5) * 100);

  // Lifestyle answers lookup
  const q1Ans = candidate.answers.get(1)?.optionValues[0]; // Smoking
  const q2Ans = candidate.answers.get(2)?.optionValues[0]; // Pets
  const q6Ans = candidate.answers.get(6)?.optionValues[0]; // Cleaning frequency
  const q10Ans = candidate.answers.get(10)?.optionValues[0]; // Cooking
  const q11Ans = candidate.answers.get(11)?.optionValues[0]; // Bedtime
  const q12Ans = candidate.answers.get(12)?.optionValues[0]; // Waketime
  const q13Ans = candidate.answers.get(13)?.optionValues[0]; // Quiet need
  const q18Ans = candidate.answers.get(18)?.optionValues[0]; // Guests
  const q19Ans = candidate.answers.get(19)?.optionValues[0]; // Overnight guests
  const q23Ans = candidate.answers.get(23)?.optionValues[0]; // Sharing items

  const isLifestyleTab = tab === "lifestyle";

  return (
    <div className="min-h-screen bg-slate-50">
      <CandidateProfileHeader
        candidate={candidate}
        compatibility={compatibility}
        currentUser={currentUser}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {isLifestyleTab ? (
          /* ========================================================
             TAB 2: LỐI SỐNG & PHÒNG TRỌ (Slide 6 & Slide 7)
             ======================================================== */
          <div className="space-y-6">
            {/* Room Details Block (if has_room) */}
            {candidate.housingStatus === "has_room" && candidate.room ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                  <div>
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                      Không gian sống hiện tại
                    </span>
                    <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                      Thông tin phòng trọ đang tìm người ở ghép
                    </h2>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-blue-600">
                      {Math.round(candidate.room.perPersonRent / 100000) / 10} triệu
                    </div>
                    <div className="text-xs text-slate-500">/ người / tháng</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <div className="text-xs text-slate-500 mb-1">Loại phòng</div>
                    <div className="text-sm font-bold text-slate-800">
                      {candidate.room.roomType === "private"
                        ? "Phòng ngủ riêng"
                        : "Ở chung phòng"}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <div className="text-xs text-slate-500 mb-1">Số người ở</div>
                    <div className="text-sm font-bold text-slate-800">
                      {candidate.room.currentOccupants} /{" "}
                      {candidate.room.capacityTotal} người
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <div className="text-xs text-slate-500 mb-1">Khu vực</div>
                    <div className="text-sm font-bold text-slate-800 capitalize">
                      {candidate.room.districtCode.replace("_", " ")}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <div className="text-xs text-slate-500 mb-1">Dọn vào từ</div>
                    <div className="text-sm font-bold text-slate-800">
                      {candidate.room.availableFrom || "Ngay lập tức"}
                    </div>
                  </div>
                </div>

                {/* Facilities List */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Tiện nghi có sẵn trong phòng
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {candidate.room.facilities.length > 0 ? (
                      candidate.room.facilities.map((fac, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-medium"
                        >
                          <Check className="w-3.5 h-3.5 text-blue-600" />
                          <span>{fac}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">
                        Đầy đủ tiện nghi cơ bản (điều hòa, nóng lạnh, wifi...)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : candidate.roomPreferences ? (
              /* Seeker Preferences Block */
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                  Nhu cầu tìm phòng
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5 mb-6">
                  Tiêu chí phòng mong muốn
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="text-xs text-slate-500 mb-1">Ngân sách tối đa</div>
                    <div className="text-lg font-bold text-blue-600">
                      {Math.round(candidate.roomPreferences.budgetMax / 100000) / 10} triệu/tháng
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="text-xs text-slate-500 mb-1">Quận mong muốn</div>
                    <div className="text-sm font-bold text-slate-800">
                      {candidate.roomPreferences.preferredDistrictCodes
                        .map((d) => d.replace("_", " "))
                        .join(", ") || "Hà Nội"}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="text-xs text-slate-500 mb-1">Dự kiến dọn vào</div>
                    <div className="text-sm font-bold text-slate-800">
                      {candidate.roomPreferences.moveInDate || "Trong tháng"}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Lifestyle Matrix Block */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Thói quen sinh hoạt hàng ngày
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5 mb-6">
                Ma trận lối sống & sinh hoạt
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <Moon className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-500">Giờ đi ngủ thường lệ</div>
                    <div className="text-sm font-bold text-slate-800 mt-0.5">
                      {q11Ans === 1
                        ? "Trước 22:00 (Ngủ sớm)"
                        : q11Ans === 2
                        ? "22:00 – 23:30 (Bình thường)"
                        : q11Ans === 3
                        ? "23:30 – 01:00 (Hơi muộn)"
                        : "Sau 01:00 (Cú đêm)"}
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <Sun className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-500">Giờ thức dậy thường lệ</div>
                    <div className="text-sm font-bold text-slate-800 mt-0.5">
                      {q12Ans === 1
                        ? "Trước 06:00 (Dậy sớm)"
                        : q12Ans === 2
                        ? "06:00 – 07:30 (Đúng giờ)"
                        : q12Ans === 3
                        ? "07:30 – 09:00"
                        : "Sau 09:00 (Dậy muộn)"}
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <Sparkles className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-500">Mức độ gọn gàng, dọn dẹp</div>
                    <div className="text-sm font-bold text-slate-800 mt-0.5">
                      {q6Ans && q6Ans >= 4
                        ? "Rất sạch sẽ, dọn dẹp hàng ngày"
                        : q6Ans === 3
                        ? "Gọn gàng vừa phải, dọn hàng tuần"
                        : "Thoải mái, khi bừa mới dọn"}
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <Volume2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-500">Yêu cầu không gian yên tĩnh</div>
                    <div className="text-sm font-bold text-slate-800 mt-0.5">
                      {q13Ans && q13Ans >= 4
                        ? "Cần không gian yên tĩnh tuyệt đối"
                        : "Bình thường, có thể chịu được tiếng ồn sinh hoạt"}
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <Users className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-500">Dẫn bạn bè / khách về phòng</div>
                    <div className="text-sm font-bold text-slate-800 mt-0.5">
                      {q18Ans && q18Ans <= 2
                        ? "Hiếm khi hoặc cần báo trước"
                        : "Thỉnh thoảng vào cuối tuần"}
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-3.5 p-4 rounded-2xl border border-slate-100 bg-slate-50">
                  <Coffee className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-500">Nấu nướng & Dùng chung đồ</div>
                    <div className="text-sm font-bold text-slate-800 mt-0.5">
                      {q10Ans && q10Ans >= 3
                        ? "Thường xuyên nấu nướng ở nhà"
                        : "Ít nấu, chủ yếu ăn ngoài"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================
             TAB 1: THÔNG TIN CÁ NHÂN & TÍNH CÁCH (Slide 5)
             ======================================================== */
          <div className="space-y-6">
            {/* Bio Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 mb-3">
                Giới thiệu bản thân
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed italic">
                {candidate.bio
                  ? `"${candidate.bio}"`
                  : "Chưa có lời giới thiệu bản thân."}
              </p>
            </div>

            {/* Derived Personality Traits (Slide 5: 3 Bars) */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                    Đặc điểm tính cách
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                    Các chỉ số tính cách nổi bật
                  </h3>
                </div>
                <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                  Dẫn xuất từ bộ khảo sát
                </div>
              </div>

              <div className="space-y-4">
                {/* Trait 1: Responsibility */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <span className="text-slate-800">Mức độ cam kết & Trách nhiệm</span>
                    <span className="text-blue-600">{responsibilityPct}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${responsibilityPct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Luôn giữ đúng lời hứa, thanh toán đúng hạn và tôn trọng quy định chung.
                  </p>
                </div>

                {/* Trait 2: Patience */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <span className="text-slate-800">Kiên nhẫn & Bình tĩnh</span>
                    <span className="text-emerald-600">{patiencePct}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-500"
                      style={{ width: `${patiencePct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Ứng xử điềm tĩnh, dễ lắng nghe và cùng nhau tìm giải pháp khi có bất đồng.
                  </p>
                </div>

                {/* Trait 3: Openness */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <span className="text-slate-800">Cởi mở & Hòa đồng</span>
                    <span className="text-purple-600">{opennessPct}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-600 rounded-full transition-all duration-500"
                      style={{ width: `${opennessPct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Thân thiện, tôn trọng sự khác biệt và sẵn sàng chia sẻ trong cuộc sống.
                  </p>
                </div>
              </div>
            </div>

            {/* Roommate Criteria Block */}
            {candidate.roommatePreferences && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Kỳ vọng đối tác
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5 mb-5">
                  Tiêu chí mong muốn ở bạn cùng phòng
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="text-xs text-slate-500">Giới tính mong muốn</div>
                    <div className="text-sm font-bold text-slate-800 mt-0.5">
                      {candidate.roommatePreferences.acceptedGenders
                        .map((g) => (g === "female" ? "Nữ" : g === "male" ? "Nam" : "Bất kỳ"))
                        .join(", ")}
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="text-xs text-slate-500">Độ tuổi phù hợp</div>
                    <div className="text-sm font-bold text-slate-800 mt-0.5">
                      {candidate.roommatePreferences.ageMin} –{" "}
                      {candidate.roommatePreferences.ageMax} tuổi
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="text-xs text-slate-500">Hút thuốc</div>
                    <div className="text-sm font-bold text-slate-800 mt-0.5">
                      {candidate.roommatePreferences.smokingPolicy === "non_smoker_only"
                        ? "Chỉ người không hút thuốc"
                        : "Chấp nhận hút ngoài ban công"}
                    </div>
                  </div>
                </div>

                {/* Requirement Tags */}
                {candidate.roommatePreferences.requirementTags.length > 0 && (
                  <div>
                    <div className="text-xs font-bold text-slate-500 mb-2">
                      Yêu cầu / Quy tắc mong muốn:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {candidate.roommatePreferences.requirementTags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Private Candidate Evaluation & Notes */}
        <div className="mt-8">
          <CandidateNoteCard
            candidateId={candidate.userId}
            candidateName={candidate.displayName}
            initialRating={existingNote?.rating}
            initialTags={existingNote?.tags}
            initialNotes={existingNote?.notes}
            updatedAt={existingNote?.updatedAt}
          />
        </div>
      </div>
    </div>
  );
}
