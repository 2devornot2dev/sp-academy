// components/learning-hub/word-matrix-card.tsx
"use client";

import Link from "next/link";
import { ArrowRight, Grid3X3, Lock, Mic } from "lucide-react";
import type { LearningPath } from "@/app/actions/get-learning-path";

type MatrixStats = LearningPath["matrixStats"];

type WordMatrixCardProps = {
  totalWordsLearned: number;
  matrixStats?: MatrixStats | null;
  fallbackWords?: Array<{ word: string; gloss?: string }>;
  isLocked?: boolean;
};

export function WordMatrixCard({
  totalWordsLearned,
  matrixStats,
  isLocked = false,
}: WordMatrixCardProps) {
  if (isLocked) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-3xl border-2 border-b-[5px] border-slate-200/90 border-b-slate-300 bg-white px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
            <Lock className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-black text-slate-800">Word Matrix</p>
            <p className="text-[11px] font-medium text-slate-400">
              Complete Spoon 1 to unlock stats
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalCount =
    matrixStats && matrixStats.totalTracked > 0
      ? matrixStats.totalTracked
      : totalWordsLearned;

  const wordsCount = matrixStats?.wordsCount || totalCount;
  const phrasesCount = matrixStats?.phrasesCount ?? 0;
  const avgPronunciation = matrixStats?.avgPronunciation ?? 0;
  const masteredCount = matrixStats?.statusCounts?.MASTERED ?? 0;
  const totalTracked = matrixStats?.totalTracked || 0;
  const masteredPct = totalTracked
    ? Math.min(100, Math.round((masteredCount / totalTracked) * 100))
    : 0;

  return (
    <div className="flex flex-col gap-3 rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-xl border-b-2 border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-black tracking-wider text-indigo-700 uppercase">
          <Grid3X3 className="h-3.5 w-3.5 text-indigo-600" /> Word Matrix
        </span>
        {matrixStats?.totalSpokenAttempts ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-indigo-600">
            <Mic className="h-3 w-3" /> {matrixStats.totalSpokenAttempts}x
            spoken
          </span>
        ) : (
          <span className="text-[10px] font-black text-slate-400">
            {totalCount} Unlocked
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-slate-50 px-2 py-2 ring-1 ring-slate-200/70">
          <span className="block text-base font-black text-slate-900">
            {wordsCount}
          </span>
          <span className="text-[9px] font-black text-slate-400 uppercase">
            Words
          </span>
        </div>
        <div className="rounded-xl bg-indigo-50/50 px-2 py-2 ring-1 ring-indigo-200/70">
          <span className="block text-base font-black text-indigo-600">
            {phrasesCount}
          </span>
          <span className="text-[9px] font-black text-indigo-400 uppercase">
            Phrases
          </span>
        </div>
        <div className="rounded-xl bg-emerald-50/60 px-2 py-2 ring-1 ring-emerald-200/70">
          <span className="block text-base font-black text-emerald-600">
            {avgPronunciation ? `${avgPronunciation}%` : "—"}
          </span>
          <span className="text-[9px] font-black text-emerald-600/80 uppercase">
            Speech Avg
          </span>
        </div>
      </div>

      {totalTracked > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase">
            <span>Retention</span>
            <span className="text-emerald-600">{masteredCount} Mastered</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${Math.max(4, masteredPct)}%` }}
            />
          </div>
        </div>
      )}

      <Link
        href="/matrix"
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-indigo-800 bg-gradient-to-b from-indigo-500 to-indigo-700 py-2.5 text-xs font-black text-white shadow-sm transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0"
      >
        <span>Explore Word Matrix</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}