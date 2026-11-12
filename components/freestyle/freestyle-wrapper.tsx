// components/freestyle/freestyle-wrapper.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sparkles,
  BookOpen,
  Gamepad2,
  Compass,
  Timer,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Swords,
  RotateCcw,
} from "lucide-react";

import FreestyleSetup from "./freestyle-setup";
import FreestyleChat from "./freestyle-chat";
import { FreestyleReviewHub } from "./review/freestyle-review-hub";

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
  ZERO: "ABSOLUTE ZERO BEGINNER (A0): Speak ONLY in ultra-short 3 to 5 word phrases. Speak slowly, use basic cognates, and gently prompt the user to say one simple phrase at a time.",
  EASY: "BEGINNER (A1-A2): Keep sentences short (5 to 8 everyday words), clear, and encouraging. Avoid complex tenses or slang.",
  MEDIUM:
    "INTERMEDIATE (B1-B2): Speak at a natural conversational pace using everyday idioms, past/future tenses, and follow-up questions.",
  FLUENT:
    "ADVANCED / FLUENT (C1+): Speak at full native speed with rich vocabulary, nuanced expressions, and engaging debate.",
};

function formatCooldown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export default function FreestyleWrapper({
  userId,
  defaultNative,
  defaultTarget,
}: any) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeSession, setActiveSession] =
    useState<FreestyleSessionConfig | null>(null);
  const [livekitData, setLivekitData] = useState<{
    token: string;
    wsUrl: string;
  } | null>(null);

  // Post-convo states on /conversation
  const [cooldownSessionId, setCooldownSessionId] = useState<string | null>(
    () => searchParams.get("sessionId"),
  );
  const [cooldownSecondsLeft, setCooldownSecondsLeft] = useState<number>(300);
  const [isReviewReady, setIsReviewReady] = useState(false);
  const [reviewSessionId, setReviewSessionId] = useState<string | null>(null);
  const [incompleteReason, setIncompleteReason] = useState<string | null>(null);

  // 1. 5-Minute Cooldown Countdown Timer
  useEffect(() => {
    if (!cooldownSessionId || cooldownSecondsLeft <= 0) return;
    const timer = setInterval(() => {
      setCooldownSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSessionId, cooldownSecondsLeft]);

  // 2. Background Poll to see when `spoon-freestyle-review` Lambda finishes baking
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
    setIncompleteReason(null);
    const isFemale = config.voiceGender === "female";
    const tutorName = config.tutorName || (isFemale ? "Sophie" : "Antoine");
    const aiAvatarUrl = isFemale ? "/sprite-f.png" : "/sprite-m.png";
    const level = config.level || "EASY";

    // 1. Create DB Session via /api/users/[userId]/freestyle/create
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

    // 2. Mint LiveKit Token
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

    // If Groq/deterministic check rejected the conversation (e.g. 3 mins of silence)
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
      setIsReviewReady(false);
      router.replace(
        `/conversation?status=cooldown&sessionId=${finalSessionId}`,
        { scroll: false },
      );
    }
  };

  const handleReviewComplete = () => {
    setReviewSessionId(null);
    setCooldownSessionId(null);
    router.replace("/conversation", { scroll: false });
  };

  return (
    <div className="relative flex min-h-screen w-full flex-1 flex-col bg-slate-100/80">
      <AnimatePresence mode="wait">
        {/* =================================================================
            1. POST-CONVO COOLDOWN & REVIEW BAKING HUB ON /conversation
            ================================================================= */}
        {!activeSession && cooldownSessionId && !reviewSessionId && (
          <motion.div
            key="cooldown-hub"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-12"
          >
            {/* Main 3D Baking & Cooldown Hero Card */}
            <div className="relative overflow-hidden rounded-3xl border-2 border-b-[6px] border-indigo-950/90 bg-slate-950 p-7 text-white shadow-2xl sm:p-10">
              <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-indigo-500/25 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" />

              <div className="relative z-10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-4 py-1 text-xs font-black tracking-wider text-emerald-300 uppercase">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Official Conversation Verified • Boss Stage Unlocked!
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/35 bg-amber-500/20 px-4 py-1 text-xs font-black text-amber-300">
                    <Timer className="h-4 w-4 text-amber-400" />
                    Arena Cooldown: {formatCooldown(cooldownSecondsLeft)}
                  </span>
                </div>

                <h1 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-4xl">
                  {isReviewReady
                    ? "Your Deep AI Speech Report is Ready! 🎉"
                    : "Crafting Your Deep AI Speech & Grammar Report..."}
                </h1>

                <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-300 sm:text-base">
                  {isReviewReady
                    ? "Your grammar breakdown, vocabulary upgrades, and pronunciation drills have finished generating. Jump into your interactive review below or head straight to your unlocked Boss Stage!"
                    : "Our language engine is analyzing your grammar, vocabulary upgrades, and synthesizing custom audio coaching. While your 5-minute arena cooldown runs, explore any of the hubs below!"}
                </p>

                {/* Status / Action Bar */}
                <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
                  {isReviewReady ? (
                    <button
                      type="button"
                      onClick={() => setReviewSessionId(cooldownSessionId)}
                      className="inline-flex items-center gap-2.5 rounded-2xl border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 px-8 py-4 text-sm font-black text-white shadow-xl shadow-emerald-500/30 transition-all hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:border-b-0"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Open Interactive AI Review</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                      <div>
                        <span className="block text-xs font-black tracking-wider text-indigo-300 uppercase">
                          AI Review Lambda Running in Background
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          Button will unlock automatically as soon as your
                          report is ready
                        </span>
                      </div>
                    </div>
                  )}

                  {cooldownSecondsLeft === 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setCooldownSessionId(null);
                        router.replace("/conversation", { scroll: false });
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-xs font-black text-white transition hover:bg-white/20"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Start Another Conversation</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 3 Tactile Navigation Cards While Waiting / Cooldown */}
            <div className="mt-6">
              <h3 className="mb-3 text-xs font-black tracking-widest text-slate-400 uppercase">
                Where would you like to go next?
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* 1. Learning Hub / Boss Stage */}
                <Link
                  href="/learning-hub"
                  className="group flex flex-col justify-between rounded-3xl border-2 border-b-[6px] border-purple-900 bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 p-6 text-white shadow-lg transition-all hover:-translate-y-1"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl border-b-2 border-purple-700 bg-purple-500/30 text-amber-300">
                        <Swords className="h-5 w-5" />
                      </span>
                      <span className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-[10px] font-black text-emerald-300 uppercase">
                        Boss Unlocked
                      </span>
                    </div>
                    <h4 className="mt-4 text-lg font-black text-white">
                      Learning Hub
                    </h4>
                    <p className="mt-1 text-xs font-medium leading-relaxed text-slate-300">
                      Your 3-minute conversation unlocked your Milestone Boss
                      Stage! Go challenge the Boss now.
                    </p>
                  </div>
                  <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-black text-amber-300 group-hover:translate-x-1 transition-transform">
                    <span>Go to Learning Hub</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </Link>

                {/* 2. Books */}
                <Link
                  href="/books"
                  className="group flex flex-col justify-between rounded-3xl border-2 border-b-[6px] border-slate-200 border-b-slate-300 bg-white p-6 text-slate-900 shadow-sm transition-all hover:-translate-y-1 hover:border-sky-300"
                >
                  <div>
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border-b-2 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white">
                      <BookOpen className="h-5 w-5" />
                    </span>
                    <h4 className="mt-4 text-lg font-black text-slate-900">
                      Storybooks
                    </h4>
                    <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                      Immerse yourself in illustrated bilingual stories while
                      your AI report bakes.
                    </p>
                  </div>
                  <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-black text-blue-600 group-hover:translate-x-1 transition-transform">
                    <span>Explore Books</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </Link>

                {/* 3. Games */}
                <Link
                  href="/games"
                  className="group flex flex-col justify-between rounded-3xl border-2 border-b-[6px] border-slate-200 border-b-slate-300 bg-white p-6 text-slate-900 shadow-sm transition-all hover:-translate-y-1 hover:border-amber-300"
                >
                  <div>
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border-b-2 border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950">
                      <Gamepad2 className="h-5 w-5" />
                    </span>
                    <h4 className="mt-4 text-lg font-black text-slate-900">
                      Language Arcade
                    </h4>
                    <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                      Sharpen your reflexes with fast-paced vocabulary and speed
                      mini-games.
                    </p>
                  </div>
                  <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-black text-orange-600 group-hover:translate-x-1 transition-transform">
                    <span>Play Games</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* =================================================================
            2. SETUP SCREEN (With Incomplete Warning Banner if Rejected)
            ================================================================= */}
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

        {/* =================================================================
            3. LIVEKIT CHAT SCREEN
            ================================================================= */}
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

        {/* =================================================================
            4. FULL REVIEW SCREEN (Opened when Lambda finishes)
            ================================================================= */}
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
