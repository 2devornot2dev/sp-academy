// lib/foundation/setup-first-lesson.ts
"use server";

import { Gender, Languages, SystemTaskType } from "@prisma/client";
import type {
  InvokeEduBuilderPayload,
  LessonDbContext,
} from "@/app/actions/invoke-edu-builder";
import { prisma } from "@/lib/prisma";
import { getSpoonSpriteOrderIndex, getBridgeSpriteOrderIndex } from "./tools";

const BASE = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://spoonacademy.com"}/api/webhooks/system-tasks`;
const hookUrl = (taskId: string) => `${BASE}/${taskId}`;

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
  const candidate = CODE_TO_ENUM[raw.split("-")[0].toLowerCase()] ?? raw.toUpperCase();
  return (Object.values(Languages) as string[]).includes(candidate)
    ? (candidate as Languages)
    : undefined;
}

function toGender(g?: string | null): Gender {
  const upper = String(g || "").trim().toUpperCase();
  if (upper === "F" || upper === "FEMALE") return Gender.F;
  if (upper === "M" || upper === "MALE") return Gender.M;
  return Gender.N;
}

export async function setupFirstLesson(
  payload: InvokeEduBuilderPayload,
): Promise<LessonDbContext> {
  return prisma.$transaction(async (tx) => {
    // 0. Sync chosen languages & grammatical gender onto the User row
    await tx.user.update({
      where: { id: payload.userId },
      data: {
        nativeLanguage: toLanguage(payload.nativeLanguage),
        targetLanguage: toLanguage(payload.targetLanguage),
        gender: toGender(payload.gender),
      },
    });

    // 1. Lookup chosen Sprite (default to "vox") and upsert SpriteProfile with 3/3 Energy
    const chosenSlug = payload.spriteSlug || "vox";
    const sprite = await tx.sprite.findUnique({
      where: { slug: chosenSlug },
    });

    if (!sprite) {
      throw new Error(
        `Sprite "${chosenSlug}" not found. Run seed-sprites first.`,
      );
    }

    const nativeVoiceId =
      payload.nativeVoiceId ||
      `${payload.nativeLanguage}-${chosenSlug === "vivi" ? "girl" : "boy"}-01`;

    const targetVoiceId =
      payload.targetVoiceId ||
      `${payload.targetLanguage}-${chosenSlug === "vivi" ? "girl" : "boy"}-01`;

    const spriteProfile = await tx.spriteProfile.upsert({
      where: { userId: payload.userId },
      update: {
        spriteId: sprite.id,
        nativeLanguage: payload.nativeLanguage,
        targetLanguage: payload.targetLanguage,
        nativeVoiceId,
        targetVoiceId,
        energy: 3,
        maxEnergy: 3,
      },
      create: {
        userId: payload.userId,
        spriteId: sprite.id,
        nativeLanguage: payload.nativeLanguage,
        targetLanguage: payload.targetLanguage,
        nativeVoiceId,
        targetVoiceId,
        energy: 3,
        maxEnergy: 3,
      },
    });

    // 2. Idempotent Upsert for Course & Lesson 1 (prevents unique constraint crash on retry)
    const cacheKey = `${payload.userId}-${payload.nativeLanguage}-${payload.targetLanguage}-${payload.levelBand}-${payload.goal}`;

    const course = await tx.foundationCourse.upsert({
      where: {
        userId_cacheKey: {
          userId: payload.userId,
          cacheKey,
        },
      },
      update: {
        targetLanguage: payload.targetLanguage,
        nativeLanguage: payload.nativeLanguage,
      },
      create: {
        user: { connect: { id: payload.userId } },
        targetLanguage: payload.targetLanguage,
        nativeLanguage: payload.nativeLanguage,
        cacheKey,
        isHardMode: false,
      },
    });

    const lesson = await tx.foundationLesson.upsert({
      where: {
        foundationCourseId_orderIndex: {
          foundationCourseId: course.id,
          orderIndex: payload.spoon,
        },
      },
      update: {},
      create: {
        user: { connect: { id: payload.userId } },
        course: { connect: { id: course.id } },
        orderIndex: payload.spoon,
      },
    });

    // 3. Cache Check: Spoon 1 Node + Bridge 1 Node
    const spriteOrderIndex = getSpoonSpriteOrderIndex(payload.spoon);
    const nodeId = `${chosenSlug}:${nativeVoiceId}:${targetVoiceId}:${spriteOrderIndex}`;

    const bridgeOrderIndex = getBridgeSpriteOrderIndex(payload.spoon);
    const bridgeNodeId = `${chosenSlug}:${nativeVoiceId}:${targetVoiceId}:${bridgeOrderIndex}`;

    const [cachedSpriteNode, cachedBridgeNode] = await Promise.all([
      tx.spriteNode.findUnique({ where: { nodeId } }),
      tx.spriteNode.findUnique({ where: { nodeId: bridgeNodeId } }),
    ]);

    const taskPayload = JSON.stringify({
      ...payload,
      spriteSlug: chosenSlug,
      spriteName: sprite.name,
      persona: sprite.persona,
      nativeVoiceId,
      targetVoiceId,
      foundationCourseId: course.id,
      foundationLessonId: lesson.id,
      spriteProfileId: spriteProfile.id,
      spriteOrderIndex,
      orderIndex: spriteOrderIndex,
      nodeId,
    });

    const metadata = {
      type: payload.type,
      userId: payload.userId,
      courseId: course.id,
      foundationCourseId: course.id,
      foundationLessonId: lesson.id,
      spriteProfileId: spriteProfile.id,
      spriteOrderIndex,
      orderIndex: spriteOrderIndex,
      nativeLanguage: payload.nativeLanguage,
      targetLanguage: payload.targetLanguage,
      nodeId,
      day: payload.spoon,
      spoon: payload.spoon,
    };

    // 4. Create Core Spoon & Vocab Tasks
    const lessonTask = await tx.systemTask.create({
      data: {
        type: SystemTaskType.SPOON_GENERATION,
        payload: taskPayload,
        metadata,
      },
    });

    const vocabTask = await tx.systemTask.create({
      data: {
        type: SystemTaskType.VOCAB_BRIDGE_GENERATION,
        payload: taskPayload,
        metadata,
      },
    });

    // 5. Create Sprite Tasks if not cached
    let spriteTaskId: string | null = null;
    let spriteWebhookUrl: string | null = null;

    if (!cachedSpriteNode) {
      const spriteTask = await tx.systemTask.create({
        data: {
          type: SystemTaskType.SPRITE_NOTIFICATION_GENERATION,
          payload: taskPayload,
          metadata,
        },
      });
      spriteTaskId = spriteTask.id;
      spriteWebhookUrl = hookUrl(spriteTask.id);
    }

    let bridgeTaskId: string | null = null;
    let bridgeWebhookUrl: string | null = null;

    if (bridgeNodeId && bridgeOrderIndex && !cachedBridgeNode) {
      const bridgeTaskPayload = JSON.stringify({
        ...payload,
        stepType: "BRIDGE",
        spriteSlug: chosenSlug,
        spriteName: sprite.name,
        persona: sprite.persona,
        nativeVoiceId,
        targetVoiceId,
        foundationCourseId: course.id,
        foundationLessonId: lesson.id,
        spriteProfileId: spriteProfile.id,
        spriteOrderIndex: bridgeOrderIndex,
        orderIndex: bridgeOrderIndex,
        nodeId: bridgeNodeId,
      });

      const bridgeTask = await tx.systemTask.create({
        data: {
          type: SystemTaskType.SPRITE_NOTIFICATION_GENERATION,
          payload: bridgeTaskPayload,
          metadata: {
            ...metadata,
            stepType: "BRIDGE",
            orderIndex: bridgeOrderIndex,
            nodeId: bridgeNodeId,
          },
        },
      });
      bridgeTaskId = bridgeTask.id;
      bridgeWebhookUrl = hookUrl(bridgeTask.id);
    }

    return {
      courseId: course.id,
      lessonId: lesson.id,
      taskId: lessonTask.id,
      vocabTaskId: vocabTask.id,
      spriteTaskId,
      spriteProfileId: spriteProfile.id,
      webhookUrl: hookUrl(lessonTask.id),
      vocabWebhookUrl: hookUrl(vocabTask.id),
      spriteWebhookUrl,
      cachedSpriteNode,
      spriteSlug: chosenSlug,
      spriteName: sprite.name,
      persona: sprite.persona,
      nativeVoiceId,
      targetVoiceId,
      spriteOrderIndex,
      nodeId,
      bridgeTaskId,
      bridgeWebhookUrl,
      bridgeOrderIndex: bridgeOrderIndex ?? undefined,
      bridgeNodeId: bridgeNodeId ?? undefined,
    };
  });
}