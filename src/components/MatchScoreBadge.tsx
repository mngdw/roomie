"use client";

import React from "react";
import { Sparkles } from "lucide-react";

interface MatchScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function MatchScoreBadge({
  score,
  size = "md",
  showLabel = true,
}: MatchScoreBadgeProps) {
  const rounded = Math.round(score);

  // Color scheme based on compatibility level
  let colorClass = "from-emerald-500 to-teal-600 text-white";
  let bgClass = "bg-emerald-50 text-emerald-700 border-emerald-200";

  if (rounded >= 85) {
    colorClass = "from-emerald-500 to-teal-600 text-white";
    bgClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (rounded >= 70) {
    colorClass = "from-blue-600 to-indigo-600 text-white";
    bgClass = "bg-blue-50 text-blue-700 border-blue-200";
  } else if (rounded >= 50) {
    colorClass = "from-amber-500 to-orange-500 text-white";
    bgClass = "bg-amber-50 text-amber-700 border-amber-200";
  } else {
    colorClass = "from-slate-500 to-slate-600 text-white";
    bgClass = "bg-slate-100 text-slate-700 border-slate-200";
  }

  if (size === "lg") {
    return (
      <div className="flex flex-col items-center">
        <div
          className={`relative w-28 h-28 rounded-full bg-gradient-to-tr ${colorClass} flex flex-col items-center justify-center shadow-lg shadow-blue-500/10 border-4 border-white`}
        >
          <div className="text-3xl font-extrabold tracking-tight">
            {rounded}%
          </div>
          <div className="text-[11px] font-semibold tracking-wider uppercase opacity-90">
            Hợp nhau
          </div>
        </div>
      </div>
    );
  }

  if (size === "sm") {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${bgClass}`}
      >
        <Sparkles className="w-3 h-3" />
        {rounded}%
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm ${bgClass}`}
    >
      <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
      <span className="text-sm font-bold">{rounded}%</span>
      {showLabel && (
        <span className="text-xs font-medium opacity-90">Tương thích</span>
      )}
    </div>
  );
}
