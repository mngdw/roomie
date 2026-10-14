"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Heart,
  Home,
  ClipboardList,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Building,
  Check,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  Trash2,
  Plus,
} from "lucide-react";
import {
  QUESTIONNAIRE_QUESTIONS,
  QUESTIONNAIRE_CATEGORIES,
} from "@/lib/questionnaire/catalog.generated";
import { saveOnboardingAction, type OnboardingPayload } from "@/app/actions";

interface OnboardingWizardProps {
  initialData?: {
    displayName?: string;
    fullName?: string;
    gender?: string;
    dateOfBirth?: string;
    occupation?: string;
    schoolOrWorkplace?: string;
    cityCode?: string;
    districtCode?: string;
    bio?: string;
    isSmoker?: boolean;
    housingStatus?: string;
    acceptedGenders?: string[];
    ageMin?: number;
    ageMax?: number;
    smokingPolicy?: string;
    requirementTags?: string[];
    monthlyRent?: number;
    roomType?: string;
    facilities?: string[];
    budgetMax?: number;
    roomImages?: string[];
    existingAnswers?: Array<{
      questionNumber: number;
      optionValues: number[];
      otherText?: string | null;
    }>;
  };
}

const DISTRICT_LABELS: Record<string, string> = {
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

export function OnboardingWizard({ initialData }: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 1: Personal info
  const [displayName, setDisplayName] = useState(initialData?.displayName || "");
  const [fullName, setFullName] = useState(initialData?.fullName || "");
  const [gender, setGender] = useState<"male" | "female" | "other">(
    (initialData?.gender as any) || "female"
  );
  const [dateOfBirth, setDateOfBirth] = useState(
    initialData?.dateOfBirth || "2003-01-15"
  );
  const [occupation, setOccupation] = useState(
    initialData?.occupation || "Sinh viên"
  );
  const [schoolOrWorkplace, setSchoolOrWorkplace] = useState(
    initialData?.schoolOrWorkplace || "Đại học Hà Nội (HANU)"
  );
  const [cityCode] = useState("hn");
  const [districtCode, setDistrictCode] = useState(
    initialData?.districtCode || "hn-thanh-xuan"
  );
  const [bio, setBio] = useState(
    initialData?.bio ||
      "Mình là người hòa đồng, tôn trọng không gian riêng và luôn giữ gìn vệ sinh chung."
  );
  const [isSmoker, setIsSmoker] = useState(initialData?.isSmoker || false);

  // Step 2: Roommate preferences
  const [acceptedGenders, setAcceptedGenders] = useState<
    Array<"male" | "female" | "other">
  >((initialData?.acceptedGenders as any) || ["female"]);
  const [ageMin, setAgeMin] = useState(initialData?.ageMin || 18);
  const [ageMax, setAgeMax] = useState(initialData?.ageMax || 26);
  const [ageIsDealbreaker, setAgeIsDealbreaker] = useState(false);
  const [smokingPolicy, setSmokingPolicy] = useState<
    "non_smoker_only" | "outside_only" | "any"
  >((initialData?.smokingPolicy as any) || "non_smoker_only");
  const [requirementTags, setRequirementTags] = useState<string[]>(
    initialData?.requirementTags || [
      "clean_tidy",
      "no_smoking",
    ]
  );
  const [newTag, setNewTag] = useState("");

  // Step 3: Housing status
  const [housingStatus, setHousingStatus] = useState<
    "has_room" | "looking_for_room"
  >((initialData?.housingStatus as any) || "looking_for_room");

  // Step 4: Room details or preferences
  const [monthlyRent, setMonthlyRent] = useState(
    initialData?.monthlyRent || 4800000
  );
  const [addressStreet, setAddressStreet] = useState("Nguyễn Trãi, Thanh Xuân");
  const [roomType, setRoomType] = useState<"private" | "shared">(
    (initialData?.roomType as any) || "private"
  );
  const [capacityTotal, setCapacityTotal] = useState(2);
  const [currentOccupants, setCurrentOccupants] = useState(1);
  const [availableFrom, setAvailableFrom] = useState("2026-11-01");
  const [facilities, setFacilities] = useState<string[]>(
    initialData?.facilities || [
      "Điều hòa",
      "Nóng lạnh",
      "Máy giặt",
      "Wifi tốc độ cao",
      "Bếp riêng",
    ]
  );
  const [roomDesc, setRoomDesc] = useState("Phòng rộng rãi, ban công thoáng mát.");
  const [roomImages, setRoomImages] = useState<string[]>(
    initialData?.roomImages || []
  );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    const remainingSlots = 6 - roomImages.length;
    if (remainingSlots <= 0) {
      alert("Bạn đã tải lên tối đa 6 ảnh phòng trọ.");
      return;
    }

    const filesToProcess = newFiles.slice(0, remainingSlots);
    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setRoomImages((prev) => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setRoomImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Seeker preferences (if looking_for_room)
  const [budgetMax, setBudgetMax] = useState(initialData?.budgetMax || 2500000);
  const [preferredDistricts, setPreferredDistricts] = useState<string[]>([
    "hn-thanh-xuan",
    "hn-cau-giay",
  ]);

  // Step 5: 30 Questions Answers Map
  const [answersMap, setAnswersMap] = useState<
    Map<number, { optionValues: number[]; otherText?: string }>
  >(() => {
    const map = new Map<number, { optionValues: number[]; otherText?: string }>();
    if (initialData?.existingAnswers && initialData.existingAnswers.length > 0) {
      for (const ans of initialData.existingAnswers) {
        map.set(ans.questionNumber, {
          optionValues: ans.optionValues,
          otherText: ans.otherText || undefined,
        });
      }
    } else {
      // Default initial answers so user doesn't start from complete blank
      for (let i = 1; i <= 30; i++) {
        if (i === 1) map.set(i, { optionValues: [1] }); // Không hút thuốc
        else if (i === 11) map.set(i, { optionValues: [2] }); // 22:30-23:30
        else if (i === 12) map.set(i, { optionValues: [2] }); // 6:30-7:30
        else if (i === 14) map.set(i, { optionValues: [1] });
        else if (i === 22) map.set(i, { optionValues: [1] });
        else map.set(i, { optionValues: [4] });
      }
    }
    return map;
  });

  const [activeCategoryIdx, setActiveCategoryIdx] = useState(0);

  const toggleGender = (g: "male" | "female" | "other") => {
    if (acceptedGenders.includes(g)) {
      if (acceptedGenders.length > 1) {
        setAcceptedGenders(acceptedGenders.filter((x) => x !== g));
      }
    } else {
      setAcceptedGenders([...acceptedGenders, g]);
    }
  };

  const handleAnswerSelect = (
    questionNumber: number,
    value: number,
    isMulti: boolean
  ) => {
    setAnswersMap((prev) => {
      const copy = new Map(prev);
      const existing = copy.get(questionNumber)?.optionValues || [];
      if (isMulti) {
        if (existing.includes(value)) {
          const next = existing.filter((v) => v !== value);
          copy.set(questionNumber, { optionValues: next.length > 0 ? next : [value] });
        } else {
          copy.set(questionNumber, { optionValues: [...existing, value] });
        }
      } else {
        copy.set(questionNumber, { optionValues: [value] });
      }
      return copy;
    });
  };

  const handleFinalSubmit = () => {
    setErrorMsg(null);
    startTransition(async () => {
      const answersPayload = Array.from(answersMap.entries()).map(
        ([qNum, ans]) => ({
          questionNumber: qNum,
          optionValues: ans.optionValues,
          otherText: ans.otherText,
        })
      );

      const payload: OnboardingPayload = {
        displayName: displayName.trim() || "Thành viên",
        fullName: fullName.trim() || displayName.trim() || "Thành viên ROOMIE",
        gender,
        dateOfBirth,
        occupation,
        schoolOrWorkplace,
        cityCode,
        districtCode,
        bio,
        isSmoker,
        acceptedGenders,
        ageMin,
        ageMax,
        ageIsDealbreaker,
        smokingPolicy,
        requirementTags,
        housingStatus,
        room:
          housingStatus === "has_room"
            ? {
                districtCode,
                addressStreet,
                monthlyRent,
                roomType,
                capacityTotal,
                currentOccupants,
                availableFrom,
                facilities,
                description: roomDesc,
                images: roomImages,
              }
            : undefined,
        roomPreferences:
          housingStatus === "looking_for_room"
            ? {
                preferredDistrictCodes: preferredDistricts,
                budgetMin: 1500000,
                budgetMax,
                roomTypes: ["private", "shared"],
                moveInDate: "2026-11-01",
                moveInFlexDays: 15,
                mustHaveFacilities: facilities,
                requireMedia: false,
              }
            : undefined,
        answers: answersPayload,
      };

      const res = await saveOnboardingAction(payload);
      if (res.success) {
        window.location.href = "/discovery?completed=true";
      } else {
        setErrorMsg(res.error || "Có lỗi xảy ra khi lưu hồ sơ.");
      }
    });
  };

  const activeCategory = QUESTIONNAIRE_CATEGORIES[activeCategoryIdx];
  const questionsInActiveCategory = QUESTIONNAIRE_QUESTIONS.filter(
    (q) => q.category_id === activeCategory.id
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Step Indicator Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
          <span>BƯỚC {step} / 6</span>
          <span className="text-blue-600">
            {step === 1 && "Thông tin cá nhân"}
            {step === 2 && "Tiêu chí bạn cùng phòng"}
            {step === 3 && "Tình trạng nhà ở"}
            {step === 4 && "Chi tiết chỗ ở"}
            {step === 5 && "Bản khảo sát tương thích 30 câu"}
            {step === 6 && "Xem lại & Hoàn tất"}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${(step / 6) * 100}%` }}
          />
        </div>

        {/* Step Circles */}
        <div className="flex justify-between mt-3 text-xs font-semibold text-slate-500">
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <button
              key={s}
              onClick={() => s <= step && setStep(s)}
              disabled={s > step}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${
                s === step
                  ? "text-blue-600 bg-blue-50 font-bold"
                  : s < step
                  ? "text-slate-700 hover:text-blue-600"
                  : "text-slate-300 cursor-not-allowed"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  s === step
                    ? "bg-blue-600 text-white"
                    : s < step
                    ? "bg-emerald-100 text-emerald-700 font-bold"
                    : "bg-slate-200 text-slate-400"
                }`}
              >
                {s < step ? "✓" : s}
              </span>
              <span className="hidden sm:inline">
                {s === 1 && "Cá nhân"}
                {s === 2 && "Bạn cùng phòng"}
                {s === 3 && "Nhà ở"}
                {s === 4 && "Chỗ ở"}
                {s === 5 && "Khảo sát"}
                {s === 6 && "Hoàn tất"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ==========================================================
          STEP 1: THÔNG TIN CÁ NHÂN
          ========================================================== */}
      {step === 1 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-1">
            Thông tin cá nhân cơ bản
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            Hãy điền thông tin trung thực để người khác dễ dàng nhận diện và kết
            nối với bạn.
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Biệt danh / Tên hiển thị *
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ví dụ: Ngọc"
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên đầy đủ *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Bảo Ngọc"
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Giới tính *
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="female">Nữ</option>
                  <option value="male">Nam</option>
                  <option value="other">Khác</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ngày sinh *
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Khu vực sinh sống (Hà Nội) *
                </label>
                <select
                  value={districtCode}
                  onChange={(e) => setDistrictCode(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="hn-thanh-xuan">Thanh Xuân</option>
                  <option value="hn-cau-giay">Cầu Giấy</option>
                  <option value="hn-dong-da">Đống Đa</option>
                  <option value="hn-hai-ba-trung">Hai Bà Trưng</option>
                  <option value="hn-ba-dinh">Ba Đình</option>
                  <option value="hn-hoang-mai">Hoàng Mai</option>
                  <option value="hn-nam-tu-liem">Nam Từ Liêm</option>
                  <option value="hn-bac-tu-liem">Bắc Từ Liêm</option>
                  <option value="hn-ha-dong">Hà Đông</option>
                  <option value="hn-tay-ho">Tây Hồ</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nghề nghiệp
                </label>
                <input
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="Sinh viên / Nhân viên văn phòng"
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trường học / Công ty
                </label>
                <input
                  type="text"
                  value={schoolOrWorkplace}
                  onChange={(e) => setSchoolOrWorkplace(e.target.value)}
                  placeholder="Đại học Hà Nội / Shopee"
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lời giới thiệu bản thân (Bio)
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Chia sẻ ngắn về tính cách và mong muốn của bạn..."
                className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={isSmoker}
                  onChange={(e) => setIsSmoker(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <span>Tôi có thói quen hút thuốc lá / thuốc lá điện tử</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================
          STEP 2: TIÊU CHÍ BẠN CÙNG PHÒNG
          ========================================================== */}
      {step === 2 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-1">
            Tiêu chí bạn cùng phòng mong muốn
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            Thiết lập tiêu chuẩn về người bạn sẵn sàng sống cùng.
          </p>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Giới tính chấp nhận ở cùng
              </label>
              <div className="flex gap-3">
                {[
                  { id: "female", label: "Nữ" },
                  { id: "male", label: "Nam" },
                  { id: "other", label: "Khác" },
                ].map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGender(g.id as any)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      acceptedGenders.includes(g.id as any)
                        ? "bg-blue-50 border-blue-600 text-blue-700"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {acceptedGenders.includes(g.id as any) ? "✓ " : ""}
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Độ tuổi tối thiểu: {ageMin} tuổi
                </label>
                <input
                  type="range"
                  min={18}
                  max={35}
                  value={ageMin}
                  onChange={(e) => setAgeMin(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Độ tuổi tối đa: {ageMax} tuổi
                </label>
                <input
                  type="range"
                  min={18}
                  max={45}
                  value={ageMax}
                  onChange={(e) => setAgeMax(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Chính sách về hút thuốc của bạn cùng phòng
              </label>
              <select
                value={smokingPolicy}
                onChange={(e) => setSmokingPolicy(e.target.value as any)}
                className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="non_smoker_only">
                  Chỉ ở cùng người không hút thuốc (Bắt buộc)
                </option>
                <option value="outside_only">
                  Chấp nhận người hút ngoài ban công
                </option>
                <option value="any">Thoải mái, không quan trọng</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Các tiêu chí bạn cùng phòng kỳ vọng (Chọn các tiêu chí phù hợp)
              </label>
              <p className="text-[11px] text-slate-500 mb-2.5">
                Các tiêu chuẩn này sẽ được hệ thống đối chiếu để lọc và giải thích độ hòa hợp khi sống chung.
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { code: "clean_tidy", label: "✨ Sạch sẽ & gọn gàng" },
                  { code: "no_smoking", label: "🚭 Tuyệt đối không hút thuốc" },
                  { code: "pays_on_time", label: "💵 Đóng tiền đúng hạn" },
                  { code: "respects_privacy", label: "🔒 Tôn trọng không gian riêng" },
                  { code: "share_costs", label: "🤝 Chia sẻ chi phí sòng phẳng" },
                ].map((item) => {
                  const isSelected = requirementTags.includes(item.code);
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setRequirementTags(requirementTags.filter((t) => t !== item.code));
                        } else {
                          setRequirementTags([...requirementTags, item.code]);
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20 font-semibold"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================
          STEP 3: TÌNH TRẠNG NHÀ Ở
          ========================================================== */}
      {step === 3 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-1">
            Tình trạng nhà ở hiện tại
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            Bạn đã có phòng sẵn để rủ người vào ở, hay đang cần tìm phòng cùng
            bạn mới?
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setHousingStatus("has_room")}
              className={`p-6 rounded-3xl border text-left transition-all ${
                housingStatus === "has_room"
                  ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-md"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                <Home className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1">
                Đã có phòng sẵn
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tôi đang thuê một căn phòng và tìm thêm 1 người bạn để san sẻ
                tiền thuê và chi phí sinh hoạt.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setHousingStatus("looking_for_room")}
              className={`p-6 rounded-3xl border text-left transition-all ${
                housingStatus === "looking_for_room"
                  ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-md"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                <Building className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1">
                Đang tìm phòng
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tôi chưa có phòng trọ, đang tìm người có cùng nhu cầu để cùng đi
                tìm thuê phòng hoặc vào ở chung phòng người khác.
              </p>
            </button>
          </div>
        </div>
      )}

      {/* ==========================================================
          STEP 4: CHI TIẾT PHÒNG / TIÊU CHÍ PHÒNG
          ========================================================== */}
      {step === 4 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          {housingStatus === "has_room" ? (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">
                Thông tin căn phòng đang cho ở ghép
              </h2>
              <p className="text-xs text-slate-500 mb-6">
                Cung cấp chi tiết để đối tác hình dung chính xác về không gian
                sống.
              </p>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tổng tiền thuê hàng tháng (VNĐ) *
                    </label>
                    <input
                      type="number"
                      value={monthlyRent}
                      onChange={(e) => setMonthlyRent(Number(e.target.value))}
                      className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="text-[11px] text-slate-500 mt-1">
                      Mỗi người: ~
                      {(monthlyRent / (currentOccupants + 1)).toLocaleString()}đ /
                      tháng
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Loại phòng
                    </label>
                    <select
                      value={roomType}
                      onChange={(e) => setRoomType(e.target.value as any)}
                      className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="private">Phòng ngủ riêng biệt</option>
                      <option value="shared">Ở chung phòng ngủ</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Số người hiện tại
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={currentOccupants}
                      onChange={(e) => setCurrentOccupants(Number(e.target.value))}
                      className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Sức chứa tối đa
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={6}
                      value={capacityTotal}
                      onChange={(e) => setCapacityTotal(Number(e.target.value))}
                      className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Sẵn sàng dọn vào từ
                    </label>
                    <input
                      type="date"
                      value={availableFrom}
                      onChange={(e) => setAvailableFrom(e.target.value)}
                      className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Địa chỉ / Đường phố
                  </label>
                  <input
                    type="text"
                    value={addressStreet}
                    onChange={(e) => setAddressStreet(e.target.value)}
                    placeholder="Số 12 ngõ 182 Lương Thế Vinh, Thanh Xuân"
                    className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Tiện ích có sẵn trong phòng
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      "Điều hòa",
                      "Nóng lạnh",
                      "Máy giặt",
                      "Tủ lạnh",
                      "Wifi tốc độ cao",
                      "Bếp riêng",
                      "Ban công",
                      "Thang máy",
                      "Khóa vân tay",
                      "Chỗ để xe free",
                    ].map((fac) => {
                      const checked = facilities.includes(fac);
                      return (
                        <label
                          key={fac}
                          className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                            checked
                              ? "bg-blue-50 border-blue-400 text-blue-900 font-semibold"
                              : "bg-slate-50 border-slate-200 text-slate-600"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              if (checked) {
                                setFacilities(facilities.filter((f) => f !== fac));
                              } else {
                                setFacilities([...facilities, fac]);
                              }
                            }}
                            className="w-3.5 h-3.5 rounded text-blue-600"
                          />
                          <span>{fac}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Upload Image Section */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                      <span>Hình ảnh phòng trọ (Tải lên tối đa 6 ảnh)</span>
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {roomImages.length}/6 ảnh
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Tải lên ảnh thực tế của căn phòng (phòng ngủ, ban công, phòng khách, nhà vệ sinh) giúp tăng độ tin cậy và thu hút bạn cùng phòng phù hợp.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {/* Render uploaded image thumbnails */}
                    {roomImages.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative group aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm"
                      >
                        <img
                          src={img}
                          alt={`Ảnh phòng ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {idx === 0 && (
                          <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-blue-600 text-white text-[9px] font-bold shadow-sm">
                            Ảnh bìa
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/60 hover:bg-rose-600 text-white transition-colors"
                          title="Xóa ảnh"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {/* Add Photo Button (if < 6) */}
                    {roomImages.length < 6 && (
                      <label
                        htmlFor="room-image-input"
                        className="flex flex-col items-center justify-center aspect-square rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50 cursor-pointer transition-all p-3 text-center group"
                      >
                        <div className="w-9 h-9 rounded-xl bg-white group-hover:bg-blue-100 text-slate-500 group-hover:text-blue-600 flex items-center justify-center mb-1.5 shadow-sm transition-colors">
                          <Plus className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold text-slate-700 group-hover:text-blue-700">
                          Thêm ảnh phòng
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          Tối đa 6 ảnh
                        </span>
                        <input
                          id="room-image-input"
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Room Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mô tả thêm về phòng & không gian sống
                  </label>
                  <textarea
                    rows={3}
                    value={roomDesc}
                    onChange={(e) => setRoomDesc(e.target.value)}
                    placeholder="Phòng rộng rãi, thoáng mát, ban công đón nắng, giờ giấc tự do, an ninh tốt..."
                    className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">
                Tiêu chí phòng trọ mong muốn
              </h2>
              <p className="text-xs text-slate-500 mb-6">
                Đặt ngân sách và yêu cầu phòng để hệ thống ghép bạn với những
                người có phòng phù hợp.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngân sách tối đa của bạn (VNĐ/người/tháng) *
                  </label>
                  <input
                    type="number"
                    step={100000}
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(Number(e.target.value))}
                    className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="text-[11px] text-slate-500 mt-1">
                    Ví dụ: 2,500,000đ = 2.5 triệu
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Các quận mong muốn tìm phòng
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { code: "hn-thanh-xuan", label: "Thanh Xuân" },
                      { code: "hn-cau-giay", label: "Cầu Giấy" },
                      { code: "hn-dong-da", label: "Đống Đa" },
                      { code: "hn-hai-ba-trung", label: "Hai Bà Trưng" },
                      { code: "hn-ba-dinh", label: "Ba Đình" },
                      { code: "hn-hoang-mai", label: "Hoàng Mai" },
                      { code: "hn-nam-tu-liem", label: "Nam Từ Liêm" },
                      { code: "hn-bac-tu-liem", label: "Bắc Từ Liêm" },
                      { code: "hn-ha-dong", label: "Hà Đông" },
                      { code: "hn-tay-ho", label: "Tây Hồ" },
                    ].map((d) => {
                      const isSel = preferredDistricts.includes(d.code);
                      return (
                        <button
                          key={d.code}
                          type="button"
                          onClick={() => {
                            if (isSel) {
                              setPreferredDistricts(
                                preferredDistricts.filter((x) => x !== d.code)
                              );
                            } else {
                              setPreferredDistricts([
                                ...preferredDistricts,
                                d.code,
                              ]);
                            }
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                            isSel
                              ? "bg-blue-50 border-blue-600 text-blue-700"
                              : "bg-slate-50 border-slate-200 text-slate-600"
                          }`}
                        >
                          {isSel ? "✓ " : ""}
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==========================================================
          STEP 5: BẢN KHẢO SÁT 30 CÂU HỎI TƯƠNG THÍCH
          ========================================================== */}
      {step === 5 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                Trọng tâm của ROOMIE
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                Bản khảo sát tương thích 30 chỉ số
              </h2>
            </div>
            <div className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Đã trả lời {answersMap.size}/30 câu
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex space-x-2 overflow-x-auto pb-3 mb-6 border-b border-slate-100">
            {QUESTIONNAIRE_CATEGORIES.map((cat, idx) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategoryIdx(idx)}
                className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeCategoryIdx === idx
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>{cat.name_vi}</span>
                <span className="ml-1 opacity-75">
                  ({Math.round(cat.weight * 100)}%)
                </span>
              </button>
            ))}
          </div>

          {/* Questions in active category */}
          <div className="space-y-6">
            {questionsInActiveCategory.map((q) => {
              const currentAns = answersMap.get(q.number)?.optionValues || [];
              const isMulti = q.type === "multi_choice";

              return (
                <div
                  key={q.id}
                  className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {q.number}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        {q.text_vi}
                      </h4>
                    </div>
                    {isMulti && (
                      <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                        Chọn nhiều
                      </span>
                    )}
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {q.options.map((opt) => {
                      const isSelected = currentAns.includes(opt.value);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            handleAnswerSelect(q.number, opt.value, isMulti)
                          }
                          className={`text-left p-3 rounded-xl text-xs font-medium border transition-all ${
                            isSelected
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                              : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{opt.label_vi}</span>
                            {isSelected && (
                              <Check className="w-4 h-4 text-white flex-shrink-0 ml-1" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Category Pagination Controls */}
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={activeCategoryIdx === 0}
              onClick={() => setActiveCategoryIdx((prev) => prev - 1)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 disabled:opacity-40"
            >
              ← Nhóm trước
            </button>
            <span className="text-xs text-slate-500 font-medium">
              Nhóm {activeCategoryIdx + 1} / {QUESTIONNAIRE_CATEGORIES.length}
            </span>
            <button
              type="button"
              disabled={
                activeCategoryIdx === QUESTIONNAIRE_CATEGORIES.length - 1
              }
              onClick={() => setActiveCategoryIdx((prev) => prev + 1)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-50 text-blue-600 disabled:opacity-40"
            >
              Nhóm tiếp theo →
            </button>
          </div>
        </div>
      )}

      {/* ==========================================================
          STEP 6: XEM LẠI & HOÀN TẤT
          ========================================================== */}
      {step === 6 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="text-center max-w-md mx-auto mb-8">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Sẵn sàng hoàn tất hồ sơ!
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Hệ thống sẽ lưu trữ và tự động tính toán điểm số tương thích với
              tất cả các bạn cùng phòng tiềm năng.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Hồ sơ cá nhân
              </div>
              <div className="text-sm font-bold text-slate-800">
                {displayName} ({fullName})
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {gender === "female" ? "Nữ" : "Nam"} • {occupation} • {DISTRICT_LABELS[districtCode] || districtCode}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Tình trạng & Khảo sát
              </div>
              <div className="text-sm font-bold text-slate-800">
                {housingStatus === "has_room" ? "Đã có phòng sẵn" : "Đang tìm phòng"}
              </div>
              <div className="text-xs text-emerald-600 font-semibold mt-0.5">
                Đã trả lời {answersMap.size}/30 câu hỏi tương thích
              </div>
              {housingStatus === "has_room" && (
                <div className="text-[11px] text-blue-600 font-medium mt-1">
                  Đã tải lên {roomImages.length} ảnh phòng trọ
                </div>
              )}
            </div>
          </div>

          {housingStatus === "has_room" && roomImages.length > 0 && (
            <div className="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="text-xs font-semibold text-slate-700 mb-2">
                Ảnh phòng trọ đã tải lên ({roomImages.length} ảnh):
              </div>
              <div className="flex flex-wrap gap-2">
                {roomImages.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`Ảnh phòng ${i + 1}`}
                    className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-sm"
                  />
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={isPending}
            onClick={handleFinalSubmit}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="w-5 h-5" />
            <span>{isPending ? "Đang lưu hồ sơ..." : "Hoàn tất & Khám phá ngay"}</span>
          </button>
        </div>
      )}

      {/* Navigation Footer (Back / Next) */}
      <div className="flex justify-between items-center mt-6">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </button>
        ) : (
          <div />
        )}

        {step < 6 && (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-colors"
          >
            <span>Tiếp tục</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
