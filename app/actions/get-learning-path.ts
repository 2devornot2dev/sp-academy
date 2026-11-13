// app/actions/get-learning-path.ts
"use server";
import { prisma } from "@/lib/prisma";
import { getPresignedImageUrl } from "@/lib/aws/services/s3-presigned-url";
import { getFreestyleRedisState } from "@/lib/upstash";

type VisualContent = { imageS3Key?: string; altText?: string } | null;

type BossScenarioData = {
  boss?: {
    name?: string;
    persona?: string;
    appearance?: string;
    introMessage?: string;
    sceneDescription?: string;
    coverUrl?: string;
    avatar?: {
      default?: string;
      happy?: string;
      sad?: string;
      angry?: string;
      confused?: string;
    };
  };
  rules?: {
    passingScore?: number;
    totalExercises?: number;
  };
  title?: string;
  setting?: string;
  description?: string;
  aiRole?: string;
  objective?: string;
  coverUrl?: string;
  coverS3Key?: string;
  imageS3Key?: string;
} | null;

async function safePresign(key?: string | null): Promise<string | null> {
  if (!key) return null;
  if (key.startsWith("http://") || key.startsWith("https://")) return key;
  try {
    return await getPresignedImageUrl(key);
  } catch (err) {
    return null;
  }
}

/**
 * Hydrates all Bridges, Boss Stages, and the Next Focused Step for a single FoundationCourse track.
 */
async function hydrateTrack(
  course: {
    id: string;
    lessons: Array<{
      id: string;
      title: string | null;
      orderIndex: number;
      visualContent: any;
      completedAt: Date | null;
      feedback: any;
      createdAt: Date;
    }>;
  },
  userId: string,
  freestyleSessions: Array<{ id: string; milestoneIndex: number | null }>,
  hitDailyCap: boolean,
) {
  if (!course) return null;

  const [bridges, bossStages] = await Promise.all([
    prisma.foundationBridge.findMany({
      where: { foundationCourseId: course.id, userId },
      orderBy: { bridgeIndex: "asc" },
      select: {
        id: true,
        bridgeIndex: true,
        vocabMoment: true,
        passed: true,
        score: true,
        attempts: true,
        completedAt: true,
        createdAt: true,
      },
    }),
    prisma.foundationBossStage.findMany({
      where: { foundationCourseId: course.id, userId },
      select: {
        id: true,
        milestoneIndex: true,
        status: true,
        passed: true,
        targetLessonIds: true,
        targetBridgeIds: true,
        scenarioData: true,
        completedAt: true,
      },
    }),
  ]);

  const bridgeByIndex = new Map(bridges.map((b) => [b.bridgeIndex, b]));

  const resolvedBossStages = await Promise.all(
    bossStages.map(async (b) => {
      const scenario = b.scenarioData as unknown as BossScenarioData;

      const rawCover =
        scenario?.boss?.coverUrl ??
        (b as any).coverUrl ??
        (b as any).coverS3Key ??
        scenario?.coverUrl ??
        scenario?.coverS3Key ??
        scenario?.imageS3Key ??
        null;

      const rawAvatar = scenario?.boss?.avatar?.default ?? null;

      const [presignedCover, presignedAvatar] = await Promise.all([
        safePresign(rawCover),
        safePresign(rawAvatar),
      ]);

      const enrichedScenario: BossScenarioData = scenario
        ? {
            ...scenario,
            boss: scenario.boss
              ? {
                  ...scenario.boss,
                  coverUrl: presignedCover ?? scenario.boss.coverUrl,
                  avatar: scenario.boss.avatar
                    ? {
                        ...scenario.boss.avatar,
                        default:
                          presignedAvatar ?? scenario.boss.avatar.default,
                      }
                    : undefined,
                }
              : undefined,
          }
        : null;

      const mIndex = b.milestoneIndex ?? 1;
      const milestoneSessions = freestyleSessions.filter(
        (s) => s.milestoneIndex === mIndex,
      );
      const freestyleUnlocked =
        Boolean(b.passed) || milestoneSessions.length >= 1 || hitDailyCap;

      return {
        ...b,
        coverUrl: presignedCover,
        avatarUrl: presignedAvatar,
        scenarioData: enrichedScenario,
        freestyleUnlocked,
        completedFreestyleCount: milestoneSessions.length,
        requiredFreestyleCount: 1,
      };
    }),
  );

  const bossByMilestoneIndex = new Map(
    resolvedBossStages.map((b) => [b.milestoneIndex, b]),
  );

  const lessons = await Promise.all(
    course.lessons.map(async ({ visualContent, ...lesson }) => {
      const visual = visualContent as unknown as VisualContent;
      const isMilestone = lesson.orderIndex % 3 === 0;
      const milestoneIndex = isMilestone ? lesson.orderIndex / 3 : null;

      return {
        ...lesson,
        imageUrl: await safePresign(visual?.imageS3Key),
        imageAlt: visual?.altText ?? null,
        bridge: bridgeByIndex.get(lesson.orderIndex) ?? null,
        bossStage: milestoneIndex
          ? (bossByMilestoneIndex.get(milestoneIndex) ?? null)
          : null,
      };
    }),
  );

  let currentFocus: {
    type: "SPOON" | "BRIDGE" | "BOSS";
    data: (typeof lessons)[0];
  } | null = null;
  let nextLocked: {
    type: "SPOON" | "BRIDGE" | "BOSS";
    data: (typeof lessons)[0];
  } | null = null;

  for (let i = 0; i < lessons.length; i++) {
    const lesson = lessons[i];

    if (!lesson.completedAt) {
      currentFocus = { type: "SPOON", data: lesson };
      nextLocked = { type: "BRIDGE", data: lesson };
      break;
    }

    if (!lesson.bridge || !lesson.bridge.passed) {
      currentFocus = { type: "BRIDGE", data: lesson };
      nextLocked =
        lesson.orderIndex % 3 === 0
          ? { type: "BOSS", data: lesson }
          : lessons[i + 1]
            ? { type: "SPOON", data: lessons[i + 1] }
            : null;
      break;
    }

    if (lesson.orderIndex % 3 === 0) {
      const boss = lesson.bossStage;
      if (!boss || boss.status === "BUILDING" || !boss.passed) {
        currentFocus = { type: "BOSS", data: lesson };
        nextLocked = lessons[i + 1]
          ? { type: "SPOON", data: lessons[i + 1] }
          : null;
        break;
      }
    }
  }

  return {
    courseId: course.id,
    lessons,
    currentFocus,
    nextLocked,
  };
}

export async function getLearningPath(userId: string) {
  // Fetch ALL courses for this user (Standard Track & Hard Mode Track)
  const courses = await prisma.foundationCourse.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      targetLanguage: true,
      nativeLanguage: true,
      isHardMode: true,
      lessons: {
        orderBy: { orderIndex: "asc" },
        select: {
          visualContent: true,
          title: true,
          id: true,
          orderIndex: true,
          completedAt: true,
          feedback: true,
          createdAt: true,
        },
      },
      user: { select: { firstName: true, username: true, id: true } },
    },
  });

  const standardCourse = courses.find((c) => !c.isHardMode);
  const hardCourse = courses.find((c) => c.isHardMode);

  if (!standardCourse) return null;

  const [freestyleSessions, redisState, wordMatrix] = await Promise.all([
    prisma.freestyleSession.findMany({
      where: {
        userId,
        status: { in: ["REVIEW_PENDING", "REVIEWED", "COMPLETED"] },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        milestoneIndex: true,
      },
    }),
    getFreestyleRedisState(userId),
    prisma.languageProfile.findUnique({
      where: {
        userId_languageCode: {
          userId,
          languageCode: standardCourse.targetLanguage,
        },
      },
      include: {
        wordStats: {
          orderBy: [
            { spokenAttempts: "desc" },
            { masteryScore: "desc" },
            { seenCount: "desc" },
          ],
        },
      },
    }),
  ]);

  const standardTrack = await hydrateTrack(
    standardCourse,
    userId,
    freestyleSessions,
    redisState.hitDailyCap,
  );
  const hardTrack = hardCourse
    ? await hydrateTrack(
        hardCourse,
        userId,
        freestyleSessions,
        redisState.hitDailyCap,
      )
    : null;

  if (!standardTrack) return null;

  const allStats = wordMatrix?.wordStats ?? [];

  const topWord =
    allStats
      .filter((w) => w.wordType === "WORD")
      .sort(
        (a, b) =>
          b.spokenAttempts - a.spokenAttempts ||
          b.tappedCorrect - a.tappedCorrect ||
          b.seenCount - a.seenCount,
      )[0] ?? null;

  const topPhrase =
    allStats
      .filter((w) => w.wordType === "PHRASE")
      .sort(
        (a, b) =>
          b.spokenAttempts - a.spokenAttempts ||
          b.tappedCorrect - a.tappedCorrect ||
          b.seenCount - a.seenCount,
      )[0] ?? null;

  const spokenItems = allStats.filter(
    (w) => w.spokenAttempts > 0 && w.avgSpokenScore != null,
  );
  const avgPronunciation =
    spokenItems.length > 0
      ? Math.round(
          spokenItems.reduce((sum, w) => sum + (w.avgSpokenScore ?? 0), 0) /
            spokenItems.length,
        )
      : null;

  const avgMastery =
    allStats.length > 0
      ? Math.round(
          allStats.reduce((sum, w) => sum + (w.masteryScore ?? 0), 0) /
            allStats.length,
        )
      : null;

  const statusCounts = {
    MASTERED: allStats.filter((w) => w.status === "MASTERED").length,
    FAMILIAR: allStats.filter((w) => w.status === "FAMILIAR").length,
    LEARNING: allStats.filter((w) => w.status === "LEARNING").length,
    NEW: allStats.filter((w) => w.status === "NEW").length,
  };

  const matrixStats = {
    totalTracked: allStats.length,
    wordsCount: allStats.filter((w) => w.wordType === "WORD").length,
    phrasesCount: allStats.filter((w) => w.wordType === "PHRASE").length,
    totalSpokenAttempts: allStats.reduce((s, w) => s + w.spokenAttempts, 0),
    avgPronunciation,
    avgMastery,
    statusCounts,
    topWord: topWord
      ? {
          word: topWord.word,
          translation: topWord.translation,
          partOfSpeech: topWord.partOfSpeech,
          gender: topWord.grammaticalGender,
          spokenAttempts: topWord.spokenAttempts,
          avgSpokenScore: topWord.avgSpokenScore
            ? Math.round(topWord.avgSpokenScore)
            : null,
          seenCount: topWord.seenCount,
          status: topWord.status,
        }
      : null,
    topPhrase: topPhrase
      ? {
          word: topPhrase.word,
          translation: topPhrase.translation,
          partOfSpeech: topPhrase.partOfSpeech,
          spokenAttempts: topPhrase.spokenAttempts,
          avgSpokenScore: topWord.avgSpokenScore
            ? Math.round(topWord.avgSpokenScore)
            : null,
          seenCount: topPhrase.seenCount,
          status: topPhrase.status,
        }
      : null,
    recentWords: allStats.slice(0, 4).map((w) => ({
      word: w.word,
      translation: w.translation,
      wordType: w.wordType,
      status: w.status,
    })),
  };

  return {
    standardTrack: {
      ...standardTrack,
      targetLanguage: standardCourse.targetLanguage,
      nativeLanguage: standardCourse.nativeLanguage,
      user: standardCourse.user,
    },
    hardTrack: hardTrack && hardCourse
      ? {
          ...hardTrack,
          targetLanguage: hardCourse.targetLanguage,
          nativeLanguage: hardCourse.nativeLanguage,
          user: hardCourse.user,
        }
      : null,
    matrix: wordMatrix
      ? {
          id: wordMatrix.id,
          userId: wordMatrix.userId,
          languageCode: wordMatrix.languageCode,
        }
      : null,
    matrixStats,
  };
}

export type LearningPathData = NonNullable<
  Awaited<ReturnType<typeof getLearningPath>>
>;

export type LearningPath = LearningPathData;

export type LearningTrack = LearningPathData["standardTrack"]; // new