import { notFound, redirect } from "next/navigation";
import { getCurrentUserId, getCurrentUser } from "@/lib/server/session";
import { withAdminDb } from "@/lib/server/db";
import { fetchCandidateUser } from "@/lib/matching/recommendations";
import { scorePair } from "@/lib/matching/scoring";
import { generateCompatibilityExplanation } from "@/lib/matching/explanation";
import { CandidateProfileHeader } from "@/components/CandidateProfileHeader";
import { MatchScoreBadge } from "@/components/MatchScoreBadge";
import { CompatibilityBars } from "@/components/CompatibilityBars";
import { CompatibilityComparisonTable } from "@/components/CompatibilityComparisonTable";
import { RoommateAgreementAdvice } from "@/components/RoommateAgreementAdvice";
import { CandidateNoteCard } from "@/components/CandidateNoteCard";
import { getCandidateNoteAction } from "@/app/actions";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  HeartHandshake,
} from "lucide-react";

interface CompatibilityPageProps {
  params: Promise<{ id: string }>;
}

export default async function CompatibilityPage({
  params,
}: CompatibilityPageProps) {
  const { id } = await params;
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    redirect("/login");
  }
  const currentUser = await getCurrentUser();

  const { candidate, viewer } = await withAdminDb(async (client) => {
    const c = await fetchCandidateUser(client, id);
    const v = await fetchCandidateUser(client, currentUserId);
    return { candidate: c, viewer: v };
  });

  if (!candidate || !viewer) {
    notFound();
  }

  // Calculate real deterministic compatibility & explanation
  const compatibility = scorePair(viewer.answers, candidate.answers);
  const explanation = generateCompatibilityExplanation(
    viewer,
    candidate,
    compatibility
  );

  // Fetch private evaluation note for this candidate
  const existingNote = await getCandidateNoteAction(id);

  return (
    <div className="min-h-screen bg-slate-50">
      <CandidateProfileHeader
        candidate={candidate}
        compatibility={compatibility}
        currentUser={currentUser}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Main Grid: Score Overview & Category Bars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Overall Match Score Circle */}
          <div className="md:col-span-1 bg-white rounded-3xl border border-slate-200 p-6 flex flex-col items-center justify-center text-center shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              Điểm số tổng hợp
            </span>

            <MatchScoreBadge score={compatibility.finalScore} size="lg" />

            <div className="mt-4">
              <h3 className="font-bold text-slate-900 text-lg">
                {compatibility.finalScore >= 80
                  ? "Rất tương thích"
                  : compatibility.finalScore >= 65
                  ? "Tương thích tốt"
                  : "Mức độ phù hợp trung bình"}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                Được tính từ công thức trọng số 6 danh mục trên toàn bộ 30 câu hỏi
                sinh hoạt và tính cách thực tế của cả hai.
              </p>
            </div>
          </div>

          {/* Right Column: 6 Category Bars */}
          <div className="md:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Chi tiết 6 danh mục tương thích
                </h3>
                <p className="text-xs text-slate-500">
                  Thước đo chuẩn xác theo từng khía cạnh cuộc sống chung
                </p>
              </div>
              <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Trọng số chuẩn 100%</span>
              </div>
            </div>

            <CompatibilityBars categoryScores={compatibility.categoryScores} />
          </div>
        </div>

        {/* Explainability Section: Why you match & Things to discuss */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Why You Match */}
          <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Tại sao hai bạn hợp nhau?
                </h3>
                <span className="text-[11px] text-emerald-600 font-semibold uppercase tracking-wider">
                  Điểm cộng tương đồng
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Những nét tương đồng nổi bật giúp hai bạn dễ dàng hòa nhập và thoải
              mái khi sống chung một mái nhà:
            </p>

            <ul className="space-y-3.5">
              {explanation.whyYouMatch.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5 border border-emerald-200">
                    <span className="text-[10px] font-bold">{idx + 1}</span>
                  </div>
                  <div className="text-xs">
                    <strong className="text-slate-800 font-semibold block">
                      {item.title}
                    </strong>
                    <span className="text-slate-600 mt-0.5 block leading-relaxed">
                      {item.detail}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Things to Discuss */}
          <div className="bg-white rounded-3xl border border-amber-100 shadow-sm p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Những điểm cần trao đổi trước
                </h3>
                <span className="text-[11px] text-amber-600 font-semibold uppercase tracking-wider">
                  Điểm khác biệt cần lưu ý
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Các khác biệt nhỏ về thói quen có thể thương lượng và thống nhất trước
              để tránh hiểu lầm:
            </p>

            {explanation.thingsToDiscuss.length > 0 ? (
              <ul className="space-y-3.5">
                {explanation.thingsToDiscuss.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5 border border-amber-200">
                      <span className="text-[10px] font-bold">{idx + 1}</span>
                    </div>
                    <div className="text-xs">
                      <strong className="text-slate-800 font-semibold block">
                        {item.title}
                      </strong>
                      <span className="text-slate-600 mt-0.5 block leading-relaxed">
                        {item.detail}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-xs text-slate-500 italic p-4 bg-slate-50 rounded-2xl">
                Không có điểm xung đột đáng kể nào giữa thói quen sinh hoạt của hai bạn.
              </div>
            )}
          </div>
        </div>

        {/* Roommate Living Agreement Advice */}
        <RoommateAgreementAdvice
          viewerName={viewer.displayName}
          candidateName={candidate.displayName}
        />

        {/* Side-by-side 30 Questions Comparison Table */}
        <CompatibilityComparisonTable
          viewerName={viewer.displayName}
          candidateName={candidate.displayName}
          viewerAnswers={viewer.answers}
          candidateAnswers={candidate.answers}
        />

        {/* Private Candidate Evaluation & Notes */}
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
  );
}
