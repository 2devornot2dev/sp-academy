// lib/foundation/advance-build-chain.ts
"use server";

import { prisma } from "@/lib/prisma";
import { toLanguageCode } from "@/lib/languages";
import { invokeEduBuilder } from "@/app/actions/invoke-edu-builder";
import { triggerMilestoneBossAndNextSpoon } from "@/lib/foundation/trigger-milestone-boss";

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
        userId: course.userId,
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
    const course = await prisma.foundationCourse.findUnique({
      where: { id: courseId },
      include: { user: { select: { firstName: true, gender: true } } },
    });
    if (!course) return;

    // Do NOT auto-trigger the next spoon if Standard Track reached Milestone 10 (Spoon 30)
    if (!course.isHardMode && currentMilestoneIndex === 10) {
      return;
    }

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
  standardCourseId: string,
): Promise<{ ok: boolean; alreadyActive?: boolean; error?: string }> {
  try {
    const standardCourse = await prisma.foundationCourse.findUnique({
      where: { id: standardCourseId },
      include: { user: { select: { firstName: true, gender: true } } },
    });

    if (!standardCourse) return { ok: false, error: "Course not found" };
    const userId = standardCourse.userId;

    let hardCourse = await prisma.foundationCourse.findFirst({
      where: {
        userId,
        targetLanguage: standardCourse.targetLanguage,
        isHardMode: true,
      },
      include: { lessons: { select: { id: true, orderIndex: true } } },
    });

    if (hardCourse && hardCourse.lessons.some((l) => l.orderIndex === 1)) {
      return { ok: true, alreadyActive: true };
    }

    if (!hardCourse) {
      hardCourse = await prisma.foundationCourse.create({
        data: {
          userId,
          nativeLanguage: standardCourse.nativeLanguage,
          targetLanguage: standardCourse.targetLanguage,
          isHardMode: true,
          cacheKey: `${standardCourse.cacheKey}:hard`, // see note
        },
        include: { lessons: { select: { id: true, orderIndex: true } } },
      });
    }

    const res = await invokeEduBuilder({
      userId,
      firstName: standardCourse.user?.firstName || "Learner",
      gender: standardCourse.user?.gender || "N",
      foundationCourseId: hardCourse.id,
      spoon: 1, // Starts at 1!
      nativeLanguage: toLanguageCode(standardCourse.nativeLanguage),
      targetLanguage: toLanguageCode(standardCourse.targetLanguage),
      levelBand: "unspecified",
      goal: "unspecified",
      scriptComfort: "unspecified",
      type: "lang",
      isOnboarding: false,
    });

    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true };
  } catch (err) {
    console.error("❌ [HardMode] activateHardModeTrack failed:", err);
    return { ok: false, error: "Failed to activate Hard Mode" };
  }
}
