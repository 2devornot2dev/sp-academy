// components/home/recent-badges-card.tsx
"use client";

import { Sparkles, Trophy } from "lucide-react";
import type { HomeDashboardData } from "@/app/actions/get-home-dashboard";

export function RecentBadgesCard({
  languageCard,
}: {
  languageCard: HomeDashboardData["languageCard"];
}) {
  const badges = [
    {
      id: "first-spoon",
      title: "First Spoon",
      sub: "Consistency",
      unlocked: languageCard.spoonsCompleted >= 1,
      grad: ["#FDBA74", "#EA580C"],
      emoji: "🔥",
    },
    {
      id: "words",
      title: `${Math.max(50, languageCard.totalWordsBanked)} Words`,
      sub: "Vocabulary",
      unlocked: languageCard.totalWordsBanked >= 20,
      grad: ["#93C5FD", "#2563EB"],
      emoji: "💬",
    },
    {
      id: "speaking",
      title: "Clear Speaker",
      sub: "Pronunciation",
      unlocked: languageCard.spokenResonanceAvg >= 60,
      grad: ["#6EE7B7", "#059669"],
      emoji: "🎯",
    },
    {
      id: "boss-1",
      title: "First Crown",
      sub: "Boss Stage",
      unlocked: languageCard.bossesDefeated >= 1,
      grad: ["#C4B5FD", "#7C3AED"],
      emoji: "👑",
    },
    {
      id: "ten-spoons",
      title: "10 Spoons",
      sub: "Momentum",
      unlocked: languageCard.spoonsCompleted >= 10,
      grad: ["#FDE047", "#D97706"],
      emoji: "📖",
    },
    {
      id: "boss-3",
      title: "Boss Slayer",
      sub: "3 Crowns Won",
      unlocked: languageCard.bossesDefeated >= 3,
      grad: ["#F9A8D4", "#DB2777"],
      emoji: "🌍",
    },
  ];

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <div className="relative overflow-hidden rounded-[28px] border-2 border-indigo-500/30 bg-gradient-to-br from-[#0B1020] via-[#10172B] to-[#171E36] p-6 text-white shadow-xl">
      {/* Subtle Ambient Radial Glow */}
      <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-teal-400/15 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-indigo-500/20 blur-2xl" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400/20 border border-amber-300/40 text-amber-300 shadow-sm">
            <Trophy className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-black text-white">
              Trophy Vault
            </h2>
            <p className="text-xs font-semibold text-slate-300">
              Milestone badges unlocked through real course progress
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-black text-amber-300 backdrop-blur-md">
          <Sparkles className="h-3 w-3" />
          <span>{unlockedCount} / {badges.length} Unlocked</span>
        </span>
      </div>

      {/* 6 3D Badges in 1 Crisp Row */}
      <div className="relative z-10 grid grid-cols-3 sm:grid-cols-6 gap-3 pt-1">
        {badges.map((b) => (
          <div
            key={b.id}
            className={`group flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1 ${
              b.unlocked ? "" : "opacity-35 grayscale"
            }`}
          >
            <div className="relative flex items-center justify-center">
              <svg
                width={62}
                height={62}
                viewBox="0 0 100 100"
                className="drop-shadow-[0_8px_14px_rgba(0,0,0,0.45)] group-hover:scale-105 transition-transform"
              >
                <defs>
                  <linearGradient
                    id={`hex-grad-${b.id}`}
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
                  fill={`url(#hex-grad-${b.id})`}
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                />
                <polygon
                  points="50,13 84,31 50,48 16,31"
                  fill="#FFFFFF"
                  fillOpacity="0.25"
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
            </div>

            <span className="mt-2 text-xs font-black text-slate-100 leading-tight truncate w-full">
              {b.title}
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              {b.sub}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}