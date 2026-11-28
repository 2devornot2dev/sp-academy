// app/actions/invoke-trial-builder.ts
"use server";

import { lambda, createCommand } from "@/lib/aws/lambda";
import { prisma } from "@/lib/prisma";
import { setupFirstLesson } from "@/lib/foundation/setup-first-lesson";
import { Gender, Languages, PaymentStatus, Prisma } from "@prisma/client";
import { setLiveTaskState } from "@/app/actions/system-task-actions";
import { notifyNewTrial } from "@/lib/telegram";
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

// Converts "en-US", "fr-FR", "english", "FRENCH" etc. into the Prisma Languages enum.
// Returns undefined if it can't match, so Prisma leaves the field alone.
const CODE_TO_ENUM: Record<string, string> = {
  en: "ENGLISH",
  fr: "FRENCH",
  es: "SPANISH",
  de: "GERMAN",
  it: "ITALIAN",
  pt: "PORTUGUESE",
};

function toLanguage(v?: string | null): Languages | undefined {
  if (!v) return undefined;
  const raw = v.trim();
  const candidate =
    CODE_TO_ENUM[raw.split("-")[0].toLowerCase()] ?? raw.toUpperCase();
  return (Object.values(Languages) as string[]).includes(candidate)
    ? (candidate as Languages)
    : undefined;
}

export async function invokeTrialBuilder(
  payload: InvokeEduBuilderPayload,
): Promise<InvokeEduBuilderResult> {
  const cleanGender = normalizeGender(payload.gender);
  const normalizedPayload: InvokeEduBuilderPayload = {
    ...payload,
    gender: cleanGender,
    levelBand: (payload.levelBand || "zero").toLowerCase(),
    goal: (payload.goal || "general").toLowerCase(),
  };

  // 1. Save User languages/gender, mark Billing as TRIAL, & persist LanguageProfile in parallel
  await Promise.all([
    prisma.user
      .update({
        where: { id: normalizedPayload.userId },
        data: {
          nativeLanguage: toLanguage(normalizedPayload.nativeLanguage),
          targetLanguage: toLanguage(normalizedPayload.targetLanguage),
          gender: cleanGender as Gender,
        },
      })
      .catch((e) => console.warn("User language update skipped:", e)),

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
            console.warn("LanguageProfile levelBand upsert skipped:", e),
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

  // 3. Assemble payload for spoon-trial-builder
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

  // 4. Save payload to the SystemTask
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

  // 6. Invoke spoon-trial-builder (with rollback cleanup if invocation fails)
  try {
    const response = await lambda.send(
      createCommand({
        functionName: "spoon-trial-builder",
        payload: { body: JSON.stringify(trialLambdaPayload) },
        invocationType: "Event",
      }),
    );

    if (response.StatusCode !== 202) {
      throw new Error(
        `Trial lambda failed with status: ${response.StatusCode}`,
      );
    }

    void notifyNewTrial(normalizedPayload.targetLanguage);

    return { ok: true, lessonId: dbContext.lessonId, taskId: dbContext.taskId };
  } catch (err) {
    console.error("❌ Error invoking spoon-trial-builder:", err);

    await prisma.systemTask
      .updateMany({
        where: {
          id: {
            in: [
              dbContext.taskId,
              dbContext.vocabTaskId,
              ...(dbContext.spriteTaskId ? [dbContext.spriteTaskId] : []),
              ...(dbContext.bridgeTaskId ? [dbContext.bridgeTaskId] : []),
            ],
          },
        },
        data: { status: "FAILED" },
      })
      .catch(() => {});

    await prisma.foundationLesson
      .delete({ where: { id: dbContext.lessonId } })
      .catch(() => {});

    return { ok: false, error: "Could not start free trial." };
  }
}