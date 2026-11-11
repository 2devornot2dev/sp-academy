// components/sprite/sprite-chat-session-tab.tsx
"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Languages,
  ChevronDown,
  ChevronUp,
  BookOpen,
  ArrowRight,
  Moon,
} from "lucide-react";
import { useSprite, type ChatViewMode } from "@/context/sprite-context";
import {
  cleanDisplayString,
  getRawText,
  parseMessagePayload,
  type ChatContextData,
  type ParsedPayload,
  type UIMessageTurn,
} from "./sprite-chat-utils";
import type { ChalkboardData } from "@/lib/schema/sprite-schema";
import {
  SpriteChatChalkboard,
  normalizeBoardData,
} from "./sprite-chat-chalkboard";

interface SpriteChatSessionTabProps {
  viewMode: ChatViewMode;
  spriteName: string;
  avatarSrc: string;
  aiBrain: ChatContextData;
  turns: UIMessageTurn[];
  currentTurnIdx: number;
  activeTurn?: UIMessageTurn;
  activeAssistantPayload: ParsedPayload;
  isLoading: boolean;
  isSnoozing?: boolean;
  error?: Error;
  input: string;
  onInputChange: (val: string) => void;
  onSubmit: (e: FormEvent) => void;
  onSelectTurnIndex: (idx: number) => void;
  onQuickPrompt: (prompt: string) => void;
}

export function SpriteChatSessionTab({
  viewMode,
  spriteName,
  avatarSrc,
  aiBrain,
  turns,
  currentTurnIdx,
  activeTurn,
  activeAssistantPayload,
  isLoading,
  isSnoozing = false,
  error,
  input,
  onInputChange,
  onSubmit,
  onSelectTurnIndex,
  onQuickPrompt,
}: SpriteChatSessionTabProps) {
  const router = useRouter();
  const { closeChat } = useSprite();

  const [multiBoardOverride, setMultiBoardOverride] =
    useState<ChalkboardData | null>(null);
  const [isMultiBoardOpen, setIsMultiBoardOpen] = useState(false);

  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewMode === "multi") {
      threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [viewMode, turns.length, activeAssistantPayload.spokenText, isLoading]);

  const handleNavigateToLesson = (href: string) => {
    closeChat();
    router.push(href);
  };

  const getTurnPayload = (
    turn: UIMessageTurn,
    isLastTurn: boolean,
  ): ParsedPayload => {
    if (isLastTurn && turn.id === activeTurn?.id) {
      return activeAssistantPayload;
    }
    return parseMessagePayload(turn.assistantMessage);
  };

  const resolvedChalkboard = (() => {
    let latestFullBoard: ChalkboardData | null = null;
    for (let i = 0; i <= currentTurnIdx; i++) {
      const p =
        i === currentTurnIdx && turns[i]?.id === activeTurn?.id
          ? activeAssistantPayload
          : parseMessagePayload(turns[i]?.assistantMessage);

      const norm = normalizeBoardData(
        p.chalkboard,
        p.contextCard,
        aiBrain.currentLessonTitle,
        latestFullBoard,
      );
      if (norm) {
        latestFullBoard = norm;
      }
    }
    return latestFullBoard
      ? {
          board: latestFullBoard,
          isPinned: !activeAssistantPayload.chalkboard,
        }
      : null;
  })();

  /* ================= 1. EMPTY: NEW SESSION STAGE ================= */
  if (turns.length === 0 || !activeTurn) {
    return (
      <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center py-6 text-center">
        <div className="relative mb-5">
          <div
            className={`absolute -inset-2 rounded-3xl blur-lg ${
              isSnoozing
                ? "bg-gradient-to-r from-indigo-400/25 to-purple-400/25"
                : "bg-gradient-to-r from-sky-400/30 to-emerald-400/30"
            }`}
          />
          <div
            className={`relative h-20 w-20 overflow-hidden rounded-3xl border-2 border-b-[5px] bg-white shadow-lg ${
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
          {isSnoozing && (
            <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border-b-2 border-indigo-700 bg-indigo-500 text-xs text-white ring-2 ring-white shadow-md">
              💤
            </span>
          )}
        </div>

        {isSnoozing ? (
          <div className="w-full rounded-3xl border-2 border-b-[6px] border-slate-200 border-b-slate-300 bg-white p-6 shadow-xs">
            <h3 className="mb-1.5 text-lg font-black text-slate-900">
              {spriteName} is resting up! 💤
            </h3>
            <p className="mb-6 text-xs font-medium leading-relaxed text-slate-500">
              {spriteName} is resting their voice for your lesson! Head into{" "}
              <span className="font-extrabold text-slate-900">
                {aiBrain.activeStepLabel?.replace(/^Start\s+/i, "") ||
                  aiBrain.currentLessonTitle}
              </span>{" "}
              to wake {spriteName} up.
            </p>

            {aiBrain.activeStepHref && (
              <button
                type="button"
                onClick={() => handleNavigateToLesson(aiBrain.activeStepHref!)}
                className="inline-flex items-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-6 py-3 text-xs font-black text-white shadow-md transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0"
              >
                <span>{aiBrain.activeStepLabel || "Continue Lesson"}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="w-full rounded-3xl border-2 border-b-[6px] border-slate-200 border-b-slate-300 bg-white p-6 shadow-xs">
            <h3 className="mb-1.5 text-lg font-black text-slate-900">
              Ready to practice, {aiBrain.userName}?
            </h3>
            <p className="mb-6 text-xs font-medium leading-relaxed text-slate-500">
              Click a guided activity below to launch your interactive
              chalkboard for{" "}
              <span className="font-extrabold text-blue-600">
                {aiBrain.currentLessonTitle}
              </span>
              .
            </p>

            <div className="flex flex-wrap justify-center gap-2.5">
              <button
                type="button"
                onClick={() =>
                  onQuickPrompt(
                    `Give me a grammar breakdown for ${aiBrain.currentLessonTitle}`,
                  )
                }
                className="rounded-2xl border-2 border-b-4 border-indigo-200 border-b-indigo-300 bg-indigo-50/70 px-4 py-2.5 text-xs font-black text-indigo-700 transition hover:-translate-y-0.5 hover:bg-indigo-100 active:translate-y-0.5 active:border-b-2"
              >
                ✨ Explain Lesson Grammar
              </button>
              <button
                type="button"
                onClick={() =>
                  onQuickPrompt(`Quiz me on ${aiBrain.currentLessonTitle}`)
                }
                className="rounded-2xl border-2 border-b-4 border-emerald-600 bg-gradient-to-b from-emerald-400 to-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-xs transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-2"
              >
                🎯 Start 1-on-1 Quiz
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ================= 2. MULTI MODE: THREAD + BOARD DRAWER ================= */
  if (viewMode === "multi") {
    const activeMultiBoard = multiBoardOverride || resolvedChalkboard?.board;
    const activeStepCount =
      activeMultiBoard?.steps?.length || activeMultiBoard?.items?.length || 0;

    return (
      <div className="flex flex-1 flex-col gap-5">
        {activeMultiBoard && (
          <div className="sticky top-0 z-20 -mx-2">
            <div className="overflow-hidden rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-white/95 shadow-lg backdrop-blur-md">
              <div className="flex items-center justify-between gap-2 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="shrink-0 rounded-lg border-b-2 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-2.5 py-0.5 text-[10px] font-black uppercase text-white">
                    📋 Board
                  </span>
                  <span className="truncate text-sm font-black text-slate-900">
                    {cleanDisplayString(activeMultiBoard.title)}
                  </span>
                  <span className="shrink-0 text-xs font-bold text-slate-400">
                    · Step {(activeMultiBoard.currentStepIndex ?? 0) + 1} of{" "}
                    {Math.max(1, activeStepCount)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMultiBoardOpen((prev) => !prev)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-xl border-2 border-b-[3px] border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-blue-600"
                >
                  <span>
                    {isMultiBoardOpen ? "Close Board" : "View Board"}
                  </span>
                  {isMultiBoardOpen ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              <AnimatePresence>
                {isMultiBoardOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden border-t border-slate-100"
                  >
                    <SpriteChatChalkboard
                      board={activeMultiBoard}
                      hideHeader
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {turns.map((turn, idx) => {
          const isLastTurn = idx === turns.length - 1;
          const payload = getTurnPayload(turn, isLastTurn);
          const turnBoard = normalizeBoardData(
            payload.chalkboard,
            payload.contextCard,
            aiBrain.currentLessonTitle,
            resolvedChalkboard?.board,
          );
          const previewTarget =
            turnBoard?.steps?.[turnBoard.currentStepIndex ?? 0]?.targetPhrase ||
            turnBoard?.steps?.[0]?.targetPhrase ||
            turnBoard?.items?.[0]?.target ||
            null;

          const userText = turn.userMessage
            ? cleanDisplayString(getRawText(turn.userMessage))
            : "";

          return (
            <div key={turn.id} className="space-y-3.5">
              {userText && (
                <div className="flex justify-end">
                  <div className="max-w-[82%] rounded-2xl rounded-tr-sm border-b-[3px] border-blue-800 bg-gradient-to-b from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-xs">
                    {userText}
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl border-2 border-b-[3px] border-sky-300 bg-white shadow-xs">
                  <img
                    src={avatarSrc}
                    alt={spriteName}
                    className="h-full w-full object-cover object-top"
                  />
                </div>

                <div className="max-w-[88%] flex-1 space-y-3 rounded-2xl rounded-tl-sm border-2 border-b-[5px] border-slate-200 border-b-slate-300 bg-white p-4 shadow-xs">
                  <span className="flex items-center gap-1 text-xs font-black tracking-wide text-blue-600">
                    <Sparkles className="h-3 w-3 text-amber-500" /> {spriteName}
                  </span>

                  {payload.spokenText ? (
                    <p className="text-sm font-bold leading-relaxed text-slate-800">
                      {payload.spokenText}
                    </p>
                  ) : isLastTurn && isLoading ? (
                    <div className="flex items-center gap-2 py-1.5">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-sky-500 [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-blue-600 [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500" />
                      <span className="ml-1 text-xs font-bold text-slate-400">
                        {spriteName} is thinking...
                      </span>
                    </div>
                  ) : isLastTurn && error ? (
                    <p className="text-xs font-bold text-rose-600">
                      {spriteName} couldn&apos;t respond right now. Please try
                      asking again.
                    </p>
                  ) : (
                    <p className="text-xs font-medium text-slate-500">
                      Could you rephrase that? Let&apos;s keep practicing{" "}
                      {aiBrain.currentLessonTitle}.
                    </p>
                  )}

                  {payload.translation && (
                    <div className="flex items-start gap-2 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3.5 py-2.5">
                      <Languages className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
                      <p className="text-xs font-semibold leading-relaxed text-indigo-900">
                        {payload.translation}
                      </p>
                    </div>
                  )}

                  {turnBoard && (
                    <button
                      type="button"
                      onClick={() => {
                        setMultiBoardOverride(turnBoard);
                        setIsMultiBoardOpen(true);
                      }}
                      className="group flex w-full items-center justify-between gap-2 rounded-xl border-2 border-b-[3px] border-slate-200 bg-slate-50 px-3.5 py-2.5 text-left transition hover:border-sky-300 hover:bg-sky-50/60"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <BookOpen className="h-4 w-4 shrink-0 text-blue-600" />
                        <span className="truncate text-xs font-black text-slate-900">
                          {cleanDisplayString(turnBoard.title)}
                        </span>
                        {previewTarget && (
                          <span className="hidden max-w-[160px] truncate rounded-md border border-sky-200 bg-white px-2 py-0.5 text-[11px] font-bold text-blue-700 sm:inline-block">
                            {cleanDisplayString(previewTarget)}
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 text-[11px] font-black uppercase tracking-wider text-blue-600 group-hover:underline">
                        View Step ↗
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Snooze Banner at the bottom of Multi Mode */}
        {isSnoozing && (
          <div className="mt-2 rounded-2xl border-2 border-b-4 border-indigo-200 border-b-indigo-300 bg-white p-4 shadow-xs">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-base">
                  <Moon className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h5 className="text-xs font-black uppercase tracking-wider text-indigo-600">
                    {spriteName} is resting up! 💤
                  </h5>
                  <p className="mt-0.5 text-xs font-semibold text-slate-600">
                    {spriteName} is resting their voice for your lesson! Head
                    into{" "}
                    <span className="font-black text-slate-900">
                      {aiBrain.activeStepLabel?.replace(/^Start\s+/i, "") ||
                        aiBrain.currentLessonTitle}
                    </span>{" "}
                    to wake {spriteName} up.
                  </p>
                </div>
              </div>

              {aiBrain.activeStepHref && (
                <button
                  type="button"
                  onClick={() => handleNavigateToLesson(aiBrain.activeStepHref!)}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border-b-[3px] border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-4 py-2 text-xs font-black text-white shadow-xs transition hover:brightness-105"
                >
                  <span>{aiBrain.activeStepLabel || "Continue Lesson"}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        <div ref={threadEndRef} />
      </div>
    );
  }

  /* ================= 3. SINGLE MODE: UNIFIED FULL-BLEED CHALKBOARD STAGE ================= */
  return (
    <SpriteChatChalkboard
      fullStage
      board={resolvedChalkboard?.board}
      contextCard={activeAssistantPayload.contextCard}
      tutorHeader={{
        spriteName,
        avatarSrc,
        spokenText: activeAssistantPayload.spokenText,
        translation: activeAssistantPayload.translation,
        userPrompt: activeTurn.userMessage
          ? cleanDisplayString(getRawText(activeTurn.userMessage))
          : undefined,
        isLoading,
        error,
        currentTurnIdx,
        totalTurns: turns.length,
        onSelectTurnIndex,
      }}
      snoozeState={{
        isSnoozing,
        lessonTitle: aiBrain.currentLessonTitle,
        actionHref: aiBrain.activeStepHref,
        actionLabel: aiBrain.activeStepLabel,
        onNavigate: handleNavigateToLesson,
      }}
      interactiveInput={{
        value: input,
        isLoading,
        spriteName,
        targetLang: aiBrain.targetLang,
        onChange: onInputChange,
        onSubmit,
        onQuickAction: onQuickPrompt,
      }}
    />
  );
}