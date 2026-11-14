// lib/system-tasks/handlers/handle-tutor-exercise.ts
import { prisma } from "@/lib/prisma";
import { Prisma, SystemTask } from "@prisma/client";
import { NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher-server";
import { TutorExerciseWebhookSchema } from "@/lib/schema/ai-tutor-exercise-schema";

export async function handleTutorExercise(task: SystemTask, body: unknown) {
  const meta = (task.metadata as Record<string, any>) || {};

  try {
    const parsedResult = TutorExerciseWebhookSchema.safeParse(body);

    if (!parsedResult.success) {
      console.error(
        "❌ [TUTOR EXERCISE] Invalid Webhook Payload:",
        parsedResult.error.flatten
          ? parsedResult.error.flatten()
          : parsedResult.error,
      );
      return NextResponse.json(
        {
          message: "Invalid tutor exercise payload",
          errors: parsedResult.error.flatten
            ? parsedResult.error.flatten()
            : parsedResult.error,
        },
        { status: 400 },
      );
    }

    const data = parsedResult.data;
    const exerciseId = (data.exerciseId || meta.exerciseId) as string;
    const sessionId = (data.sessionId || meta.sessionId) as string;

    if (!exerciseId) {
      return NextResponse.json(
        { message: "Missing exerciseId in tutor exercise webhook" },
        { status: 400 },
      );
    }

    if (data.status === "FAILED") {
      console.error(
        `❌ [TUTOR EXERCISE] Lambda failed for exercise ${exerciseId}:`,
        data.error,
      );

      await prisma.$transaction([
        prisma.tutorExercise.update({
          where: { id: exerciseId },
          data: { status: "FAILED" },
        }),
        prisma.systemTask.update({
          where: { id: task.id },
          data: { status: "FAILED" },
        }),
      ]);

      if (sessionId) {
        await pusherServer.trigger(
          `session-${sessionId}`,
          "tutor-exercise:completed",
          {
            sessionId,
            exerciseId,
            status: "FAILED",
          },
        );
      }

      return NextResponse.json({ message: "Handled failure" }, { status: 200 });
    }

    if (!data.content) {
      throw new Error("Tutor exercise webhook missing content");
    }

    await prisma.$transaction([
      prisma.tutorExercise.update({
        where: { id: exerciseId },
        data: {
          status: "READY",
          content: data.content as unknown as Prisma.InputJsonValue,
        },
      }),
      prisma.systemTask.update({
        where: { id: task.id },
        data: { status: "COMPLETED" },
      }),
    ]);

    if (sessionId) {
      await pusherServer.trigger(
        `session-${sessionId}`,
        "tutor-exercise:completed",
        {
          sessionId,
          exerciseId,
          status: "READY",
        },
      );
    }

    return NextResponse.json(
      { ok: true, exerciseId, sessionId },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("❌ [handleTutorExercise] Error:", err);

    await prisma.systemTask
      .update({
        where: { id: task.id },
        data: { status: "FAILED" },
      })
      .catch(() => {});

    return NextResponse.json(
      { error: err?.message || "Failed to save tutor exercise" },
      { status: 500 },
    );
  }
}