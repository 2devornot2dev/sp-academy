// components/freestyle/freestyle-wrapper.tsx
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

// Built-in level-calibrated starter chunks & mission hints per language & level
function buildCalibratedMission(
  targetLang: string,
  level: "ZERO" | "EASY" | "MEDIUM" | "FLUENT",
  topic?: string,
  mode?: string,
) {
  const isEs = targetLang.toLowerCase().startsWith("es");
  const cleanTopic = topic?.trim() || "Everyday Conversation";

  if (isEs) {
    const byLevel = {
      ZERO: {
        chunks: ["Hola", "Me llamo", "Por favor"],
        hintTarget: "¡Hola! Me llamo Paul, ¿cómo estás?",
        hintNative: "Hi! My name is Paul, how are you?",
      },
      EASY: {
        chunks: ["Me gustaría", "Por favor", "¿Cuánto cuesta?"],
        hintTarget: "Hola, me gustaría pedir un café, por favor.",
        hintNative: "Hello, I would like to order a coffee, please.",
      },
      MEDIUM: {
        chunks: ["En mi opinión", "Normalmente", "Me encanta"],
        hintTarget: "Normalmente me encanta viajar y conocer lugares nuevos.",
        hintNative: "Usually I love traveling and discovering new places.",
      },
      FLUENT: {
        chunks: ["Sin embargo", "Hoy en día", "Me parece que"],
        hintTarget: "Me parece que hoy en día es fundamental practicar a diario.",
        hintNative: "It seems to me that nowadays it's essential to practice daily.",
      },
    };
    return byLevel[level] || byLevel.EASY;
  }

  // Default: French (fr-FR)
  const frByLevel = {
    ZERO: {
      chunks: ["Bonjour", "Je m'appelle", "S'il vous plaît"],
      hintTarget: "Bonjour ! Je m'appelle Paul, comment ça va ?",
      hintNative: "Hello! My name is Paul, how is it going?",
    },
    EASY: {
      chunks: ["Je voudrais", "S'il vous plaît", "C'est super"],
      hintTarget: "Bonjour ! Je voudrais pratiquer mon français, s'il vous plaît.",
      hintNative: `Hello! I'd like to practice my French (${cleanTopic}), please.`,
    },
    MEDIUM: {
      chunks: ["D'habitude", "J'aime beaucoup", "À mon avis"],
      hintTarget: "D'habitude, j'aime beaucoup discuter de ce sujet.",
      hintNative: "Usually, I really enjoy talking about this topic.",
    },
    FLUENT: {
      chunks: ["Cependant", "En fait", "Il me semble que"],
      hintTarget: "En fait, il me semble que c'est un sujet très intéressant.",
      hintNative: "Actually, it seems to me that this is a very interesting topic.",
    },
  };

  return frByLevel[level] || frByLevel.EASY;
}

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

  const handleStartSession = async (
    config: Omit<FreestyleSessionConfig, "id" | "aiAvatarUrl">
  ) => {
    const isFemale = config.voiceGender === "female";
    const tutorName = config.tutorName || (isFemale ? "Sophie" : "Laurent");
    const aiAvatarUrl = isFemale ? "/sprite-f.png" : "/sprite-m.png";
    const level = config.level || "EASY";

    const mission = buildCalibratedMission(
      config.targetLanguage,
      level,
      config.topic,
      config.mode,
    );

    const requiredChunks =
      config.requiredChunks && config.requiredChunks.length > 0
        ? config.requiredChunks
        : mission.chunks;

    const topicLabel =
      config.topic ||
      (config.mode === "SURPRISE"
        ? "Spontaneous Real-World Roleplay"
        : "Live Conversation Practice");

    const personaPrompt = `${tutorName}, a ${
      config.persona || "warm, patient, and encouraging"
    } ${isFemale ? "female" : "male"} native conversation partner. LEVEL CALIBRATION: ${
      LEVEL_INSTRUCTIONS[level]
    }`;

    const openingLine =
      config.openingLine ||
      `Try using your target phrases (${requiredChunks.join(
        ", "
      )}) naturally in conversation with ${tutorName}!`;

    // 1. Create DB Session & Mint LiveKit Token with FULL level, persona, and requiredChunks!
    const [createRes, tokenRes] = await Promise.all([
      fetch("/api/freestyle/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          level,
          topic: topicLabel,
          aiAvatarUrl,
          requiredChunks,
        }),
      }),
      fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nativeLanguage: config.nativeLanguage,
          targetLanguage: config.targetLanguage,
          voiceGender: config.voiceGender,
          level,
          freestyleData: {
            mode: config.mode || "SPECIFIC",
            level,
            topic: topicLabel,
            persona: personaPrompt,
            requiredChunks,
            openingLine,
            starterHintTarget: mission.hintTarget,
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
      level,
      tutorName,
      topic: topicLabel,
      aiAvatarUrl,
      requiredChunks,
      openingLine,
      starterHintTarget: mission.hintTarget,
      starterHintNative: mission.hintNative,
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
        {/* 1. SETUP SCREEN */}
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