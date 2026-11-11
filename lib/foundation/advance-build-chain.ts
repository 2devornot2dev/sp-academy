// lib/foundation/advance-build-chain.ts
"use server";

import { prisma } from "@/lib/prisma";
import { toLanguageCode } from "@/lib/languages";
import { invokeEduBuilder } from "@/app/actions/invoke-edu-builder";
import { triggerMilestoneBossAndNextSpoon } from "@/lib/foundation/trigger-milestone-boss";

const HARD_MODE_SPOON_OFFSET = 900; // Hard Spoon 1 = orderIndex 901 (Milestone 301)

export async function advanceMilestoneBuildChain({
  courseId,
  completedSpoonNumber,
}: {
  courseId: string;
  completedSpoonNumber: number;
}) {
  try {
    const milestoneIndex = Math.ceil(completedSpoonNumber / 3);
    const subStep = ((completedSpoonNumber - 1) % 3) + 1;

    const course = await prisma.foundationCourse.findUnique({
      where: { id: courseId },
      include: {
        user: { select: { id: true, firstName: true, gender: true } },
      },
    });

    if (!course) return;

    const userId = course.userId;
    const targetLanguage = toLanguageCode(course.targetLanguage);
    const nativeLanguage = toLanguageCode(course.nativeLanguage);

    if (subStep === 1 || subStep === 2) {
      const currentLesson = await prisma.foundationLesson.findUnique({
        where: {
          foundationCourseId_orderIndex: {
            foundationCourseId: courseId,
            orderIndex: completedSpoonNumber,
          },
        },
        select: { id: true, lessonHandoff: true },
      });

      if (!currentLesson?.lessonHandoff) return;

      const nextSpoonNumber = completedSpoonNumber + 1;

      const existingNextLesson = await prisma.foundationLesson.findUnique({
        where: {
          foundationCourseId_orderIndex: {
            foundationCourseId: courseId,
            orderIndex: nextSpoonNumber,
          },
        },
        select: { id: true },
      });

      if (existingNextLesson) return;

      await invokeEduBuilder({
        userId,
        firstName: course.user?.firstName || "Learner",
        gender: course.user?.gender || "N",
        foundationCourseId: courseId,
        spoon: nextSpoonNumber,
        nativeLanguage,
        targetLanguage,
        levelBand: "unspecified",
        goal: "unspecified",
        scriptComfort: "unspecified",
        type: "lang",
        isOnboarding: false,
      });

      return;
    }

    if (subStep === 3) {
      const startIndex = (milestoneIndex - 1) * 3 + 1;
      const endIndex = milestoneIndex * 3;

      const [lessons, bridges] = await Promise.all([
        prisma.foundationLesson.findMany({
          where: {
            foundationCourseId: courseId,
            orderIndex: { gte: startIndex, lte: endIndex },
          },
          select: { id: true, lessonHandoff: true, grammarContent: true },
        }),
        prisma.foundationBridge.findMany({
          where: {
            foundationCourseId: courseId,
            bridgeIndex: { gte: startIndex, lte: endIndex },
          },
          select: { id: true, vocabMoment: true },
        }),
      ]);

      const allLessonsReady =
        lessons.length === 3 &&
        lessons.every((l) => Boolean(l.lessonHandoff && l.grammarContent));
      const allBridgesReady =
        bridges.length === 3 && bridges.every((b) => Boolean(b.vocabMoment));

      if (!allLessonsReady || !allBridgesReady) return;

      await triggerMilestoneBossAndNextSpoon({
        userId,
        courseId,
        milestoneIndex,
        prebakeNextSpoon: false,
      });
    }
  } catch (err) {
    console.error("❌ [DaisyChain] advanceMilestoneBuildChain failed:", err);
  }
}

export async function startNextMilestoneDaisyChain({
  courseId,
  currentMilestoneIndex,
}: {
  courseId: string;
  currentMilestoneIndex: number;
}) {
  try {
    const nextSpoonNumber = currentMilestoneIndex * 3 + 1;

    const existingNextSpoon = await prisma.foundationLesson.findUnique({
      where: {
        foundationCourseId_orderIndex: {
          foundationCourseId: courseId,
          orderIndex: nextSpoonNumber,
        },
      },
      select: { id: true },
    });

    if (existingNextSpoon) return;

    const course = await prisma.foundationCourse.findUnique({
      where: { id: courseId },
      include: { user: { select: { firstName: true, gender: true } } },
    });

    if (!course) return;

    await invokeEduBuilder({
      userId: course.userId,
      firstName: course.user?.firstName || "Learner",
      gender: course.user?.gender || "N",
      foundationCourseId: courseId,
      spoon: nextSpoonNumber,
      nativeLanguage: toLanguageCode(course.nativeLanguage),
      targetLanguage: toLanguageCode(course.targetLanguage),
      levelBand: "unspecified",
      goal: "unspecified",
      scriptComfort: "unspecified",
      type: "lang",
      isOnboarding: false,
    });
  } catch (err) {
    console.error("❌ [DaisyChain] startNextMilestoneDaisyChain failed:", err);
  }
}

export async function activateHardModeTrack(
  courseId: string,
): Promise<{ ok: boolean; alreadyActive?: boolean; error?: string }> {
  try {
    const hardSpoon1OrderIndex = HARD_MODE_SPOON_OFFSET + 1; // 901 = Hard Spoon 1

    const existingHardSpoon1 = await prisma.foundationLesson.findUnique({
      where: {
        foundationCourseId_orderIndex: {
          foundationCourseId: courseId,
          orderIndex: hardSpoon1OrderIndex,
        },
      },
      select: { id: true },
    });

    if (existingHardSpoon1) {
      return { ok: true, alreadyActive: true };
    }

    const course = await prisma.foundationCourse.findUnique({
      where: { id: courseId },
      include: { user: { select: { firstName: true, gender: true } } },
    });

    if (!course) {
      return { ok: false, error: "Course not found" };
    }

    const res = await invokeEduBuilder({
      userId: course.userId,
      firstName: course.user?.firstName || "Learner",
      gender: course.user?.gender || "N",
      foundationCourseId: courseId,
      spoon: hardSpoon1OrderIndex,
      nativeLanguage: toLanguageCode(course.nativeLanguage),
      targetLanguage: toLanguageCode(course.targetLanguage),
      levelBand: "unspecified",
      goal: "unspecified",
      scriptComfort: "unspecified",
      type: "lang",
      isOnboarding: false,
    });

    if (!res.ok) {
      return { ok: false, error: res.error };
    }

    return { ok: true };
  } catch (err) {
    console.error("❌ [HardMode] activateHardModeTrack failed:", err);
    return { ok: false, error: "Failed to activate Hard Mode" };
  }
}