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
    unreadCount,
    pendingPrompt,
    clearPendingPrompt,
    deleteSession,
    isShowing,
    playAudioUrl, // <--- Used to play the TTS audio blob
    stopAudio, // <--- Used to stop audio when user replies or closes chat
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

      // Smart Weight:
      // - 85% chance when a new Chalkboard opens or when a Chalkboard completes
      // - 35% chance on middle step updates
      const weight = isNewBoard || boardStatus === "COMPLETED" ? 0.85 : 0.35;

      if (Math.random() > weight) return;

      // Abort any previous in-flight TTS request
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

      // 1. Trigger non-sequential weighted voice in the background (do NOT await so UI never blocks!)
      const isNewBoard = Boolean(
        parsed.chalkboard && parsed.chalkboard.title !== "__STEP_UPDATE__",
      );
      void maybeSpeakTurn(
        parsed.spokenText,
        parsed.isTranslationRequired,
        parsed.chalkboard?.status,
        isNewBoard,
      );

      // 2. Persist turn to session history
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
      // Stop any playing or loading TTS when the user sends a new message
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

  return (
    <>
      {/* FLOATING TRIGGER BUTTON */}
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
                  className="hidden sm:flex flex-col items-end rounded-2xl border border-teal-500/30 bg-slate-950/90 px-4 py-2.5 text-right shadow-xl backdrop-blur-md overflow-hidden whitespace-nowrap"
                >
                  <span className="text-[10px] font-black uppercase tracking-wider text-teal-400 max-w-[260px] truncate">
                    Current: {aiBrain.currentLessonTitle}
                  </span>
                  <span className="text-xs font-bold text-white">
                    {isSnoozing
                      ? `💤 ${spriteName} is Napping`
                      : `Open ${spriteName} Assistant`}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative h-14 w-14 shrink-0">
              <div
                className={`h-full w-full overflow-hidden rounded-2xl border-2 bg-slate-900 shadow-2xl transition-transform group-hover:scale-105 ${
                  isSnoozing
                    ? "border-indigo-400/50 opacity-85"
                    : "border-teal-400/50"
                }`}
              >
                <img
                  src={avatarSrc}
                  alt={spriteName}
                  className="h-full w-full object-cover object-top"
                />
              </div>

              {isSnoozing ? (
                <span className="absolute -top-1.5 -right-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-indigo-500/50 px-1.5 text-[11px] font-black text-white ring-2 ring-slate-950 shadow-md">
                  💤
                </span>
              ) : unreadCount > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white ring-2 ring-slate-950 shadow-md">
                  {unreadCount}
                </span>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULL HEIGHT (100VH) DOCKED ASSISTANT DRAWER */}
      <AnimatePresence>
        {isChatOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeChat}
              className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px]"
            />

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 bottom-0 right-0 z-50 flex h-screen w-full sm:w-[580px] md:w-[660px] flex-col overflow-hidden border-l border-teal-500/30 bg-[#070B14] shadow-[-24px_0_80px_rgba(0,0,0,0.85)]"
            >
              {/* VECTOR ORBITS BACKGROUND */}
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full opacity-55"
                viewBox="0 0 660 900"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient
                    id="spoonGradWave"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.4" />
                    <stop offset="55%" stopColor="#6366F1" stopOpacity="0.28" />
                    <stop
                      offset="100%"
                      stopColor="#A855F7"
                      stopOpacity="0.08"
                    />
                  </linearGradient>
                  <linearGradient
                    id="spoonOrbitBright"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.65" />
                    <stop offset="50%" stopColor="#818CF8" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#C084FC" stopOpacity="0.2" />
                  </linearGradient>
                  <radialGradient id="spoonGlowOrb" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#2DD4BF" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <path
                  d="M-80 190 C 160 80, 420 290, 720 130 L 720 0 L -80 0 Z"
                  fill="url(#spoonGradWave)"
                />
                <circle
                  cx="560"
                  cy="240"
                  r="210"
                  stroke="url(#spoonOrbitBright)"
                  strokeWidth="1.75"
                  strokeDasharray="8 8"
                />
                <circle
                  cx="560"
                  cy="240"
                  r="145"
                  stroke="url(#spoonOrbitBright)"
                  strokeWidth="1.5"
                />
                <circle
                  cx="560"
                  cy="240"
                  r="85"
                  stroke="url(#spoonOrbitBright)"
                  strokeWidth="1"
                  strokeDasharray="4 6"
                />
                <circle cx="415" cy="240" r="5" fill="#2DD4BF" />
                <circle cx="415" cy="240" r="16" fill="url(#spoonGlowOrb)" />
                <circle cx="560" cy="385" r="4" fill="#818CF8" />
                <circle
                  cx="90"
                  cy="680"
                  r="240"
                  stroke="url(#spoonOrbitBright)"
                  strokeWidth="1.75"
                />
                <circle
                  cx="90"
                  cy="680"
                  r="165"
                  stroke="url(#spoonOrbitBright)"
                  strokeWidth="1.5"
                  strokeDasharray="10 8"
                />
                <circle cx="255" cy="680" r="5" fill="#2DD4BF" />
                <circle cx="255" cy="680" r="18" fill="url(#spoonGlowOrb)" />
                <circle cx="260" cy="510" r="4" fill="#A855F7" />
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
