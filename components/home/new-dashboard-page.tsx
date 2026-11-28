// components/home/new-dashboard-page.tsx
"use client";

import { Flame } from "lucide-react";
import ActivityFeed from "@/components/home/activity-feed";
import type { HomeDashboardData } from "@/app/actions/get-home-dashboard";
import { SpriteHeader } from "./sprite-header";
import { DashboardHeroCard } from "./dashboard-hero-card";
import { HomeMatrixCard } from "./home-matrix-card";

export function NewDashboardPage({ data }: { data: HomeDashboardData }) {
  const { user, languageCard, wordSuperlatives, sprite, upcoming } = data;
  const profile = user?.profile;

  return (
    <div className="flex min-h-full flex-col bg-slate-100/80 font-sans text-slate-900 selection:bg-indigo-100 lg:h-dvh lg:overflow-hidden">
      {/* 1. HEADER BANNER (Living Sprite + Tap-to-Cycle 3D Speech Bubble) */}
      <SpriteHeader
        data={{ user, languageCard, wordSuperlatives, sprite, upcoming }}
      />

      {/* 2. MAIN DASHBOARD GRID */}
      <main className="relative z-20 mx-auto -mt-7 sm:-mt-10 flex min-h-0 w-full max-w-7xl flex-1 px-3.5 pb-8 sm:px-6 lg:px-8 lg:pb-5">
        <div className="grid h-full min-h-0 w-full grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-12">
          {/* LEFT COLUMN */}
          <div className="flex min-h-0 flex-col gap-4 sm:gap-5 lg:col-span-8">
            {/* CARD 1: MILESTONE HERO CARD */}
            <DashboardHeroCard
              languageCard={languageCard}
              upcoming={upcoming}
            />

            {/* CARD 2: WORD MATRIX SIGNATURES + BADGES */}
            <HomeMatrixCard
              languageCard={languageCard}
              wordSuperlatives={wordSuperlatives}
            />
          </div>

          {/* RIGHT COLUMN: 3D SPOON FEED CARD */}
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