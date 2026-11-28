// components/home/new-dashboard-page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
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

function getFlagBands(targetLang?: string): [string, string, string] {
  const raw = (targetLang || "fr-FR").toLowerCase();
  if (raw.startsWith("es") || raw.includes("spanish")) {
    // Spain: Red / Gold / Red
    return ["#EF4444", "#FACC15", "#EF4444"];
  }
  if (raw.startsWith("en") || raw.includes("english")) {
    // Royal Blue / White / Crimson
    return ["#1D4ED8", "#FFFFFF", "#EF4444"];
  }
  // France default: Blue / White / Red
  return ["#2563EB", "#FFFFFF", "#EF4444"];
}

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

  const flagBands = getFlagBands(languageCard.targetLanguage);

  // 4-Message Conversational Sprite Bubble Carousel
  const topWord =
    wordSuperlatives.mostSpoken ||
    wordSuperlatives.mostSeen ||
    wordSuperlatives.mostTapped ||
    wordSuperlatives.mostHeard;

  const spriteMessages = useMemo(
    () => [
      {
        tag: `${sprite.name} • Status`,
        content: (
          <>
            {greeting}, <strong>{user.firstName}</strong>! You&apos;ve reached{" "}
            <strong className="text-blue-600">{languageCard.rankTitle}</strong>{" "}
            with <strong>{languageCard.spoonsCompleted} Spoons</strong> &amp;{" "}
            <strong>{languageCard.bossesDefeated} Boss Crowns</strong>!
          </>
        ),
      },
      {
        tag: `Milestone ${languageCard.currentMilestone} Mission`,
        content: isConvoGate ? (
          <>
            We&apos;re at{" "}
            <strong>Milestone {languageCard.currentMilestone}</strong>—knock out
            1 quick <strong className="text-amber-600">3-Min AI Chat</strong> to
            unlock Boss {languageCard.currentMilestone}!
          </>
        ) : isBossFocus ? (
          <>
            <strong>Boss Stage {languageCard.currentMilestone}</strong> is
            unlocked! Jump in below to claim your{" "}
            <strong className="text-amber-600">
              {upcoming.nextBossReward}
            </strong>
            .
          </>
        ) : (
          <>
            We&apos;re{" "}
            <strong>{languageCard.spoonsInCurrentCycle}/3 Spoons</strong> into{" "}
            <strong>Milestone {languageCard.currentMilestone}</strong>—up next
            is <strong className="text-blue-600">{upcoming.title}</strong>!
          </>
        ),
      },
      {
        tag: `${languageCard.flag} Word Matrix`,
        content: topWord ? (
          <>
            Your signature {languageCard.languageLabel} word is{" "}
            <strong className="text-indigo-600">« {topWord.word} »</strong> (
            {topWord.subLabel})—with{" "}
            <strong>{languageCard.totalWordsBanked} words</strong> banked!
          </>
        ) : (
          <>
            Your {languageCard.languageLabel} Word Matrix is tracking{" "}
            <strong>{languageCard.totalWordsBanked} active words</strong> across
            your lessons!
          </>
        ),
      },
      {
        tag: "Coach Energy",
        content: (
          <>
            My battery is charged at{" "}
            <strong className="text-amber-600">
              {sprite.energy}/{sprite.maxEnergy} ⚡
            </strong>
            —tap your next stage card below whenever you&apos;re ready to roll!
          </>
        ),
      },
    ],
    [
      sprite.name,
      sprite.energy,
      sprite.maxEnergy,
      greeting,
      user.firstName,
      languageCard.rankTitle,
      languageCard.spoonsCompleted,
      languageCard.bossesDefeated,
      languageCard.currentMilestone,
      languageCard.spoonsInCurrentCycle,
      languageCard.flag,
      languageCard.languageLabel,
      languageCard.totalWordsBanked,
      isConvoGate,
      isBossFocus,
      upcoming.nextBossReward,
      upcoming.title,
      topWord,
    ],
  );

  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIdx((prev) => (prev + 1) % spriteMessages.length);
    }, 4800);
    return () => clearInterval(timer);
  }, [spriteMessages.length]);

  const activeSpriteMsg = spriteMessages[msgIdx] || spriteMessages[0];

  return (
    <div className="flex min-h-full flex-col bg-slate-100/80 font-sans text-slate-900 selection:bg-indigo-100 lg:h-dvh lg:overflow-hidden">
      {/* =====================================================================
          1. HEADER BANNER (Living Sprite + Tap-to-Cycle 3D Speech Bubble)
          ===================================================================== */}
      <header className="relative shrink-0 overflow-hidden animate-bg pt-3 pb-10 sm:pt-5 sm:pb-14 text-white shadow-lg">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/15 to-slate-950/35 backdrop-blur-[2px]" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[850px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-3.5 sm:px-6 lg:px-8">
          {/* Desktop-only stat pills */}
          <div className="mb-3.5 hidden flex-wrap items-center justify-between gap-2 sm:flex">
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

          {/* Sprite Avatar + 3D Conversational Speech Bubble */}
          <div className="flex items-center gap-3 sm:gap-4 max-w-3xl">
            <button
              type="button"
              onClick={() =>
                setMsgIdx((prev) => (prev + 1) % spriteMessages.length)
              }
              title={`Tap to hear more from ${sprite.name}`}
              className="group relative shrink-0 focus:outline-none"
            >
              <div className="h-14 w-14 sm:h-16 sm:w-16 overflow-hidden rounded-2xl border-2 border-b-4 border-white border-b-sky-300 bg-slate-900 shadow-lg transition-transform duration-150 group-hover:scale-105 group-active:scale-95">
                <img
                  src={sprite.avatarUrl || "/sprite-m.png"}
                  alt={sprite.name}
                  className="h-full w-full object-cover object-top"
                />
              </div>
            </button>

            {/* Speech Bubble with Pointer Tail */}
            <button
              type="button"
              onClick={() =>
                setMsgIdx((prev) => (prev + 1) % spriteMessages.length)
              }
              className="relative flex-1 rounded-2xl border-2 border-b-4 border-white/95 border-b-slate-200 bg-white/95 px-3.5 py-2.5 sm:px-4 sm:py-3 text-left text-slate-900 shadow-lg backdrop-blur-md transition-all hover:bg-white active:translate-y-0.5"
            >
              {/* Left Speech Bubble Tail pointing to Sprite */}
              <span
                aria-hidden="true"
                className="absolute top-1/2 -left-2 h-3.5 w-3.5 -translate-y-1/2 rotate-45 rounded-xs bg-white/95"
              />

              <div className="relative z-10 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-wider text-blue-600 uppercase">
                  <span className="inline-flex items-end gap-0.5">
                    <span className="h-2 w-0.5 animate-pulse rounded-full bg-blue-600" />
                    <span
                      className="h-3 w-0.5 animate-pulse rounded-full bg-sky-500"
                      style={{ animationDelay: "0.2s" }}
                    />
                    <span
                      className="h-1.5 w-0.5 animate-pulse rounded-full bg-indigo-500"
                      style={{ animationDelay: "0.4s" }}
                    />
                  </span>
                  {activeSpriteMsg.tag}
                </span>

                {/* 4 Progress Dots */}
                <div className="flex items-center gap-1">
                  {spriteMessages.map((_, idx) => (
                    <span
                      key={idx}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === msgIdx
                          ? "w-4 bg-blue-600"
                          : "w-1.5 bg-slate-200"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="relative z-10 mt-1 min-h-[34px] sm:min-h-[24px] flex items-center">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={msgIdx}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs sm:text-sm font-bold leading-snug text-slate-700"
                  >
                    {activeSpriteMsg.content}
                  </motion.p>
                </AnimatePresence>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================================
          2. MAIN DASHBOARD GRID
          ===================================================================== */}
      <main className="relative z-20 mx-auto -mt-7 sm:-mt-10 flex min-h-0 w-full max-w-7xl flex-1 px-3.5 pb-8 sm:px-6 lg:px-8 lg:pb-5">
        <div className="grid h-full min-h-0 w-full grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-12">
          {/* LEFT COLUMN */}
          <div className="flex min-h-0 flex-col gap-4 sm:gap-5 lg:col-span-8">
            {/* ===============================================================
                CARD 1: VIBRANT ELECTRIC 3D MILESTONE HERO CARD
                (Right->Left Flag Fade + Right-Anchored Phasing Vectors)
                =============================================================== */}
            <div className="relative shrink-0 overflow-hidden rounded-2xl sm:rounded-3xl border-b-[6px] border-indigo-950/40 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-4 sm:p-6 sm:px-7 text-white shadow-[0_12px_30px_rgba(37,99,235,0.28),inset_0_2px_0_rgba(255,255,255,0.35)]">
              {/* Vibrant Primary / Secondary / Accent Color Mesh Orbs */}
              <div className="pointer-events-none absolute -top-16 -left-10 h-52 w-52 rounded-full bg-cyan-400/30 blur-3xl animate-pulse" />
              <div
                className="pointer-events-none absolute -top-12 right-4 h-56 w-56 rounded-full bg-fuchsia-500/30 blur-3xl animate-pulse"
                style={{ animationDelay: "1.2s" }}
              />
              <div
                className="pointer-events-none absolute -bottom-16 right-16 h-48 w-48 rounded-full bg-amber-300/25 blur-2xl animate-pulse"
                style={{ animationDelay: "0.6s" }}
              />

              {/* Subtle Right -> Left Target-Language Flag Wash behind Trophy */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-0 w-[62%] overflow-hidden"
                style={{
                  maskImage:
                    "linear-gradient(to left, rgba(0,0,0,0.26) 0%, rgba(0,0,0,0.10) 48%, transparent 88%)",
                  WebkitMaskImage:
                    "linear-gradient(to left, rgba(0,0,0,0.26) 0%, rgba(0,0,0,0.10) 48%, transparent 88%)",
                }}
              >
                <div className="flex h-full w-full -skew-x-12 scale-125">
                  <div
                    className="h-full flex-1"
                    style={{ backgroundColor: flagBands[0] }}
                  />
                  <div
                    className="h-full flex-1"
                    style={{ backgroundColor: flagBands[1] }}
                  />
                  <div
                    className="h-full flex-1"
                    style={{ backgroundColor: flagBands[2] }}
                  />
                </div>
              </div>

              {/* Right-Anchored Conversational Vectors & Glitter Stars (Never collides with left text on mobile!) */}
              <svg
                aria-hidden="true"
                viewBox="0 0 320 220"
                className="pointer-events-none absolute inset-y-0 right-0 h-full w-[58%] sm:w-[55%]"
                fill="none"
              >
                {/* Conversational Speech Bubble Vector 1 */}
                <g
                  className="animate-pulse"
                  style={{ animationDuration: "3.2s" }}
                >
                  <rect
                    x="24"
                    y="14"
                    width="74"
                    height="38"
                    rx="13"
                    fill="white"
                    fillOpacity="0.11"
                    stroke="white"
                    strokeOpacity="0.24"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M42 52L34 62L52 52H42Z"
                    fill="white"
                    fillOpacity="0.11"
                  />
                  <rect
                    x="40"
                    y="28"
                    width="3.5"
                    height="10"
                    rx="1.75"
                    fill="#FDE047"
                    fillOpacity="0.7"
                  />
                  <rect
                    x="48"
                    y="23"
                    width="3.5"
                    height="20"
                    rx="1.75"
                    fill="#38BDF8"
                    fillOpacity="0.8"
                  />
                  <rect
                    x="56"
                    y="26"
                    width="3.5"
                    height="14"
                    rx="1.75"
                    fill="#4ADE80"
                    fillOpacity="0.8"
                  />
                  <rect
                    x="64"
                    y="21"
                    width="3.5"
                    height="24"
                    rx="1.75"
                    fill="#F472B6"
                    fillOpacity="0.75"
                  />
                  <rect
                    x="72"
                    y="27"
                    width="3.5"
                    height="12"
                    rx="1.75"
                    fill="#FDE047"
                    fillOpacity="0.7"
                  />
                </g>

                {/* Conversational Speech Bubble Vector 2 */}
                <g
                  className="animate-pulse"
                  style={{
                    animationDuration: "4s",
                    animationDelay: "1.1s",
                  }}
                >
                  <rect
                    x="54"
                    y="108"
                    width="58"
                    height="30"
                    rx="11"
                    fill="#38BDF8"
                    fillOpacity="0.14"
                    stroke="#7DD3FC"
                    strokeOpacity="0.3"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx="71"
                    cy="123"
                    r="3"
                    fill="#FDE047"
                    fillOpacity="0.75"
                  />
                  <circle
                    cx="83"
                    cy="123"
                    r="3"
                    fill="#4ADE80"
                    fillOpacity="0.75"
                  />
                  <circle
                    cx="95"
                    cy="123"
                    r="3"
                    fill="#F472B6"
                    fillOpacity="0.75"
                  />
                </g>

                {/* Phasing Sound Rings behind Trophy */}
                <circle
                  cx="225"
                  cy="92"
                  r="74"
                  stroke="white"
                  strokeOpacity="0.14"
                  strokeWidth="1.5"
                  strokeDasharray="7 7"
                />
                <circle
                  cx="225"
                  cy="92"
                  r="98"
                  stroke="#38BDF8"
                  strokeOpacity="0.16"
                  strokeWidth="1.5"
                />

                {/* 4-Point Glitter Stars */}
                <path
                  d="M135 20L137 26L143 28L137 30L135 36L133 30L127 28L133 26L135 20Z"
                  fill="#FDE047"
                  fillOpacity="0.9"
                  className="animate-pulse"
                />
                <path
                  d="M36 82L37.5 86.5L42 88L37.5 89.5L36 94L34.5 89.5L30 88L34.5 86.5L36 82Z"
                  fill="#F472B6"
                  fillOpacity="0.85"
                  className="animate-pulse"
                  style={{ animationDelay: "1.3s" }}
                />
                <path
                  d="M286 24L288 30L294 32L288 34L286 40L284 34L278 32L284 30L286 24Z"
                  fill="#67E8F9"
                  fillOpacity="0.9"
                  className="animate-pulse"
                  style={{ animationDelay: "0.6s" }}
                />
              </svg>

              <div className="relative z-10 flex flex-col gap-3">
                {/* Top Row: Left Info (No Master Speaker badge) + Right 3D Trophy */}
                <div className="flex items-center justify-between gap-2 sm:gap-5">
                  <div className="min-w-0 flex-1 space-y-2 text-left sm:space-y-2.5">
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

                    {/* 4-Node Progress Track */}
                    <div className="space-y-1.5 pt-0.5">
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
                CARD 2: 3D WORD MATRIX SIGNATURES + BADGES (Fixed desktop overlap!)
                =============================================================== */}
            <div className="flex min-h-0 flex-1 flex-col justify-between gap-3.5 rounded-2xl sm:rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-4 sm:p-5 shadow-sm lg:overflow-y-auto">
              <div className="flex flex-col">
                <div className="mb-2.5 flex shrink-0 items-center justify-between gap-2">
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

                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
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
                            {item
                              ? `“${item.translation}”`
                              : "Practice to unlock"}
                          </div>

                          {item?.subLabel && (
                            <span
                              className={`mt-1.5 sm:mt-2 inline-flex max-w-full truncate items-center rounded-lg border-b-2 border-black/15 px-2 py-0.5 text-[10px] sm:text-[11px] font-black ${statClass}`}
                            >
                              {item.subLabel}
                            </span>
                          )}
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