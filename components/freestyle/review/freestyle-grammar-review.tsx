// components/freestyle/review/freestyle-grammar-review.tsx
"use client";

import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Sparkles,
  Volume2,
  XCircle,
} from "lucide-react";
import { useSpeak } from "@/hooks/use-speak";
import { ReviewMistake } from "./review-types";


interface Props {
  mistakes: ReviewMistake[];
  targetLanguage?: string;
  onComplete: () => void;
}

const SEVERITY_BADGE = {
  MINOR: "border-amber-200 bg-amber-50 text-amber-800",
  MAJOR: "border-orange-200 bg-orange-50 text-orange-800",
  CRITICAL: "border-rose-200 bg-rose-50 text-rose-800",
};

export function FreestyleGrammarReview({
  mistakes,
  targetLanguage = "fr-FR",
  onComplete,
}: Props) {
  const [index, setIndex] = useState(0);
  const { speak, isPlaying } = useSpeak();

  if (!mistakes.length) {
    return (
      <div className="space-y-5 rounded-3xl border-2 border-b-[6px] border-emerald-200 border-b-emerald-300 bg-white p-8 text-center shadow-sm animate-in fade-in">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-3xl text-white shadow-md">
          🎉
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900">
            Zero Grammar Mistakes!
          </h3>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Your sentence structure was rock solid in this conversation.
          </p>
        </div>
        <button
          onClick={onComplete}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 px-8 py-4 text-sm font-black text-white shadow-lg transition hover:brightness-105 active:translate-y-0.5 active:border-b-0"
        >
          <span>Continue to Speaking Drill</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const current = mistakes[index];
  const isLast = index === mistakes.length - 1;
  const progressPct = Math.round(((index + 1) / mistakes.length) * 100);

  return (
    <div className="space-y-5 rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-6 shadow-md sm:p-7 animate-in slide-in-from-bottom-4">
      {/* Top Header + Progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-black tracking-wider text-indigo-700 uppercase">
              {current.category}
            </span>
            <span
              className={`rounded-xl border px-2.5 py-1 text-[10px] font-black tracking-wider uppercase ${
                SEVERITY_BADGE[current.severity] || SEVERITY_BADGE.MINOR
              }`}
            >
              {current.severity}
            </span>
          </div>

          <span className="text-xs font-black text-slate-400">
            Fix {index + 1} of {mistakes.length}
          </span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Comparison Cards */}
      <div className="space-y-3">
        {/* What You Said */}
        <div className="rounded-2xl border-2 border-rose-200/80 bg-rose-50/50 px-4 py-3.5">
          <div className="flex items-center gap-1.5 text-[10px] font-black tracking-wider text-rose-500 uppercase">
            <XCircle className="h-3.5 w-3.5" />
            <span>You Said</span>
          </div>
          <p className="mt-1 text-base font-bold text-rose-900 line-through decoration-rose-400/70">
            &ldquo;{current.mistake}&rdquo;
          </p>
        </div>

        {/* Native Correction + Listen Button */}
        <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-b-4 border-emerald-300 border-b-emerald-400 bg-emerald-50/80 px-4 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] font-black tracking-wider text-emerald-700 uppercase">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Native Way</span>
            </div>
            <p className="mt-1 text-lg font-black text-emerald-950">
              &ldquo;{current.correction}&rdquo;
            </p>
          </div>

          <button
            type="button"
            disabled={isPlaying}
            onClick={() => void speak(current.correction, targetLanguage, 0.95)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-b-[3px] border-emerald-600 bg-white text-emerald-600 shadow-2xs transition hover:bg-emerald-100 active:translate-y-0.5 disabled:opacity-50"
            title="Hear native phrasing"
          >
            <Volume2 className="h-5 w-5" />
          </button>
        </div>

        {/* Why Box */}
        <div className="rounded-2xl border-2 border-amber-200/80 bg-amber-50/60 px-4 py-3.5">
          <div className="flex items-center gap-1.5 text-[10px] font-black tracking-wider text-amber-700 uppercase">
            <Lightbulb className="h-3.5 w-3.5" />
            <span>Coach Note</span>
          </div>
          <p className="mt-1 text-xs sm:text-sm font-semibold leading-relaxed text-slate-700">
            {current.explanation}
          </p>
        </div>
      </div>

      {/* 3D Action Button */}
      <button
        onClick={() => (isLast ? onComplete() : setIndex((i) => i + 1))}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 py-4 text-sm font-black text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0"
      >
        {isLast ? (
          <>
            <Sparkles className="h-4 w-4" />
            <span>Got It — Move to Speaking Drill</span>
          </>
        ) : (
          <>
            <span>Got It — Next Fix</span>
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </div>
  );
}