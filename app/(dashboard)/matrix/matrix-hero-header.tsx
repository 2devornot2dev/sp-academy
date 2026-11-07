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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-slate-950/35 px-4 py-1.5 text-xs font-semibold tracking-wide text-white shadow-sm backdrop-blur-md">
              <Globe2 className="h-4 w-4 text-cyan-300" />
              <span>
                Matrix Studio •{" "}
                <strong className="font-extrabold text-white uppercase">
                  {activeLanguageLabel}
                </strong>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {localProfiles.length > 1 &&
                localProfiles.map((profile) => {
                  const isSelected = profile.languageCode === selectedLang;
                  const label =
                    LANGUAGES[profile.languageCode] || profile.languageCode;
                  return (
                    <button
                      key={profile.languageCode}
                      type="button"
                      onClick={() => onSelectLang(profile.languageCode)}
                      className={`flex items-center gap-1.5 rounded-xl border-b-2 px-3.5 py-1.5 text-xs font-black shadow-sm backdrop-blur-md transition-all active:translate-y-0.5 active:border-b-0 ${
                        isSelected
                          ? "border-slate-300 bg-white text-slate-900"
                          : "border-white/20 bg-slate-950/35 text-white/85 hover:bg-slate-950/55 hover:text-white"
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
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span>{statsSummary.total} Unlocked</span>
              </div>

              <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/35 px-3.5 py-1.5 text-xs font-extrabold text-emerald-300 shadow-sm backdrop-blur-md">
                <Award className="h-4 w-4 text-emerald-400" />
                <span>
                  {statsSummary.avgPronunciation !== null
                    ? `${statsSummary.avgPronunciation}% Avg Accent`
                    : "Untested"}
                </span>
              </div>
            </div>
          </div>

          <div className="max-w-3xl">
            <h1 className="text-2xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.22)] sm:text-3xl md:text-4xl">
              Language Matrix
            </h1>
            <p className="mt-1.5 text-sm font-medium text-white/90 drop-shadow-[0_1px_4px_rgba(15,23,42,0.18)] sm:text-base">
              Master core building-block words and connected phrases with live
              pronunciation analysis.
            </p>
          </div>
        </div>
      </header>

      {/* Overlapping 3D KPI Summary Cards */}
      <div className="relative z-20 mx-auto -mt-11 max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* 1. Core Words (Primary Blue 3D Pedestal) */}
          <div className="flex items-center gap-4 rounded-3xl border-2 border-b-[5px] border-slate-200/90 border-b-slate-300 bg-white p-4 shadow-sm transition-transform hover:-translate-y-0.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-b-[3px] border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-sm shadow-blue-500/20">
              <Blocks className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-black tracking-wider text-slate-400 uppercase">
                Core Words
              </p>
              <p className="text-2xl font-black text-slate-900">
                {statsSummary.singleWordsCount}
              </p>
            </div>
          </div>

          {/* 2. Phrases & Chunks (Indigo 3D Pedestal) */}
          <div className="flex items-center gap-4 rounded-3xl border-2 border-b-[5px] border-slate-200/90 border-b-slate-300 bg-white p-4 shadow-sm transition-transform hover:-translate-y-0.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-b-[3px] border-indigo-800 bg-gradient-to-b from-indigo-400 to-indigo-600 text-white shadow-sm shadow-indigo-500/20">
              <MessageSquareQuote className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-black tracking-wider text-slate-400 uppercase">
                Phrases &amp; Chunks
              </p>
              <p className="text-2xl font-black text-slate-900">
                {statsSummary.phrasesCount}
              </p>
            </div>
          </div>

          {/* 3. Voice Tested (Tertiary Purple 3D Pedestal) */}
          <div className="flex items-center gap-4 rounded-3xl border-2 border-b-[5px] border-slate-200/90 border-b-slate-300 bg-white p-4 shadow-sm transition-transform hover:-translate-y-0.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-b-[3px] border-purple-950 bg-gradient-to-b from-violet-500 to-purple-700 text-white shadow-sm shadow-purple-500/20">
              <Mic className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-black tracking-wider text-slate-400 uppercase">
                Voice Tested
              </p>
              <p className="text-2xl font-black text-slate-900">
                {statsSummary.practicedCount}{" "}
                <span className="text-sm font-bold text-slate-400">
                  / {statsSummary.total}
                </span>
              </p>
            </div>
          </div>

          {/* 4. Avg Accent Score (Emerald 3D Pedestal) */}
          <div className="flex items-center gap-4 rounded-3xl border-2 border-b-[5px] border-slate-200/90 border-b-slate-300 bg-white p-4 shadow-sm transition-transform hover:-translate-y-0.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-b-[3px] border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-sm shadow-emerald-500/20">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-black tracking-wider text-slate-400 uppercase">
                Avg Accent Score
              </p>
              <p className="text-2xl font-black text-emerald-600">
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