// components/freestyle/freestyle-wrapper.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Lock, Sparkles, ArrowRight, Bot } from "lucide-react";

import FreestyleSetup from "./freestyle-setup";
import FreestyleChat from "./freestyle-chat";
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
  cooldownSeconds?: number;
  isTrial?: boolean;
  reviewsCount?: number;
}

export default function FreestyleWrapper({
  userId,
  defaultNative,
  defaultTarget,
  initialCooldown = null,
  dailySessionsUsed = 0,
  dailySessionsMax = 5,
  cooldownSeconds = 300,
  isTrial = false,
  reviewsCount = 0,
}: FreestyleWrapperProps) {
  const router = useRouter();

  const [activeSession, setActiveSession] =
    useState<FreestyleSessionConfig | null>(null);
  const [livekitData, setLivekitData] = useState<{
    token: string;
    wsUrl: string;
  } | null>(null);

  const [cooldownSessionId, setCooldownSessionId] = useState<string | null>(
    () => initialCooldown?.sessionId ?? null,
  );
  const [cooldownSecondsLeft, setCooldownSecondsLeft] = useState<number>(
    () => initialCooldown?.remainingSeconds ?? 0,
  );

  const [dailyUsed, setDailyUsed] = useState<number>(dailySessionsUsed);
  const [isReviewReady, setIsReviewReady] = useState(false);
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

  const trialCapReached = isTrial && reviewsCount >= 1;
  if (trialCapReached || dailySessionsMax <= 0) {
    return (
      <div className="flex min-h-full w-full flex-1 items-center justify-center bg-slate-50 p-4 sm:p-8">
        <div className="w-full max-w-xl rounded-[2rem] border-2 border-b-[6px] border-slate-200 border-b-slate-300 bg-white p-6 text-center shadow-xl sm:p-10">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border-b-4 border-amber-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950 shadow-md">
            <Bot className="h-8 w-8" />
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-black tracking-wider text-amber-800 uppercase">
            <Lock className="h-3 w-3" />
            Beta Founder Feature
          </span>

          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Unlock Daily AI Conversations
          </h2>

          <p className="mx-auto mt-2.5 max-w-md text-sm font-semibold leading-relaxed text-slate-500">
            Your Free Trial includes Milestone 1 (Spoons 1–3, Vocab Bridges, and
            Boss Stage 1). Upgrade to Beta Founder ($35/mo) for 5 daily 3-min
            live AI voice sprints, full reviews, and Repair Arcades.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-8 py-4 text-sm font-black text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0 sm:text-base"
            >
              <Sparkles className="h-4 w-4" />
              <span>Unlock Beta Founder</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/learning-hub"
              className="inline-flex items-center justify-center rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-white px-6 py-3.5 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              Back to Learning Hub
            </Link>
          </div>
        </div>
      </div>
    );
  }

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

    try {
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
      const topicLabel =
        fd.topic || config.topic || "Live Conversation Practice";
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
          tutorName,
          targetVoiceId: `${config.targetLanguage}-${isFemale ? "woman-01" : "man-01"}`,
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
    } catch (err: any) {
      setIncompleteReason(
        err?.message || "Something went wrong while preparing the arena.",
      );
    }
  };

  const handleEndSession = (result?: {
    valid: boolean;
    sessionId?: string;
    reason?: string;
    cooldownUntil?: number | null;
  }) => {
    const fallbackId = activeSession?.id;
    setActiveSession(null);
    setLivekitData(null);

    if (result && result.valid === false) {
      setIncompleteReason(
        result.reason ||
          "You need at least 3–4 spoken replies in your target language for a session to count!",
      );
      return;
    }

    const finalSessionId = result?.sessionId || fallbackId || null;
    if (finalSessionId) {
      setCooldownSessionId(finalSessionId);
      const nextSecs =
        cooldownSeconds <= 0
          ? 0
          : result?.cooldownUntil
            ? Math.max(0, Math.round((result.cooldownUntil - Date.now()) / 1000))
            : cooldownSeconds;
      setCooldownSecondsLeft(nextSecs);
      setDailyUsed((prev) => Math.min(dailySessionsMax, prev + 1));
      setIsReviewReady(false);
    }
  };

  return (
    <div className="relative flex min-h-full w-full flex-1 flex-col bg-slate-100">
      <AnimatePresence mode="wait">
        {/* 1. COOLDOWN HUB */}
        {!activeSession && cooldownSessionId && (
          <motion.div
            key="cooldown-hub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="min-h-full w-full"
          >
            <FreestyleCooldownHub
              cooldownSecondsLeft={cooldownSecondsLeft}
              isReviewReady={isReviewReady}
              dailyUsed={dailyUsed}
              dailyMax={dailySessionsMax}
              onOpenReview={() =>
                router.push(`/conversation/${cooldownSessionId}`)
              }
              onStartAnother={() => setCooldownSessionId(null)}
            />
          </motion.div>
        )}

        {/* 2. SETUP SCREEN */}
        {!activeSession && !cooldownSessionId && (
          <motion.div
            key="setup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="min-h-full w-full"
          >
            {incompleteReason && (
              <div className="mx-auto max-w-7xl px-6 pt-4 lg:px-8">
                <div className="flex items-center justify-between gap-4 rounded-2xl border-2 border-rose-300 bg-rose-50 px-5 py-3.5 text-rose-950 shadow-sm">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
                    <p className="text-xs font-bold sm:text-sm">
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
              reviewsCount={reviewsCount}
              dailyUsed={dailyUsed}
              dailyMax={dailySessionsMax}
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
            className="w-full"
          >
            <FreestyleChat
              session={activeSession}
              livekitToken={livekitData.token}
              livekitUrl={livekitData.wsUrl}
              onEnd={handleEndSession}
            />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}