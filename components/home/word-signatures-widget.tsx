// components/home/word-signatures-widget.tsx
"use client";

import Link from "next/link";
import {
  Eye,
  MousePointerClick,
  Mic2,
  Headphones,
  ChevronRight,
  TrendingUp,
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
      Icon: Eye,
      data: superlatives.mostSeen,
      fallbackWord: "très",
      fallbackTrans: "very",
      fallbackSub: "Seen 43x in lessons",
      cardBg: "bg-blue-600 text-white shadow-blue-600/20",
      badgeStyle: "bg-white/20 text-white border-white/20",
      numberBadge: "bg-blue-950/40 text-blue-100 border-white/10",
      iconBg: "bg-white/15 text-white border-white/20",
    },
    {
      id: "tapped",
      label: "Most Tapped",
      Icon: MousePointerClick,
      data: superlatives.mostTapped,
      fallbackWord: "suis",
      fallbackTrans: "am / follow",
      fallbackSub: "63 taps (55 accurate)",
      cardBg: "bg-amber-500 text-white shadow-amber-500/20",
      badgeStyle: "bg-white/20 text-white border-white/20",
      numberBadge: "bg-amber-950/40 text-amber-100 border-white/10",
      iconBg: "bg-white/15 text-white border-white/20",
    },
    {
      id: "spoken",
      label: "Most Spoken",
      Icon: Mic2,
      data: superlatives.mostSpoken,
      fallbackWord: "je",
      fallbackTrans: "I",
      fallbackSub: "Spoken 19x · 60% avg",
      cardBg: "bg-emerald-600 text-white shadow-emerald-600/20",
      badgeStyle: "bg-white/20 text-white border-white/20",
      numberBadge: "bg-emerald-950/40 text-emerald-100 border-white/10",
      iconBg: "bg-white/15 text-white border-white/20",
    },
   
  ];

  return (
    <div className="rounded-[28px] border border-white bg-white/95 p-6 shadow-[0_10px_35px_rgba(15,23,42,0.05)]">
      {/* Header */}
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
            Real-time spoken &amp; muscle-memory stats across your lessons
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

      {/* Solid 2x2 Stats Grid with Large Right-Side Icons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map(
          ({
            id,
            label,
            Icon,
            data,
            fallbackWord,
            fallbackTrans,
            fallbackSub,
            cardBg,
            badgeStyle,
            numberBadge,
            iconBg,
          }) => {
            const word = data?.word || fallbackWord;
            const trans = data?.translation || fallbackTrans;
            const statText = data?.subLabel || fallbackSub;

            return (
              <div
                key={id}
                className={`group relative overflow-hidden rounded-2xl p-5 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex items-center justify-between ${cardBg}`}
              >
                {/* Large Background Watermark Icon */}
                <Icon className="pointer-events-none absolute -right-3 -bottom-3 h-28 w-28 text-white/10 transition-transform duration-300 group-hover:scale-110" />

                {/* Left Side: Stats Info */}
                <div className="relative z-10 flex flex-col justify-between min-w-0 pr-3">
                  {/* Category Pill */}
                  <span
                    className={`inline-block w-fit rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider backdrop-blur-xs ${badgeStyle}`}
                  >
                    {label}
                  </span>

                  {/* Big French Word */}
                  <div className="mt-2 text-2xl sm:text-3xl font-black tracking-tight leading-none truncate">
                    {word}
                  </div>

                  {/* Translation */}
                  <div className="text-xs sm:text-sm font-semibold opacity-90 mt-1 truncate">
                    &ldquo;{trans}&rdquo;
                  </div>

                  {/* The Numbers / Count Badge */}
                  <div className="mt-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-black tracking-wide backdrop-blur-xs ${numberBadge}`}
                    >
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span>{statText}</span>
                    </span>
                  </div>
                </div>

                {/* Right Side: Large Docked Stats Icon */}
                <div
                  className={`relative z-10 flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl border shadow-inner transition-transform duration-300 group-hover:rotate-6 ${iconBg}`}
                >
                  <Icon className="h-8 w-8 sm:h-10 sm:w-10 drop-shadow" />
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}