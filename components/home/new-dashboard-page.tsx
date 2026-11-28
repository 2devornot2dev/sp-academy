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
    ? "border-amber-700 bg-gradient-to-b from-amber-300 via-amber-400 to-orange-500 text-slate-950 shadow-amber-500/30"
    : isBossFocus
      ? "border-amber-700 bg-gradient-to-b from-amber-300 via-amber-400 to-orange-500 text-slate-950 shadow-amber-500/30"
      : isBridgeFocus
        ? "border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950 shadow-amber-500/30"
        : "border-emerald-800 bg-gradient-to-b from-emerald-300 via-emerald-400 to-teal-500 text-slate-950 shadow-emerald-500/30";

  return (
    <div className="flex min-h-full flex-col bg-slate-100/80 font-sans text-slate-900 selection:bg-indigo-100 lg:h-dvh lg:overflow-hidden">
      {/* =====================================================================
          1. HEADER BANNER (Clean & compact on mobile; stat pills on sm+ only)
          ===================================================================== */}
      <header className="relative shrink-0 overflow-hidden animate-bg pt-3 pb-10 sm:pt-6 sm:pb-16 text-white shadow-lg">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/15 to-slate-950/35 backdrop-blur-[2px]" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[850px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Desktop-only telemetry pills (hidden on mobile to save vertical space) */}
          <div className="mb-4 hidden flex-wrap items-center justify-between gap-2 sm:flex">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/35 px-3 py-1 text-xs font-extrabold text-amber-300 shadow-sm backdrop-blur-md">
                <Zap className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span>
                  {sprite.name}: {sprite.energy}/{sprite.maxEnergy}
                </span>
              </div>

              <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/35 px-3 py-1 text-xs font-extrabold text-emerald-300 shadow-sm backdrop-blur-md">
                <Trophy className="h-3.5 w-3.5 text-emerald-400" />
                <span>{languageCard.spoonsCompleted} Spoons</span>
              </div>

              <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/35 px-3 py-1 text-xs font-extrabold text-amber-200 shadow-sm backdrop-blur-md">
                <Crown className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span>{languageCard.bossesDefeated} Crowns</span>
              </div>
            </div>
          </div>

          <div className="max-w-3xl">
            <h1 className="text-2xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.22)] sm:text-3xl md:text-4xl">
              {greeting}, {user.firstName}!
            </h1>
            <p className="mt-0.5 text-xs font-medium text-white/90 drop-shadow-[0_1px_4px_rgba(15,23,42,0.18)] sm:text-base">
              Your personal {languageCard.flag} {languageCard.languageLabel}{" "}
              command center &amp; Word Matrix.
            </p>
          </div>
        </div>
      </header>

      {/* =====================================================================
          2. MAIN DASHBOARD GRID
          ===================================================================== */}
      <main className="relative z-20 mx-auto -mt-7 sm:-mt-10 flex min-h-0 w-full max-w-7xl flex-1 px-3.5 pb-8 sm:px-6 lg:px-8 lg:pb-5">
        <div className="grid h-full min-h-0 w-full grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12">
          {/* LEFT COLUMN */}
          <div className="flex min-h-0 flex-col gap-4 sm:gap-5 lg:col-span-8">
            {/* ===============================================================
                CARD 1: VIBRANT ELECTRIC 3D MILESTONE HERO CARD
                (Primary/Secondary/Accent mesh + Phasing Conversational Vectors)
                =============================================================== */}
            <div className="relative shrink-0 overflow-hidden rounded-2xl sm:rounded-3xl border-b-[6px] border-indigo-950/40 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-4 sm:p-6 sm:px-7 text-white shadow-[0_12px_30px_rgba(37,99,235,0.28),inset_0_2px_0_rgba(255,255,255,0.35)]">
              {/* Vibrant Primary / Secondary / Accent Color Mesh Orbs */}
              <div className="pointer-events-none absolute -top-16 -left-10 h-52 w-52 rounded-full bg-cyan-400/35 blur-3xl animate-pulse" />
              <div
                className="pointer-events-none absolute -top-12 right-4 h-56 w-56 rounded-full bg-fuchsia-500/35 blur-3xl animate-pulse"
                style={{ animationDelay: "1.2s" }}
              />
              <div
                className="pointer-events-none absolute -bottom-16 right-16 h-48 w-48 rounded-full bg-amber-300/30 blur-2xl animate-pulse"
                style={{ animationDelay: "0.6s" }}
              />
              <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-teal-300/25 blur-3xl" />

              {/* Phasing Conversational Vectors & Glitter Stars Backdrop */}
              <svg
                aria-hidden="true"
                viewBox="0 0 600 240"
                className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                fill="none"
              >
                {/* Background Conversational Speech Bubble Vector 1 */}
                <g
                  className="animate-pulse"
                  style={{ animationDuration: "3.2s" }}
                >
                  <rect
                    x="275"
                    y="16"
                    width="86"
                    height="46"
                    rx="16"
                    fill="white"
                    fillOpacity="0.1"
                    stroke="white"
                    strokeOpacity="0.22"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M295 62L286 74L308 62H295Z"
                    fill="white"
                    fillOpacity="0.1"
                  />
                  {/* Audio wave bars inside bubble */}
                  <rect
                    x="295"
                    y="33"
                    width="4"
                    height="12"
                    rx="2"
                    fill="#FDE047"
                    fillOpacity="0.65"
                  />
                  <rect
                    x="304"
                    y="27"
                    width="4"
                    height="24"
                    rx="2"
                    fill="#38BDF8"
                    fillOpacity="0.75"
                  />
                  <rect
                    x="313"
                    y="30"
                    width="4"
                    height="18"
                    rx="2"
                    fill="#4ADE80"
                    fillOpacity="0.75"
                  />
                  <rect
                    x="322"
                    y="25"
                    width="4"
                    height="28"
                    rx="2"
                    fill="#F472B6"
                    fillOpacity="0.7"
                  />
                  <rect
                    x="331"
                    y="32"
                    width="4"
                    height="14"
                    rx="2"
                    fill="#FDE047"
                    fillOpacity="0.65"
                  />
                  <rect
                    x="340"
                    y="35"
                    width="4"
                    height="8"
                    rx="2"
                    fill="white"
                    fillOpacity="0.6"
                  />
                </g>

                {/* Background Conversational Speech Bubble Vector 2 */}
                <g
                  className="animate-pulse"
                  style={{
                    animationDuration: "4s",
                    animationDelay: "1.1s",
                  }}
                >
                  <rect
                    x="355"
                    y="112"
                    width="70"
                    height="36"
                    rx="13"
                    fill="#38BDF8"
                    fillOpacity="0.12"
                    stroke="#7DD3FC"
                    strokeOpacity="0.28"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx="376"
                    cy="130"
                    r="3.5"
                    fill="#FDE047"
                    fillOpacity="0.7"
                  />
                  <circle
                    cx="390"
                    cy="130"
                    r="3.5"
                    fill="#4ADE80"
                    fillOpacity="0.7"
                  />
                  <circle
                    cx="404"
                    cy="130"
                    r="3.5"
                    fill="#F472B6"
                    fillOpacity="0.7"
                  />
                </g>

                {/* Phasing Concentric Sound Rings behind Trophy */}
                <circle
                  cx="500"
                  cy="95"
                  r="82"
                  stroke="white"
                  strokeOpacity="0.12"
                  strokeWidth="1.5"
                  strokeDasharray="8 8"
                />
                <circle
                  cx="500"
                  cy="95"
                  r="108"
                  stroke="#38BDF8"
                  strokeOpacity="0.14"
                  strokeWidth="1.5"
                />

                {/* 4-Point Glitter Stars Phasing */}
                <path
                  d="M250 26L253 34L261 37L253 40L250 48L247 40L239 37L247 34L250 26Z"
                  fill="#FDE047"
                  fillOpacity="0.85"
                  className="animate-pulse"
                />
                <path
                  d="M445 20L447 26L453 28L447 30L445 36L443 30L437 28L443 26L445 20Z"
                  fill="#67E8F9"
                  fillOpacity="0.9"
                  className="animate-pulse"
                  style={{ animationDelay: "0.7s" }}
                />
                <path
                  d="M335 88L337 93L342 95L337 97L335 102L333 97L328 95L333 93L335 88Z"
                  fill="#F472B6"
                  fillOpacity="0.85"
                  className="animate-pulse"
                  style={{ animationDelay: "1.4s" }}
                />
                <path
                  d="M565 130L567 136L573 138L567 140L565 146L563 140L557 138L563 136L565 130Z"
                  fill="#FDE047"
                  fillOpacity="0.9"
                  className="animate-pulse"
                  style={{ animationDelay: "0.3s" }}
                />
              </svg>

              <div className="relative z-10 flex flex-col gap-3.5">
                {/* Top Row: Left Info + Right 3D Trophy on ALL screens */}
                <div className="flex items-center justify-between gap-2 sm:gap-5">
                  <div className="min-w-0 flex-1 space-y-2.5 text-left sm:space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-3 py-0.5 text-[10px] sm:text-[11px] font-black tracking-wider text-white uppercase shadow-2xs backdrop-blur-md">
                        <span>{languageCard.flag}</span>
                        <span>{languageCard.rankTitle}</span>
                      </span>
                    </div>

                    <div>
                      <h2 className="text-2xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.25)] sm:text-4xl">
                        Milestone {languageCard.currentMilestone}
                      </h2>
                      <p className="mt-0.5 text-xs font-bold text-sky-100">
                        Next Unlock:{" "}
                        <span className="font-black text-amber-300 drop-shadow-2xs">
                          🎁 {upcoming.nextBossReward}
                        </span>
                      </p>
                    </div>

                    {/* 4-Node Progress Track (Left-aligned, high-contrast glass/3D nodes) */}
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
                                  ? "border-emerald-700 bg-gradient-to-b from-emerald-300 to-emerald-500 text-slate-950 shadow-sm"
                                  : isStepCurrent
                                    ? "border-amber-700 bg-gradient-to-b from-amber-300 to-orange-400 text-slate-950 ring-2 ring-white/70"
                                    : "border-white/20 bg-white/15 text-white/70 backdrop-blur-xs"
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
                              ? "border-amber-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950 animate-bounce shadow-md"
                              : "border-white/25 bg-white/15 text-amber-300 backdrop-blur-xs"
                          }`}
                        >
                          <Crown className="h-3.5 w-3.5 fill-current" />
                        </div>
                      </div>

                      <p className="text-[11px] sm:text-xs font-extrabold text-amber-200 drop-shadow-2xs">
                        {isConvoGate
                          ? `🔒 Complete 1 3-Min AI Chat to Unlock Boss ${languageCard.currentMilestone}`
                          : isBossFocus
                            ? `⚡ Boss Stage ${languageCard.currentMilestone} Unlocked!`
                            : `${languageCard.spoonsInCurrentCycle} / 3 Spoons to Boss ${languageCard.currentMilestone}`}
                      </p>
                    </div>
                  </div>

                  {/* Dynamic Engraved Milestone Trophy Illustration */}
                  <div className="-mr-2 shrink-0">
                    <HeroTrophyIllustration
                      milestone={languageCard.currentMilestone}
                    />
                  </div>
                </div>

                {/* Bottom Action CTA */}
                <div className="flex items-center justify-start pt-0.5">
                  <Link
                    href={upcoming.href}
                    className={`inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border-b-4 px-5 py-3 text-xs sm:px-6 sm:text-sm font-black shadow-xl transition-all duration-150 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0 ${cta3DStyle}`}
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