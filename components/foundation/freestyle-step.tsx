// freestyle-step.tsx
"use client";

import React, { useState } from "react";
import {
  Mic,
  ArrowRight,
  Play,
  Loader2,
  Target,
  Sparkles,
  UserCheck,
} from "lucide-react";
import FoundationChat from "./foundation-chat";
import { useSprite } from "@/context/sprite-context";

export function FreestyleStep({
  data,
  onNext,
}: {
  data: any;
  onNext: () => void;
}) {
  const { freestyle, grammarContent, visualContent } = data;
  const { profile } = useSprite();

  const userId = data.userId || (data as any).meta?.userId || "usr_Paul";
  const nativeLanguage =
    data.nativeLanguage ||
    data.nativeLang ||
    data.course?.nativeLanguage ||
    "en-US";
  const targetLanguage =
    data.targetLanguage ||
    data.targetLang ||
    data.course?.targetLanguage ||
    "fr-FR";

  const [activeSession, setActiveSession] = useState<any>(null);
  const [isStarting, setIsStarting] = useState(false);

  const requiredChunks: string[] =
    freestyle?.requiredChunks || freestyle?.targetPhrases || [];

  const handleStartSimulation = async () => {
    setIsStarting(true);
    try {
      const seed = Math.random().toString(36).substring(7);
      const aiAvatarUrl =
        profile?.sprite?.avatarUrl ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&style=circle&top=longHair`;

      const freestyleData = {
        ...freestyle,
        nativeSentence: grammarContent?.nativeSentence,
        npcLine: visualContent?.npcLine,
      };

      const config = {
        userId,
        mode: freestyle?.mode || "roleplay",
        level: freestyle?.level || "beginner",
        topic: freestyle?.topic || "General Practice",
        nativeLanguage,
        targetLanguage,
        targetVoiceId: profile?.targetVoiceId || `${targetLanguage}-boy-01`,
        voiceGender: "female",
        freestyleData,
      };

      const [sessionRes, lkRes] = await Promise.all([
        fetch("/api/foundation/freestyle/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...config, aiAvatarUrl }),
        }),
        fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonId: data.id,
            nativeLanguage,
            targetLanguage,
            targetVoiceId: config.targetVoiceId,
            freestyleData,
          }),
        }),
      ]);

      const sessionData = sessionRes.ok ? await sessionRes.json() : {};
      const lkData = await lkRes.json();

      if (!lkRes.ok || !lkData.token) {
        throw new Error(lkData.error || "Failed to get LiveKit token");
      }

      setActiveSession({
        id: sessionData.sessionId || `lk-${Date.now()}`,
        ...config,
        aiAvatarUrl,
        livekitToken: lkData.token,
        livekitUrl: lkData.wsUrl,
      });
    } catch (error) {
      console.error("Failed to start session:", error);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="flex h-full flex-col justify-between overflow-y-auto p-6 sm:p-10 animate-in fade-in duration-500">
      {!activeSession ? (
        <>
          {/* 1. Header */}
          <div className="mb-6 text-center">
            <span className="inline-flex items-center gap-1.5 text-xs font-black tracking-widest text-blue-600 uppercase">
              <Sparkles className="h-3.5 w-3.5" />
              Final Mission • Live Roleplay
            </span>
            <h2 className="mt-1 text-2xl sm:text-4xl font-black tracking-tight text-slate-900">
              {freestyle?.topic || "Conversation Practice"}
            </h2>
            {freestyle?.persona && (
              <p className="mx-auto mt-1.5 max-w-xl text-sm sm:text-base font-medium text-slate-500">
                Partner: {freestyle.persona}
              </p>
            )}
          </div>

          {/* 2. 3D Pre-Launch Voice Arena Card */}
          <div className="my-auto flex flex-col items-center justify-center rounded-3xl border-2 border-b-[6px] border-slate-200 bg-gradient-to-b from-sky-50/50 via-white to-indigo-50/30 p-8 sm:p-10 text-center shadow-sm">
            {/* 3D Animated Mic Pedestal */}
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border-b-[5px] border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-xl shadow-blue-500/25">
              <Mic size={36} />
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              Live Voice Arena Ready
            </h3>

            {freestyle?.openingLine ? (
              <div className="mt-3 max-w-lg rounded-2xl bg-white px-5 py-3.5 shadow-2xs ring-1 ring-slate-200/80">
                <p className="text-[10px] font-black tracking-widest text-blue-600 uppercase">
                  Opening Line
                </p>
                <p className="mt-0.5 text-base sm:text-lg font-bold text-slate-800">
                  &ldquo;{freestyle.openingLine}&rdquo;
                </p>
              </div>
            ) : (
              <p className="mt-2 max-w-md text-sm sm:text-base font-medium text-slate-500">
                Enter the real-time voice room with your AI partner and use your
                new phrases in conversation.
              </p>
            )}

            {/* Required Chunks Preview */}
            {requiredChunks.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-black tracking-wider text-slate-400 uppercase mr-1">
                  <Target className="h-3.5 w-3.5 text-amber-500" />
                  Mission Targets:
                </span>
                {requiredChunks.map((chunk, idx) => (
                  <span
                    key={idx}
                    className="rounded-xl border-2 border-b-[3px] border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-900"
                  >
                    {chunk}
                  </span>
                ))}
              </div>
            )}

            {/* 3D Launch Button */}
            <button
              type="button"
              onClick={handleStartSimulation}
              disabled={isStarting}
              className="mt-8 inline-flex w-full sm:w-auto items-center justify-center gap-3 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-10 py-4 text-base sm:text-lg font-black text-white shadow-xl shadow-blue-500/25 transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0 disabled:opacity-50"
            >
              {isStarting ? (
                <>
                  <Loader2 className="animate-spin" size={22} />
                  <span>Joining Live Room...</span>
                </>
              ) : (
                <>
                  <Play size={20} className="fill-current" />
                  <span>Start Live Conversation</span>
                </>
              )}
            </button>
          </div>

          {/* 3. Footer Skip Button */}
          <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onNext}
              className="inline-flex items-center gap-2 rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-white px-6 py-3 text-sm font-black text-slate-600 transition-all hover:-translate-y-0.5 hover:text-slate-900 active:translate-y-0.5 active:border-b-2"
            >
              <span>Skip Live Roleplay</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col animate-in fade-in zoom-in-95 duration-300">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl border-b-2 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white">
                <UserCheck className="h-4 w-4" />
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                {freestyle?.topic || "Live Conversation"}
              </h2>
            </div>
          </div>

          <FoundationChat session={activeSession} onEnd={onNext} />
        </div>
      )}
    </div>
  );
}