// components/foundation/foundation-freestye-chat-bubble.tsx
"use client";

import { Volume2, Loader2, Sparkles, Flame, Zap, Target } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export type TtsStatus = "idle" | "thinking" | "loading" | "playing";

interface FreestyleChatBubbleProps {
  message: any;
  onReplay?: (text: string) => void | Promise<void>;
  aiAvatarUrl?: string;
  ttsStatus?: TtsStatus;
  isBusy?: boolean;
}

function getScoreTier(score: number) {
  if (score >= 90) {
    return {
      label: "Native Flow",
      Icon: Flame,
      pillClass: "border-emerald-200 bg-emerald-50 text-emerald-900",
      scoreClass: "text-emerald-600",
      barClass: "bg-emerald-500",
    };
  }
  if (score >= 75) {
    return {
      label: "Solid Delivery",
      Icon: Zap,
      pillClass: "border-indigo-200 bg-indigo-50 text-indigo-900",
      scoreClass: "text-indigo-600",
      barClass: "bg-indigo-500",
    };
  }
  return {
    label: "Keep Sharpening",
    Icon: Target,
    pillClass: "border-amber-200 bg-amber-50 text-amber-950",
    scoreClass: "text-amber-600",
    barClass: "bg-amber-500",
  };
}

export function FoundationFreestyleChatBubble({
  message,
  onReplay,
  aiAvatarUrl,
  ttsStatus = "idle",
  isBusy = false,
}: FreestyleChatBubbleProps) {
  const { data: session } = authClient.useSession();
  const user = session?.user;

  // ============================================================================
  // USER MESSAGE (With Slim Gamified Azure Pronunciation Pill + Word Highlighting)
  // ============================================================================
  if (message.role === "user") {
    const initial =
      user?.name?.[0] ??
      (user as any)?.firstName?.[0] ??
      (user as any)?.username?.[0] ??
      "U";

    const avatarUrl = user?.image ?? (user as any)?.imageUrl;

    const pron = message.pronunciationScore;
    const overallScore =
      pron?.score ?? pron?.pronScore ?? pron?.accuracyScore ?? null;
    const accuracyScore = pron?.accuracyScore ?? overallScore;
    const fluencyScore = pron?.fluencyScore ?? overallScore;
    const wordScores: Array<{ word: string; accuracyScore: number }> =
      pron?.words ?? [];

    const tier =
      overallScore != null ? getScoreTier(Math.round(overallScore)) : null;

    return (
      <div className="flex items-end justify-end gap-2.5 sm:gap-3 animate-in slide-in-from-bottom-2 duration-300">
        <div className="flex max-w-[84%] flex-col items-end">
          {/* Speech Bubble */}
          <div className="rounded-2xl sm:rounded-3xl rounded-br-sm bg-gradient-to-br from-indigo-600 to-blue-600 px-3.5 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-[15px] font-bold sm:font-medium leading-relaxed text-white shadow-md">
            {wordScores.length > 0 ? (
              <div className="flex flex-wrap gap-x-1.5 gap-y-1">
                {wordScores.map((w, idx) => {
                  const s = w.accuracyScore ?? 100;
                  const wordColor =
                    s >= 85
                      ? "underline decoration-emerald-300/80 decoration-2 underline-offset-4"
                      : s >= 65
                        ? "underline decoration-amber-300/80 decoration-2 underline-offset-4"
                        : "underline decoration-rose-300 decoration-wavy decoration-2 underline-offset-4 text-rose-100";

                  return (
                    <span
                      key={idx}
                      title={`${w.word}: ${Math.round(s)}% accuracy`}
                      className={`cursor-help transition-transform hover:scale-105 ${wordColor}`}
                    >
                      {w.word}
                    </span>
                  );
                })}
              </div>
            ) : (
              message.text
            )}
          </div>

          {/* Analyzing Shimmer */}
          {message.isAnalyzingPronunciation && (
            <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 animate-pulse">
              <Sparkles className="h-3 w-3 text-indigo-500 animate-spin" />
              <span>Grading...</span>
            </div>
          )}

          {/* SLIM SINGLE-LINE PRONUNCIATION SCORECARD */}
          {overallScore != null && tier && (
            <div
              className={`mt-1.5 inline-flex flex-wrap items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] sm:text-xs shadow-2xs animate-in zoom-in-95 duration-200 ${tier.pillClass}`}
            >
              <div className="flex items-center gap-1 pr-1.5 border-r border-slate-300/60">
                <tier.Icon className={`h-3.5 w-3.5 shrink-0 ${tier.scoreClass}`} />
                <span className={`font-black ${tier.scoreClass}`}>
                  {Math.round(overallScore)}%
                </span>
                <span className="font-extrabold tracking-wide uppercase">
                  {tier.label}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <span className="font-bold uppercase text-slate-500">Acc</span>
                <div className="hidden sm:block h-1.5 w-8 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full ${tier.barClass}`}
                    style={{ width: `${Math.min(100, accuracyScore)}%` }}
                  />
                </div>
                <span className="font-black text-slate-800">
                  {Math.round(accuracyScore)}%
                </span>
              </div>

              <div className="flex items-center gap-1">
                <span className="font-bold uppercase text-slate-500">Flow</span>
                <div className="hidden sm:block h-1.5 w-8 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full ${tier.barClass}`}
                    style={{ width: `${Math.min(100, fluencyScore)}%` }}
                  />
                </div>
                <span className="font-black text-slate-800">
                  {Math.round(fluencyScore)}%
                </span>
              </div>
            </div>
          )}
        </div>

        <Avatar className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 border border-slate-200">
          <AvatarImage src={avatarUrl} alt="You" />
          <AvatarFallback className="bg-blue-500 text-white text-xs sm:text-sm font-bold uppercase">
            {initial}
          </AvatarFallback>
        </Avatar>
      </div>
    );
  }

  // ============================================================================
  // ASSISTANT MESSAGE
  // ============================================================================
  const isThinking = ttsStatus === "thinking";
  const isLoading = ttsStatus === "loading";
  const isPlayingNow = ttsStatus === "playing";
  const isActive = isLoading || isPlayingNow;

  return (
    <div className="flex items-end gap-2.5 sm:gap-3 animate-in slide-in-from-bottom-2 duration-300">
      <Avatar className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 border border-slate-200 bg-slate-800">
        <AvatarImage src={aiAvatarUrl} alt="AI Tutor" />
        <AvatarFallback className="bg-indigo-600 text-white text-xs font-bold">
          AI
        </AvatarFallback>
      </Avatar>

      <div className="flex max-w-[82%] flex-col items-start gap-0.5">
        <div className="rounded-2xl sm:rounded-3xl rounded-bl-sm border border-slate-200/80 bg-white px-3.5 py-2.5 sm:px-4 sm:py-3.5 shadow-2xs">
          {isThinking ? (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
              <span className="text-xs sm:text-sm font-medium">Speaking...</span>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <div className="text-xs sm:text-[15px] leading-relaxed text-slate-900 font-bold sm:font-medium">
                <p>{message.text}</p>
              </div>

              {onReplay && (
                <button
                  onClick={() => onReplay(message.text)}
                  disabled={isBusy}
                  aria-label="Replay message"
                  className={`-ml-1 flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors active:scale-95 disabled:cursor-not-allowed ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-40"
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Volume2
                      className={`h-3.5 w-3.5 ${isPlayingNow ? "animate-pulse" : ""}`}
                    />
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {!isThinking && message.translation && (
          <p className="px-2 text-[11px] sm:text-xs italic leading-snug text-slate-400">
            {message.translation}
          </p>
        )}
      </div>
    </div>
  );
}