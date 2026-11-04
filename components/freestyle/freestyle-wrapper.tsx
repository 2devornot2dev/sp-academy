"use client";

import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";

import FreestyleSetup from "./freestyle-setup";
import FreestyleChat from "./freestyle-chat";
import { FreestyleReviewHub } from "./review/freestyle-review-hub";

export type FreestyleSessionConfig = {
  id: string;
  mode: string;
  topic?: string;
  nativeLanguage: string;
  targetLanguage: string;
  voiceGender: "male" | "female";
  aiAvatarUrl: string;
  level: "EASY" | "MEDIUM" | "FLUENT" | "ZERO";
};

export default function FreestyleWrapper({
  defaultNative,
  defaultTarget,
}: any) {
  const [activeSession, setActiveSession] =
    useState<FreestyleSessionConfig | null>(null);
  const [livekitData, setLivekitData] = useState<{
    token: string;
    wsUrl: string;
  } | null>(null);

  const [pendingReviewId, setPendingReviewId] = useState<string | null>(null);
  const [reviewSessionId, setReviewSessionId] = useState<string | null>(null);

  const handleReviewReady = useCallback((id: string) => {
    setPendingReviewId(null);
    setReviewSessionId(id);
  }, []);

  const handleReviewFailed = useCallback(() => {
    setPendingReviewId(null);
    setReviewSessionId(null);
  }, []);

  // useReviewPusher(pendingReviewId, handleReviewReady, handleReviewFailed);

  const handleStartSession = async (
    config: Omit<FreestyleSessionConfig, "id" | "aiAvatarUrl">
  ) => {
    const seed = config.voiceGender === "female" ? "Camille" : "Laurent";
    const aiAvatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

    // 1. Create DB Session & Mint LiveKit Token in parallel!
    const [createRes, tokenRes] = await Promise.all([
      fetch("/api/freestyle/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, aiAvatarUrl }),
      }),
      fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nativeLanguage: config.nativeLanguage,
          targetLanguage: config.targetLanguage,
          freestyleData: {
            topic: config.topic || "Daily Speaking Practice",
            persona: `${config.voiceGender === "female" ? "Female" : "Male"} conversational partner`,
            openingLine: "Talk freely about your day, travel, or anything on your mind.",
          },
        }),
      }),
    ]);

    const sessionData = await createRes.json();
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
      ...config,
      aiAvatarUrl,
    });
  };

  const handleEndSession = () => {
    const endedSessionId = activeSession?.id || null;
    setActiveSession(null);
    setLivekitData(null);

    if (endedSessionId) {
      setPendingReviewId(endedSessionId);
    }
  };

  const handleReviewComplete = () => {
    setReviewSessionId(null);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-1 flex-col bg-slate-100/80">
      <AnimatePresence mode="wait">
        {/* 1. SETUP SCREEN — Full width so Header & 7xl Grid work properly */}
        {!activeSession && !pendingReviewId && !reviewSessionId && (
          <motion.div
            key="setup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="min-h-screen w-full"
          >
            <FreestyleSetup
              onStart={handleStartSession}
              defaultNative={defaultNative}
              defaultTarget={defaultTarget}
            />
          </motion.div>
        )}

        {/* 2. LIVEKIT CHAT SCREEN */}
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

        {/* 3. ANALYZING / WAITING SCREEN */}
        {pendingReviewId && (
          <motion.div
            key="pending"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4 }}
            className="flex min-h-screen w-full flex-col items-center justify-center p-6 text-center"
          >
            <div className="w-full max-w-sm space-y-6 rounded-3xl border border-gray-100 bg-white p-10 shadow-xl">
              <div className="relative mx-auto h-20 w-20">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
                <div className="absolute inset-0 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl">🧠</span>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Analyzing Session
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  Your AI tutor is reviewing your grammar, vocabulary, and
                  pronunciation. Give us just a moment...
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* 4. REVIEW SCREEN */}
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