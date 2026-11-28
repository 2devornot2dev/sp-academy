// components/home/new-dashboard-page.tsx
"use client";

import Link from "next/link";
import {
  Flame,
  Trophy,
  Zap,
  ArrowRight,
  ChevronRight,
  Crown,
  Sparkles,
  Check,
  Mic,
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
  const profile = user?.profile;

  const isBossFocus = upcoming.focusType === "BOSS";
  const isBridgeFocus = upcoming.focusType === "BRIDGE";
  const isConvoGate = isBossFocus && upcoming.href === "/conversation";

  const cta3DStyle = isConvoGate
    ? "border-amber-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950 shadow-amber-500/30"
    : isBossFocus
      ? "border-purple-950 bg-gradient-to-b from-violet-500 via-purple-600 to-fuchsia-600 text-white shadow-purple-500/30"
      : isBridgeFocus
        ? "border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950 shadow-amber-500/30"
        : "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-blue-500/30";

  return (
    <div className="flex min-h-full flex-col bg-slate-100/80 font-sans text-slate-900 selection:bg-indigo-100 lg:h-dvh lg:overflow-hidden">
      {/* =====================================================================
          1. HEADER BANNER (With Sprite Avatar + 3 Telemetry Pills)
          ===================================================================== */}
      <header className="relative shrink-0 overflow-hidden animate-bg pt-3.5 pb-12 sm:pt-6 sm:pb-16 text-white shadow-lg">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/15 to-slate-950/35 backdrop-blur-[2px]" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[850px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-3 sm:mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/35 px-2.5 py-1 sm:px-3 text-[11px] sm:text-xs font-extrabold text-amber-300 shadow-sm backdrop-blur-md">
                <Zap className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span>
                  {sprite.name}: {sprite.energy}/{sprite.maxEnergy}
                </span>
              </div>

              <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/35 px-2.5 py-1 sm:px-3 text-[11px] sm:text-xs font-extrabold text-emerald-300 shadow-sm backdrop-blur-md">
                <Trophy className="h-3.5 w-3.5 text-emerald-400" />
                <span>{languageCard.spoonsCompleted} Spoons</span>
              </div>

              <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/35 px-2.5 py-1 sm:px-3 text-[11px] sm:text-xs font-extrabold text-amber-200 shadow-sm backdrop-blur-md">
                <Crown className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span>{languageCard.bossesDefeated} Crowns</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 max-w-3xl">
            <div className="relative shrink-0">
              <div className="h-12 w-12 sm:h-14 sm:w-14 overflow-hidden rounded-2xl border-2 border-b-4 border-white/80 border-b-sky-300 bg-slate-900 shadow-md">
                <img
                  src={sprite.avatarUrl || "/sprite-m.png"}
                  alt={sprite.name}
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-400" />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.22)] sm:text-3xl md:text-4xl">
                {greeting}, {user.firstName}!
              </h1>
              <p className="mt-0.5 text-xs font-medium text-white/90 drop-shadow-[0_1px_4px_rgba(15,23,42,0.18)] sm:text-base">
                Your personal {languageCard.flag} {languageCard.languageLabel}{" "}
                command center &amp; Word Matrix.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* =====================================================================
          2. MAIN DASHBOARD GRID
          ===================================================================== */}
      <main className="relative z-20 mx-auto -mt-8 sm:-mt-10 flex min-h-0 w-full max-w-7xl flex-1 px-3.5 pb-8 sm:px-6 lg:px-8 lg:pb-5">
        <div className="grid h-full min-h-0 w-full grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12">
          {/* LEFT COLUMN */}
          <div className="flex min-h-0 flex-col gap-4 sm:gap-5 lg:col-span-8">
            {/* ===============================================================
                CARD 1: 3D TACTILE MILESTONE HERO CARD (Left-aligned + Trophy on mobile!)
                =============================================================== */}
            <div className="relative shrink-0 overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-b-[6px] border-indigo-950/90 bg-gradient-to-r from-[#0F172A] via-[#131D36] to-[#1E1B4B] p-4 sm:p-6 sm:px-7 text-white shadow-xl">
              <div className="pointer-events-none absolute -top-20 -right-10 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-sky-500/15 blur-3xl" />

              <div className="relative z-10 flex flex-col gap-3.5">
                {/* Top Row: Left Info + Right 3D Trophy on ALL screens */}
                <div className="flex items-center justify-between gap-2 sm:gap-5">
                  <div className="min-w-0 flex-1 space-y-2.5 text-left sm:space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-emerald-400/15 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-black tracking-wider text-emerald-300 uppercase ring-1 ring-emerald-400/30">
                        {languageCard.flag} {languageCard.rankTitle}
                      </span>
                    </div>

                    <div>
                      <h2 className="text-2xl font-black tracking-tight text-white sm:text-4xl">
                        Milestone {languageCard.currentMilestone}
                      </h2>
                      <p className="mt-0.5 text-xs font-semibold text-slate-300">
                        Next Unlock:{" "}
                        <span className="font-bold text-amber-300">
                          🎁 {upcoming.nextBossReward}
                        </span>
                      </p>
                    </div>

                    {/* 4-Node Progress Track (Left-aligned) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        {[1, 2, 3].map((stepIdx) => {
                          const isStepDone =
                            isBossFocus ||
                            languageCard.spoonsInCurrentCycle >= stepIdx;
                          const isStepCurrent =
                            !isBossFocus &&
                            languageCard.spoonsInCurrentCycle + 1 === stepIdx;
                          return (
                            <div
                              key={stepIdx}
                              className={`flex h-7 w-7 items-center justify-center rounded-lg border-b-2 text-[11px] font-black transition-all ${
                                isStepDone
                                  ? "border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-xs"
                                  : isStepCurrent
                                    ? "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white ring-2 ring-sky-300/60"
                                    : "border-slate-800 bg-slate-800/90 text-slate-500"
                              }`}
                            >
                              {isStepDone ? (
                                <Check className="h-3.5 w-3.5 stroke-[3.5]" />
                              ) : (
                                stepIdx
                              )}
                            </div>
                          );
                        })}

                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-lg border-b-2 ${
                            isBossFocus && !isConvoGate
                              ? "border-purple-950 bg-gradient-to-b from-amber-400 to-fuchsia-600 text-white animate-pulse"
                              : "border-slate-800 bg-slate-800/90 text-amber-400/60"
                          }`}
                        >
                          <Crown className="h-3.5 w-3.5 fill-current" />
                        </div>
                      </div>

                      <p className="text-[11px] sm:text-xs font-extrabold text-amber-300">
                        {isConvoGate
                          ? `🔒 Complete 1 3-Min AI Chat to Unlock Boss ${languageCard.currentMilestone}`
                          : isBossFocus
                            ? `Boss Stage ${languageCard.currentMilestone} Unlocked!`
                            : `${languageCard.spoonsInCurrentCycle} / 3 Spoons to Boss ${languageCard.currentMilestone}`}
                      </p>
                    </div>
                  </div>

                  {/* Trophy Illustration (Now visible on mobile too!) */}
                  <div className="-mr-3 shrink-0 scale-[0.78] origin-right sm:mr-0 sm:scale-100">
                    <div className="-mr-2 shrink-0">
                      <HeroTrophyIllustration
                        milestone={languageCard.currentMilestone}
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Action CTA */}
                <div className="flex items-center justify-start pt-0.5">
                  <Link
                    href={upcoming.href}
                    className={`inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border-b-4 px-5 py-3 text-xs sm:px-6 sm:text-sm font-black shadow-lg transition-all duration-150 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0 ${cta3DStyle}`}
                  >
                    {isConvoGate ? (
                      <Mic className="h-4 w-4 shrink-0" />
                    ) : (
                      <Sparkles className="h-4 w-4 shrink-0" />
                    )}
                    <span className="opacity-85">Up Next:</span>
                    <span className="truncate max-w-[190px] sm:max-w-xs">
                      {isConvoGate ? upcoming.ctaLabel : upcoming.title}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </Link>
                </div>
              </div>
            </div>

            {/* ===============================================================
                CARD 2: 3D WORD MATRIX SIGNATURES (2x2 on ALL screens) + BADGES
                =============================================================== */}
            <div className="flex min-h-0 flex-1 flex-col gap-4 rounded-2xl sm:rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-4 sm:p-5 shadow-sm lg:overflow-y-auto">
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-slate-900">
                      Word Matrix Signatures
                    </h3>
                    <p className="truncate text-[11px] font-semibold text-slate-400">
                      {languageCard.totalWordsBanked} active words tracked
                      across your lessons
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

                <div className="grid auto-rows-fr flex-1 grid-cols-2 gap-2.5 sm:gap-3">
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
                      <Link
                        key={id}
                        href="/matrix"
                        className={`group relative flex min-h-[104px] sm:min-h-[120px] items-center justify-between overflow-hidden rounded-2xl border-b-[5px] border-black/20 p-3 sm:p-4 text-white shadow-[0_6px_16px_rgba(15,23,42,0.12),inset_0_2px_0_rgba(255,255,255,0.3)] transition-all duration-150 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0 ${cardClass}`}
                      >
                        <Icon className="pointer-events-none absolute -right-3 -bottom-3 h-20 w-20 sm:-bottom-4 sm:h-28 sm:w-28 text-white/10 transition-transform duration-300 group-hover:scale-110" />

                        <div className="relative z-10 min-w-0 flex-1 sm:pr-3">
                          <span className="inline-block max-w-full truncate rounded-full border border-white/25 bg-white/20 px-2 py-0.5 sm:px-2.5 text-[9px] sm:text-[10px] font-black tracking-wider uppercase shadow-2xs">
                            {label}
                          </span>

                          <div className="mt-1.5 sm:mt-2 truncate text-lg sm:text-3xl font-black tracking-tight leading-none drop-shadow-2xs">
                            {item?.word || fallback}
                          </div>

                          <div className="mt-1 truncate text-xs sm:text-sm font-bold text-white/90">
                            {item
                              ? `“${item.translation}”`
                              : "Practice to unlock"}
                          </div>

                          {item?.subLabel && (
                            <span
                              className={`mt-2 sm:mt-2.5 inline-flex max-w-full truncate items-center rounded-lg sm:rounded-xl border-b-2 border-black/15 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-black ${statClass}`}
                            >
                              {item.subLabel}
                            </span>
                          )}
                        </div>

                        <div className="relative z-10 hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-b-[3px] border-white/30 bg-white/20 shadow-inner transition-transform duration-300 group-hover:rotate-6 lg:h-16 lg:w-16">
                          <Icon className="h-7 w-7 drop-shadow lg:h-8 lg:w-8" />
                        </div>
                      </Link>
                    ),
                  )}
                </div>
              </div>

              {/* Recent Badges Strip */}
              <div className="shrink-0 border-t border-slate-100 pt-3.5">
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
                      className={`flex flex-col items-center rounded-2xl p-1.5 text-center transition-transform hover:-translate-y-0.5 ${
                        b.unlocked ? "" : "opacity-40 grayscale"
                      }`}
                    >
                      <svg
                        width={48}
                        height={48}
                        viewBox="0 0 100 100"
                        className="sm:h-[52px] sm:w-[52px] drop-shadow-xs"
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
          </div>

          {/* =================================================================
              RIGHT COLUMN: 3D SPOON FEED CARD
              ================================================================= */}
          <div className="flex min-h-0 flex-col lg:col-span-4">
            <div className="flex h-[480px] sm:h-[540px] lg:h-full lg:min-h-0 flex-col overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-4 sm:p-5 shadow-sm">
              <div className="mb-3 flex shrink-0 items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Spoon Feed
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400">
                    Live Boss Crowns, mastered Spoons &amp; wins
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-xl border-b-2 border-emerald-600 bg-emerald-500 px-2.5 py-1 text-[10px] font-black text-white shadow-2xs">
                  <Flame className="h-3 w-3 fill-amber-300 text-amber-300" />
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
