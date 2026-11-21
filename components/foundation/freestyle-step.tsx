// components/foundation/freestyle-step.tsx
"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  Play,
  Loader2,
  Target,
  Sparkles,
  Volume2,
} from "lucide-react";
import FoundationChat from "./foundation-chat";
import { useSprite } from "@/context/sprite-context";
import { useSpeak } from "@/hooks/use-speak";

export function FreestyleStep({
  data,
  onNext,
}: {
  data: any;
  onNext: () => void;
}) {
  const { freestyle, grammarContent, visualContent, lessonHandoff } = data;
  const { profile, spriteName, avatarSrc } = useSprite();
  const { speak, isPlaying: isTtsPlaying } = useSpeak();

  const partnerName = spriteName || "Vox";
  const isVivi =
    profile?.sprite?.slug === "vivi" || partnerName.toLowerCase() === "vivi";
  const voiceGender: "male" | "female" = isVivi ? "female" : "male";

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

  // Build speakable mission targets (ensuring the learner isn't stuck with only 1-word fragments)
  const requiredChunks: string[] = useMemo(() => {
    const raw: string[] =
      freestyle?.requiredChunks ||
      freestyle?.targetPhrases ||
      lessonHandoff?.taughtChunks ||
      [];
    const anchorSentence: string | undefined =
      grammarContent?.targetSentence || lessonHandoff?.targetSentence;
    const validReply: string | undefined =
      visualContent?.constraint?.validReplies?.[0];

    const list = [...raw].filter(Boolean);
    const allSingleWords =
      list.length > 0 &&
      list.every((c) => c.trim().split(/\s+/).length === 1);

    // If all chunks are 1-word fragments, append the full speakable reply/sentence so they have a real sentence goal too
    const fullSentenceGoal = validReply || anchorSentence;
    if (
      allSingleWords &&
      fullSentenceGoal &&
      !list.some((c) => c.toLowerCase() === fullSentenceGoal.toLowerCase())
    ) {
      return [...list.slice(0, 2), fullSentenceGoal];
    }
    return list.slice(0, 3);
  }, [
    freestyle?.requiredChunks,
    freestyle?.targetPhrases,
    grammarContent?.targetSentence,
    lessonHandoff?.targetSentence,
    lessonHandoff?.taughtChunks,
    visualContent?.constraint?.validReplies,
  ]);

  const starterHintTarget =
    visualContent?.constraint?.validReplies?.[0] ||
    grammarContent?.targetSentence ||
    requiredChunks[0] ||
    "";

  const handlePlayPreview = (text?: string) => {
    if (!text || isTtsPlaying) return;
    void speak(text, targetLanguage, 0.95, voiceGender);
  };

  const handleStartSimulation = async () => {
    setIsStarting(true);
    try {
      const aiAvatarUrl =
        avatarSrc ||
        profile?.sprite?.avatarUrl ||
        "/sprite-m.png";

      const roleDescription = freestyle?.persona
        ? `${partnerName} roleplaying as ${freestyle.persona}`
        : `${partnerName}, your friendly roleplay partner`;

      const freestyleData = {
        ...freestyle,
        requiredChunks,
        persona: `${roleDescription}. Keep your replies short (1 concise sentence) and naturally prompt the learner to use their mission phrases (${requiredChunks.join(
          " / ",
        )}) over 3 quick back-and-forth turns!`,
        targetSentence: grammarContent?.targetSentence,
        nativeSentence: grammarContent?.nativeSentence,
        starterHintTarget,
        npcLine: visualContent?.npcLine,
      };

      const config = {
        userId,
        mode: freestyle?.mode || "FOCUSED",
        level: freestyle?.level || "ZERO",
        topic: freestyle?.topic || lessonHandoff?.theme || "Roleplay Mission",
        nativeLanguage,
        targetLanguage,
        targetVoiceId: `${targetLanguage}-${isVivi ? "girl-01" : "boy-01"}`,
        voiceGender,
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
            voiceGender,
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
          <div className="mb-5 text-center">
            <span className="inline-flex items-center gap-1.5 text-xs font-black tracking-widest text-blue-600 uppercase">
              <Sparkles className="h-3.5 w-3.5" />
              Final Mission • 3-Turn Roleplay with {partnerName}
            </span>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-4xl">
              {freestyle?.topic ||
                lessonHandoff?.theme ||
                "Live Roleplay Mission"}
            </h2>
            <p className="mx-auto mt-1.5 max-w-xl text-xs font-semibold text-slate-500 sm:text-sm">
              {freestyle?.persona
                ? `${partnerName} is stepping into character as: ${freestyle.persona}`
                : `Complete 3 quick spoken turns with ${partnerName} using today's phrases!`}
            </p>
          </div>

          {/* 2. 3D Pre-Launch Roleplay Card with Vox/Vivi */}
          <div className="my-auto flex flex-col items-center justify-center rounded-3xl border-2 border-b-[6px] border-slate-200 border-b-slate-300 bg-gradient-to-b from-sky-50/50 via-white to-indigo-50/30 p-7 text-center shadow-sm sm:p-9">
            {/* 3D Vox/Vivi Avatar Pedestal */}
            <div className="relative mb-5">
              <div className="h-24 w-24 overflow-hidden rounded-[2rem] border-2 border-b-[6px] border-sky-400 border-b-blue-800 bg-slate-900 shadow-xl">
                <img
                  src={avatarSrc || "/sprite-m.png"}
                  alt={partnerName}
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border-b-2 border-emerald-800 bg-emerald-400 px-3 py-0.5 text-[10px] font-black tracking-wider text-slate-950 uppercase shadow">
                {partnerName} Ready
              </span>
            </div>

            {freestyle?.openingLine || visualContent?.npcLine ? (
              <div className="mt-2 max-w-lg rounded-2xl border-2 border-sky-100 bg-white px-5 py-3.5 shadow-2xs">
                <div className="flex items-center justify-center gap-2">
                  <p className="text-[10px] font-black tracking-widest text-blue-600 uppercase">
                    {partnerName}&apos;s Opening Line
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      handlePlayPreview(
                        freestyle?.openingLine || visualContent?.npcLine,
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-0.5 text-[10px] font-black text-blue-600 hover:bg-sky-100"
                  >
                    <Volume2 size={11} />
                    <span>Hear</span>
                  </button>
                </div>
                <p className="mt-1 text-base font-black text-slate-900 sm:text-lg">
                  &ldquo;{freestyle?.openingLine || visualContent?.npcLine}&rdquo;
                </p>
              </div>
            ) : null}

            {/* Tap-to-Hear Required Chunks Preview */}
            {requiredChunks.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <span className="mr-1 inline-flex items-center gap-1 text-xs font-black tracking-wider text-slate-400 uppercase">
                  <Target className="h-3.5 w-3.5 text-amber-500" />
                  Say These + 3 Turns:
                </span>
                {requiredChunks.map((chunk, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePlayPreview(chunk)}
                    title="Tap to hear pronunciation"
                    className="inline-flex items-center gap-1.5 rounded-xl border-2 border-b-[3px] border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-900 transition hover:bg-amber-100/70 active:translate-y-0.5"
                  >
                    <span>{chunk}</span>
                    <Volume2 size={11} className="text-amber-600" />
                  </button>
                ))}
              </div>
            )}

            {/* 3D Launch Button */}
            <button
              type="button"
              onClick={handleStartSimulation}
              disabled={isStarting}
              className="mt-7 inline-flex w-full items-center justify-center gap-3 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-10 py-4 text-base font-black text-white shadow-xl shadow-blue-500/25 transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0 disabled:opacity-50 sm:w-auto sm:text-lg"
            >
              {isStarting ? (
                <>
                  <Loader2 className="animate-spin" size={22} />
                  <span>Starting Roleplay with {partnerName}...</span>
                </>
              ) : (
                <>
                  <Play size={20} className="fill-current" />
                  <span>Start 3-Turn Roleplay with {partnerName}</span>
                </>
              )}
            </button>
          </div>

          {/* 3. Footer Skip Button */}
          <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onNext}
              className="inline-flex items-center gap-2 rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-white px-6 py-3 text-sm font-black text-slate-600 transition-all hover:-translate-y-0.5 hover:text-slate-900 active:translate-y-0.5 active:border-b-2"
            >
              <span>Skip Roleplay</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col animate-in fade-in zoom-in-95 duration-300">
          <div className="mb-3 flex shrink-0 items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 overflow-hidden rounded-xl border-2 border-b-[3px] border-sky-400 bg-slate-900">
                <img
                  src={avatarSrc || "/sprite-m.png"}
                  alt={partnerName}
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 sm:text-lg">
                  {freestyle?.topic ||
                    lessonHandoff?.theme ||
                    `Roleplay with ${partnerName}`}
                </h2>
              </div>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-200">
              Auto-finishes at 3 turns + all phrases!
            </span>
          </div>

          <FoundationChat session={activeSession} onEnd={onNext} />
        </div>
      )}
    </div>
  );
}