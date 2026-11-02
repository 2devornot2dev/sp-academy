// components/home/new-dashboard-page.tsx
"use client";

import ActivityFeed from "@/components/home/ActivityFeed";
import { DashboardHeroBanner } from "./dashboard-hero-banner";
import { WordSignaturesWidget } from "./word-signatures-widget";
import { RecentBadgesCard } from "./recent-badges-card";
import { BottomMilestoneBar } from "./bottom-milestone-bar";
import type { HomeDashboardData } from "@/app/actions/get-home-dashboard";

export function NewDashboardPage({ data }: { data: HomeDashboardData }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E6F4FE] via-[#F2F8FF] to-[#E8F2FF] p-4 sm:p-6 lg:p-8 font-sans text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* 1. TOP HERO TROPHY BANNER (With User Name, Milestone Progress & Slim Up Next) */}
        <DashboardHeroBanner data={data} />

        {/* 2. MIDDLE GAMIFIED GRID:
            Left (7 cols): 4 Word Matrix Superlatives + Recent Badges
            Right (5 cols): Live Spoon Feed (Community & Personal Wins + Likes) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          <div className="flex flex-col gap-6 lg:col-span-7">
            <WordSignaturesWidget
              superlatives={data.wordSuperlatives}
              totalWordsBanked={data.languageCard.totalWordsBanked}
            />

            <RecentBadgesCard languageCard={data.languageCard} />
          </div>

          {/* Right Column: Live Spoon Feed */}
          <div className="rounded-[28px] border border-white bg-white/95 p-6 shadow-[0_10px_35px_rgba(15,23,42,0.05)] lg:col-span-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  Spoon Feed
                </h2>
                <p className="text-xs font-semibold text-slate-400">
                  Live Boss Crowns, mastered Spoons &amp; community wins
                </p>
              </div>
            </div>

            <ActivityFeed />
          </div>
        </div>

        {/* 3. BOTTOM MILESTONE REWARD BAR WITH CROWNED AVATAR */}
        <BottomMilestoneBar data={data} />
      </div>
    </div>
  );
}