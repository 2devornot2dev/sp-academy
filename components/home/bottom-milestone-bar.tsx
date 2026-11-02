// components/home/bottom-milestone-bar.tsx
"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { HomeDashboardData } from "@/app/actions/get-home-dashboard";

export function BottomMilestoneBar({ data }: { data: HomeDashboardData }) {
  const { user, languageCard, upcoming, sprite } = data;
  const spoonsInCycle = languageCard.spoonsInCurrentCycle;

  return (
    <div className="relative overflow-visible rounded-[26px] bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#38BDF8] px-6 py-4 text-white shadow-[0_14px_35px_rgba(37,99,235,0.25)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pr-0 md:pr-24">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl shadow-inner backdrop-blur-md">
            🎁
          </div>
          <div>
            <h3 className="text-sm font-black text-white">
              Next Milestone Unlock: {upcoming.nextBossReward}
            </h3>
            <p className="text-xs font-semibold text-sky-100">
              {upcoming.stepsUntilNextBoss === 0
                ? `Boss Stage ${languageCard.currentMilestone} is unlocked right now!`
                : `${upcoming.stepsUntilNextBoss} more ${
                    upcoming.stepsUntilNextBoss === 1 ? "Spoon" : "Spoons"
                  } until Boss Stage ${languageCard.currentMilestone}`}
            </p>
          </div>
        </div>

        {/* Progress Bar + Slim Up Next CTA Button */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="h-3.5 w-36 sm:w-44 rounded-full bg-blue-950/40 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-500"
              style={{
                width: `${
                  upcoming.focusType === "BOSS"
                    ? 100
                    : Math.max(18, Math.round((spoonsInCycle / 3) * 100))
                }%`,
              }}
            />
          </div>

          <Link
            href={upcoming.href}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-black text-blue-700 shadow-md hover:bg-amber-300 hover:text-slate-950 transition"
          >
            <span>{upcoming.ctaLabel}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Crowned User Avatar Popping Out on the Right Corner */}
      <div className="hidden md:flex absolute -top-5 right-6 flex-col items-center">
        <span className="text-xl -mb-2 z-10 drop-shadow">👑</span>
        <div className="h-16 w-16 overflow-hidden rounded-full border-4 border-amber-300 bg-slate-900 shadow-xl">
          <img
            src={user.avatarUrl || sprite.avatarUrl}
            alt={user.firstName}
            className="h-full w-full object-cover object-top"
          />
        </div>
      </div>
    </div>
  );
}