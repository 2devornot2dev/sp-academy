// app/actions/invoke-edu-builder.ts
"use server";

import { lambda, createCommand } from "@/lib/aws/lambda";
import { prisma } from "@/lib/prisma";
import { JsonValue } from "@prisma/client/runtime/library";
import { setupFirstLesson } from "@/lib/foundation/setup-first-lesson";
import { setupNextLesson } from "@/lib/foundation/setup-next-lesson";
import Stripe from "stripe";
import {
  Billing,
  BillingInterval,
  PaymentStatus,
  Prisma,
} from "@prisma/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

// --- TYPE DEFINITIONS ---
export interface InvokeEduBuilderPayload {
  userId: string;
  firstName: string;
  gender: string;
  foundationCourseId?: string;
  spoon: number;
  nativeLanguage: string;
  targetLanguage: string;
  levelBand: string;
  goal: string;
  scriptComfort: string;
  type: string;
  isOnboarding: boolean;
  previous_lessons?: JsonValue[];
  sessionId?: string;

  // Sprite fields
  spriteSlug?: "vox" | "vivi";
  nativeVoiceId?: string;
  targetVoiceId?: string;

  yesterdayAttempted?: string[];
  yesterdayLanded?: string[];
}

export type InvokeEduBuilderResult =
  | { ok: true; lessonId: string; taskId: string }
  | { ok: false; error: string };

export interface LessonDbContext {
  courseId: string;
  lessonId: string;
  taskId: string;
  vocabTaskId: string;
  spriteTaskId?: string | null;
  spriteProfileId: string;
  webhookUrl: string;
  vocabWebhookUrl: string;
  spriteWebhookUrl?: string | null;
  cachedSpriteNode?: any | null;
  spriteSlug?: string;
  spriteName?: string;
  persona?: string | null;
  nativeVoiceId?: string;
  targetVoiceId?: string;
  spriteOrderIndex?: number;
  nodeId?: string;

  // Vocab Bridge Sprite Support
  bridgeTaskId?: string | null;
  bridgeWebhookUrl?: string | null;
  bridgeOrderIndex?: number;
  bridgeNodeId?: string;
}

function normalizeGender(g?: string | null): "M" | "F" | "N" {
  if (!g) return "N";
  const upper = g.trim().toUpperCase();
  if (upper === "M" || upper === "MALE") return "M";
  if (upper === "F" || upper === "FEMALE") return "F";
  return "N";
}

// ---------------------------------------------------------------------------
// HELPER 1: Stripe Subscription Transfer / Claiming
// ---------------------------------------------------------------------------
async function claimSubscriptionForUser(userId: string, sessionId?: string) {
  if (!sessionId) return;

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    if (!customerId && !subscriptionId) return;

    const existingBilling = await prisma.billingInformation.findFirst({
      where: {
        OR: [
          ...(subscriptionId ? [{ stripeSubscriptionId: subscriptionId }] : []),
          ...(customerId ? [{ stripeCustomerId: customerId }] : []),
        ],
      },
    });

    if (existingBilling) {
      if (existingBilling.userId !== userId) {
        const oldUserId = existingBilling.userId;

        await prisma.billingInformation.update({
          where: { id: existingBilling.id },
          data: { userId },
        });

        const oldUser = await prisma.user.findUnique({
          where: { id: oldUserId },
          include: { accounts: true, sessions: true },
        });

        if (
          oldUser &&
          oldUser.accounts.length === 0 &&
          oldUser.sessions.length === 0
        ) {
          await prisma.user.delete({ where: { id: oldUserId } }).catch(() => {});
        }

        console.log(`✅ Subscription transferred from ${oldUserId} to ${userId}`);
      }
    } else {
      let interval = BillingInterval.MONTHLY;
      let nextBillingDate: Date | null = null;
      let cancelAtPeriodEnd = false;

      if (subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const subItem = sub.items.data[0];

        const periodEnd =
          (sub as any).current_period_end ??
          (subItem as any)?.current_period_end;

        if (periodEnd) nextBillingDate = new Date(periodEnd * 1000);
        if (subItem?.price.recurring?.interval === "year")
          interval = BillingInterval.MONTHLY;
        cancelAtPeriodEnd = sub.cancel_at_period_end;
      }

      await prisma.billingInformation.upsert({
        where: { userId },
        create: {
          userId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          currentPlan: Billing.PRO_MONTHLY,
          billingInterval: interval,
          isActive: true,
          cancelAtPeriodEnd,
          paymentStatus: PaymentStatus.PAID,
          nextBillingDate,
          lastPaymentDate: new Date(),
        },
        update: {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          isActive: true,
        },
      });

      console.log(`✅ Subscription created on-the-fly for ${userId}`);
    }
  } catch (error) {
    console.error("❌ Failed to claim subscription:", error);
  }
}

// ---------------------------------------------------------------------------
// HELPER 2: Resolve Historical Context & Fallbacks for Returning Users
// ---------------------------------------------------------------------------
async function resolveHistoricalContext(
  courseId: string,
  currentLessonId: string,
  payload: InvokeEduBuilderPayload
) {
  let previous_lessons: any[] = [];
  let yesterdayLanded: string[] = [];

  let resolvedLevelBand = payload.levelBand;
  let resolvedGoal = payload.goal;
  let resolvedGender = normalizeGender(payload.gender);
  let resolvedFirstName = payload.firstName;

  const [pastLessons, firstTask, langProfile] = await Promise.all([
    prisma.foundationLesson.findMany({
      where: {
        foundationCourseId: courseId,
        id: { not: currentLessonId },
      },
      orderBy: { orderIndex: "asc" },
      select: { orderIndex: true, title: true, lessonHandoff: true },
    }),

    prisma.systemTask.findFirst({
      where: {
        type: "SPOON_GENERATION",
        metadata: {
          path: ["foundationCourseId"],
          equals: courseId,
        },
      },
      orderBy: { createdAt: "asc" },
      select: { payload: true },
    }),

    // Fetch saved per-language levelBand & goal from LanguageProfile
    prisma.languageProfile
      .findUnique({
        where: {
          userId_languageCode: {
            userId: payload.userId,
            languageCode: payload.targetLanguage,
          },
        },
      })
      .catch(() => null),
  ]);

  // Strip heavy S3 audio paths and intro/outro strings right here so SystemTask payloads stay tiny
  previous_lessons = pastLessons.map((l) => {
    const {
      wordAudio,
      wordLexicon,
      introNativeAudio,
      introTargetAudio,
      outroNativeAudio,
      outroTargetAudio,
      npcAudio,
      introNative,
      introTarget,
      outroNative,
      outroTarget,
      ...cleanHandoff
    } = (l.lessonHandoff as Record<string, any>) || {};
    return {
      day: l.orderIndex,
      theme: l.title || cleanHandoff.theme || "",
      ...cleanHandoff,
    };
  });

  if (pastLessons.length > 0) {
    const lastHandoff = pastLessons[pastLessons.length - 1]
      .lessonHandoff as any;
    if (lastHandoff) {
      yesterdayLanded =
        lastHandoff.taughtChunks ||
        lastHandoff.targetPhrases ||
        lastHandoff.words ||
        [];
    }
  }

  let initialData: Record<string, any> | null = null;
  if (firstTask?.payload) {
    try {
      initialData =
        typeof firstTask.payload === "string"
          ? JSON.parse(firstTask.payload)
          : (firstTask.payload as Record<string, any>);
    } catch (e) {
      console.warn("Could not parse initial task payload:", e);
    }
  }

  // ✅ Always prioritize saved LanguageProfile -> Onboarding Task #1 over generic "beginner"/"general" fallbacks!
  const dbLevel = (langProfile as any)?.levelBand || initialData?.levelBand;
  if (
    dbLevel &&
    (!resolvedLevelBand ||
      resolvedLevelBand === "unspecified" ||
      resolvedLevelBand === "beginner")
  ) {
    resolvedLevelBand = dbLevel;
  }

  const dbGoal = (langProfile as any)?.goal || initialData?.goal;
  if (
    dbGoal &&
    (!resolvedGoal ||
      resolvedGoal === "unspecified" ||
      resolvedGoal === "general")
  ) {
    resolvedGoal = dbGoal;
  }

  if (resolvedGender === "N" && initialData?.gender) {
    resolvedGender = normalizeGender(initialData.gender);
  }
  if (!resolvedFirstName || resolvedFirstName === "Learner") {
    resolvedFirstName = initialData?.firstName || resolvedFirstName;
  }

  return {
    previous_lessons,
    yesterdayLanded,
    resolvedLevelBand: (resolvedLevelBand || "zero").toLowerCase(),
    resolvedGoal: (resolvedGoal || "general").toLowerCase(),
    resolvedGender,
    resolvedFirstName: resolvedFirstName || "there",
  };
}

// ---------------------------------------------------------------------------
// HELPER 3: Construct Standardized Sprite Lambda Payload
// ---------------------------------------------------------------------------
function buildSpritePayload(
  stepType: "SPOON" | "BRIDGE",
  orderIndex: number,
  nodeId: string,
  webhookUrl: string,
  spoonNumber: number,
  milestoneIndex: number,
  milestoneSubStep: number,
  dbContext: LessonDbContext,
  normalizedPayload: InvokeEduBuilderPayload,
  resolvedLevelBand: string,
  resolvedGoal: string
) {
  return {
    spriteSlug: dbContext.spriteSlug || normalizedPayload.spriteSlug || "vox",
    spriteName: dbContext.spriteName || "Vox",
    persona: dbContext.persona || "",
    nativeLanguage: normalizedPayload.nativeLanguage,
    targetLanguage: normalizedPayload.targetLanguage,
    nativeVoiceId: dbContext.nativeVoiceId || normalizedPayload.nativeVoiceId,
    targetVoiceId: dbContext.targetVoiceId || normalizedPayload.targetVoiceId,
    spoon: spoonNumber,
    milestoneIndex,
    subStep: milestoneSubStep,
    orderIndex,
    stepType,
    levelBand: resolvedLevelBand,
    goal: resolvedGoal,
    nodeId,
    webhookUrl,
  };
}

// ---------------------------------------------------------------------------
// HELPER 4: AWS Lambda Dispatcher & Error Rollback
// ---------------------------------------------------------------------------
async function dispatchEduAndSpriteLambdas(
  dbContext: LessonDbContext,
  lambdaPayload: any,
  spriteSpoonPayload?: any,
  spriteBridgePayload?: any
) {
  await prisma.systemTask
    .update({
      where: { id: dbContext.taskId },
      data: { payload: lambdaPayload as Prisma.InputJsonValue },
    })
    .catch((e) =>
      console.warn("Could not save lambdaPayload to SystemTask:", e)
    );

  const invocations: Promise<any>[] = [
    lambda.send(
      createCommand({
        functionName: "spoon-edu-builder",
        payload: { body: JSON.stringify(lambdaPayload) },
        invocationType: "Event",
      })
    ),
  ];

  // 1. Spoon Sprite Task
  if (spriteSpoonPayload && dbContext.spriteTaskId) {
    await prisma.systemTask
      .update({
        where: { id: dbContext.spriteTaskId },
        data: { payload: spriteSpoonPayload as Prisma.InputJsonValue },
      })
      .catch(() => {});

    invocations.push(
      lambda.send(
        createCommand({
          functionName: "spoon-sprite-builder",
          payload: { body: JSON.stringify(spriteSpoonPayload) },
          invocationType: "Event",
        })
      )
    );
  }

  // 2. Vocab Bridge Sprite Task
  if (spriteBridgePayload && dbContext.bridgeTaskId) {
    await prisma.systemTask
      .update({
        where: { id: dbContext.bridgeTaskId },
        data: { payload: spriteBridgePayload as Prisma.InputJsonValue },
      })
      .catch(() => {});

    invocations.push(
      lambda.send(
        createCommand({
          functionName: "spoon-sprite-builder",
          payload: { body: JSON.stringify(spriteBridgePayload) },
          invocationType: "Event",
        })
      )
    );
  }

  try {
    const [eduResponse] = await Promise.all(invocations);

    if (eduResponse.StatusCode !== 202) {
      throw new Error(`Unexpected lambda status: ${eduResponse.StatusCode}`);
    }
  } catch (error) {
    console.error("❌ Error invoking Lambda:", error);

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
      .catch((e) => console.error("Could not mark tasks failed", e));

    await prisma.foundationLesson
      .delete({ where: { id: dbContext.lessonId } })
      .catch((e) => console.error("Could not delete empty lesson", e));

    throw error;
  }
}

// ---------------------------------------------------------------------------
// MAIN SERVER ACTION: invokeEduBuilder
// ---------------------------------------------------------------------------
export async function invokeEduBuilder(
  payload: InvokeEduBuilderPayload
): Promise<InvokeEduBuilderResult> {
  if (payload.sessionId) {
    await claimSubscriptionForUser(payload.userId, payload.sessionId);
  }

  const normalizedPayload: InvokeEduBuilderPayload = {
    ...payload,
    gender: normalizeGender(payload.gender),
    levelBand: (payload.levelBand || "zero").toLowerCase(),
    goal: (payload.goal || "general").toLowerCase(),
  };

  // Persist levelBand & goal to LanguageProfile during Onboarding (or when explicitly provided)
  if (normalizedPayload.isOnboarding && normalizedPayload.targetLanguage) {
    await prisma.languageProfile
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
      );
  }

  // 1. Setup Lesson, Course, & SpriteProfile in Postgres
  let dbContext: LessonDbContext;
  try {
    dbContext = normalizedPayload.isOnboarding
      ? await setupFirstLesson(normalizedPayload)
      : await setupNextLesson(normalizedPayload);
  } catch (error) {
    console.error("❌ Lesson setup failed:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Setup failed",
    };
  }

  const milestoneIndex = Math.ceil(normalizedPayload.spoon / 3);
  const milestoneSubStep = ((normalizedPayload.spoon - 1) % 3) + 1;

  // 2. Resolve Historical Context & Fallbacks for returning users
  let previous_lessons: any[] = [];
  let yesterdayLanded: string[] = [];
  let resolvedLevelBand = normalizedPayload.levelBand;
  let resolvedGoal = normalizedPayload.goal;
  let resolvedGender = normalizedPayload.gender;
  let resolvedFirstName = normalizedPayload.firstName;

  if (!normalizedPayload.isOnboarding && dbContext.courseId) {
    const hist = await resolveHistoricalContext(
      dbContext.courseId,
      dbContext.lessonId,
      normalizedPayload
    );
    previous_lessons = hist.previous_lessons;
    yesterdayLanded = hist.yesterdayLanded;
    resolvedLevelBand = hist.resolvedLevelBand;
    resolvedGoal = hist.resolvedGoal;
    resolvedGender = hist.resolvedGender;
    resolvedFirstName = hist.resolvedFirstName;
  }

  // 3. Resolve Voice IDs & Sprite Metadata
  const resolvedSpriteSlug =
    dbContext.spriteSlug || normalizedPayload.spriteSlug || "vox";
  const resolvedSpriteName = dbContext.spriteName || "Vox";
  const resolvedPersona = dbContext.persona || "";
  const resolvedNativeVoiceId =
    dbContext.nativeVoiceId || normalizedPayload.nativeVoiceId;
  const resolvedTargetVoiceId =
    dbContext.targetVoiceId || normalizedPayload.targetVoiceId;

  // 4. Assemble main spoon-edu-builder payload
  const lambdaPayload = {
    ...normalizedPayload,
    type: "lang",
    day: normalizedPayload.spoon,
    milestoneIndex,
    subStep: milestoneSubStep,
    foundationCourseId: dbContext.courseId,
    foundationLessonId: dbContext.lessonId,
    webhookUrl: dbContext.webhookUrl,
    vocabWebhookUrl: dbContext.vocabWebhookUrl,
    spriteWebhookUrl: dbContext.spriteWebhookUrl,
    spriteSlug: resolvedSpriteSlug,
    spriteName: resolvedSpriteName,
    persona: resolvedPersona,
    nativeVoiceId: resolvedNativeVoiceId,
    targetVoiceId: resolvedTargetVoiceId,
    levelBand: resolvedLevelBand || "zero",
    goal: resolvedGoal || "general",
    gender: resolvedGender,
    firstName: resolvedFirstName || "there",
    previous_lessons:
      previous_lessons.length > 0
        ? previous_lessons
        : normalizedPayload.previous_lessons,
    yesterdayAttempted:
      yesterdayLanded.length > 0
        ? yesterdayLanded
        : normalizedPayload.yesterdayAttempted,
    yesterdayLanded:
      yesterdayLanded.length > 0
        ? yesterdayLanded
        : normalizedPayload.yesterdayLanded,
  };

  // 5. Construct Sprite Payloads if not cached
  let spriteSpoonPayload: any = null;
  if (
    dbContext.spriteWebhookUrl &&
    dbContext.spriteTaskId &&
    dbContext.spriteOrderIndex &&
    dbContext.nodeId
  ) {
    spriteSpoonPayload = buildSpritePayload(
      "SPOON",
      dbContext.spriteOrderIndex,
      dbContext.nodeId,
      dbContext.spriteWebhookUrl,
      normalizedPayload.spoon,
      milestoneIndex,
      milestoneSubStep,
      dbContext,
      normalizedPayload,
      resolvedLevelBand,
      resolvedGoal
    );
  }

  let spriteBridgePayload: any = null;
  if (
    dbContext.bridgeWebhookUrl &&
    dbContext.bridgeTaskId &&
    dbContext.bridgeOrderIndex &&
    dbContext.bridgeNodeId
  ) {
    spriteBridgePayload = buildSpritePayload(
      "BRIDGE",
      dbContext.bridgeOrderIndex,
      dbContext.bridgeNodeId,
      dbContext.bridgeWebhookUrl,
      normalizedPayload.spoon,
      milestoneIndex,
      milestoneSubStep,
      dbContext,
      normalizedPayload,
      resolvedLevelBand,
      resolvedGoal
    );
  }

  // 6. Dispatch Lambdas
  try {
    await dispatchEduAndSpriteLambdas(
      dbContext,
      lambdaPayload,
      spriteSpoonPayload,
      spriteBridgePayload
    );

    return { ok: true, lessonId: dbContext.lessonId, taskId: dbContext.taskId };
  } catch {
    return {
      ok: false,
      error: "Could not start the next lesson. Please try again.",
    };
  }
}