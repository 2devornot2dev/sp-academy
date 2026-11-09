// lib/foundation/advance-build-chain.ts
"use server";

import { prisma } from "@/lib/prisma";
import { toLanguageCode } from "@/lib/languages";
import { invokeEduBuilder } from "@/app/actions/invoke-edu-builder";
import { triggerMilestoneBossAndNextSpoon } from "@/lib/foundation/trigger-milestone-boss";

/**
 * Called automatically when a Spoon or Vocab Bridge webhook completes.
 * - If subStep 1 (e.g. Spoon 1) finished -> Bakes subStep 2 (Spoon 2)
 * - If subStep 2 (e.g. Spoon 2) finished -> Bakes subStep 3 (Spoon 3)
 * - If subStep 3 (e.g. Spoon 3 + Bridge 3) finished -> Bakes Boss Stage for this milestone!
 */
export async function advanceMilestoneBuildChain({
  courseId,
  completedSpoonNumber,
}: {
  courseId: string;
  completedSpoonNumber: number;
}) {
  try {
    const milestoneIndex = Math.ceil(completedSpoonNumber / 3);
    const subStep = ((completedSpoonNumber - 1) % 3) + 1; // 1, 2, or 3

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

    // -----------------------------------------------------------------------
    // CASE A: subStep 1 or 2 just finished -> Daisy-chain the next Spoon in this unit!
    // -----------------------------------------------------------------------
    if (subStep === 1 || subStep === 2) {
      // Wait until the current lesson actually has its lessonHandoff saved
      const currentLesson = await prisma.foundationLesson.findUnique({
        where: {
          foundationCourseId_orderIndex: {
            foundationCourseId: courseId,
            orderIndex: completedSpoonNumber,
          },
        },
        select: { id: true, lessonHandoff: true },
      });

      if (!currentLesson?.lessonHandoff) {
        // Spoon webhook hasn't written lessonHandoff yet (e.g., Bridge finished first);
        // when Spoon webhook finishes a moment later, it will call this again and proceed.
        return;
      }

      const nextSpoonNumber = completedSpoonNumber + 1;

      // Idempotency check: Has nextSpoonNumber already been created?
      const existingNextLesson = await prisma.foundationLesson.findUnique({
        where: {
          foundationCourseId_orderIndex: {
            foundationCourseId: courseId,
            orderIndex: nextSpoonNumber,
          },
        },
        select: { id: true },
      });

      if (existingNextLesson) {
        return; // Already building or ready!
      }

      console.log(
        `⛓️ [DaisyChain] Spoon ${completedSpoonNumber} ready -> Auto-baking Spoon ${nextSpoonNumber} (Milestone ${milestoneIndex}, Step ${subStep + 1}/3)`
      );

      await invokeEduBuilder({
        userId,
        firstName: course.user?.firstName || "Learner",
        gender: course.user?.gender || "N",
        foundationCourseId: courseId,
        spoon: nextSpoonNumber,
        nativeLanguage,
        targetLanguage,
        levelBand: "unspecified", // Automatically resolved from LanguageProfile / Spoon 1 inside invokeEduBuilder
        goal: "unspecified",
        scriptComfort: "unspecified",
        type: "lang",
        isOnboarding: false,
      });

      return;
    }

    // -----------------------------------------------------------------------
    // CASE B: subStep 3 (e.g. Spoon 3, 6, 9...) finished -> Check if all 3 Spoons & 3 Bridges are ready, then bake BOSS!
    // -----------------------------------------------------------------------
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

      if (!allLessonsReady || !allBridgesReady) {
        // If Spoon 3 finished before Bridge 3 (or vice versa), the second webhook will trigger this!
        return;
      }

      console.log(
        `⛓️ [DaisyChain] All 3 Spoons & Bridges ready for Milestone ${milestoneIndex} -> Auto-baking Boss ${milestoneIndex}!`
      );

      // Build the Boss NOW, but wait until the user starts the Boss to prebake the next unit's Spoon 4/7/10!
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

/**
 * Call this when the user STARTS the Boss Stage (e.g. Boss 1 -> Spoon 4 -> 5 -> 6 -> Boss 2).
 * It kicks off the first Spoon of the next milestone, which then daisy-chains all the way to the next Boss!
 */
export async function startNextMilestoneDaisyChain({
  courseId,
  currentMilestoneIndex,
}: {
  courseId: string;
  currentMilestoneIndex: number;
}) {
  try {
    const nextSpoonNumber = currentMilestoneIndex * 3 + 1; // e.g. Milestone 1 -> Spoon 4

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

    console.log(
      `🔥 [DaisyChain] User entered Boss ${currentMilestoneIndex} -> Kicking off Next Unit Daisy-Chain starting at Spoon ${nextSpoonNumber}!`
    );

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