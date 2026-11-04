"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Volume2,
  Check,
  Sparkles,
  Lock,
  Headphones,
  Zap,
  HelpCircle,
} from "lucide-react";
import { useWordAudio } from "@/context/word-audio-context";
import { useMatrix } from "@/context/matrix-context";
import { useSpeakWord, cleanWord } from "@/components/foundation/word-tap";

// Auto-detects French/Spanish article & gender tag from the word string
function getWordGrammarBadge(rawWord: string): {
  label: string;
  className: string;
} {
  const lower = (rawWord || "").trim().toLowerCase();
  if (
    lower.startsWith("le ") ||
    lower.startsWith("un ") ||
    lower.startsWith("el ")
  ) {
    return {
      label: "Masculine",
      className: "bg-sky-100 text-blue-700 ring-sky-200",
    };
  }
  if (
    lower.startsWith("la ") ||
    lower.startsWith("une ") ||
    lower.startsWith("una ")
  ) {
    return {
      label: "Feminine",
      className: "bg-pink-100 text-rose-700 ring-pink-200",
    };
  }
  if (lower.startsWith("l'") || lower.startsWith("l’")) {
    return {
      label: "Elision (l')",
      className: "bg-violet-100 text-purple-700 ring-violet-200",
    };
  }
  if (
    lower.startsWith("les ") ||
    lower.startsWith("des ") ||
    lower.startsWith("los ") ||
    lower.startsWith("las ")
  ) {
    return {
      label: "Plural",
      className: "bg-amber-100 text-amber-800 ring-amber-200",
    };
  }
  return {
    label: "Core Vocab",
    className: "bg-slate-100 text-slate-600 ring-slate-200",
  };
}

export function VocabMomentStep({
  data = [],
  onNext,
}: {
  data: any[];
  onNext: () => void;
}) {
  const { activeWord, isPlaying, stopAudio } = useWordAudio();
  const { trackInteraction } = useMatrix();
  const speak = useSpeakWord();

  const [heardIndices, setHeardIndices] = useState<Set<number>>(new Set());
  const [matchedIndices, setMatchedIndices] = useState<Set<number>>(new Set());
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);

  const quizOrder = useMemo(() => {
    const indices = data.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, [data]);

  useEffect(() => {
    data.forEach((item) => {
      const key = cleanWord(item.word);
      if (key) trackInteraction(key, { seen: 1 });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalWords = data.length;
  const allHeard = heardIndices.size >= totalWords && totalWords > 0;
  const allMatched = matchedIndices.size >= totalWords && totalWords > 0;

  const activeQuizTargetIdx = useMemo(() => {
    if (!allHeard || allMatched) return null;
    return quizOrder.find((idx) => !matchedIndices.has(idx)) ?? null;
  }, [allHeard, allMatched, quizOrder, matchedIndices]);

  const activeQuizItem =
    activeQuizTargetIdx !== null ? data[activeQuizTargetIdx] : null;

  const handleCardTap = (idx: number, item: any) => {
    speak(item.word);

    if (!allHeard) {
      setHeardIndices((prev) => {
        const next = new Set(prev);
        next.add(idx);
        return next;
      });
      return;
    }

    if (allHeard && !allMatched && activeQuizTargetIdx !== null) {
      if (matchedIndices.has(idx)) return;

      if (idx === activeQuizTargetIdx) {
        setWrongIdx(null);
        setMatchedIndices((prev) => {
          const next = new Set(prev);
          next.add(idx);
          return next;
        });
      } else {
        setWrongIdx(idx);
        setTimeout(() => setWrongIdx(null), 500);
      }
    }
  };

  const handleNext = () => {
    stopAudio();
    onNext();
  };

  return (
    <div className="flex h-full flex-col justify-between p-6 sm:p-10 animate-in fade-in duration-500">
      {/* =====================================================================
          1. CLEAN HEADER + INLINE STEP PROMPT BANNER RIGHT UNDERNEATH
          ===================================================================== */}
      <div className="space-y-5 text-center">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            {allMatched
              ? "Vocabulary Locked In! 🎉"
              : allHeard
                ? "Quick Memory Match"
                : "Core Vocabulary"}
          </h2>
          <p className="mt-1.5 text-sm sm:text-base font-medium text-slate-500">
            {allMatched
              ? "You've unlocked and matched every word. Tap any card to listen again or start your drills."
              : allHeard
                ? "The English meanings are hidden—tap the French card that matches the prompt below."
                : "Tap each card to hear its native pronunciation and unlock the quick match."}
          </p>
        </div>

        {/* Live Step / Target Prompt Banner Directly Below Title */}
        <div className="mx-auto flex max-w-xl items-center justify-center gap-3.5 rounded-2xl bg-slate-50 px-5 py-3.5 ring-1 ring-slate-200/80">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-b-[3px] text-white shadow-2xs ${
              allMatched
                ? "border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600"
                : allHeard
                  ? "border-orange-700 bg-gradient-to-b from-amber-400 to-orange-500 text-slate-950"
                  : "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600"
            }`}
          >
            {allMatched ? (
              <Sparkles className="h-4 w-4" />
            ) : allHeard ? (
              <Zap className="h-4 w-4 fill-current" />
            ) : (
              <Headphones className="h-4 w-4" />
            )}
          </div>

          <div className="text-left">
            {!allHeard ? (
              <>
                <p className="text-[10px] font-black tracking-wider text-blue-600 uppercase">
                  Step 1 of 2 • Audio Discovery ({heardIndices.size}/
                  {totalWords})
                </p>
                <p className="text-sm sm:text-base font-extrabold text-slate-800">
                  Tap all {totalWords} cards below to hear their pronunciation
                </p>
              </>
            ) : !allMatched && activeQuizItem ? (
              <>
                <p className="text-[10px] font-black tracking-wider text-amber-700 uppercase">
                  Step 2 of 2 • Quick Match ({matchedIndices.size + 1} of{" "}
                  {totalWords})
                </p>
                <p className="text-sm sm:text-base font-extrabold text-slate-900">
                  Tap the French card below for:{" "}
                  <span className="rounded-lg bg-amber-200/90 px-2 py-0.5 font-black text-slate-950">
                    &ldquo;{activeQuizItem.gloss}&rdquo;
                  </span>
                </p>
              </>
            ) : (
              <>
                <p className="text-[10px] font-black tracking-wider text-emerald-600 uppercase">
                  Step 2 of 2 Complete • {totalWords}/{totalWords} Mastered
                </p>
                <p className="text-sm sm:text-base font-extrabold text-slate-800">
                  All words locked in! Click below to begin your Cooldown Drills.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================================
          2. 3D TACTILE AUDIO CARDS GRID
          ===================================================================== */}
      <div className="my-8 grid grid-cols-1 gap-5 md:grid-cols-3">
        {data.map((item, idx) => {
          const isSpeakingThis = isPlaying && activeWord === item.word;
          const isHeard = heardIndices.has(idx);
          const isMatched = matchedIndices.has(idx);
          const isWrongShake = wrongIdx === idx;
          const grammarBadge = getWordGrammarBadge(item.word);

          const hideGlossForQuiz = allHeard && !isMatched;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleCardTap(idx, item)}
              className={`group relative flex flex-col items-center justify-between overflow-hidden rounded-3xl p-6 sm:p-7 text-center transition-all duration-200 focus:outline-none ${
                isWrongShake
                  ? "translate-x-1 border-2 border-b-[6px] border-rose-400 bg-rose-50/70"
                  : isMatched
                    ? "border-2 border-b-[6px] border-emerald-500 bg-gradient-to-b from-emerald-50/80 via-white to-white shadow-lg shadow-emerald-500/10"
                    : isSpeakingThis
                      ? "-translate-y-1 border-2 border-b-[6px] border-indigo-600 bg-gradient-to-b from-indigo-50 via-white to-white shadow-xl shadow-indigo-500/15"
                      : isHeard && !allHeard
                        ? "border-2 border-b-[6px] border-sky-400 bg-gradient-to-b from-sky-50/60 via-white to-white shadow-md"
                        : "border-2 border-b-[6px] border-slate-200 bg-white shadow-sm hover:-translate-y-1 hover:border-indigo-400 hover:shadow-lg active:translate-y-0.5 active:border-b-2"
              }`}
            >
              {/* Top Row: Grammar Gender/Article Pill + Status Check */}
              <div className="flex w-full items-center justify-between gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase ring-1 ${grammarBadge.className}`}
                >
                  {grammarBadge.label}
                </span>

                {isMatched ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-black text-white shadow-2xs">
                    <Check className="h-3 w-3 stroke-[3]" />
                    Matched
                  </span>
                ) : isHeard ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-700">
                    <Check className="h-3 w-3 stroke-[3]" />
                    Heard
                  </span>
                ) : (
                  <span className="animate-pulse rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800">
                    Tap to Hear
                  </span>
                )}
              </div>

              {/* Center 3D Speaker Button + Target Word */}
              <div className="my-6 flex flex-col items-center">
                <div
                  className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-b-4 transition-all duration-200 ${
                    isMatched
                      ? "border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-md shadow-emerald-500/25"
                      : isSpeakingThis
                        ? "scale-110 border-indigo-800 bg-gradient-to-b from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-500/30"
                        : isHeard
                          ? "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-sm"
                          : "border-indigo-200 bg-indigo-50 text-indigo-600 group-hover:border-indigo-700 group-hover:bg-indigo-600 group-hover:text-white"
                  }`}
                >
                  <Volume2
                    size={26}
                    className={isSpeakingThis ? "animate-bounce" : ""}
                  />
                </div>

                <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                  {item.word}
                </h3>
              </div>

              {/* Bottom Meaning Slot */}
              <div className="w-full rounded-2xl bg-slate-50 px-4 py-2.5 ring-1 ring-slate-200/70">
                {hideGlossForQuiz ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-600">
                    <HelpCircle className="h-3.5 w-3.5" />
                    Tap if this matches above
                  </span>
                ) : (
                  <p className="text-base font-bold text-slate-600">
                    &ldquo;{item.gloss}&rdquo;
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          3. CLEAN FOOTER CTA
          ===================================================================== */}
      <div className="mt-auto flex justify-center border-t border-slate-100 pt-6">
        <button
          type="button"
          disabled={!allMatched}
          onClick={handleNext}
          className={`inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-2xl px-12 py-4 text-base font-black transition-all ${
            allMatched
              ? "border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:brightness-105 active:translate-y-0.5 active:border-b-0"
              : "cursor-not-allowed bg-slate-200/80 text-slate-400"
          }`}
        >
          {!allMatched && <Lock className="h-4 w-4" />}
          <span>Begin Cooldown Drills</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}