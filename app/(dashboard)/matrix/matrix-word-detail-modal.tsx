// components/matrix/matrix-word-detail-modal.tsx
"use client";

import React from "react";
import { formatDistanceToNow } from "date-fns";
import {
  X,
  Volume2,
  Turtle,
  Mic,
  Square,
  Loader2,
  Eye,
  Ear,
  MousePointerClick,
  Sparkles,
  BookOpen,
  Tag,
  GitCommitHorizontal,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { EnrichedWordStat, SessionScore, WordStat } from "./matrix-types";

interface MatrixWordDetailModalProps {
  wordStat: EnrichedWordStat | null;
  activeMicWordId: string | null;
  status: string;
  activeTtsKey: string | null;
  isTtsPlaying: boolean;
  isTtsLoading: boolean;
  sessionResult?: SessionScore;
  onClose: () => void;
  onListen: (wordStat: WordStat, speed: number, gender?: "m" | "f") => void;
  onPronunciationTest: (wordStat: WordStat) => void;
  onSelectWord: (wordStat: EnrichedWordStat) => void;
  allEnrichedWords: EnrichedWordStat[];
}

const STATUS_BADGE_3D: Record<string, string> = {
  MASTERED:
    "border-b-2 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white",
  FAMILIAR:
    "border-b-2 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white",
  LEARNING:
    "border-b-2 border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950",
  NEW: "border-b-2 border-slate-300 bg-slate-100 text-slate-700",
};

function formatAgo(dateVal?: Date | string | null): string {
  if (!dateVal) return "Never";
  try {
    return formatDistanceToNow(new Date(dateVal), { addSuffix: true });
  } catch {
    return "Recently";
  }
}

export function MatrixWordDetailModal({
  wordStat,
  activeMicWordId,
  status,
  activeTtsKey,
  isTtsPlaying,
  isTtsLoading,
  sessionResult,
  onClose,
  onListen,
  onPronunciationTest,
  onSelectWord,
  allEnrichedWords,
}: MatrixWordDetailModalProps) {
  if (!wordStat) return null;

  const isListening =
    activeMicWordId === wordStat.id && status === "listening";
  const isAnalyzing =
    activeMicWordId === wordStat.id && status === "analyzing";
  const displayScore = sessionResult?.overall ?? wordStat.avgSpokenScore;
  const totalTaps =
    (wordStat.tappedCorrect || 0) + (wordStat.tappedWrong || 0);
  const tapAccuracy =
    totalTaps > 0
      ? Math.round((wordStat.tappedCorrect / totalTaps) * 100)
      : null;

  const isPlayingM =
    activeTtsKey === `${wordStat.id}-0.9-m` && (isTtsPlaying || isTtsLoading);
  const isPlayingF =
    activeTtsKey === `${wordStat.id}-0.9-f` && (isTtsPlaying || isTtsLoading);
  const isPlayingSlow =
    activeTtsKey === `${wordStat.id}-0.6` && (isTtsPlaying || isTtsLoading);

  const linkedItems = [
    ...wordStat.relatedPhrases,
    ...wordStat.linkedComponentWords,
    ...wordStat.sameLemmaWords,
  ].filter(
    (item, idx, arr) => arr.findIndex((x) => x.id === item.id) === idx
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* =================================================================
            1. TOP LIGHT 3D HEADER BAND
            ================================================================= */}
        <div className="border-b border-slate-100 bg-gradient-to-br from-sky-50/70 via-white to-indigo-50/40 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-lg px-2.5 py-0.5 text-[10px] font-black tracking-wider uppercase ${
                    STATUS_BADGE_3D[wordStat.status] || STATUS_BADGE_3D.NEW
                  }`}
                >
                  {wordStat.status}
                </span>
                <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 text-[11px] font-extrabold text-slate-600">
                  {wordStat.wordType === "PHRASE"
                    ? "Phrase / Chunk"
                    : "Single Word"}
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
                  <Clock className="h-3.5 w-3.5" />
                  Seen {formatAgo(wordStat.lastSeenAt)}
                </span>
              </div>

              <h2 className="mt-2.5 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                {wordStat.cleanWord}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border-2 border-b-[3px] border-slate-200 bg-white p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 active:translate-y-0.5 active:border-b-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 3D Action Bar: Listen (Female / Male) + Slow + Try Speaking */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onListen(wordStat, 0.9, "f")}
              disabled={status !== "idle"}
              className={`inline-flex items-center gap-1.5 rounded-xl border-2 border-b-[3px] px-3.5 py-2 text-xs font-black transition-all active:translate-y-0.5 active:border-b-0 ${
                isPlayingF
                  ? "animate-pulse border-blue-800 bg-blue-600 text-white"
                  : "border-slate-200 border-b-slate-300 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50"
              }`}
            >
              <Volume2 className="h-4 w-4 text-pink-500" />
              <span>Female ♀</span>
            </button>

            <button
              type="button"
              onClick={() => onListen(wordStat, 0.9, "m")}
              disabled={status !== "idle"}
              className={`inline-flex items-center gap-1.5 rounded-xl border-2 border-b-[3px] px-3.5 py-2 text-xs font-black transition-all active:translate-y-0.5 active:border-b-0 ${
                isPlayingM
                  ? "animate-pulse border-blue-800 bg-blue-600 text-white"
                  : "border-slate-200 border-b-slate-300 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50"
              }`}
            >
              <Volume2 className="h-4 w-4 text-blue-600" />
              <span>Male ♂</span>
            </button>

            <button
              type="button"
              onClick={() => onListen(wordStat, 0.6)}
              disabled={status !== "idle"}
              className={`inline-flex items-center gap-1.5 rounded-xl border-2 border-b-[3px] px-3.5 py-2 text-xs font-black transition-all active:translate-y-0.5 active:border-b-0 ${
                isPlayingSlow
                  ? "animate-pulse border-orange-700 bg-amber-400 text-slate-950"
                  : "border-amber-200 border-b-amber-300 bg-amber-50 text-amber-800 hover:-translate-y-0.5 hover:bg-amber-100"
              }`}
            >
              <Turtle className="h-4 w-4 text-amber-600" />
              <span>Slow 0.6x</span>
            </button>

            <button
              type="button"
              onClick={() => onPronunciationTest(wordStat)}
              disabled={isAnalyzing}
              className={`ml-auto inline-flex items-center gap-2 rounded-xl border-b-4 px-5 py-2.5 text-xs font-black text-white shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-0 ${
                isListening
                  ? "animate-pulse border-rose-800 bg-rose-600"
                  : isAnalyzing
                    ? "cursor-wait border-indigo-800 bg-indigo-600"
                    : "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 shadow-blue-500/20 hover:brightness-105"
              }`}
            >
              {isListening ? (
                <>
                  <Square className="h-3.5 w-3.5 fill-current" />
                  <span>Stop Recording</span>
                </>
              ) : isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Scoring...</span>
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  <span>
                    {displayScore !== null && displayScore !== undefined
                      ? `Try Again (${Math.round(displayScore)}%)`
                      : "Try Speaking"}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* =================================================================
            2. MODAL BODY
            ================================================================= */}
        <div className="max-h-[68vh] space-y-6 overflow-y-auto p-6">
          {/* Definition & Grammar Breakdown */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="rounded-2xl border-2 border-b-4 border-slate-200/90 border-b-slate-300 bg-slate-50/70 p-4">
              <div className="flex items-center gap-2 text-[11px] font-black tracking-wider text-slate-400 uppercase">
                <BookOpen className="h-4 w-4 text-blue-600" />
                Definition / Meaning
              </div>
              <p className="mt-1.5 text-lg font-black text-slate-900">
                {wordStat.translation || "No translation recorded"}
              </p>
            </div>

            <div className="rounded-2xl border-2 border-b-4 border-slate-200/90 border-b-slate-300 bg-slate-50/70 p-4">
              <div className="flex items-center gap-2 text-[11px] font-black tracking-wider text-slate-400 uppercase">
                <Tag className="h-4 w-4 text-indigo-500" />
                Grammar &amp; Gender
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="rounded-lg bg-indigo-100 px-2.5 py-1 text-xs font-black text-indigo-800">
                  {wordStat.partOfSpeech || "VOCABULARY"}
                </span>

                {wordStat.grammaticalGender === "M" ? (
                  <span className="rounded-lg border border-sky-200 bg-sky-100 px-2.5 py-1 text-xs font-black text-blue-800">
                    ♂ Masculine
                  </span>
                ) : wordStat.grammaticalGender === "F" ? (
                  <span className="rounded-lg border border-pink-200 bg-pink-100 px-2.5 py-1 text-xs font-black text-rose-800">
                    ♀ Feminine
                  </span>
                ) : (
                  <span className="rounded-lg bg-slate-200/80 px-2.5 py-1 text-xs font-bold text-slate-600">
                    Neutral
                  </span>
                )}

                {wordStat.lemma && (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-black text-purple-800">
                    <GitCommitHorizontal className="h-3.5 w-3.5" />
                    Root: {wordStat.lemma}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 4-Signal 3D Telemetry Tiles */}
          <div>
            <h4 className="mb-3 text-[11px] font-black tracking-wider text-slate-400 uppercase">
              Interaction Telemetry ({Math.round(wordStat.masteryScore * 10) / 10} pts)
            </h4>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border-2 border-b-4 border-sky-200 border-b-sky-300 bg-sky-50/50 p-3.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-blue-700">
                  <Eye className="h-4 w-4" />
                  Seen
                </div>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {wordStat.seenCount}x
                </p>
                <p className="mt-0.5 text-[11px] font-bold text-slate-400">
                  {formatAgo(wordStat.lastSeenAt)}
                </p>
              </div>

              <div className="rounded-2xl border-2 border-b-4 border-indigo-200 border-b-indigo-300 bg-indigo-50/50 p-3.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-indigo-700">
                  <Ear className="h-4 w-4" />
                  Heard
                </div>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {wordStat.heardCount}x
                </p>
                <p className="mt-0.5 text-[11px] font-bold text-slate-400">
                  {formatAgo(wordStat.lastHeardAt)}
                </p>
              </div>

              <div className="rounded-2xl border-2 border-b-4 border-amber-200 border-b-amber-300 bg-amber-50/50 p-3.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-800">
                  <MousePointerClick className="h-4 w-4" />
                  Tapped
                </div>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {wordStat.tappedCorrect}/{totalTaps}
                </p>
                <p className="mt-0.5 text-[11px] font-bold text-slate-400">
                  {tapAccuracy !== null
                    ? `${tapAccuracy}% accuracy`
                    : "No taps yet"}
                </p>
              </div>

              <div className="rounded-2xl border-2 border-b-4 border-emerald-200 border-b-emerald-300 bg-emerald-50/50 p-3.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-emerald-700">
                  <Sparkles className="h-4 w-4" />
                  Spoken
                </div>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {displayScore !== null && displayScore !== undefined
                    ? `${Math.round(displayScore)}%`
                    : `${wordStat.spokenAttempts}x`}
                </p>
                <p className="mt-0.5 text-[11px] font-bold text-slate-400">
                  {wordStat.spokenAttempts} attempt
                  {wordStat.spokenAttempts === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </div>

          {/* Connected Phrases & Root Family */}
          {linkedItems.length > 0 && (
            <div>
              <h4 className="mb-2.5 text-[11px] font-black tracking-wider text-slate-400 uppercase">
                Connected Words &amp; Phrases ({linkedItems.length})
              </h4>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {linkedItems.map((rel) => {
                  const fullRel = allEnrichedWords.find(
                    (e) => e.id === rel.id
                  );
                  return (
                    <button
                      key={rel.id}
                      type="button"
                      onClick={() => fullRel && onSelectWord(fullRel)}
                      className="flex items-center justify-between rounded-2xl border-2 border-b-4 border-slate-200/90 border-b-slate-300 bg-white px-4 py-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50/40 active:translate-y-0.5 active:border-b-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900">
                          {rel.word}
                        </p>
                        <p className="truncate text-xs font-semibold text-slate-500">
                          {rel.translation || rel.partOfSpeech}
                        </p>
                      </div>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-blue-600" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}