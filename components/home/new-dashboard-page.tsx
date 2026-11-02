// components/home/new-dashboard-page.tsx
"use client";

import {
  Flame,
  Globe2,
  Trophy,
  Zap,
} from "lucide-react";
import ActivityFeed from "@/components/home/ActivityFeed";
import { DashboardHeroBanner } from "./dashboard-hero-banner";
import { WordSignaturesWidget } from "./word-signatures-widget";
import { RecentBadgesCard } from "./recent-badges-card";
import type { HomeDashboardData } from "@/app/actions/get-home-dashboard";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 20 || hour < 5) return "Up late";
  return "Hi";
};

export function NewDashboardPage({ data }: { data: HomeDashboardData }) {
  const { user, languageCard, sprite } = data;
  const greeting = getGreeting();

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col bg-slate-100/80 font-sans text-slate-900 selection:bg-indigo-100">
      {/* 1. TOP HEADER BANNER (Matches Conversation & Learning Hub 1:1) */}
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
            <h1 className="text-2xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.22)] sm:text-3xl lg:text-4xl">
              {greeting}, {user.firstName}!
            </h1>
            <p className="mt-1 text-sm font-medium text-white/90 drop-shadow-[0_1px_4px_rgba(15,23,42,0.18)] sm:text-base">
              Your personal {languageCard.languageLabel} command center, Word
              Matrix signatures, and live community feed.
            </p>
          </div>
        </div>
      </header>

      {/* 2. OVERLAPPING -MT-10 12-COLUMN GRID */}
      <main className="relative z-20 mx-auto -mt-10 flex-1 min-h-0 w-full max-w-7xl px-6 pb-5 lg:px-8">
        <div className="grid h-full min-h-0 grid-cols-1 gap-6 lg:grid-cols-12">
          {/* LEFT COLUMN (8 Cols): Hero Banner + 2 Big Word Cards + Pop Trophy Vault */}
          <div className="flex flex-col gap-4 min-h-0 lg:col-span-8 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden">
            <DashboardHeroBanner data={data} />

            <WordSignaturesWidget
              superlatives={data.wordSuperlatives}
              totalWordsBanked={data.languageCard.totalWordsBanked}
            />

            <RecentBadgesCard languageCard={data.languageCard} />
          </div>

          {/* RIGHT COLUMN (4 Cols): SPOON FEED */}
          <div className="flex flex-col min-h-0 lg:col-span-4 h-full">
            <div className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm">
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

              <ActivityFeed />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}