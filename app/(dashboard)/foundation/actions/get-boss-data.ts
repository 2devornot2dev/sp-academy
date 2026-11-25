import { prisma } from "@/lib/prisma";

export async function getBossData(bossId: string, userId: string) {
  const boss = await prisma.foundationBossStage.findFirst({
    where: {
      id: bossId,
      userId,
      status: { in: ["READY", "COMPLETED"] },
    },
    include: {
      course: {
        select: {
          targetLanguage: true,
          nativeLanguage: true,
        },
      },
    },
  });

  if (!boss) return null;

  const graduation = await prisma.milestoneGraduation.findUnique({
    where: {
      foundationCourseId_milestoneIndex: {
        foundationCourseId: boss.foundationCourseId,
        milestoneIndex: boss.milestoneIndex,
      },
    },
    select: { id: true, status: true },
  });

  return {
    ...boss,
    graduationId: graduation?.id ?? null,
  };
}

export type BossData = Awaited<ReturnType<typeof getBossData>>;