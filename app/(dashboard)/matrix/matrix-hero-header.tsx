// components/matrix/matrix-hero-header.tsx
"use client";

import React from "react";
import {
  Globe2,
  Blocks,
  MessageSquareQuote,
  Mic,
  Award,
  Sparkles,
} from "lucide-react";
import { LANGUAGES } from "@/context/speech-context";
import { LanguageProfile } from "./matrix-types";

interface MatrixHeroHeaderProps {
  localProfiles: LanguageProfile[];
  selectedLang: string;
  onSelectLang: (lang: string) => void;
  statsSummary: {
    total: number;
    singleWordsCount: number;
    phrasesCount: number;
    practicedCount: number;
    avgPronunciation: number | null;
  };
}

export function MatrixHeroHeader({
  localProfiles,
  selectedLang,
  onSelectLang,
  statsSummary,
}: MatrixHeroHeaderProps) {
  const activeLanguageLabel =
    LANGUAGES[selectedLang] || selectedLang || "French";

  return (
    <>
     <header className="relative shrink-0 overflow-hidden animate-bg pt-6 pb-16 text-white shadow-lg">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/15 to-slate-950/35 backdrop-blur-[2px]" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[850px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
          {/* Top Bar: Frosted Dark-Glass Pills */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            {/* Active Language / Studio Pill */}
            <div className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-slate-950/35 px-4 py-1.5 text-xs font-semibold tracking-wide text-white shadow-sm backdrop-blur-md">
              <Globe2 className="h-4 w-4 text-cyan-300" />
              <span>
                Matrix Studio •{" "}
                <strong className="font-extrabold text-white uppercase">
                  {activeLanguageLabel}
                </strong>
              </span>
            </div>

            {/* Language Selector Pills (if multiple profiles) & Quick Stats Pills */}
            <div className="flex flex-wrap items-center gap-2.5">
              {localProfiles.length > 1 &&
                localProfiles.map((profile) => {
                  const isSelected = profile.languageCode === selectedLang;
                  const label =
                    LANGUAGES[profile.languageCode] || profile.languageCode;
                  return (
                    <button
                      key={profile.languageCode}
                      onClick={() => onSelectLang(profile.languageCode)}
                      className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-extrabold shadow-sm backdrop-blur-md transition-all ${
                        isSelected
                          ? "border-white/40 bg-white text-slate-900"
                          : "border-white/20 bg-slate-950/35 text-white/80 hover:bg-slate-950/50 hover:text-white"
                      }`}
                    >
                      <span>{label}</span>
                      <span className="opacity-75">
                        ({profile.wordStats.length})
                      </span>
                    </button>
                  );
                })}

              <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/35 px-3.5 py-1.5 text-xs font-extrabold text-amber-300 shadow-sm backdrop-blur-md">
                <Sparkles className="h-4 w-4 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
                <span>{statsSummary.total} Unlocked</span>
              </div>

              <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/35 px-3.5 py-1.5 text-xs font-extrabold text-emerald-300 shadow-sm backdrop-blur-md">
                <Award className="h-4 w-4 text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
                <span>
                  {statsSummary.avgPronunciation !== null
                    ? `${statsSummary.avgPronunciation}% Avg Accent`
                    : "Untested"}
                </span>
              </div>
            </div>
          </div>

          {/* Main Greeting Copy with Subtle Text Shadow for Crisp Readability */}
          <div className="max-w-3xl">
            <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.22)] sm:text-4xl lg:text-5xl">
              Language Matrix
            </h1>
            <p className="mt-2.5 text-base font-medium text-white/90 drop-shadow-[0_1px_4px_rgba(15,23,42,0.18)] sm:text-lg">
              Master core building-block words and connected phrases with live
              pronunciation analysis.
            </p>
          </div>
        </div>
      </header>

      {/* Overlapping KPI Summary Cards (-mt-12 like FoundationHubPage) */}
      <div className="relative z-20 mx-auto -mt-12 max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div className="rounded-xl bg-blue-500/10 p-3 text-blue-600 dark:text-blue-400">
              <Blocks className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Core Words
              </p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {statsSummary.singleWordsCount}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div className="rounded-xl bg-indigo-500/10 p-3 text-indigo-600 dark:text-indigo-400">
              <MessageSquareQuote className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Phrases & Chunks
              </p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {statsSummary.phrasesCount}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div className="rounded-xl bg-purple-500/10 p-3 text-purple-600 dark:text-purple-400">
              <Mic className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Voice Tested
              </p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {statsSummary.practicedCount}{" "}
                <span className="text-sm font-normal text-slate-400">
                  / {statsSummary.total}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Avg Accent Score
              </p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {statsSummary.avgPronunciation !== null
                  ? `${statsSummary.avgPronunciation}%`
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}