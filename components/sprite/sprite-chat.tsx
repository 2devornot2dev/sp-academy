// components/sprite/sprite-chat.tsx
"use client";
import { useRouter } from "next/navigation";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { motion, AnimatePresence } from "framer-motion";
import { useSprite } from "@/context/sprite-context";
import { SpriteChatHeader } from "./sprite-chat-header";
import { SpriteChatMessages } from "./sprite-chat-messages";
import { SpriteChatControls } from "./sprite-chat-controls";
import {
  cleanDisplayString,
  parseMessagePayload,
  turnsToUIMessages,
  groupUIMessagesIntoTurns,
  type ChatContextData,
} from "./sprite-chat-utils";
import type { SpriteSessionData } from "@/lib/schema/sprite-schema";

export type { ChatContextData } from "./sprite-chat-utils";

interface SpriteChatProps {
  userId: string;
  initialContext?: ChatContextData;
}

export function SpriteChat({ userId, initialContext }: SpriteChatProps) {
  const {
    profile,
    spriteName,
    avatarSrc,
    isChatOpen,
    openChat,
    closeChat,
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    pendingPrompt,
    clearPendingPrompt,
    deleteSession,
    isShowing,
    playAudioUrl,
    stopAudio,
  } = useSprite();
  const router = useRouter();

  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());
  const [sessionsList, setSessionsList] = useState<SpriteSessionData[]>([]);
  const [selectedTurnIndex, setSelectedTurnIndex] = useState<number | null>(
    null,
  );
  const [input, setInput] = useState("");

  // Auto-shrink the floating launcher label after 6 seconds
  const [isLabelExpanded, setIsLabelExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const lastUserPromptRef = useRef<string>("");
  const ttsAbortRef = useRef<AbortController | null>(null);

  const aiBrain: ChatContextData = initialContext || {
    userName: "Student",
    nativeLang: "English",
    targetLang: profile?.targetLanguage || "French",
    currentLessonTitle: "Active Lesson",
    avgPronunciation: 0,
  };

  useEffect(() => {
    setIsLabelExpanded(true);
    const timer = setTimeout(() => {
      setIsLabelExpanded(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, [aiBrain.currentLessonTitle]);

  // Cancel any in-flight TTS if the drawer closes or unmounts
  useEffect(() => {
    if (!isChatOpen) {
      ttsAbortRef.current?.abort();
    }
    return () => {
      ttsAbortRef.current?.abort();
    };
  }, [isChatOpen]);

  const showLauncherPill = (isLabelExpanded || isHovered) && !isShowing;

  const apiDossier = {
    ...aiBrain,
    topWord: aiBrain.topWord?.word || "",
    recentWords: aiBrain.recentWords?.map((w) => w.word).join(", ") || "",
  };

  const sessionRef = useRef({
    sessionId,
    lessonTitle: aiBrain.currentLessonTitle,
    spriteName,
    dossier: apiDossier,
  });
  sessionRef.current = {
    sessionId,
    lessonTitle: aiBrain.currentLessonTitle,
    spriteName,
    dossier: apiDossier,
  };

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`/api/users/${userId}/sprite/sessions`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.sessions)) {
        setSessionsList(data.sessions);
      }
    } catch (e) {
      console.error("Failed to fetch sprite sessions:", e);
    }
  }, [userId]);

  // 🔊 NON-SEQUENTIAL, WEIGHTED TTS TRIGGER FOR SPRITE SPOKEN TEXT
  const maybeSpeakTurn = useCallback(
    async (
      spokenText: string,
      isTranslationRequired: boolean,
      boardStatus?: "IN_PROGRESS" | "COMPLETED" | null,
      isNewBoard?: boolean,
    ) => {
      const cleanText = cleanDisplayString(spokenText);
      if (!cleanText || cleanText.length < 4) return;

      const weight = isNewBoard || boardStatus === "COMPLETED" ? 0.85 : 0.35;
      if (Math.random() > weight) return;

      ttsAbortRef.current?.abort();
      const controller = new AbortController();
      ttsAbortRef.current = controller;

      const voiceId = isTranslationRequired
        ? profile?.targetVoiceId
        : profile?.nativeVoiceId;

      try {
        const res = await fetch(`/api/users/${userId}/sprite/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: cleanText,
            voiceId,
            isTargetLang: isTranslationRequired,
          }),
          signal: controller.signal,
        });

        if (!res.ok || controller.signal.aborted) return;

        const blob = await res.blob();
        if (controller.signal.aborted) return;

        const blobUrl = URL.createObjectURL(blob);
        await playAudioUrl(blobUrl);
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.warn("[Sprite TTS] skipped:", err);
        }
      }
    },
    [userId, profile?.nativeVoiceId, profile?.targetVoiceId, playAudioUrl],
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/users/${userId}/sprite/chat`,
      }),
    [userId],
  );

  const { messages, setMessages, sendMessage, status, error } = useChat({
    transport,
    onFinish: async ({ message }) => {
      if (message.role !== "assistant") return;
      const parsed = parseMessagePayload(message);

      const isNewBoard = Boolean(
        parsed.chalkboard && parsed.chalkboard.title !== "__STEP_UPDATE__",
      );
      void maybeSpeakTurn(
        parsed.spokenText,
        parsed.isTranslationRequired,
        parsed.chalkboard?.status,
        isNewBoard,
      );

      const turnPayload = {
        id: message.id || crypto.randomUUID(),
        userPrompt: cleanDisplayString(lastUserPromptRef.current || "Practice"),
        assistantReply: parsed.spokenText || "Let's continue practicing.",
        isTranslationRequired: parsed.isTranslationRequired,
        translation: parsed.translation ?? null,
        chalkboard: parsed.chalkboard ?? null,
        contextCard: parsed.contextCard ?? null,
        action: parsed.action ?? null,
        createdAt: new Date().toISOString(),
      };

      try {
        const res = await fetch(`/api/users/${userId}/sprite/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sessionRef.current.sessionId,
            lessonTitle: sessionRef.current.lessonTitle,
            turn: turnPayload,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.sessions)) {
            setSessionsList(data.sessions);
          }
        } else {
          await fetchSessions();
        }
      } catch (err) {
        console.error("Failed to persist turn:", err);
      } finally {
        router.refresh();
      }
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  const turns = useMemo(() => groupUIMessagesIntoTurns(messages), [messages]);

  const currentTurnIdx =
    selectedTurnIndex !== null && turns[selectedTurnIndex]
      ? selectedTurnIndex
      : Math.max(0, turns.length - 1);

  const activeTurn = turns[currentTurnIdx];

  const activeAssistantPayload = useMemo(
    () => parseMessagePayload(activeTurn?.assistantMessage),
    [activeTurn?.assistantMessage],
  );

  const isSnoozing = useMemo(() => {
    if (
      aiBrain.currentFocusType === "SPOON" ||
      aiBrain.currentFocusType === "BOSS"
    ) {
      return false;
    }
    if (aiBrain.currentFocusType === "BRIDGE") {
      return true;
    }
    return false;
  }, [aiBrain.currentFocusType]);

  const sendWithSessionBody = useCallback(
    (text: string) => {
      if (isSnoozing) return;
      ttsAbortRef.current?.abort();
      stopAudio();

      lastUserPromptRef.current = text;
      sendMessage(
        { text },
        {
          body: {
            sessionId: sessionRef.current.sessionId,
            spriteName: sessionRef.current.spriteName,
            dossier: sessionRef.current.dossier,
          },
        },
      );
    },
    [sendMessage, isSnoozing, stopAudio],
  );

  const handleQuickPrompt = useCallback(
    (promptText: string) => {
      if (isLoading || isSnoozing) return;
      setSelectedTurnIndex(null);
      setActiveTab("session");
      sendWithSessionBody(promptText);
    },
    [isLoading, isSnoozing, setActiveTab, sendWithSessionBody],
  );

  useEffect(() => {
    if (isChatOpen && pendingPrompt && !isLoading) {
      handleQuickPrompt(pendingPrompt);
      clearPendingPrompt();
    }
  }, [
    isChatOpen,
    pendingPrompt,
    isLoading,
    handleQuickPrompt,
    clearPendingPrompt,
  ]);

  useEffect(() => {
    if (isChatOpen) {
      fetchSessions();
    }
  }, [isChatOpen, fetchSessions]);

  const startNewSession = () => {
    if (isSnoozing) return;
    ttsAbortRef.current?.abort();
    stopAudio();
    setSessionId(crypto.randomUUID());
    setMessages([]);
    setSelectedTurnIndex(null);
    setActiveTab("session");
  };

  const selectSession = (session: SpriteSessionData) => {
    ttsAbortRef.current?.abort();
    stopAudio();
    setSessionId(session.id);
    const loadedMessages = turnsToUIMessages(session.turns || []);
    setMessages(loadedMessages);
    setSelectedTurnIndex(null);
    setActiveTab("session");
  };

  const handleDeleteSession = async (
    session: SpriteSessionData,
  ): Promise<boolean> => {
    const ok = await deleteSession(session.id);
    if (!ok) return false;

    setSessionsList((prev) => prev.filter((s) => s.id !== session.id));

    if (session.id === sessionId) {
      setSessionId(crypto.randomUUID());
      setMessages([]);
      setSelectedTurnIndex(null);
    }

    return true;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading || isSnoozing) return;
    setSelectedTurnIndex(null);
    setActiveTab("session");
    sendWithSessionBody(text);
    setInput("");
  };

  const triggerPractice = (word: string) => {
    if (isLoading || isSnoozing) return;
    setSelectedTurnIndex(null);
    setActiveTab("session");
    sendWithSessionBody(`Help me practice how to use "${word}"`);
  };

  const energyCount = profile?.energy ?? 0;
  const maxEnergy = profile?.maxEnergy ?? 3;
  const unreadCount = 0;

  return (
    <>
      {/* FLOATING TRIGGER BUTTON (3D Tactile Light Mode Pill) */}
      <AnimatePresence>
        {!isChatOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => openChat()}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-3 cursor-pointer group"
          >
            <AnimatePresence initial={false}>
              {showLauncherPill && (
                <motion.div
                  key="launcher-pill"
                  initial={{ opacity: 0, x: 16, scale: 0.92 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 12, scale: 0.92 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="hidden sm:flex flex-col items-end rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-white px-4 py-2.5 text-right shadow-xl overflow-hidden whitespace-nowrap"
                >
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 max-w-[260px] truncate">
                    Current: {aiBrain.currentLessonTitle}
                  </span>
                  <span className="text-xs font-extrabold text-slate-900">
                    {isSnoozing
                      ? `💤 ${spriteName} is Napping`
                      : `Open ${spriteName} Assistant`}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative h-14 w-14 shrink-0">
              <div
                className={`h-full w-full overflow-hidden rounded-2xl border-2 border-b-4 bg-white shadow-xl transition-transform group-hover:-translate-y-0.5 ${
                  isSnoozing
                    ? "border-indigo-300 border-b-indigo-400 opacity-90"
                    : "border-sky-400 border-b-blue-600"
                }`}
              >
                <img
                  src={avatarSrc}
                  alt={spriteName}
                  className="h-full w-full object-cover object-top"
                />
              </div>

              {isSnoozing ? (
                <span className="absolute -top-1.5 -right-1.5 flex h-6 min-w-6 items-center justify-center rounded-full border-b-2 border-indigo-700 bg-indigo-500 px-1.5 text-[11px] font-black text-white ring-2 ring-white shadow-md">
                  💤
                </span>
              ) : unreadCount > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white ring-2 ring-white shadow-md">
                  {unreadCount}
                </span>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULL HEIGHT (100VH) DOCKED ASSISTANT DRAWER (LIGHT TACTILE MODE) */}
      <AnimatePresence>
        {isChatOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeChat}
              className="fixed inset-0 z-40 bg-slate-900/25 backdrop-blur-[2px]"
            />

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 bottom-0 right-0 z-50 flex h-screen w-full sm:w-[580px] md:w-[660px] flex-col overflow-hidden border-l-2 border-slate-200 bg-slate-100/95 font-sans text-slate-900 shadow-[-20px_0_60px_rgba(15,23,42,0.16)]"
            >
              {/* SUBTLE LIGHT VECTOR ORBITS BACKGROUND */}
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full opacity-45"
                viewBox="0 0 660 900"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient
                    id="spoonLightWave"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.16" />
                    <stop offset="55%" stopColor="#6366F1" stopOpacity="0.10" />
                    <stop
                      offset="100%"
                      stopColor="#10B981"
                      stopOpacity="0.05"
                    />
                  </linearGradient>
                  <linearGradient
                    id="spoonLightOrbit"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#0284C7" stopOpacity="0.22" />
                    <stop offset="50%" stopColor="#4F46E5" stopOpacity="0.16" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.12" />
                  </linearGradient>
                </defs>
                <path
                  d="M-80 190 C 160 80, 420 290, 720 130 L 720 0 L -80 0 Z"
                  fill="url(#spoonLightWave)"
                />
                <circle
                  cx="560"
                  cy="240"
                  r="210"
                  stroke="url(#spoonLightOrbit)"
                  strokeWidth="1.5"
                  strokeDasharray="8 8"
                />
                <circle
                  cx="560"
                  cy="240"
                  r="145"
                  stroke="url(#spoonLightOrbit)"
                  strokeWidth="1.25"
                />
                <circle
                  cx="90"
                  cy="680"
                  r="220"
                  stroke="url(#spoonLightOrbit)"
                  strokeWidth="1.5"
                  strokeDasharray="10 8"
                />
              </svg>

              {/* PART 1: HEADER */}
              <SpriteChatHeader
                spriteName={spriteName}
                avatarSrc={avatarSrc}
                currentLessonTitle={aiBrain.currentLessonTitle}
                activeTab={activeTab}
                sessionsCount={sessionsList.length}
                energyCount={Math.min(energyCount, maxEnergy)}
                maxEnergy={maxEnergy}
                isSnoozing={isSnoozing}
                isSessionActive={turns.length > 0}
                onSelectTab={setActiveTab}
                onStartNewSession={startNewSession}
                onClose={closeChat}
                viewMode={viewMode}
                onChangeViewMode={(mode) => {
                  setViewMode(mode);
                  if (activeTab !== "session") setActiveTab("session");
                }}
              />

              {/* PART 2: MESSAGES / STAGE / BRIEFING / HISTORY */}
              <SpriteChatMessages
                activeTab={activeTab}
                viewMode={viewMode}
                spriteName={spriteName}
                avatarSrc={avatarSrc}
                aiBrain={aiBrain}
                sessionId={sessionId}
                sessionsList={sessionsList}
                turns={turns}
                currentTurnIdx={currentTurnIdx}
                activeTurn={activeTurn}
                activeAssistantPayload={activeAssistantPayload}
                isLoading={isLoading}
                isSnoozing={isSnoozing}
                error={error}
                input={input}
                onInputChange={setInput}
                onSubmit={handleSubmit}
                onSelectSession={selectSession}
                onSelectTurnIndex={setSelectedTurnIndex}
                onTriggerPractice={triggerPractice}
                onQuickPrompt={handleQuickPrompt}
                onDeleteSession={handleDeleteSession}
              />

              {/* PART 3: BOTTOM SMS INPUT (Only rendered in Multi Mode when NOT snoozing) */}
              {activeTab === "session" &&
                viewMode === "multi" &&
                turns.length > 0 &&
                !isSnoozing && (
                  <SpriteChatControls
                    input={input}
                    isLoading={isLoading}
                    spriteName={spriteName}
                    targetLang={aiBrain.targetLang}
                    onInputChange={setInput}
                    onSubmit={handleSubmit}
                  />
                )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}