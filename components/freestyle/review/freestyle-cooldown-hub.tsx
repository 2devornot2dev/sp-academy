// components/freestyle/freestyle-cooldown-hub.tsx
"use client";

import Link from "next/link";
import {
  Sparkles,
  BookOpen,
  Gamepad2,
  Timer,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Swords,
  RotateCcw,
  Flame,
  ShieldCheck,
  Mic,
  Zap,
} from "lucide-react";

interface FreestyleCooldownHubProps {
  cooldownSecondsLeft: number;
  isReviewReady: boolean;
  dailyUsed: number;
  dailyMax: number;
  onOpenReview: () => void;
  onStartAnother: () => void;
}

function formatCooldown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function FreestyleCooldownHub({
  cooldownSecondsLeft,
  isReviewReady,
  dailyUsed,
  dailyMax,
  onOpenReview,
  onStartAnother,
}: FreestyleCooldownHubProps) {
  const pctRemaining = Math.min(
    100,
    Math.max(0, Math.round((cooldownSecondsLeft / 300) * 100)),
  );
  const hitDailyCap = dailyUsed >= dailyMax;

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 font-sans text-slate-900 selection:bg-indigo-100">
      {/* =====================================================================
          1. GLOBAL APP HEADER BANNER (Matches Dashboard, Hub, Setup)
          ===================================================================== */}
      <header className="relative shrink-0 overflow-hidden animate-bg pt-6 pb-16 text-white shadow-lg">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/15 to-slate-950/35 backdrop-blur-[2px]" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[850px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-slate-950/45 px-4 py-1 text-xs font-black tracking-wide text-emerald-300 uppercase shadow-sm backdrop-blur-md">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Official Session Verified • Boss Unlocked</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/40 px-3.5 py-1 text-xs font-extrabold text-amber-300 shadow-sm backdrop-blur-md">
                <Timer className="h-3.5 w-3.5 text-amber-400" />
                <span>
                  {cooldownSecondsLeft > 0
                    ? `Cooldown: ${formatCooldown(cooldownSecondsLeft)}`
                    : "Cooldown Complete"}
                </span>
              </div>

              <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/40 px-3.5 py-1 text-xs font-extrabold text-sky-200 shadow-sm backdrop-blur-md">
                <Flame className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span>
                  {dailyUsed}/{dailyMax} Daily Chats
                </span>
              </div>
            </div>
          </div>

          <div className="max-w-3xl">
            <h1 className="text-2xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.22)] sm:text-3xl md:text-4xl">
              {isReviewReady
                ? "Your Deep AI Speech Report is Ready! 🎉"
                : "Crafting Your Deep AI Speech Report..."}
            </h1>
            <p className="mt-1 text-sm font-medium text-white/90 drop-shadow-[0_1px_4px_rgba(15,23,42,0.18)] sm:text-base">
              {isReviewReady
                ? "Your grammar fixes, vocabulary upgrades, and personalized Sprite dispatch are ready to review."
                : "Our AI engine is analyzing your turns and synthesizing custom voice coaching. Explore your hubs below while it finishes."}
            </p>
          </div>
        </div>
      </header>

      {/* =====================================================================
          2. MAIN 12-COL STAGE OVERLAPPING HEADER (-mt-10)
          ===================================================================== */}
      <main className="relative z-20 mx-auto -mt-10 w-full max-w-7xl flex-1 px-6 pb-12 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* LEFT 8 COLS: HERO REVIEW CARD + 3 NAVIGATION HUBS */}
          <div className="flex flex-col gap-6 lg:col-span-8">
            {/* Dark 3D Hero Action Card */}
            <div className="relative overflow-hidden rounded-3xl border-2 border-b-[6px] border-indigo-950/90 bg-gradient-to-r from-[#0F172A] via-[#131D36] to-[#1E1B4B] p-7 text-white shadow-xl sm:p-8">
              <div className="pointer-events-none absolute -top-20 -right-16 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-emerald-500/15 blur-3xl" />

              <div className="relative z-10 flex flex-col justify-between gap-6">
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/35 bg-indigo-500/20 px-3 py-1 text-[11px] font-black tracking-wide text-indigo-200 uppercase">
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                    Post-Conversation Report
                  </span>
                  <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                    {isReviewReady
                      ? "Open Interactive Mistake Repair & Grade"
                      : "Building Your Personalized Breakdown..."}
                  </h2>
                  <p className="max-w-2xl text-xs sm:text-sm font-medium leading-relaxed text-slate-300">
                    {isReviewReady
                      ? "See your A–D grade, hear native vocabulary upgrades, practice tricky phrases with Azure speech scoring, and unlock your final Vox/Vivi dispatch."
                      : "Every word you spoke is being added to your Word Matrix while your custom grammar drills and Sprite audio finish baking."}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
                  {isReviewReady ? (
                    <button
                      type="button"
                      onClick={onOpenReview}
                      className="inline-flex items-center gap-2.5 rounded-2xl border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 px-8 py-3.5 text-sm font-black text-white shadow-xl shadow-emerald-500/25 transition-all hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:border-b-0"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Open Interactive AI Review</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/25 text-sky-300">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                      <div>
                        <span className="block text-xs font-black tracking-wider text-sky-300 uppercase">
                          AI Review Baking in Background
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          Button unlocks automatically in a few seconds...
                        </span>
                      </div>
                    </div>
                  )}

                  {cooldownSecondsLeft === 0 && !hitDailyCap && (
                    <button
                      type="button"
                      onClick={onStartAnother}
                      className="inline-flex items-center gap-2 rounded-2xl border-2 border-b-4 border-slate-700 bg-slate-800 px-5 py-3 text-xs font-black text-white transition hover:bg-slate-700 active:translate-y-0.5 active:border-b-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Start Another Chat</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 3 Tactile Navigation Cards */}
            <div>
              <h3 className="mb-3 text-xs font-black tracking-widest text-slate-500 uppercase">
                Jump Right Into Another Activity
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* 1. Learning Hub (Boss Unlocked) */}
                <Link
                  href="/learning-hub"
                  className="group flex flex-col justify-between rounded-3xl border-2 border-b-[6px] border-purple-950 bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 p-6 text-white shadow-md transition-all hover:-translate-y-1"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl border-b-2 border-purple-700 bg-purple-500/30 text-amber-300">
                        <Swords className="h-5 w-5" />
                      </span>
                      <span className="rounded-full border border-emerald-400/30 bg-emerald-400/20 px-2.5 py-0.5 text-[10px] font-black text-emerald-300 uppercase">
                        Boss Ready
                      </span>
                    </div>
                    <h4 className="mt-4 text-lg font-black text-white">
                      Learning Hub
                    </h4>
                    <p className="mt-1 text-xs font-medium leading-relaxed text-slate-300">
                      Your Milestone Boss Stage is unlocked! Go test what you
                      just practiced.
                    </p>
                  </div>
                  <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-black text-amber-300 transition-transform group-hover:translate-x-1">
                    <span>Challenge Boss</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </Link>

                {/* 2. Books */}
                <Link
                  href="/books"
                  className="group flex flex-col justify-between rounded-3xl border-2 border-b-[6px] border-slate-200 border-b-slate-300 bg-white p-6 text-slate-900 shadow-sm transition-all hover:-translate-y-1 hover:border-sky-300"
                >
                  <div>
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border-b-2 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white">
                      <BookOpen className="h-5 w-5" />
                    </span>
                    <h4 className="mt-4 text-lg font-black text-slate-900">
                      Storybooks
                    </h4>
                    <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                      Read illustrated bilingual stories calibrated to your
                      level.
                    </p>
                  </div>
                  <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-black text-blue-600 transition-transform group-hover:translate-x-1">
                    <span>Explore Books</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </Link>

                {/* 3. Games */}
                <Link
                  href="/games"
                  className="group flex flex-col justify-between rounded-3xl border-2 border-b-[6px] border-slate-200 border-b-slate-300 bg-white p-6 text-slate-900 shadow-sm transition-all hover:-translate-y-1 hover:border-amber-300"
                >
                  <div>
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border-b-2 border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950">
                      <Gamepad2 className="h-5 w-5" />
                    </span>
                    <h4 className="mt-4 text-lg font-black text-slate-900">
                      Language Arcade
                    </h4>
                    <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                      Sharpen your reflexes with fast vocabulary mini-games.
                    </p>
                  </div>
                  <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-black text-orange-600 transition-transform group-hover:translate-x-1">
                    <span>Play Games</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* RIGHT 4 COLS: 3D ARENA TELEMETRY & COOLDOWN CARD */}
          <div className="flex flex-col lg:col-span-4">
            <div className="flex flex-1 flex-col justify-between rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-6 shadow-sm">
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Arena Status
                    </h3>
                    <p className="text-xs font-semibold text-slate-400">
                      5-minute cooldown between calls
                    </p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl border-b-2 border-amber-600 bg-amber-100 text-amber-700">
                    <Timer className="h-5 w-5" />
                  </span>
                </div>

                {/* Live Cooldown Meter */}
                <div className="rounded-2xl border-2 border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between text-xs font-black">
                    <span className="text-slate-500 uppercase tracking-wider">
                      Next Arena Slot
                    </span>
                    <span className="text-base text-slate-900">
                      {cooldownSecondsLeft > 0
                        ? formatCooldown(cooldownSecondsLeft)
                        : "Ready Now!"}
                    </span>
                  </div>
                  <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-emerald-500 transition-all duration-1000"
                      style={{ width: `${100 - pctRemaining}%` }}
                    />
                  </div>
                </div>

                {/* Daily Cap Tracker */}
                <div className="rounded-2xl border-2 border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between text-xs font-black">
                    <span className="text-slate-500 uppercase tracking-wider">
                      Daily Conversations
                    </span>
                    <span className="text-slate-900">
                      {dailyUsed} / {dailyMax} Used
                    </span>
                  </div>
                  <div className="mt-2.5 grid grid-cols-5 gap-1.5">
                    {Array.from({ length: dailyMax }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-2.5 rounded-full ${
                          i < dailyUsed
                            ? "bg-gradient-to-r from-amber-400 to-orange-500"
                            : "bg-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* What's Inside Your Report */}
                <div className="space-y-2.5 pt-1">
                  <span className="block text-[10px] font-black tracking-widest text-slate-400 uppercase">
                    Included In Your Report
                  </span>
                  {[
                    {
                      icon: ShieldCheck,
                      label: "Grammar Weakness Breakdown",
                      color: "text-rose-500",
                    },
                    {
                      icon: Zap,
                      label: "Native Vocabulary Upgrades",
                      color: "text-amber-500",
                    },
                    {
                      icon: Mic,
                      label: "Azure Pronunciation Drills",
                      color: "text-blue-600",
                    },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-2.5 text-xs font-bold text-slate-700"
                    >
                      <item.icon className={`h-4 w-4 shrink-0 ${item.color}`} />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {hitDailyCap && (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs font-bold text-amber-900">
                  Daily limit of {dailyMax} AI conversations reached! Your
                  cooldown resets tomorrow.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}