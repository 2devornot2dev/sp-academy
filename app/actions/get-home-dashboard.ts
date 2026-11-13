// app/actions/get-home-dashboard.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guard";

export interface WordSuperlative {
  word: string;
  translation: string;
  count: number;
  subLabel: string;
}
export interface UserProfileData {
  id: string;
  email: string;
  image: string | null;
  avatarUrl: string | null;
  username: string | null;
  firstName: string | null;
  displayUsername: string | null;
}

export interface HomeDashboardData {
  user: {
    id: string;
    firstName: string;
    name: string;
    avatarUrl: string | null;
    profile: UserProfileData | null;
  };
  languageCard: {
    courseId: string;
    nativeLanguage: string;
    targetLanguage: string;
    languageLabel: string;
    flag: string;
    rankTitle: string;
    tierNumber: number;
    spoonsCompleted: number;
    bridgesCompleted: number;
    bossesDefeated: number;
    totalWordsBanked: number;
    spokenResonanceAvg: number;
    currentMilestone: number;
    spoonsInCurrentCycle: number; // 0, 1, 2, or 3
  };
  wordSuperlatives: {
    mostSeen: WordSuperlative | null;
    mostTapped: WordSuperlative | null;
    mostSpoken: WordSuperlative | null;
    mostHeard: WordSuperlative | null;
  };
  sprite: {
    name: string;
    slug: string;
    avatarUrl: string;
    energy: number;
    maxEnergy: number;
    isSnoozing: boolean;
  };
  upcoming: {
    focusType: "SPOON" | "BRIDGE" | "BOSS";
    title: string;
    href: string;
    ctaLabel: string;
    stepsUntilNextBoss: number;
    nextBossReward: string;
  };
}

const BOSS_UNLOCK_CATALOG = [
  "Storybook #1: The Midnight Ticket",
  "3-Round Mistake Repair Arcade",
  "Storybook #2: The Missing Croissant",
  "Bistro Regular Rank Emblem",
  "Storybook #3: Table for Two",
  "Street Conversationalist Frame",
  "VIP Immersion Vault",
  "Native Flow Certification",
];

const RANK_TITLES = [
  "Day-One Explorer",
  "Café Regular",
  "Street Survivor",
  "Bistro Conversationalist",
  "Fluent Navigator",
  "Local Insider",
  "Master Speaker",
];

function getLanguageMeta(code?: string | null) {
  const c = (code || "fr-FR").toLowerCase();
  if (c.startsWith("fr")) return { label: "French", flag: "🇫🇷" };
  if (c.startsWith("es")) return { label: "Spanish", flag: "🇪🇸" };
  return { label: "English", flag: "🇬🇧" };
}

export async function getHomeDashboardData(): Promise<HomeDashboardData | null> {
  const user = await requireUser();
  if (!user) return null;

  const course = await prisma.foundationCourse.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      lessons: {
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  const courseId = course?.id ?? "default";
  const targetLang = course?.targetLanguage || "fr-FR";

  const [
    bridges,
    bossStages,
    freestyleSessions,
    spriteProfile,
    wordMatrix,
    userProfile,
  ] = await Promise.all([
    course
      ? prisma.foundationBridge.findMany({
          where: { foundationCourseId: course.id, userId: user.id },
          orderBy: { bridgeIndex: "asc" },
        })
      : Promise.resolve([]),
    course
      ? prisma.foundationBossStage.findMany({
          where: { foundationCourseId: course.id, userId: user.id },
          orderBy: { milestoneIndex: "asc" },
        })
      : Promise.resolve([]),
    prisma.freestyleSession.findMany({
      where: {
        userId: user.id,
        status: { in: ["REVIEW_PENDING", "REVIEWED", "COMPLETED"] },
      },
      select: {
        id: true,
        milestoneIndex: true,
        createdAt: true,
      },
    }),
    prisma.spriteProfile.findUnique({
      where: { userId: user.id },
      include: { sprite: true },
    }),
    prisma.languageProfile.findUnique({
      where: {
        userId_languageCode: {
          userId: user.id,
          languageCode: targetLang,
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
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        image: true,
        avatarUrl: true,
        username: true,
        firstName: true,
        displayUsername: true,
      },
    }),
  ]);

const bridgeByIndex = new Map(
    bridges.map((b) => [b.bridgeIndex, b] as const),
  );
  const bossByMilestoneIndex = new Map(
    bossStages.map((b) => [b.milestoneIndex, b] as const),
  );

  // Check 5-per-day cap for Freestyle sessions
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todaySessionCount = freestyleSessions.filter(
    (s) => new Date(s.createdAt) >= startOfToday,
  ).length;
  const hitDailyCap = todaySessionCount >= 5;

  const lessons = (course?.lessons ?? []).map((lesson) => {
    const isMilestone = lesson.orderIndex % 3 === 0;
    const milestoneIndex = isMilestone ? lesson.orderIndex / 3 : null;
    return {
      ...lesson,
      bridge: bridgeByIndex.get(lesson.orderIndex) ?? null,
      bossStage: milestoneIndex
        ? (bossByMilestoneIndex.get(milestoneIndex) ?? null)
        : null,
    };
  });

  const spoonsCompleted = lessons.filter((l) => Boolean(l.completedAt)).length;
  const bridgesCompleted = bridges.filter((b) => Boolean(b.passed)).length;
  const bossesDefeated = bossStages.filter((b) => Boolean(b.passed)).length;

  // =========================================================================
  // EXACT SAME PROGRESSION LOOP AS getLearningPath(userId)
  // =========================================================================
  let focusType: "SPOON" | "BRIDGE" | "BOSS" = "SPOON";
  let upcomingTitle = `Spoon ${spoonsCompleted + 1}`;
  let upcomingHref = "/learning-hub";
  let ctaLabel = `Start Spoon ${spoonsCompleted + 1}`;
  let activeMilestoneIndex = bossesDefeated + 1;

  for (let i = 0; i < lessons.length; i++) {
    const lesson = lessons[i];
    const mIdx = Math.ceil(lesson.orderIndex / 3);

    // 1. Spoon not completed yet
    if (!lesson.completedAt) {
      focusType = "SPOON";
      activeMilestoneIndex = mIdx;
      upcomingTitle = lesson.title || `Spoon ${lesson.orderIndex}`;
      upcomingHref = `/foundation/${lesson.id}/${courseId}`;
      ctaLabel = `Start Spoon ${lesson.orderIndex}`;
      break;
    }

    // 2. Spoon completed, but Bridge not passed yet
    if (!lesson.bridge || !lesson.bridge.passed) {
      focusType = "BRIDGE";
      activeMilestoneIndex = mIdx;
      upcomingTitle = `Vocab Bridge ${lesson.orderIndex}`;
      upcomingHref = lesson.bridge
        ? `/foundation/vocab/${lesson.bridge.id}`
        : "/learning-hub";
      ctaLabel = `Start Bridge ${lesson.orderIndex}`;
      break;
    }

    // 3. Every 3rd Spoon: after Bridge is passed, check Boss Stage!
    if (lesson.orderIndex % 3 === 0) {
      const boss = lesson.bossStage;
      if (!boss || boss.status === "BUILDING" || !boss.passed) {
        focusType = "BOSS";
        activeMilestoneIndex = mIdx;

        const hasConvoForMilestone = freestyleSessions.some(
          (s) => s.milestoneIndex === mIdx,
        );
        const freestyleUnlocked =
          Boolean(boss?.passed) || hasConvoForMilestone || hitDailyCap;

        if (!boss || boss.status === "BUILDING") {
          upcomingTitle = `Building Boss Stage ${mIdx}...`;
          upcomingHref = "/learning-hub";
          ctaLabel = `View Boss Stage ${mIdx}`;
        } else if (!freestyleUnlocked) {
          upcomingTitle = `Unlock Boss Stage ${mIdx}`;
          upcomingHref = "/conversation";
          ctaLabel = `Start 3-Min AI Chat`;
        } else {
          upcomingTitle = `Boss Stage ${mIdx}`;
          upcomingHref = `/foundation/boss/${boss.id}`;
          ctaLabel = `Challenge Boss ${mIdx}`;
        }
        break;
      }
    }
  }

  // Compute how many Spoons in the active milestone cycle (1..3) are fully done (Spoon + Bridge)
  const cycleStartOrder = (activeMilestoneIndex - 1) * 3 + 1;
  const cycleEndOrder = activeMilestoneIndex * 3;
  const cycleLessons = lessons.filter(
    (l) => l.orderIndex >= cycleStartOrder && l.orderIndex <= cycleEndOrder,
  );
  const spoonsInCurrentCycle = cycleLessons.filter(
    (l) => Boolean(l.completedAt) && Boolean(l.bridge?.passed),
  ).length;

  const stepsUntilNextBoss =
    focusType === "BOSS" ? 0 : Math.max(1, 3 - spoonsInCurrentCycle);

  // =========================================================================
  // WORD MATRIX STATS (Matches getLearningPath exactly!)
  // =========================================================================
  const allWords = (wordMatrix?.wordStats ?? []) as any[];
  const totalWordsBanked = allWords.length;

  const spokenWords = allWords.filter(
    (w) => (w.spokenAttempts ?? 0) > 0 && w.avgSpokenScore != null,
  );
  const spokenResonanceAvg =
    spokenWords.length > 0
      ? Math.round(
          spokenWords.reduce((acc, w) => acc + (w.avgSpokenScore || 0), 0) /
            spokenWords.length,
        )
      : 0;

  const usedWords = new Set<string>();

  const pickTopUnique = (
    list: any[],
    scoreFn: (w: any) => number,
    subFn: (w: any, val: number) => string,
  ): WordSuperlative | null => {
    if (list.length === 0) return null;
    const candidates = list.filter(
      (w) => w?.word && !usedWords.has(String(w.word).toLowerCase()),
    );
    const pool = candidates.length > 0 ? candidates : list;
    const sorted = [...pool].sort((a, b) => scoreFn(b) - scoreFn(a));
    const best = sorted[0];
    const val = best ? scoreFn(best) : 0;
    if (!best || val <= 0) return null;

    usedWords.add(String(best.word).toLowerCase());
    return {
      word: best.word,
      translation: best.translation || "Vocabulary item",
      count: val,
      subLabel: subFn(best, val),
    };
  };

  const mostSpoken = pickTopUnique(
    allWords,
    (w) => Number(w.spokenAttempts ?? 0),
    (w, v) =>
      `${v}x${
        w.avgSpokenScore != null ? ` · ${Math.round(w.avgSpokenScore)}%` : ""
      }`,
  );

  const mostTapped = pickTopUnique(
    allWords,
    (w) => Number(w.tappedCorrect ?? 0) + Number(w.tappedWrong ?? 0),
    (w, v) => `${v} taps (${w.tappedCorrect ?? v} hit)`,
  );

  const mostHeard = pickTopUnique(
    allWords,
    (w) => Number(w.heardCount ?? w.seenCount ?? 0),
    (_, v) => `Heard ${v}x`,
  );

  const mostSeen = pickTopUnique(
    allWords,
    (w) => Number(w.seenCount ?? 0),
    (_, v) => `Seen ${v}x`,
  );

  const nextBossReward =
    BOSS_UNLOCK_CATALOG[activeMilestoneIndex - 1] ||
    `Milestone ${activeMilestoneIndex} Crown`;

  const langMeta = getLanguageMeta(course?.targetLanguage);
  const rankTitle =
    RANK_TITLES[Math.min(RANK_TITLES.length - 1, bossesDefeated)];

  return {
    user: {
      id: user.id,
      firstName:
        (user as any).firstName || user.name?.split(" ")[0] || "Learner",
      name: user.name || (user as any).firstName || "Learner",
      avatarUrl: user.image ?? null,
      profile: userProfile ?? null,
    },
    languageCard: {
      courseId,
      nativeLanguage: course?.nativeLanguage || "en-US",
      targetLanguage: course?.targetLanguage || "fr-FR",
      languageLabel: langMeta.label,
      flag: langMeta.flag,
      rankTitle,
      tierNumber: bossesDefeated + 1,
      spoonsCompleted,
      bridgesCompleted,
      bossesDefeated,
      totalWordsBanked,
      spokenResonanceAvg,
      currentMilestone: activeMilestoneIndex,
      spoonsInCurrentCycle,
    },
    wordSuperlatives: {
      mostSeen,
      mostTapped,
      mostSpoken,
      mostHeard,
    },
    sprite: {
      name: spriteProfile?.sprite?.name || "Vox",
      slug: spriteProfile?.sprite?.slug || "vox",
      avatarUrl: spriteProfile?.sprite?.avatarUrl || "/sprite-m.png",
      energy: (spriteProfile as any)?.energy ?? 1,
      maxEnergy: (spriteProfile as any)?.maxEnergy ?? 3,
      isSnoozing: focusType === "BRIDGE",
    },
    upcoming: {
      focusType,
      title: upcomingTitle,
      href: upcomingHref,
      ctaLabel,
      stepsUntilNextBoss,
      nextBossReward,
    },
  };
}