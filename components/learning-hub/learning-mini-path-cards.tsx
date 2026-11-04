// learning-mini-path-cards.tsx
"use client";

import Link from "next/link";
import {
  Lock,
  ArrowRight,
  CheckCircle2,
  Swords,
  Zap,
  Headphones,
  RotateCcw,
  Sparkles,
  Crown,
  Play,
} from "lucide-react";
import type { LearningPath } from "@/app/actions/get-learning-path";

type FocusState = LearningPath["currentFocus"];
type Lesson = LearningPath["lessons"][number];

const PILLAR_PALETTES = [
  {
    stepRoman: "Pillar I",
    roleLabel: "Foundation",
    topBar: "from-sky-400 to-blue-500",
    cardBgActive:
      "bg-gradient-to-b from-sky-50/90 via-white to-white ring-2 ring-sky-400 shadow-md shadow-sky-500/10",
    cardBgIdle:
      "bg-gradient-to-b from-sky-50/40 via-white to-white ring-1 ring-sky-200/70",
    iconBadge: "bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-sm shadow-sky-500/30",
    stepText: "text-sky-600",
    pillBg: "bg-sky-100/80 text-sky-700",
    barFill: "bg-sky-500",
  },
  {
    stepRoman: "Pillar II",
    roleLabel: "Expansion",
    topBar: "from-teal-400 to-emerald-500",
    cardBgActive:
      "bg-gradient-to-b from-emerald-50/90 via-white to-white ring-2 ring-emerald-400 shadow-md shadow-emerald-500/10",
    cardBgIdle:
      "bg-gradient-to-b from-emerald-50/40 via-white to-white ring-1 ring-emerald-200/70",
    iconBadge:
      "bg-gradient-to-br from-teal-400 to-emerald-600 text-white shadow-sm shadow-emerald-500/30",
    stepText: "text-emerald-600",
    pillBg: "bg-emerald-100/80 text-emerald-700",
    barFill: "bg-emerald-500",
  },
  {
    stepRoman: "Pillar III",
    roleLabel: "Mastery",
    topBar: "from-indigo-400 to-violet-500",
    cardBgActive:
      "bg-gradient-to-b from-violet-50/90 via-white to-white ring-2 ring-violet-400 shadow-md shadow-violet-500/10",
    cardBgIdle:
      "bg-gradient-to-b from-violet-50/40 via-white to-white ring-1 ring-violet-200/70",
    iconBadge:
      "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm shadow-violet-500/30",
    stepText: "text-violet-600",
    pillBg: "bg-violet-100/80 text-violet-700",
    barFill: "bg-violet-500",
  },
] as const;

const LOCKED_THEMES = {
  SPOON: {
    badge: "bg-sky-100 text-sky-800",
    iconBg: "bg-gradient-to-br from-sky-500 to-indigo-600 text-white",
    icon: <Headphones className="h-4 w-4" />,
  },
  BRIDGE: {
    badge: "bg-amber-100 text-amber-900",
    iconBg: "bg-gradient-to-br from-amber-400 to-orange-500 text-white",
    icon: <Zap className="h-4 w-4" />,
  },
  BOSS: {
    badge: "bg-fuchsia-100 text-fuchsia-800",
    iconBg: "bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white",
    icon: <Swords className="h-4 w-4" />,
  },
} as const;

export function LearningPathMiniCards({
  courseId,
  currentFocus,
  nextLocked,
  lessons = [],
  getLessonHref,
  getBossHref,
  displayTitles,
}: {
  courseId: string;
  currentFocus: FocusState;
  nextLocked: FocusState;
  lessons?: Lesson[];
  getLessonHref?: (lessonId: string) => string;
  getBossHref?: (bossId: string, lessonId: string) => string;
  displayTitles?: Map<string, string>;
}) {
  if (!currentFocus) return null;

  const resolveLessonHref = (lessonId: string) =>
    getLessonHref
      ? getLessonHref(lessonId)
      : `/foundation/${lessonId}/${courseId}`;

  const activeOrderIndex = currentFocus.data.orderIndex ?? 1;
  const milestoneNum = Math.ceil(activeOrderIndex / 3);
  const unitStartOrder = (milestoneNum - 1) * 3 + 1;
  const unitSpoonNumbers = [
    unitStartOrder,
    unitStartOrder + 1,
    unitStartOrder + 2,
  ];

  // Get up to 3 most recently completed lessons for quick review
  const recentCompleted = lessons
    .filter((l) => Boolean(l.completedAt))
    .slice(-3)
    .reverse();

  return (
    <div className="space-y-6">
      {/* =====================================================================
          1. GAMIFIED 4-PILLAR UNIT ROADMAP
          ===================================================================== */}
      <div className="overflow-hidden rounded-3xl bg-white p-5 sm:p-6 shadow-sm ring-1 ring-slate-200/70">
        {/* Header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 via-teal-400 to-emerald-500 text-white shadow-xs">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-xs font-black tracking-wider text-slate-800 uppercase">
                Unit {milestoneNum} Progression Pillars
              </h3>
              <p className="text-[11px] font-medium text-slate-400">
                Conquer all 3 Pillars &amp; Bridges to unlock the Milestone {milestoneNum} Boss
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-extrabold text-amber-700 ring-1 ring-amber-200/70">
            <Crown className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
            Milestone {milestoneNum}
          </span>
        </div>

        {/* 4 Vertical Pillars: Pillar I (Sky) -> Pillar II (Emerald) -> Pillar III (Violet) -> Boss (Amber/Fuchsia) */}
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          {unitSpoonNumbers.map((spoonNum, idx) => {
            const palette = PILLAR_PALETTES[idx];
            const matchedLesson = lessons.find(
              (l) => l.orderIndex === spoonNum
            );
            const isSpoonDone = Boolean(matchedLesson?.completedAt);
            const isBridgeDone = Boolean(matchedLesson?.bridge?.completedAt);
            const isFullyDone = isSpoonDone && isBridgeDone;
            const isCurrent = activeOrderIndex === spoonNum && currentFocus.type !== "BOSS";

            const statusLabel = isCurrent
              ? currentFocus.type === "BRIDGE"
                ? "Bridge Ready"
                : "Active Focus"
              : isFullyDone
                ? "Mastered"
                : "Upcoming";

            return (
              <div
                key={spoonNum}
                className={`relative flex flex-col justify-between overflow-hidden rounded-2xl p-3.5 transition-all duration-300 ${
                  isCurrent
                    ? `${palette.cardBgActive} -translate-y-0.5`
                    : palette.cardBgIdle
                }`}
              >
                {/* Top Colored Pillar Accent Strip */}
                <div
                  className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${palette.topBar}`}
                />

                {/* Top Row: Pillar Roman Numeral + Status Icon */}
                <div className="mt-1 flex items-center justify-between">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black tracking-wide uppercase ${palette.pillBg}`}
                  >
                    {palette.stepRoman}
                  </span>

                  {isFullyDone ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xs">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </span>
                  ) : isCurrent ? (
                    <span className="flex h-2.5 w-2.5 animate-ping rounded-full bg-emerald-400" />
                  ) : (
                    <Lock className="h-3.5 w-3.5 text-slate-300" />
                  )}
                </div>

                {/* Center Pillar Badge & Spoon Number */}
                <div className="my-3 flex items-center gap-2.5">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black ${palette.iconBadge}`}
                  >
                    {spoonNum}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900">
                      Spoon {spoonNum}
                    </p>
                    <p
                      className={`truncate text-[11px] font-bold ${
                        isCurrent ? palette.stepText : "text-slate-400"
                      }`}
                    >
                      {statusLabel}
                    </p>
                  </div>
                </div>

                {/* Bottom Dual-Segment Bar: [Spoon Lesson] + [Vocab Bridge] */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[9px] font-extrabold tracking-wider text-slate-400 uppercase">
                    <span>Lesson</span>
                    <span>Bridge</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        isSpoonDone
                          ? palette.barFill
                          : isCurrent && currentFocus.type === "SPOON"
                            ? `${palette.barFill} animate-pulse opacity-60`
                            : "bg-slate-200/80"
                      }`}
                    />
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        isBridgeDone
                          ? "bg-amber-400"
                          : isCurrent && currentFocus.type === "BRIDGE"
                            ? "bg-amber-400 animate-pulse"
                            : "bg-slate-200/80"
                      }`}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* PILLAR 4: MILESTONE BOSS ARENA */}
          <div
            className={`relative flex flex-col justify-between overflow-hidden rounded-2xl p-3.5 transition-all duration-300 ${
              currentFocus.type === "BOSS"
                ? "bg-gradient-to-b from-fuchsia-50 via-amber-50/40 to-white ring-2 ring-fuchsia-500 shadow-md shadow-fuchsia-500/15 -translate-y-0.5"
                : "bg-gradient-to-b from-amber-50/50 via-fuchsia-50/20 to-white ring-1 ring-amber-200/80"
            }`}
          >
            {/* Top Boss Crown Accent Strip */}
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-fuchsia-600" />

            <div className="mt-1 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-100 to-fuchsia-100 px-2 py-0.5 text-[10px] font-black tracking-wide text-fuchsia-800 uppercase">
                <Crown className="h-3 w-3 text-amber-500" />
                Finale
              </span>

              {currentFocus.type === "BOSS" ? (
                <Sparkles className="h-4 w-4 animate-spin text-amber-500" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-amber-400/70" />
              )}
            </div>

            <div className="my-3 flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-fuchsia-600 text-white shadow-sm shadow-fuchsia-500/30">
                <Swords className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-black text-slate-900">
                  Boss Stage {milestoneNum}
                </p>
                <p className="truncate text-[11px] font-bold text-fuchsia-600">
                  {currentFocus.type === "BOSS"
                    ? "Arena Open!"
                    : "+1 ⚡ Crown"}
                </p>
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-[9px] font-extrabold tracking-wider text-amber-600/80 uppercase">
                <span>15 Challenges</span>
                <span>3 ❤️</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-amber-100">
                <div
                  className={`h-full rounded-full bg-gradient-to-r from-amber-400 to-fuchsia-500 ${
                    currentFocus.type === "BOSS" ? "w-full animate-pulse" : "w-1/4"
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Up Next Locked Preview Row */}
        {nextLocked && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <UpNextCompactTile
              type={nextLocked.type}
              lesson={nextLocked.data}
              displayTitles={displayTitles}
            />
          </div>
        )}
      </div>

      {/* =====================================================================
          2. RECENTLY MASTERED • QUICK REPLAY PILLARS
          ===================================================================== */}
      {recentCompleted.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <h3 className="text-xs font-extrabold tracking-wider text-slate-600 uppercase">
                Recently Mastered • Quick Replay
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              Tap any past lesson to review audio
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            {recentCompleted.map((lesson, idx) => {
              const lessonTitle =
                displayTitles?.get(lesson.id) ||
                lesson.title ||
                `Spoon ${lesson.orderIndex}`;

              const accentBars = [
                "from-emerald-400 to-teal-500",
                "from-sky-400 to-indigo-500",
                "from-violet-400 to-fuchsia-500",
              ];
              const topAccent = accentBars[idx % accentBars.length];

              return (
                <Link
                  key={lesson.id}
                  href={resolveLessonHref(lesson.id)}
                  className="group relative flex items-center gap-3.5 overflow-hidden rounded-2xl bg-white p-3.5 shadow-xs ring-1 ring-slate-200/70 transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-sky-300"
                >
                  {/* Top Accent Line */}
                  <div
                    className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${topAccent}`}
                  />

                  <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-900 shadow-2xs">
                    {lesson.imageUrl ? (
                      <img
                        src={lesson.imageUrl}
                        alt={lesson.title ?? "Lesson Image"}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : null}
                    <div className="absolute top-1 left-1 rounded-md bg-emerald-500/95 px-1.5 py-0.5 text-[9px] font-black text-white shadow-2xs">
                      #{lesson.orderIndex}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-black text-slate-800 group-hover:text-sky-600 transition-colors">
                      {lessonTitle}
                    </p>
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-extrabold text-slate-600 group-hover:bg-sky-50 group-hover:text-sky-600 transition-colors">
                      <Play className="h-2.5 w-2.5 fill-current" />
                      Replay Audio
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function UpNextCompactTile({
  type,
  lesson,
  displayTitles,
}: {
  type: "SPOON" | "BRIDGE" | "BOSS";
  lesson: Lesson;
  displayTitles?: Map<string, string>;
}) {
  const theme = LOCKED_THEMES[type];

  const formattedTitle = displayTitles?.get(lesson.id) || lesson.title;

  const title =
    type === "SPOON"
      ? formattedTitle || `Spoon ${lesson.orderIndex}`
      : type === "BRIDGE"
        ? formattedTitle
          ? `Vocab Bridge: ${formattedTitle}`
          : `Vocab Checkpoint ${lesson.orderIndex}`
        : lesson.bossStage?.scenarioData?.boss?.name ||
          `Milestone ${Math.ceil(lesson.orderIndex / 3)} Boss`;

  const badge =
    type === "SPOON"
      ? `Spoon ${lesson.orderIndex}`
      : type === "BRIDGE"
        ? `Vocab Bridge ${lesson.orderIndex}`
        : `Boss Stage`;

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-amber-50/60 via-sky-50/40 to-indigo-50/40 px-4 py-3 ring-1 ring-amber-200/60">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-xs ${theme.iconBg}`}
        >
          {theme.icon}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
              Up Next
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${theme.badge}`}
            >
              {badge}
            </span>
          </div>
          <h4 className="mt-0.5 truncate text-sm font-extrabold text-slate-800">
            {title}
          </h4>
        </div>
      </div>

      <span className="hidden sm:inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[11px] font-extrabold text-slate-600 shadow-2xs ring-1 ring-slate-200/70">
        <Lock className="h-3 w-3 text-amber-500" />
        Unlocks Next
        <ArrowRight className="h-3 w-3 text-slate-400" />
      </span>
    </div>
  );
}