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

export interface HomeDashboardData {
  user: {
    id: string;
    firstName: string;
    name: string;
    avatarUrl: string | null;
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

  const [course, bossStages, spriteProfile, langProfiles] = await Promise.all([
    prisma.foundationCourse.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        lessons: {
          orderBy: { orderIndex: "asc" },
          include: { foundationBridge: true },
        },
      },
    }),
    prisma.foundationBossStage.findMany({
      where: { userId: user.id },
      orderBy: { milestoneIndex: "asc" },
    }),
    prisma.spriteProfile.findUnique({
      where: { userId: user.id },
      include: { sprite: true },
    }),
    prisma.languageProfile.findMany({
      where: { userId: user.id },
      include: {
        wordStats: {
          where: { seenCount: { gt: 0 } },
        },
      },
    }),
  ]);

  const lessons = course?.lessons ?? [];
  const completedLessons = lessons.filter(
    (l) => l.status === "COMPLETED" || Boolean(l.completedAt)
  );
  const spoonsCompleted = completedLessons.length;
  const bridgesCompleted = lessons.filter(
    (l) => l.foundationBridge && Boolean((l.foundationBridge as any).completedAt)
  ).length;
  const bossesDefeated = bossStages.filter((b) => Boolean(b.passed)).length;

  // Compute the 4 WordStat Superlatives: Most Seen, Most Tapped, Most Spoken, Most Heard
  const allWords = langProfiles.flatMap((lp) => lp.wordStats as any[]);
  const totalWordsBanked = allWords.length;

  const spokenWords = allWords.filter(
    (w) => (w.spokenAttempts ?? 0) > 0 && w.avgSpokenScore != null
  );
  const spokenResonanceAvg =
    spokenWords.length > 0
      ? Math.round(
          spokenWords.reduce((acc, w) => acc + (w.avgSpokenScore || 0), 0) /
            spokenWords.length
        )
      : 0;

  const pickTop = (
    list: any[],
    scoreFn: (w: any) => number,
    subFn: (w: any, val: number) => string
  ): WordSuperlative | null => {
    if (list.length === 0) return null;
    const sorted = [...list].sort((a, b) => scoreFn(b) - scoreFn(a));
    const best = sorted[0];
    const val = scoreFn(best);
    if (!best || val <= 0) return null;
    return {
      word: best.word,
      translation: best.translation || "Vocabulary item",
      count: val,
      subLabel: subFn(best, val),
    };
  };

  const mostSeen = pickTop(
    allWords,
    (w) => Number(w.seenCount ?? 0),
    (_, v) => `Seen ${v}x in lessons`
  );

  const mostTapped = pickTop(
    allWords,
    (w) => Number(w.tappedCorrect ?? 0) + Number(w.tappedWrong ?? 0),
    (w, v) => `${v} taps (${w.tappedCorrect ?? v} correct)`
  );

  const mostSpoken = pickTop(
    allWords,
    (w) => Number(w.spokenAttempts ?? 0),
    (w, v) =>
      `Spoken ${v}x${
        w.avgSpokenScore != null ? ` · ${Math.round(w.avgSpokenScore)}% avg` : ""
      }`
  );

  const mostHeard = pickTop(
    allWords,
    (w) => Number(w.heardCount ?? w.seenCount ?? 0),
    (_, v) => `Heard ${v}x in audio`
  );

  // Determine Slim Upcoming Focus
  const courseId = course?.id ?? "default";
  const currentMilestone = bossesDefeated + 1;
  const spoonsInCurrentCycle = spoonsCompleted % 3;

  const lessonWithBridgeDue = completedLessons.find(
    (l) => l.foundationBridge && !(l.foundationBridge as any).completedAt
  );
  const activeBossDue = bossStages.find(
    (b) => b.milestoneIndex === currentMilestone && !b.passed
  );
  const nextSpoonLesson =
    lessons.find((l) => l.status !== "COMPLETED" && !l.completedAt) ??
    lessons[lessons.length - 1];

  let focusType: "SPOON" | "BRIDGE" | "BOSS" = "SPOON";
  let upcomingTitle =
    nextSpoonLesson?.title || `Spoon ${spoonsCompleted + 1}`;
  let upcomingHref = nextSpoonLesson
    ? `/foundation/${nextSpoonLesson.id}/${courseId}`
    : "/learning-hub";
  let ctaLabel = `Start Spoon ${
    nextSpoonLesson?.orderIndex ?? spoonsCompleted + 1
  }`;

  if (activeBossDue && spoonsCompleted >= currentMilestone * 3) {
    focusType = "BOSS";
    upcomingTitle = `Boss Stage ${currentMilestone}`;
    upcomingHref = `/foundation/boss/${activeBossDue.id}`;
    ctaLabel = `Challenge Boss ${currentMilestone}`;
  } else if (lessonWithBridgeDue?.foundationBridge) {
    focusType = "BRIDGE";
    upcomingTitle = `Vocab Bridge ${lessonWithBridgeDue.orderIndex}`;
    upcomingHref = `/foundation/vocab/${lessonWithBridgeDue.foundationBridge.id}`;
    ctaLabel = `Unlock Bridge ${lessonWithBridgeDue.orderIndex}`;
  }

  const stepsUntilNextBoss =
    focusType === "BOSS"
      ? 0
      : Math.max(1, currentMilestone * 3 - spoonsCompleted);

  const nextBossReward =
    BOSS_UNLOCK_CATALOG[currentMilestone - 1] ||
    `Milestone ${currentMilestone} Crown`;

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
      currentMilestone,
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