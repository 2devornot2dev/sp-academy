// components/freestyle/review/freestyle-grammar-review.tsx
"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Lightbulb,
  Sparkles,
  Volume2,
  XCircle,
} from "lucide-react";
import { useSpeak } from "@/hooks/use-speak";
import { useWordAudio } from "@/context/word-audio-context";

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
  const [seenIds, setSeenIds] = useState<Set<string>>(
    () => new Set(cards[0] ? [cards[0].id] : []),
  );
  const [activeWordIdx, setActiveWordIdx] = useState<number | null>(null);

  const { speak, isPlaying } = useSpeak();
  const { playWord } = useWordAudio();

  if (!cards.length) {
    return (
      <div className="mx-auto max-w-2xl space-y-5 rounded-3xl border-2 border-b-[6px] border-emerald-200 border-b-emerald-300 bg-white p-8 text-center shadow-sm animate-in fade-in">
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
            <span>Continue to Speaking Drills</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  const current = cards[index] || cards[0];
  const isLast = index === cards.length - 1;
  const words = current.improved.trim().split(/\s+/);

  const selectCard = (newIdx: number) => {
    setActiveWordIdx(null);
    setIndex(newIdx);
    const item = cards[newIdx];
    if (item) {
      setSeenIds((prev) => new Set(prev).add(item.id));
    }
  };

  const handleSpeakWord = async (rawWord: string, wIdx: number) => {
    const clean = rawWord.replace(/^[^\p{L}\p{N}'’-]+|[^\p{L}\p{N}'’-]+$/gu, "");
    if (!clean) return;
    setActiveWordIdx(wIdx);
    try {
      await playWord(clean);
    } catch {
      await speak(clean, targetLanguage, 0.85);
    } finally {
      setActiveWordIdx((cur) => (cur === wIdx ? null : cur));
    }
  };

  return (
    <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12 animate-in fade-in">
      {/* =====================================================================
          LEFT (5 Cols): MASTER LIST OF ALL FIXES & UPGRADES
          ===================================================================== */}
      <div className="flex flex-col justify-between rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-5 shadow-sm lg:col-span-5">
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div>
              <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase">
                Session Repair Deck
              </span>
              <h3 className="text-base font-black text-slate-900">
                All Fixes &amp; Upgrades ({seenIds.size}/{cards.length})
              </h3>
            </div>

            <button
              type="button"
              onClick={onComplete}
              className="inline-flex items-center gap-1 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-black text-blue-600 transition hover:bg-sky-100"
            >
              <span>Step 3: Speak</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-3 max-h-[380px] space-y-2 overflow-y-auto pr-1">
            {cards.map((item, i) => {
              const isSelected = i === index;
              const isSeen = seenIds.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectCard(i)}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-b-4 px-4 py-3 text-left transition-all ${
                    isSelected
                      ? "border-blue-600 border-b-blue-800 bg-sky-50/80 shadow-2xs"
                      : "border-slate-200 border-b-slate-300 bg-white hover:border-sky-300 hover:bg-slate-50/70"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase ${
                          item.kind === "FIX"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-indigo-100 text-indigo-800"
                        }`}
                      >
                        {item.kind === "FIX" ? "Fix" : "Upgrade"}
                      </span>
                      <span className="truncate text-xs font-bold text-slate-400 line-through">
                        {item.original}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm font-black text-slate-900">
                      {item.improved}
                    </p>
                  </div>

                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
                      isSelected
                        ? "bg-blue-600 text-white"
                        : isSeen
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isSeen && !isSelected ? (
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    ) : (
                      i + 1
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Scorecard</span>
            </button>
          ) : (
            <span />
          )}
          <span className="text-[11px] font-bold text-slate-400">
            Click any item to inspect
          </span>
        </div>
      </div>

      {/* =====================================================================
          RIGHT (7 Cols): ACTIVE INTERACTIVE REPAIR STAGE
          ===================================================================== */}
      <div className="flex flex-col justify-between space-y-5 rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-6 shadow-sm sm:p-7 lg:col-span-7">
        <div className="space-y-4">
          {/* Card Header */}
          <div className="flex items-center justify-between gap-2">
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

          {/* What You Said */}
          <div className="rounded-2xl border-2 border-rose-200/80 bg-rose-50/50 px-5 py-3.5">
            <div className="flex items-center gap-1.5 text-[10px] font-black tracking-wider text-rose-500 uppercase">
              <XCircle className="h-3.5 w-3.5" />
              <span>What You Said</span>
            </div>
            <p className="mt-1 text-base font-bold text-rose-900 line-through decoration-rose-400/70">
              &ldquo;{current.original}&rdquo;
            </p>
          </div>

          {/* Native Way with Unified 3D Tactile Word Buttons (Plays S3 MP3s!) */}
          <div className="rounded-3xl border-2 border-b-4 border-emerald-300 border-b-emerald-400 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/40 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-black tracking-wider text-emerald-700 uppercase">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Native Way • Tap any word to hear its MP3</span>
              </div>

              <button
                type="button"
                disabled={isPlaying}
                onClick={() =>
                  void speak(current.improved, targetLanguage, 0.92)
                }
                className="inline-flex items-center gap-1.5 rounded-xl border-2 border-b-[3px] border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 px-3.5 py-1.5 text-xs font-black text-white shadow-2xs transition hover:brightness-105 active:translate-y-0.5 disabled:opacity-60"
              >
                <Volume2 className="h-3.5 w-3.5" />
                <span>Hear Full Phrase</span>
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              {words.map((word, wIdx) => {
                const isActive = activeWordIdx === wIdx;
                return (
                  <button
                    key={`${word}-${wIdx}`}
                    type="button"
                    onClick={() => void handleSpeakWord(word, wIdx)}
                    title="Tap to hear word audio"
                    className={`inline-flex items-center gap-1.5 rounded-2xl border-2 border-b-4 px-3.5 py-2 text-base font-black transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-2 sm:text-lg ${
                      isActive
                        ? "border-blue-700 border-b-blue-900 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-sm"
                        : "border-emerald-200 border-b-emerald-400 bg-white text-emerald-950 hover:border-sky-400 hover:bg-sky-50"
                    }`}
                  >
                    <Volume2
                      className={`h-3.5 w-3.5 ${
                        isActive ? "text-white" : "text-emerald-500"
                      }`}
                    />
                    <span>{word}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Why Box */}
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

        {/* Bottom Prev / Next Controls */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={() => {
              if (index === 0) {
                onBack?.();
              } else {
                selectCard(index - 1);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-white px-4 py-3 text-xs font-black text-slate-600 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{index === 0 ? "Scorecard" : "Previous"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (isLast) {
                onComplete();
              } else {
                selectCard(index + 1);
              }
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0 sm:flex-none sm:px-8"
          >
            {isLast ? (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Next: Speaking Drills</span>
              </>
            ) : (
              <>
                <span>Next Card ({index + 2}/{cards.length})</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}