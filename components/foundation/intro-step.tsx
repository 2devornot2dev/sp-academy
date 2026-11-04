"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Square,
  ArrowRight,
  Loader2,
  Sparkles,
  Volume2,
  Target,
} from "lucide-react";
import { useS3Media } from "@/context/s3-context";
import { FLAG_MAP } from "@/lib/types";
import { useSpeakWord } from "@/components/foundation/word-tap";

function getLangMeta(
  codeOrName: string | undefined,
  fallbackFlag: string,
  fallbackLabel: string
) {
  if (!codeOrName) return { flag: fallbackFlag, label: fallbackLabel };
  if (FLAG_MAP[codeOrName]) return FLAG_MAP[codeOrName];
  const found = Object.entries(FLAG_MAP).find(
    ([k, v]) =>
      k.toLowerCase().startsWith(codeOrName.toLowerCase().slice(0, 2)) ||
      v.label.toLowerCase() === codeOrName.toLowerCase()
  );
  return found ? found[1] : { flag: fallbackFlag, label: codeOrName };
}

export function IntroStep({
  data,
  onNext,
  spriteGender = "male",
}: {
  data: any;
  onNext: () => void;
  spriteGender?: "male" | "female";
}) {
  const speak = useSpeakWord();
  const handoff = data.lessonHandoff || {};

  const chunks = handoff.chunks || [];
  const targetSentence = handoff.targetSentence || "";
  const freestyleTopic = handoff.freestyleTopic || "";
  const introNative = handoff.introNative || "";
  const introTarget = handoff.introTarget || "";
  const introNativeAudio = handoff.introNativeAudio || "";
  const introTargetAudio = handoff.introTargetAudio || "";

  const isVivi =
    spriteGender === "female" || data?.user?.gender === "female";
  const spriteName = isVivi ? "Vivi" : "Vox";
  const spriteSrc =
    data?.user?.spriteUrl || (isVivi ? "/sprite-f.png" : "/sprite-m.png");

  const nativeMeta = getLangMeta(
    data?.nativeLanguage || handoff?.nativeLanguage,
    "🇺🇸",
    "Native Briefing"
  );
  const targetMeta = getLangMeta(
    data?.targetLanguage || handoff?.targetLanguage,
    "🇫🇷",
    "Target Intro"
  );

  const { urls, isLoading } = useS3Media([introNativeAudio, introTargetAudio]);
  const [nativeUrl, targetUrl] = urls;

  const [activeAudio, setActiveAudio] = useState<"native" | "target" | null>(
    null
  );
  const [displayedTranscript, setDisplayedTranscript] = useState<
    "native" | "target" | null
  >("native");

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  const toggleAudio = (type: "native" | "target") => {
    setDisplayedTranscript(type);

    if (activeAudio === type) {
      audioRef.current?.pause();
      setActiveAudio(null);
      return;
    }

    const resolvedUrl = type === "native" ? nativeUrl : targetUrl;
    if (!resolvedUrl) return;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(resolvedUrl);
    audioRef.current = audio;
    audio.onended = () => setActiveAudio(null);

    audio.play().catch((err) => {
      console.warn("Audio playback skipped:", err);
      setActiveAudio(null);
    });

    setActiveAudio(type);
  };

  const handleStart = () => {
    if (audioRef.current) audioRef.current.pause();
    onNext();
  };

  const isSpeaking = activeAudio !== null;

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col justify-between overflow-y-auto p-6 sm:p-10 animate-in fade-in duration-500">
      {/* 1. Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-black tracking-widest text-blue-600 uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            Mission Briefing with {spriteName}
          </span>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Lesson Overview
          </h1>
        </div>
      </div>

      {/* 2. SPRITE STAGE + 3D AUDIO BRIEFING BUBBLE */}
      <div className="relative mb-6 overflow-hidden rounded-3xl border-2 border-slate-200/80 bg-gradient-to-br from-sky-50/50 via-white to-indigo-50/40 p-6 shadow-xs sm:p-7">
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center">
          {/* LEFT: 3D Sprite Avatar Pedestal */}
          <div className="flex shrink-0 flex-col items-center">
            <div className="relative">
              {isSpeaking && (
                <span className="absolute -inset-2 animate-pulse rounded-3xl bg-gradient-to-tr from-sky-400 via-blue-500 to-indigo-500 opacity-35 blur-md" />
              )}

              <motion.div
                animate={
                  isSpeaking
                    ? { y: [0, -4, 0], scale: [1, 1.03, 1] }
                    : { y: 0, scale: 1 }
                }
                transition={{
                  repeat: isSpeaking ? Infinity : 0,
                  duration: 1.4,
                  ease: "easeInOut",
                }}
                className="relative h-28 w-28 overflow-hidden rounded-3xl border-2 border-b-[5px] border-blue-200 bg-gradient-to-b from-sky-100/80 to-white shadow-lg md:h-32 md:w-32"
              >
                <img
                  src={spriteSrc}
                  alt={spriteName}
                  className="h-full w-full object-cover object-top"
                />
              </motion.div>

              <div className="absolute -bottom-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border-b-2 border-slate-950 bg-slate-900 px-3 py-0.5 text-[11px] font-black tracking-wider text-white uppercase shadow">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isSpeaking ? "animate-ping bg-emerald-400" : "bg-sky-400"
                  }`}
                />
                {spriteName}
              </div>
            </div>
          </div>

          {/* RIGHT: Combined Speech Bubble with 3D Audio Buttons */}
          <div
            className={`flex-1 rounded-3xl border-2 p-5 transition-all duration-300 ${
              activeAudio === "native"
                ? "border-sky-400 bg-white shadow-md ring-2 ring-sky-400/20"
                : activeAudio === "target"
                  ? "border-indigo-500 bg-indigo-50/40 shadow-md ring-2 ring-indigo-500/20"
                  : "border-slate-200/90 bg-white/95 shadow-2xs"
            }`}
          >
            {/* Top 3D Audio Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Native Briefing 3D Button */}
              <button
                type="button"
                disabled={isLoading || !nativeUrl}
                onClick={() => toggleAudio("native")}
                className={`inline-flex items-center gap-2 rounded-xl border-b-[3px] px-4 py-2 text-xs font-black transition-all active:translate-y-0.5 active:border-b-0 disabled:opacity-40 ${
                  activeAudio === "native"
                    ? "border-rose-700 bg-gradient-to-b from-rose-400 to-rose-600 text-white shadow-sm"
                    : displayedTranscript === "native"
                      ? "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-sm"
                      : "border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <span className="text-sm leading-none">{nativeMeta.flag}</span>
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : activeAudio === "native" ? (
                  <>
                    <Square className="h-3 w-3 fill-current" />
                    <span>Stop Briefing</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>Play Briefing</span>
                  </>
                )}
              </button>

              {/* Target Intro 3D Button */}
              <button
                type="button"
                disabled={isLoading || !targetUrl}
                onClick={() => toggleAudio("target")}
                className={`inline-flex items-center gap-2 rounded-xl border-b-[3px] px-4 py-2 text-xs font-black transition-all active:translate-y-0.5 active:border-b-0 disabled:opacity-40 ${
                  activeAudio === "target"
                    ? "border-rose-700 bg-gradient-to-b from-rose-400 to-rose-600 text-white shadow-sm"
                    : displayedTranscript === "target"
                      ? "border-indigo-800 bg-gradient-to-b from-indigo-500 to-violet-600 text-white shadow-sm"
                      : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                }`}
              >
                <span className="text-sm leading-none">{targetMeta.flag}</span>
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : activeAudio === "target" ? (
                  <>
                    <Square className="h-3 w-3 fill-current" />
                    <span>Stop Target</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 fill-current" />
                    <span>Listen in Target</span>
                  </>
                )}
              </button>
            </div>

            {/* Transcript Display */}
            <div className="mt-4 border-t border-slate-100 pt-3.5">
              <AnimatePresence mode="wait">
                {displayedTranscript === "target" && introTarget ? (
                  <motion.p
                    key="target-transcript"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="text-base leading-relaxed font-bold text-indigo-950"
                  >
                    {introTarget}
                  </motion.p>
                ) : (
                  <motion.p
                    key="native-transcript"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="text-base leading-relaxed font-semibold text-slate-700"
                  >
                    {introNative ||
                      `Tap a button above to hear ${spriteName}'s briefing.`}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN TARGET SENTENCE (Tap to Hear!) */}
      <button
        type="button"
        onClick={() => targetSentence && speak(targetSentence, { each: true })}
        className="group mb-6 w-full rounded-3xl border-2 border-b-[5px] border-sky-200 bg-gradient-to-b from-sky-50/60 to-white p-6 text-center shadow-2xs transition-all hover:-translate-y-0.5 hover:border-sky-400 active:translate-y-0.5 active:border-b-2"
      >
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-0.5 text-[10px] font-black tracking-widest text-blue-700 uppercase">
          <Volume2 className="h-3 w-3" />
          <span>Main Target Sentence • Tap to Listen</span>
        </div>
        <p className="text-2xl leading-snug font-black text-slate-900 sm:text-3xl group-hover:text-blue-600 transition-colors">
          &ldquo;{targetSentence}&rdquo;
        </p>
      </button>

      {/* 4. VOCABULARY & CHUNKS TO MASTER */}
      {chunks.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-2.5 text-[11px] font-black tracking-widest text-slate-400 uppercase">
            Key Building Blocks in This Spoon
          </h3>
          <div className="flex flex-wrap gap-2">
            {chunks.map((chunk: string, idx: number) => (
              <span
                key={idx}
                className="rounded-xl border-2 border-b-[3px] border-slate-200 bg-white px-3.5 py-1.5 text-xs sm:text-sm font-bold text-slate-700 shadow-2xs"
              >
                {chunk}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 5. FOOTER */}
      <div className="mt-auto flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-5 sm:flex-row">
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-b-[3px] border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black tracking-widest text-blue-600 uppercase">
              Final Mission Goal
            </p>
            <p className="text-sm font-extrabold text-slate-900">
              Roleplay: {freestyleTopic}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleStart}
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-10 py-4 text-base font-black text-white shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0"
        >
          <span>Begin Scene Context</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}