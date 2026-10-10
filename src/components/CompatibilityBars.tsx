"use client";

import React from "react";
import { CATEGORY_META, CATEGORY_WEIGHTS } from "@/lib/matching/constants";
import type { CategoryKey, CategoryScoreResult } from "@/lib/matching/types";

interface CompatibilityBarsProps {
  categoryScores: Record<CategoryKey, CategoryScoreResult | number | { score: number }>;
}

const CATEGORY_ORDER: CategoryKey[] = [
  "lifestyle",
  "cleanliness",
  "schedule_noise",
  "social_space",
  "communication",
  "financial",
];

export function CompatibilityBars({ categoryScores }: CompatibilityBarsProps) {
  return (
    <div className="space-y-4">
      {CATEGORY_ORDER.map((catKey) => {
        const val = categoryScores[catKey];
        const numVal =
          typeof val === "number"
            ? val
            : typeof val === "object" && val !== null
            ? (val as any).score ?? 0
            : 0;
        const score = Math.round(numVal);
        const meta = CATEGORY_META[catKey];
        const weightPct = Math.round(CATEGORY_WEIGHTS[catKey] * 100);

        let barColor = "bg-blue-600";
        if (score >= 80) barColor = "bg-emerald-500";
        else if (score >= 65) barColor = "bg-blue-600";
        else if (score >= 50) barColor = "bg-amber-500";
        else barColor = "bg-rose-500";

        return (
          <div key={catKey} className="group">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-800">
                  {meta?.name_vi || catKey}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  ({weightPct}%)
                </span>
              </div>
              <span className="font-bold text-slate-700">{score}%</span>
            </div>

            {/* Progress Bar Container */}
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
                style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-400 mt-1 line-clamp-1 group-hover:line-clamp-none transition-all">
              {meta?.description_vi}
            </p>
          </div>
        );
      })}
    </div>
  );
}
