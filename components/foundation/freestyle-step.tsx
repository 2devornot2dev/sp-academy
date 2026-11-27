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
import { getLockedVoiceId } from "@/lib/sprites/voices";

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
  const spriteSlug =
    profile?.sprite?.slug || partnerName.toLowerCase() || "vox";
  const isFemaleSprite = spriteSlug === "vivi" || spriteSlug === "deva";
  const voiceGender: "male" | "female" = isFemaleSprite ? "female" : "male";

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

  // Filter out 1-word fragments that are already substrings of another phrase (e.g. "reste" inside "on reste dedans")
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

    const cleaned = raw
      .map((c) => (typeof c === "string" ? c.split("=")[0].trim() : ""))
      .filter(Boolean);

    // Deduplicate case-insensitively
    const unique: string[] = [];
    const seen = new Set<string>();
    for (const c of cleaned) {
      const low = c.toLowerCase();
      if (!seen.has(low)) {
        seen.add(low);
        unique.push(c);
      }
    }

    // Drop any 1-word token that already appears inside a multi-word chunk
    const multiWordChunks = unique.filter(
      (c) => c.split(/\s+/).filter(Boolean).length >= 2,
    );

    let filtered = unique.filter((c) => {
      const words = c.split(/\s+/).filter(Boolean);
      if (words.length > 1) return true;
      const wordLow = c.toLowerCase().replace(/[.,!?;:]/g, "");
      const isSubstringOfMulti = multiWordChunks.some((m) =>
        m
          .toLowerCase()
          .replace(/[.,!?;:]/g, "")
          .split(/\s+/)
          .includes(wordLow),
      );
      return !isSubstringOfMulti;
    });

    const fullSentenceGoal = validReply || anchorSentence;
    const allSingleWords =
      filtered.length > 0 &&
      filtered.every((c) => c.trim().split(/\s+/).length === 1);

    if (
      (allSingleWords || filtered.length < 2) &&
      fullSentenceGoal &&
      !filtered.some(
        (c) => c.toLowerCase() === fullSentenceGoal.toLowerCase(),
      )
    ) {
      filtered = [...filtered.slice(0, 2), fullSentenceGoal];
    }

    return filtered.slice(0, 3);
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

  const targetOpenerLine =
    freestyle?.aiOpeningTarget || visualContent?.npcLine || "";
  const nativeBriefingLine = freestyle?.openingLine || "";

  const handlePlayPreview = (text?: string, lang = targetLanguage) => {
    if (!text || isTtsPlaying) return;
    void speak(text, lang, 0.95, voiceGender);
  };

  const handleStartSimulation = async () => {
    setIsStarting(true);
    try {
      const aiAvatarUrl =
        avatarSrc || profile?.sprite?.avatarUrl || "/sprite-m.png";

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

      const targetVoiceId =
        profile?.targetVoiceId || getLockedVoiceId(spriteSlug, targetLanguage);

      const config = {
        userId,
        mode: freestyle?.mode || "FOCUSED",
        level: freestyle?.level || "ZERO",
        topic: freestyle?.topic || lessonHandoff?.theme || "Roleplay Mission",
        nativeLanguage,
        targetLanguage,
        targetVoiceId,
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
    <div className="flex h-full flex-col justify-between overflow-y-auto p-4 sm:p-10 animate-in fade-in duration-500">
      {!activeSession ? (
        <>
          {/* 1. Header */}
          <div className="mb-4 text-center">
            <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-black tracking-widest text-blue-600 uppercase">
              <Sparkles className="h-3.5 w-3.5" />
              Final Mission • 3-Turn Roleplay with {partnerName}
            </span>
            <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900 sm:text-4xl">
              {freestyle?.topic ||
                lessonHandoff?.theme ||
                "Live Roleplay Mission"}
            </h2>
            <p className="mx-auto mt-1 max-w-xl text-xs font-semibold text-slate-500 sm:text-sm">
              {freestyle?.persona
                ? `${partnerName} is stepping into character as: ${freestyle.persona}`
                : `Complete 3 quick spoken turns with ${partnerName} using today's phrases!`}
            </p>
          </div>

          {/* 2. 3D Pre-Launch Roleplay Card */}
          <div className="my-auto flex flex-col items-center justify-center rounded-3xl border-2 border-b-[6px] border-slate-200 border-b-slate-300 bg-gradient-to-b from-sky-50/50 via-white to-indigo-50/30 p-5 text-center shadow-sm sm:p-9">
            <div className="relative mb-4">
              <div className="h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-[1.75rem] sm:rounded-[2rem] border-2 border-b-[6px] border-sky-400 border-b-blue-800 bg-slate-900 shadow-xl">
                <img
                  src={avatarSrc || "/sprite-m.png"}
                  alt={partnerName}
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-b-2 border-emerald-800 bg-emerald-400 px-3 py-0.5 text-[10px] font-black tracking-wider text-slate-950 uppercase shadow">
                {partnerName} Ready
              </span>
            </div>

            {targetOpenerLine || nativeBriefingLine ? (
              <div className="mt-2 max-w-lg rounded-2xl border-2 border-sky-100 bg-white px-4 py-3 sm:px-5 sm:py-3.5 shadow-2xs">
                <div className="flex items-center justify-center gap-2">
                  <p className="text-[10px] font-black tracking-widest text-blue-600 uppercase">
                    {targetOpenerLine
                      ? `${partnerName}'s Opening Line`
                      : "Mission Briefing"}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      targetOpenerLine
                        ? handlePlayPreview(targetOpenerLine, targetLanguage)
                        : handlePlayPreview(nativeBriefingLine, nativeLanguage)
                    }
                    className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-0.5 text-[10px] font-black text-blue-600 hover:bg-sky-100"
                  >
                    <Volume2 size={11} />
                    <span>Hear</span>
                  </button>
                </div>
                <p className="mt-1 text-sm font-black text-slate-900 sm:text-lg">
                  &ldquo;{targetOpenerLine || nativeBriefingLine}&rdquo;
                </p>
                {targetOpenerLine && nativeBriefingLine && (
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {nativeBriefingLine}
                  </p>
                )}
              </div>
            ) : null}

            {/* Tap-to-Hear Required Chunks Preview */}
            {requiredChunks.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <span className="mr-1 inline-flex items-center gap-1 text-[11px] font-black tracking-wider text-slate-400 uppercase">
                  <Target className="h-3.5 w-3.5 text-amber-500" />
                  Say These + 3 Turns:
                </span>
                {requiredChunks.map((chunk, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePlayPreview(chunk, targetLanguage)}
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
              className="mt-5 sm:mt-7 inline-flex w-full items-center justify-center gap-2.5 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-8 py-3.5 sm:px-10 sm:py-4 text-sm font-black text-white shadow-xl shadow-blue-500/25 transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0 disabled:opacity-50 sm:w-auto sm:text-lg"
            >
              {isStarting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Starting Roleplay with {partnerName}...</span>
                </>
              ) : (
                <>
                  <Play size={18} className="fill-current" />
                  <span>Start 3-Turn Roleplay with {partnerName}</span>
                </>
              )}
            </button>
          </div>

          {/* 3. Sticky Footer Skip Button */}
          <div className="sticky bottom-0 z-20 -mx-4 -mb-4 mt-4 flex justify-end border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur-md sm:static sm:mx-0 sm:mb-0 sm:mt-5 sm:bg-transparent sm:px-0 sm:pt-4 sm:pb-0">
            <button
              type="button"
              onClick={onNext}
              className="inline-flex items-center gap-2 rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-white px-5 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-black text-slate-600 transition-all hover:-translate-y-0.5 hover:text-slate-900 active:translate-y-0.5 active:border-b-2"
            >
              <span>Skip Roleplay</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col animate-in fade-in zoom-in-95 duration-300">
          <div className="mb-2.5 flex shrink-0 items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-xl border-2 border-b-[3px] border-sky-400 bg-slate-900">
                <img
                  src={avatarSrc || "/sprite-m.png"}
                  alt={partnerName}
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <h2 className="truncate text-sm font-black text-slate-900 sm:text-lg">
                {freestyle?.topic ||
                  lessonHandoff?.theme ||
                  `Roleplay with ${partnerName}`}
              </h2>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] sm:text-[11px] font-black text-emerald-700 ring-1 ring-emerald-200">
              3 turns + phrases
            </span>
          </div>

          <FoundationChat session={activeSession} onEnd={onNext} />
        </div>
      )}
    </div>
  );
}