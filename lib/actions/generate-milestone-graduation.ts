// lib/actions/generate-milestone-graduation.ts
"use server";

import { prisma } from "@/lib/prisma";
import { createCommand, lambda } from "@/lib/aws/lambda";
import { toLanguageCode } from "@/lib/languages";
import { getUserEntitlements } from "@/lib/billing/entitlements";
import { GraduationTaskMetadataSchema } from "@/lib/graduation/schemas";
import { SystemTaskType } from "@prisma/client";

const GRADUATION_LAMBDA = "spoon-milestone-graduation";
const BASE_WEBHOOK = "https://spoonacademy.com/api/webhooks/system-tasks"

export async function generateMilestoneGraduation({
  userId,
  courseId,
  milestoneIndex,
}: {
  userId: string;
  courseId: string;
  milestoneIndex: number;
}) {
  const startIndex = (milestoneIndex - 1) * 3 + 1;
  const endIndex = milestoneIndex * 3;

  const [course, existingGraduation, spriteProfile, entitlements] =
    await Promise.all([
      prisma.foundationCourse.findUnique({
        where: { id: courseId },
        include: { user: { select: { firstName: true, gender: true } } },
      }),
      prisma.milestoneGraduation.findUnique({
        where: {
          foundationCourseId_milestoneIndex: {
            foundationCourseId: courseId,
            milestoneIndex,
          },
        },
      }),
      prisma.spriteProfile.findUnique({
        where: { userId },
        include: { sprite: true },
      }),
      getUserEntitlements(userId),
    ]);

  if (!course) {
    throw new Error(`Course ${courseId} not found`);
  }

  // Free trial covers Milestone 1 Boss + Graduation only
  if (entitlements.isTrial && milestoneIndex > 1) {
    console.log(
      `🔒 [TRIAL] Skipping Milestone ${milestoneIndex} Graduation for trial user ${userId}`,
    );
    return { ok: false, skipped: true };
  }

  // Skip if already BUILDING or READY
  if (
    existingGraduation &&
    (existingGraduation.status === "BUILDING" ||
      existingGraduation.status === "READY")
  ) {
    return {
      ok: true,
      graduationId: existingGraduation.id,
      status: existingGraduation.status,
    };
  }

  const lessons = await prisma.foundationLesson.findMany({
    where: {
      foundationCourseId: courseId,
      orderIndex: { gte: startIndex, lte: endIndex },
    },
    orderBy: { orderIndex: "asc" },
    select: {
      id: true,
      orderIndex: true,
      title: true,
      lessonHandoff: true,
      grammarContent: true,
      pronunciationData: true,
      visualContent: true,
    },
  });

  if (lessons.length < 3) {
    console.warn(
      `⚠️ Cannot trigger Milestone ${milestoneIndex} Graduation: found ${lessons.length}/3 lessons`,
    );
    return { ok: false, skipped: true };
  }

  const targetLanguage = toLanguageCode(course.targetLanguage);
  const nativeLanguage = toLanguageCode(course.nativeLanguage);

  const spriteSlug = spriteProfile?.sprite.slug || "vox";
  const defaultSuffix = spriteSlug === "vivi" ? "girl-01" : "boy-01";
  const spriteName =
    spriteProfile?.sprite.name || (spriteSlug === "vivi" ? "Vivi" : "Vox");
  const nativeVoiceId =
    spriteProfile?.nativeVoiceId || `${nativeLanguage}-${defaultSuffix}`;
  const targetVoiceId =
    spriteProfile?.targetVoiceId || `${targetLanguage}-${defaultSuffix}`;

  const mappedLessons = lessons.map((l) => {
    const lh = (l.lessonHandoff as Record<string, any>) || {};
    const gc = (l.grammarContent as Record<string, any>) || {};
    const pd = (l.pronunciationData as Record<string, any>) || {};
    const vc = (l.visualContent as Record<string, any>) || {};
    return {
      id: l.id,
      orderIndex: l.orderIndex,
      title: l.title || lh.theme || `Spoon ${l.orderIndex}`,
      theme: lh.theme || l.title || "",
      taughtChunks: lh.taughtChunks || [],
      targetSentence: gc.targetSentence || lh.targetSentence || "",
      nativeSentence: gc.nativeSentence || "",
      audioS3Key: pd.audioS3Key || null,
      visualImageS3Key: vc.imageS3Key || null,
      sceneDescription: vc.sceneDescription || "",
    };
  });

  // Full-circle callback: prefer Spoon 1's location image, falling back to Spoon 2 or 3
  const anchorSceneImageS3Key =
    mappedLessons.find((l) => Boolean(l.visualImageS3Key))?.visualImageS3Key ||
    null;

  const graduation = await prisma.milestoneGraduation.upsert({
    where: {
      foundationCourseId_milestoneIndex: {
        foundationCourseId: courseId,
        milestoneIndex,
      },
    },
    create: {
      userId,
      foundationCourseId: courseId,
      milestoneIndex,
      status: "BUILDING",
    },
    update: {
      status: "BUILDING",
      coverImageS3Key: null,
      videoS3Key: null,
      audioNativeS3Key: null,
      audioTargetS3Key: null,
      graduationData: undefined,
    },
  });

  const metadata = GraduationTaskMetadataSchema.parse({
    graduationId: graduation.id,
    userId,
    courseId,
    milestoneIndex,
  });

  const lambdaPayload = {
    taskId: "", // populated after SystemTask creation
    graduationId: graduation.id,
    userId,
    courseId,
    firstName: course.user.firstName || "there",
    gender: course.user.gender || "N",
    milestoneIndex,
    nativeLanguage,
    targetLanguage,
    isHardMode: course.isHardMode,
    spriteSlug,
    spriteName,
    persona: spriteProfile?.sprite.persona || "",
    nativeVoiceId,
    targetVoiceId,
    anchorSceneImageS3Key,
    lessons: mappedLessons,
  };

  const systemTask = await prisma.systemTask.create({
    data: {
      type: SystemTaskType.GENERATE_MILESTONE_GRADUATION,
      metadata,
      payload: lambdaPayload,
    },
  });

  const fullPayload = {
    ...lambdaPayload,
    taskId: systemTask.id,
    webhookUrl: `${BASE_WEBHOOK}/${systemTask.id}`,
  };

  try {
    await lambda.send(
      createCommand({
        functionName: GRADUATION_LAMBDA,
        invocationType: "Event",
        payload: JSON.stringify(fullPayload),
      }),
    );

    console.log(
      `🎓 Triggered Milestone ${milestoneIndex} Graduation for course ${courseId} (task=${systemTask.id})`,
    );

    return { ok: true, graduationId: graduation.id, taskId: systemTask.id };
  } catch (error) {
    console.error("❌ Failed to invoke Graduation Lambda:", error);

    await prisma.$transaction([
      prisma.milestoneGraduation.update({
        where: { id: graduation.id },
        data: { status: "FAILED" },
      }),
      prisma.systemTask.update({
        where: { id: systemTask.id },
        data: { status: "FAILED", error: "Lambda invocation failed" },
      }),
    ]);

    throw error;
  }
}