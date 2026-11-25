// lib/system-tasks/handlers/handle-milestone-graduation.ts
import { NextResponse } from "next/server";
import { Prisma, SystemTask } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  GraduationTaskMetadataSchema,
  GraduationWebhookPayloadSchema,
} from "@/lib/graduation/schemas";

export async function handleMilestoneGraduation(
  task: SystemTask,
  body: unknown,
): Promise<NextResponse> {
  try {
    // 1. Validate SystemTask metadata
    const metadataResult = GraduationTaskMetadataSchema.safeParse(
      task.metadata,
    );

    if (!metadataResult.success) {
      console.error(
        `❌ Invalid metadata on Graduation SystemTask ${task.id}:`,
        metadataResult.error.flatten(),
      );
      return NextResponse.json(
        {
          message: "Invalid systemTask metadata",
          errors: metadataResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const metadata = metadataResult.data;

    // 2. Validate incoming Lambda webhook payload
    const parsedWebhook = GraduationWebhookPayloadSchema.safeParse(body);

    if (!parsedWebhook.success) {
      const errorDetails = parsedWebhook.error.flatten();
      console.error(
        `❌ Invalid Graduation Webhook Payload for task ${task.id}:`,
        errorDetails,
      );

      await prisma.$transaction([
        prisma.milestoneGraduation.update({
          where: { id: metadata.graduationId },
          data: { status: "FAILED" },
        }),
        prisma.systemTask.update({
          where: { id: task.id },
          data: { status: "FAILED" },
        }),
      ]);

      return NextResponse.json(
        {
          message: "Invalid webhook payload",
          errors: errorDetails,
        },
        { status: 400 },
      );
    }

    const payload = parsedWebhook.data;

    // 3. Verify taskId matches
    if (payload.taskId !== task.id) {
      return NextResponse.json(
        {
          message: `Task ID mismatch: expected ${task.id}, got ${payload.taskId}`,
        },
        { status: 400 },
      );
    }

    // 4A. Handle FAILED
    if (payload.status === "FAILED") {
      const errorMsg = payload.error ?? "Lambda reported FAILED status";
      console.error(
        `❌ Graduation generation failed in Lambda for task ${task.id}: ${errorMsg}`,
      );

      await prisma.$transaction([
        prisma.milestoneGraduation.update({
          where: { id: metadata.graduationId },
          data: { status: "FAILED" },
        }),
        prisma.systemTask.update({
          where: { id: task.id },
          data: { status: "FAILED", error: errorMsg },
        }),
      ]);

      return NextResponse.json(
        {
          ok: false,
          status: "FAILED",
          graduationId: metadata.graduationId,
          error: errorMsg,
        },
        { status: 200 },
      );
    }

    // 4B. Handle COMPLETED
    const { graduationId, graduationData } = payload.data;

    if (graduationId !== metadata.graduationId) {
      return NextResponse.json(
        {
          message: `graduationId mismatch: metadata has ${metadata.graduationId}, payload has ${graduationId}`,
        },
        { status: 400 },
      );
    }

    await prisma.$transaction([
      prisma.milestoneGraduation.update({
        where: { id: graduationId },
        data: {
          status: "READY",
          coverImageS3Key: graduationData.coverImageS3Key ?? null,
          videoS3Key: graduationData.videoS3Key ?? null,
          audioNativeS3Key: graduationData.audioNativeS3Key ?? null,
          audioTargetS3Key: graduationData.audioTargetS3Key ?? null,
          graduationData: graduationData as unknown as Prisma.InputJsonValue,
        },
      }),
      prisma.systemTask.update({
        where: { id: task.id },
        data: { status: "COMPLETED" },
      }),
    ]);

    console.log(
      `✅ Milestone ${metadata.milestoneIndex} Graduation ${graduationId} marked READY`,
    );

    return NextResponse.json(
      {
        ok: true,
        status: "COMPLETED",
        graduationId,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error(
      `❌ Error in handleMilestoneGraduation (${task.id}):`,
      error,
    );
    return NextResponse.json(
      {
        message:
          error.message || "Failed to process milestone graduation webhook",
      },
      { status: 500 },
    );
  }
}