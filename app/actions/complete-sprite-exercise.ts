// app/actions/complete-sprite-exercise.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getPresignedUrls } from "@/app/actions/s3";
import { awardSpriteEnergy } from "@/app/actions/sprite-energy";
import { getUserMilestoneTag } from "@/app/actions/invoke-sprite-exercise";
import type { SpriteExerciseContent } from "@/lib/schema/sprite-exercise-schema";

export interface HydratedSpriteExercise {
  id: string;
  title: string;
  status: string;
  currentMilestone: number;
  energyReward: number;
  rewardClaimed: boolean;
  content: SpriteExerciseContent | null;
}

/**
 * Fetches the user's SpriteExercise for the CURRENT Milestone (or any active READY/BUILDING one)
 */
export async function getActiveSpriteExercise(
  userId: string
): Promise<HydratedSpriteExercise | null> {
  const { currentMilestone, milestoneTag } = await getUserMilestoneTag(userId);

  const ex = await prisma.spriteExercise.findFirst({
    where: {
      userId,
      OR: [
        { courseId: milestoneTag },
        { status: { in: ["BUILDING", "READY"] } },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  if (!ex) return null;

  const rawContent = ex.content as SpriteExerciseContent | null;
  if (!rawContent || (ex.status !== "READY" && ex.status !== "COMPLETED")) {
    return {
      id: ex.id,
      title: ex.title,
      status: ex.status,
      currentMilestone,
      energyReward: ex.energyReward,
      rewardClaimed: ex.rewardClaimed,
      content: null,
    };
  }

  const s3Keys: string[] = [];
  rawContent.visualMatch?.cards?.forEach((c) => {
    if (c.imageS3Key) s3Keys.push(c.imageS3Key);
    if (c.audioS3Key) s3Keys.push(c.audioS3Key);
  });
  rawContent.sentenceDash?.items?.forEach((it) => {
    if (it.audioS3Key) s3Keys.push(it.audioS3Key);
  });
  if (rawContent.speechBurst?.audioS3Key) {
    s3Keys.push(rawContent.speechBurst.audioS3Key);
  }

  const signedMap = s3Keys.length > 0 ? await getPresignedUrls(s3Keys) : {};

  const hydrated: SpriteExerciseContent = {
    visualMatch: {
      ...rawContent.visualMatch,
      cards: (rawContent.visualMatch?.cards || []).map((c) => ({
        ...c,
        imageUrl: c.imageUrl || (c.imageS3Key ? signedMap[c.imageS3Key] : null),
        audioUrl: c.audioUrl || (c.audioS3Key ? signedMap[c.audioS3Key] : null),
      })),
    },
    sentenceDash: {
      ...rawContent.sentenceDash,
      items: (rawContent.sentenceDash?.items || []).map((it) => ({
        ...it,
        audioUrl:
          it.audioUrl || (it.audioS3Key ? signedMap[it.audioS3Key] : null),
      })),
    },
    speechBurst: {
      ...rawContent.speechBurst,
      audioUrl:
        rawContent.speechBurst?.audioUrl ||
        (rawContent.speechBurst?.audioS3Key
          ? signedMap[rawContent.speechBurst.audioS3Key]
          : null),
    },
  };

  return {
    id: ex.id,
    title: ex.title,
    status: ex.status,
    currentMilestone,
    energyReward: ex.energyReward,
    rewardClaimed: ex.rewardClaimed,
    content: hydrated,
  };
}

/**
 * Completes the Sprite Exercise and awards +1 Sprite Energy Charge (idempotent)
 */
export async function completeSpriteExercise({
  userId,
  exerciseId,
}: {
  userId: string;
  exerciseId: string;
}): Promise<{ ok: boolean; newEnergy: number }> {
  const ex = await prisma.spriteExercise.findUnique({
    where: { id: exerciseId },
  });

  if (!ex || ex.userId !== userId) {
    return { ok: false, newEnergy: 0 };
  }

  if (ex.rewardClaimed) {
    const profile = await prisma.spriteProfile.findUnique({
      where: { userId },
      select: { energy: true },
    });
    return { ok: true, newEnergy: profile?.energy ?? 1 };
  }

  await prisma.spriteExercise.update({
    where: { id: exerciseId },
    data: {
      status: "COMPLETED",
      rewardClaimed: true,
      completedAt: new Date(),
    },
  });

  const energyRes = await awardSpriteEnergy(userId, ex.energyReward || 1);
  return { ok: true, newEnergy: energyRes.energy };
}