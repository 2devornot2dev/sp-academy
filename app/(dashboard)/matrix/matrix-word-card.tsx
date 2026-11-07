// components/matrix/matrix-word-card.tsx
"use client";

import React, { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Eye,
  Ear,
  Mic,
  MousePointerClick,
  Volume2,
  Turtle,
  ArrowUpRight,
  AlertCircle,
  Square,
  Loader2,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Tag,
  GitCommitHorizontal,
  Clock,
  Info,
} from "lucide-react";
import { EnrichedWordStat, SessionScore, WordStat } from "./matrix-types";

interface MatrixWordCardProps {
  wordStat: EnrichedWordStat;
  index?: number;
  activeMicWordId: string | null;
  status: string;
  error: string | null;
  activeTtsKey: string | null;
  isTtsPlaying: boolean;
  isTtsLoading: boolean;
  sessionResult?: SessionScore;
  onListen: (wordStat: WordStat, speed: number, gender?: "m" | "f") => void;
  onPronunciationTest: (wordStat: WordStat) => void;
  onSelectRelatedWord: (wordId: string) => void;
  onOpenDetail?: (wordStat: EnrichedWordStat) => void;
}

const STATUS_STYLE: Record<string, string> = {
  MASTERED:
    "border-b-2 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white",
  FAMILIAR:
    "border-b-2 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white",
  LEARNING:
    "border-b-2 border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950",
  NEW: "border-b-2 border-slate-300 bg-slate-100 text-slate-600",
};

export function MatrixWordCard({
  wordStat,
  activeMicWordId,
  status,
  error,
  activeTtsKey,
  isTtsPlaying,
  isTtsLoading,
  sessionResult,
  onListen,
  onPronunciationTest,
  onSelectRelatedWord,
  onOpenDetail,
}: MatrixWordCardProps) {
  const [showLinks, setShowLinks] = useState(false);

  const isThisCardActive = activeMicWordId === wordStat.id;
  const isListening = isThisCardActive && status === "listening";
  const isAnalyzing = isThisCardActive && status === "analyzing";
  const isOtherCardBusy =
    status !== "idle" && activeMicWordId !== wordStat.id;

  const displayScore = sessionResult?.overall ?? wordStat.avgSpokenScore;

  const isPlayingNormal =
    (activeTtsKey === `${wordStat.id}-0.9` ||
      activeTtsKey === `${wordStat.id}-0.9-f`) &&
    (isTtsPlaying || isTtsLoading);
  const isPlayingSlow =
    activeTtsKey === `${wordStat.id}-0.6` && (isTtsPlaying || isTtsLoading);

  const linkedItems = [
    ...wordStat.relatedPhrases,
    ...wordStat.linkedComponentWords,
    ...wordStat.sameLemmaWords,
  ].filter(
    (item, idx, arr) => arr.findIndex((x) => x.id === item.id) === idx
  );

  let lastSeenLabel = "Recently";
  try {
    if (wordStat.lastSeenAt) {
      lastSeenLabel = formatDistanceToNow(new Date(wordStat.lastSeenAt), {
        addSuffix: true,
      });
    }
  } catch {
    lastSeenLabel = "Recently";
  }

  return (
    <div
      className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border-2 border-b-[5px] bg-white transition-all duration-150 ${
        isListening
          ? "border-rose-500 ring-4 ring-rose-500/15 shadow-lg"
          : isAnalyzing
            ? "border-indigo-500 ring-4 ring-indigo-500/15 shadow-lg"
            : "border-slate-200/90 border-b-slate-300 shadow-xs hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
      }`}
    >
      {/* ====================================================================
          1. TOP HEADER ROW (Clean Light 3D Header + 3D Action Buttons)
      ==================================================================== */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
        <button
          type="button"
          onClick={() => onOpenDetail?.(wordStat)}
          className="group/title flex min-w-0 flex-1 items-center gap-2 text-left"
          title="Click for full word details"
        >
          <h3 className="truncate text-lg font-black tracking-tight text-slate-900 transition group-hover/title:text-blue-600">
            {wordStat.cleanWord}
          </h3>
          <span
            className={`shrink-0 rounded-lg px-2 py-0.5 text-[9px] font-black tracking-wider uppercase ${
              STATUS_STYLE[wordStat.status] || STATUS_STYLE.NEW
            }`}
          >
            {wordStat.status}
          </span>
        </button>

        {/* 3D Action Buttons: Listen + Slow + Try/Score */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => onListen(wordStat, 0.9, "f")}
            disabled={status !== "idle"}
            title="Listen"
            className={`inline-flex h-8 items-center gap-1 rounded-xl border-2 border-b-[3px] px-2.5 text-xs font-black transition-all active:translate-y-0.5 active:border-b-0 disabled:opacity-40 ${
              isPlayingNormal
                ? "animate-pulse border-blue-800 bg-blue-600 text-white"
                : "border-slate-200 border-b-slate-300 bg-white text-blue-600 hover:border-sky-300 hover:bg-sky-50"
            }`}
          >
            <Volume2 className="h-3.5 w-3.5" />
            <span>Listen</span>
          </button>

          <button
            type="button"
            onClick={() => onListen(wordStat, 0.6)}
            disabled={status !== "idle"}
            title="Listen Slow (0.6x)"
            className={`flex h-8 w-8 items-center justify-center rounded-xl border-2 border-b-[3px] transition-all active:translate-y-0.5 active:border-b-0 disabled:opacity-40 ${
              isPlayingSlow
                ? "animate-pulse border-orange-700 bg-amber-400 text-slate-950"
                : "border-slate-200 border-b-slate-300 bg-white text-amber-600 hover:border-amber-300 hover:bg-amber-50"
            }`}
          >
            <Turtle className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onPronunciationTest(wordStat)}
            disabled={isAnalyzing || isOtherCardBusy}
            className={`inline-flex h-8 items-center gap-1 rounded-xl border-b-[3px] px-3 text-xs font-black text-white shadow-2xs transition-all active:translate-y-0.5 active:border-b-0 disabled:opacity-40 ${
              isListening
                ? "animate-pulse border-rose-800 bg-rose-600"
                : isAnalyzing
                  ? "cursor-wait border-indigo-800 bg-indigo-600"
                  : displayScore !== null
                    ? displayScore >= 80
                      ? "border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 hover:brightness-105"
                      : "border-orange-700 bg-gradient-to-b from-amber-400 to-orange-500 text-slate-950! hover:brightness-105"
                    : "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 hover:brightness-105"
            }`}
          >
            {isListening ? (
              <>
                <Square className="h-3 w-3 fill-current" />
                <span>Stop</span>
              </>
            ) : isAnalyzing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : displayScore !== null ? (
              <>
                <Mic className="h-3 w-3" />
                <span>{Math.round(displayScore)}%</span>
              </>
            ) : (
              <>
                <Mic className="h-3 w-3" />
                <span>Try</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ====================================================================
          2. MIDDLE BODY (Definition + Gender + POS + Root + Last Seen)
      ==================================================================== */}
      <div
        onClick={() => onOpenDetail?.(wordStat)}
        className="flex-1 cursor-pointer space-y-2.5 px-4 py-3.5"
      >
        <div className="flex items-start gap-2">
          <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <p className="text-sm font-black leading-snug text-slate-800">
            {wordStat.translation || "—"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-black">
          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-slate-700">
            <Tag className="h-3 w-3 text-indigo-500" />
            {wordStat.partOfSpeech || wordStat.structuralType}
          </span>

          {wordStat.grammaticalGender === "M" ? (
            <span className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 py-0.5 text-blue-700">
              ♂ Masc
            </span>
          ) : wordStat.grammaticalGender === "F" ? (
            <span className="inline-flex items-center gap-1 rounded-lg border border-pink-200 bg-pink-50 px-2 py-0.5 text-rose-700">
              ♀ Fem
            </span>
          ) : null}

          {wordStat.lemma &&
            wordStat.lemma.toLowerCase() !==
              wordStat.cleanWord.toLowerCase() && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2 py-0.5 text-purple-700">
                <GitCommitHorizontal className="h-3 w-3" />
                {wordStat.lemma}
              </span>
            )}

          <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
            <Clock className="h-3 w-3 text-slate-400" />
            {lastSeenLabel}
          </span>
        </div>
      </div>

      {/* ====================================================================
          3. BOTTOM FOOTER (Telemetry Hits + Related & Details)
      ==================================================================== */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 text-xs">
        <div className="flex items-center gap-3">
          <span
            title="Times Seen"
            className={`inline-flex items-center gap-1 font-black ${
              wordStat.seenCount > 0 ? "text-blue-600" : "text-slate-400"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            {wordStat.seenCount}
          </span>

          <span
            title="Times Heard"
            className={`inline-flex items-center gap-1 font-black ${
              wordStat.heardCount > 0 ? "text-indigo-600" : "text-slate-400"
            }`}
          >
            <Ear className="h-3.5 w-3.5" />
            {wordStat.heardCount}
          </span>

          <span
            title="Correct Taps"
            className={`inline-flex items-center gap-1 font-black ${
              wordStat.tappedCorrect > 0 ? "text-amber-600" : "text-slate-400"
            }`}
          >
            <MousePointerClick className="h-3.5 w-3.5" />
            {wordStat.tappedCorrect}
          </span>

          <span
            title="Times Spoken"
            className={`inline-flex items-center gap-1 font-black ${
              wordStat.spokenAttempts > 0 ? "text-emerald-600" : "text-slate-400"
            }`}
          >
            <Mic className="h-3.5 w-3.5" />
            {wordStat.spokenAttempts}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {linkedItems.length > 0 && (
            <button
              type="button"
              onClick={() => setShowLinks((prev) => !prev)}
              className="inline-flex items-center gap-0.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-black text-indigo-700 transition hover:bg-indigo-100"
            >
              <span>{linkedItems.length} related</span>
              {showLinks ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenDetail?.(wordStat)}
            title="Open Full Word Details"
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-200/70 hover:text-slate-700"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Error Notice */}
      {isThisCardActive && error && status === "idle" && (
        <div className="flex items-center gap-1.5 border-t border-rose-200 bg-rose-50 px-4 py-2 text-[11px] font-bold text-rose-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      {/* Collapsible Related Drawer */}
      {showLinks && linkedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-dashed border-slate-200 bg-white px-4 py-2.5 animate-in fade-in duration-150">
          {linkedItems.map((rel) => (
            <button
              key={rel.id}
              type="button"
              onClick={() => onSelectRelatedWord(rel.id)}
              className="inline-flex items-center gap-1 rounded-xl border-2 border-b-[3px] border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-blue-700"
            >
              <span>{rel.word}</span>
              <ArrowUpRight className="h-3 w-3 opacity-60" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}