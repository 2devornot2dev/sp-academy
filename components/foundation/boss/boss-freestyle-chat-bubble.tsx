// components/foundation/boss/boss-freestyle-chat-bubble.tsx
"use client";

import { Volume2, Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { BossMessage } from "@/context/boss-context";

export type TtsStatus = "idle" | "thinking" | "loading" | "playing";

interface BossFoundationFreestyleChatBubbleProps {
  message: BossMessage;
  onReplay?: (text: string) => void | Promise<void>;
  aiAvatarUrl?: string;
  ttsStatus?: TtsStatus;
  isBusy?: boolean;
}

export function BossFoundationFreestyleChatBubble({
  message,
  onReplay,
  aiAvatarUrl,
  ttsStatus = "idle",
  isBusy = false,
}: BossFoundationFreestyleChatBubbleProps) {
  if (message.role === "user" || (message as any).sender === "user") {
    return null;
  }

  const isThinking = ttsStatus === "thinking";
  const isLoading = ttsStatus === "loading";
  const isPlayingNow = ttsStatus === "playing";

  const isCorrectReaction = message.status === "correct";
  const isIncorrectReaction = message.status === "incorrect";
  const isGradedReaction = isCorrectReaction || isIncorrectReaction;

  return (
    <div className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* 3D Squircle Avatar (Matches FreestyleChat) */}
      <div
        className={`h-11 w-11 shrink-0 overflow-hidden rounded-2xl border-2 border-b-[3px] bg-slate-900 shadow-xs transition-all ${
          isCorrectReaction
            ? "border-emerald-400 border-b-emerald-700"
            : isIncorrectReaction
              ? "border-rose-400 border-b-rose-700"
              : "border-sky-400 border-b-blue-800"
        }`}
      >
        {aiAvatarUrl ? (
          <img
            src={aiAvatarUrl}
            alt="Boss"
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-indigo-600 text-xs font-black text-white">
            BOSS
          </div>
        )}
      </div>

      {/* 3D Tactile Speech Bubble Card */}
      <div
        className={`max-w-[82%] rounded-2xl rounded-tl-sm border-2 border-b-4 px-5 py-3.5 shadow-xs transition-all ${
          isCorrectReaction
            ? "border-emerald-300 border-b-emerald-400 bg-emerald-50/95 text-emerald-950"
            : isIncorrectReaction
              ? "border-rose-300 border-b-rose-400 bg-rose-50/95 text-rose-950"
              : "border-slate-200 border-b-slate-300 bg-white text-slate-900"
        }`}
      >
        {isGradedReaction && (
          <div className="mb-1.5 flex items-center gap-1.5">
            {isCorrectReaction ? (
              <>
                <CheckCircle2 size={15} className="text-emerald-600" />
                <span className="text-[11px] font-black tracking-wider text-emerald-700 uppercase">
                  Correct! +50 XP
                </span>
              </>
            ) : (
              <>
                <XCircle size={15} className="text-rose-600" />
                <span className="text-[11px] font-black tracking-wider text-rose-700 uppercase">
                  Incorrect • -1 Heart
                </span>
              </>
            )}
          </div>
        )}

        {isThinking ? (
          <div className="flex items-center gap-2.5 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm font-bold">Thinking...</span>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-bold leading-relaxed sm:text-base">
              {message.text}
            </p>

            {onReplay && message.text && (
              <button
                type="button"
                onClick={() => onReplay(message.text!)}
                disabled={isBusy}
                aria-label="Replay message"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 border-b-[3px] border-sky-200 bg-sky-50 text-blue-600 transition hover:bg-sky-100 active:translate-y-0.5 disabled:opacity-40"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Volume2
                    className={`h-4 w-4 ${isPlayingNow ? "animate-pulse" : ""}`}
                  />
                )}
              </button>
            )}
          </div>
        )}

        {!isThinking && message.translation && (
          <p className="mt-2 border-t border-slate-200/60 pt-1.5 text-xs font-semibold text-slate-500">
            {message.translation}
          </p>
        )}
      </div>
    </div>
  );
}