// learning-mini-path-cards.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Lock,
  ArrowRight,
  Check,
  Swords,
  Zap,
  Headphones,
  RotateCcw,
  Sparkles,
  Crown,
  Wand2,
  Flame,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { LearningPath } from "@/app/actions/get-learning-path";

type FocusState = LearningPath["currentFocus"];
type Lesson = LearningPath["lessons"][number];

const HARD_MODE_UNLOCK_SPOON = 30;

// Unified 3-Color System:
// - SPOON  = Primary Blue
// - BRIDGE = Accent Amber
// - BOSS   = Tertiary Purple
const NODE_3D_STYLES = {
  SPOON: {
    active:
      "bg-gradient-to-b from-sky-400 to-blue-600 border-b-[6px] border-blue-800 text-white shadow-[0_10px_20px_rgba(37,99,235,0.38),inset_0_2px_0_rgba(255,255,255,0.45)]",
    done: "bg-gradient-to-b from-sky-400 to-blue-600 border-b-[6px] border-blue-800 text-white shadow-[0_6px_14px_rgba(37,99,235,0.25),inset_0_2px_0_rgba(255,255,255,0.4)]",
    locked:
      "bg-gradient-to-b from-sky-100 to-blue-200/90 border-b-[6px] border-blue-300 text-blue-700 shadow-[inset_0_2px_0_rgba(255,255,255,0.75)]",
    pedestalActive: "bg-blue-400/70",
    pedestalDone: "bg-blue-300/60",
    pedestalLocked: "bg-blue-100",
    labelColor: "text-blue-700",
  },
  BRIDGE: {
    active:
      "bg-gradient-to-b from-amber-300 to-orange-500 border-b-[5px] border-orange-700 text-slate-950 shadow-[0_10px_20px_rgba(245,158,11,0.42),inset_0_2px_0_rgba(255,255,255,0.6)]",
    done: "bg-gradient-to-b from-amber-400 to-orange-500 border-b-[5px] border-orange-700 text-white shadow-[0_6px_14px_rgba(245,158,11,0.28),inset_0_2px_0_rgba(255,255,255,0.45)]",
    locked:
      "bg-gradient-to-b from-amber-100 to-amber-200/90 border-b-[5px] border-amber-300 text-amber-700 shadow-[inset_0_2px_0_rgba(255,255,255,0.75)]",
    pedestalActive: "bg-amber-400/70",
    pedestalDone: "bg-amber-300/60",
    pedestalLocked: "bg-amber-100",
    labelColor: "text-amber-700",
  },
  BOSS: {
    active:
      "bg-gradient-to-b from-violet-500 via-purple-600 to-fuchsia-600 border-b-[7px] border-purple-950 text-white shadow-[0_12px_24px_rgba(147,51,234,0.45),inset_0_2px_0_rgba(255,255,255,0.45)]",
    done: "bg-gradient-to-b from-violet-500 to-purple-700 border-b-[7px] border-purple-950 text-white shadow-[0_6px_14px_rgba(147,51,234,0.3)]",
    locked:
      "bg-gradient-to-b from-violet-100 via-purple-100 to-fuchsia-100 border-b-[7px] border-purple-300 text-purple-700 shadow-[inset_0_2px_0_rgba(255,255,255,0.75)]",
    pedestalActive: "bg-purple-400/70",
    pedestalDone: "bg-purple-300/60",
    pedestalLocked: "bg-purple-100",
    labelColor: "text-purple-700",
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

  const resolveBossHref = (bossId: string, lessonId: string) =>
    getBossHref
      ? getBossHref(bossId, lessonId)
      : `/foundation/boss/${bossId}`;

  const activeOrderIndex = currentFocus.data.orderIndex ?? 1;
  const milestoneNum = Math.ceil(activeOrderIndex / 3);
  const unitStartOrder = (milestoneNum - 1) * 3 + 1;
  const unitSpoonNumbers = [
    unitStartOrder,
    unitStartOrder + 1,
    unitStartOrder + 2,
  ];

  const completedSpoonsCount = lessons.filter((l) =>
    Boolean(l.completedAt)
  ).length;
  const hardModeUnlocked = completedSpoonsCount >= HARD_MODE_UNLOCK_SPOON;
  const hardModePct = Math.min(
    100,
    Math.round((completedSpoonsCount / HARD_MODE_UNLOCK_SPOON) * 100)
  );

  type MapNode = {
    id: string;
    kind: "SPOON" | "BRIDGE" | "BOSS";
    label: string;
    subLabel: string;
    isDone: boolean;
    isCurrent: boolean;
    href?: string;
    yOffsetClass: string;
  };

  const mapNodes: MapNode[] = [];
  const waveOffsets = [
    "translate-y-0",
    "-translate-y-2",
    "translate-y-1",
    "-translate-y-2.5",
    "translate-y-0",
    "-translate-y-1.5",
    "-translate-y-1",
  ];

  unitSpoonNumbers.forEach((spoonNum, idx) => {
    const matched = lessons.find((l) => l.orderIndex === spoonNum);
    const spoonDone = Boolean(matched?.completedAt);
    const bridgeDone = Boolean(matched?.bridge?.completedAt);

    const isSpoonCurrent =
      currentFocus.type === "SPOON" && activeOrderIndex === spoonNum;
    const isBridgeCurrent =
      currentFocus.type === "BRIDGE" && activeOrderIndex === spoonNum;

    // 1. Spoon Node (Always Primary Blue)
    mapNodes.push({
      id: `spoon-${spoonNum}`,
      kind: "SPOON",
      label: `${spoonNum}`,
      subLabel: `Spoon ${spoonNum}`,
      isDone: spoonDone,
      isCurrent: isSpoonCurrent,
      href:
        (spoonDone || isSpoonCurrent) && matched
          ? resolveLessonHref(matched.id)
          : undefined,
      yOffsetClass: waveOffsets[idx * 2],
    });

    // 2. Bridge Node (Always Accent Amber)
    mapNodes.push({
      id: `bridge-${spoonNum}`,
      kind: "BRIDGE",
      label: "⚡",
      subLabel: `Bridge ${spoonNum}`,
      isDone: bridgeDone,
      isCurrent: isBridgeCurrent,
      href:
        (bridgeDone || isBridgeCurrent) && matched?.bridge
          ? `/foundation/vocab/${matched.bridge.id}`
          : undefined,
      yOffsetClass: waveOffsets[idx * 2 + 1],
    });
  });

  // 3. Finale Boss Node (Always Tertiary Purple)
  const isBossCurrent = currentFocus.type === "BOSS";
  const bossLesson = lessons.find(
    (l) => l.orderIndex === unitSpoonNumbers[2]
  );
  mapNodes.push({
    id: `boss-${milestoneNum}`,
    kind: "BOSS",
    label: `B${milestoneNum}`,
    subLabel: `Boss ${milestoneNum}`,
    isDone: Boolean(bossLesson?.bossStage?.passed),
    isCurrent: isBossCurrent,
    href:
      isBossCurrent && currentFocus.data.bossStage
        ? resolveBossHref(
            currentFocus.data.bossStage.id,
            currentFocus.data.id
          )
        : undefined,
    yOffsetClass: waveOffsets[6],
  });

  const currentIdx = Math.max(
    0,
    mapNodes.findIndex((n) => n.isCurrent)
  );
  const trackProgressPct = Math.round(
    (currentIdx / (mapNodes.length - 1)) * 100
  );

  return (
    <div className="overflow-hidden rounded-[2rem] bg-white p-6 sm:p-7 shadow-sm ring-1 ring-slate-200/70 space-y-6">
      {/* =====================================================================
          1. TOP HEADER + COLOR LEGEND + HARD MODE UNLOCK PILL
          ===================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-xs font-black tracking-wider text-slate-900 uppercase">
                Unit {milestoneNum} Adventure Map
              </h3>
              {/* Mini Color Legend */}
              <div className="hidden sm:flex items-center gap-2.5 text-[10px] font-extrabold">
                <span className="inline-flex items-center gap-1 text-blue-600">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Spoon
                </span>
                <span className="inline-flex items-center gap-1 text-amber-600">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  Vocab
                </span>
                <span className="inline-flex items-center gap-1 text-purple-600">
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                  Boss
                </span>
              </div>
            </div>
            <p className="text-[11px] font-semibold text-slate-400">
              Complete each blue Spoon &amp; amber Vocab Bridge to unlock Boss{" "}
              {milestoneNum}
            </p>
          </div>
        </div>

        {/* Hard Mode Unlock Progress Pill (Spoon 30 Goal) */}
        <div
          className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-black ring-1 transition ${
            hardModeUnlocked
              ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white ring-purple-400 shadow-sm"
              : "bg-slate-50 text-slate-600 ring-slate-200/80"
          }`}
          title="Unlock Hard Mode Gauntlet at Spoon 30!"
        >
          <Flame
            className={`h-3.5 w-3.5 ${
              hardModeUnlocked
                ? "fill-amber-300 text-amber-300"
                : "fill-amber-400 text-amber-500"
            }`}
          />
          <span>
            {hardModeUnlocked
              ? "Hard Mode Unlocked!"
              : `Hard Mode: ${completedSpoonsCount}/${HARD_MODE_UNLOCK_SPOON} Spoons`}
          </span>
          {!hardModeUnlocked && (
            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-amber-400 to-purple-600"
                style={{ width: `${hardModePct}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          2. CANDY-CRUSH 3D STEPPING-STONE VISUAL MAP
          ===================================================================== */}
      <div className="relative rounded-3xl bg-gradient-to-b from-slate-50/90 via-sky-50/25 to-purple-50/20 px-4 pt-10 pb-7 ring-1 ring-slate-100 overflow-x-auto">
        {/* Background connecting path track */}
        <div className="pointer-events-none absolute top-[48%] right-12 left-12 h-2.5 -translate-y-1/2 rounded-full bg-slate-200/80 shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-amber-400 to-purple-500 transition-all duration-700"
            style={{ width: `${trackProgressPct}%` }}
          />
        </div>

        {/* 7 Stepping-Stone 3D Buttons */}
        <div className="relative z-10 flex min-w-[540px] items-center justify-between px-2">
          {mapNodes.map((node) => {
            const styles = NODE_3D_STYLES[node.kind];
            const buttonStyle = node.isCurrent
              ? styles.active
              : node.isDone
                ? styles.done
                : styles.locked;

            const pedestalColor = node.isCurrent
              ? styles.pedestalActive
              : node.isDone
                ? styles.pedestalDone
                : styles.pedestalLocked;

            const isBridge = node.kind === "BRIDGE";
            const isBoss = node.kind === "BOSS";

            const sizeClasses = isBoss
              ? "h-16 w-16 rounded-[1.4rem] text-base"
              : isBridge
                ? "h-11 w-11 rounded-2xl text-sm"
                : "h-14 w-14 rounded-[1.25rem] text-lg";

            const innerNodeContent = (
              <>
                {/* Glow Halo behind active button */}
                {node.isCurrent && (
                  <span
                    className={`pointer-events-none absolute -inset-2 animate-pulse rounded-3xl blur-md ${
                      isBoss
                        ? "bg-purple-400/30"
                        : isBridge
                          ? "bg-amber-400/35"
                          : "bg-blue-400/30"
                    }`}
                  />
                )}

                {/* 3D Tactile Candy-Crush Pillar Button */}
                <div
                  className={`relative z-10 flex items-center justify-center font-black transition-all duration-150 ${sizeClasses} ${buttonStyle} ${
                    node.href
                      ? "group-hover:-translate-y-1 group-active:translate-y-1 group-active:border-b-2"
                      : ""
                  }`}
                >
                  {isBoss ? (
                    <div className="flex flex-col items-center leading-none">
                      <Crown className="mb-0.5 h-4 w-4 fill-amber-300 text-amber-300" />
                      <Swords className="h-5 w-5" />
                    </div>
                  ) : isBridge ? (
                    <Zap className="h-5 w-5 fill-current" />
                  ) : (
                    <span>{node.label}</span>
                  )}

                  {/* Corner Badge: Green Check if Completed, Lock if Upcoming */}
                  {node.isDone ? (
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs ring-2 ring-white">
                      <Check className="h-3 w-3 stroke-[3.5]" />
                    </span>
                  ) : !node.isCurrent ? (
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-400 shadow-xs ring-1 ring-slate-200">
                      <Lock className="h-2.5 w-2.5" />
                    </span>
                  ) : null}
                </div>

                {/* 3D Ground Pedestal Base Shadow */}
                <div
                  className={`mt-1.5 rounded-full transition-all ${
                    isBoss
                      ? "h-2.5 w-14"
                      : isBridge
                        ? "h-2 w-9"
                        : "h-2.5 w-12"
                  } ${pedestalColor}`}
                />

                {/* Node Label Below Pedestal */}
                <span
                  className={`mt-1.5 text-[10px] font-extrabold tracking-tight ${
                    node.isCurrent
                      ? "font-black text-slate-900"
                      : styles.labelColor
                  }`}
                >
                  {node.subLabel}
                </span>
              </>
            );

            return (
              <div
                key={node.id}
                className={`flex flex-col items-center ${node.yOffsetClass} transition-transform duration-300`}
              >
                {/* Floating "ACTIVE" Pointer above the current pillar */}
                {node.isCurrent && (
                  <div className="-mt-7 mb-1.5 animate-bounce rounded-full bg-slate-900 px-2.5 py-0.5 text-[9px] font-black tracking-wider text-amber-300 uppercase shadow-md">
                    Active
                  </div>
                )}

                {node.href ? (
                  <Link
                    href={node.href}
                    className="group relative flex cursor-pointer flex-col items-center focus:outline-none"
                  >
                    {innerNodeContent}
                  </Link>
                ) : (
                  <div className="group relative flex cursor-default flex-col items-center">
                    {innerNodeContent}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          3. WIDE MILESTONE & "UP NEXT" BANNER (Color-Matched to Type!)
          ===================================================================== */}
      {nextLocked && (
        <UpNextWideBanner
          type={nextLocked.type}
          lesson={nextLocked.data}
          milestoneNum={milestoneNum}
          displayTitles={displayTitles}
        />
      )}
    </div>
  );
}

function UpNextWideBanner({
  type,
  lesson,
  milestoneNum,
  displayTitles,
}: {
  type: "SPOON" | "BRIDGE" | "BOSS";
  lesson: Lesson;
  milestoneNum: number;
  displayTitles?: Map<string, string>;
}) {
  const formattedTitle = displayTitles?.get(lesson.id) || lesson.title;

  const title =
    type === "SPOON"
      ? formattedTitle || `Spoon ${lesson.orderIndex}`
      : type === "BRIDGE"
        ? formattedTitle
          ? `Vocab Bridge: ${formattedTitle}`
          : `Vocab Checkpoint ${lesson.orderIndex}`
        : lesson.bossStage?.scenarioData?.boss?.name ||
          `Milestone ${milestoneNum} Boss Arena`;

  const badge =
    type === "SPOON"
      ? `Spoon ${lesson.orderIndex}`
      : type === "BRIDGE"
        ? `Vocab Bridge ${lesson.orderIndex}`
        : `Boss ${milestoneNum}`;

  // Color-match the Up Next Banner to the exact category color:
  // BRIDGE = Amber, SPOON = Blue, BOSS = Purple
  const bannerStyles =
    type === "BRIDGE"
      ? {
          container: "bg-amber-50/75 ring-amber-200/80",
          iconBox:
            "border-b-4 border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950",
          label: "text-amber-700",
          badge: "bg-amber-100 text-amber-900",
          lockIcon: "text-amber-500",
        }
      : type === "BOSS"
        ? {
            container: "bg-purple-50/75 ring-purple-200/80",
            iconBox:
              "border-b-4 border-purple-900 bg-gradient-to-b from-violet-500 to-purple-700 text-white",
            label: "text-purple-700",
            badge: "bg-purple-100 text-purple-900",
            lockIcon: "text-purple-500",
          }
        : {
            container: "bg-sky-50/75 ring-sky-200/80",
            iconBox:
              "border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white",
            label: "text-blue-700",
            badge: "bg-sky-100 text-blue-900",
            lockIcon: "text-blue-500",
          };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-4 sm:px-5 ring-1 ${bannerStyles.container}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          {/* 3D Mini Icon Button */}
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm ${bannerStyles.iconBox}`}
          >
            {type === "BRIDGE" ? (
              <Zap className="h-5 w-5 fill-current" />
            ) : type === "BOSS" ? (
              <Swords className="h-5 w-5" />
            ) : (
              <Headphones className="h-5 w-5" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-[10px] font-black tracking-wider uppercase ${bannerStyles.label}`}
              >
                Next on Map
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${bannerStyles.badge}`}
              >
                {badge}
              </span>
            </div>
            <h4 className="mt-0.5 truncate text-sm font-black text-slate-900 sm:text-base">
              {title}
            </h4>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-extrabold text-slate-600 shadow-xs ring-1 ring-slate-200/80">
            <Lock className={`h-3.5 w-3.5 ${bannerStyles.lockIcon}`} />
            <span>Unlocks Next</span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
          </span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   SLIM PAST SPOONS & VOCAB LIST (Placed under WordMatrixCard in Right Column!)
   - All Spoon # Badges = Primary Blue (matches Spoon nodes on map!)
   - All Vocab Words   = Accent Amber pills (matches Bridge nodes on map!)
   - Magic Wand Button = Tertiary Purple
   ============================================================================ */
export function PastSpoonsVocabSlimList({
  courseId,
  lessons = [],
  getLessonHref,
  displayTitles,
  onLaunchSpriteExercise,
}: {
  courseId: string;
  lessons: Lesson[];
  getLessonHref?: (lessonId: string) => string;
  displayTitles?: Map<string, string>;
  onLaunchSpriteExercise?: (lesson: Lesson) => void;
}) {
  const PAGE_SIZE = 3;
  const [page, setPage] = useState(0);

  const allCompleted = lessons
    .filter((l) => Boolean(l.completedAt))
    .slice()
    .reverse();

  if (allCompleted.length === 0) return null;

  const totalPages = Math.max(1, Math.ceil(allCompleted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const visibleLessons = allCompleted.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE
  );

  const resolveLessonHref = (lessonId: string) =>
    getLessonHref
      ? getLessonHref(lessonId)
      : `/foundation/${lessonId}/${courseId}`;

  return (
    <div className="flex flex-1 flex-col justify-between overflow-hidden rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      {/* Header + Prev / Next Cycle Controls */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-100 text-blue-600">
            <Headphones className="h-3.5 w-3.5" />
          </span>
          <h3 className="text-xs font-black tracking-wider text-slate-800 uppercase">
            Past Spoons &amp; Vocab
          </h3>
        </div>

        {/* Cycle Controls */}
        <div className="flex items-center gap-1.5">
          <span className="mr-1 text-[10px] font-bold text-slate-400">
            {safePage + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            title="Newer Spoons"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            title="Older Spoons"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 3-Item List (Sits Flush with Left Column!) */}
      <div className="my-auto divide-y divide-slate-100">
        {visibleLessons.map((lesson) => {
          const title =
            displayTitles?.get(lesson.id) ||
            lesson.title ||
            `Spoon ${lesson.orderIndex}`;

          const vocabItems =
            (lesson.bridge?.vocabMoment as Array<{
              word: string;
              gloss?: string;
            }>) ?? [];

          return (
            <div
              key={lesson.id}
              className="flex items-center justify-between gap-3 py-2.5 first:pt-1 last:pb-1"
            >
              {/* Left: Primary Blue 3D Spoon Pill + Title + Accent Amber Vocab Tags */}
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-b-[3px] border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-xs font-black text-white shadow-2xs">
                  #{lesson.orderIndex}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black text-slate-800">
                    {title}
                  </p>
                  {vocabItems.length > 0 ? (
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {vocabItems.slice(0, 3).map((v, vIdx) => (
                        <span
                          key={vIdx}
                          className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.2 text-[10px] font-bold text-amber-800 ring-1 ring-amber-200/80"
                        >
                          <Zap className="h-2.5 w-2.5 fill-amber-400 text-amber-500" />
                          {v.word}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] font-medium text-slate-400">
                      Completed Spoon
                    </p>
                  )}
                </div>
              </div>

              {/* Right: [Retry] + [Magic Wand / ⚡ Charge Sprite Exercise] */}
              <div className="flex shrink-0 items-center gap-1.5">
                <Link
                  href={resolveLessonHref(lesson.id)}
                  className="inline-flex items-center gap-1 rounded-xl bg-sky-50 px-2.5 py-1.5 text-[11px] font-extrabold text-blue-700 ring-1 ring-sky-200/80 transition hover:bg-sky-100"
                  title="Replay this Spoon"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Retry</span>
                </Link>

                <button
                  type="button"
                  onClick={() => onLaunchSpriteExercise?.(lesson)}
                  className="inline-flex items-center gap-1 rounded-xl border-b-2 border-purple-900 bg-gradient-to-b from-violet-500 to-purple-700 px-2.5 py-1.5 text-[11px] font-black text-white shadow-2xs transition hover:brightness-110 active:translate-y-0.5 active:border-b-0"
                  title="Spend 1 ⚡ Charge to launch a custom Sprite Exercise with this Spoon's vocab!"
                >
                  <Wand2 className="h-3 w-3" />
                  <Zap className="h-2.5 w-2.5 fill-amber-300 text-amber-300" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}