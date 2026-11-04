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
} from "lucide-react";
import type { LearningPath } from "@/app/actions/get-learning-path";

type FocusState = LearningPath["currentFocus"];
type Lesson = LearningPath["lessons"][number];

const LOCKED_THEMES = {
  SPOON: {
    badge: "bg-indigo-100 text-indigo-700",
    text: "text-indigo-600",
    icon: <Headphones className="h-4 w-4 text-indigo-500" />,
  },
  BRIDGE: {
    badge: "bg-amber-100 text-amber-800",
    text: "text-amber-700",
    icon: <Zap className="h-4 w-4 text-amber-500" />,
  },
  BOSS: {
    badge: "bg-fuchsia-100 text-fuchsia-700",
    text: "text-fuchsia-600",
    icon: <Swords className="h-4 w-4 text-fuchsia-500" />,
  },
} as const;

export function LearningPathMiniCards({
  courseId,
  currentFocus,
  nextLocked,
  lessons = [],
  getLessonHref,
}: {
  courseId: string;
  currentFocus: FocusState;
  nextLocked: FocusState;
  lessons?: Lesson[];
  getLessonHref?: (lessonId: string) => string;
  getBossHref?: (bossId: string, lessonId: string) => string;
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
          1. UNIT MILESTONE ROADMAP (Replaces the duplicate Active Step card!)
          ===================================================================== */}
      <div className="rounded-3xl bg-white p-5 sm:p-6 shadow-sm ring-1 ring-slate-200/70">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <h3 className="text-xs font-extrabold tracking-wider text-slate-700 uppercase">
              Unit {milestoneNum} Boss Roadmap
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            Complete 3 Spoons &amp; Bridges to unlock the Unit {milestoneNum} Boss
          </span>
        </div>

        {/* 4-Node Unit Stepper: Spoon A -> Spoon B -> Spoon C -> Boss */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {unitSpoonNumbers.map((spoonNum) => {
            const matchedLesson = lessons.find(
              (l) => l.orderIndex === spoonNum
            );
            const isFullyDone =
              Boolean(matchedLesson?.completedAt) &&
              Boolean(matchedLesson?.bridge?.completedAt);
            const isCurrent = activeOrderIndex === spoonNum;

            return (
              <div
                key={spoonNum}
                className={`flex items-center gap-3 rounded-2xl p-3 transition-all ${
                  isCurrent
                    ? "bg-indigo-50/90 ring-2 ring-indigo-500/80 shadow-2xs"
                    : isFullyDone
                      ? "bg-emerald-50/60 ring-1 ring-emerald-200"
                      : "bg-slate-50 ring-1 ring-slate-200/60 opacity-75"
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                    isCurrent
                      ? "bg-indigo-600 text-white shadow-xs"
                      : isFullyDone
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {isFullyDone ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    spoonNum
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                    Spoon {spoonNum}
                  </p>
                  <p className="truncate text-xs font-bold text-slate-800">
                    {isCurrent
                      ? currentFocus.type === "BRIDGE"
                        ? "Vocab Bridge"
                        : "In Progress"
                      : isFullyDone
                        ? "Completed"
                        : "Locked"}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Node 4: Milestone Boss */}
          <div
            className={`flex items-center gap-3 rounded-2xl p-3 ${
              currentFocus.type === "BOSS"
                ? "bg-fuchsia-50 ring-2 ring-fuchsia-500"
                : "bg-slate-50 ring-1 ring-slate-200/60 opacity-75"
            }`}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                currentFocus.type === "BOSS"
                  ? "bg-fuchsia-600 text-white"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              <Swords className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-extrabold tracking-wider text-fuchsia-600 uppercase">
                Milestone {milestoneNum}
              </p>
              <p className="truncate text-xs font-bold text-slate-800">
                Boss Arena
              </p>
            </div>
          </div>
        </div>

        {/* Up Next Locked Preview Row */}
        {nextLocked && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <UpNextCompactTile
              type={nextLocked.type}
              lesson={nextLocked.data}
            />
          </div>
        )}
      </div>

      {/* =====================================================================
          2. RECENTLY COMPLETED SPOONS (Quick Practice / Replay Strip)
          ===================================================================== */}
      {recentCompleted.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-extrabold tracking-wider text-slate-500 uppercase">
              Recently Mastered • Quick Replay
            </h3>
            <span className="text-xs font-semibold text-slate-400">
              Tap any past lesson to review audio
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {recentCompleted.map((lesson) => (
              <Link
                key={lesson.id}
                href={resolveLessonHref(lesson.id)}
                className="group flex items-center gap-3.5 rounded-2xl bg-white p-3 shadow-2xs ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-indigo-300"
              >
                <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-900">
                  {lesson.imageUrl ? (
                    <img
                      src={lesson.imageUrl}
                      alt={lesson.title ?? "Lesson Image"}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : null}
                  <div className="absolute top-1 left-1 rounded bg-emerald-500 px-1.5 py-0.2 text-[9px] font-black text-white">
                    #{lesson.orderIndex}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black text-slate-800 group-hover:text-indigo-600">
                    {lesson.title || `Spoon ${lesson.orderIndex}`}
                  </p>
                  <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 group-hover:text-indigo-500">
                    <RotateCcw className="h-3 w-3" />
                    Replay Lesson
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UpNextCompactTile({
  type,
  lesson,
}: {
  type: "SPOON" | "BRIDGE" | "BOSS";
  lesson: Lesson;
}) {
  const theme = LOCKED_THEMES[type];

  const title =
    type === "SPOON"
      ? lesson.title || `Spoon ${lesson.orderIndex}`
      : type === "BRIDGE"
        ? lesson.title
          ? `Vocab Bridge: ${lesson.title}`
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
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200/70">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-2xs ring-1 ring-slate-200">
          <Lock className="h-4 w-4 text-slate-400" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
              Up Next
            </span>
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${theme.badge}`}
            >
              {badge}
            </span>
          </div>
          <h4 className="mt-0.5 truncate text-sm font-bold text-slate-700">
            {title}
          </h4>
        </div>
      </div>

      <span className="hidden sm:inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-400 ring-1 ring-slate-200/70">
        Unlocks Next
        <ArrowRight className="h-3 w-3" />
      </span>
    </div>
  );
}