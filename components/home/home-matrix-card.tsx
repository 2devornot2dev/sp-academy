// components/home/home-matrix-card.tsx
"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { HomeDashboardData } from "@/app/actions/get-home-dashboard";
import { getBadges, getSignatures } from "./utils";

type HomeMatrixCardProps = {
  languageCard: HomeDashboardData["languageCard"];
  wordSuperlatives: HomeDashboardData["wordSuperlatives"];
};

export function HomeMatrixCard({
  languageCard,
  wordSuperlatives,
}: HomeMatrixCardProps) {
  const signatures = getSignatures(wordSuperlatives);
  const badges = getBadges(languageCard);

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-between gap-3.5 rounded-2xl sm:rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-4 sm:p-5 shadow-sm lg:overflow-y-auto">
      <div className="flex flex-col">
        <div className="mb-2.5 flex shrink-0 items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-black text-slate-900">
              Word Matrix Signatures
            </h3>
            <p className="truncate text-[11px] font-semibold text-slate-400">
              {languageCard.totalWordsBanked} active words tracked across your
              lessons
            </p>
          </div>
          <Link
            href="/learning-hub"
            className="inline-flex shrink-0 items-center gap-1 rounded-xl border-2 border-b-[3px] border-slate-200 bg-slate-50 px-2.5 py-1.5 sm:px-3 text-[11px] sm:text-xs font-black text-blue-600 transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50 active:translate-y-0.5 active:border-b-0"
          >
            <span>Learning Hub</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {signatures.map(
            ({ id, label, Icon, item, fallback, cardClass }) => (
              <Link
                key={id}
                href="/matrix"
                className={`group relative flex min-h-[96px] sm:min-h-[104px] items-center justify-between overflow-hidden rounded-2xl border-b-[5px] border-black/20 p-3 sm:p-3.5 text-white shadow-[0_6px_16px_rgba(15,23,42,0.12),inset_0_2px_0_rgba(255,255,255,0.3)] transition-all duration-150 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0 ${cardClass}`}
              >
                <Icon className="pointer-events-none absolute -right-3 -bottom-3 h-20 w-20 sm:-bottom-4 sm:h-24 sm:w-24 text-white/10 transition-transform duration-300 group-hover:scale-110" />

                <div className="relative z-10 min-w-0 flex-1 sm:pr-3">
                  <span className="inline-block max-w-full truncate rounded-full border border-white/25 bg-white/20 px-2 py-0.5 sm:px-2.5 text-[9px] sm:text-[10px] font-black tracking-wider uppercase shadow-2xs">
                    {label}
                  </span>

                  <div className="mt-1 sm:mt-1.5 truncate text-lg sm:text-2xl font-black tracking-tight leading-none drop-shadow-2xs">
                    {item?.word || fallback}
                  </div>

                  <div className="mt-0.5 truncate text-xs font-bold text-white/90">
                    {item ? `“${item.translation}”` : "Practice to unlock"}
                  </div>
                </div>

                <div className="relative z-10 hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-b-[3px] border-white/30 bg-white/20 shadow-inner transition-transform duration-300 group-hover:rotate-6 lg:h-14 lg:w-14">
                  <Icon className="h-6 w-6 drop-shadow lg:h-7 lg:w-7" />
                </div>
              </Link>
            ),
          )}
        </div>
      </div>

      {/* Recent Badges Strip */}
      <div className="shrink-0 border-t border-slate-100 pt-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-black tracking-wider text-slate-400 uppercase">
            Recent Badges ({badges.filter((b) => b.unlocked).length}/
            {badges.length})
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {badges.map((b) => (
            <div
              key={b.id}
              className={`flex flex-col items-center rounded-2xl p-1 text-center transition-transform hover:-translate-y-0.5 ${
                b.unlocked ? "" : "opacity-40 grayscale"
              }`}
            >
              <svg
                width={44}
                height={44}
                viewBox="0 0 100 100"
                className="sm:h-[48px] sm:w-[48px] drop-shadow-xs"
              >
                <defs>
                  <linearGradient
                    id={`hex-${b.id}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor={b.grad[0]} />
                    <stop offset="100%" stopColor={b.grad[1]} />
                  </linearGradient>
                </defs>
                <polygon
                  points="50,5 92,27 92,73 50,95 8,73 8,27"
                  fill={`url(#hex-${b.id})`}
                  stroke="#FFFFFF"
                  strokeWidth="3"
                />
                <polygon
                  points="50,13 84,31 50,48 16,31"
                  fill="#FFFFFF"
                  fillOpacity="0.22"
                />
                <text
                  x="50"
                  y="62"
                  textAnchor="middle"
                  fontSize="34"
                  className="select-none"
                >
                  {b.emoji}
                </text>
              </svg>
              <span className="mt-1 w-full truncate text-[10px] sm:text-[11px] font-black leading-tight text-slate-800">
                {b.title}
              </span>
              <span className="text-[9px] font-bold text-slate-400">
                {b.sub}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}