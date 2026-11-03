// lib/system-tasks/handlers/handle-boss-generation.ts

import { NextResponse } from "next/server";
import { Prisma, SystemTask } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  BossWebhookPayloadSchema,
  SpoonBossTaskMetadataSchema,
} from "@/lib/boss/schemas";

export async function handleBossGeneration(
  task: SystemTask,
  body: unknown
): Promise<NextResponse> {
  try {
    // 1. Validate the SystemTask metadata so we know which BossStage this belongs to
    const metadataResult = SpoonBossTaskMetadataSchema.safeParse(task.metadata);

    if (!metadataResult.success) {
      console.error(
        `❌ Invalid metadata on SystemTask ${task.id}:`,
        metadataResult.error.flatten()
      );
      return NextResponse.json(
        {
          message: "Invalid systemTask metadata",
          errors: metadataResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const metadata = metadataResult.data;

    // 2. Validate the incoming Lambda webhook payload
    const parsedWebhook = BossWebhookPayloadSchema.safeParse(body);

    if (!parsedWebhook.success) {
      const errorDetails = parsedWebhook.error.flatten();
      console.error(
        `❌ Invalid Boss Webhook Payload for task ${task.id}:`,
        errorDetails
      );

      // Mark BossStage & SystemTask as FAILED so the UI doesn't hang on "BUILDING"
      await prisma.$transaction([
        prisma.foundationBossStage.update({
          where: { id: metadata.bossStageId },
          data: { status: "FAILED" },
        }),
        prisma.systemTask.update({
          where: { id: task.id },
          data: {
            status: "FAILED",
          },
        }),
      ]);

      return NextResponse.json(
        {
          message: "Invalid webhook payload",
          errors: errorDetails,
        },
        { status: 400 }
      );
    }

    const payload = parsedWebhook.data;

    // 3. Ensure taskId in payload matches the route's SystemTask
    if (payload.taskId !== task.id) {
      return NextResponse.json(
        {
          message: `Task ID mismatch: expected ${task.id}, got ${payload.taskId}`,
        },
        { status: 400 }
      );
    }

    // 4A. Handle Lambda-reported failure
    if (payload.status === "FAILED") {
      const errorMsg = payload.error ?? "Lambda reported FAILED status";
      console.error(
        `❌ Boss generation failed in Lambda for task ${task.id}: ${errorMsg}`
      );

      await prisma.$transaction([
        prisma.foundationBossStage.update({
          where: { id: metadata.bossStageId },
          data: { status: "FAILED" },
        }),
        prisma.systemTask.update({
          where: { id: task.id },
          data: {
            status: "FAILED",
          },
        }),
      ]);

      return NextResponse.json(
        {
          ok: false,
          status: "FAILED",
          bossStageId: metadata.bossStageId,
          error: errorMsg,
        },
        { status: 200 }
      );
    }

    // 4B. Handle COMPLETED payload
    const { bossStageId, scenarioData } = payload.data;

    if (bossStageId !== metadata.bossStageId) {
      return NextResponse.json(
        {
          message: `bossStageId mismatch: metadata has ${metadata.bossStageId}, payload has ${bossStageId}`,
        },
        { status: 400 }
      );
    }

    // 🟢 5. Save scenarioData, set introVideoS3Key top-level, & mark BossStage as READY
    await prisma.$transaction([
      prisma.foundationBossStage.update({
        where: { id: bossStageId },
        data: {
          status: "READY",
          // Map the JSON introVideoKey to the Prisma column!
          introVideoS3Key: scenarioData.boss.introVideoS3Key || null, 
          scenarioData: scenarioData as unknown as Prisma.InputJsonValue,
        },
      }),
      prisma.systemTask.update({
        where: { id: task.id },
        data: {
          status: "COMPLETED",
        },
      }),
    ]);

    console.log(
      `✅ Boss Stage ${bossStageId} marked READY (${scenarioData.exerciseBank.length} exercises)`
    );

    return NextResponse.json(
      {
        ok: true,
        status: "COMPLETED",
        bossStageId,
        totalExercises: scenarioData.exerciseBank.length,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(`❌ Error in handleBossGeneration (${task.id}):`, error);
    return NextResponse.json(
      { message: error.message || "Failed to process boss generation webhook" },
      { status: 500 }
    );
  }
}