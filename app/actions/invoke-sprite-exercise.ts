// app/actions/invoke-sprite-exercise.ts
"use server";

import { prisma } from "@/lib/prisma";
import { lambda, createCommand } from "@/lib/aws/lambda";
import { Prisma, SystemTaskType } from "@prisma/client";
import { getCachedDossier } from "@/lib/sprites/get-cached-dossier";
import { resolveFishVoiceId } from "@/lib/sprites/voices";
import { setLiveTaskState } from "@/app/actions/system-task-actions";
import type { ChalkboardData } from "@/lib/schema/sprite-schema";
import { EXERCISE_BUILDING_ORDER_INDEX, EXERCISE_READY_ORDER_INDEX } from "@/lib/sprites/sprites-contants";

const SPRITE_EXERCISE_LAMBDA =
  process.env.SPRITE_EXERCISE_LAMBDA_NAME ?? "spoon-sprite-exercise-builder";

const BASE_WEBHOOK = `${
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://spoonacademy.com"
}/api/webhooks/system-tasks`;


export interface StruggledBoardMistake {
  sessionId: string;
  lessonTitle: string | null;
  stepType: string;
  prompt: string;
  targetPhrase: string | null;
  userAttempts: string[];
  correctionFrom: string | null;
  correctionTo: string | null;
  note: string | null;
}

export type InvokeSpriteExerciseResult =
  | {
      ok: true;
      exerciseId: string;
      taskId: string;
      mistakeCount: number;
    }
  | {
      ok: false;
      error: string;
    };

/**
 * Computes the user's active Milestone number (1, 2, 3...) based on completed Boss Stages
 */
export async function getUserMilestoneTag(
  userId: string,
  explicitCourseId?: string | null
): Promise<{
  courseId: string;
  currentMilestone: number;
  milestoneTag: string;
}> {
  const course = explicitCourseId
    ? { id: explicitCourseId }
    : await prisma.foundationCourse.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });

  const resolvedCourseId = course?.id ?? "default";

  const completedBossCount = await prisma.foundationBossStage.count({
    where: {
      userId,
      ...(course?.id ? { foundationCourseId: course.id } : {}),
      passed: true, // <--- Matches all previously defeated Boss Stages!
    },
  });

  const currentMilestone = completedBossCount + 1;
  return {
    courseId: resolvedCourseId,
    currentMilestone,
    milestoneTag: `${resolvedCourseId}:M${currentMilestone}`,
  };
}

export async function invokeSpriteExercise({
  userId,
  courseId,
}: {
  userId: string;
  courseId?: string | null;
}): Promise<InvokeSpriteExerciseResult> {
  try {
    // 1. Resolve current Milestone Tag (e.g. "course123:M6")
    const {
      courseId: resolvedCourseId,
      currentMilestone,
      milestoneTag,
    } = await getUserMilestoneTag(userId, courseId);

    // 2. Check if an exercise already exists for this Milestone
    const [spriteProfile, existingMilestoneExercise, dossier] =
      await Promise.all([
        prisma.spriteProfile.findUnique({
          where: { userId },
          include: {
            sprite: true,
            sessions: {
              where: {
                board: { not: Prisma.AnyNull },
              },
              orderBy: { updatedAt: "desc" },
              take: 12,
              select: {
                id: true,
                lessonTitle: true,
                board: true,
              },
            },
          },
        }),
        prisma.spriteExercise.findFirst({
          where: {
            userId,
            courseId: milestoneTag,
            status: { in: ["BUILDING", "READY", "COMPLETED"] },
          },
          orderBy: { createdAt: "desc" },
          select: { id: true, status: true },
        }),
        getCachedDossier(userId).catch(() => null),
      ]);

    if (!spriteProfile) {
      return { ok: false, error: "Sprite profile not found for user." };
    }

    // 🛑 HARD GATE: 1 Sprite Exercise per Milestone (Boss-to-Boss)!
    if (existingMilestoneExercise) {
      if (existingMilestoneExercise.status === "COMPLETED") {
        return {
          ok: false,
          error: `You already completed your Sprite Exercise for Milestone ${currentMilestone}! Beat Boss Stage ${currentMilestone} to unlock the next one.`,
        };
      }
      return {
        ok: true,
        exerciseId: existingMilestoneExercise.id,
        taskId: "existing",
        mistakeCount: 0,
      };
    }

    // 3. Extract struggled steps across recent Chalkboards
    const mistakes: StruggledBoardMistake[] = [];
    const seenTargets = new Set<string>();

    for (const sess of spriteProfile.sessions) {
      const board = sess.board as ChalkboardData | null;
      if (!board || !Array.isArray(board.steps)) continue;

      for (const step of board.steps) {
        const hadStruggle =
          step.struggled ||
          Boolean(step.correctionGiven?.correctionTo) ||
          Boolean(step.correctionGiven?.correctionFrom);

        if (!hadStruggle) continue;

        const dedupeKey = (
          step.targetPhrase ||
          step.correctionGiven?.correctionTo ||
          step.prompt
        )
          .trim()
          .toLowerCase();

        if (seenTargets.has(dedupeKey)) continue;
        seenTargets.add(dedupeKey);

        mistakes.push({
          sessionId: sess.id,
          lessonTitle: sess.lessonTitle ?? board.title ?? null,
          stepType: step.type,
          prompt: step.prompt,
          targetPhrase:
            step.targetPhrase ?? step.correctionGiven?.correctionTo ?? null,
          userAttempts: Array.isArray(step.userAttempts)
            ? step.userAttempts
            : [],
          correctionFrom: step.correctionGiven?.correctionFrom ?? null,
          correctionTo: step.correctionGiven?.correctionTo ?? null,
          note: step.correctionGiven?.note ?? step.grammarTip ?? null,
        });

        if (mistakes.length >= 6) break;
      }
      if (mistakes.length >= 6) break;
    }

    const focusWords = dossier?.focusWords ?? [];

    if (mistakes.length === 0 && focusWords.length === 0) {
      return {
        ok: false,
        error:
          "Complete at least one Chalkboard or Spoon lesson first so your Sprite has material to build your exercise!",
      };
    }

    const drillTitle =
      mistakes.length > 0 && mistakes[0].lessonTitle
        ? `Milestone ${currentMilestone}: ${mistakes[0].lessonTitle}`
        : `Milestone ${currentMilestone} Sprite Exercise`;

    const buildNodeId = `${spriteProfile.sprite.slug}:${spriteProfile.nativeVoiceId}:${spriteProfile.targetVoiceId}:${EXERCISE_BUILDING_ORDER_INDEX}`;

    // 4. Create SpriteExercise (tagged with milestoneTag!) + SystemTasks
    const { exercise, systemTask, spriteBuildTask } =
      await prisma.$transaction(async (tx) => {
        const ex = await tx.spriteExercise.create({
          data: {
            spriteProfileId: spriteProfile.id,
            userId,
            courseId: milestoneTag, // <--- Locks to this Milestone!
            title: drillTitle,
            status: "BUILDING",
            sourceMistakes: mistakes as unknown as Prisma.InputJsonValue,
            energyReward: 1,
          },
        });

        const task = await tx.systemTask.create({
          data: {
            type: SystemTaskType.SPRITE_EXERCISE_GENERATION,
            status: "IN_PROGRESS",
            metadata: {
              userId,
              courseId: milestoneTag,
              foundationCourseId: resolvedCourseId,
              spriteProfileId: spriteProfile.id,
              spriteExerciseId: ex.id,
              milestoneIndex: currentMilestone,
            },
          },
        });

        const sTask = await tx.systemTask.create({
          data: {
            type: SystemTaskType.SPRITE_NOTIFICATION_GENERATION,
            status: "IN_PROGRESS",
            metadata: {
              userId,
              courseId: resolvedCourseId,
              foundationCourseId: resolvedCourseId,
              spriteProfileId: spriteProfile.id,
              orderIndex: EXERCISE_BUILDING_ORDER_INDEX,
              nodeId: buildNodeId,
              stepType: "EXERCISE_BUILDING",
            },
          },
        });

        return { exercise: ex, systemTask: task, spriteBuildTask: sTask };
      });

    const webhookUrl = `${BASE_WEBHOOK}/${systemTask.id}`;
    const spriteWebhookUrl = `${BASE_WEBHOOK}/${spriteBuildTask.id}`;

    const lambdaPayload = {
      taskId: systemTask.id,
      exerciseId: exercise.id,
      userId,
      courseId: milestoneTag,
      userName: dossier?.userName ?? "Learner",
      spriteSlug: spriteProfile.sprite.slug,
      spriteName: spriteProfile.sprite.name,
      persona: spriteProfile.sprite.persona ?? "",
      nativeLanguage: spriteProfile.nativeLanguage,
      targetLanguage: spriteProfile.targetLanguage,
      nativeVoiceId: spriteProfile.nativeVoiceId,
      targetVoiceId: spriteProfile.targetVoiceId,
      nativeFishVoiceId: resolveFishVoiceId(spriteProfile.nativeVoiceId),
      targetFishVoiceId: resolveFishVoiceId(spriteProfile.targetVoiceId),
      currentLessonTitle: dossier?.currentLessonTitle ?? null,
      chalkboardMistakes: mistakes,
      focusWords,
      energyReward: 1,
      webhookUrl,
    };

    const spriteBuildPayload = {
      spriteProfileId: spriteProfile.id,
      spriteSlug: spriteProfile.sprite.slug,
      spriteName: spriteProfile.sprite.name,
      persona: spriteProfile.sprite.persona ?? "",
      nativeLanguage: spriteProfile.nativeLanguage,
      targetLanguage: spriteProfile.targetLanguage,
      nativeVoiceId: spriteProfile.nativeVoiceId,
      targetVoiceId: spriteProfile.targetVoiceId,
      orderIndex: EXERCISE_BUILDING_ORDER_INDEX,
      spriteOrderIndex: EXERCISE_BUILDING_ORDER_INDEX,
      stepType: "EXERCISE_BUILDING",
      nodeId: buildNodeId,
      webhookUrl: spriteWebhookUrl,
    };

    await Promise.all([
      prisma.systemTask.update({
        where: { id: systemTask.id },
        data: { payload: lambdaPayload as unknown as Prisma.InputJsonValue },
      }),
      prisma.systemTask.update({
        where: { id: spriteBuildTask.id },
        data: {
          payload: spriteBuildPayload as unknown as Prisma.InputJsonValue,
        },
      }),
      setLiveTaskState(userId, {
        taskId: systemTask.id,
        taskType: "SPRITE_EXERCISE_GENERATION",
        status: "BUILDING",
        label: "Sprite Exercise",
        courseId: resolvedCourseId,
        updatedAt: new Date().toISOString(),
      }),
    ]);

    const [exerciseRes] = await Promise.all([
      lambda.send(
        createCommand({
          functionName: SPRITE_EXERCISE_LAMBDA,
          invocationType: "Event",
          payload: { body: JSON.stringify(lambdaPayload) },
        })
      ),
      lambda.send(
        createCommand({
          functionName: "spoon-sprite-builder",
          invocationType: "Event",
          payload: { body: JSON.stringify(spriteBuildPayload) },
        })
      ),
    ]);

    if (exerciseRes.StatusCode !== 202) {
      throw new Error(`Unexpected Lambda status: ${exerciseRes.StatusCode}`);
    }

    return {
      ok: true,
      exerciseId: exercise.id,
      taskId: systemTask.id,
      mistakeCount: mistakes.length,
    };
  } catch (error: any) {
    console.error("❌ [invokeSpriteExercise] failed:", error);
    return {
      ok: false,
      error: error.message || "Could not start Sprite Exercise generation.",
    };
  }
}