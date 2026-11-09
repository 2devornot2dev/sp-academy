"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Volume2,
  Loader2,
  ArrowRight,
  Check,
  Play,
  Lock,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { ScrollArea, ScrollBar } from "../ui/scroll-area";
import { useSpeak } from "@/hooks/use-speak";
import { useWordAudio } from "@/context/word-audio-context";
import { useMatrix } from "@/context/matrix-context";

export function GrammarStep({
  data,
  onNext,
}: {
  data: any;
  onNext: () => void;
}) {
  const { speak, isLoading: isSentenceLoading } = useSpeak();

  const {
    playWord,
    activeWord,
    isPlaying: isWordPlaying,
    targetLang,
  } = useWordAudio();

  const { trackInteraction } = useMatrix();
  const hasTrackedSeen = useRef(false);

  const [hasPlayedSentence, setHasPlayedSentence] = useState(false);
  const [heardWords, setHeardWords] = useState<Set<string>>(new Set());

  const uniqueWords = useMemo(() => {
    if (!data?.words) return [];
    return Array.from(new Set(data.words.map((w: any) => w.word))) as string[];
  }, [data?.words]);

  useEffect(() => {
    if (!hasTrackedSeen.current && uniqueWords.length > 0) {
      uniqueWords.forEach((word) => {
        trackInteraction(word, { seen: 1 });
      });
      hasTrackedSeen.current = true;
    }
  }, [uniqueWords, trackInteraction]);

  const handlePlaySentence = async () => {
    setHasPlayedSentence(true);
    await speak(data.targetSentence, targetLang);
  };

  const handleWordClick = (word: string) => {
    playWord(word, "m");

    if (!heardWords.has(word)) {
      trackInteraction(word, { heard: 1 });
      setHeardWords((prev) => new Set(prev).add(word));
    }
  };

  const allWordsHeard = heardWords.size === uniqueWords.length;
  const isNextEnabled = hasPlayedSentence && allWordsHeard;
  const showScrollHint = !allWordsHeard && (data?.words?.length ?? 0) > 4;

  return (
    <div className="flex h-full flex-col justify-between overflow-y-auto p-6 sm:p-10 animate-in fade-in duration-500">
      {/* 1. Header */}
      <div className="mb-6 shrink-0">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          Grammar &amp; Meaning
        </h2>
        <p className="mt-1 text-sm sm:text-base font-medium text-slate-500">
          Listen to the full sentence first, then tap each word tile below to
          unlock the next stage.
        </p>
      </div>

      {/* 2. STEP 1: 3D Full Sentence Audio Card */}
      <div className="mb-7 shrink-0">
        <div className="mb-2.5 flex items-center justify-between">
          <h3 className="text-[11px] font-black tracking-widest text-slate-400 uppercase">
            Step 1 • Full Sentence Audio
          </h3>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[11px] font-black ${
              hasPlayedSentence
                ? "bg-emerald-100 text-emerald-800"
                : "animate-pulse bg-sky-100 text-blue-700"
            }`}
          >
            {hasPlayedSentence ? (
              <>
                <Check size={12} strokeWidth={3.5} /> Played
              </>
            ) : (
              "Tap Card Below"
            )}
          </span>
        </div>

        <button
          type="button"
          onClick={handlePlaySentence}
          disabled={isSentenceLoading}
          className={`group relative w-full overflow-hidden rounded-3xl border-2 border-b-[6px] p-6 sm:p-7 text-left transition-all duration-150 focus:outline-none ${
            hasPlayedSentence
              ? "border-emerald-500 bg-gradient-to-b from-emerald-50/50 via-white to-white shadow-md hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-2"
              : "border-sky-400 bg-gradient-to-br from-sky-50/90 via-white to-indigo-50/50 shadow-lg shadow-blue-500/10 hover:-translate-y-0.5 hover:border-blue-500 active:translate-y-0.5 active:border-b-2"
          }`}
        >
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="mb-2.5 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[10px] font-black tracking-wider uppercase ${
                    hasPlayedSentence
                      ? "bg-emerald-500 text-white"
                      : "bg-blue-600 text-white"
                  }`}
                >
                  {isSentenceLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={12} />
                      Loading Audio...
                    </>
                  ) : hasPlayedSentence ? (
                    <>
                      <Check size={12} strokeWidth={3.5} />
                      Sentence Heard • Tap to Replay
                    </>
                  ) : (
                    <>
                      <Volume2 size={12} />
                      Tap Here to Listen First
                    </>
                  )}
                </span>
              </div>

              <p className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                {data.targetSentence}
              </p>
              <p className="mt-1 text-base sm:text-lg font-semibold text-slate-500">
                {data.nativeSentence}
              </p>
            </div>

            {/* 3D Play / Replay Button */}
            <div
              className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border-b-4 px-5 py-3.5 text-sm font-black transition-all ${
                hasPlayedSentence
                  ? "border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-sm"
                  : "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-md shadow-blue-500/25 group-hover:scale-105"
              }`}
            >
              {isSentenceLoading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : hasPlayedSentence ? (
                <>
                  <Volume2 size={18} />
                  <span>Replay</span>
                </>
              ) : (
                <>
                  <Play size={16} className="fill-current" />
                  <span>Play Sentence</span>
                </>
              )}
            </div>
          </div>

          {/* Highlight Group Chunks */}
          {data.highlightGroup && data.highlightGroup.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-200/70 pt-4">
              <span className="mr-1 text-xs font-black tracking-wider text-slate-400 uppercase">
                Key Chunks:
              </span>
              {data.highlightGroup.map((chunk: string, idx: number) => (
                <span
                  key={idx}
                  className="rounded-xl bg-amber-50 px-3 py-1 text-xs font-black text-amber-900 ring-1 ring-amber-200/80"
                >
                  {chunk}
                </span>
              ))}
            </div>
          )}
        </button>
      </div>

      {/* 3. STEP 2: 3D Word-by-Word Breakdown List */}
      <div className="mb-6 flex-1">
        <div className="mb-2.5 flex items-center justify-between">
          <h3 className="text-[11px] font-black tracking-widest text-slate-400 uppercase">
            Step 2 • Word-by-Word Breakdown
          </h3>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[11px] font-black ${
              allWordsHeard
                ? "bg-emerald-100 text-emerald-800"
                : "bg-sky-100 text-blue-700"
            }`}
          >
            {allWordsHeard && <Check size={12} strokeWidth={3.5} />}
            {heardWords.size} / {uniqueWords.length} Words Heard
          </span>
        </div>

        <div className="relative rounded-2xl border border-slate-200/80 bg-slate-50/50 p-2.5">
          <ScrollArea className="h-[260px] pr-4">
            <div className="grid grid-cols-1 gap-3 pb-6 md:grid-cols-2">
              {data.words.map((wordObj: any, idx: number) => {
                const isThisWordPlaying =
                  isWordPlaying && activeWord === wordObj.word;
                const hasBeenHeard = heardWords.has(wordObj.word);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleWordClick(wordObj.word)}
                    disabled={isWordPlaying}
                    className={`group flex items-center gap-3.5 rounded-2xl border-2 border-b-[4px] p-3.5 text-left transition-all duration-150 ${
                      isThisWordPlaying
                        ? "-translate-y-0.5 border-blue-600 bg-sky-50 shadow-md"
                        : hasBeenHeard
                          ? "border-emerald-400 bg-emerald-50/30 hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-2"
                          : "border-slate-200 border-b-slate-300 bg-white hover:-translate-y-0.5 hover:border-sky-400 hover:bg-sky-50/40 active:translate-y-0.5 active:border-b-2"
                    }`}
                  >
                    {/* 3D Mini Speaker Badge */}
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-b-[3px] transition-all ${
                        isThisWordPlaying
                          ? "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white"
                          : hasBeenHeard
                            ? "border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white"
                            : "border-sky-200 bg-sky-50 text-blue-600 group-hover:border-blue-800 group-hover:bg-gradient-to-b group-hover:from-sky-400 group-hover:to-blue-600 group-hover:text-white"
                      }`}
                    >
                      {isThisWordPlaying ? (
                        <Loader2 className="animate-spin" size={14} />
                      ) : hasBeenHeard ? (
                        <Check size={14} strokeWidth={3.5} />
                      ) : (
                        <Volume2 size={14} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-1.5">
                        <span className="text-base font-black text-slate-900">
                          {wordObj.word}
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                          = {wordObj.gloss}
                        </span>
                      </div>

                      <span className="mt-0.5 block text-[10px] font-extrabold tracking-widest text-blue-600/80 uppercase">
                        {wordObj.role}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Always-visible styled vertical scrollbar */}
            <ScrollBar
              orientation="vertical"
              className="w-2.5 rounded-full bg-slate-200/80 p-0.5 opacity-100 [&>div]:rounded-full [&>div]:bg-slate-400 hover:[&>div]:bg-blue-500"
            />
          </ScrollArea>

          {/* Subtle Bottom Scroll Hint Pill when more words exist */}
          {showScrollHint && (
            <div className="pointer-events-none absolute right-4 bottom-2 left-2 flex justify-center bg-gradient-to-t from-slate-50 via-slate-50/80 to-transparent pt-4 pb-0.5">
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-white/95 px-3 py-0.5 text-[10px] font-extrabold tracking-wide text-blue-600 shadow-xs">
                <span>Scroll for more words</span>
                <ChevronDown size={12} className="animate-bounce" />
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 4. Footer with Checklist Pills + 3D Next Button */}
      <div className="mt-auto flex shrink-0 flex-col items-center justify-between gap-4 border-t border-slate-100 pt-5 sm:flex-row">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePlaySentence}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold ring-1 transition-all ${
              hasPlayedSentence
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-sky-50 text-blue-700 ring-sky-200 hover:bg-sky-100"
            }`}
          >
            {hasPlayedSentence ? (
              <Check size={13} strokeWidth={3.5} />
            ) : (
              <Volume2 size={13} />
            )}
            1. Play Sentence
          </button>

          <span
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold ring-1 ${
              allWordsHeard
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-slate-100 text-slate-600 ring-slate-200"
            }`}
          >
            {allWordsHeard ? (
              <Check size={13} strokeWidth={3.5} />
            ) : (
              <Sparkles size={13} />
            )}
            2. Tap All Words ({heardWords.size}/{uniqueWords.length})
          </span>
        </div>

        <button
          type="button"
          onClick={onNext}
          disabled={!isNextEnabled}
          className={`inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl px-8 py-4 text-base font-black transition-all ${
            isNextEnabled
              ? "border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0"
              : "cursor-not-allowed bg-slate-200/80 text-slate-400"
          }`}
        >
          {!isNextEnabled && <Lock size={16} />}
          <span>Next: Pronunciation Lab</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
