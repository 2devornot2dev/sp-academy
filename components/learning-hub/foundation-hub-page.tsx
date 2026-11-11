"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Dumbbell, Sparkles, ArrowRight } from "lucide-react";
import type { LearningPathData } from "@/app/actions/get-learning-path";
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
  path: LearningPathData | null;
  lang: { nativeLanguage: string; targetLanguage: string | null | any };
  generationData?: UserGenerationData | null;
};

export default function FoundationHubPage({
  path,
  lang,
  generationData,
}: Props) {
  const router = useRouter();
  const {
    summonSpriteNode,
    profile,
    liveTask,
    setLiveTask,
    openChat,
    spriteName,
    avatarSrc,
  } = useSprite();

  const standardTrack = path?.standardTrack;
  const hardTrack = path?.hardTrack;

  // Track State hoisted so the whole page (Hero Card + Map + History) syncs!
  const [activeTrack, setActiveTrack] = useState<"STANDARD" | "HARD">(() => {
    return hardTrack &&
      hardTrack.currentFocus?.data.orderIndex &&
      hardTrack.currentFocus.data.orderIndex > 0
      ? "HARD"
      : "STANDARD";
  });

  const completedStandardSpoonsCount =
    standardTrack?.lessons.filter((l) => Boolean(l.completedAt)).length || 0;
  const hardModeUnlocked = completedStandardSpoonsCount >= 30;
  const isHardView = activeTrack === "HARD" && hardModeUnlocked;
  
  const currentTrackData = isHardView && hardTrack ? hardTrack : standardTrack;

  const lessons = currentTrackData?.lessons ?? [];
  const courseId = currentTrackData?.courseId ?? "default";
  const user = currentTrackData?.user;

  const displayTitles = useMemo(
    () => generateDisplayTitles(lessons),
    [lessons],
  );

  // --- ENGINE STATE ---
  const currentFocus = currentTrackData?.currentFocus ?? null;
  const nextLocked = currentTrackData?.nextLocked ?? null;

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

  const isBossUnlocked = (bossStageObj as any)?.freestyleUnlocked ?? true;

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
      actionHref = isBossUnlocked ? getBossHref(bossId) : "/conversation";
      stepLabel = isBossUnlocked
        ? "Challenge Boss"
        : "Unlock Boss: 3-Min AI Chat";
    }

    if (!orderIndex || !actionHref) return;

    const focusItemId =
      nextLesson?.id ?? vocabDue?.id ?? bossDue?.id ?? String(orderIndex);

    summonSpriteNode({
      orderIndex,
      stepType: currentFocus?.type,
      dedupeKey: `sprite_seen_${orderIndex}_${focusItemId}_${isBossUnlocked ? "unlocked" : "locked"}`,
      actionLabel: stepLabel,
      onAction: () => router.push(actionHref!),
    });
  }, [
    profile,
    waitingOnSpoon,
    waitingOnVocab,
    waitingOnBoss,
    isBossUnlocked,
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
              <>
                <PrimaryHeroCard
                  path={currentTrackData as any}
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

                {/* WHILE BAKING ACTION BAR */}
                {isGenerating && (
                  <div className="relative overflow-hidden rounded-3xl border border-indigo-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white shadow-xl">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-3.5">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-teal-400/40 bg-slate-800">
                          <img
                            src={avatarSrc}
                            alt={spriteName}
                            className="h-full w-full object-cover object-top"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-teal-400" />
                            <span className="text-[11px] font-black tracking-wider text-teal-300 uppercase">
                              While Your Next Stage Is Baking...
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs sm:text-sm font-bold text-slate-200">
                            Jump into a 1-on-1 AI warm-up with {spriteName} or
                            play a 3-round Sprite Workout!
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            openChat({
                              tab: "session",
                              prompt: `Let's do a quick 1-on-1 conversational warm-up while my next stage is building!`,
                            })
                          }
                          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-400 to-emerald-400 px-4 py-2.5 text-xs font-black text-slate-950 shadow-md transition hover:-translate-y-0.5 hover:brightness-105"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>1-on-1 AI Chat</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => openChat({ tab: "briefing" })}
                          className="inline-flex items-center gap-2 rounded-2xl border border-indigo-400/40 bg-indigo-500/25 px-4 py-2.5 text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-indigo-500/40"
                        >
                          <Dumbbell className="h-3.5 w-3.5 text-amber-300" />
                          <span>Sprite Exercise</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {path && (
              <LearningPathMiniCards
                data={path}
                displayTitles={displayTitles}
                activeTrack={activeTrack}
                setActiveTrack={setActiveTrack}
              />
            )}
          </div>

          {/* RIGHT PANEL */}
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
              onLaunchSpriteExercise={() => {
                openChat({ tab: "briefing" });
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
            nativeLang: currentTrackData?.nativeLanguage || "English",
            targetLang: currentTrackData?.targetLanguage || "French",
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
                ? isBossUnlocked
                  ? getBossHref(
                      (bossDue as any)?.bossStage?.id ??
                        (bossDue as any)?.id ??
                        courseId,
                    )
                  : "/conversation"
                : currentFocus?.type === "BRIDGE" && vocabDue
                  ? getVocabHref(
                      (vocabDue as any)?.bridge?.id ?? (vocabDue as any)?.id,
                    )
                  : nextLesson
                    ? getLessonHref(nextLesson.id)
                    : undefined,
            activeStepLabel:
              currentFocus?.type === "BOSS"
                ? isBossUnlocked
                  ? "Challenge Boss Stage"
                  : "Unlock Boss: Start 3-Min AI Chat"
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