// app/actions/invoke-trial-builder.ts
"use server";

import { lambda, createCommand } from "@/lib/aws/lambda";
import { prisma } from "@/lib/prisma";
import { setupFirstLesson } from "@/lib/foundation/setup-first-lesson";
import { PaymentStatus, Prisma } from "@prisma/client";
import { setLiveTaskState } from "@/app/actions/system-task-actions";
import type {
  InvokeEduBuilderPayload,
  InvokeEduBuilderResult,
} from "./invoke-edu-builder";

function normalizeGender(g?: string | null): "M" | "F" | "N" {
  if (!g) return "N";
  const upper = g.trim().toUpperCase();
  if (upper === "M" || upper === "MALE") return "M";
  if (upper === "F" || upper === "FEMALE") return "F";
  return "N";
}

export async function invokeTrialBuilder(
  payload: InvokeEduBuilderPayload
): Promise<InvokeEduBuilderResult> {
  const normalizedPayload: InvokeEduBuilderPayload = {
    ...payload,
    gender: normalizeGender(payload.gender),
    levelBand: (payload.levelBand || "zero").toLowerCase(),
    goal: (payload.goal || "general").toLowerCase(),
  };

  // 1. Mark Billing as TRIAL & Persist levelBand + goal on LanguageProfile in parallel
  await Promise.all([
    prisma.billingInformation.upsert({
      where: { userId: normalizedPayload.userId },
      create: {
        userId: normalizedPayload.userId,
        paymentStatus: PaymentStatus.TRIAL,
        isActive: true,
      },
      update: {
        paymentStatus: PaymentStatus.TRIAL,
        isActive: true,
      },
    }),

    normalizedPayload.targetLanguage
      ? prisma.languageProfile
          .upsert({
            where: {
              userId_languageCode: {
                userId: normalizedPayload.userId,
                languageCode: normalizedPayload.targetLanguage,
              },
            },
            create: {
              userId: normalizedPayload.userId,
              languageCode: normalizedPayload.targetLanguage,
              levelBand: normalizedPayload.levelBand,
              goal: normalizedPayload.goal,
            } as any,
            update: {
              levelBand: normalizedPayload.levelBand,
              goal: normalizedPayload.goal,
            } as any,
          })
          .catch((e) =>
            console.warn("LanguageProfile levelBand upsert skipped:", e)
          )
      : Promise.resolve(),
  ]);

  // 2. Set up Lesson, Course, SystemTask, & SpriteProfile in Postgres
  let dbContext;
  try {
    dbContext = await setupFirstLesson(normalizedPayload);
  } catch (error) {
    console.error("❌ Trial lesson setup failed:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Trial setup failed",
    };
  }

  // 3. Assemble payload for spoon-trial-builder (including levelBand, vocabWebhookUrl, & Sprite voices!)
  const trialLambdaPayload = {
    ...normalizedPayload,
    type: "lang",
    day: normalizedPayload.spoon || 1,
    milestoneIndex: 1,
    subStep: 1,
    levelBand: normalizedPayload.levelBand,
    goal: normalizedPayload.goal,
    foundationCourseId: dbContext.courseId,
    foundationLessonId: dbContext.lessonId,
    webhookUrl: dbContext.webhookUrl,
    vocabWebhookUrl: dbContext.vocabWebhookUrl,
    spriteWebhookUrl: dbContext.spriteWebhookUrl,
    spriteSlug: dbContext.spriteSlug || normalizedPayload.spriteSlug || "vox",
    spriteName: dbContext.spriteName || "Vox",
    persona: dbContext.persona || "",
    nativeVoiceId: dbContext.nativeVoiceId || normalizedPayload.nativeVoiceId,
    targetVoiceId: dbContext.targetVoiceId || normalizedPayload.targetVoiceId,
  };

  // 4. Save payload to the SystemTask (so retry works if needed AND Spoon 2 can read Task #1 fallback!)
  await prisma.systemTask
    .update({
      where: { id: dbContext.taskId },
      data: {
        payload: trialLambdaPayload as unknown as Prisma.InputJsonValue,
      },
    })
    .catch((e) => console.warn("Could not save payload to SystemTask:", e));

  // 5. Tell Redis we are building Spoon 1
  await setLiveTaskState(normalizedPayload.userId, {
    taskId: dbContext.taskId,
    taskType: "SPOON_GENERATION",
    status: "BUILDING",
    label: "Spoon 1 Trial Lesson",
    courseId: dbContext.courseId,
    spoon: 1,
    updatedAt: new Date().toISOString(),
  });

  // 6. Invoke spoon-trial-builder
  try {
    const response = await lambda.send(
      createCommand({
        functionName: "spoon-trial-builder",
        payload: { body: JSON.stringify(trialLambdaPayload) },
        invocationType: "Event",
      })
    );

    if (response.StatusCode !== 202) {
      throw new Error(`Trial lambda failed with status: ${response.StatusCode}`);
    }

    return { ok: true, lessonId: dbContext.lessonId, taskId: dbContext.taskId };
  } catch (err) {
    console.error("❌ Error invoking spoon-trial-builder:", err);
    return { ok: false, error: "Could not start free trial." };
  }
}