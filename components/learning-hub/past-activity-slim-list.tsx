// past-activity-slim-list.tsx
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  RotateCcw,
  Wand2,
  Zap,
  Headphones,
  Swords,
  Crown,
  ChevronLeft,
  ChevronRight,
  Layers,
} from "lucide-react";
import type { LearningPath } from "@/app/actions/get-learning-path";
import type { LearningTrack } from "@/app/actions/get-learning-path";

type Lesson = LearningTrack["lessons"][number]

export type PastActivityItem = {
  id: string;
  kind: "SPOON" | "BRIDGE" | "BOSS";
  orderIndex: number;
  badgeText: string;
  title: string;
  subtitle: string;
  vocabWords: string[];
  href: string;
  lesson: Lesson;
};

export function PastActivitySlimList({
  courseId,
  lessons = [],
  activeOrderIndex = 1,
  getLessonHref,
  getVocabHref,
  getBossHref,
  displayTitles,
  onLaunchSpriteExercise,
}: {
  courseId: string;
  lessons: Lesson[];
  activeOrderIndex?: number;
  getLessonHref?: (lessonId: string) => string;
  getVocabHref?: (bridgeId: string) => string;
  getBossHref?: (bossId: string, lessonId: string) => string;
  displayTitles?: Map<string, string>;
  onLaunchSpriteExercise?: (item: PastActivityItem) => void;
}) {
  const PAGE_SIZE = 3;
  const [page, setPage] = useState(0);
  const [filterKind, setFilterKind] = useState<
    "ALL" | "SPOON" | "BRIDGE" | "BOSS"
  >("ALL");

  const resolveLessonHref = (lessonId: string) =>
    getLessonHref
      ? getLessonHref(lessonId)
      : `/foundation/${lessonId}/${courseId}`;

  const resolveVocabHref = (bridgeId: string) =>
    getVocabHref ? getVocabHref(bridgeId) : `/foundation/vocab/${bridgeId}`;

  const resolveBossHref = (bossId: string, lessonId: string) =>
    getBossHref
      ? getBossHref(bossId, lessonId)
      : `/foundation/boss/${bossId}`;

  // Flatten completed Spoons, Vocab Bridges, and Bosses in chronological curriculum order
  const allItems = useMemo(() => {
    const items: PastActivityItem[] = [];

    const sortedLessons = [...lessons].sort(
      (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
    );

    for (const lesson of sortedLessons) {
      const orderIdx = lesson.orderIndex ?? 1;
      const baseTitle =
        displayTitles?.get(lesson.id) || lesson.title || `Spoon ${orderIdx}`;

      const bridgeObj = (lesson as any)?.bridge;
      const vocabMoment =
        (bridgeObj?.vocabMoment as Array<{
          word: string;
          gloss?: string;
        }>) ?? [];
      const vocabWords = vocabMoment
        .map((v) => v.word)
        .filter(Boolean)
        .slice(0, 3);

      // 1. Completed Spoon (Primary Blue)
      if (lesson.completedAt) {
        items.push({
          id: `spoon-${lesson.id}`,
          kind: "SPOON",
          orderIndex: orderIdx,
          badgeText: `#${orderIdx}`,
          title: baseTitle,
          subtitle:
            vocabWords.length > 0
              ? vocabWords.join(" · ")
              : `Spoon ${orderIdx} Audio Lesson`,
          vocabWords,
          href: resolveLessonHref(lesson.id),
          lesson,
        });
      }

      // 2. Completed Vocab Bridge (Accent Amber)
      const isBridgeCompleted =
        bridgeObj &&
        (Boolean(bridgeObj.completedAt) ||
          (Boolean(lesson.completedAt) && orderIdx < activeOrderIndex));

      if (isBridgeCompleted) {
        items.push({
          id: `bridge-${bridgeObj.id || lesson.id}`,
          kind: "BRIDGE",
          orderIndex: orderIdx,
          badgeText: `B${orderIdx}`,
          title: `Vocab: ${baseTitle}`,
          subtitle:
            vocabWords.length > 0
              ? vocabWords.join(" · ")
              : `Bridge ${orderIdx} Vocab Drill`,
          vocabWords,
          href: resolveVocabHref(bridgeObj.id || lesson.id),
          lesson,
        });
      }

      // 3. Completed Boss Stage (Tertiary Purple)
      const bossStage = (lesson as any)?.bossStage;
      const isBossCompleted =
        bossStage &&
        (Boolean(bossStage.passed) ||
          Boolean(bossStage.completedAt) ||
          (orderIdx % 3 === 0 &&
            Boolean(lesson.completedAt) &&
            orderIdx < activeOrderIndex));

      if (isBossCompleted) {
        const milestoneNum =
          bossStage.milestoneIndex ?? Math.ceil(orderIdx / 3);
        const bossName =
          bossStage.scenarioData?.boss?.name ||
          `Milestone ${milestoneNum} Boss`;

        items.push({
          id: `boss-${bossStage.id || lesson.id}`,
          kind: "BOSS",
          orderIndex: orderIdx,
          badgeText: `M${milestoneNum}`,
          title: bossName,
          subtitle: `Milestone ${milestoneNum} Boss Arena (Spoons ${Math.max(
            1,
            orderIdx - 2
          )}–${orderIdx})`,
          vocabWords,
          href: resolveBossHref(bossStage.id || lesson.id, lesson.id),
          lesson,
        });
      }
    }

    // Newest first
    return items.reverse();
  }, [lessons, displayTitles, activeOrderIndex, courseId]);

  const filteredItems = useMemo(() => {
    if (filterKind === "ALL") return allItems;
    return allItems.filter((item) => item.kind === filterKind);
  }, [allItems, filterKind]);

  if (allItems.length === 0) return null;

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const visibleItems = filteredItems.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE
  );

  // Color system per item kind:
  // SPOON  = Primary Blue
  // BRIDGE = Accent Amber
  // BOSS   = Tertiary Purple
  const getKindStyles = (kind: "SPOON" | "BRIDGE" | "BOSS") => {
    if (kind === "BRIDGE") {
      return {
        badge3D:
          "border-b-[3px] border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950",
        typePill: "bg-amber-100 text-amber-900",
        typeLabel: "Vocab",
        retryBtn:
          "bg-amber-50 text-amber-800 ring-1 ring-amber-200/80 hover:bg-amber-100",
      };
    }
    if (kind === "BOSS") {
      return {
        badge3D:
          "border-b-[3px] border-purple-950 bg-gradient-to-b from-violet-500 to-purple-700 text-white",
        typePill: "bg-purple-100 text-purple-800",
        typeLabel: "Boss",
        retryBtn:
          "bg-purple-50 text-purple-700 ring-1 ring-purple-200/80 hover:bg-purple-100",
      };
    }
    return {
      badge3D:
        "border-b-[3px] border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white",
      typePill: "bg-sky-100 text-blue-800",
      typeLabel: "Spoon",
      retryBtn:
        "bg-sky-50 text-blue-700 ring-1 ring-sky-200/80 hover:bg-sky-100",
    };
  };

  return (
    <div className="flex flex-1 flex-col justify-between overflow-hidden rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      {/* Top Header + Filter Tabs + Prev/Next Controls */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-100 text-purple-600">
              <Wand2 className="h-3.5 w-3.5" />
            </span>
            <h3 className="text-xs font-black tracking-wider text-slate-800 uppercase">
              Past Spoons, Vocab &amp; Bosses
            </h3>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-1.5">
            <span className="mr-1 text-[10px] font-bold text-slate-400">
              {safePage + 1} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
              title="Newer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
              title="Older"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Color-Coded Filter Pills: All | Blue Spoons | Amber Vocab | Purple Boss */}
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100/90 p-1">
          <button
            type="button"
            onClick={() => {
              setFilterKind("ALL");
              setPage(0);
            }}
            className={`inline-flex items-center justify-center gap-1 rounded-lg py-1 text-[10px] font-extrabold transition ${
              filterKind === "ALL"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="h-2.5 w-2.5" />
            <span>All</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterKind("SPOON");
              setPage(0);
            }}
            className={`inline-flex items-center justify-center gap-1 rounded-lg py-1 text-[10px] font-extrabold transition ${
              filterKind === "SPOON"
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-blue-600 hover:bg-blue-50"
            }`}
          >
            <Headphones className="h-2.5 w-2.5" />
            <span>Spoons</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterKind("BRIDGE");
              setPage(0);
            }}
            className={`inline-flex items-center justify-center gap-1 rounded-lg py-1 text-[10px] font-extrabold transition ${
              filterKind === "BRIDGE"
                ? "bg-amber-400 text-slate-950 shadow-2xs"
                : "text-amber-700 hover:bg-amber-50"
            }`}
          >
            <Zap className="h-2.5 w-2.5 fill-current" />
            <span>Vocab</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterKind("BOSS");
              setPage(0);
            }}
            className={`inline-flex items-center justify-center gap-1 rounded-lg py-1 text-[10px] font-extrabold transition ${
              filterKind === "BOSS"
                ? "bg-purple-600 text-white shadow-2xs"
                : "text-purple-700 hover:bg-purple-50"
            }`}
          >
            <Crown className="h-2.5 w-2.5 fill-current" />
            <span>Boss</span>
          </button>
        </div>
      </div>

      {/* 3-Item List (Sits Flush with Left Column!) */}
      {visibleItems.length === 0 ? (
        <div className="my-auto py-6 text-center text-xs font-semibold text-slate-400">
          No completed {filterKind.toLowerCase()} items yet.
        </div>
      ) : (
        <div className="my-auto divide-y divide-slate-100 pt-1">
          {visibleItems.map((item) => {
            const styles = getKindStyles(item.kind);

            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2.5 py-2.5 first:pt-1.5 last:pb-1"
              >
                {/* Left: 3D Color-Coded Badge (Blue=Spoon, Amber=Vocab, Purple=Boss) */}
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-black shadow-2xs ${styles.badge3D}`}
                  >
                    {item.kind === "BRIDGE" ? (
                      <span className="inline-flex items-center">
                        <Zap className="h-3 w-3 fill-current" />
                        {item.orderIndex}
                      </span>
                    ) : item.kind === "BOSS" ? (
                      <Swords className="h-4 w-4" />
                    ) : (
                      item.badgeText
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.2 text-[9px] font-black uppercase ${styles.typePill}`}
                      >
                        {styles.typeLabel}
                      </span>
                      <p className="truncate text-xs font-black text-slate-800">
                        {item.title}
                      </p>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-400">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                {/* Right: [Retry] + [Magic Wand / ⚡ Charge Sprite Exercise] */}
                <div className="flex shrink-0 items-center gap-1.5">
                  <Link
                    href={item.href}
                    className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-extrabold transition ${styles.retryBtn}`}
                    title={`Replay this ${styles.typeLabel}`}
                  >
                    <RotateCcw className="h-3 w-3" />
                    {/* <span>Retry</span> */}
                  </Link>

                  {/* <button
                    type="button"
                    onClick={() => onLaunchSpriteExercise?.(item)}
                    className="inline-flex items-center gap-1 rounded-xl border-b-2 border-purple-900 bg-gradient-to-b from-violet-500 to-purple-700 px-2.5 py-1.5 text-[11px] font-black text-white shadow-2xs transition hover:brightness-110 active:translate-y-0.5 active:border-b-0"
                    title="Spend 1 ⚡ Charge to launch a custom Sprite Exercise!"
                  >
                    <Wand2 className="h-3 w-3" />
                    <Zap className="h-2.5 w-2.5 fill-amber-300 text-amber-300" />
                  </button> */}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}