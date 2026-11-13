// components/freestyle/freestyle-wrapper.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

import FreestyleSetup from "./freestyle-setup";
import FreestyleChat from "./freestyle-chat";
import { FreestyleReviewHub } from "./review/freestyle-review-hub";
import { FreestyleCooldownHub } from "./review/freestyle-cooldown-hub";
import { getTutorAvatarByMood } from "@/lib/freestyle/tutors";

export type FreestyleSessionConfig = {
  id: string;
  userId?: string;
  mode: string;
  topic?: string;
  persona?: string;
  tutorName?: string;
  nativeLanguage: string;
  targetLanguage: string;
  voiceGender: "male" | "female";
  aiAvatarUrl: string;
  level: "EASY" | "MEDIUM" | "FLUENT" | "ZERO";
  requiredChunks?: string[];
  openingLine?: string;
  starterHintTarget?: string;
  starterHintNative?: string;
};

const LEVEL_INSTRUCTIONS: Record<
  "ZERO" | "EASY" | "MEDIUM" | "FLUENT",
  string
> = {
  ZERO: "ABSOLUTE ZERO BEGINNER (A0): Speak ONLY in ultra-short simple phrases. Speak slowly, use basic cognates, and gently prompt the user to say one simple phrase at a time.",
  EASY: "BEGINNER (A1-A2): Keep sentences short (5 to 8 everyday words), clear, and encouraging. Avoid complex tenses or slang.",
  MEDIUM:
    "INTERMEDIATE (B1-B2): Speak at a natural conversational pace using everyday idioms, past/future tenses, and follow-up questions.",
  FLUENT:
    "ADVANCED / FLUENT (C1+): Speak at full native speed with rich vocabulary, nuanced expressions, and engaging debate.",
};

interface FreestyleWrapperProps {
  userId: string;
  userName?: string | null;
  defaultNative: string;
  defaultTarget: string;
  initialCooldown?: {
    sessionId: string;
    remainingSeconds: number;
  } | null;
  dailySessionsUsed?: number;
  dailySessionsMax?: number;
}

export default function FreestyleWrapper({
  userId,
  defaultNative,
  defaultTarget,
  initialCooldown = null,
  dailySessionsUsed = 0,
  dailySessionsMax = 5,
}: FreestyleWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeSession, setActiveSession] =
    useState<FreestyleSessionConfig | null>(null);
  const [livekitData, setLivekitData] = useState<{
    token: string;
    wsUrl: string;
  } | null>(null);

  // Server-backed Redis cooldown takes priority over URL params so clicking around never loses state!
  const [cooldownSessionId, setCooldownSessionId] = useState<string | null>(
    () => initialCooldown?.sessionId ?? searchParams.get("sessionId"),
  );
  const [cooldownSecondsLeft, setCooldownSecondsLeft] = useState<number>(
    () => initialCooldown?.remainingSeconds ?? 300,
  );
  const [dailyUsed, setDailyUsed] = useState<number>(dailySessionsUsed);
  const [isReviewReady, setIsReviewReady] = useState(false);
  const [reviewSessionId, setReviewSessionId] = useState<string | null>(null);
  const [incompleteReason, setIncompleteReason] = useState<string | null>(null);

  // 1. Cooldown Countdown Timer
  useEffect(() => {
    if (!cooldownSessionId || cooldownSecondsLeft <= 0) return;
    const timer = setInterval(() => {
      setCooldownSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSessionId, cooldownSecondsLeft]);

  // 2. Background Poll to detect when `spoon-freestyle-review` finishes
  useEffect(() => {
    if (!cooldownSessionId || isReviewReady) return;

    let cancelled = false;
    const checkReviewStatus = async () => {
      try {
        const res = await fetch(`/api/freestyle/review/${cooldownSessionId}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.review && !cancelled) {
            setIsReviewReady(true);
          }
        }
      } catch {
        // Still baking
      }
    };

    checkReviewStatus();
    const interval = setInterval(checkReviewStatus, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [cooldownSessionId, isReviewReady]);

  const handleStartSession = async (
    config: Omit<FreestyleSessionConfig, "id" | "aiAvatarUrl">,
  ) => {
    if (dailyUsed >= dailySessionsMax) {
      setIncompleteReason(
        `You've reached today's limit of ${dailySessionsMax} AI conversations. Come back tomorrow!`,
      );
      return;
    }

    setIncompleteReason(null);
    const isFemale = config.voiceGender === "female";
    const tutorName = config.tutorName || (isFemale ? "Sophie" : "Antoine");
    const aiAvatarUrl = getTutorAvatarByMood(config.voiceGender, "default");
    const level = config.level || "EASY";

    const createRes = await fetch(`/api/users/${userId}/freestyle/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...config,
        level,
        aiAvatarUrl,
      }),
    });

    const sessionData = await createRes.json();
    if (!createRes.ok || !sessionData.sessionId) {
      throw new Error(
        sessionData.error || "Failed to create freestyle session",
      );
    }

    const fd = sessionData.freestyleData || {};
    const requiredChunks = fd.requiredChunks || [];
    const topicLabel = fd.topic || config.topic || "Live Conversation Practice";
    const personaPrompt = `${fd.persona || tutorName}. LEVEL CALIBRATION: ${
      LEVEL_INSTRUCTIONS[level]
    }`;

    const tokenRes = await fetch("/api/livekit/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nativeLanguage: config.nativeLanguage,
        targetLanguage: config.targetLanguage,
        voiceGender: config.voiceGender,
        level,
        freestyleData: {
          mode: config.mode || "FOCUSED",
          level,
          topic: topicLabel,
          persona: personaPrompt,
          requiredChunks,
          openingLine: fd.openingLine,
          aiOpeningTarget: fd.aiOpeningTarget,
          starterHintTarget: fd.starterHintTarget,
        },
      }),
    });

    const lkData = await tokenRes.json();
    if (!tokenRes.ok || !lkData.token) {
      throw new Error(lkData.error || "Failed to initialize LiveKit room");
    }

    setLivekitData({
      token: lkData.token,
      wsUrl: lkData.wsUrl,
    });

    setActiveSession({
      id: sessionData.sessionId,
      userId,
      userAvatarUrl: sessionData.userAvatarUrl,
      ...config,
      level,
      tutorName,
      topic: topicLabel,
      aiAvatarUrl,
      requiredChunks,
      chunkTranslations: fd.chunkTranslations || [],
      openingLine: fd.openingLine,
      starterHintTarget: fd.starterHintTarget,
      starterHintNative: fd.starterHintNative,
    } as any);
  };

  const handleEndSession = (result?: {
    valid: boolean;
    sessionId?: string;
    reason?: string;
    cooldownUntil?: number;
  }) => {
    const fallbackId = activeSession?.id;
    setActiveSession(null);
    setLivekitData(null);

    if (result && result.valid === false) {
      setIncompleteReason(
        result.reason ||
          "You need at least 3–4 spoken replies in your target language for a session to count!",
      );
      router.replace("/conversation?status=incomplete", { scroll: false });
      return;
    }

    const finalSessionId = result?.sessionId || fallbackId || null;
    if (finalSessionId) {
      setCooldownSessionId(finalSessionId);
      setCooldownSecondsLeft(300);
      setDailyUsed((prev) => Math.min(dailySessionsMax, prev + 1));
      setIsReviewReady(false);
      router.replace(
        `/conversation?status=cooldown&sessionId=${finalSessionId}`,
        { scroll: false },
      );
    }
  };

  const handleReviewComplete = () => {
    setReviewSessionId(null);
    if (cooldownSecondsLeft <= 0) {
      setCooldownSessionId(null);
      router.replace("/conversation", { scroll: false });
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-1 flex-col bg-slate-100">
      <AnimatePresence mode="wait">
        {/* 1. COOLDOWN & REVIEW HUB */}
        {!activeSession && cooldownSessionId && !reviewSessionId && (
          <motion.div
            key="cooldown-hub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="min-h-screen w-full"
          >
            <FreestyleCooldownHub
              cooldownSecondsLeft={cooldownSecondsLeft}
              isReviewReady={isReviewReady}
              dailyUsed={dailyUsed}
              dailyMax={dailySessionsMax}
              onOpenReview={() => setReviewSessionId(cooldownSessionId)}
              onStartAnother={() => {
                setCooldownSessionId(null);
                router.replace("/conversation", { scroll: false });
              }}
            />
          </motion.div>
        )}

        {/* 2. SETUP SCREEN */}
        {!activeSession && !cooldownSessionId && !reviewSessionId && (
          <motion.div
            key="setup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="min-h-screen w-full"
          >
            {incompleteReason && (
              <div className="mx-auto max-w-7xl px-6 pt-4 lg:px-8">
                <div className="flex items-center justify-between gap-4 rounded-2xl border-2 border-rose-300 bg-rose-50 px-5 py-3.5 text-rose-950 shadow-sm">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
                    <p className="text-xs sm:text-sm font-bold">
                      <strong className="font-black uppercase">
                        Session Not Counted:{" "}
                      </strong>
                      {incompleteReason}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIncompleteReason(null)}
                    className="shrink-0 rounded-xl bg-rose-200/70 px-3 py-1 text-xs font-black text-rose-900 hover:bg-rose-200"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <FreestyleSetup
              onStart={handleStartSession}
              defaultNative={defaultNative}
              defaultTarget={defaultTarget}
            />
          </motion.div>
        )}

        {/* 3. LIVEKIT CHAT SCREEN */}
        {activeSession && livekitData && (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex h-screen w-full flex-col"
          >
            <FreestyleChat
              session={activeSession}
              livekitToken={livekitData.token}
              livekitUrl={livekitData.wsUrl}
              onEnd={handleEndSession}
            />
          </motion.div>
        )}

        {/* 4. FULL REVIEW SCREEN */}
        {reviewSessionId && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex min-h-screen w-full flex-col overflow-y-auto"
          >
            <FreestyleReviewHub
              sessionId={reviewSessionId}
              onComplete={handleReviewComplete}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}