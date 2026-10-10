"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Heart,
} from "lucide-react";
import { updateProfileAction, type UpdateProfilePayload } from "@/app/actions";

interface EditProfileClientProps {
  initialData: {
    displayName: string;
    fullName: string;
    occupation?: string;
    schoolOrWorkplace?: string;
    districtCode?: string;
    bio?: string;
    isSmoker: boolean;
    acceptedGenders?: string[];
    ageMin?: number;
    ageMax?: number;
    smokingPolicy?: string;
    requirementTags?: string[];
  };
}

export function EditProfileClient({ initialData }: EditProfileClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form states
  const [displayName, setDisplayName] = useState(initialData.displayName || "");
  const [fullName, setFullName] = useState(initialData.fullName || "");
  const [occupation, setOccupation] = useState(initialData.occupation || "");
  const [schoolOrWorkplace, setSchoolOrWorkplace] = useState(
    initialData.schoolOrWorkplace || ""
  );
  const [districtCode, setDistrictCode] = useState(
    initialData.districtCode || "thanh_xuan"
  );
  const [bio, setBio] = useState(initialData.bio || "");
  const [isSmoker, setIsSmoker] = useState(initialData.isSmoker || false);

  const [acceptedGenders, setAcceptedGenders] = useState<
    Array<"male" | "female" | "other">
  >((initialData.acceptedGenders as any) || ["female"]);
  const [ageMin, setAgeMin] = useState(initialData.ageMin || 18);
  const [ageMax, setAgeMax] = useState(initialData.ageMax || 30);
  const [smokingPolicy, setSmokingPolicy] = useState<
    "non_smoker_only" | "outside_only" | "any"
  >((initialData.smokingPolicy as any) || "non_smoker_only");
  const [requirementTags, setRequirementTags] = useState<string[]>(
    initialData.requirementTags || []
  );
  const [newTag, setNewTag] = useState("");

  const toggleGender = (g: "male" | "female" | "other") => {
    if (acceptedGenders.includes(g)) {
      if (acceptedGenders.length > 1) {
        setAcceptedGenders(acceptedGenders.filter((x) => x !== g));
      }
    } else {
      setAcceptedGenders([...acceptedGenders, g]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSavedSuccess(false);

    startTransition(async () => {
      const payload: UpdateProfilePayload = {
        displayName: displayName.trim() || "Thành viên",
        fullName: fullName.trim() || displayName.trim(),
        occupation,
        schoolOrWorkplace,
        districtCode,
        bio,
        isSmoker,
        acceptedGenders,
        ageMin,
        ageMax,
        smokingPolicy,
        requirementTags,
      };

      const res = await updateProfileAction(payload);
      if (res.success) {
        setSavedSuccess(true);
        setTimeout(() => {
          router.push("/profile");
          router.refresh();
        }, 1200);
      } else {
        setErrorMsg(res.error || "Có lỗi xảy ra khi lưu thay đổi.");
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Chỉnh sửa hồ sơ cá nhân
            </h1>
            <p className="text-xs text-slate-500">
              Cập nhật thông tin nhận diện và tiêu chí tìm bạn cùng phòng
            </p>
          </div>
        </div>
      </div>

      {savedSuccess && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Đã lưu thành công! Đang chuyển về trang hồ sơ...</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Details */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            1. Thông tin cá nhân
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên hiển thị / Biệt danh *
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên đầy đủ *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nghề nghiệp
                </label>
                <input
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trường / Nơi làm việc
                </label>
                <input
                  type="text"
                  value={schoolOrWorkplace}
                  onChange={(e) => setSchoolOrWorkplace(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Khu vực (Hà Nội) *
                </label>
                <select
                  value={districtCode}
                  onChange={(e) => setDistrictCode(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="thanh_xuan">Thanh Xuân</option>
                  <option value="cau_giay">Cầu Giấy</option>
                  <option value="dong_da">Đống Đa</option>
                  <option value="hai_ba_trung">Hai Bà Trưng</option>
                  <option value="ba_dinh">Ba Đình</option>
                </select>
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
                className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={isSmoker}
                  onChange={(e) => setIsSmoker(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <span>Có hút thuốc lá / thuốc lá điện tử</span>
              </label>
            </div>
          </div>
        </div>

        {/* Roommate Criteria */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            2. Tiêu chí bạn cùng phòng mong muốn
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Giới tính chấp nhận
              </label>
              <div className="flex gap-2">
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
                        : "bg-slate-50 border-slate-200 text-slate-600"
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
                  Tuổi tối thiểu: {ageMin} tuổi
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
                  Tuổi tối đa: {ageMax} tuổi
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
                Chính sách hút thuốc
              </label>
              <select
                value={smokingPolicy}
                onChange={(e) => setSmokingPolicy(e.target.value as any)}
                className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="non_smoker_only">Chỉ người không hút thuốc</option>
                <option value="outside_only">Chấp nhận hút ngoài ban công</option>
                <option value="any">Thoải mái</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/profile"
            className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
          >
            Hủy bỏ
          </Link>

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isPending ? "Đang lưu..." : "Lưu thay đổi"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
