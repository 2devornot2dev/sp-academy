// components/home/new-dashboard-page.tsx
"use client";

import Link from "next/link";
import {
  Flame,
  Globe2,
  Trophy,
  Zap,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import ActivityFeed from "@/components/home/activity-feed";
import type { HomeDashboardData } from "@/app/actions/get-home-dashboard";
import {
  getBadges,
  getGreeting,
  getSignatures,
  HeroTrophyIllustration,
} from "./utils";

export function NewDashboardPage({ data }: { data: HomeDashboardData }) {
  const { user, languageCard, wordSuperlatives, sprite, upcoming } = data;
  const greeting = getGreeting();
  const signatures = getSignatures(wordSuperlatives);
  const badges = getBadges(languageCard);
  const profile = user?.profile

  const cyclePct =
    upcoming.focusType === "BOSS"
      ? 100
      : Math.max(18, Math.round((languageCard.spoonsInCurrentCycle / 3) * 100));

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col bg-slate-100/80 font-sans text-slate-900 selection:bg-indigo-100">
      {/* 1. HEADER BANNER */}
      <header className="relative shrink-0 overflow-hidden animate-bg pt-6 pb-16 text-white shadow-lg">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/15 to-slate-950/35 backdrop-blur-[2px]" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[850px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-slate-950/35 px-4 py-1 text-xs font-semibold tracking-wide text-white shadow-sm backdrop-blur-md">
              <Globe2 className="h-3.5 w-3.5 text-cyan-300" />
              <span>
                Learning{" "}
                <strong className="font-extrabold text-white uppercase">
                  {languageCard.languageLabel}
                </strong>{" "}
                <span className="text-white/75">
                  · {languageCard.rankTitle}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/35 px-3 py-1 text-xs font-extrabold text-amber-300 shadow-sm backdrop-blur-md">
                <Zap className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span>
                  {sprite.name}: {sprite.energy}/{sprite.maxEnergy}
                </span>
              </div>

              <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/35 px-3 py-1 text-xs font-extrabold text-emerald-300 shadow-sm backdrop-blur-md">
                <Trophy className="h-3.5 w-3.5 text-emerald-400" />
                <span>{languageCard.spoonsCompleted} Completed</span>
              </div>
            </div>
          </div>

          <div className="max-w-3xl">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.22)] ">
              {greeting}, {user.firstName}!
            </h1>
            <p className="mt-1 text-sm font-medium text-white/90 drop-shadow-[0_1px_4px_rgba(15,23,42,0.18)] sm:text-base">
              Your personal {languageCard.languageLabel} command center, Word
              Matrix signatures, and live community feed.
            </p>
          </div>
        </div>
      </header>

      {/* 2. MAIN GRID */}
      <main className="relative z-20 mx-auto -mt-10 flex-1 min-h-0 w-full max-w-7xl px-6 pb-5 lg:px-8">
        <div className="grid h-full min-h-0 grid-cols-1 gap-6 lg:grid-cols-12">
          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-5 min-h-0 lg:col-span-8">
            {/* CARD 1: DARK HERO */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0F172A] via-[#131D36] to-[#1E1B4B] p-6 text-white shadow-xl shrink-0">
              <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex-1 space-y-3 text-center sm:text-left">
                  <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/20 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-indigo-300">
                    <span>{languageCard.flag}</span>
                    <span>{user.name}</span>
                    <span>·</span>
                    <span className="text-amber-300">
                      {languageCard.bossesDefeated} Boss Crowns
                    </span>
                  </div>

                  <div>
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                      Milestone {languageCard.currentMilestone}
                    </h2>
                    <p className="text-xs font-semibold text-slate-300 mt-0.5">
                      Next Unlock: 🎁 {upcoming.nextBossReward}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                    <div className="h-3.5 w-full sm:w-60 rounded-full bg-slate-800 p-0.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-teal-300 transition-all duration-500"
                        style={{ width: `${cyclePct}%` }}
                      />
                    </div>
                    <span className="text-xs font-extrabold text-amber-300 whitespace-nowrap">
                      {upcoming.focusType === "BOSS"
                        ? `Boss Stage ${languageCard.currentMilestone} Unlocked!`
                        : `${languageCard.spoonsInCurrentCycle} / 3 Spoons to Boss ${languageCard.currentMilestone}`}
                    </span>
                  </div>

                  <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                    <Link
                      href={upcoming.href}
                      className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-indigo-600/30 transition active:scale-95"
                    >
                      <span className="text-indigo-200 font-bold">
                        Up Next:
                      </span>
                      <span>{upcoming.title}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>

                <HeroTrophyIllustration />
              </div>
            </div>

            {/* CARD 2: SIGNATURES (2x2 stat cards) + HEX BADGES */}
            <div className="flex-1 min-h-0 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm flex flex-col gap-4 overflow-y-auto">
              {/* Signatures: header + 2x2 grid (grows to fill space) */}
              <div className="flex flex-1 min-h-0 flex-col">
                <div className="flex items-center justify-between mb-3 shrink-0">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Word Matrix Signatures
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-400">
                      {languageCard.totalWordsBanked} active words tracked
                      across your lessons
                    </p>
                  </div>
                  <Link
                    href="/learning-hub"
                    className="inline-flex items-center gap-0.5 text-xs font-extrabold text-indigo-600 hover:text-indigo-700"
                  >
                    <span>Learning Hub</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="grid flex-1 grid-cols-2 auto-rows-fr gap-3">
                  {signatures.map(
                    ({
                      id,
                      label,
                      Icon,
                      item,
                      fallback,
                      cardClass,
                      statClass,
                    }) => (
                      <div
                        key={id}
                        className={`group relative flex min-h-[120px] items-center justify-between overflow-hidden rounded-2xl p-4 text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl ${cardClass}`}
                      >
                        <Icon className="pointer-events-none absolute -bottom-4 -right-3 h-28 w-28 text-white/10 transition-transform duration-300 group-hover:scale-110" />

                        <div className="relative z-10 min-w-0 pr-3">
                          <span className="inline-block rounded-full border border-white/20 bg-white/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                            {label}
                          </span>

                          <div className="mt-2 truncate text-3xl font-black leading-none tracking-tight">
                            {item?.word || fallback}
                          </div>

                          <div className="mt-1 truncate text-sm font-semibold text-white/90">
                            {item
                              ? `“${item.translation}”`
                              : "Practice to unlock"}
                          </div>

                          {item?.subLabel && (
                            <span
                              className={`mt-2.5 inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-black ${statClass}`}
                            >
                              {item.subLabel}
                            </span>
                          )}
                        </div>

                        <div className="relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 shadow-inner transition-transform duration-300 group-hover:rotate-6 lg:h-20 lg:w-20">
                          <Icon className="h-8 w-8 drop-shadow lg:h-10 lg:w-10" />
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* Badges */}
              <div className="shrink-0 border-t border-slate-100 pt-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Recent Badges ({badges.filter((b) => b.unlocked).length}/
                    {badges.length})
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {badges.map((b) => (
                    <div
                      key={b.id}
                      className={`flex flex-col items-center text-center ${
                        b.unlocked ? "" : "opacity-40 grayscale"
                      }`}
                    >
                      <svg
                        width={54}
                        height={54}
                        viewBox="0 0 100 100"
                        className="drop-shadow-xs"
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
                      <span className="mt-1 text-[11px] font-extrabold text-slate-800 leading-tight truncate w-full">
                        {b.title}
                      </span>
                      <span className="text-[9px] font-semibold text-slate-400">
                        {b.sub}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: SPOON FEED */}
          <div className="flex flex-col min-h-0 lg:col-span-4">
            <div className="flex h-full min-h-[380px] flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between shrink-0 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Spoon Feed
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400">
                    Live Boss Crowns, mastered Spoons &amp; wins
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-black text-emerald-700">
                  <Flame className="h-3 w-3 fill-emerald-500 text-emerald-500" />
                  Live
                </span>
              </div>

              <ActivityFeed profile={profile} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}