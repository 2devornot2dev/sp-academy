// components/freestyle/review/freestyle-grammar-review.tsx
"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Sparkles,
  Volume2,
  XCircle,
} from "lucide-react";
import { useSpeak } from "@/hooks/use-speak";

export interface RepairCardItem {
  id: string;
  kind: "FIX" | "UPGRADE";
  badge: string;
  severity?: "MINOR" | "MAJOR" | "CRITICAL";
  original: string;
  improved: string;
  explanation: string;
}

interface Props {
  cards: RepairCardItem[];
  targetLanguage?: string;
  onBack?: () => void;
  onComplete: () => void;
}

export function FreestyleGrammarReview({
  cards,
  targetLanguage = "fr-FR",
  onBack,
  onComplete,
}: Props) {
  const [index, setIndex] = useState(0);
  const [activeWordIdx, setActiveWordIdx] = useState<number | null>(null);
  const { speak, isPlaying } = useSpeak();

  if (!cards.length) {
    return (
      <div className="space-y-5 rounded-3xl border-2 border-b-[6px] border-emerald-200 border-b-emerald-300 bg-white p-8 text-center shadow-sm animate-in fade-in">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-3xl text-white shadow-md">
          🎉
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900">
            Zero Grammar Fixes Needed!
          </h3>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Your phrasing was super clean in this conversation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 rounded-2xl border-2 border-b-[3px] border-slate-200 bg-white px-5 py-4 text-xs font-black text-slate-600 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
          )}
          <button
            onClick={onComplete}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 px-8 py-4 text-sm font-black text-white shadow-lg transition hover:brightness-105 active:translate-y-0.5 active:border-b-0"
          >
            <span>Continue to Word Lab &amp; Speaking</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  const current = cards[index];
  const isLast = index === cards.length - 1;
  const progressPct = Math.round(((index + 1) / cards.length) * 100);
  const words = current.improved.trim().split(/\s+/);

  const handleSpeakWord = async (rawWord: string, wIdx: number) => {
    const clean = rawWord.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
    if (!clean) return;
    setActiveWordIdx(wIdx);
    await speak(clean, targetLanguage, 0.85);
    setActiveWordIdx((cur) => (cur === wIdx ? null : cur));
  };

  return (
    <div className="space-y-6 rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md sm:p-8 animate-in fade-in">
      {/* Top Progress Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-xl border px-3 py-1 text-[10px] font-black tracking-wider uppercase ${
                current.kind === "FIX"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-indigo-200 bg-indigo-50 text-indigo-700"
              }`}
            >
              {current.badge}
            </span>
            {current.severity && (
              <span className="rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black tracking-wider text-amber-800 uppercase">
                {current.severity}
              </span>
            )}
          </div>

          <span className="text-xs font-black text-slate-400">
            Card {index + 1} of {cards.length}
          </span>
        </div>

        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Before -> After Transformation */}
      <div className="space-y-4">
        <div className="rounded-2xl border-2 border-rose-200/80 bg-rose-50/50 px-5 py-3.5">
          <div className="flex items-center gap-1.5 text-[10px] font-black tracking-wider text-rose-500 uppercase">
            <XCircle className="h-3.5 w-3.5" />
            <span>What You Said</span>
          </div>
          <p className="mt-1 text-base font-bold text-rose-900 line-through decoration-rose-400/70">
            &ldquo;{current.original}&rdquo;
          </p>
        </div>

        <div className="rounded-3xl border-2 border-b-4 border-emerald-300 border-b-emerald-400 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[10px] font-black tracking-wider text-emerald-700 uppercase">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Native Way • Tap any word to hear it</span>
            </div>

            <button
              type="button"
              disabled={isPlaying}
              onClick={() => void speak(current.improved, targetLanguage, 0.92)}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-b-[3px] border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 px-3.5 py-1.5 text-xs font-black text-white shadow-2xs transition hover:brightness-105 active:translate-y-0.5 disabled:opacity-60"
            >
              <Volume2 className="h-3.5 w-3.5" />
              <span>Hear Full Phrase</span>
            </button>
          </div>

          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            {words.map((word, wIdx) => {
              const isActive = activeWordIdx === wIdx;
              return (
                <button
                  key={`${word}-${wIdx}`}
                  type="button"
                  onClick={() => void handleSpeakWord(word, wIdx)}
                  title="Tap to hear this word"
                  className={`rounded-xl border-2 border-b-[3px] px-3 py-1.5 text-base font-black transition-all active:translate-y-0.5 sm:text-lg ${
                    isActive
                      ? "border-blue-700 bg-sky-500 text-white shadow-sm"
                      : "border-emerald-200 border-b-emerald-300 bg-white text-emerald-950 hover:border-sky-400 hover:bg-sky-50"
                  }`}
                >
                  {word}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border-2 border-amber-200/80 bg-amber-50/60 px-5 py-3.5">
          <div className="flex items-center gap-1.5 text-[10px] font-black tracking-wider text-amber-700 uppercase">
            <Lightbulb className="h-3.5 w-3.5" />
            <span>Why Natives Say This</span>
          </div>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-700 sm:text-sm">
            {current.explanation}
          </p>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={() => {
            setActiveWordIdx(null);
            if (index === 0) {
              onBack?.();
            } else {
              setIndex((i) => Math.max(0, i - 1));
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-2xl border-2 border-b-[3px] border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-600 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{index === 0 ? "Back to Scorecard" : "Previous"}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveWordIdx(null);
            if (isLast) {
              onComplete();
            } else {
              setIndex((i) => i + 1);
            }
          }}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0 sm:flex-none sm:px-8"
        >
          {isLast ? (
            <>
              <Sparkles className="h-4 w-4" />
              <span>Next: Word Lab &amp; Speaking</span>
            </>
          ) : (
            <>
              <span>Got It · Next Card</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}