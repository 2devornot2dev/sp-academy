// components/home/new-dashboard-page.tsx
"use client";

import Link from "next/link";
import {
  Crown,
  Zap,
  Flame,
  ArrowRight,
  Lock,
  Sparkles,
  Trophy,
  Mic2,
  BookOpen,
  Shield,
  CheckCircle2,
  Compass,
} from "lucide-react";
import ActivityFeed from "@/components/home/ActivityFeed";
import { useSprite } from "@/context/sprite-context";
import type { HomeDashboardData } from "@/app/actions/get-home-dashboard";

export function NewDashboardPage({ data }: { data: HomeDashboardData }) {
  const { openChat } = useSprite();
  const { user, languageCard, sprite, upcoming, achievements } = data;

  // Milestone progress percentage toward the current Boss (every 3 Spoons = 100%)
  const spoonsInCurrentCycle = languageCard.spoonsCompleted % 3;
  const milestonePct =
    upcoming.focusType === "BOSS"
      ? 100
      : Math.min(100, Math.round((spoonsInCurrentCycle / 3) * 100));

  return (
    <div className="min-h-screen bg-[#F4F6FB] font-sans text-slate-900 pb-20">
      {/* TOP WELCOME BAR */}
      <div className="border-b border-slate-200/80 bg-white px-6 py-5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-indigo-600">
              Player Lobby · Spoon Academy
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mt-0.5">
              Welcome back, {user.firstName}!
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-black text-amber-800">
              <Flame className="h-4 w-4 fill-amber-500 text-amber-500" />
              <span>{languageCard.spoonsCompleted} Spoons Mastered</span>
            </div>

            <Link
              href="/learning-hub"
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white shadow-md hover:bg-black transition"
            >
              <Compass className="h-4 w-4 text-teal-400" />
              <span>Open Learning Hub</span>
            </Link>
          </div>
        </div>
      </div>

      {/* MAIN 12-COLUMN GAME LOBBY GRID */}
      <main className="mx-auto mt-7 max-w-7xl px-6">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          {/* =================================================================
              LEFT / MAIN STAGE (8 Columns):
              1. ONE MAIN GAMIFIED LANGUAGE CARD
              2. LIVE SPOON FEED
              ================================================================= */}
          <div className="flex flex-col gap-8 lg:col-span-8">
            {/* 1. THE MAIN GAMIFIED LANGUAGE CARD */}
            <div className="relative overflow-hidden rounded-[2rem] border-2 border-indigo-500/30 bg-gradient-to-br from-[#0B1021] via-[#111A30] to-[#0D2229] p-6 sm:p-8 text-white shadow-2xl">
              {/* Ambient Glow Orbs */}
              <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-teal-400/15 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />

              {/* TOP ROW: Language Flag + Player Rank Tier + Spoken Resonance */}
              <div className="relative z-10 flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-teal-400/50 bg-slate-900/90 text-4xl shadow-lg shadow-teal-500/10">
                    {languageCard.flag}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-teal-400/20 border border-teal-400/40 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-teal-300">
                        {languageCard.rankTitle}
                      </span>
                      <span className="rounded-full bg-amber-400/20 border border-amber-300/40 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-300">
                        👑 {languageCard.bossesDefeated}{" "}
                        {languageCard.bossesDefeated === 1
                          ? "Boss Crown"
                          : "Boss Crowns"}
                      </span>
                    </div>
                    <h2 className="mt-1.5 text-2xl sm:text-3xl font-black tracking-tight text-white">
                      {languageCard.languageLabel} Mastery Passport
                    </h2>
                  </div>
                </div>

                {/* Quick Power Readout Pills */}
                <div className="flex items-center gap-2.5">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-center">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Words Banked
                    </span>
                    <span className="text-lg font-black text-white">
                      {languageCard.totalWordsBanked}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-teal-400/30 bg-teal-500/10 px-4 py-2.5 text-center">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-teal-300">
                      Speech Avg
                    </span>
                    <span className="text-lg font-black text-teal-300">
                      {languageCard.spokenResonanceAvg > 0
                        ? `${languageCard.spokenResonanceAvg}%`
                        : "Ready"}
                    </span>
                  </div>
                </div>
              </div>

              {/* MIDDLE ROW 1: Milestone Progress Bar Toward Next Boss Unlock */}
              <div className="relative z-10 mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between gap-2 text-xs font-bold mb-2">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-amber-300" />
                    <span>
                      Milestone {languageCard.currentMilestone} Progress
                    </span>
                  </span>
                  <span className="text-amber-300 font-black">
                    {upcoming.focusType === "BOSS"
                      ? `Boss Stage ${languageCard.currentMilestone} Ready!`
                      : `${spoonsInCurrentCycle} / 3 Spoons to Boss ${languageCard.currentMilestone}`}
                  </span>
                </div>

                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800 p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-teal-400 to-amber-300 transition-all duration-500"
                    style={{ width: `${Math.max(12, milestonePct)}%` }}
                  />
                </div>
              </div>

              {/* MIDDLE ROW 2: THE BOSS CROWN & UNLOCK VAULT (8 Visual Relic Slots) */}
              <div className="relative z-10 mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-300">
                    👑 Boss Crown &amp; Unlock Vault
                  </span>
                  <span className="text-[11px] font-bold text-teal-300">
                    Each Boss Defeated Unlocks a New Feature or Book
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {languageCard.bossVault.map((slot) => {
                    const isNextTarget =
                      slot.milestoneIndex === languageCard.currentMilestone &&
                      !slot.passed;

                    return (
                      <div
                        key={slot.milestoneIndex}
                        className={`relative overflow-hidden rounded-2xl border p-3.5 transition ${
                          slot.passed
                            ? "border-amber-300/60 bg-gradient-to-b from-amber-400/20 to-slate-900/90 shadow-lg shadow-amber-500/10"
                            : isNextTarget
                              ? "border-teal-400/60 bg-slate-900/90 ring-2 ring-teal-400/20"
                              : "border-white/10 bg-slate-950/50 opacity-60"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider ${
                              slot.passed
                                ? "text-amber-300"
                                : isNextTarget
                                  ? "text-teal-300"
                                  : "text-slate-400"
                            }`}
                          >
                            Boss {slot.milestoneIndex}
                          </span>

                          {slot.passed ? (
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-300 px-1.5 py-0.5 text-[9px] font-black text-slate-950">
                              <Crown className="h-2.5 w-2.5 fill-current" />
                              {slot.score ? `${slot.score}%` : "WON"}
                            </span>
                          ) : (
                            <Lock className="h-3 w-3 text-slate-500" />
                          )}
                        </div>

                        <p className="text-xs font-extrabold text-white line-clamp-2 leading-snug">
                          {slot.unlockTitle}
                        </p>
                        <span className="mt-1.5 block text-[10px] font-bold text-slate-400">
                          {slot.unlockType}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* BOTTOM ROW: AI Companion Bar (Vox/Vivi + 3-Slot Energy + 1-Click Chalkboard Launch) */}
              <div className="relative z-10 mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-teal-400/30 bg-[#09131C]/90 p-4">
                <div className="flex items-center gap-3.5">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border-2 border-teal-400/60 bg-slate-900">
                    <img
                      src={sprite.avatarUrl}
                      alt={sprite.name}
                      className="h-full w-full object-cover object-top"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white">
                        {sprite.name}
                      </span>
                      <div className="flex items-center gap-0.5 rounded-full bg-slate-900 border border-amber-300/30 px-2 py-0.5">
                        {Array.from({ length: sprite.maxEnergy }).map(
                          (_, idx) => (
                            <Zap
                              key={idx}
                              className={`h-3 w-3 ${
                                idx < sprite.energy
                                  ? "text-amber-300 fill-amber-300"
                                  : "text-slate-600"
                              }`}
                            />
                          )
                        )}
                      </div>
                    </div>
                    <p className="text-xs font-medium text-slate-300 mt-0.5">
                      {sprite.isSnoozing
                        ? `💤 Resting voice while you finish ${upcoming.title}`
                        : `🟢 Awake & ready for 1-on-1 Chalkboard practice`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openChat({ tab: "session" })}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-400 px-4 py-2.5 text-xs font-black text-slate-950 hover:bg-teal-300 transition shadow-md"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Open {sprite.name} Chalkboard</span>
                </button>
              </div>
            </div>

            {/* 2. THE LIVE SPOON FEED (Community & Personal Milestones + ❤️ Likes) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Spoon Feed
                  </h3>
                  <p className="text-xs font-semibold text-slate-500">
                    Live Boss victories, mastered Spoons, and completed Books
                  </p>
                </div>
              </div>

              <ActivityFeed />
            </div>
          </div>

          {/* =================================================================
              RIGHT SIDEBAR (4 Columns):
              1. UPCOMING MISSION QUEUE
              2. NEXT BOSS UNLOCK PREVIEW
              3. UNLOCKED ACHIEVEMENTS
              ================================================================= */}
          <div className="flex flex-col gap-6 lg:col-span-4">
            {/* 1. UPCOMING MISSION CARD */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-indigo-700">
                  Up Next in Queue
                </span>
                <span className="text-xs font-bold text-slate-400">
                  Milestone {languageCard.currentMilestone}
                </span>
              </div>

              <h3 className="text-xl font-black text-slate-900 leading-snug">
                {upcoming.title}
              </h3>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                {upcoming.subtitle}
              </p>

              <Link
                href={upcoming.href}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition active:scale-[0.98]"
              >
                <span>{upcoming.ctaLabel}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/learning-hub"
                className="mt-2.5 block text-center text-xs font-bold text-slate-500 hover:text-slate-900 transition"
              >
                View full Learning Hub path ➔
              </Link>
            </div>

            {/* 2. NEXT BOSS REWARD PREVIEW CARD */}
            <div className="rounded-3xl border border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/60 p-6 shadow-sm">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-slate-950 shadow-xs">
                  <Crown className="h-5 w-5 fill-current" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 block">
                    Next Boss Unlock
                  </span>
                  <h4 className="text-sm font-black text-slate-900">
                    Boss Stage {languageCard.currentMilestone} Reward
                  </h4>
                </div>
              </div>

              <p className="mt-2 rounded-2xl border border-amber-200/80 bg-white px-3.5 py-2.5 text-xs font-extrabold text-slate-800">
                🎁 {upcoming.nextBossReward}
              </p>

              <p className="mt-2.5 text-[11px] font-semibold text-slate-500">
                {upcoming.stepsUntilNextBoss === 0
                  ? "Boss Stage is unlocked right now! Defeat it to claim this reward."
                  : `${upcoming.stepsUntilNextBoss} more ${
                      upcoming.stepsUntilNextBoss === 1 ? "Spoon" : "Spoons"
                    } until Boss Stage ${languageCard.currentMilestone} unlocks.`}
              </p>
            </div>

            {/* 3. TROPHIES & ACHIEVEMENTS SHELF */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <h4 className="text-sm font-black text-slate-900">
                    Achievements
                  </h4>
                </div>
                <span className="text-xs font-bold text-slate-400">
                  {achievements.filter((a) => a.isUnlocked).length} /{" "}
                  {achievements.length}
                </span>
              </div>

              <div className="space-y-2.5">
                {achievements.map((ach) => (
                  <div
                    key={ach.id}
                    className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
                      ach.isUnlocked
                        ? "border-emerald-200 bg-emerald-50/50"
                        : "border-slate-100 bg-slate-50/60 opacity-60"
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        ach.isUnlocked
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-200 text-slate-400"
                      }`}
                    >
                      {ach.isUnlocked ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-slate-900 truncate">
                        {ach.name}
                      </p>
                      <p className="text-[11px] font-medium text-slate-500 line-clamp-1">
                        {ach.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}