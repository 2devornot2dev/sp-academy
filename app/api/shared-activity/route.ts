// app/api/shared-activity/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guard";
import { getPresignedUrls } from "@/app/actions/s3";

export interface FeedActivityItem {
  id: string;
  type:
    | "BossDefeated"
    | "SpoonCompleted"
    | "RepairArcade"
    | "BookCompleted"
    | "Achievement";
  createdAt: string;
  user: {
    id: string;
    name: string;
    username?: string | null;
    avatarUrl?: string | null;
  };
  badge: string;
  title: string;
  subtitle: string;
  detail?: string | null;
  language?: string | null;
  score?: number | null;
  imageUrl?: string | null;
  liked: boolean;
  likes: number;
}

export async function GET() {
  try {
    const currentUser = await requireUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Query recent completed activities across the new Spoon tables in parallel
    const [
      defeatedBosses,
      completedSpoons,
      completedExercises,
      unlockedAchievements,
      completedBooks,
    ] = await Promise.all([
      // A. Defeated Boss Stages
      prisma.foundationBossStage.findMany({
        where: { passed: true },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              firstName: true,
              username: true,
              image: true,
            },
          },
          course: {
            select: { targetLanguage: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 15,
      }),

      // B. Completed Spoons
      prisma.foundationLesson.findMany({
        where: {
          OR: [{ status: "COMPLETED" }, { completedAt: { not: null } }],
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              firstName: true,
              username: true,
              image: true,
            },
          },
          course: {
            select: { targetLanguage: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 20,
      }),

      // C. Completed 3-Round Sprite Repair Workouts
      prisma.spriteExercise
        .findMany({
          where: { status: "COMPLETED" },
          include: {
            spriteProfile: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    firstName: true,
                    username: true,
                    image: true,
                  },
                },
                sprite: {
                  select: { name: true, avatarUrl: true },
                },
              },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 15,
        })
        .catch(() => []),

      // D. Unlocked Achievements
      prisma.userProgress
        .findMany({
          where: { isUnlocked: true, unlockedAt: { not: null } },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                firstName: true,
                username: true,
                image: true,
              },
            },
            achievement: true,
          },
          orderBy: { unlockedAt: "desc" },
          take: 15,
        })
        .catch(() => []),

      // E. Completed SpoonBooks (Safe fallback if table is empty/unmigrated)
      (prisma as any).userBookProgress
        ?.findMany({
          where: { completedAt: { not: null } },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                firstName: true,
                username: true,
                image: true,
              },
            },
            spoonBook: true,
          },
          orderBy: { completedAt: "desc" },
          take: 15,
        })
        .catch(() => []) ?? Promise.resolve([]),
    ]);

    // 2. Collect S3 image keys from Spoons & Books to presign in a single batch
    const s3KeysToSign: string[] = [];

    for (const spoon of completedSpoons) {
      const imgKey = (spoon.visualContent as any)?.imageS3Key;
      if (imgKey && typeof imgKey === "string") s3KeysToSign.push(imgKey);
    }

    for (const bp of completedBooks) {
      const coverKey = bp.spoonBook?.coverImageS3Key;
      if (coverKey && typeof coverKey === "string") s3KeysToSign.push(coverKey);
    }

    const signedUrls =
      s3KeysToSign.length > 0 ? await getPresignedUrls(s3KeysToSign) : {};

    // 3. Collect all activity IDs to fetch Likes in 1 batch
    const allActivityIds: string[] = [
      ...defeatedBosses.map((b) => b.id),
      ...completedSpoons.map((s) => s.id),
      ...completedExercises.map((e) => e.id),
      ...unlockedAchievements.map((a) => a.id),
      ...completedBooks.map((b: any) => b.id),
    ];

    const [userLikes, likeCounts] = await Promise.all([
      prisma.like.findMany({
        where: {
          userId: currentUser.id,
          activityId: { in: allActivityIds },
        },
        select: { activityId: true },
      }),
      prisma.like.groupBy({
        by: ["activityId"],
        _count: { _all: true },
        where: { activityId: { in: allActivityIds } },
      }),
    ]);

    const likedSet = new Set(userLikes.map((l) => l.activityId));
    const countMap = new Map(
      likeCounts.map((c) => [c.activityId, c._count._all])
    );

    const formatUser = (u: any) => ({
      id: u?.id || "unknown",
      name: u?.firstName || u?.name || u?.username || "Learner",
      username: u?.username ?? null,
      avatarUrl: u?.image ?? null,
    });

    // 4. Normalize all 5 activity streams into unified FeedActivityItem objects
    const items: FeedActivityItem[] = [];

    for (const boss of defeatedBosses) {
      const resObj = (boss.results as any) || {};
      const heartsLeft = resObj.chancesRemaining;
      items.push({
        id: boss.id,
        type: "BossDefeated",
        createdAt: (boss.completedAt || boss.updatedAt).toISOString(),
        user: formatUser(boss.user),
        badge: `👑 Boss Stage ${boss.milestoneIndex}`,
        title: `Conquered Milestone ${boss.milestoneIndex} Boss Stage!`,
        subtitle: "Boss Assessment Defeated",
        detail:
          heartsLeft != null
            ? `Survived with ${heartsLeft} ${
                heartsLeft === 1 ? "heart" : "hearts"
              } remaining · Earned +1 ⚡`
            : "Earned +1 ⚡ Sprite Energy & unlocked next Milestone",
        language: boss.course?.targetLanguage ?? null,
        score: boss.score ?? null,
        imageUrl: null,
        liked: likedSet.has(boss.id),
        likes: countMap.get(boss.id) || 0,
      });
    }

    for (const spoon of completedSpoons) {
      const imgKey = (spoon.visualContent as any)?.imageS3Key;
      const handoff = (spoon.lessonHandoff as any) || {};
      items.push({
        id: spoon.id,
        type: "SpoonCompleted",
        createdAt: (spoon.completedAt || spoon.updatedAt).toISOString(),
        user: formatUser(spoon.user),
        badge: `🥄 Spoon ${spoon.orderIndex}`,
        title: spoon.title || `Spoon ${spoon.orderIndex}`,
        subtitle: "Mastered Spoon Lesson",
        detail: handoff.targetSentence
          ? `"${handoff.targetSentence}"`
          : null,
        language: spoon.course?.targetLanguage ?? null,
        score: null,
        imageUrl: imgKey ? (signedUrls[imgKey] ?? null) : null,
        liked: likedSet.has(spoon.id),
        likes: countMap.get(spoon.id) || 0,
      });
    }

    for (const ex of completedExercises) {
      const u = ex.spriteProfile?.user;
      const spriteName = ex.spriteProfile?.sprite?.name || "Vox";
      items.push({
        id: ex.id,
        type: "RepairArcade",
        createdAt: (ex.completedAt || ex.updatedAt).toISOString(),
        user: formatUser(u),
        badge: `⚡ ${spriteName} Arcade`,
        title: ex.title || "3-Round Mistake Repair Arcade",
        subtitle: `Crushed 3-Round Repair Workout with ${spriteName}`,
        detail: `Cleared Visual Match, Sentence Dash & Voice Burst (+${ex.energyReward} ⚡)`,
        language: ex.spriteProfile?.targetLanguage ?? null,
        score: null,
        imageUrl: ex.spriteProfile?.sprite?.avatarUrl ?? null,
        liked: likedSet.has(ex.id),
        likes: countMap.get(ex.id) || 0,
      });
    }

    for (const ach of unlockedAchievements) {
      items.push({
        id: ach.id,
        type: "Achievement",
        createdAt: (ach.unlockedAt || ach.updatedAt).toISOString(),
        user: formatUser(ach.user),
        badge: "🏆 Achievement",
        title: ach.achievement.name,
        subtitle: "Unlocked Achievement",
        detail: ach.achievement.description ?? null,
        language: null,
        score: null,
        imageUrl: ach.achievement.imageUrl ?? null,
        liked: likedSet.has(ach.id),
        likes: countMap.get(ach.id) || 0,
      });
    }

    for (const bp of completedBooks) {
      const book = bp.spoonBook;
      const trans = book?.translations?.[bp.targetLanguage];
      const coverKey = book?.coverImageS3Key;
      items.push({
        id: bp.id,
        type: "BookCompleted",
        createdAt: (bp.completedAt || bp.updatedAt).toISOString(),
        user: formatUser(bp.user),
        badge: "📕 SpoonBook",
        title: trans?.title || book?.slug || "Interactive Storybook",
        subtitle: "Finished reading interactive book",
        detail: `Starring ${book?.characterName || "Léo"} · Cleared all 5 page checkpoints`,
        language: bp.targetLanguage ?? null,
        score: bp.quizScore ?? 100,
        imageUrl: coverKey ? (signedUrls[coverKey] ?? null) : null,
        liked: likedSet.has(bp.id),
        likes: countMap.get(bp.id) || 0,
      });
    }

    // Sort newest first
    items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      activities: items.slice(0, 35),
    });
  } catch (error) {
    console.error("[shared-activity GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Spoon Feed" },
      { status: 500 }
    );
  }
}