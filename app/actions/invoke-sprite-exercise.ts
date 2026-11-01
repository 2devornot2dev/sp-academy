// app/actions/invoke-sprite-exercise.ts
"use server";

import { prisma } from "@/lib/prisma";
import { lambda, createCommand } from "@/lib/aws/lambda";
import { Prisma, SystemTaskType } from "@prisma/client";
import { getCachedDossier } from "@/lib/sprites/get-cached-dossier";
import { resolveFishVoiceId } from "@/lib/sprites/voices";
import { setLiveTaskState } from "@/app/actions/system-task-actions";
import type { ChalkboardData } from "@/lib/schema/sprite-schema";

const SPRITE_EXERCISE_LAMBDA =
  process.env.SPRITE_EXERCISE_LAMBDA_NAME ?? "spoon-sprite-exercise-builder";

const BASE_WEBHOOK = `${
  process.env.NEXT_PUBLIC_APP_URL2 ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://spoonacademy.com"
}/api/webhooks/system-tasks`;

export const EXERCISE_BUILDING_ORDER_INDEX = 9001;
export const EXERCISE_READY_ORDER_INDEX = 9002;

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

export async function invokeSpriteExercise({
  userId,
  courseId,
}: {
  userId: string;
  courseId?: string | null;
}): Promise<InvokeSpriteExerciseResult> {
  try {
    // 1. Fetch User + SpriteProfile + Recent Sessions with Boards
    const [spriteProfile, existingBuildingExercise, dossier] =
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
          where: { userId, status: "BUILDING" },
          select: { id: true },
        }),
        getCachedDossier(userId).catch(() => null),
      ]);

    if (!spriteProfile) {
      return { ok: false, error: "Sprite profile not found for user." };
    }

    if (existingBuildingExercise) {
      return {
        ok: true,
        exerciseId: existingBuildingExercise.id,
        taskId: "existing",
        mistakeCount: 0,
      };
    }

    // 2. Extract struggled steps across recent Chalkboards
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
          "Complete at least one Chalkboard or Spoon lesson first so your Sprite has material to build your repair drill!",
      };
    }

    const resolvedCourseId = courseId ?? dossier?.courseId ?? null;
    const drillTitle =
      mistakes.length > 0 && mistakes[0].lessonTitle
        ? `${spriteProfile.sprite.name} Repair: ${mistakes[0].lessonTitle}`
        : `${spriteProfile.sprite.name} Targeted Repair Drill`;

    const buildNodeId = `${spriteProfile.sprite.slug}:${spriteProfile.nativeVoiceId}:${spriteProfile.targetVoiceId}:${EXERCISE_BUILDING_ORDER_INDEX}`;

    // 3. Create SpriteExercise + Exercise SystemTask + Sprite Notification SystemTask
    const { exercise, systemTask, spriteBuildTask } =
      await prisma.$transaction(async (tx) => {
        const ex = await tx.spriteExercise.create({
          data: {
            spriteProfileId: spriteProfile.id,
            userId,
            courseId: resolvedCourseId,
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
              courseId: resolvedCourseId,
              foundationCourseId: resolvedCourseId,
              spriteProfileId: spriteProfile.id,
              spriteExerciseId: ex.id,
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

    // 4. Build Payloads for Both Lambdas
    const lambdaPayload = {
      taskId: systemTask.id,
      exerciseId: exercise.id,
      userId,
      courseId: resolvedCourseId,
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
        label: "Sprite Repair Drill",
        courseId: resolvedCourseId,
        updatedAt: new Date().toISOString(),
      }),
    ]);

    // 5. Invoke BOTH `spoon-sprite-exercise-builder` AND `spoon-sprite-builder` (Fire #1: On Build!)
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