"use client";

import React, { useState, useTransition } from "react";
import { Star, Tag, Edit3, Save, CheckCircle2, Lock, Sparkles } from "lucide-react";
import { saveCandidateNoteAction } from "@/app/actions";

interface CandidateNoteCardProps {
  candidateId: string;
  candidateName: string;
  initialRating?: number | null;
  initialTags?: string[];
  initialNotes?: string;
  updatedAt?: string | null;
}

const AVAILABLE_TAGS = [
  "⭐ Rất đáng tin cậy",
  "🏡 Phòng đẹp / Giá hợp lý",
  "🧹 Rất sạch sẽ & ngăn nắp",
  "⏰ Giờ giấc sinh hoạt tương đồng",
  "💬 Giao tiếp thẳng thắn, hòa nhã",
  "⚠️ Cần hỏi thêm về tiền cọc / xe máy",
  "⚠️ Cần thỏa thuận trước về giờ tắt đèn",
  "⚠️ Cần hỏi rõ về tần suất dẫn bạn bè về",
];

export function CandidateNoteCard({
  candidateId,
  candidateName,
  initialRating,
  initialTags = [],
  initialNotes = "",
  updatedAt,
}: CandidateNoteCardProps) {
  const [rating, setRating] = useState<number>(initialRating || 0);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);
  const [notes, setNotes] = useState<string>(initialNotes);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = () => {
    startTransition(async () => {
      const res = await saveCandidateNoteAction({
        candidateId,
        rating: rating > 0 ? rating : null,
        tags: selectedTags,
        notes,
      });
      if (res.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold mb-1.5">
            <Lock className="w-3.5 h-3.5" />
            <span>Ghi chú riêng tư (Chỉ bạn nhìn thấy)</span>
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Đánh giá & Nhận xét cá nhân về {candidateName}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Lưu lại ấn tượng, điểm ưng ý hoặc câu hỏi cần trao đổi khi gặp mặt để dễ so sánh giữa các ứng viên.
          </p>
        </div>

        {savedSuccess && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Đã lưu thành công!</span>
          </div>
        )}
      </div>

      <div className="space-y-5">
        {/* Rating Stars */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            Mức độ ưu tiên / Ưng ý của bạn (1 - 5 sao):
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="p-1 hover:scale-110 transition-transform focus:outline-none"
              >
                <Star
                  className={`w-7 h-7 ${
                    star <= rating
                      ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                      : "text-slate-200 hover:text-slate-300"
                  }`}
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="text-xs font-semibold text-slate-600 ml-2">
                {rating === 5
                  ? "Rất ưng ý (Lựa chọn số 1)"
                  : rating === 4
                  ? "Khá phù hợp"
                  : rating === 3
                  ? "Tạm ổn, cần cân nhắc"
                  : rating === 2
                  ? "Còn nhiều điểm chưa hợp"
                  : "Không ưu tiên"}
              </span>
            )}
          </div>
        </div>

        {/* Quick Review Tags */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-blue-600" />
            <span>Chọn các nhãn nhận xét nhanh:</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    isSelected
                      ? "bg-purple-50 border-purple-300 text-purple-800 font-semibold shadow-2xs"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Free-form Notes Textarea */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
            <span>Ghi chú cá nhân tự do:</span>
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ví dụ: Bạn này có phòng ở Thanh Xuân khá rộng. Cần hỏi về tiền mạng và điện nước tính thế nào. Dự kiến cuối tuần hẹn đi xem phòng..."
            className="w-full text-xs rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-slate-400">
            {updatedAt ? `Cập nhật lần cuối: ${new Date(updatedAt).toLocaleDateString()}` : "Ghi chú này hoàn toàn bảo mật."}
          </span>

          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isPending ? "Đang lưu..." : "Lưu đánh giá & nhận xét"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
