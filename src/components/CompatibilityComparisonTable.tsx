"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ChevronDown,
  Filter,
  Check,
  Coffee,
  Home,
  Clock,
  Users,
  DollarSign,
  MessageCircle,
} from "lucide-react";
import {
  QUESTIONNAIRE_CATEGORIES,
  QUESTIONNAIRE_QUESTIONS,
} from "@/lib/questionnaire/catalog.generated";

export type AnswerLookup =
  | Map<number, { optionValues: number[]; otherText?: string | null }>
  | Record<number, { optionValues: number[]; otherText?: string | null }>;

interface CompatibilityComparisonTableProps {
  viewerName: string;
  candidateName: string;
  viewerAnswers: AnswerLookup;
  candidateAnswers: AnswerLookup;
}

export function CompatibilityComparisonTable({
  viewerName,
  candidateName,
  viewerAnswers,
  candidateAnswers,
}: CompatibilityComparisonTableProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<"all" | "match" | "diff">("all");

  const getAnswer = (answers: AnswerLookup, qNum: number) => {
    if (answers instanceof Map) {
      return answers.get(qNum);
    }
    return answers[qNum];
  };

  const categoryIcons: Record<string, any> = {
    lifestyle: Home,
    cleanliness: Sparkles,
    schedule_noise: Clock,
    social_space: Users,
    financial: DollarSign,
    communication: MessageCircle,
  };

  // Helper to format answers
  const getAnswerLabels = (
    question: (typeof QUESTIONNAIRE_QUESTIONS)[0],
    ansObj?: { optionValues: number[]; otherText?: string | null }
  ) => {
    if (!ansObj || !ansObj.optionValues || ansObj.optionValues.length === 0) {
      return "Chưa trả lời";
    }
    const labels = ansObj.optionValues
      .map((val) => {
        const opt = question.options.find((o) => o.value === val);
        return opt ? opt.label_vi : String(val);
      })
      .filter(Boolean);

    if (ansObj.otherText) {
      labels.push(`Khác: ${ansObj.otherText}`);
    }
    return labels.join(", ") || "Chưa trả lời";
  };

  // Compute status
  const evaluateQuestionDiff = (
    question: (typeof QUESTIONNAIRE_QUESTIONS)[0],
    vAns?: { optionValues: number[]; otherText?: string | null },
    cAns?: { optionValues: number[]; otherText?: string | null }
  ) => {
    if (!vAns || !cAns) {
      return { status: "unknown", badge: "Chưa rõ", color: "slate", advice: "" };
    }

    const vVals = vAns.optionValues || [];
    const cVals = cAns.optionValues || [];

    if (vVals.length === 0 || cVals.length === 0) {
      return { status: "unknown", badge: "Chưa rõ", color: "slate", advice: "" };
    }

    if (question.type === "scale_1_5") {
      const diff = Math.abs(vVals[0] - cVals[0]);
      if (diff === 0) {
        return {
          status: "match",
          badge: "Rất ăn ý",
          color: "emerald",
          advice: "Hai bạn có cùng thói quen và quan điểm chung.",
        };
      }
      if (diff === 1) {
        return {
          status: "close",
          badge: "Khác biệt nhỏ",
          color: "blue",
          advice: "Mức độ chênh lệch thấp, rất dễ hòa hợp và bổ trợ cho nhau.",
        };
      }
      return {
        status: "diff",
        badge: "Cần thống nhất",
        color: "amber",
        advice: "Nên thảo luận trước để thống nhất cách sinh hoạt chung hợp lý.",
      };
    }

    // For single or multi choice
    const shared = vVals.filter((x) => cVals.includes(x));
    if (shared.length === vVals.length && shared.length === cVals.length) {
      return {
        status: "match",
        badge: "Trùng khớp 100%",
        color: "emerald",
        advice: "Cả hai chọn tiêu chí hoàn toàn giống nhau.",
      };
    }
    if (shared.length > 0) {
      return {
        status: "close",
        badge: "Tương đồng một phần",
        color: "blue",
        advice: "Có điểm chung, linh hoạt dung hòa các điểm riêng.",
      };
    }
    return {
      status: "diff",
      badge: "Cần trao đổi thêm",
      color: "amber",
      advice: "Nên bàn bạc rõ trước khi quyết định chuyển đến ở cùng.",
    };
  };

  // Filter questions
  const filteredQuestions = QUESTIONNAIRE_QUESTIONS.filter((q) => {
    if (selectedCategory !== "all") {
      const cat = QUESTIONNAIRE_CATEGORIES.find((c) => c.code === selectedCategory);
      if (cat && q.category_id !== cat.id) return false;
    }

    const vAns = getAnswer(viewerAnswers, q.number);
    const cAns = getAnswer(candidateAnswers, q.number);
    const evalResult = evaluateQuestionDiff(q, vAns, cAns);

    if (filterType === "match" && evalResult.status !== "match" && evalResult.status !== "close") {
      return false;
    }
    if (filterType === "diff" && evalResult.status !== "diff") {
      return false;
    }
    return true;
  });

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Đối chiếu 30 chỉ số thực tế</span>
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Bảng so sánh chi tiết thói quen & lối sống
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            So sánh trực tiếp câu trả lời của bạn ({viewerName}) và đối phương ({candidateName}) theo từng tiêu chí sinh hoạt.
          </p>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl self-start md:self-auto text-xs">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
              filterType === "all"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Tất cả ({QUESTIONNAIRE_QUESTIONS.length})
          </button>
          <button
            onClick={() => setFilterType("match")}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
              filterType === "match"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-600 hover:text-emerald-700"
            }`}
          >
            Điểm ăn ý 🟢
          </button>
          <button
            onClick={() => setFilterType("diff")}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
              filterType === "diff"
                ? "bg-white text-amber-700 shadow-sm"
                : "text-slate-600 hover:text-amber-700"
            }`}
          >
            Cần thống nhất 🟡
          </button>
        </div>
      </div>

      {/* Category Pills Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            selectedCategory === "all"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200"
          }`}
        >
          Tất cả nhóm
        </button>

        {QUESTIONNAIRE_CATEGORIES.map((cat) => {
          const Icon = categoryIcons[cat.code] || Home;
          const isActive = selectedCategory === cat.code;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.code)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.name_vi}</span>
              <span className="opacity-70 text-[10px]">({Math.round(cat.weight * 100)}%)</span>
            </button>
          );
        })}
      </div>

      {/* Questions Comparison List */}
      <div className="space-y-3">
        {filteredQuestions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
            Không tìm thấy tiêu chí nào phù hợp với bộ lọc đã chọn.
          </div>
        ) : (
          filteredQuestions.map((q) => {
            const vAns = getAnswer(viewerAnswers, q.number);
            const cAns = getAnswer(candidateAnswers, q.number);
            const vText = getAnswerLabels(q, vAns);
            const cText = getAnswerLabels(q, cAns);
            const evalRes = evaluateQuestionDiff(q, vAns, cAns);

            return (
              <div
                key={q.id}
                className="p-4 rounded-2xl border border-slate-200/90 hover:border-slate-300 bg-slate-50/50 hover:bg-white transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-700 font-bold text-[11px] flex-shrink-0 mt-0.5">
                      Q{q.number}
                    </span>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 leading-snug">
                      {q.text_vi}
                    </h4>
                  </div>

                  <span
                    className={`self-start sm:self-auto px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                      evalRes.color === "emerald"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : evalRes.color === "blue"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {evalRes.badge}
                  </span>
                </div>

                {/* Direct Side-by-side Answers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {/* Your Answer */}
                  <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      Bạn
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-blue-800 uppercase tracking-wider block">
                        {viewerName}
                      </span>
                      <span className="text-xs font-medium text-slate-800 mt-0.5 block">
                        {vText}
                      </span>
                    </div>
                  </div>

                  {/* Candidate's Answer */}
                  <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-100 flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      Họ
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-purple-800 uppercase tracking-wider block">
                        {candidateName}
                      </span>
                      <span className="text-xs font-medium text-slate-800 mt-0.5 block">
                        {cText}
                      </span>
                    </div>
                  </div>
                </div>

                {evalRes.advice && (
                  <div className="text-[11px] text-slate-500 italic flex items-center gap-1.5 pt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />
                    <span>{evalRes.advice}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
