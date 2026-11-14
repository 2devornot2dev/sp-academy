// app/actions/invoke-tutor-exercise.ts
"use server";

import { prisma } from "@/lib/prisma";
import { lambda, createCommand } from "@/lib/aws/lambda";
import { Prisma, SystemTaskType } from "@prisma/client";

const TUTOR_EXERCISE_LAMBDA =
  process.env.TUTOR_EXERCISE_LAMBDA_NAME ?? "spoon-tutor-builder";

const BASE_WEBHOOK = `${
  process.env.NEXT_PUBLIC_APP_URL2 ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://spoonacademy.com"
}/api/webhooks/system-tasks`;

// Default Fish Audio voice IDs per language + tutor gender
const TUTOR_FISH_VOICES: Record<string, { FEMALE: string; MALE: string }> = {
  "fr-FR": {
    FEMALE: "d99596e8405d4651bcd3ebe45df58f97",
    MALE: "d99596e8405d4651bcd3ebe45df58f97",
  },
  "es-ES": {
    FEMALE: "d99596e8405d4651bcd3ebe45df58f97",
    MALE: "d99596e8405d4651bcd3ebe45df58f97",
  },
};

export type InvokeTutorExerciseResult =
  | {
      ok: true;
      exerciseId: string;
      taskId: string;
      status: string;
    }
  | {
      ok: false;
      error: string;
    };

export async function invokeTutorExercise({
  sessionId,
}: {
  sessionId: string;
}): Promise<InvokeTutorExerciseResult> {
  try {
    const session = await prisma.freestyleSession.findUnique({
      where: { id: sessionId },
      include: {
        review: {
          include: { tutorExercise: true },
        },
      },
    });

    if (!session || !session.review) {
      return {
        ok: false,
        error: "Conversation review not found for this session.",
      };
    }

    const review = session.review;

    // If exercise already exists (and didn't fail), return it immediately
    if (review.tutorExercise && review.tutorExercise.status !== "FAILED") {
      return {
        ok: true,
        exerciseId: review.tutorExercise.id,
        taskId: "existing",
        status: review.tutorExercise.status,
      };
    }

    // 🛑 1-AT-A-TIME GUARD: Block if user already has another TutorExercise building
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
    const activeBuilding = await prisma.tutorExercise.findFirst({
      where: {
        userId: session.userId,
        status: "BUILDING",
        updatedAt: { gt: fiveMinsAgo },
      },
      select: { id: true, freestyleSessionId: true },
    });

    if (activeBuilding && activeBuilding.freestyleSessionId !== session.id) {
      return {
        ok: false,
        error:
          "You already have a 3-Minute Workout building! Please wait for it to finish before generating another.",
      };
    }

    const mistakes = Array.isArray(review.mistakes) ? review.mistakes : [];
    const vocabUpgrades = Array.isArray(review.vocabUpgrades)
      ? (review.vocabUpgrades as any[])
      : [];
    const grammarAnalysis = review.grammarAnalysis ?? {};
    const overallFeedback = (review.overallFeedback as Record<string, any>) ?? {};
    const tutorName = overallFeedback.tutorName || "Sophie";

    const targetLang =
      session.targetLanguage === "fr"
        ? "fr-FR"
        : session.targetLanguage === "es"
          ? "es-ES"
          : session.targetLanguage || "fr-FR";
    const nativeLang =
      session.nativeLanguage === "en"
        ? "en-US"
        : session.nativeLanguage || "en-US";

    const targetFishVoiceId =
      TUTOR_FISH_VOICES[targetLang]?.[session.voiceGender] ??
      "d99596e8405d4651bcd3ebe45df58f97";

    const title = session.topic
      ? `3-Min Workout: ${session.topic}`
      : "3-Min AI Tutor Workout";

    const { exercise, systemTask } = await prisma.$transaction(async (tx) => {
      const ex = await tx.tutorExercise.upsert({
        where: { freestyleReviewId: review.id },
        create: {
          userId: session.userId,
          freestyleSessionId: session.id,
          freestyleReviewId: review.id,
          title,
          status: "BUILDING",
          sourceMistakes: mistakes as Prisma.InputJsonValue,
          vocabUpgrades: vocabUpgrades as Prisma.InputJsonValue,
        },
        update: {
          status: "BUILDING",
          sourceMistakes: mistakes as Prisma.InputJsonValue,
          vocabUpgrades: vocabUpgrades as Prisma.InputJsonValue,
        },
      });

      const task = await tx.systemTask.create({
        data: {
          type: SystemTaskType.TUTOR_EXERCISE_GENERATION, // <-- Add to SystemTaskType enum in schema.prisma
          status: "IN_PROGRESS",
          metadata: {
            userId: session.userId,
            sessionId: session.id,
            reviewId: review.id,
            exerciseId: ex.id,
          },
        },
      });

      return { exercise: ex, systemTask: task };
    });

    const webhookUrl = `${BASE_WEBHOOK}/${systemTask.id}`;

    const lambdaPayload = {
      taskId: systemTask.id,
      exerciseId: exercise.id,
      sessionId: session.id,
      reviewId: review.id,
      userId: session.userId,
      tutorName,
      topic: session.topic || "Conversation",
      nativeLanguage: nativeLang,
      targetLanguage: targetLang,
      targetFishVoiceId,
      reviewMistakes: mistakes,
      vocabUpgrades,
      grammarAnalysis,
      webhookUrl,
    };

    await prisma.systemTask.update({
      where: { id: systemTask.id },
      data: { payload: lambdaPayload as unknown as Prisma.InputJsonValue },
    });

    const res = await lambda.send(
      createCommand({
        functionName: TUTOR_EXERCISE_LAMBDA,
        invocationType: "Event",
        payload: { body: JSON.stringify(lambdaPayload) },
      }),
    );

    if (res.StatusCode !== 202) {
      throw new Error(`Unexpected Lambda status: ${res.StatusCode}`);
    }

    return {
      ok: true,
      exerciseId: exercise.id,
      taskId: systemTask.id,
      status: "BUILDING",
    };
  } catch (error: any) {
    console.error("❌ [invokeTutorExercise] failed:", error);
    return {
      ok: false,
      error: error.message || "Could not start AI Tutor Exercise generation.",
    };
  }
}