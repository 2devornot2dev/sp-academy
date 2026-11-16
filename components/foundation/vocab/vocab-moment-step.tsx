// components/foundation/vocab/vocab-moment-step.tsx
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
  Lightbulb,
} from "lucide-react";
import { useWordAudio } from "@/context/word-audio-context";
import { useMatrix } from "@/context/matrix-context";
import { useSpeakWord, cleanWord } from "@/components/foundation/word-tap";
import { getPresignedUrls } from "@/app/actions/s3";

// Extracts gender icon, badge theme, and splits article ("le", "la", "l'") from the root noun
function parseWordLinguistics(rawWord: string): {
  symbol: string;
  label: string;
  badgeClass: string;
  articleClass: string;
  article: string | null;
  noun: string;
} {
  const trimmed = (rawWord || "").trim();
  const lower = trimmed.toLowerCase();

  if (
    lower.startsWith("le ") ||
    lower.startsWith("un ") ||
    lower.startsWith("el ")
  ) {
    const spaceIdx = trimmed.indexOf(" ");
    return {
      symbol: "♂",
      label: "Masculine",
      badgeClass: "bg-sky-100 text-blue-700 ring-sky-200",
      articleClass: "bg-sky-100 text-blue-700 border-sky-200",
      article: trimmed.slice(0, spaceIdx),
      noun: trimmed.slice(spaceIdx + 1),
    };
  }

  if (
    lower.startsWith("la ") ||
    lower.startsWith("une ") ||
    lower.startsWith("una ")
  ) {
    const spaceIdx = trimmed.indexOf(" ");
    return {
      symbol: "♀",
      label: "Feminine",
      badgeClass: "bg-rose-100 text-rose-700 ring-rose-200",
      articleClass: "bg-rose-100 text-rose-700 border-rose-200",
      article: trimmed.slice(0, spaceIdx),
      noun: trimmed.slice(spaceIdx + 1),
    };
  }

  if (lower.startsWith("l'") || lower.startsWith("l’")) {
    return {
      symbol: "⚡",
      label: "Vowel Link (l')",
      badgeClass: "bg-violet-100 text-purple-700 ring-violet-200",
      articleClass: "bg-violet-100 text-purple-700 border-violet-200",
      article: trimmed.slice(0, 2),
      noun: trimmed.slice(2),
    };
  }

  if (
    lower.startsWith("les ") ||
    lower.startsWith("des ") ||
    lower.startsWith("los ") ||
    lower.startsWith("las ")
  ) {
    const spaceIdx = trimmed.indexOf(" ");
    return {
      symbol: "✦",
      label: "Plural",
      badgeClass: "bg-amber-100 text-amber-800 ring-amber-200",
      articleClass: "bg-amber-100 text-amber-800 border-amber-200",
      article: trimmed.slice(0, spaceIdx),
      noun: trimmed.slice(spaceIdx + 1),
    };
  }

  return {
    symbol: "★",
    label: "Key Expression",
    badgeClass: "bg-slate-100 text-slate-600 ring-slate-200",
    articleClass: "bg-slate-100 text-slate-700 border-slate-200",
    article: null,
    noun: trimmed,
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
  const [signedImages, setSignedImages] = useState<Record<string, string>>({});

  useEffect(() => {
    const keysToSign = data
      .map((item) => item?.imageS3Key || item?.image_s3_key)
      .filter(
        (k): k is string =>
          Boolean(k) &&
          typeof k === "string" &&
          !k.startsWith("http://") &&
          !k.startsWith("https://"),
      );

    if (keysToSign.length === 0) return;

    let cancelled = false;
    getPresignedUrls(keysToSign)
      .then((res) => {
        if (!cancelled && res) {
          setSignedImages(res);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [data]);

  const getItemImageUrl = (item: any): string | null => {
    if (!item) return null;
    if (item.imageUrl) return item.imageUrl;
    const rawKey = item.imageS3Key || item.image_s3_key;
    if (!rawKey) return null;
    if (rawKey.startsWith("http://") || rawKey.startsWith("https://")) {
      return rawKey;
    }
    return signedImages[rawKey] || null;
  };

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
  const activeQuizImageUrl = getItemImageUrl(activeQuizItem);

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
    <div className="flex h-full flex-1 flex-col justify-between p-6 sm:p-8 animate-in fade-in duration-500">
      {/* =====================================================================
          1. CLEAN HEADER + PICTURE/AUDIO CONNECTION BANNER
          ===================================================================== */}
      <div className="space-y-4 text-center">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            {allMatched
              ? "Vocabulary Locked In! 🎉"
              : allHeard
                ? "Picture & Word Match"
                : "New Scene Vocabulary"}
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">
            {allMatched
              ? "You've unlocked and connected every word. Tap any card to listen again or start your drills."
              : allHeard
                ? "Connect the visual & English meaning below to the matching target word card."
                : "Tap each card to hear its native pronunciation, gender article, and visual."}
          </p>
        </div>

        {/* Live Step / Target Prompt Banner */}
        <div className="mx-auto flex max-w-xl items-center justify-center gap-3.5 rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-slate-50/90 px-5 py-3 shadow-2xs">
          {allHeard && !allMatched && activeQuizImageUrl ? (
            <div className="h-14 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-amber-300 bg-white shadow-xs">
              <img
                src={activeQuizImageUrl}
                alt={activeQuizItem?.gloss || "Target"}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-b-[3px] text-white shadow-2xs ${
                allMatched
                  ? "border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600"
                  : allHeard
                    ? "border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950"
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
          )}

          <div className="text-left">
            {!allHeard ? (
              <>
                <p className="text-[10px] font-black tracking-wider text-blue-600 uppercase">
                  Step 1 of 2 • Audio Discovery ({heardIndices.size}/
                  {totalWords})
                </p>
                <p className="text-xs font-extrabold text-slate-800 sm:text-sm">
                  Tap all {totalWords} cards below to hear their pronunciation
                </p>
              </>
            ) : !allMatched && activeQuizItem ? (
              <>
                <p className="text-[10px] font-black tracking-wider text-amber-700 uppercase">
                  Step 2 of 2 • Visual Connection ({matchedIndices.size + 1} of{" "}
                  {totalWords})
                </p>
                <p className="text-xs font-extrabold text-slate-900 sm:text-sm">
                  Tap the card that means:{" "}
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
                <p className="text-xs font-extrabold text-slate-800 sm:text-sm">
                  All words locked in! Click below to begin your Cooldown Drills.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================================
          2. VERTICALLY CENTERED 3D PICTURE + LINGUISTIC CARDS GRID
          ===================================================================== */}
      <div className="my-auto py-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {data.map((item, idx) => {
            const isSpeakingThis = isPlaying && activeWord === item.word;
            const isHeard = heardIndices.has(idx);
            const isMatched = matchedIndices.has(idx);
            const isWrongShake = wrongIdx === idx;
            const ling = parseWordLinguistics(item.word);
            const imageUrl = getItemImageUrl(item);

            const hideGlossForQuiz = allHeard && !isMatched;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleCardTap(idx, item)}
                className={`group relative flex flex-col items-center justify-between overflow-hidden rounded-3xl p-4 text-center transition-all duration-200 focus:outline-none sm:p-5 ${
                  isWrongShake
                    ? "translate-x-1 border-2 border-b-[6px] border-rose-400 bg-rose-50/70"
                    : isMatched
                      ? "border-2 border-b-[6px] border-emerald-500 bg-gradient-to-b from-emerald-50/80 via-white to-white shadow-lg shadow-emerald-500/10"
                      : isSpeakingThis
                        ? "-translate-y-1 border-2 border-b-[6px] border-blue-600 bg-gradient-to-b from-sky-50 via-white to-white shadow-xl shadow-blue-500/15"
                        : isHeard && !allHeard
                          ? "border-2 border-b-[6px] border-sky-400 bg-gradient-to-b from-sky-50/60 via-white to-white shadow-md"
                          : "border-2 border-b-[6px] border-slate-200 border-b-slate-300 bg-white shadow-sm hover:-translate-y-1 hover:border-sky-400 hover:shadow-lg active:translate-y-0.5 active:border-b-2"
                }`}
              >
                {/* Top Row: Gender Icon Badge + Status Pill */}
                <div className="mb-3 flex w-full items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-wide uppercase ring-1 ${ling.badgeClass}`}
                  >
                    <span className="text-xs leading-none">{ling.symbol}</span>
                    <span>{ling.label}</span>
                  </span>

                  {isMatched ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-black text-white shadow-2xs">
                      <Check className="h-3 w-3 stroke-[3]" />
                      Matched
                    </span>
                  ) : isHeard ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-extrabold text-blue-700">
                      <Check className="h-3 w-3 stroke-[3]" />
                      Heard
                    </span>
                  ) : (
                    <span className="animate-pulse rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-800">
                      Tap to Hear
                    </span>
                  )}
                </div>

                {/* Visual Scene Thumbnail (from prunaai/p-image) OR 3D Speaker Tile Fallback */}
                {imageUrl ? (
                  <div className="relative mb-3.5 h-32 w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-inner sm:h-36">
                    <img
                      src={imageUrl}
                      alt={item.word}
                      className={`h-full w-full object-cover transition-all duration-300 group-hover:scale-105 ${
                        hideGlossForQuiz ? "scale-105 opacity-75 blur-[6px]" : ""
                      }`}
                    />
                    <div
                      className={`absolute right-2.5 bottom-2.5 flex h-9 w-9 items-center justify-center rounded-xl border-b-[3px] shadow-md transition-all ${
                        isMatched
                          ? "border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white"
                          : isSpeakingThis
                            ? "scale-110 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white"
                            : "border-slate-300 bg-white/95 text-blue-600 group-hover:border-blue-800 group-hover:bg-gradient-to-b group-hover:from-sky-400 group-hover:to-blue-600 group-hover:text-white"
                      }`}
                    >
                      <Volume2
                        size={16}
                        className={isSpeakingThis ? "animate-bounce" : ""}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="my-3 flex flex-col items-center">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl border-b-4 transition-all duration-200 ${
                        isMatched
                          ? "border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-md"
                          : isSpeakingThis
                            ? "scale-110 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-lg"
                            : isHeard
                              ? "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-sm"
                              : "border-sky-200 bg-sky-50 text-blue-600 group-hover:border-blue-800 group-hover:bg-gradient-to-b group-hover:from-sky-400 group-hover:to-blue-600 group-hover:text-white"
                      }`}
                    >
                      <Volume2
                        size={24}
                        className={isSpeakingThis ? "animate-bounce" : ""}
                      />
                    </div>
                  </div>
                )}

                {/* Color-Split Article Pill + Root Noun */}
                <div className="mb-3 flex flex-wrap items-baseline justify-center gap-1.5">
                  {ling.article && (
                    <span
                      className={`rounded-lg border px-2 py-0.5 text-base font-black sm:text-lg ${ling.articleClass}`}
                    >
                      {ling.article}
                    </span>
                  )}
                  <h3 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                    {ling.noun}
                  </h3>
                </div>

                {/* Bottom Meaning & Memory Hook Slot */}
                <div className="w-full space-y-1.5 rounded-2xl bg-slate-50 px-3.5 py-2.5 ring-1 ring-slate-200/70">
                  {hideGlossForQuiz ? (
                    <span className="inline-flex items-center gap-1.5 py-1 text-xs font-extrabold text-blue-600">
                      <HelpCircle className="h-3.5 w-3.5" />
                      Tap to match picture
                    </span>
                  ) : (
                    <>
                      <p className="text-sm font-black text-slate-800 sm:text-base">
                        &ldquo;{item.gloss}&rdquo;
                      </p>
                      {item.labelHint &&
                        item.labelHint.toLowerCase() !==
                          item.gloss?.toLowerCase() && (
                          <div className="inline-flex items-center justify-center gap-1 text-[11px] font-bold text-slate-500">
                            <Lightbulb className="h-3 w-3 shrink-0 text-amber-500" />
                            <span className="truncate">{item.labelHint}</span>
                          </div>
                        )}
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          3. CLEAN FOOTER CTA
          ===================================================================== */}
      <div className="flex justify-center border-t border-slate-100 pt-5">
        <button
          type="button"
          disabled={!allMatched}
          onClick={handleNext}
          className={`inline-flex w-full items-center justify-center gap-2.5 rounded-2xl px-10 py-3.5 text-sm font-black transition-all sm:w-auto sm:text-base ${
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