"use client";

import React, { useState, useTransition } from "react";
import {
  QUESTIONNAIRE_QUESTIONS,
  QUESTIONNAIRE_CATEGORIES,
} from "@/lib/questionnaire/catalog.generated";
import {
  ClipboardList,
  Check,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { CATEGORY_WEIGHTS } from "@/lib/matching/constants";

interface QuestionnaireClientProps {
  initialAnswers: Record<number, number[]>;
  userId: string;
}

export function QuestionnaireClient({
  initialAnswers,
  userId,
}: QuestionnaireClientProps) {
  const [answers, setAnswers] = useState<Record<number, number[]>>(initialAnswers);
  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    QUESTIONNAIRE_CATEGORIES[0].id
  );
  const [isPending, startTransition] = useTransition();
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSelectOption = (
    qNumber: number,
    optValue: number,
    isMulti: boolean
  ) => {
    setAnswers((prev) => {
      const cur = prev[qNumber] || [];
      if (isMulti) {
        if (cur.includes(optValue)) {
          const next = cur.filter((x) => x !== optValue);
          return { ...prev, [qNumber]: next.length > 0 ? next : [optValue] };
        } else {
          return { ...prev, [qNumber]: [...cur, optValue] };
        }
      } else {
        return { ...prev, [qNumber]: [optValue] };
      }
    });
    setSavedSuccess(false);
  };

  const handleSave = () => {
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const payload = Object.entries(answers).map(([qNum, vals]) => ({
          questionNumber: Number(qNum),
          optionValues: vals,
        }));

        const res = await fetch("/api/questionnaire", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: payload }),
        });

        if (!res.ok) {
          throw new Error("Lỗi khi lưu câu trả lời.");
        }
        setSavedSuccess(true);
      } catch (err) {
        setErrorMsg((err as Error).message);
      }
    });
  };

  const activeCategory =
    QUESTIONNAIRE_CATEGORIES.find((c) => c.id === activeCategoryId) ||
    QUESTIONNAIRE_CATEGORIES[0];

  const questionsInCategory = QUESTIONNAIRE_QUESTIONS.filter(
    (q) => q.category_id === activeCategory.id
  );

  const totalAnswered = Object.keys(answers).length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-2">
            <ClipboardList className="w-3.5 h-3.5" />
            <span>30 Câu hỏi tương thích đa chiều</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Bản khảo sát lối sống & tính cách
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Các câu hỏi này là nguồn dữ liệu chuẩn mực để bộ máy Matching Engine
            tính toán tỷ lệ tương thích. Bạn có thể cập nhật câu trả lời bất kỳ
            lúc nào.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200 text-xs shadow-sm">
            <span className="text-slate-500">Đã trả lời: </span>
            <span className="font-bold text-blue-600 text-sm">
              {totalAnswered}/30 câu
            </span>
          </div>

          <button
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isPending ? "Đang lưu..." : "Lưu thay đổi"}</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>
            Đã lưu thành công! Điểm số tương thích của bạn đã được cập nhật.
          </span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Category Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-8">
        {QUESTIONNAIRE_CATEGORIES.map((cat) => {
          const isActive = cat.id === activeCategoryId;
          const weightPct = Math.round(cat.weight * 100);
          const catQuestions = QUESTIONNAIRE_QUESTIONS.filter(
            (q) => q.category_id === cat.id
          );
          const answeredInCat = catQuestions.filter((q) => answers[q.number])
            .length;

          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategoryId(cat.id)}
              className={`p-3 rounded-2xl border text-left transition-all ${
                isActive
                  ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    isActive ? "text-blue-100" : "text-slate-400"
                  }`}
                >
                  {weightPct}% Trọng số
                </span>
                <span
                  className={`text-[10px] font-semibold ${
                    isActive ? "text-white" : "text-blue-600"
                  }`}
                >
                  {answeredInCat}/{catQuestions.length}
                </span>
              </div>
              <div className="font-bold text-xs line-clamp-1">{cat.name_vi}</div>
            </button>
          );
        })}
      </div>

      {/* Active Category Heading */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              Danh mục câu hỏi
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-0.5">
              {activeCategory.name_vi}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Chiếm trọng số {Math.round(activeCategory.weight * 100)}% trong công
              thức tính điểm tương thích tổng thể.
            </p>
          </div>
        </div>

        {/* Question Cards */}
        <div className="space-y-6">
          {questionsInCategory.map((q) => {
            const curVal = answers[q.number] || [];
            const isMulti = q.type === "multi_choice";

            return (
              <div
                key={q.id}
                className="p-5 rounded-2xl bg-slate-50 border border-slate-100"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                      {q.number}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      {q.text_vi}
                    </h3>
                  </div>
                  {isMulti && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      Được chọn nhiều
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                  {q.options.map((opt) => {
                    const isSelected = curVal.includes(opt.value);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          handleSelectOption(q.number, opt.value, isMulti)
                        }
                        className={`text-left p-3.5 rounded-xl text-xs font-medium border transition-all ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{opt.label_vi}</span>
                          {isSelected && (
                            <Check className="w-4 h-4 text-white flex-shrink-0 ml-1.5" />
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
      </div>
    </div>
  );
}
