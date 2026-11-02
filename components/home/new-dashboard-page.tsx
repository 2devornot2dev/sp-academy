// components/home/new-dashboard-page.tsx
"use client";

import Link from "next/link";
import {
  ChevronRight,
  Lock,
  Share2,
  Sparkles,
  Check,
  ArrowRight,
} from "lucide-react";
import { useSprite } from "@/context/sprite-context";
import type { HomeDashboardData } from "@/app/actions/get-home-dashboard";

// ---------------------------------------------------------------------------
// 1. 3D ISOMETRIC HEXAGON BADGE (Matches Reference "Recent Badges" Grid)
// ---------------------------------------------------------------------------
type HexTheme = "orange" | "blue" | "green" | "purple" | "gold" | "pink";

const HEX_THEMES: Record<
  HexTheme,
  { outer: [string, string]; inner: [string, string]; shadow: string }
> = {
  orange: {
    outer: ["#FDBA74", "#EA580C"],
    inner: ["#FB923C", "#C2410C"],
    shadow: "drop-shadow(0 8px 12px rgba(234,88,12,0.28))",
  },
  blue: {
    outer: ["#93C5FD", "#2563EB"],
    inner: ["#60A5FA", "#1D4ED8"],
    shadow: "drop-shadow(0 8px 12px rgba(37,99,235,0.28))",
  },
  green: {
    outer: ["#6EE7B7", "#059669"],
    inner: ["#34D399", "#047857"],
    shadow: "drop-shadow(0 8px 12px rgba(5,150,105,0.28))",
  },
  purple: {
    outer: ["#C4B5FD", "#7C3AED"],
    inner: ["#A78BFA", "#5B21B6"],
    shadow: "drop-shadow(0 8px 12px rgba(124,58,237,0.28))",
  },
  gold: {
    outer: ["#FDE047", "#D97706"],
    inner: ["#FACC15", "#B45309"],
    shadow: "drop-shadow(0 8px 12px rgba(217,119,6,0.28))",
  },
  pink: {
    outer: ["#F9A8D4", "#DB2777"],
    inner: ["#F472B6", "#9D174D"],
    shadow: "drop-shadow(0 8px 12px rgba(219,39,119,0.28))",
  },
};

function HexBadge3D({
  id,
  theme,
  title,
  subtitle,
  unlocked,
  iconType,
  size = 84,
}: {
  id: string;
  theme: HexTheme;
  title: string;
  subtitle: string;
  unlocked: boolean;
  iconType: "flame" | "chat" | "target" | "mountain" | "book" | "globe";
  size?: number;
}) {
  const colors = HEX_THEMES[theme];
  const outerId = `hex-outer-${id}`;
  const innerId = `hex-inner-${id}`;

  return (
    <div
      className={`group flex flex-col items-center text-center transition-transform duration-300 hover:-translate-y-1 ${
        unlocked ? "" : "opacity-55 grayscale-[40%]"
      }`}
    >
      <div className="relative flex items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          style={{ filter: colors.shadow }}
        >
          <defs>
            <linearGradient id={outerId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.outer[0]} />
              <stop offset="100%" stopColor={colors.outer[1]} />
            </linearGradient>
            <linearGradient id={innerId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.inner[0]} />
              <stop offset="100%" stopColor={colors.inner[1]} />
            </linearGradient>
          </defs>

          {/* 3D Outer Bevel Hexagon */}
          <polygon
            points="50,4 93,27 93,73 50,96 7,73 7,27"
            fill={`url(#${outerId})`}
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeOpacity="0.6"
          />

          {/* Inner Recessed Hexagon */}
          <polygon
            points="50,12 85,31 85,69 50,88 15,69 15,31"
            fill={`url(#${innerId})`}
          />

          {/* Top Glossy Specular Highlight */}
          <polygon
            points="50,12 85,31 50,48 15,31"
            fill="#FFFFFF"
            fillOpacity="0.18"
          />

          {/* Center 3D Icon */}
          {iconType === "flame" && (
            <path
              d="M50 26C50 26 66 38 64 55C62 67 52 72 50 72C48 72 38 67 36 55C35 46 42 38 42 38C42 38 41 46 46 48C44 39 50 26 50 26Z"
              fill="#FEF08A"
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
          )}
          {iconType === "chat" && (
            <g>
              <rect
                x="28"
                y="32"
                width="34"
                height="24"
                rx="10"
                fill="#FFFFFF"
              />
              <circle cx="39" cy="44" r="2.5" fill="#2563EB" />
              <circle cx="46" cy="44" r="2.5" fill="#2563EB" />
              <circle cx="53" cy="44" r="2.5" fill="#2563EB" />
              <rect
                x="44"
                y="46"
                width="28"
                height="20"
                rx="8"
                fill="#BFDBFE"
              />
            </g>
          )}
          {iconType === "target" && (
            <g>
              <circle
                cx="50"
                cy="50"
                r="20"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="4"
              />
              <circle
                cx="50"
                cy="50"
                r="11"
                fill="none"
                stroke="#A7F3D0"
                strokeWidth="4"
              />
              <circle cx="50" cy="50" r="4.5" fill="#FDE047" />
            </g>
          )}
          {iconType === "mountain" && (
            <g>
              <polygon points="50,28 74,68 26,68" fill="#DDD6FE" />
              <polygon points="50,28 60,45 50,41 40,45" fill="#FFFFFF" />
            </g>
          )}
          {iconType === "book" && (
            <g>
              <path
                d="M30 34C38 32 46 34 50 38C54 34 62 32 70 34V64C62 62 54 64 50 68C46 64 38 62 30 64V34Z"
                fill="#FEF9C3"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
              <line
                x1="50"
                y1="38"
                x2="50"
                y2="68"
                stroke="#D97706"
                strokeWidth="2.5"
              />
            </g>
          )}
          {iconType === "globe" && (
            <g>
              <circle cx="50" cy="50" r="19" fill="#FCE7F3" />
              <path
                d="M38 40C44 42 46 48 42 54C39 58 44 64 50 65C56 66 62 58 60 50C58 42 52 36 44 35"
                fill="#DB2777"
              />
            </g>
          )}
        </svg>
      </div>

      <span className="mt-2 text-xs font-extrabold text-slate-800 leading-tight">
        {title}
      </span>
      <span className="text-[11px] font-semibold text-slate-400 mt-0.5">
        {subtitle}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. 3D HERO TROPHY ON PODIUM SVG (Matches Top Hero Banner Right Side)
// ---------------------------------------------------------------------------
function HeroTrophyIllustration() {
  return (
    <svg
      viewBox="0 0 280 210"
      className="h-44 w-56 sm:h-48 sm:w-64 shrink-0 select-none drop-shadow-[0_14px_24px_rgba(0,0,0,0.18)]"
      fill="none"
    >
      <defs>
        <linearGradient id="goldCup" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="45%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="podiumTop" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E0F2FE" />
          <stop offset="100%" stopColor="#93C5FD" />
        </linearGradient>
        <linearGradient id="podiumBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
      </defs>

      {/* Background Sunburst Rays */}
      <circle cx="155" cy="95" r="82" fill="#FFFFFF" fillOpacity="0.12" />
      <circle cx="155" cy="95" r="58" fill="#FEF08A" fillOpacity="0.18" />

      {/* Floating Confetti & Stars */}
      <circle cx="65" cy="42" r="5" fill="#FDE047" />
      <circle cx="242" cy="52" r="6" fill="#4ADE80" />
      <circle cx="92" cy="128" r="4" fill="#F472B6" />
      <rect
        x="48"
        y="78"
        width="12"
        height="6"
        rx="3"
        transform="rotate(-25 48 78)"
        fill="#38BDF8"
      />
      <rect
        x="225"
        y="105"
        width="14"
        height="6"
        rx="3"
        transform="rotate(30 225 105)"
        fill="#FACC15"
      />
      <rect
        x="202"
        y="28"
        width="10"
        height="5"
        rx="2.5"
        transform="rotate(-15 202 28)"
        fill="#FB7185"
      />

      {/* 2-Tier 3D Blue Podium */}
      <ellipse cx="155" cy="192" rx="86" ry="14" fill="#1E40AF" />
      <rect x="85" y="162" width="140" height="28" rx="6" fill="url(#podiumBody)" />
      <ellipse cx="155" cy="162" rx="70" ry="11" fill="url(#podiumTop)" />

      {/* Trophy Base */}
      <rect x="126" y="142" width="58" height="16" rx="5" fill="#B45309" />
      <rect x="132" y="135" width="46" height="9" rx="4" fill="url(#goldCup)" />

      {/* Trophy Stem */}
      <rect x="147" y="106" width="16" height="32" rx="6" fill="url(#goldCup)" />

      {/* Left & Right Trophy Handles */}
      <path
        d="M116 52H96C90 52 86 58 88 66C91 80 104 92 122 92"
        stroke="url(#goldCup)"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M194 52H214C220 52 224 58 222 66C219 80 206 92 188 92"
        stroke="url(#goldCup)"
        strokeWidth="9"
        strokeLinecap="round"
      />

      {/* Main Trophy Cup Bowl */}
      <path
        d="M112 36H198V68C198 94 179 112 155 112C131 112 112 94 112 68V36Z"
        fill="url(#goldCup)"
      />
      <ellipse cx="155" cy="36" rx="43" ry="8" fill="#FEF9C3" />

      {/* Star Emblem on Cup */}
      <polygon
        points="155,51 160,63 173,64 163,72 166,85 155,78 144,85 147,72 137,64 150,63"
        fill="#FFFBEB"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 3. MULTI-COLOR DONUT RING ("Total Achievement" Card)
// ---------------------------------------------------------------------------
function AchievementDonut({ pct }: { pct: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (Math.min(100, Math.max(8, pct)) / 100) * circumference;

  return (
    <div className="relative mx-auto flex h-36 w-36 items-center justify-center">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 132 132">
        <defs>
          <linearGradient id="donutGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
        </defs>
        <circle
          cx="66"
          cy="66"
          r={radius}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth="13"
        />
        <circle
          cx="66"
          cy="66"
          r={radius}
          fill="none"
          stroke="url(#donutGrad)"
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-black tracking-tight text-slate-900">
          {pct}%
        </span>
        <span className="text-[11px] font-bold text-slate-400">Completed</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MAIN GAMIFIED DASHBOARD COMPONENT
// ---------------------------------------------------------------------------
export function NewDashboardPage({ data }: { data: HomeDashboardData }) {
  const { openChat } = useSprite();
  const { user, languageCard, sprite, upcoming } = data;

  // Compute Gamified Level & XP from real Spoons, Bosses, and Words
  const totalXp =
    languageCard.spoonsCompleted * 150 +
    languageCard.bossesDefeated * 500 +
    languageCard.totalWordsBanked * 15;
  const level = Math.max(1, Math.floor(totalXp / 400) + 1);
  const xpInCurrentLevel = totalXp % 400;
  const xpRequiredForNext = 400;
  const levelProgressPct = Math.min(
    100,
    Math.max(12, Math.round((xpInCurrentLevel / xpRequiredForNext) * 100))
  );

  // Skill Track Progress Bars (Left Middle Card)
  const skillTracks = [
    {
      flag: languageCard.flag,
      title: `${languageCard.languageLabel} Campaign`,
      subtitle: languageCard.rankTitle,
      pct: Math.min(
        100,
        Math.max(10, Math.round((languageCard.spoonsCompleted / 30) * 100))
      ),
      barClass: "from-amber-400 to-orange-500",
      href: upcoming.href,
    },
    {
      flag: "🎙️",
      title: "Spoken Resonance",
      subtitle: "Azure Speech Clarity",
      pct:
        languageCard.spokenResonanceAvg > 0
          ? languageCard.spokenResonanceAvg
          : 62,
      barClass: "from-blue-400 to-indigo-600",
      href: "/learning-hub",
    },
    {
      flag: "🧠",
      title: "Word Matrix Bank",
      subtitle: `${languageCard.totalWordsBanked} Active Words`,
      pct: Math.min(
        100,
        Math.max(15, Math.round((languageCard.totalWordsBanked / 300) * 100))
      ),
      barClass: "from-emerald-400 to-teal-500",
      href: "/learning-hub",
    },
    {
      flag: "👑",
      title: "Boss Stage Survival",
      subtitle: `${languageCard.bossesDefeated} Crowns Won`,
      pct: Math.min(
        100,
        Math.max(12, Math.round((languageCard.bossesDefeated / 8) * 100))
      ),
      barClass: "from-purple-400 to-violet-600",
      href: upcoming.href,
    },
  ];

  // 6 Isometric 3D Hexagon Badges
  const hexBadges = [
    {
      id: "streak",
      theme: "orange" as HexTheme,
      title: "Active Streak",
      subtitle: "Consistency",
      unlocked: languageCard.spoonsCompleted >= 1,
      iconType: "flame" as const,
    },
    {
      id: "words",
      theme: "blue" as HexTheme,
      title: `${Math.max(100, languageCard.totalWordsBanked)} Words`,
      subtitle: "Vocabulary",
      unlocked: languageCard.totalWordsBanked >= 25,
      iconType: "chat" as const,
    },
    {
      id: "speaking",
      theme: "green" as HexTheme,
      title: "First Conversation",
      subtitle: "Speaking",
      unlocked: languageCard.spoonsCompleted >= 1,
      iconType: "target" as const,
    },
    {
      id: "level",
      theme: "purple" as HexTheme,
      title: `Level ${level}`,
      subtitle: "Milestone",
      unlocked: true,
      iconType: "mountain" as const,
    },
    {
      id: "grammar",
      theme: "gold" as HexTheme,
      title: "Chalkboard Pro",
      subtitle: "Grammar",
      unlocked: languageCard.spoonsCompleted >= 3,
      iconType: "book" as const,
    },
    {
      id: "world",
      theme: "pink" as HexTheme,
      title: "Boss Survivor",
      subtitle: "Mastery",
      unlocked: languageCard.bossesDefeated >= 1,
      iconType: "globe" as const,
    },
  ];

  const unlockedBadgesCount = hexBadges.filter((b) => b.unlocked).length;
  const totalCompletionPct = Math.min(
    100,
    Math.max(24, Math.round((unlockedBadgesCount / hexBadges.length) * 100))
  );

  // 3 Certificate Collection Cards (Bottom Row)
  const certificates = [
    {
      level: `${languageCard.languageLabel} A1`,
      tier: "Foundation Level",
      unlocked: languageCard.bossesDefeated >= 1,
      date: "Milestone 1 Passed",
      needed: Math.max(0, 3 - languageCard.spoonsCompleted),
    },
    {
      level: `${languageCard.languageLabel} A2`,
      tier: "Conversational Level",
      unlocked: languageCard.bossesDefeated >= 3,
      date: "Milestone 3 Passed",
      needed: Math.max(0, 9 - languageCard.spoonsCompleted),
    },
    {
      level: `${languageCard.languageLabel} B1`,
      tier: "Immersion Level",
      unlocked: languageCard.bossesDefeated >= 6,
      date: "Milestone 6 Passed",
      needed: Math.max(0, 18 - languageCard.spoonsCompleted),
    },
  ];

  const spoonsInCycle = languageCard.spoonsCompleted % 3;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E6F4FE] via-[#F2F8FF] to-[#E8F2FF] p-4 sm:p-6 lg:p-8 font-sans text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ===================================================================
            MAIN 12-COLUMN GAMIFIED BENTO GRID
            =================================================================== */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* =================================================================
              LEFT & CENTER AREA (8 Columns)
              ================================================================= */}
          <div className="flex flex-col gap-6 lg:col-span-8">
            {/* 1. HERO LEVEL BANNER WITH 3D TROPHY ON PODIUM */}
            <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-[#0957DE] via-[#1B86F8] to-[#2DD4BF] p-7 sm:p-8 text-white shadow-[0_18px_45px_rgba(27,134,248,0.28)]">
              <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex-1 space-y-3 text-center sm:text-left">
                  <span className="inline-block text-sm font-extrabold text-sky-100">
                    You&apos;re doing amazing, {user.firstName}! 🎉
                  </span>

                  <div>
                    <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white drop-shadow-sm">
                      Level {level}
                    </h1>
                    <p className="text-base sm:text-lg font-bold text-sky-100 mt-0.5">
                      {languageCard.rankTitle}
                    </p>
                  </div>

                  {/* Glossy 3D XP Progress Bar */}
                  <div className="pt-1 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="h-5 w-full sm:max-w-[290px] rounded-full bg-blue-950/35 p-1 shadow-inner">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-cyan-300 shadow-[0_0_12px_rgba(250,204,21,0.65)] transition-all duration-700"
                        style={{ width: `${levelProgressPct}%` }}
                      />
                    </div>
                    <span className="text-xs font-extrabold text-white/95 whitespace-nowrap">
                      {totalXp.toLocaleString()} /{" "}
                      {(level * 400).toLocaleString()} XP
                    </span>
                  </div>

                  {/* Bottom Frosted Pills */}
                  <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-4 py-1.5 text-xs font-extrabold text-slate-800 shadow-sm">
                      <span>🔥</span>
                      <span>{languageCard.spoonsCompleted} Spoons Mastered</span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-4 py-1.5 text-xs font-extrabold text-slate-800 shadow-sm">
                      <span>👑</span>
                      <span>
                        {languageCard.bossesDefeated} Boss Crowns Won
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3D Trophy on Podium Illustration */}
                <HeroTrophyIllustration />
              </div>
            </div>

            {/* 2. MIDDLE 2-COLUMN ROW: COURSE PROGRESS & 3D HEXAGON BADGES */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
              {/* LEFT: Course & Skill Progress Bars (5 cols) */}
              <div className="md:col-span-5 rounded-[28px] border border-white bg-white/95 p-6 shadow-[0_10px_35px_rgba(15,23,42,0.05)] flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-black text-slate-900">
                    Course Progress
                  </h2>
                  <Link
                    href="/learning-hub"
                    className="inline-flex items-center gap-0.5 text-xs font-extrabold text-blue-600 hover:text-blue-700"
                  >
                    <span>View All</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="space-y-3 my-auto">
                  {skillTracks.map((track) => (
                    <Link
                      key={track.title}
                      href={track.href}
                      className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 hover:border-blue-200 hover:bg-blue-50/40 transition"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-xl shadow-xs border border-slate-100">
                        {track.flag}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-extrabold text-slate-900 truncate">
                            {track.title}
                          </span>
                          <span className="text-xs font-black text-slate-700">
                            {track.pct}%
                          </span>
                        </div>
                        <p className="text-[10px] font-semibold text-slate-400 mb-1.5 truncate">
                          {track.subtitle}
                        </p>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${track.barClass}`}
                            style={{ width: `${track.pct}%` }}
                          />
                        </div>
                      </div>

                      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 group-hover:text-blue-600 transition shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>

              {/* RIGHT: Recent 3D Isometric Hexagon Badges (7 cols) */}
              <div className="md:col-span-7 rounded-[28px] border border-white bg-white/95 p-6 shadow-[0_10px_35px_rgba(15,23,42,0.05)] flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-black text-slate-900">
                    Recent Badges
                  </h2>
                  <button
                    type="button"
                    onClick={() => openChat({ tab: "briefing" })}
                    className="inline-flex items-center gap-0.5 text-xs font-extrabold text-blue-600 hover:text-blue-700"
                  >
                    <span>Open {sprite.name}</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-x-3 gap-y-5 my-auto py-1">
                  {hexBadges.map((b) => (
                    <HexBadge3D
                      key={b.id}
                      id={b.id}
                      theme={b.theme}
                      title={b.title}
                      subtitle={b.subtitle}
                      unlocked={b.unlocked}
                      iconType={b.iconType}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* 3. BOTTOM CERTIFICATE COLLECTION (Gold Seal & Locked Cards) */}
            <div className="rounded-[28px] border border-white bg-white/95 p-6 shadow-[0_10px_35px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-black text-slate-900">
                  Certificate Collection
                </h2>
                <Link
                  href="/learning-hub"
                  className="inline-flex items-center gap-0.5 text-xs font-extrabold text-blue-600 hover:text-blue-700"
                >
                  <span>Learning Path</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {certificates.map((cert) => (
                  <div
                    key={cert.level}
                    className={`relative overflow-hidden rounded-2xl border p-5 transition ${
                      cert.unlocked
                        ? "border-amber-200/80 bg-gradient-to-br from-[#FFFDF4] via-white to-[#EFF6FF] shadow-sm"
                        : "border-slate-200/70 bg-slate-100/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">
                          Certificate of Completion
                        </span>
                        <h3 className="mt-1.5 text-lg font-black text-slate-900">
                          {cert.level}
                        </h3>
                        <p className="text-xs font-semibold text-slate-500">
                          {cert.tier}
                        </p>
                      </div>

                      {/* Gold Embossed Ribbon Seal */}
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 font-black text-base shadow-md ${
                          cert.unlocked
                            ? "border-amber-200 bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950"
                            : "border-slate-300 bg-slate-200 text-slate-400"
                        }`}
                      >
                        S
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-slate-200/60 pt-2.5 text-[11px] font-bold text-slate-400">
                      <span className="italic font-serif text-slate-600">
                        Spoon Academy
                      </span>
                      <span>{cert.unlocked ? cert.date : "Locked"}</span>
                    </div>

                    {/* Locked Frosted Overlay */}
                    {!cert.unlocked && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/10 backdrop-blur-[2px] p-4 text-center">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md text-slate-700 mb-1.5">
                          <Lock className="h-4 w-4" />
                        </div>
                        <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-extrabold text-slate-700 shadow-xs">
                          Complete {cert.needed} more{" "}
                          {cert.needed === 1 ? "Spoon" : "Spoons"}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* =================================================================
              RIGHT SIDEBAR COLUMN (4 Columns)
              ================================================================= */}
          <div className="flex flex-col gap-6 lg:col-span-4">
            {/* 1. TOTAL ACHIEVEMENT DONUT RING CARD */}
            <div className="rounded-[28px] border border-white bg-white/95 p-6 shadow-[0_10px_35px_rgba(15,23,42,0.05)]">
              <h2 className="text-base font-black text-slate-900 mb-3">
                Total Achievement
              </h2>

              <AchievementDonut pct={totalCompletionPct} />

              <div className="mt-5 grid grid-cols-4 divide-x divide-slate-100 border-t border-slate-100 pt-4 text-center">
                <div>
                  <span className="block text-base">🏆</span>
                  <span className="mt-1 block text-base font-black text-slate-900">
                    {unlockedBadgesCount}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    Badges
                  </span>
                </div>
                <div>
                  <span className="block text-base">📜</span>
                  <span className="mt-1 block text-base font-black text-slate-900">
                    {certificates.filter((c) => c.unlocked).length}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    Certs
                  </span>
                </div>
                <div>
                  <span className="block text-base">👑</span>
                  <span className="mt-1 block text-base font-black text-slate-900">
                    {languageCard.bossesDefeated}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    Bosses
                  </span>
                </div>
                <div>
                  <span className="block text-base">⚡</span>
                  <span className="mt-1 block text-base font-black text-slate-900">
                    {sprite.energy}/{sprite.maxEnergy}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    Energy
                  </span>
                </div>
              </div>
            </div>

            {/* 2. LATEST ACHIEVEMENT / UP NEXT MISSION SPOTLIGHT */}
            <div className="rounded-[28px] border border-white bg-white/95 p-6 shadow-[0_10px_35px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-black text-slate-900">
                  Up Next Mission
                </h2>
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-800">
                  Milestone {languageCard.currentMilestone}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <HexBadge3D
                  id="spotlight-hex"
                  theme="blue"
                  title=""
                  subtitle=""
                  unlocked
                  iconType="mountain"
                  size={74}
                />
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-extrabold text-amber-500 block">
                    Ready to Launch!
                  </span>
                  <h3 className="text-lg font-black text-slate-900 truncate">
                    {upcoming.title}
                  </h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5 line-clamp-1">
                    {upcoming.subtitle}
                  </p>
                </div>
              </div>

              <Link
                href={upcoming.href}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 py-3 px-5 text-xs font-black text-white shadow-md shadow-blue-500/20 hover:brightness-105 transition"
              >
                <span>{upcoming.ctaLabel}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* 3. YOUR REWARDS & BOSS UNLOCKS CARD */}
            <div className="rounded-[28px] border border-white bg-white/95 p-6 shadow-[0_10px_35px_rgba(15,23,42,0.05)] space-y-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black text-slate-900">
                  Your Rewards
                </h2>
                <button
                  type="button"
                  onClick={() => openChat({ tab: "briefing" })}
                  className="inline-flex items-center gap-0.5 text-xs font-extrabold text-blue-600 hover:text-blue-700"
                >
                  <span>Use Energy</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-2.5">
                {/* Reward 1: Sprite Energy */}
                <div className="flex items-center justify-between rounded-2xl bg-slate-50/90 border border-slate-100 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-xl">
                      💎
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-slate-900">
                        {sprite.energy} Sprite Energy Charges
                      </p>
                      <p className="text-[11px] font-semibold text-slate-400">
                        1-on-1 Chalkboard Fuel
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-black text-sky-700">
                    ⚡ {sprite.energy}/{sprite.maxEnergy}
                  </span>
                </div>

                {/* Reward 2: Next Boss Unlock */}
                <div className="flex items-center justify-between rounded-2xl bg-slate-50/90 border border-slate-100 p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-xl">
                      🎁
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-slate-900 truncate">
                        {upcoming.nextBossReward}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-400">
                        Boss Stage {languageCard.currentMilestone} Reward
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-purple-100 px-2.5 py-1 text-[10px] font-black text-purple-700 shrink-0">
                    Next Boss
                  </span>
                </div>

                {/* Reward 3: AI Companion */}
                <div className="flex items-center justify-between rounded-2xl bg-slate-50/90 border border-slate-100 p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 overflow-hidden rounded-xl border border-emerald-200 bg-slate-900">
                      <img
                        src={sprite.avatarUrl}
                        alt={sprite.name}
                        className="h-full w-full object-cover object-top"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-slate-900">
                        {sprite.name} AI Companion
                      </p>
                      <p className="text-[11px] font-semibold text-slate-400">
                        Chalkboard &amp; Repair Arcade
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-700">
                    <Check className="h-3 w-3 stroke-[3]" /> Unlocked
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            BOTTOM FULL-WIDTH MILESTONE REWARD BAR WITH CROWNED AVATAR
            =================================================================== */}
        <div className="relative overflow-visible rounded-[26px] bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#38BDF8] px-6 py-4 text-white shadow-[0_14px_35px_rgba(37,99,235,0.25)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pr-0 md:pr-24">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl shadow-inner backdrop-blur-md">
                🎁
              </div>
              <div>
                <h3 className="text-sm font-black text-white">
                  Next Milestone Reward: {upcoming.nextBossReward}
                </h3>
                <p className="text-xs font-semibold text-sky-100">
                  {upcoming.stepsUntilNextBoss === 0
                    ? `Boss Stage ${languageCard.currentMilestone} is unlocked! Defeat the Boss to claim your reward.`
                    : `Complete ${upcoming.stepsUntilNextBoss} more ${
                        upcoming.stepsUntilNextBoss === 1 ? "Spoon" : "Spoons"
                      } to unlock Boss Stage ${languageCard.currentMilestone}!`}
                </p>
              </div>
            </div>

            {/* Progress Bar + X/3 Lessons Counter */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="h-4 w-full md:w-64 rounded-full bg-blue-950/40 p-0.5">
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
              <span className="text-xs font-black text-white whitespace-nowrap">
                {upcoming.focusType === "BOSS"
                  ? "3 / 3 Spoons"
                  : `${spoonsInCycle} / 3 Spoons`}
              </span>
            </div>
          </div>

          {/* Crowned Avatar Popping Out on the Right Corner (Matches Reference Image!) */}
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
      </div>
    </div>
  );
}