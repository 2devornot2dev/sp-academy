// components/home/sprite-header.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Zap, Trophy, Crown } from "lucide-react";
import type { HomeDashboardData } from "@/app/actions/get-home-dashboard";
import { getGreeting } from "./utils";

type SpriteHeaderProps = {
  data: Pick<
    HomeDashboardData,
    "user" | "languageCard" | "wordSuperlatives" | "sprite" | "upcoming"
  >;
};

export function SpriteHeader({ data }: SpriteHeaderProps) {
  const { user, languageCard, wordSuperlatives, sprite, upcoming } = data;
  const greeting = getGreeting();

  const isBossFocus = upcoming.focusType === "BOSS";
  const isConvoGate = isBossFocus && upcoming.href === "/conversation";

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
    //   {
    //     tag: "Coach Energy",
    //     content: (
    //       <>
    //         My battery is charged at{" "}
    //         <strong className="text-amber-600">
    //           {sprite.energy}/{sprite.maxEnergy} ⚡
    //         </strong>
    //         —tap your next stage card below whenever you&apos;re ready to roll!
    //       </>
    //     ),
    //   },
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
    }, 6400);
    return () => clearInterval(timer);
  }, [spriteMessages.length]);

  const activeSpriteMsg = spriteMessages[msgIdx] || spriteMessages[0];

  const cycleMessage = () =>
    setMsgIdx((prev) => (prev + 1) % spriteMessages.length);

  return (
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
            onClick={cycleMessage}
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
            onClick={cycleMessage}
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
                      idx === msgIdx ? "w-4 bg-blue-600" : "w-1.5 bg-slate-200"
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
  );
}