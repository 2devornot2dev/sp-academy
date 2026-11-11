// lib/foundation/advance-build-chain.ts
"use server";

import { prisma } from "@/lib/prisma";
import { toLanguageCode } from "@/lib/languages";
import { invokeEduBuilder } from "@/app/actions/invoke-edu-builder";
import { triggerMilestoneBossAndNextSpoon } from "@/lib/foundation/trigger-milestone-boss";

const STANDARD_TRACK_MAX_SPOON = 30;
const STANDARD_TRACK_MAX_MILESTONE = 10;

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
        return;
      }

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

      if (existingNextLesson) {
        return;
      }

      console.log(
        `⛓️ [DaisyChain] Spoon ${completedSpoonNumber} ready -> Auto-baking Spoon ${nextSpoonNumber} (Milestone ${milestoneIndex}, Step ${subStep + 1}/3)`,
      );

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

    // -----------------------------------------------------------------------
    // CASE B: subStep 3 finished -> Check if all 3 Spoons & 3 Bridges are ready, then bake BOSS!
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
        return;
      }

      console.log(
        `⛓️ [DaisyChain] All 3 Spoons & Bridges ready for Milestone ${milestoneIndex} -> Auto-baking Boss ${milestoneIndex}!`,
      );

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
 * Call this when the user STARTS the Boss Stage.
 * IMPORTANT: Stops at Milestone 10 (Spoon 30) so Hard Mode Spoon 1 (orderIndex 31)
 * is ONLY generated when the user explicitly clicks "Activate Hard Mode"!
 */
export async function startNextMilestoneDaisyChain({
  courseId,
  currentMilestoneIndex,
}: {
  courseId: string;
  currentMilestoneIndex: number;
}) {
  try {
    // Do NOT auto-start Hard Mode (Spoon 31) when entering Boss 10!
    // Hard Mode starts only when the user clicks "Activate Hard Mode".
    if (currentMilestoneIndex === STANDARD_TRACK_MAX_MILESTONE) {
      console.log(
        `🛑 [DaisyChain] Reached Standard Track Finale (Milestone 10). Waiting for user to activate Hard Mode!`,
      );
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

    const course = await prisma.foundationCourse.findUnique({
      where: { id: courseId },
      include: { user: { select: { firstName: true, gender: true } } },
    });

    if (!course) return;

    console.log(
      `🔥 [DaisyChain] User entered Boss ${currentMilestoneIndex} -> Kicking off Next Unit Daisy-Chain starting at Spoon ${nextSpoonNumber}!`,
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

/**
 * Explicitly triggered when the user clicks "Activate Hard Mode" after Spoon 30.
 * Kicks off Hard Mode Spoon 1 (stored at orderIndex 31 -> Unit 1 Part IV),
 * which then daisy-chains Hard Spoon 2 (Part V) -> Hard Spoon 3 (Part VI) -> Hard Boss 1!
 */
export async function activateHardModeTrack(
  courseId: string,
): Promise<{ ok: boolean; alreadyActive?: boolean; error?: string }> {
  try {
    const hardSpoon1OrderIndex = STANDARD_TRACK_MAX_SPOON + 1; // 31

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

    console.log(
      `🔥🔥 [HardMode] Activating Hard Mode Track (Hard Spoon 1 / orderIndex ${hardSpoon1OrderIndex}) for course ${courseId}!`,
    );

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