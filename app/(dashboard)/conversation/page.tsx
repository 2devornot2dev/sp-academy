// app/(dashboard)/conversation/page.tsx
import { getUserLanguage } from "@/app/actions/get-user-language";
import FreestyleWrapper from "@/components/freestyle/freestyle-wrapper";
import { requireUser } from "@/lib/auth-guard";
import { getUserEntitlements } from "@/lib/billing/entitlements";
import { prisma } from "@/lib/prisma";
import { getFreestyleRedisState, getStartOfToday } from "@/lib/upstash";

export const dynamic = "force-dynamic";

export default async function ConversationPage() {
  const user = await requireUser();
  const startOfToday = getStartOfToday();

  const [
    { lang },
    entitlements,
    redisState,
    todaySessions,
    totalReviewsCount,
  ] = await Promise.all([
    getUserLanguage(user.id),
    getUserEntitlements(user.id),
    getFreestyleRedisState(user.id),
    prisma.freestyleSession.findMany({
      where: {
        userId: user.id,
        status: { in: ["REVIEW_PENDING", "REVIEWED"] },
        createdAt: { gte: startOfToday },
        isFoundation: false,
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
        isFoundation: false,
      },
    }),
  ]);

  const defaultNative = lang?.nativeLanguage ?? "ENGLISH";
  const defaultTarget = lang?.targetLanguage ?? "fr-FR";

  const cooldownMs = entitlements.freestyleCooldownSeconds * 1000;

  let initialCooldown: {
    sessionId: string;
    remainingSeconds: number;
  } | null = null;

  if (cooldownMs > 0) {
    if (redisState.cooldownSessionId && redisState.cooldownSecondsLeft > 0) {
      initialCooldown = {
        sessionId: redisState.cooldownSessionId,
        remainingSeconds: redisState.cooldownSecondsLeft,
      };
    } else if (todaySessions[0]) {
      const latest = todaySessions[0];
      const endedMs = new Date(latest.updatedAt ?? latest.createdAt).getTime();
      const elapsedMs = Date.now() - endedMs;
      if (elapsedMs < cooldownMs) {
        initialCooldown = {
          sessionId: latest.id,
          remainingSeconds: Math.max(
            1,
            Math.ceil((cooldownMs - elapsedMs) / 1000),
          ),
        };
      }
    }
  }

  const dailySessionsUsed = todaySessions.length;

  return (
    <div className="flex h-full min-h-0 flex-1 w-full flex-col bg-slate-100">
      <FreestyleWrapper
        userId={user.id}
        userName={user.firstName}
        defaultNative={defaultNative}
        defaultTarget={defaultTarget}
        initialCooldown={initialCooldown}
        dailySessionsUsed={dailySessionsUsed}
        dailySessionsMax={entitlements.dailyFreestyleMax}
        cooldownSeconds={entitlements.freestyleCooldownSeconds}
        isTrial={entitlements.isTrial}
        reviewsCount={totalReviewsCount}
      />
    </div>
  );
}