"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { LearningPath } from "@/app/actions/get-learning-path";
import type { UserGenerationData } from "@/lib/upstash";
import { useSprite } from "@/context/sprite-context";
import {
  getSpoonSpriteOrderIndex,
  getBridgeSpriteOrderIndex,
  getBossSpriteOrderIndex,
} from "@/lib/foundation/tools";
import { vocabWordCount } from "./utils";
import { generateDisplayTitles } from "@/lib/utils";

import { DashboardHeader } from "./dashboard-header";
import { PrimaryHeroCard } from "./primary-hero-card";
import { GenerationCycleCard } from "./generation-cycle-card";
import { LearningPathMiniCards } from "./learning-mini-path-cards";
import { PastActivitySlimList } from "./past-activity-slim-list";
import { WordMatrixCard } from "./word-matrix-card";

import { SpriteChat } from "@/components/sprite/sprite-chat";

type Props = {
  path: LearningPath | null;
  lang: { nativeLanguage: string; targetLanguage: string | null | any };
  generationData?: UserGenerationData | null;
};

export default function FoundationHubPage({
  path,
  lang,
  generationData,
}: Props) {
  const router = useRouter();
  const { summonSpriteNode, profile, liveTask, setLiveTask } = useSprite();

  const lessons = path?.lessons ?? [];
  const courseId = path?.courseId ?? (path as any)?.id ?? "default";
  const user = path?.user;

  const displayTitles = useMemo(
    () => generateDisplayTitles(lessons),
    [lessons],
  );

  // --- ENGINE STATE ---
  const currentFocus = path?.currentFocus ?? null;
  const nextLocked = path?.nextLocked ?? null;

  const vocabDue =
    currentFocus?.type === "BRIDGE" ? currentFocus.data : undefined;
  const nextLesson =
    currentFocus?.type === "SPOON" ? currentFocus.data : undefined;
  const bossDue = currentFocus?.type === "BOSS" ? currentFocus.data : undefined;

  const waitingOnSpoon =
    currentFocus?.type === "SPOON" &&
    !currentFocus.data.title &&
    !currentFocus.data.imageUrl;

  const waitingOnVocab =
    currentFocus?.type === "BRIDGE"
      ? !currentFocus.data.bridge
      : lessons.some((l) => l.completedAt && !l.bridge);

  const bossStageObj =
    currentFocus?.type === "BOSS"
      ? ((currentFocus.data as any)?.bossStage ?? currentFocus.data)
      : null;

  const waitingOnBoss =
    currentFocus?.type === "BOSS" &&
    (!bossStageObj || bossStageObj.status === "BUILDING");

  const isGenerating = waitingOnSpoon || waitingOnVocab || waitingOnBoss;

  const completedLessonsCount = lessons.filter((l) =>
    Boolean(l.completedAt),
  ).length;

  const totalWordsLearned = lessons.reduce((acc, l) => {
    return (
      acc +
      (l.completedAt && l.bridge ? vocabWordCount(l.bridge.vocabMoment) : 0)
    );
  }, 0);

  const recentBridgeWords = lessons
    .filter((l) => l.completedAt && l.bridge?.vocabMoment)
    .flatMap(
      (l) =>
        (l.bridge?.vocabMoment as Array<{ word: string; gloss?: string }>) ??
        [],
    )
    .reverse();

  const getLessonHref = (lessonId: string) =>
    `/foundation/${lessonId}/${courseId}`;

  const getVocabHref = (bridgeId: string) => `/foundation/vocab/${bridgeId}`;

  const getBossHref = (bossId: string) => `/foundation/boss/${bossId}`;

  // Poll while Lambda is generating
  useEffect(() => {
    if (!isGenerating || liveTask?.status === "FAILED") return;
    const interval = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(interval);
  }, [isGenerating, liveTask?.status, router]);

  // --- SPRITE TRIGGER LOGIC ---
  useEffect(() => {
    if (!profile?.sprite) return;

    let orderIndex: number | null = null;
    let actionHref: string | null = null;
    let stepLabel = "";

    if (currentFocus?.type === "SPOON" && nextLesson && !waitingOnSpoon) {
      const spoonNum =
        (nextLesson as any)?.orderIndex ?? completedLessonsCount + 1;
      orderIndex = getSpoonSpriteOrderIndex(spoonNum);
      actionHref = getLessonHref(nextLesson.id);
      stepLabel = `Start Spoon ${spoonNum}`;
    } else if (currentFocus?.type === "BRIDGE" && vocabDue && !waitingOnVocab) {
      const spoonNum = (vocabDue as any)?.orderIndex ?? completedLessonsCount;
      const bridgeId =
        (vocabDue as any)?.bridge?.id ?? (vocabDue as any)?.id;
      orderIndex = getBridgeSpriteOrderIndex(spoonNum);
      actionHref = getVocabHref(bridgeId);
      stepLabel = `Unlock Bridge ${spoonNum}`;
    } else if (currentFocus?.type === "BOSS" && bossDue && !waitingOnBoss) {
      const milestoneNum =
        (bossDue as any)?.milestoneIndex ??
        (bossDue as any)?.bossStage?.milestoneIndex ??
        Math.max(1, Math.ceil(completedLessonsCount / 3));
      orderIndex = getBossSpriteOrderIndex(milestoneNum);
      const bossId =
        (bossDue as any)?.bossStage?.id ?? (bossDue as any)?.id ?? courseId;
      actionHref = getBossHref(bossId);
      stepLabel = "Challenge Boss";
    }

    if (!orderIndex || !actionHref) return;

    const focusItemId =
      nextLesson?.id ?? vocabDue?.id ?? bossDue?.id ?? String(orderIndex);

    summonSpriteNode({
      orderIndex,
      stepType: currentFocus?.type,
      dedupeKey: `sprite_seen_${orderIndex}_${focusItemId}`,
      actionLabel: stepLabel,
      onAction: () => router.push(actionHref!),
    });
  }, [
    profile,
    waitingOnSpoon,
    waitingOnVocab,
    waitingOnBoss,
    currentFocus?.type,
    completedLessonsCount,
    nextLesson?.id,
    vocabDue?.id,
    bossDue?.id,
    courseId,
    router,
    summonSpriteNode,
  ]);

  // --- SYNC GENERATION STATUS WITH SPRITE CONTEXT ---
  useEffect(() => {
    if (liveTask?.status === "FAILED") return;

    if (waitingOnSpoon) {
      setLiveTask({
        taskId: nextLesson?.id || "spoon-gen",
        taskType: "SPOON_GENERATION",
        status: "BUILDING",
        label: `Spoon ${(nextLesson as any)?.orderIndex ?? completedLessonsCount + 1} Lesson`,
        updatedAt: new Date().toISOString(),
      });
    } else if (waitingOnVocab) {
      setLiveTask({
        taskId: vocabDue?.id || "bridge-gen",
        taskType: "VOCAB_BRIDGE_GENERATION",
        status: "BUILDING",
        label: "Vocab Bridge",
        updatedAt: new Date().toISOString(),
      });
    } else if (waitingOnBoss) {
      setLiveTask({
        taskId: bossStageObj?.id || "boss-gen",
        taskType: "SPOON_BOSS_GENERATION",
        status: "BUILDING",
        label: "Boss Stage",
        updatedAt: new Date().toISOString(),
      });
    } else if (liveTask?.status === "BUILDING") {
      setLiveTask(null);
    }
  }, [
    waitingOnSpoon,
    waitingOnVocab,
    waitingOnBoss,
    nextLesson,
    vocabDue,
    bossStageObj,
    completedLessonsCount,
    liveTask?.status,
    setLiveTask,
  ]);

  const activeOrderIndex =
    currentFocus?.data.orderIndex ?? completedLessonsCount + 1;

  return (
    <div className="min-h-screen bg-slate-100/80 font-sans text-slate-900 selection:bg-indigo-100">
      <DashboardHeader
        name={user?.firstName || generationData?.firstName}
        lang={lang}
        completedCount={completedLessonsCount}
        streak={1}
      />

      <main className="relative z-20 mx-auto -mt-12 max-w-7xl px-6 pb-20 lg:px-8">
        <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
          {/* LEFT / MAIN COLUMN */}
          <div className="flex flex-col justify-between gap-7 lg:col-span-8">
            {waitingOnSpoon && generationData ? (
              <GenerationCycleCard data={generationData} />
            ) : (
              <PrimaryHeroCard
                path={path}
                vocabDue={vocabDue}
                nextLesson={nextLesson}
                bossDue={bossDue}
                waitingOnSpoon={waitingOnSpoon}
                waitingOnVocab={waitingOnVocab}
                waitingOnBoss={waitingOnBoss}
                getLessonHref={getLessonHref}
                getBossHref={getBossHref}
                displayTitles={displayTitles}
              />
            )}

            <LearningPathMiniCards
              courseId={courseId}
              currentFocus={currentFocus}
              nextLocked={nextLocked}
              lessons={lessons}
              getLessonHref={getLessonHref}
              getBossHref={getBossHref}
              displayTitles={displayTitles}
            />
          </div>

          {/* RIGHT PANEL: Word Matrix + Dedicated Past Activity Slim List */}
          <div className="flex flex-col gap-6 lg:col-span-4">
            <WordMatrixCard
              totalWordsLearned={totalWordsLearned}
              matrixStats={path?.matrixStats}
              fallbackWords={recentBridgeWords}
              isLocked={completedLessonsCount === 0}
            />

            <PastActivitySlimList
              courseId={courseId}
              lessons={lessons}
              activeOrderIndex={activeOrderIndex}
              getLessonHref={getLessonHref}
              getVocabHref={getVocabHref}
              getBossHref={getBossHref}
              displayTitles={displayTitles}
              onLaunchSpriteExercise={(item) => {
                console.log("Launch Sprite Exercise for:", item);
              }}
            />
          </div>
        </div>
      </main>

      {user?.id && (
        <SpriteChat
          userId={user.id}
          initialContext={{
            userName: user?.firstName || user?.username || "Student",
            nativeLang: path?.nativeLanguage || "English",
            targetLang: path?.targetLanguage || "French",
            currentLessonTitle:
              (currentFocus?.data as any)?.title ||
              `Spoon ${(currentFocus?.data as any)?.orderIndex || 1}`,
            currentFocusType: currentFocus?.type ?? null,
            wakeCycleKey:
              currentFocus?.type === "BOSS"
                ? `boss-${
                    (bossDue as any)?.milestoneIndex ??
                    (bossDue as any)?.bossStage?.milestoneIndex ??
                    Math.ceil(completedLessonsCount / 3)
                  }`
                : `spoon-${
                    (currentFocus?.data as any)?.orderIndex ??
                    completedLessonsCount + 1
                  }`,
            activeStepHref:
              currentFocus?.type === "BOSS" && bossDue
                ? getBossHref(
                    (bossDue as any)?.bossStage?.id ??
                      (bossDue as any)?.id ??
                      courseId
                  )
                : currentFocus?.type === "BRIDGE" && vocabDue
                  ? getVocabHref(
                      (vocabDue as any)?.bridge?.id ?? (vocabDue as any)?.id
                    )
                  : nextLesson
                    ? getLessonHref(nextLesson.id)
                    : undefined,
            activeStepLabel:
              currentFocus?.type === "BOSS"
                ? "Challenge Boss Stage"
                : currentFocus?.type === "BRIDGE"
                  ? "Complete Vocab Bridge"
                  : `Start Spoon ${
                      (nextLesson as any)?.orderIndex ??
                      completedLessonsCount + 1
                    }`,
            topWord: path?.matrixStats?.topWord || null,
            topPhrase: path?.matrixStats?.topPhrase || null,
            recentWords: path?.matrixStats?.recentWords || [],
            avgPronunciation: path?.matrixStats?.avgPronunciation || 0,
          }}
        />
      )}
    </div>
  );
}