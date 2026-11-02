// components/home/recent-badges-card.tsx
"use client";

import type { HomeDashboardData } from "@/app/actions/get-home-dashboard";

// 3x2 grid coordinates for slicing a single 16:9 Nano Banana badge sheet into 6 badges
const SPRITE_GRID_POSITIONS = [
  "0% 0%",     // Row 1, Col 1
  "50% 0%",    // Row 1, Col 2
  "100% 0%",   // Row 1, Col 3
  "0% 100%",   // Row 2, Col 1
  "50% 100%",  // Row 2, Col 2
  "100% 100%", // Row 2, Col 3
];

export function RecentBadgesCard({
  languageCard,
  spriteSheetUrl,
}: {
  languageCard: HomeDashboardData["languageCard"];
  /** Optional 16:9 3x2 badge sheet image URL ($0.036 single render!) */
  spriteSheetUrl?: string;
}) {
  const badges = [
    {
      id: "first-spoon",
      title: "First Spoon",
      subtitle: "Consistency",
      unlocked: languageCard.spoonsCompleted >= 1,
      gradient: ["#FDBA74", "#EA580C"],
      emoji: "🔥",
    },
    {
      id: "words",
      title: `${Math.max(50, languageCard.totalWordsBanked)} Words`,
      subtitle: "Vocabulary",
      unlocked: languageCard.totalWordsBanked >= 20,
      gradient: ["#93C5FD", "#2563EB"],
      emoji: "💬",
    },
    {
      id: "speaking",
      title: "Clear Speaker",
      subtitle: "Pronunciation",
      unlocked: languageCard.spokenResonanceAvg >= 60,
      gradient: ["#6EE7B7", "#059669"],
      emoji: "🎯",
    },
    {
      id: "boss-1",
      title: "First Crown",
      subtitle: "Boss Stage",
      unlocked: languageCard.bossesDefeated >= 1,
      gradient: ["#C4B5FD", "#7C3AED"],
      emoji: "👑",
    },
    {
      id: "ten-spoons",
      title: "10 Spoons",
      subtitle: "Momentum",
      unlocked: languageCard.spoonsCompleted >= 10,
      gradient: ["#FDE047", "#D97706"],
      emoji: "📖",
    },
    {
      id: "boss-3",
      title: "Boss Slayer",
      subtitle: "3 Crowns Won",
      unlocked: languageCard.bossesDefeated >= 3,
      gradient: ["#F9A8D4", "#DB2777"],
      emoji: "🌍",
    },
  ];

  return (
    <div className="rounded-[28px] border border-white bg-white/95 p-6 shadow-[0_10px_35px_rgba(15,23,42,0.05)] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-black text-slate-900">Recent Badges</h2>
          <p className="text-xs font-semibold text-slate-400">
            {badges.filter((b) => b.unlocked).length} of {badges.length} unlocked
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-x-3 gap-y-5 my-auto py-1">
        {badges.map((b, idx) => (
          <div
            key={b.id}
            className={`flex flex-col items-center text-center transition-transform duration-300 hover:-translate-y-1 ${
              b.unlocked ? "" : "opacity-45 grayscale"
            }`}
          >
            {spriteSheetUrl ? (
              /* 16:9 3x2 Sprite-Sheet Slicer (6 Badges from 1 Image!) */
              <div
                className="h-20 w-20 rounded-2xl shadow-md"
                style={{
                  backgroundImage: `url(${spriteSheetUrl})`,
                  backgroundSize: "300% 200%",
                  backgroundPosition: SPRITE_GRID_POSITIONS[idx],
                  backgroundRepeat: "no-repeat",
                }}
              />
            ) : (
              /* 3D Isometric Hexagon SVG Fallback */
              <svg
                width={80}
                height={80}
                viewBox="0 0 100 100"
                className="drop-shadow-md"
              >
                <defs>
                  <linearGradient
                    id={`grad-${b.id}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor={b.gradient[0]} />
                    <stop offset="100%" stopColor={b.gradient[1]} />
                  </linearGradient>
                </defs>
                <polygon
                  points="50,5 92,27 92,73 50,95 8,73 8,27"
                  fill={`url(#grad-${b.id})`}
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                />
                <polygon
                  points="50,13 84,31 50,48 16,31"
                  fill="#FFFFFF"
                  fillOpacity="0.22"
                />
                <text
                  x="50"
                  y="61"
                  textAnchor="middle"
                  fontSize="32"
                  className="select-none"
                >
                  {b.emoji}
                </text>
              </svg>
            )}

            <span className="mt-2 text-xs font-extrabold text-slate-800 leading-tight">
              {b.title}
            </span>
            <span className="text-[10px] font-semibold text-slate-400">
              {b.subtitle}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}