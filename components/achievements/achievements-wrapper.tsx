// components/achievements/achievements-wrapper.tsx
"use client";

import { useState, useMemo } from "react";
import {
  Trophy,
  Crown,
  Flame,
  Sparkles,
  Lock,
  CheckCircle2,
  BookOpen,
  Mic2,
  Zap,
  Globe2,
  Share2,
} from "lucide-react";

// ============================================================================
// 1. MOCK ACHIEVEMENTS ARRAY (Covers Spoons, Bosses, Word Matrix, & Books)
// ============================================================================
export interface AchievementItem {
  id: string;
  category: "milestones" | "speaking" | "vocabulary" | "books";
  name: string;
  description: string;
  emoji: string;
  accentColor: "amber" | "blue" | "emerald" | "purple" | "rose";
  isUnlocked: boolean;
  unlockedAt?: string | null;
  progress?: {
    current: number;
    target: number;
    unit: string;
  };
  rewardBadge: string;
}

export const FAKE_ACHIEVEMENTS: AchievementItem[] = [
  {
    id: "first-spoon",
    category: "milestones",
    name: "First Words",
    description: "Complete your very first Spoon audio lesson.",
    emoji: "🥄",
    accentColor: "blue",
    isUnlocked: true,
    unlockedAt: "3 weeks ago",
    progress: { current: 1, target: 1, unit: "Spoons" },
    rewardBadge: "Day-One Explorer",
  },
  {
    id: "first-crown",
    category: "milestones",
    name: "Crown Bearer",
    description: "Defeat Boss Stage 1 with at least 1 heart remaining.",
    emoji: "👑",
    accentColor: "amber",
    isUnlocked: true,
    unlockedAt: "2 weeks ago",
    progress: { current: 1, target: 1, unit: "Bosses" },
    rewardBadge: "+1 ⚡ Energy",
  },
  {
    id: "double-digit",
    category: "milestones",
    name: "Momentum",
    description: "Master 10 custom-baked Spoons.",
    emoji: "🔥",
    accentColor: "amber",
    isUnlocked: true,
    unlockedAt: "1 week ago",
    progress: { current: 10, target: 10, unit: "Spoons" },
    rewardBadge: "Streak Multiplier",
  },
  {
    id: "speech-resonance",
    category: "speaking",
    name: "Native Resonance",
    description: "Achieve an 80%+ pronunciation score on any Spoon.",
    emoji: "🎯",
    accentColor: "emerald",
    isUnlocked: true,
    unlockedAt: "4 days ago",
    progress: { current: 85, target: 80, unit: "% Score" },
    rewardBadge: "Golden Mic",
  },
  {
    id: "word-centurion",
    category: "vocabulary",
    name: "Lexicon Centurion",
    description: "Bank 100+ active words in your Word Matrix.",
    emoji: "🧠",
    accentColor: "purple",
    isUnlocked: true,
    unlockedAt: "2 days ago",
    progress: { current: 159, target: 100, unit: "Words" },
    rewardBadge: "Matrix Master",
  },
  {
    id: "repair-arcade",
    category: "speaking",
    name: "Arcade Champion",
    description: "Complete a 3-Round Mistake Repair Workout with Vox.",
    emoji: "⚡",
    accentColor: "emerald",
    isUnlocked: true,
    unlockedAt: "Yesterday",
    progress: { current: 3, target: 3, unit: "Rounds" },
    rewardBadge: "+1 ⚡ Energy",
  },
  {
    id: "first-book",
    category: "books",
    name: "First Storyteller",
    description: "Read all 5 pages and solve every checkpoint in a SpoonBook.",
    emoji: "📕",
    accentColor: "rose",
    isUnlocked: false,
    unlockedAt: null,
    progress: { current: 2, target: 5, unit: "Pages" },
    rewardBadge: "Bookshelf Seal",
  },
  {
    id: "boss-slayer",
    category: "milestones",
    name: "Boss Slayer",
    description: "Conquer 6 distinct Milestone Boss Stages.",
    emoji: "⚔️",
    accentColor: "amber",
    isUnlocked: true,
    unlockedAt: "Today",
    progress: { current: 6, target: 6, unit: "Bosses" },
    rewardBadge: "Prestige Frame",
  },
  {
    id: "half-century",
    category: "milestones",
    name: "Halfway to Paris",
    description: "Master 50 Spoon audio lessons.",
    emoji: "🇫🇷",
    accentColor: "blue",
    isUnlocked: false,
    unlockedAt: null,
    progress: { current: 18, target: 50, unit: "Spoons" },
    rewardBadge: "Café Regular",
  },
  {
    id: "voice-burst-master",
    category: "speaking",
    name: "Voice Overcharge",
    description: "Shatter the shield in Round 3 of a Repair Arcade 5 times.",
    emoji: "💥",
    accentColor: "emerald",
    isUnlocked: false,
    unlockedAt: null,
    progress: { current: 1, target: 5, unit: "Shatters" },
    rewardBadge: "Vocal Power",
  },
  {
    id: "lexicon-500",
    category: "vocabulary",
    name: "Walking Dictionary",
    description: "Bank 300+ words in your personal Word Matrix.",
    emoji: "📚",
    accentColor: "purple",
    isUnlocked: false,
    unlockedAt: null,
    progress: { current: 159, target: 300, unit: "Words" },
    rewardBadge: "Fluent Ear",
  },
  {
    id: "library-conqueror",
    category: "books",
    name: "Bibliophile",
    description: "Complete all 3 starter SpoonBooks in your library.",
    emoji: "🏆",
    accentColor: "rose",
    isUnlocked: false,
    unlockedAt: null,
    progress: { current: 0, target: 3, unit: "Books" },
    rewardBadge: "Gold Ribbon",
  },
];

// ============================================================================
// 2. COMPONENT PROPS
// ============================================================================
interface AchievementsWrapperProps {
  userName?: string;
  targetLang?: string;
  nativeLang?: string;
  completedSpoons?: number;
  streakCount?: number;
  achievements?: AchievementItem[];
}

export function AchievementsWrapper({
  userName = "Paul",
  targetLang = "French",
  nativeLang = "English",
  completedSpoons = 18,
  streakCount = 1,
  achievements = FAKE_ACHIEVEMENTS,
}: AchievementsWrapperProps) {
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "milestones" | "speaking" | "vocabulary" | "books"
  >("all");

  const unlockedCount = useMemo(
    () => achievements.filter((a) => a.isUnlocked).length,
    [achievements]
  );
  const totalCount = achievements.length;
  const completionPct = Math.round((unlockedCount / totalCount) * 100);

  const filteredAchievements = useMemo(() => {
    if (selectedCategory === "all") return achievements;
    return achievements.filter((a) => a.category === selectedCategory);
  }, [achievements, selectedCategory]);

  const categories = [
    { id: "all", label: "All Trophies", count: totalCount },
    {
      id: "milestones",
      label: "Milestones & Bosses",
      count: achievements.filter((a) => a.category === "milestones").length,
    },
    {
      id: "speaking",
      label: "Speaking & Pronunciation",
      count: achievements.filter((a) => a.category === "speaking").length,
    },
    {
      id: "vocabulary",
      label: "Word Matrix",
      count: achievements.filter((a) => a.category === "vocabulary").length,
    },
    {
      id: "books",
      label: "SpoonBooks",
      count: achievements.filter((a) => a.category === "books").length,
    },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-100/80 font-sans text-slate-900 selection:bg-indigo-100 pb-20">
      {/* =====================================================================
          1. DASHBOARD HEADER (Matches Conversation, Learning Hub & Dashboard)
          ===================================================================== */}
      <header className="relative overflow-hidden animate-bg pt-9 pb-24 text-white shadow-lg">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/15 to-slate-950/35 backdrop-blur-[2px]" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-[850px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
          {/* Top Frosted Glass Pills */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-slate-950/35 px-4 py-1.5 text-xs font-semibold tracking-wide text-white shadow-sm backdrop-blur-md">
              <Globe2 className="h-4 w-4 text-cyan-300" />
              <span>
                Learning{" "}
                <strong className="font-extrabold text-white uppercase">
                  {targetLang}
                </strong>{" "}
                <span className="text-white/75">
                  from{" "}
                  <span className="font-bold text-white capitalize">
                    {nativeLang}
                  </span>
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/35 px-3.5 py-1.5 text-xs font-extrabold text-amber-300 shadow-sm backdrop-blur-md">
                <Flame className="h-4 w-4 fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
                <span>Streak: {streakCount}</span>
              </div>

              <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/35 px-3.5 py-1.5 text-xs font-extrabold text-emerald-300 shadow-sm backdrop-blur-md">
                <Trophy className="h-4 w-4 text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
                <span>{unlockedCount} / {totalCount} Trophies</span>
              </div>
            </div>
          </div>

          <div className="max-w-3xl">
            <h1 className="flex items-center gap-3 text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.22)]">
              <span>Trophy Hall &amp; Milestones</span>
              <Trophy className="h-8 w-8 text-amber-300 sm:h-10 sm:w-10 drop-shadow" />
            </h1>
            <p className="mt-2.5 text-base font-medium text-white/90 drop-shadow-[0_1px_4px_rgba(15,23,42,0.18)] sm:text-lg">
              Every Boss crown, audio lesson streak, and Word Matrix breakthrough you&apos;ve conquered.
            </p>
          </div>
        </div>
      </header>

      {/* =====================================================================
          2. OVERLAPPING -MT-12 CONTENT CONTAINER
          ===================================================================== */}
      <main className="relative z-20 mx-auto -mt-12 max-w-7xl px-6 lg:px-8 space-y-6">
        {/* SUMMARY HERO OVERVIEW CARD */}
        <div className="rounded-3xl border border-white bg-white/95 p-6 shadow-[0_10px_35px_rgba(15,23,42,0.05)] backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-600">
                Overall Mastery Progress
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                {unlockedCount} of {totalCount} Badges Unlocked ({completionPct}%)
              </h2>
            </div>

            {/* Chunky Progress Bar */}
            <div className="w-full sm:max-w-xs space-y-1.5">
              <div className="h-3 w-full rounded-full bg-slate-100 p-0.5 border border-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 via-teal-400 to-indigo-500 transition-all duration-700"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-bold text-slate-400">
                <span>{unlockedCount} Earned</span>
                <span>{totalCount - unlockedCount} Remaining</span>
              </div>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-slate-100">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition ${
                  selectedCategory === c.id
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
                    : "bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100"
                }`}
              >
                <span>{c.label}</span>
                <span
                  className={`rounded-md px-1.5 py-0.2 text-[10px] font-bold ${
                    selectedCategory === c.id
                      ? "bg-white/20 text-white"
                      : "bg-slate-200/70 text-slate-500"
                  }`}
                >
                  {c.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* =====================================================================
            3. ACHIEVEMENTS GRID (High-Contrast Gamified Cards)
            ===================================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAchievements.map((item) => {
            const hasProgress =
              item.progress && item.progress.target > item.progress.current;
            const progressPct = item.progress
              ? Math.min(
                  100,
                  Math.round(
                    (item.progress.current / item.progress.target) * 100
                  )
                )
              : 100;

            return (
              <div
                key={item.id}
                className={`group relative overflow-hidden rounded-3xl border-2 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between ${
                  item.isUnlocked
                    ? "border-white bg-white/95 shadow-sm"
                    : "border-slate-200/80 bg-slate-50/70 opacity-70"
                }`}
              >
                <div>
                  {/* Top Row: 3D Emoji Avatar + Reward Badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shadow-md border ${
                        item.isUnlocked
                          ? "bg-gradient-to-br from-amber-100 via-white to-amber-50 border-amber-200 shadow-amber-500/10"
                          : "bg-slate-200 border-slate-300 text-slate-400 grayscale"
                      }`}
                    >
                      {item.emoji}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-700">
                        {item.rewardBadge}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug">
                    {item.name}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Bottom Status / Progress Section */}
                <div className="mt-5 pt-3.5 border-t border-slate-100">
                  {item.isUnlocked ? (
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-700">
                      <span className="inline-flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Unlocked</span>
                      </span>
                      {item.unlockedAt && (
                        <span className="text-[11px] font-semibold text-slate-400">
                          {item.unlockedAt}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                        <span className="inline-flex items-center gap-1 text-slate-400">
                          <Lock className="h-3 w-3" />
                          <span>Locked</span>
                        </span>
                        <span>
                          {item.progress?.current} / {item.progress?.target}{" "}
                          {item.progress?.unit}
                        </span>
                      </div>

                      <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}