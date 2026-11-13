// app/(dashboard)/conversation/page.tsx
import { getUserLanguage } from "@/app/actions/get-user-language";
import FreestyleWrapper from "@/components/freestyle/freestyle-wrapper";
import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { getFreestyleRedisState } from "@/lib/upstash";

export const dynamic = "force-dynamic";

const COOLDOWN_MS = 5 * 60 * 1000;

export default async function ConversationPage() {
  const user = await requireUser();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [{ lang }, redisState, recentSessions, totalReviewsCount] =
    await Promise.all([
      getUserLanguage(user.id),
      getFreestyleRedisState(user.id),
      prisma.freestyleSession.findMany({
        where: {
          userId: user.id,
          status: { in: ["REVIEW_PENDING", "REVIEWED"] },
          createdAt: { gte: twentyFourHoursAgo },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.freestyleSession.count({
        where: {
          userId: user.id,
          status: { in: ["REVIEW_PENDING", "REVIEWED"] },
        },
      }),
    ]);

  const defaultNative = lang?.nativeLanguage ?? "ENGLISH";
  const defaultTarget = lang?.targetLanguage ?? "fr-FR";

  let initialCooldown: {
    sessionId: string;
    remainingSeconds: number;
  } | null = null;

  if (redisState.cooldownSessionId && redisState.cooldownSecondsLeft > 0) {
    initialCooldown = {
      sessionId: redisState.cooldownSessionId,
      remainingSeconds: redisState.cooldownSecondsLeft,
    };
  } else if (recentSessions[0]) {
    const latest = recentSessions[0];
    const endedMs = new Date(latest.updatedAt ?? latest.createdAt).getTime();
    const elapsedMs = Date.now() - endedMs;
    if (elapsedMs < COOLDOWN_MS) {
      initialCooldown = {
        sessionId: latest.id,
        remainingSeconds: Math.max(
          1,
          Math.ceil((COOLDOWN_MS - elapsedMs) / 1000),
        ),
      };
    }
  }

  const dailySessionsUsed = Math.max(
    redisState.dailyUsed,
    recentSessions.length,
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-100">
      <FreestyleWrapper
        userId={user.id}
        userName={user.firstName}
        defaultNative={defaultNative}
        defaultTarget={defaultTarget}
        initialCooldown={initialCooldown}
        dailySessionsUsed={dailySessionsUsed}
        dailySessionsMax={redisState.dailyMax}
        reviewsCount={totalReviewsCount}
      />
    </div>
  );
}