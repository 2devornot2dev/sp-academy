// lib/system-tasks/handlers/handle-lambda-error.ts
import { SystemTask } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher-server";
import { setLiveTaskState } from "@/app/actions/system-task-actions";
import { notifyLambdaError } from "@/lib/telegram";

export interface LambdaErrorPayload {
  status?: "FAILED" | "ERROR" | "failed" | "error";
  ok?: false;
  lambdaName?: string;
  error: string;
  traceback?: string | null;
  stage?: string | null;
}

/**
 * Type guard to check if an incoming webhook body is a Lambda error report
 */
export function isLambdaErrorPayload(
  body: unknown,
): body is LambdaErrorPayload {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  const statusUpper =
    typeof b.status === "string" ? b.status.toUpperCase() : "";
  return (
    statusUpper === "FAILED" ||
    statusUpper === "ERROR" ||
    (b.ok === false && typeof b.error === "string")
  );
}

/**
 * Handles any Lambda failure reported to /api/webhooks/system-tasks/[taskId]
 */
export async function handleLambdaError(
  task: SystemTask,
  body: LambdaErrorPayload,
) {
  const prevMeta =
    task.metadata && typeof task.metadata === "object"
      ? (task.metadata as Record<string, any>)
      : {};

  const lambdaName = body.lambdaName || "unknown-lambda";
  const errorMessage = body.error || "Unknown Lambda error";
  const traceback = body.traceback || null;
  const failedAt = new Date().toISOString();

  console.error(
    `🚨 [handleLambdaError] Task ${task.id} (${task.type}) FAILED in [${lambdaName}]:`,
    errorMessage,
  );

  // 1. Mark the SystemTask as FAILED and attach full diagnostic info to metadata
  await prisma.systemTask.update({
    where: { id: task.id },
    data: {
      status: "FAILED",
      metadata: {
        ...prevMeta,
        failedAt,
        lambdaName,
        stage: body.stage ?? null,
        errorMessage,
        traceback,
      },
    },
  });

  // 2. Mark domain stage FAILED if applicable
  if (task.type === "SPOON_BOSS_GENERATION" && prevMeta.bossStageId) {
    await prisma.foundationBossStage
      .update({
        where: { id: String(prevMeta.bossStageId) },
        data: { status: "FAILED" },
      })
      .catch((err) =>
        console.error(
          "[handleLambdaError] failed to mark bossStage FAILED:",
          err,
        ),
      );
  }

  if (
    task.type === "GENERATE_MILESTONE_GRADUATION" &&
    prevMeta.graduationId
  ) {
    await prisma.milestoneGraduation
      .update({
        where: { id: String(prevMeta.graduationId) },
        data: { status: "FAILED" },
      })
      .catch((err) =>
        console.error(
          "[handleLambdaError] failed to mark milestoneGraduation FAILED:",
          err,
        ),
      );
  }

  // 3. Ping Telegram alerts channel
  await notifyLambdaError({
    lambdaName,
    stage: body.stage ?? undefined,
    error: errorMessage,
    taskId: task.id,
  });

  // 4. Notify user via Pusher + Redis live task state
  const userId = prevMeta.userId;
  if (userId) {
    const friendlyLabel =
      task.type === "SPOON_GENERATION"
        ? `Spoon ${prevMeta.spoon ?? prevMeta.day ?? ""} Lesson`.trim()
        : task.type === "VOCAB_BRIDGE_GENERATION"
          ? "Vocab Bridge"
          : task.type === "SPOON_BOSS_GENERATION"
            ? "Boss Stage"
            : task.type === "GENERATE_MILESTONE_GRADUATION"
              ? "Milestone Graduation"
              : "Lesson Generation";

    const livePayload = {
      taskId: task.id,
      taskType: task.type,
      status: "FAILED" as const,
      label: friendlyLabel,
      courseId: prevMeta.foundationCourseId ?? prevMeta.courseId ?? null,
      spoon: prevMeta.spoon ?? prevMeta.day ?? null,
      bossStageId: prevMeta.bossStageId ?? null,
      lambdaName,
      stage: body.stage ?? null,
      errorMessage,
      updatedAt: failedAt,
    };

    await setLiveTaskState(userId, livePayload);

    try {
      await pusherServer.trigger(
        `user-${userId}`,
        "system-task-failed",
        livePayload,
      );
    } catch (err) {
      console.error("[handleLambdaError] pusher notification failed:", err);
    }
  }

  return NextResponse.json(
    { ok: false, status: "FAILED", taskId: task.id },
    { status: 200 },
  );
}