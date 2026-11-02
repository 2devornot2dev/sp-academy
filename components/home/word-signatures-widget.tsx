// components/home/word-signatures-widget.tsx
"use client";

import Link from "next/link";
import {
  Eye,
  MousePointerClick,
  Mic2,
  Headphones,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import type { HomeDashboardData } from "@/app/actions/get-home-dashboard";

export function WordSignaturesWidget({
  superlatives,
  totalWordsBanked,
}: {
  superlatives: HomeDashboardData["wordSuperlatives"];
  totalWordsBanked: number;
}) {
  const cards = [
    {
      id: "seen",
      label: "Most Seen",
      emoji: "👀",
      Icon: Eye,
      data: superlatives.mostSeen,
      fallbackWord: "très",
      fallbackTrans: "very",
      fallbackSub: "Seen 43x in lessons",
      cardBg:
        "border-sky-200/90 bg-gradient-to-br from-sky-50 via-blue-50/40 to-white hover:border-sky-400",
      iconGrad: "bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-sky-500/25",
      badgeStyle: "bg-sky-500/15 border-sky-300 text-sky-800",
    },
    {
      id: "tapped",
      label: "Most Tapped",
      emoji: "👆",
      Icon: MousePointerClick,
      data: superlatives.mostTapped,
      fallbackWord: "suis",
      fallbackTrans: "am / follow",
      fallbackSub: "63 taps (55 accurate)",
      cardBg:
        "border-amber-200/90 bg-gradient-to-br from-amber-50 via-orange-50/40 to-white hover:border-amber-400",
      iconGrad: "bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-amber-500/25",
      badgeStyle: "bg-amber-500/15 border-amber-300 text-amber-900",
    },
    {
      id: "spoken",
      label: "Most Spoken",
      emoji: "🎙️",
      Icon: Mic2,
      data: superlatives.mostSpoken,
      fallbackWord: "je",
      fallbackTrans: "I",
      fallbackSub: "Spoken 19x · 60% avg",
      cardBg:
        "border-emerald-200/90 bg-gradient-to-br from-emerald-50 via-teal-50/40 to-white hover:border-emerald-400",
      iconGrad: "bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-emerald-500/25",
      badgeStyle: "bg-emerald-500/15 border-emerald-300 text-emerald-800",
    },
    {
      id: "heard",
      label: "Most Heard",
      emoji: "🎧",
      Icon: Headphones,
      data: superlatives.mostHeard,
      fallbackWord: "j'ai",
      fallbackTrans: "I have",
      fallbackSub: "Heard 61x in audio",
      cardBg:
        "border-purple-200/90 bg-gradient-to-br from-purple-50 via-indigo-50/40 to-white hover:border-purple-400",
      iconGrad: "bg-gradient-to-tr from-purple-500 to-indigo-600 text-white shadow-purple-500/25",
      badgeStyle: "bg-purple-500/15 border-purple-300 text-purple-900",
    },
  ];

  return (
    <div className="rounded-[28px] border border-white bg-white/95 p-6 shadow-[0_10px_35px_rgba(15,23,42,0.05)]">
      {/* Widget Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-slate-900">
              Word Matrix Signatures
            </h2>
            <span className="rounded-full bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 text-[10px] font-black uppercase text-indigo-700">
              {totalWordsBanked} Words Active
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">
            Your top active vocabulary patterns across your lessons
          </p>
        </div>

        <Link
          href="/learning-hub"
          className="inline-flex items-center gap-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 px-3 py-1.5 text-xs font-black text-slate-600 transition"
        >
          <span>Full Matrix</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* 2x2 Chunky Grid (2 on top, 2 on bottom) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {cards.map(
          ({
            id,
            label,
            emoji,
            Icon,
            data,
            fallbackWord,
            fallbackTrans,
            fallbackSub,
            cardBg,
            iconGrad,
            badgeStyle,
          }) => {
            const word = data?.word || fallbackWord;
            const trans = data?.translation || fallbackTrans;
            const sub = data?.subLabel || fallbackSub;

            return (
              <div
                key={id}
                className={`relative overflow-hidden rounded-2xl border-2 p-4 shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${cardBg}`}
              >
                {/* Top Row: Pill Badge + Gradient Icon */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${badgeStyle}`}
                  >
                    <span>{emoji}</span>
                    <span>{label}</span>
                  </span>

                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl shadow-xs ${iconGrad}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </div>

                {/* Big French Word & Translation */}
                <div className="space-y-0.5 pt-0.5">
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none truncate">
                    {word}
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-slate-500 truncate">
                    &ldquo;{trans}&rdquo;
                  </div>
                </div>

                {/* Bottom Real Count Tag */}
                <div className="mt-3 pt-2.5 border-t border-slate-900/5 flex items-center justify-between text-[11px] font-bold text-slate-600">
                  <span className="truncate">{sub}</span>
                  <Sparkles className="h-3 w-3 opacity-40 text-slate-400 shrink-0 ml-1" />
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}