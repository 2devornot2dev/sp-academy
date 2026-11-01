// lib/system-tasks/handlers/handle-sprite-exercise.ts
import { Prisma, SystemTask, SystemTaskType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher-server";
import { lambda, createCommand } from "@/lib/aws/lambda";
import { clearLiveTaskState } from "@/app/actions/system-task-actions";

import { SpriteExerciseWebhookSchema } from "@/lib/schema/sprite-exercise-schema";
import { EXERCISE_READY_ORDER_INDEX } from "@/lib/sprites/sprites-contants";

const BASE_WEBHOOK = `${
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://spoonacademy.com"
}/api/webhooks/system-tasks`;

export async function handleSpriteExerciseGeneration(
  task: SystemTask,
  body: unknown
) {
  const parsed = SpriteExerciseWebhookSchema.safeParse(body);
  if (!parsed.success) {
    console.error(
      `[sprite-exercise] invalid payload for task ${task.id}:`,
      parsed.error.issues
    );
    return NextResponse.json(
      { message: "Invalid payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { exerciseId, userId, courseId, title, content } = parsed.data;

  // 1. Update SpriteExercise row to READY + fetch SpriteProfile for Fire #2
  const [updatedExercise, spriteProfile] = await Promise.all([
    prisma.spriteExercise.update({
      where: { id: exerciseId },
      data: {
        ...(title ? { title } : {}),
        status: "READY",
        content: content as unknown as Prisma.InputJsonValue,
      },
    }),
    prisma.spriteProfile.findUnique({
      where: { userId },
      include: { sprite: true },
    }),
  ]);

  // 2. Mark SystemTask COMPLETED & clear Redis live-task state
  await Promise.all([
    prisma.systemTask.update({
      where: { id: task.id },
      data: { status: "COMPLETED" },
    }),
    clearLiveTaskState(userId),
  ]);

  // 3. Fire #2: Invoke `spoon-sprite-builder` (stepType: "EXERCISE_READY")
  if (spriteProfile) {
    try {
      const readyNodeId = `${spriteProfile.sprite.slug}:${spriteProfile.nativeVoiceId}:${spriteProfile.targetVoiceId}:${EXERCISE_READY_ORDER_INDEX}`;

      const readySpriteTask = await prisma.systemTask.create({
        data: {
          type: SystemTaskType.SPRITE_NOTIFICATION_GENERATION,
          status: "IN_PROGRESS",
          metadata: {
            userId,
            courseId: courseId ?? null,
            foundationCourseId: courseId ?? null,
            spriteProfileId: spriteProfile.id,
            orderIndex: EXERCISE_READY_ORDER_INDEX,
            nodeId: readyNodeId,
            stepType: "EXERCISE_READY",
          },
        },
      });

      const spriteReadyPayload = {
        spriteProfileId: spriteProfile.id,
        spriteSlug: spriteProfile.sprite.slug,
        spriteName: spriteProfile.sprite.name,
        persona: spriteProfile.sprite.persona ?? "",
        nativeLanguage: spriteProfile.nativeLanguage,
        targetLanguage: spriteProfile.targetLanguage,
        nativeVoiceId: spriteProfile.nativeVoiceId,
        targetVoiceId: spriteProfile.targetVoiceId,
        orderIndex: EXERCISE_READY_ORDER_INDEX,
        spriteOrderIndex: EXERCISE_READY_ORDER_INDEX,
        stepType: "EXERCISE_READY",
        nodeId: readyNodeId,
        webhookUrl: `${BASE_WEBHOOK}/${readySpriteTask.id}`,
      };

      await prisma.systemTask.update({
        where: { id: readySpriteTask.id },
        data: {
          payload: spriteReadyPayload as unknown as Prisma.InputJsonValue,
        },
      });

      await lambda.send(
        createCommand({
          functionName: "spoon-sprite-builder",
          invocationType: "Event",
          payload: { body: JSON.stringify(spriteReadyPayload) },
        })
      );
    } catch (spriteErr) {
      console.error(
        "[sprite-exercise] Failed to invoke spoon-sprite-builder on complete:",
        spriteErr
      );
    }
  }

  // 4. Notify client via Pusher that the exercise is ready
  try {
    await pusherServer.trigger(`user-${userId}`, "system-task-completed", {
      taskId: task.id,
      exerciseId: updatedExercise.id,
    });
  } catch (err) {
    console.error("[sprite-exercise] Pusher trigger failed:", err);
  }

  return NextResponse.json({
    ok: true,
    exerciseId: updatedExercise.id,
  });
}