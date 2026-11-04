import { prisma } from "@/lib/prisma";

export async function getBossData(bossId: string, userId: string) {
  return prisma.foundationBossStage.findFirst({
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
}

export type BossData = Awaited<ReturnType<typeof getBossData>>;