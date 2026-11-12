// app/(dashboard)/conversation/page.tsx
import { getUserLanguage } from "@/app/actions/get-user-language";
import FreestyleWrapper from "@/components/freestyle/freestyle-wrapper";
import { requireUser } from "@/lib/auth-guard";
import { getFreestyleRedisState } from "@/lib/upstash";

export default async function ConversationPage() {
  const user = await requireUser();
  const [{ lang }, redisState] = await Promise.all([
    getUserLanguage(user.id),
    getFreestyleRedisState(user.id),
  ]);

  const defaultNative = lang?.nativeLanguage ?? "ENGLISH";
  const defaultTarget = lang?.targetLanguage ?? "fr-FR";

  return (
    <div className="flex min-h-screen w-full flex-col animate-bg">
      <FreestyleWrapper
        userId={user.id}
        userName={user.firstName}
        defaultNative={defaultNative}
        defaultTarget={defaultTarget}
        initialCooldown={
          redisState.cooldownSessionId
            ? {
                sessionId: redisState.cooldownSessionId,
                remainingSeconds: redisState.cooldownSecondsLeft,
              }
            : null
        }
        dailySessionsUsed={redisState.dailyUsed}
        dailySessionsMax={redisState.dailyMax}
      />
    </div>
  );
}