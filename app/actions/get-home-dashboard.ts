// app/actions/get-home-dashboard.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guard";

export interface BossVaultSlot {
  milestoneIndex: number;
  passed: boolean;
  score: number | null;
  unlockTitle: string;
  unlockType: string;
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
    subStepInMilestone: number;
    bossVault: BossVaultSlot[];
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
    subtitle: string;
    href: string;
    ctaLabel: string;
    stepsUntilNextBoss: number;
    nextBossReward: string;
  };
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    imageUrl: string | null;
    unlockedAt: string | null;
    isUnlocked: boolean;
  }>;
}

const BOSS_UNLOCK_CATALOG: Array<{ title: string; type: string }> = [
  { title: "Storybook #1: The Midnight Ticket", type: "📕 SpoonBook" },
  { title: "3-Round Mistake Repair Arcade", type: "⚡ Arcade Mode" },
  { title: "Storybook #2: The Missing Croissant", type: "📕 SpoonBook" },
  { title: "Bistro Regular Rank Emblem", type: "🛡️ Rank Tier" },
  { title: "Storybook #3: Table for Two", type: "📕 SpoonBook" },
  { title: "Street Conversationalist Frame", type: "👑 Prestige" },
  { title: "VIP Immersion Vault", type: "🔥 Mastery" },
  { title: "Native Flow Certification", type: "🏆 Milestone" },
];

const RANK_TITLES = [
  "Tier 1 · Day-One Explorer",
  "Tier 2 · Café Regular",
  "Tier 3 · Street Survivor",
  "Tier 4 · Bistro Conversationalist",
  "Tier 5 · Fluent Navigator",
  "Tier 6 · Local Insider",
  "Tier 7 · Master Speaker",
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

  const [
    course,
    bossStages,
    spriteProfile,
    langProfiles,
    allAchievements,
    userProgress,
  ] = await Promise.all([
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
          select: { avgSpokenScore: true, spokenAttempts: true },
        },
      },
    }),
    prisma.achievement
      .findMany({
        orderBy: { createdAt: "asc" },
        take: 12,
      })
      .catch(() => []),
    prisma.userProgress
      .findMany({
        where: { userId: user.id },
        include: { achievement: true },
      })
      .catch(() => []),
  ]);

  const lessons = course?.lessons ?? [];

  const completedLessons = lessons.filter(
    (l) => l.status === "COMPLETED" || Boolean(l.completedAt)
  );
  const spoonsCompleted = completedLessons.length;

  const bridgesCompleted = lessons.filter(
    (l) => l.foundationBridge && Boolean((l.foundationBridge as any).completedAt)
  ).length;

  const defeatedBossStages = bossStages.filter((b) => Boolean(b.passed));
  const bossesDefeated = defeatedBossStages.length;

  // Word Matrix stats
  const allSeenWords = langProfiles.flatMap((lp) => lp.wordStats);
  const totalWordsBanked = allSeenWords.length;
  const spokenWords = allSeenWords.filter(
    (w) => (w.spokenAttempts ?? 0) > 0 && w.avgSpokenScore != null
  );
  const spokenResonanceAvg =
    spokenWords.length > 0
      ? Math.round(
          spokenWords.reduce((acc, w) => acc + (w.avgSpokenScore || 0), 0) /
            spokenWords.length
        )
      : 0;

  // Auto-Unlock Achievements in UserProgress if criteria thresholds are met
  const unlockedMap = new Map<string, any>();
  for (const up of userProgress) {
    if (up?.achievementId) {
      unlockedMap.set(String(up.achievementId), up);
    }
  }

  for (const ach of allAchievements) {
    const existingUp = unlockedMap.get(ach.id);
    if (existingUp?.isUnlocked) continue;

    const crit = (ach.criteria as Record<string, any>) || {};
    const shouldUnlock =
      (crit.spoons && spoonsCompleted >= Number(crit.spoons)) ||
      (crit.bosses && bossesDefeated >= Number(crit.bosses)) ||
      (crit.words && totalWordsBanked >= Number(crit.words));

    if (shouldUnlock) {
      try {
        const created = await prisma.userProgress.create({
          data: {
            userId: user.id,
            achievementId: ach.id,
            isUnlocked: true,
            unlockedAt: new Date(),
          },
          include: { achievement: true },
        });
        unlockedMap.set(ach.id, created);
      } catch {
        // Ignore race condition
      }
    }
  }

  // Determine Upcoming Focus (Next Spoon vs Vocab Bridge vs Boss Stage)
  const courseId = course?.id ?? "default";
  const currentMilestone = bossesDefeated + 1;
  const subStepInMilestone = (spoonsCompleted % 3) + 1;

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
  let upcomingSubtitle = `Spoon ${
    nextSpoonLesson?.orderIndex ?? spoonsCompleted + 1
  } · Audio & Speech Mission`;
  let upcomingHref = nextSpoonLesson
    ? `/foundation/${nextSpoonLesson.id}/${courseId}`
    : "/learning-hub";
  let ctaLabel = `Start Spoon ${
    nextSpoonLesson?.orderIndex ?? spoonsCompleted + 1
  }`;

  if (activeBossDue && spoonsCompleted >= currentMilestone * 3) {
    focusType = "BOSS";
    upcomingTitle = `Boss Stage ${currentMilestone}`;
    upcomingSubtitle = "3 Hearts · Timed Survival Assessment";
    upcomingHref = `/foundation/boss/${activeBossDue.id}`;
    ctaLabel = `Challenge Boss ${currentMilestone}`;
  } else if (lessonWithBridgeDue?.foundationBridge) {
    focusType = "BRIDGE";
    upcomingTitle =
      lessonWithBridgeDue.title ||
      `Vocab Bridge ${lessonWithBridgeDue.orderIndex}`;
    upcomingSubtitle = `Vocab Bridge ${lessonWithBridgeDue.orderIndex} · Lock words into Matrix`;
    upcomingHref = `/foundation/vocab/${lessonWithBridgeDue.foundationBridge.id}`;
    ctaLabel = `Complete Bridge ${lessonWithBridgeDue.orderIndex}`;
  }

  // Build 8-slot Boss Crown Vault
  const bossVault: BossVaultSlot[] = Array.from({ length: 8 }).map((_, i) => {
    const mIdx = i + 1;
    const dbBoss = bossStages.find((b) => b.milestoneIndex === mIdx);
    const reward =
      BOSS_UNLOCK_CATALOG[i] || {
        title: `Milestone ${mIdx} Prestige Crown`,
        type: "👑 Crown",
      };

    return {
      milestoneIndex: mIdx,
      passed: Boolean(dbBoss?.passed),
      score: dbBoss?.score ?? null,
      unlockTitle: reward.title,
      unlockType: reward.type,
    };
  });

  const nextBossReward =
    BOSS_UNLOCK_CATALOG[currentMilestone - 1]?.title ||
    `Milestone ${currentMilestone} Crown`;

  const stepsUntilNextBoss =
    focusType === "BOSS"
      ? 0
      : Math.max(1, currentMilestone * 3 - spoonsCompleted);

  const langMeta = getLanguageMeta(course?.targetLanguage);
  const rankTitle =
    RANK_TITLES[Math.min(RANK_TITLES.length - 1, bossesDefeated)];

  const builtInAchievements = [
    {
      id: "builtin-first-spoon",
      name: "First Words Spoken",
      description: "Complete your very first Spoon audio lesson.",
      imageUrl: null,
      unlockedAt: spoonsCompleted >= 1 ? new Date().toISOString() : null,
      isUnlocked: spoonsCompleted >= 1,
    },
    {
      id: "builtin-first-boss",
      name: "First Boss Crown",
      description: "Survive Boss Stage 1 with at least 1 heart remaining.",
      imageUrl: null,
      unlockedAt: bossesDefeated >= 1 ? new Date().toISOString() : null,
      isUnlocked: bossesDefeated >= 1,
    },
    {
      id: "builtin-ten-spoons",
      name: "Double-Digit Momentum",
      description: "Complete 10 custom-baked Spoons.",
      imageUrl: null,
      unlockedAt: spoonsCompleted >= 10 ? new Date().toISOString() : null,
      isUnlocked: spoonsCompleted >= 10,
    },
    {
      id: "builtin-word-centurion",
      name: "Lexicon Centurion",
      description: "Bank 100+ active words in your Word Matrix.",
      imageUrl: null,
      unlockedAt: totalWordsBanked >= 100 ? new Date().toISOString() : null,
      isUnlocked: totalWordsBanked >= 100,
    },
  ];

  return {
    user: {
      id: user.id,
      firstName:
        (user as any).firstName || user.name?.split(" ")[0] || "Learner",
      name: user.name || "Learner",
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
      subStepInMilestone,
      bossVault,
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
      subtitle: upcomingSubtitle,
      href: upcomingHref,
      ctaLabel,
      stepsUntilNextBoss,
      nextBossReward,
    },
    achievements: builtInAchievements,
  };
}