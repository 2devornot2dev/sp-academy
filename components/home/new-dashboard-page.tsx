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

  // Color-code the 3D Hero CTA button:
  // SPOON = Primary Blue, BRIDGE / CONVO GATE = Accent Amber, UNLOCKED BOSS = Tertiary Purple
  const cta3DStyle = isConvoGate
    ? "border-amber-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950 shadow-amber-500/30"
    : isBossFocus
      ? "border-purple-950 bg-gradient-to-b from-violet-500 via-purple-600 to-fuchsia-600 text-white shadow-purple-500/30"
      : isBridgeFocus
        ? "border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950 shadow-amber-500/30"
        : "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-blue-500/30";

  return (
    <div className="flex min-h-screen flex-col bg-slate-100/80 font-sans text-slate-900 selection:bg-indigo-100 lg:h-screen lg:overflow-hidden">
      {/* =====================================================================
          1. HEADER BANNER
          ===================================================================== */}
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
            <h1 className="text-2xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.22)] sm:text-3xl md:text-4xl">
              {greeting}, {user.firstName}!
            </h1>
            <p className="mt-1 text-sm font-medium text-white/90 drop-shadow-[0_1px_4px_rgba(15,23,42,0.18)] sm:text-base">
              Your personal {languageCard.languageLabel} command center, Word
              Matrix signatures, and live community feed.
            </p>
          </div>
        </div>
      </header>

      {/* =====================================================================
          2. MAIN DASHBOARD GRID
          ===================================================================== */}
      <main className="relative z-20 mx-auto -mt-10 flex min-h-0 w-full max-w-7xl flex-1 px-6 pb-5 lg:px-8">
        <div className="grid h-full min-h-0 w-full grid-cols-1 gap-6 lg:grid-cols-12">
          {/* LEFT COLUMN */}
          <div className="flex min-h-0 flex-col gap-5 lg:col-span-8">
            {/* ===============================================================
                CARD 1: 3D TACTILE MILESTONE HERO CARD
                =============================================================== */}
            <div className="relative shrink-0 overflow-hidden rounded-3xl border-2 border-b-[6px] border-indigo-950/90 bg-gradient-to-r from-[#0F172A] via-[#131D36] to-[#1E1B4B] p-6 sm:px-7 text-white shadow-xl">
              {/* Subtle Ambient Glows */}
              <div className="pointer-events-none absolute -top-20 -right-10 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-sky-500/15 blur-3xl" />

              <div className="relative z-10 flex flex-col items-center justify-between gap-5 sm:flex-row">
                <div className="flex-1 space-y-3.5 text-center sm:text-left">
                  {/* Top 3D Player & Crown Badge */}
                  <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1 text-[11px] font-black tracking-wider uppercase backdrop-blur-md">
                    <span>{languageCard.flag}</span>
                    <span className="text-white">{user.name}</span>
                    <span className="text-white/30">•</span>
                    <span className="inline-flex items-center gap-1 text-amber-300">
                      <Crown className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {languageCard.bossesDefeated} Boss Crowns
                    </span>
                  </div>

                  {/* Title & Next Unlock */}
                  <div>
                    <div className="flex flex-wrap items-baseline justify-center gap-2.5 sm:justify-start">
                      <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                        Milestone {languageCard.currentMilestone}
                      </h2>
                      <span className="rounded-lg bg-emerald-400/15 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-300 ring-1 ring-emerald-400/30">
                        {languageCard.rankTitle}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-slate-300">
                      Next Unlock:{" "}
                      <span className="font-bold text-amber-300">
                        🎁 {upcoming.nextBossReward}
                      </span>
                    </p>
                  </div>

                  {/* 3D Milestone Progress Bar + Mini Step Nodes */}
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2">
                      {/* 3 Mini 3D Spoon Indicators + Boss Crown */}
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

                      {/* Mini Boss Node */}
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

                    <span className="text-xs font-extrabold text-amber-300">
                      {isConvoGate
                        ? `🔒 Complete 1 3-Min AI Chat to Unlock Boss ${languageCard.currentMilestone}`
                        : isBossFocus
                          ? `Boss Stage ${languageCard.currentMilestone} Unlocked!`
                          : `${languageCard.spoonsInCurrentCycle} / 3 Spoons to Boss ${languageCard.currentMilestone}`}
                    </span>
                  </div>

                  {/* 3D Tactile "Up Next" Action Button */}
                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1 sm:justify-start">
                    <Link
                      href={upcoming.href}
                      className={`inline-flex items-center gap-2.5 rounded-2xl border-b-4 px-6 py-3 text-xs sm:text-sm font-black shadow-lg transition-all duration-150 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0 ${cta3DStyle}`}
                    >
                      {isConvoGate ? (
                        <Mic className="h-4 w-4 shrink-0" />
                      ) : (
                        <Sparkles className="h-4 w-4 shrink-0" />
                      )}
                      <span className="opacity-85">Up Next:</span>
                      <span className="truncate max-w-[220px] sm:max-w-xs">
                        {isConvoGate ? upcoming.ctaLabel : upcoming.title}
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0" />
                    </Link>
                  </div>
                </div>

                {/* Trophy 3D Illustration */}
                <div className="shrink-0">
                  <HeroTrophyIllustration />
                </div>
              </div>
            </div>

            {/* ===============================================================
                CARD 2: 3D WORD MATRIX SIGNATURES + HEX BADGES
                =============================================================== */}
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-5 shadow-sm">
              {/* Signatures 2x2 Grid */}
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="mb-3 flex shrink-0 items-center justify-between">
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
                    className="inline-flex items-center gap-1 rounded-xl border-2 border-b-[3px] border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-blue-600 transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50 active:translate-y-0.5 active:border-b-0"
                  >
                    <span>Learning Hub</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="grid auto-rows-fr flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
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
                        className={`group relative flex min-h-[120px] items-center justify-between overflow-hidden rounded-2xl border-b-[5px] border-black/20 p-4 text-white shadow-[0_6px_16px_rgba(15,23,42,0.12),inset_0_2px_0_rgba(255,255,255,0.3)] transition-all duration-150 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0 ${cardClass}`}
                      >
                        <Icon className="pointer-events-none absolute -right-3 -bottom-4 h-28 w-28 text-white/10 transition-transform duration-300 group-hover:scale-110" />

                        <div className="relative z-10 min-w-0 pr-3">
                          <span className="inline-block rounded-full border border-white/25 bg-white/20 px-2.5 py-0.5 text-[10px] font-black tracking-wider uppercase shadow-2xs">
                            {label}
                          </span>

                          <div className="mt-2 truncate text-3xl font-black tracking-tight leading-none drop-shadow-2xs">
                            {item?.word || fallback}
                          </div>

                          <div className="mt-1 truncate text-sm font-bold text-white/90">
                            {item
                              ? `“${item.translation}”`
                              : "Practice to unlock"}
                          </div>

                          {item?.subLabel && (
                            <span
                              className={`mt-2.5 inline-flex items-center rounded-xl border-b-2 border-black/15 px-2.5 py-1 text-xs font-black ${statClass}`}
                            >
                              {item.subLabel}
                            </span>
                          )}
                        </div>

                        <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-b-[3px] border-white/30 bg-white/20 shadow-inner transition-transform duration-300 group-hover:rotate-6 lg:h-16 lg:w-16">
                          <Icon className="h-7 w-7 drop-shadow lg:h-8 lg:w-8" />
                        </div>
                      </Link>
                    )
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
                        width={52}
                        height={52}
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
                      <span className="mt-1 w-full truncate text-[11px] font-black leading-tight text-slate-800">
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
            <div className="flex h-full min-h-[380px] flex-col overflow-hidden rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-5 shadow-sm">
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