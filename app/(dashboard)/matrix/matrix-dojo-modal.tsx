// components/matrix/matrix-dojo-modal.tsx
"use client";

import React from "react";
import {
  X,
  Volume2,
  Turtle,
  Square,
  Loader2,
  Mic,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import {
  CATEGORY_META,
  EnrichedWordStat,
  SessionScore,
  WordStat,
} from "./matrix-types";

interface MatrixDojoModalProps {
  isOpen: boolean;
  activeDojoWord: EnrichedWordStat | null;
  dojoIndex: number;
  dojoQueueLength: number;
  activeMicWordId: string | null;
  status: string;
  sessionResult?: SessionScore;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onListen: (wordStat: WordStat, speed: number) => void;
  onPronunciationTest: (wordStat: WordStat) => void;
}
import { VoiceMicButton } from "@/components/ui/misc/voice-mic-button";

export function MatrixDojoModal({
  isOpen,
  activeDojoWord,
  dojoIndex,
  dojoQueueLength,
  activeMicWordId,
  status,
  sessionResult,
  onClose,
  onPrev,
  onNext,
  onListen,
  onPronunciationTest,
}: MatrixDojoModalProps) {
  if (!isOpen || !activeDojoWord) return null;

  const isListening =
    activeMicWordId === activeDojoWord.id && status === "listening";
  const isAnalyzing =
    activeMicWordId === activeDojoWord.id && status === "analyzing";
  const currentScore = sessionResult?.overall ?? activeDojoWord.avgSpokenScore;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-[2rem] border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header & Progress */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-xl border-b-2 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-3 py-1 text-xs font-black tracking-wider text-white uppercase">
              Word {dojoIndex + 1} of {dojoQueueLength}
            </span>
            <span
              className={`rounded-xl border px-2.5 py-1 text-xs font-extrabold ${
                CATEGORY_META[activeDojoWord.category].badgeClass
              }`}
            >
              {activeDojoWord.categoryLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border-2 border-b-[3px] border-slate-200 bg-white p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600 transition-all duration-300"
            style={{
              width: `${((dojoIndex + 1) / dojoQueueLength) * 100}%`,
            }}
          />
        </div>

        {/* 3D Center Stage Word Card */}
        <div className="my-5 rounded-3xl border-2 border-b-[5px] border-slate-200/90 border-b-slate-300 bg-slate-50/60 p-6 text-center">
          <p className="mb-2 text-[10px] font-black tracking-widest text-blue-600 uppercase">
            {activeDojoWord.structuralType === "PHRASE"
              ? "Connected Expression"
              : "Core Building Block"}
          </p>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">
            {activeDojoWord.cleanWord}
          </h2>
          {activeDojoWord.translation && (
            <p className="mt-1.5 text-sm font-bold text-slate-500">
              &ldquo;{activeDojoWord.translation}&rdquo;
            </p>
          )}

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onListen(activeDojoWord, 0.9)}
              disabled={status !== "idle"}
              className="inline-flex items-center gap-2 rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-black text-slate-700 transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50 active:translate-y-0.5 active:border-b-2"
            >
              <Volume2 className="h-4 w-4 text-blue-600" />
              <span>Listen (1.0x)</span>
            </button>

            <button
              type="button"
              onClick={() => onListen(activeDojoWord, 0.6)}
              disabled={status !== "idle"}
              className="inline-flex items-center gap-2 rounded-2xl border-2 border-b-4 border-amber-200 border-b-amber-300 bg-amber-50 px-4 py-2.5 text-xs sm:text-sm font-black text-amber-800 transition-all hover:-translate-y-0.5 hover:bg-amber-100 active:translate-y-0.5 active:border-b-2"
            >
              <Turtle className="h-4 w-4 text-amber-600" />
              <span>Slow (0.6x)</span>
            </button>
          </div>
        </div>

        {/* Score Display if Tested */}
        {currentScore !== null && status === "idle" && (
          <div className="my-5 rounded-2xl border-2 border-slate-200/80 bg-slate-50 p-4 text-center">
            <p className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
              Pronunciation Score
            </p>
            <p
              className={`mt-1 text-3xl font-black ${
                currentScore >= 80 ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              {currentScore}%
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {currentScore >= 80
                ? "🎉 Excellent pronunciation! Ready for the next word."
                : "💡 Tip: Try listening at 0.6x Slow speed and speak again!"}
            </p>
          </div>
        )}

        {/* 3D Big Microphone Button */}
        <VoiceMicButton
          size="lg"
          isListening={isListening}
          isAnalyzing={isAnalyzing}
          idleLabel={`Tap & Speak “${activeDojoWord.cleanWord}”`}
          listeningLabel="Listening... Tap to Stop"
          analyzingLabel="Analyzing Your Accent..."
          onClick={() => onPronunciationTest(activeDojoWord)}
        />
        {/* Footer 3D Navigation */}
        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onPrev}
            disabled={dojoIndex === 0 || status !== "idle"}
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-b-[3px] border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 active:translate-y-0.5 active:border-b-0 disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>

          {dojoIndex < dojoQueueLength - 1 ? (
            <button
              type="button"
              onClick={onNext}
              disabled={status !== "idle"}
              className="inline-flex items-center gap-1.5 rounded-xl border-b-[3px] border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-5 py-2 text-xs font-black text-white shadow-2xs transition hover:brightness-105 active:translate-y-0.5 active:border-b-0"
            >
              <span>Next Word</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-xl border-b-[3px] border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 px-5 py-2 text-xs font-black text-white shadow-2xs transition hover:brightness-105 active:translate-y-0.5 active:border-b-0"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Finish Drill</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
