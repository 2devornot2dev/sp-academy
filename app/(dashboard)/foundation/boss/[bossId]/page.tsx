// app/(dashboard)/foundation/boss/[bossId]/page.tsx
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { getFreestyleRedisState } from "@/lib/upstash";
import { getBossData } from "../../actions/get-boss-data";
import BossFoundationClient from "@/components/foundation/boss/boss-foundation-client";
import { startNextMilestoneDaisyChain } from "@/lib/foundation/advance-build-chain";

interface Params {
  params: Promise<{ bossId: string }>;
}

export default async function BossIdPage({ params }: Params) {
  const { bossId } = await params;
  const user = await requireUser();

  const bossData = await getBossData(bossId, user.id);
  if (!bossData) notFound();

  const courseId =
    (bossData as any).foundationCourseId || (bossData as any).course?.id;
  const milestoneIndex = (bossData as any).milestoneIndex ?? 1;

  // Server-side guard: Ensure Boss is unlocked via 3-min AI Conversation (or already passed / hit 5/day cap)
  if (!bossData.passed) {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [milestoneSession, recentCount, redisState] = await Promise.all([
      prisma.freestyleSession.findFirst({
        where: {
          userId: user.id,
          milestoneIndex,
          status: { in: ["REVIEW_PENDING", "REVIEWED"] },
        },
        select: { id: true },
      }),
      prisma.freestyleSession.count({
        where: {
          userId: user.id,
          status: { in: ["REVIEW_PENDING", "REVIEWED"] },
          createdAt: { gte: twentyFourHoursAgo },
        },
      }),
      getFreestyleRedisState(user.id),
    ]);

    const hitDailyCap = Math.max(redisState.dailyUsed, recentCount) >= 5;

    if (!milestoneSession && !hitDailyCap) {
      redirect("/conversation");
    }
  }

  // Fire-and-forget: As soon as the user enters Boss M, start the next milestone's daisy-chain
  // (Spoon 3M+1 -> Spoon 3M+2 -> Spoon 3M+3 -> Boss M+1) in the background!
  if (courseId) {
    void startNextMilestoneDaisyChain({
      courseId,
      currentMilestoneIndex: milestoneIndex,
    });
  }

  return <BossFoundationClient session={bossData} />;
}