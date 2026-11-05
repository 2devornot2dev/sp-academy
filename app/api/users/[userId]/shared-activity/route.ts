// app/api/shared-activity/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isUser, requireUser } from "@/lib/auth-guard";
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
    displayUsername?: string | null;
    username?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
    image?: string | null;
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

interface Params {
  params : Promise<{ userId: string }>
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const currentUser = await requireUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId } = await params;
    const user = await isUser(userId);


    const [rawBosses, rawSpoons, rawExercises, rawAchievements, rawBooks] =
      await Promise.all([
        prisma.foundationBossStage
          .findMany({
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
              course: { select: { targetLanguage: true } },
            },
            orderBy: { updatedAt: "desc" },
            take: 15,
          })
          .catch(() => []),

        prisma.foundationLesson
          .findMany({
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
              course: { select: { targetLanguage: true } },
            },
            orderBy: { updatedAt: "desc" },
            take: 20,
          })
          .catch(() => []),

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
                  sprite: { select: { name: true, avatarUrl: true } },
                },
              },
            },
            orderBy: { updatedAt: "desc" },
            take: 15,
          })
          .catch(() => []),

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

        // 🟢 NEW: Fetch Completed Books
        prisma.userBookProgress
          .findMany({
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
              spoonBook: {
                select: {
                  slug: true,
                  characterName: true,
                  coverImageS3Key: true,
                  translations: true,
                },
              },
            },
            orderBy: { completedAt: "desc" },
            take: 15,
          })
          .catch(() => []),
      ]);

    const defeatedBosses = Array.isArray(rawBosses) ? rawBosses : [];
    const completedSpoons = Array.isArray(rawSpoons) ? rawSpoons : [];
    const completedExercises = Array.isArray(rawExercises) ? rawExercises : [];
    const unlockedAchievements = Array.isArray(rawAchievements) ? rawAchievements : [];
    const completedBooks = Array.isArray(rawBooks) ? rawBooks : [];

    // Sign S3 Spoon Images AND Book Cover Images in 1 batch
    const s3KeysToSign: string[] = [];
    for (const spoon of completedSpoons) {
      const imgKey = (spoon.visualContent as any)?.imageS3Key;
      if (imgKey && typeof imgKey === "string") s3KeysToSign.push(imgKey);
    }
    for (const bookProgress of completedBooks) {
      const coverKey = bookProgress.spoonBook?.coverImageS3Key;
      if (coverKey && typeof coverKey === "string" && !coverKey.startsWith("http")) {
        s3KeysToSign.push(coverKey);
      }
    }

    const signedUrls =
      s3KeysToSign.length > 0
        ? await getPresignedUrls(s3KeysToSign).catch(() => ({}))
        : {};

    const allActivityIds: string[] = [
      ...defeatedBosses.map((b) => b.id),
      ...completedSpoons.map((s) => s.id),
      ...completedExercises.map((e) => e.id),
      ...unlockedAchievements.map((a) => a.id),
      ...completedBooks.map((b) => b.id), // 🟢 Include Book IDs for likes
    ];

    const [userLikes, likeCounts] = await Promise.all([
      prisma.like
        .findMany({
          where: {
            userId: currentUser.id,
            activityId: { in: allActivityIds },
          },
          select: { activityId: true },
        })
        .catch(() => []),
      prisma.like
        .groupBy({
          by: ["activityId"],
          _count: { _all: true },
          where: { activityId: { in: allActivityIds } },
        })
        .catch(() => []),
    ]);

    const likedSet = new Set((userLikes || []).map((l) => l.activityId));
    const countMap = new Map<string, number>(
      (likeCounts || []).map((c: any): [string, number] => [
        c.activityId,
        c._count?._all || 0,
      ]),
    );

    const formatUser = (u: any) => ({
      id: u?.id || "unknown",
      name: u?.firstName || u?.name || u?.username || "Learner",
      username: u?.username ?? null,
      avatarUrl: u?.image ?? null,
    });

    const items: FeedActivityItem[] = [];

    // Map Bosses
    for (const boss of defeatedBosses) {
      const resObj = (boss.results as any) || {};
      const heartsLeft = resObj.chancesRemaining;
      items.push({
        id: boss.id,
        type: "BossDefeated",
        createdAt: new Date(boss.completedAt || boss.updatedAt).toISOString(),
        user: formatUser(boss.user),
        badge: `👑 Boss ${boss.milestoneIndex}`,
        title: `Conquered Boss Stage ${boss.milestoneIndex}!`,
        subtitle: "Boss Assessment Defeated",
        detail:
          heartsLeft != null
            ? `${heartsLeft} ${
                heartsLeft === 1 ? "heart" : "hearts"
              } left · +1 ⚡ Energy`
            : "Earned +1 ⚡ Sprite Energy",
        language: boss.course?.targetLanguage ?? null,
        score: boss.score ?? null,
        imageUrl: null,
        liked: likedSet.has(boss.id),
        likes: countMap.get(boss.id) || 0,
      });
    }

    // Map Spoons
    for (const spoon of completedSpoons) {
      const imgKey = (spoon.visualContent as any)?.imageS3Key;
      const handoff = (spoon.lessonHandoff as any) || {};
      items.push({
        id: spoon.id,
        type: "SpoonCompleted",
        createdAt: new Date(spoon.completedAt || spoon.updatedAt).toISOString(),
        user: formatUser(spoon.user),
        badge: `🥄 Spoon ${spoon.orderIndex}`,
        title: spoon.title || `Spoon ${spoon.orderIndex}`,
        subtitle: "Mastered Spoon",
        detail: handoff.targetSentence ? `"${handoff.targetSentence}"` : null,
        language: spoon.course?.targetLanguage ?? null,
        score: null,
        imageUrl: imgKey ? ((signedUrls as any)[imgKey] ?? null) : null,
        liked: likedSet.has(spoon.id),
        likes: countMap.get(spoon.id) || 0,
      });
    }

    // Map Exercises
    for (const ex of completedExercises) {
      const u = ex.spriteProfile?.user;
      const spriteName = ex.spriteProfile?.sprite?.name || "Vox";
      items.push({
        id: ex.id,
        type: "RepairArcade",
        createdAt: new Date(ex.completedAt || ex.updatedAt).toISOString(),
        user: formatUser(u),
        badge: `⚡ ${spriteName} Arcade`,
        title: ex.title || "3-Round Repair Arcade",
        subtitle: `Crushed Repair Workout`,
        detail: `Earned +${ex.energyReward} ⚡ Sprite Energy`,
        language: ex.spriteProfile?.targetLanguage ?? null,
        score: null,
        imageUrl: ex.spriteProfile?.sprite?.avatarUrl ?? null,
        liked: likedSet.has(ex.id),
        likes: countMap.get(ex.id) || 0,
      });
    }

    // Map Achievements
    for (const ach of unlockedAchievements) {
      if (!ach.achievement) continue;
      items.push({
        id: ach.id,
        type: "Achievement",
        createdAt: new Date(ach.unlockedAt || ach.updatedAt).toISOString(),
        user: formatUser(ach.user),
        badge: "🏆 Trophy",
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

    // 🟢 NEW: Map Completed Books
    for (const bookProgress of completedBooks) {
      const coverKey = bookProgress.spoonBook?.coverImageS3Key;
      let coverUrl = null;
      if (coverKey) {
        coverUrl = coverKey.startsWith("http")
          ? coverKey
          : (signedUrls as any)[coverKey] ?? null;
      }

      // Safely extract localized title from JSON, fallback to slug
      const translations = (bookProgress.spoonBook?.translations || {}) as any;
      const activeLangData = translations[bookProgress.targetLanguage];
      const title =
        activeLangData?.title ||
        bookProgress.spoonBook?.slug ||
        "An Interactive Story";

      items.push({
        id: bookProgress.id,
        type: "BookCompleted",
        createdAt: new Date(bookProgress.completedAt || bookProgress.updatedAt).toISOString(),
        user: formatUser(bookProgress.user),
        badge: `📖 Story Completed`,
        title: `Finished reading "${title}"`,
        subtitle: `Starring ${bookProgress.spoonBook?.characterName}`,
        detail: `Read in ${bookProgress.targetLanguage.split("-")[0].toUpperCase()}`,
        language: bookProgress.targetLanguage,
        score: bookProgress.quizScore ?? null,
        imageUrl: coverUrl,
        liked: likedSet.has(bookProgress.id),
        likes: countMap.get(bookProgress.id) || 0,
      });
    }

    // Sort all activities by date
    items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return NextResponse.json({
      activities: items.slice(0, 35),
    });
  } catch (error) {
    console.error("[shared-activity GET] Error:", error);
    return NextResponse.json({ activities: [] }, { status: 200 });
  }
}