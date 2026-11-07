// components/word-matrix-card.tsx
"use client";

import Link from "next/link";
import {
  ArrowRight,
  Grid3X3,
  Mic,
  Lock,
  Sparkles,
  BookOpenCheck,
} from "lucide-react";
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
  fallbackWords = [],
  isLocked = false,
}: WordMatrixCardProps) {
  // Locked State before Spoon 1 is completed
  if (isLocked) {
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-xl border-b-2 border-slate-300 bg-slate-100 px-3 py-1 text-[11px] font-black tracking-wider text-slate-600 uppercase">
            <Grid3X3 className="h-3.5 w-3.5 text-slate-500" /> Word Matrix
          </span>
          <span className="inline-flex items-center gap-1 rounded-xl border-b-2 border-slate-300 bg-slate-100 px-2.5 py-1 text-[10px] font-black tracking-wide text-slate-500 uppercase">
            <Lock className="h-3 w-3" /> Locked
          </span>
        </div>

        <div className="my-auto flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-b-[3px] border-indigo-200 bg-indigo-50 text-indigo-600">
            <Lock className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-base font-black text-slate-900">
            Matrix Vault Locked
          </h3>
          <p className="mt-1.5 max-w-xs text-xs font-medium leading-relaxed text-slate-500">
            Complete <strong className="text-slate-700">Spoon 1</strong> to
            start banking vocabulary and unlocking your pronunciation scores.
          </p>
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
  const topWord = matrixStats?.topWord ?? null;
  const topPhrase = matrixStats?.topPhrase ?? null;
  const avgPronunciation = matrixStats?.avgPronunciation ?? 0;

  const totalTracked = matrixStats?.totalTracked || 0;
  const masteredCount = matrixStats?.statusCounts?.MASTERED ?? 0;
  const familiarCount = matrixStats?.statusCounts?.FAMILIAR ?? 0;
  const learningCount = matrixStats?.statusCounts?.LEARNING ?? 0;

  const masteredPct = totalTracked
    ? Math.max(4, Math.round((masteredCount / totalTracked) * 100))
    : 0;
  const familiarPct = totalTracked
    ? Math.max(4, Math.round((familiarCount / totalTracked) * 100))
    : 0;
  const learningPct = totalTracked
    ? Math.max(4, Math.round((learningCount / totalTracked) * 100))
    : 0;

  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-6 shadow-sm">
      {/* 1. Header & 3D Stat Blocks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-xl border-b-2 border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-black tracking-wider text-indigo-700 uppercase">
            <Grid3X3 className="h-3.5 w-3.5 text-indigo-600" /> Word Matrix
          </span>
          <span className="rounded-xl border-b-2 border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-700">
            {totalCount} Unlocked
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-b-4 border-slate-200/90 border-b-slate-300 bg-slate-50/70 p-3">
            <span className="text-xl font-black text-slate-900">
              {wordsCount}
            </span>
            <span className="mt-0.5 text-[10px] font-black tracking-wider text-slate-400 uppercase">
              Words
            </span>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-b-4 border-indigo-200/80 border-b-indigo-300 bg-indigo-50/40 p-3">
            <span className="text-xl font-black text-indigo-600">
              {phrasesCount}
            </span>
            <span className="mt-0.5 text-[10px] font-black tracking-wider text-indigo-400 uppercase">
              Phrases
            </span>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-b-4 border-emerald-200/90 border-b-emerald-300 bg-emerald-50/50 p-3">
            <span className="text-xl font-black text-emerald-600">
              {avgPronunciation ? `${avgPronunciation}%` : "—"}
            </span>
            <span className="mt-0.5 text-[10px] font-black tracking-wider text-emerald-600/80 uppercase">
              Speech Avg
            </span>
          </div>
        </div>
      </div>

      {/* 2. 3D Top Signatures Rows */}
      <div className="mt-5 space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
            Top Signatures
          </span>
          {matrixStats?.totalSpokenAttempts ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-indigo-600">
              <Mic className="h-3 w-3" /> {matrixStats.totalSpokenAttempts}x
              spoken
            </span>
          ) : null}
        </div>

        <div className="space-y-2">
          {topWord && (
            <div className="flex items-center justify-between rounded-2xl border-2 border-b-4 border-sky-200/90 border-b-sky-300 bg-sky-50/50 p-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-black text-slate-900">
                    {topWord.word}
                  </span>
                  {topWord.translation && (
                    <span className="truncate text-xs font-bold text-slate-500">
                      &ldquo;{topWord.translation}&rdquo;
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5 pl-3">
                <span className="text-[9px] font-black tracking-wider text-blue-600 uppercase">
                  Top Word
                </span>
                {topWord.avgSpokenScore !== null && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-black text-emerald-600">
                    <Sparkles className="h-3 w-3" />
                    {topWord.avgSpokenScore}%
                  </span>
                )}
              </div>
            </div>
          )}

          {topPhrase && (
            <div className="flex items-center justify-between rounded-2xl border-2 border-b-4 border-purple-200/90 border-b-purple-300 bg-purple-50/40 p-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-sm font-black text-slate-900">
                    {topPhrase.word}
                  </span>
                  {topPhrase.translation && (
                    <span className="truncate text-xs font-bold text-slate-500">
                      &ldquo;{topPhrase.translation}&rdquo;
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5 pl-3">
                <span className="text-[9px] font-black tracking-wider text-purple-600 uppercase">
                  Top Phrase
                </span>
                {topPhrase.avgSpokenScore !== null && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-black text-emerald-600">
                    <Sparkles className="h-3 w-3" />
                    {topPhrase.avgSpokenScore}%
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Fallback if they haven't spoken enough yet */}
          {!topWord && !topPhrase && fallbackWords.length > 0 && (
            <div className="rounded-2xl border-2 border-slate-200/80 bg-slate-50 p-3.5">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-black tracking-wider text-slate-400 uppercase">
                <BookOpenCheck className="h-3.5 w-3.5 text-indigo-500" />
                Recently Unlocked
              </div>
              <div className="flex flex-wrap gap-1.5">
                {fallbackWords.slice(0, 5).map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded-xl border-2 border-b-[3px] border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-700"
                  >
                    {item.word}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Memory Retention Pipeline & 3D CTA Button */}
      <div className="mt-5 space-y-3.5">
        {totalTracked > 0 && (
          <div className="space-y-2 rounded-2xl border-2 border-slate-200/80 bg-slate-50/80 p-3.5">
            <div className="flex items-center justify-between text-[10px] font-black uppercase">
              <span className="text-slate-500">Retention</span>
              <span className="text-emerald-600">
                {masteredCount} Mastered
              </span>
            </div>

            <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-slate-200/80 p-0.5">
              {masteredCount > 0 && (
                <div
                  style={{ width: `${masteredPct}%` }}
                  className="rounded-full bg-emerald-500"
                  title={`${masteredCount} Mastered`}
                />
              )}
              {familiarCount > 0 && (
                <div
                  style={{ width: `${familiarPct}%` }}
                  className="rounded-full bg-sky-500"
                  title={`${familiarCount} Familiar`}
                />
              )}
              {learningCount > 0 && (
                <div
                  style={{ width: `${learningPct}%` }}
                  className="rounded-full bg-amber-400"
                  title={`${learningCount} Learning`}
                />
              )}
            </div>
          </div>
        )}

        <Link
          href="/matrix"
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-indigo-800 bg-gradient-to-b from-indigo-500 to-indigo-700 py-3.5 text-sm font-black text-white shadow-md shadow-indigo-500/20 transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0"
        >
          <span>Explore Word Matrix</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}