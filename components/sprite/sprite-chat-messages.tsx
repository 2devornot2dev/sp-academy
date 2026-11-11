// components/sprite/sprite-chat-messages.tsx
"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Loader2,
  Volume2,
  Square,
  X,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Cpu,
} from "lucide-react";
import { useSprite, type ChatViewMode } from "@/context/sprite-context";
import type {
  ActiveTab,
  ChatContextData,
  ParsedPayload,
  UIMessageTurn,
} from "./sprite-chat-utils";
import type { SpriteSessionData } from "@/lib/schema/sprite-schema";
import { SpriteChatHistoryTab } from "./sprite-chat-history-tab";
import { SpriteChatBriefingTab } from "./sprite-chat-briefing-tab";
import { SpriteChatSessionTab } from "./sprite-chat-session-tab";

interface SpriteChatMessagesProps {
  activeTab: ActiveTab;
  viewMode: ChatViewMode;
  spriteName: string;
  avatarSrc: string;
  aiBrain: ChatContextData;
  sessionId: string;
  sessionsList: SpriteSessionData[];
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
  onSelectSession: (session: SpriteSessionData) => void;
  onDeleteSession: (session: SpriteSessionData) => Promise<boolean>;
  onSelectTurnIndex: (idx: number) => void;
  onTriggerPractice: (word: string) => void;
  onQuickPrompt: (prompt: string) => void;
}

export function SpriteChatMessages({
  activeTab,
  viewMode,
  spriteName,
  avatarSrc,
  aiBrain,
  sessionId,
  sessionsList,
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
  onSelectSession,
  onDeleteSession,
  onSelectTurnIndex,
  onTriggerPractice,
  onQuickPrompt,
}: SpriteChatMessagesProps) {
  const {
    playAudioUrl,
    stopAudio,
    isPlaying,
    liveTask,
    isRetryingTask,
    retryLiveTask,
    current,
    dismissSprite,
  } = useSprite();

  const [showErrorDetails, setShowErrorDetails] = useState(false);

  const isSingleStageActive =
    activeTab === "session" &&
    viewMode === "single" &&
    turns.length > 0 &&
    Boolean(activeTurn);

  return (
    <div
      className={`relative z-10 flex flex-1 flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${
        isSingleStageActive ? "p-0" : "px-5 py-4"
      }`}
    >
      {/* ================= LIVE GENERATION / ERROR LOG BANNER (LIGHT 3D TACTILE) ================= */}
      {liveTask && activeTab !== "history" && activeTab !== "briefing" && (
        <div
          className={`${
            isSingleStageActive ? "mx-5 mt-4" : "mb-4"
          } shrink-0 rounded-2xl border-2 border-b-4 p-4 shadow-xs transition ${
            liveTask.status === "FAILED"
              ? "border-rose-300 border-b-rose-400 bg-rose-50"
              : "border-sky-200 border-b-sky-300 bg-white"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              {liveTask.status === "FAILED" ? (
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              ) : (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-600" />
              )}
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                  liveTask.status === "FAILED"
                    ? "border border-rose-300 bg-rose-100 text-rose-800"
                    : "border border-sky-200 bg-sky-50 text-blue-700"
                }`}
              >
                {liveTask.status === "FAILED"
                  ? `${liveTask.label} Generation Failed`
                  : `Baking ${liveTask.label}...`}
              </span>
            </div>

            {liveTask.status === "FAILED" && (
              <button
                type="button"
                onClick={() => setShowErrorDetails((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2 py-1 text-[10px] font-bold text-rose-700 hover:bg-rose-100"
              >
                <Cpu className="h-3 w-3 text-rose-600" />
                <span>{showErrorDetails ? "Hide Log" : "Error Log"}</span>
                {showErrorDetails ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
            )}
          </div>

          <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-700">
            {liveTask.status === "FAILED"
              ? `${spriteName} ran into an issue in the lesson builder. You can retry the generation right here or practice with me while we rebuild it.`
              : `${spriteName} is currently generating your ${liveTask.label.toLowerCase()}. Feel free to chat or warm up with me while it finishes!`}
          </p>

          {liveTask.status === "FAILED" && showErrorDetails && (
            <div className="mt-3 space-y-1 rounded-xl border border-rose-200 bg-white p-3 font-mono text-[11px] text-rose-800">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
                <span>
                  <strong className="text-slate-900">Lambda:</strong>{" "}
                  {liveTask.lambdaName || "spoon-edu-builder"}
                </span>
                {liveTask.stage && (
                  <span>
                    <strong className="text-slate-900">Stage:</strong>{" "}
                    {liveTask.stage}
                  </span>
                )}
                <span>
                  <strong className="text-slate-900">Task ID:</strong>{" "}
                  {liveTask.taskId.slice(0, 10)}...
                </span>
              </div>
              {liveTask.errorMessage && (
                <p className="break-words border-t border-rose-100 pt-1 text-rose-600">
                  {liveTask.errorMessage}
                </p>
              )}
            </div>
          )}

          {liveTask.status === "FAILED" && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isRetryingTask}
                onClick={() => retryLiveTask(liveTask.taskId)}
                className="inline-flex items-center gap-1.5 rounded-xl border-b-2 border-rose-700 bg-rose-500 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-xs transition hover:bg-rose-600 disabled:opacity-60"
              >
                {isRetryingTask ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Retrying Builder...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Retry Generation</span>
                  </>
                )}
              </button>

              {!isSnoozing && (
                <button
                  type="button"
                  onClick={() =>
                    onQuickPrompt(
                      `While my ${liveTask.label} is rebuilding, can we do a quick warm-up exercise?`,
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl border-2 border-b-[3px] border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
                >
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  <span>Warm up while waiting</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= IN-CHAT SPRITE NOTIFICATION BANNER ================= */}
      {current && activeTab !== "history" && activeTab !== "briefing" && (
        <div
          className={`${
            isSingleStageActive ? "mx-5 my-3" : "mb-4"
          } shrink-0 rounded-2xl border-2 border-b-4 border-sky-200 border-b-sky-300 bg-white p-4 shadow-xs`}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-600">
              {current.badge || `${spriteName} Dispatch`}
            </span>
            <button
              type="button"
              onClick={dismissSprite}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              title="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="mt-2 text-xs font-bold leading-relaxed text-slate-800">
            &ldquo;{current.text}&rdquo;
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {current.audioUrl && (
              <button
                type="button"
                onClick={() =>
                  isPlaying ? stopAudio() : playAudioUrl(current.audioUrl!)
                }
                className={`inline-flex items-center gap-1.5 rounded-xl border-2 border-b-[3px] px-3 py-1.5 text-[11px] font-extrabold transition ${
                  isPlaying
                    ? "border-emerald-700 bg-emerald-500 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-300 hover:bg-sky-50"
                }`}
              >
                {isPlaying ? (
                  <>
                    <Square className="h-2.5 w-2.5 fill-current" />
                    <span>Stop Audio</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="h-3.5 w-3.5 text-blue-600" />
                    <span>Play Voice</span>
                  </>
                )}
              </button>
            )}

            {current.action && (
              <button
                type="button"
                onClick={() => {
                  current.action?.onClick();
                  dismissSprite();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border-b-2 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-3.5 py-1.5 text-[11px] font-black text-white transition hover:brightness-105"
              >
                <span>{current.action.label}</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB ROUTER ================= */}
      {activeTab === "history" ? (
        <SpriteChatHistoryTab
          spriteName={spriteName}
          sessionId={sessionId}
          sessionsList={sessionsList}
          hasActiveTurns={turns.length > 0}
          onSelectSession={onSelectSession}
          onDeleteSession={onDeleteSession}
        />
      ) : activeTab === "briefing" ? (
        <SpriteChatBriefingTab
          spriteName={spriteName}
          aiBrain={aiBrain}
          onTriggerPractice={onTriggerPractice}
        />
      ) : (
        <SpriteChatSessionTab
          viewMode={viewMode}
          spriteName={spriteName}
          avatarSrc={avatarSrc}
          aiBrain={aiBrain}
          turns={turns}
          currentTurnIdx={currentTurnIdx}
          activeTurn={activeTurn}
          activeAssistantPayload={activeAssistantPayload}
          isLoading={isLoading}
          isSnoozing={isSnoozing}
          error={error}
          input={input}
          onInputChange={onInputChange}
          onSubmit={onSubmit}
          onSelectTurnIndex={onSelectTurnIndex}
          onQuickPrompt={onQuickPrompt}
        />
      )}
    </div>
  );
}