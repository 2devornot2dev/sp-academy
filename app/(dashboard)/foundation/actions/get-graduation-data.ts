// app/(dashboard)/foundation/actions/get-graduation-data.ts
import { prisma } from "@/lib/prisma";
import { getUserEntitlements } from "@/lib/billing/entitlements";

export async function getGraduationData(graduationId: string, userId: string) {
  const graduation = await prisma.milestoneGraduation.findFirst({
    where: {
      id: graduationId,
      userId,
    },
    include: {
      course: {
        select: {
          id: true,
          targetLanguage: true,
          nativeLanguage: true,
          isHardMode: true,
        },
      },
    },
  });

  if (!graduation) return null;

  const [bossStage, entitlements] = await Promise.all([
    prisma.foundationBossStage.findUnique({
      where: {
        foundationCourseId_milestoneIndex: {
          foundationCourseId: graduation.foundationCourseId,
          milestoneIndex: graduation.milestoneIndex,
        },
      },
      select: {
        id: true,
        passed: true,
        score: true,
        scenarioData: true,
      },
    }),
    getUserEntitlements(userId),
  ]);

  // Mark viewed once READY
  if (graduation.status === "READY" && !graduation.viewedAt) {
    await prisma.milestoneGraduation
      .update({
        where: { id: graduation.id },
        data: { viewedAt: new Date() },
      })
      .catch(() => {});
  }

  return {
    graduation,
    bossStage,
    isTrial: entitlements.isTrial,
  };
}

export type GraduationPageData = NonNullable<
  Awaited<ReturnType<typeof getGraduationData>>
>;