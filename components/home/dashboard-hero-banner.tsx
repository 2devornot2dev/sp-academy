// components/home/dashboard-hero-banner.tsx
"use client";

import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import type { HomeDashboardData } from "@/app/actions/get-home-dashboard";

function HeroTrophyIllustration() {
  return (
    <svg
      viewBox="0 0 280 210"
      className="h-44 w-56 sm:h-48 sm:w-64 shrink-0 select-none drop-shadow-[0_14px_24px_rgba(0,0,0,0.18)]"
      fill="none"
    >
      <defs>
        <linearGradient id="goldCup" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="45%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="podiumTop" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E0F2FE" />
          <stop offset="100%" stopColor="#93C5FD" />
        </linearGradient>
        <linearGradient id="podiumBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
      </defs>

      <circle cx="155" cy="95" r="82" fill="#FFFFFF" fillOpacity="0.12" />
      <circle cx="155" cy="95" r="58" fill="#FEF08A" fillOpacity="0.18" />

      <circle cx="65" cy="42" r="5" fill="#FDE047" />
      <circle cx="242" cy="52" r="6" fill="#4ADE80" />
      <circle cx="92" cy="128" r="4" fill="#F472B6" />
      <rect
        x="48"
        y="78"
        width="12"
        height="6"
        rx="3"
        transform="rotate(-25 48 78)"
        fill="#38BDF8"
      />
      <rect
        x="225"
        y="105"
        width="14"
        height="6"
        rx="3"
        transform="rotate(30 225 105)"
        fill="#FACC15"
      />

      <ellipse cx="155" cy="192" rx="86" ry="14" fill="#1E40AF" />
      <rect x="85" y="162" width="140" height="28" rx="6" fill="url(#podiumBody)" />
      <ellipse cx="155" cy="162" rx="70" ry="11" fill="url(#podiumTop)" />

      <rect x="126" y="142" width="58" height="16" rx="5" fill="#B45309" />
      <rect x="132" y="135" width="46" height="9" rx="4" fill="url(#goldCup)" />
      <rect x="147" y="106" width="16" height="32" rx="6" fill="url(#goldCup)" />

      <path
        d="M116 52H96C90 52 86 58 88 66C91 80 104 92 122 92"
        stroke="url(#goldCup)"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M194 52H214C220 52 224 58 222 66C219 80 206 92 188 92"
        stroke="url(#goldCup)"
        strokeWidth="9"
        strokeLinecap="round"
      />

      <path
        d="M112 36H198V68C198 94 179 112 155 112C131 112 112 94 112 68V36Z"
        fill="url(#goldCup)"
      />
      <ellipse cx="155" cy="36" rx="43" ry="8" fill="#FEF9C3" />

      <polygon
        points="155,51 160,63 173,64 163,72 166,85 155,78 144,85 147,72 137,64 150,63"
        fill="#FFFBEB"
      />
    </svg>
  );
}

export function DashboardHeroBanner({ data }: { data: HomeDashboardData }) {
  const { user, languageCard, upcoming, sprite } = data;

  const cyclePct =
    upcoming.focusType === "BOSS"
      ? 100
      : Math.max(18, Math.round((languageCard.spoonsInCurrentCycle / 3) * 100));

  return (
    <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-[#0957DE] via-[#1B86F8] to-[#2DD4BF] p-7 sm:p-8 text-white shadow-[0_18px_45px_rgba(27,134,248,0.28)]">
      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex-1 space-y-3.5 text-center sm:text-left">
          {/* User Full Name + Flag Pill */}
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/25 px-3.5 py-1 text-xs font-extrabold text-white backdrop-blur-md">
            <span>{languageCard.flag}</span>
            <span>{user.name}</span>
            <span className="opacity-60">·</span>
            <span className="text-amber-300">{languageCard.rankTitle}</span>
          </div>

          {/* Main Milestone Level Readout */}
          <div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white drop-shadow-sm">
              Milestone {languageCard.currentMilestone}
            </h1>
            <p className="text-sm sm:text-base font-bold text-sky-100 mt-0.5">
              {languageCard.spoonsCompleted} Spoons Mastered ·{" "}
              {languageCard.bossesDefeated} Boss Crowns Won
            </p>
          </div>

          {/* Real 3-Spoon Cycle Progress Bar (No Fake XP!) */}
          <div className="pt-0.5 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="h-5 w-full sm:max-w-[280px] rounded-full bg-blue-950/35 p-1 shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-cyan-300 shadow-[0_0_12px_rgba(250,204,21,0.65)] transition-all duration-700"
                style={{ width: `${cyclePct}%` }}
              />
            </div>
            <span className="text-xs font-extrabold text-white/95 whitespace-nowrap">
              {upcoming.focusType === "BOSS"
                ? `Boss Stage ${languageCard.currentMilestone} Ready!`
                : `${languageCard.spoonsInCurrentCycle} / 3 Spoons to Boss ${languageCard.currentMilestone}`}
            </span>
          </div>

          {/* SLIM "UP NEXT" ACTION STRIP + STATS PILLS */}
          <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
            <Link
              href={upcoming.href}
              className="group inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-blue-700 shadow-md hover:bg-amber-300 hover:text-slate-950 transition"
            >
              <span className="text-slate-400 group-hover:text-slate-700 font-bold">
                Up Next:
              </span>
              <span className="truncate max-w-[180px]">{upcoming.title}</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>

            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-950/30 border border-white/20 px-3.5 py-1.5 text-xs font-extrabold text-white">
              <Zap className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
              <span>
                {sprite.name}: {sprite.energy}/{sprite.maxEnergy}
              </span>
            </div>
          </div>
        </div>

        <HeroTrophyIllustration />
      </div>
    </div>
  );
}