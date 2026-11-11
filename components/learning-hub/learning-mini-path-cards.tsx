// components/learning-hub/learning-mini-path-cards.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Lock,
  ArrowRight,
  Check,
  Swords,
  Zap,
  Headphones,
  Sparkles,
  Crown,
  Flame,
  Shield,
  Loader2,
} from "lucide-react";
import type { LearningPath } from "@/app/actions/get-learning-path";
import { activateHardModeTrack } from "@/lib/foundation/advance-build-chain";
import { useSprite } from "@/context/sprite-context";

type FocusState = LearningPath["currentFocus"];
type Lesson = LearningPath["lessons"][number];

const HARD_MODE_UNLOCK_SPOON = 30;
const HARD_MODE_SPOON_OFFSET = 900; // Hard Spoon 1 = orderIndex 901

const STANDARD_NODE_3D_STYLES = {
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
    halo: "bg-blue-400/30",
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
    halo: "bg-amber-400/35",
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
    halo: "bg-purple-400/30",
  },
} as const;

const HARD_NODE_3D_STYLES = {
  SPOON: {
    active:
      "bg-gradient-to-b from-rose-500 via-red-600 to-rose-700 border-b-[6px] border-rose-950 text-white shadow-[0_10px_24px_rgba(244,63,94,0.48),inset_0_2px_0_rgba(255,255,255,0.4)]",
    done: "bg-gradient-to-b from-rose-500 to-red-700 border-b-[6px] border-rose-950 text-white shadow-[0_6px_14px_rgba(244,63,94,0.3)]",
    locked:
      "bg-slate-900/90 border-2 border-rose-500/30 border-b-[6px] border-b-rose-950 text-rose-300/70",
    pedestalActive: "bg-rose-500/60",
    pedestalDone: "bg-rose-500/40",
    pedestalLocked: "bg-slate-800",
    labelColor: "text-rose-300",
    halo: "bg-rose-500/40",
  },
  BRIDGE: {
    active:
      "bg-gradient-to-b from-fuchsia-400 to-pink-600 border-b-[5px] border-pink-950 text-white shadow-[0_10px_22px_rgba(217,70,239,0.45),inset_0_2px_0_rgba(255,255,255,0.45)]",
    done: "bg-gradient-to-b from-fuchsia-500 to-pink-700 border-b-[5px] border-pink-950 text-white shadow-[0_6px_14px_rgba(217,70,239,0.3)]",
    locked:
      "bg-slate-900/90 border-2 border-fuchsia-500/30 border-b-[5px] border-b-fuchsia-950 text-fuchsia-300/70",
    pedestalActive: "bg-fuchsia-500/60",
    pedestalDone: "bg-fuchsia-500/40",
    pedestalLocked: "bg-slate-800",
    labelColor: "text-fuchsia-300",
    halo: "bg-fuchsia-500/40",
  },
  BOSS: {
    active:
      "bg-gradient-to-b from-amber-300 via-orange-500 to-red-600 border-b-[7px] border-red-950 text-slate-950 shadow-[0_12px_28px_rgba(245,158,11,0.5),inset_0_2px_0_rgba(255,255,255,0.65)]",
    done: "bg-gradient-to-b from-amber-400 to-orange-600 border-b-[7px] border-red-950 text-slate-950 shadow-[0_6px_16px_rgba(245,158,11,0.35)]",
    locked:
      "bg-slate-900/90 border-2 border-amber-500/35 border-b-[7px] border-b-amber-950 text-amber-300/80",
    pedestalActive: "bg-amber-400/70",
    pedestalDone: "bg-amber-400/40",
    pedestalLocked: "bg-slate-800",
    labelColor: "text-amber-300",
    halo: "bg-amber-400/40",
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
  const router = useRouter();
  const { openChat, spriteName, setLiveTask } = useSprite();

  const standardLessons = lessons.filter(
    (l) => l.orderIndex <= HARD_MODE_SPOON_OFFSET,
  );
  const hardLessons = lessons.filter(
    (l) => l.orderIndex > HARD_MODE_SPOON_OFFSET,
  );

  const completedStandardSpoonsCount = standardLessons.filter((l) =>
    Boolean(l.completedAt),
  ).length;
  const hardModeUnlocked =
    completedStandardSpoonsCount >= HARD_MODE_UNLOCK_SPOON;
  const hasHardModeLessons = hardLessons.length > 0;

  const [viewTrack, setViewTrack] = useState<"STANDARD" | "HARD">("STANDARD");
  const [isActivatingHardMode, setIsActivatingHardMode] = useState(false);

  if (!currentFocus) return null;

  const isHardView = viewTrack === "HARD" && hardModeUnlocked;
  const nodeStyles = isHardView ? HARD_NODE_3D_STYLES : STANDARD_NODE_3D_STYLES;

  const resolveLessonHref = (lessonId: string) =>
    getLessonHref
      ? getLessonHref(lessonId)
      : `/foundation/${lessonId}/${courseId}`;

  const resolveBossHref = (bossId: string, lessonId: string) =>
    getBossHref
      ? getBossHref(bossId, lessonId)
      : `/foundation/boss/${bossId}`;

  // Compute Focus & Active Order Index per Track (Standard vs Hard Mode)
  let trackActiveOrderIndex = currentFocus.data.orderIndex ?? 1;
  let trackFocusType: "SPOON" | "BRIDGE" | "BOSS" = currentFocus.type;

  if (isHardView) {
    // Find current active step on the Hard Mode track (starts at 901 = Hard Spoon 1)
    let foundHardFocus = false;
    for (const hl of hardLessons) {
      if (!hl.completedAt) {
        trackActiveOrderIndex = hl.orderIndex;
        trackFocusType = "SPOON";
        foundHardFocus = true;
        break;
      }
      if (!hl.bridge || !hl.bridge.passed) {
        trackActiveOrderIndex = hl.orderIndex;
        trackFocusType = "BRIDGE";
        foundHardFocus = true;
        break;
      }
      if (hl.orderIndex % 3 === 0 && (!hl.bossStage || !hl.bossStage.passed)) {
        trackActiveOrderIndex = hl.orderIndex;
        trackFocusType = "BOSS";
        foundHardFocus = true;
        break;
      }
    }
    if (!foundHardFocus) {
      trackActiveOrderIndex =
        hardLessons.length > 0
          ? hardLessons[hardLessons.length - 1].orderIndex
          : HARD_MODE_SPOON_OFFSET + 1;
      trackFocusType = "SPOON";
    }
  } else if (trackActiveOrderIndex > HARD_MODE_SPOON_OFFSET) {
    // If currentFocus is in Hard Mode but user is viewing Standard Track
    const firstIncompleteStd =
      standardLessons.find(
        (l) =>
          !l.completedAt ||
          !l.bridge?.passed ||
          (l.orderIndex % 3 === 0 && !l.bossStage?.passed),
      ) ?? standardLessons[standardLessons.length - 1];
    trackActiveOrderIndex = firstIncompleteStd?.orderIndex ?? 1;
  }

  const rawMilestoneNum = Math.ceil(trackActiveOrderIndex / 3);
  const displayUnitNum = isHardView
    ? Math.max(1, rawMilestoneNum - HARD_MODE_SPOON_OFFSET / 3)
    : rawMilestoneNum;

  const unitStartOrder = (rawMilestoneNum - 1) * 3 + 1;
  const unitSpoonNumbers = [
    unitStartOrder,
    unitStartOrder + 1,
    unitStartOrder + 2,
  ];

  const hardModePct = Math.min(
    100,
    Math.round((completedStandardSpoonsCount / HARD_MODE_UNLOCK_SPOON) * 100),
  );

  const handleActivateHardMode = async () => {
    if (isActivatingHardMode) return;
    setIsActivatingHardMode(true);

    setLiveTask({
      taskId: `hard-mode-init-${Date.now()}`,
      taskType: "SPOON_GENERATION",
      status: "BUILDING",
      label: "Hard Mode Spoon 1 (Part IV)",
      updatedAt: new Date().toISOString(),
    });

    openChat({
      tab: "session",
      prompt: `I just activated Hard Mode! Tell me how Hard Mode Parts IV, V, and VI work while you set up my Hard Spoon 1.`,
    });

    const res = await activateHardModeTrack(courseId);
    setIsActivatingHardMode(false);

    if (res.ok) {
      router.refresh();
    }
  };

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

  unitSpoonNumbers.forEach((dbSpoonNum, idx) => {
    const matched = lessons.find((l) => l.orderIndex === dbSpoonNum);
    const spoonDone = Boolean(matched?.completedAt);
    const bridgeDone = Boolean(
      matched?.bridge?.passed || matched?.bridge?.completedAt,
    );

    const isSpoonCurrent =
      hasHardModeLessons || !isHardView
        ? trackFocusType === "SPOON" && trackActiveOrderIndex === dbSpoonNum
        : idx === 0;
    const isBridgeCurrent =
      trackFocusType === "BRIDGE" && trackActiveOrderIndex === dbSpoonNum;

    const displaySpoonNum = isHardView
      ? dbSpoonNum - HARD_MODE_SPOON_OFFSET
      : dbSpoonNum;

    mapNodes.push({
      id: `spoon-${dbSpoonNum}`,
      kind: "SPOON",
      label: `${displaySpoonNum}`,
      subLabel: isHardView
        ? `Hard Spoon ${displaySpoonNum}`
        : `Spoon ${displaySpoonNum}`,
      isDone: spoonDone,
      isCurrent: isSpoonCurrent,
      href:
        (spoonDone || isSpoonCurrent) && matched
          ? resolveLessonHref(matched.id)
          : undefined,
      yOffsetClass: waveOffsets[idx * 2],
    });

    mapNodes.push({
      id: `bridge-${dbSpoonNum}`,
      kind: "BRIDGE",
      label: "⚡",
      subLabel: isHardView
        ? `Hard Bridge ${displaySpoonNum}`
        : `Bridge ${displaySpoonNum}`,
      isDone: bridgeDone,
      isCurrent: isBridgeCurrent,
      href:
        (bridgeDone || isBridgeCurrent) && matched?.bridge
          ? `/foundation/vocab/${matched.bridge.id}`
          : undefined,
      yOffsetClass: waveOffsets[idx * 2 + 1],
    });
  });

  const isBossCurrent =
    trackFocusType === "BOSS" &&
    Math.ceil(trackActiveOrderIndex / 3) === rawMilestoneNum;
  const bossLesson = lessons.find((l) => l.orderIndex === unitSpoonNumbers[2]);
  const isBossFreestyleUnlocked =
    (bossLesson?.bossStage as any)?.freestyleUnlocked ?? true;

  mapNodes.push({
    id: `boss-${rawMilestoneNum}`,
    kind: "BOSS",
    label: `B${displayUnitNum}`,
    subLabel: isHardView
      ? `Hard Boss ${displayUnitNum}`
      : `Boss ${displayUnitNum}`,
    isDone: Boolean(bossLesson?.bossStage?.passed),
    isCurrent: isBossCurrent,
    href:
      isBossCurrent && bossLesson?.bossStage
        ? isBossFreestyleUnlocked
          ? resolveBossHref(bossLesson.bossStage.id, bossLesson.id)
          : "/conversation"
        : undefined,
    yOffsetClass: waveOffsets[6],
  });

  const currentIdx = Math.max(
    0,
    mapNodes.findIndex((n) => n.isCurrent),
  );
  const trackProgressPct = Math.round(
    (currentIdx / (mapNodes.length - 1)) * 100,
  );

  // Standard Mode Up Next vs Hard Mode Unit 1 Up Next
  const mirroredStandardUnit1Lesson = standardLessons.find(
    (l) => l.orderIndex === (displayUnitNum - 1) * 3 + 1,
  );

  return (
    <div
      className={`space-y-6 overflow-hidden rounded-[2rem] p-6 shadow-sm transition-all duration-500 sm:p-7 ${
        isHardView
          ? "bg-slate-950 text-white ring-2 ring-rose-500/40 shadow-2xl shadow-rose-950/30"
          : "bg-white text-slate-900 ring-1 ring-slate-200/70"
      }`}
    >
      {/* =====================================================================
          1. SINGLE-ROW TOP HEADER + TRACK FLIPPER
          ===================================================================== */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm ${
              isHardView
                ? "border-b-2 border-rose-900 bg-gradient-to-b from-rose-500 to-red-700"
                : "bg-gradient-to-b from-sky-400 to-blue-600"
            }`}
          >
            {isHardView ? (
              <Flame className="h-4 w-4 fill-amber-300 text-amber-300" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h3
                className={`text-xs font-black tracking-wider uppercase ${
                  isHardView ? "text-rose-200" : "text-slate-900"
                }`}
              >
                {isHardView
                  ? `🔥 Hard Mode · Unit ${displayUnitNum} (Parts IV–VI)`
                  : `Unit ${displayUnitNum} Adventure Map`}
              </h3>

              <div className="hidden items-center gap-2 text-[10px] font-extrabold md:flex">
                <span
                  className={`inline-flex items-center gap-1 ${
                    isHardView ? "text-rose-400" : "text-blue-600"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isHardView ? "bg-rose-500" : "bg-blue-500"
                    }`}
                  />
                  {isHardView ? "Hard Spoon" : "Spoon"}
                </span>
                <span
                  className={`inline-flex items-center gap-1 ${
                    isHardView ? "text-fuchsia-400" : "text-amber-600"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isHardView ? "bg-fuchsia-400" : "bg-amber-400"
                    }`}
                  />
                  Vocab
                </span>
                <span
                  className={`inline-flex items-center gap-1 ${
                    isHardView ? "text-amber-300" : "text-purple-600"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isHardView ? "bg-amber-400" : "bg-purple-500"
                    }`}
                  />
                  Boss
                </span>
              </div>
            </div>
            <p className="truncate text-[11px] font-semibold text-slate-400">
              {isHardView
                ? `Master Parts IV, V & VI in Hard Mode to challenge Hard Boss ${displayUnitNum}`
                : `Complete each blue Spoon & amber Vocab Bridge to unlock Boss ${displayUnitNum}`}
            </p>
          </div>
        </div>

        {/* Right-Aligned Track Switcher Pill */}
        {hardModeUnlocked ? (
          <div
            className={`inline-flex shrink-0 items-center gap-1 self-start rounded-2xl p-1 sm:self-center ${
              isHardView
                ? "border border-white/10 bg-slate-900"
                : "border border-slate-200 bg-slate-100"
            }`}
          >
            <button
              type="button"
              onClick={() => setViewTrack("STANDARD")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-black whitespace-nowrap transition ${
                !isHardView
                  ? "border-b-2 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-2xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Shield className="h-3 w-3" />
              <span>Standard</span>
            </button>

            <button
              type="button"
              onClick={() => setViewTrack("HARD")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-black whitespace-nowrap transition ${
                isHardView
                  ? "border-b-2 border-red-950 bg-gradient-to-r from-rose-500 via-red-600 to-amber-500 text-white shadow-md shadow-rose-500/30"
                  : "text-rose-600 hover:bg-rose-50"
              }`}
            >
              <Flame className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
              <span>Hard Mode</span>
            </button>
          </div>
        ) : (
          <div
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-slate-50 px-3.5 py-1.5 text-[11px] font-black text-slate-600 ring-1 ring-slate-200/80"
            title="Unlock Hard Mode Gauntlet at Spoon 30!"
          >
            <Flame className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
            <span>
              Hard Mode: {completedStandardSpoonsCount}/{HARD_MODE_UNLOCK_SPOON}{" "}
              Spoons
            </span>
            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-amber-400 to-purple-600"
                style={{ width: `${hardModePct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          2. STEPPING-STONE VISUAL MAP (Standard or Hard Mode Starting at 1!)
          ===================================================================== */}
      <div
        className={`relative overflow-x-auto rounded-3xl px-4 pt-10 pb-7 ring-1 transition-colors duration-500 ${
          isHardView
            ? "bg-gradient-to-b from-slate-900 via-rose-950/35 to-slate-900 ring-rose-500/25"
            : "bg-gradient-to-b from-slate-50/90 via-sky-50/25 to-purple-50/20 ring-slate-100"
        }`}
      >
        <div
          className={`pointer-events-none absolute top-[48%] right-12 left-12 h-2.5 -translate-y-1/2 rounded-full shadow-inner ${
            isHardView ? "bg-slate-800" : "bg-slate-200/80"
          }`}
        >
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isHardView
                ? "bg-gradient-to-r from-rose-500 via-fuchsia-500 to-amber-400"
                : "bg-gradient-to-r from-blue-500 via-amber-400 to-purple-500"
            }`}
            style={{ width: `${trackProgressPct}%` }}
          />
        </div>

        <div className="relative z-10 flex min-w-[540px] items-center justify-between px-2">
          {mapNodes.map((node) => {
            const styles = nodeStyles[node.kind];
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
                {node.isCurrent && (
                  <span
                    className={`pointer-events-none absolute -inset-2 animate-pulse rounded-3xl blur-md ${styles.halo}`}
                  />
                )}

                <div
                  className={`relative z-10 flex items-center justify-center font-black transition-all duration-150 ${sizeClasses} ${buttonStyle} ${
                    node.href
                      ? "group-hover:-translate-y-1 group-active:translate-y-1 group-active:border-b-2"
                      : ""
                  }`}
                >
                  {isBoss ? (
                    <div className="flex flex-col items-center leading-none">
                      <Crown
                        className={`mb-0.5 h-4 w-4 ${
                          isHardView
                            ? "fill-slate-950 text-slate-950"
                            : "fill-amber-300 text-amber-300"
                        }`}
                      />
                      <Swords className="h-5 w-5" />
                    </div>
                  ) : isBridge ? (
                    <Zap className="h-5 w-5 fill-current" />
                  ) : (
                    <span>{node.label}</span>
                  )}

                  {node.isDone ? (
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs ring-2 ring-white">
                      <Check className="h-3 w-3 stroke-[3.5]" />
                    </span>
                  ) : !node.isCurrent ? (
                    <span
                      className={`absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full shadow-xs ring-1 ${
                        isHardView
                          ? "bg-slate-900 text-slate-500 ring-slate-700"
                          : "bg-white text-slate-400 ring-slate-200"
                      }`}
                    >
                      <Lock className="h-2.5 w-2.5" />
                    </span>
                  ) : null}
                </div>

                <div
                  className={`mt-1.5 rounded-full transition-all ${
                    isBoss
                      ? "h-2.5 w-14"
                      : isBridge
                        ? "h-2 w-9"
                        : "h-2.5 w-12"
                  } ${pedestalColor}`}
                />

                <span
                  className={`mt-1.5 text-[10px] font-extrabold tracking-tight ${
                    node.isCurrent
                      ? isHardView
                        ? "font-black text-white"
                        : "font-black text-slate-900"
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
                {node.isCurrent && (
                  <div
                    className={`-mt-7 mb-1.5 animate-bounce rounded-full px-2.5 py-0.5 text-[9px] font-black tracking-wider uppercase shadow-md ${
                      isHardView
                        ? "bg-rose-500 text-white"
                        : "bg-slate-900 text-amber-300"
                    }`}
                  >
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
          3. BOTTOM BANNER: HARD MODE ACTIVATION CTA OR UP NEXT BANNER
          ===================================================================== */}
      {isHardView && !hasHardModeLessons ? (
        <div className="relative overflow-hidden rounded-2xl bg-slate-900/95 p-4 ring-1 ring-rose-500/40 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-b-4 border-rose-950 bg-gradient-to-b from-rose-500 to-red-700 text-white shadow-sm">
                <Flame className="h-5 w-5 fill-amber-300 text-amber-300" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black tracking-wider text-rose-400 uppercase">
                    Start Hard Mode Track
                  </span>
                  <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[10px] font-black text-rose-200 uppercase">
                    Hard Spoon 1 · Part IV
                  </span>
                </div>
                <h4 className="mt-0.5 truncate text-sm font-black text-white sm:text-base">
                  {mirroredStandardUnit1Lesson?.title
                    ? `${mirroredStandardUnit1Lesson.title} IV`
                    : "Unit 1: Greetings & Introductions IV"}
                </h4>
              </div>
            </div>

            <button
              type="button"
              disabled={isActivatingHardMode}
              onClick={handleActivateHardMode}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border-b-4 border-red-950 bg-gradient-to-r from-rose-500 via-red-600 to-amber-500 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-rose-600/30 transition hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:border-b-0 disabled:opacity-60"
            >
              {isActivatingHardMode ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{spriteName} is Setting Up...</span>
                </>
              ) : (
                <>
                  <Flame className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                  <span>Generate Hard Spoon 1</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        nextLocked && (
          <UpNextWideBanner
            type={nextLocked.type}
            lesson={nextLocked.data}
            milestoneNum={displayUnitNum}
            isHardView={isHardView}
            displayTitles={displayTitles}
          />
        )
      )}
    </div>
  );
}

function UpNextWideBanner({
  type,
  lesson,
  milestoneNum,
  isHardView,
  displayTitles,
}: {
  type: "SPOON" | "BRIDGE" | "BOSS";
  lesson: Lesson;
  milestoneNum: number;
  isHardView: boolean;
  displayTitles?: Map<string, string>;
}) {
  const formattedTitle = displayTitles?.get(lesson.id) || lesson.title;
  const displaySpoonNum =
    isHardView && lesson.orderIndex > HARD_MODE_SPOON_OFFSET
      ? lesson.orderIndex - HARD_MODE_SPOON_OFFSET
      : lesson.orderIndex;

  const title =
    type === "SPOON"
      ? formattedTitle ||
        (isHardView
          ? `Hard Spoon ${displaySpoonNum}`
          : `Spoon ${displaySpoonNum}`)
      : type === "BRIDGE"
        ? formattedTitle
          ? `Vocab Bridge: ${formattedTitle}`
          : `Vocab Checkpoint ${displaySpoonNum}`
        : lesson.bossStage?.scenarioData?.boss?.name ||
          (isHardView
            ? `Hard Mode Boss ${milestoneNum} Arena`
            : `Milestone ${milestoneNum} Boss Arena`);

  const badge =
    type === "SPOON"
      ? isHardView
        ? `Hard Spoon ${displaySpoonNum}`
        : `Spoon ${displaySpoonNum}`
      : type === "BRIDGE"
        ? isHardView
          ? `Hard Bridge ${displaySpoonNum}`
          : `Vocab Bridge ${displaySpoonNum}`
        : isHardView
          ? `Hard Boss ${milestoneNum}`
          : `Boss ${milestoneNum}`;

  if (isHardView) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/90 p-4 ring-1 ring-rose-500/30 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-b-4 border-rose-950 bg-gradient-to-b from-rose-500 to-red-700 text-white shadow-sm">
              {type === "BRIDGE" ? (
                <Zap className="h-5 w-5 fill-current" />
              ) : type === "BOSS" ? (
                <Swords className="h-5 w-5" />
              ) : (
                <Flame className="h-5 w-5 fill-amber-300 text-amber-300" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black tracking-wider text-rose-400 uppercase">
                  Next in Hard Mode
                </span>
                <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[10px] font-black text-rose-200 uppercase">
                  {badge}
                </span>
              </div>
              <h4 className="mt-0.5 truncate text-sm font-black text-white sm:text-base">
                {title}
              </h4>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-4 py-2 text-xs font-extrabold text-rose-200 ring-1 ring-rose-500/30">
              <Lock className="h-3.5 w-3.5 text-rose-400" />
              <span>Unlocks Next</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </span>
          </div>
        </div>
      </div>
    );
  }

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
      className={`relative overflow-hidden rounded-2xl p-4 ring-1 sm:px-5 ${bannerStyles.container}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
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