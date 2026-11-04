"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Volume2,
  Square,
  Frown,
  Meh,
  Smile,
  Loader2,
  BrainCircuit,
  ChevronRight,
  Sparkles,
  X,
  ArrowRight,
} from "lucide-react";
import { useS3Media } from "@/context/s3-context";
import { WordMatrix } from "./matrix/word-matrix";

type Feedback = "hard" | "ok" | "easy";

const FLAG_MAP: Record<string, { flag: string; label: string }> = {
  "en-US": { flag: "🇺🇸", label: "English" },
  "fr-FR": { flag: "🇫🇷", label: "Français" },
  "es-ES": { flag: "🇪🇸", label: "Español" },
  "de-DE": { flag: "🇩🇪", label: "Deutsch" },
  "it-IT": { flag: "🇮🇹", label: "Italiano" },
  "pt-BR": { flag: "🇧🇷", label: "Português" },
  "ja-JP": { flag: "🇯🇵", label: "日本語" },
  "ko-KR": { flag: "🇰🇷", label: "한국어" },
  "zh-CN": { flag: "🇨🇳", label: "中文" },
  "ru-RU": { flag: "🇷🇺", label: "Русский" },
  "ar-SA": { flag: "🇸🇦", label: "العربية" },
};

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

export function OutroStep({
  data,
  userId,
  targetLang = "fr-FR",
  spriteGender = "male",
  onFinish,
}: {
  data: any;
  userId: string;
  targetLang?: string;
  spriteGender?: "male" | "female";
  onFinish: (feedback: Feedback) => Promise<void>;
}) {
  const handoff = data.lessonHandoff || {};
  const { urls, isLoading } = useS3Media([
    handoff.outroNativeAudio,
    handoff.outroTargetAudio,
  ]);
  const [nativeUrl, targetUrl] = urls;

  const isVivi =
    spriteGender === "female" || data?.user?.gender === "female";
  const spriteName = isVivi ? "Vivi" : "Vox";
  const spriteSrc =
    data?.user?.spriteUrl || (isVivi ? "/sprite-f.png" : "/sprite-m.png");

  const nativeMeta = getLangMeta(
    data?.nativeLanguage || handoff?.nativeLanguage,
    "🇺🇸",
    "Native Debrief"
  );
  const targetMeta = getLangMeta(
    targetLang || data?.targetLanguage || handoff?.targetLanguage,
    "🇫🇷",
    "Target Debrief"
  );

  const [activeAudio, setActiveAudio] = useState<"native" | "target" | null>(
    null
  );
  const [displayedTranscript, setDisplayedTranscript] = useState<
    "native" | "target" | null
  >("native");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const [isFinishing, setIsFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [matrixStats, setMatrixStats] = useState({
    totalWords: 0,
    avgMastery: 0,
    topWords: [] as any[],
  });
  const [isMatrixLoading, setIsMatrixLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch(`/api/users/${userId}/matrix/${targetLang}`);
        if (res.ok) {
          const { words } = await res.json();
          if (words && words.length > 0) {
            const sorted = words.sort(
              (a: any, b: any) => b.masteryScore - a.masteryScore
            );
            const avg = Math.round(
              words.reduce((acc: number, w: any) => acc + w.masteryScore, 0) /
                words.length
            );
            setMatrixStats({
              totalWords: words.length,
              avgMastery: avg,
              topWords: sorted.slice(0, 5),
            });
          }
        }
      } catch (e) {
        console.error("Failed to load mini matrix:", e);
      } finally {
        setIsMatrixLoading(false);
      }
    };
    fetchSummary();
  }, [userId, targetLang]);

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
    if (audioRef.current) audioRef.current.pause();

    const audio = new Audio(resolvedUrl);
    audioRef.current = audio;
    audio.onended = () => setActiveAudio(null);
    audio.play().catch(() => setActiveAudio(null));
    setActiveAudio(type);
  };

  const handleFinish = async () => {
    if (isFinishing || !feedback) return;
    audioRef.current?.pause();
    setIsFinishing(true);
    setFinishError(null);
    try {
      await onFinish(feedback);
    } catch (e) {
      setFinishError(e instanceof Error ? e.message : "Something went wrong");
      setIsFinishing(false);
    }
  };

  const isSpeaking = activeAudio !== null;

  return (
    <>
      <div className="mx-auto flex h-full max-w-4xl flex-col justify-between overflow-y-auto p-6 md:p-8 animate-in fade-in duration-500">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between shrink-0">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-black tracking-widest text-emerald-600 uppercase">
              <Sparkles className="h-3.5 w-3.5" />
              Mission Debrief with {spriteName}
            </span>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
              Mission Accomplished!
            </h1>
          </div>
        </div>

        {/* SPRITE + VECTOR STAGE + 3D DEBRIEF BUBBLE */}
        <div className="relative mb-8 overflow-hidden rounded-3xl border-2 border-slate-200/80 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/40 p-6 shadow-sm md:p-7 shrink-0">
          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center">
            {/* LEFT: 3D Sprite Avatar Pedestal */}
            <div className="flex shrink-0 flex-col items-center">
              <div className="relative">
                {isSpeaking && (
                  <span className="absolute -inset-2 animate-pulse rounded-3xl bg-gradient-to-tr from-emerald-400 via-teal-500 to-sky-500 opacity-35 blur-md" />
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
                  className="relative h-28 w-28 overflow-hidden rounded-3xl border-2 border-b-[5px] border-emerald-200 bg-gradient-to-b from-emerald-100/80 to-white shadow-lg md:h-32 md:w-32"
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
                      isSpeaking ? "animate-ping bg-emerald-400" : "bg-teal-400"
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
                  ? "border-emerald-400 bg-white shadow-md ring-2 ring-emerald-400/20"
                  : activeAudio === "target"
                    ? "border-teal-500 bg-teal-50/40 shadow-md ring-2 ring-teal-500/20"
                    : "border-slate-200/90 bg-white/95 shadow-2xs"
              }`}
            >
              {/* Top Controls Row */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Native Play Button */}
                <button
                  type="button"
                  disabled={isLoading || !nativeUrl}
                  onClick={() => toggleAudio("native")}
                  className={`inline-flex items-center gap-2 rounded-xl border-b-[3px] px-4 py-2 text-xs font-black transition-all active:translate-y-0.5 active:border-b-0 disabled:opacity-40 ${
                    activeAudio === "native"
                      ? "border-rose-700 bg-gradient-to-b from-rose-400 to-rose-600 text-white shadow-sm"
                      : displayedTranscript === "native"
                        ? "border-emerald-800 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-sm"
                        : "border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <span className="text-sm leading-none">{nativeMeta.flag}</span>
                  {isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : activeAudio === "native" ? (
                    <>
                      <Square className="h-3 w-3 fill-current" />
                      <span>Stop Debrief</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-3.5 w-3.5" />
                      <span>Play Debrief</span>
                    </>
                  )}
                </button>

                {/* Target Play Button */}
                <button
                  type="button"
                  disabled={isLoading || !targetUrl}
                  onClick={() => toggleAudio("target")}
                  className={`inline-flex items-center gap-2 rounded-xl border-b-[3px] px-4 py-2 text-xs font-black transition-all active:translate-y-0.5 active:border-b-0 disabled:opacity-40 ${
                    activeAudio === "target"
                      ? "border-rose-700 bg-gradient-to-b from-rose-400 to-rose-600 text-white shadow-sm"
                      : displayedTranscript === "target"
                        ? "border-teal-800 bg-gradient-to-b from-teal-500 to-emerald-600 text-white shadow-sm"
                        : "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100"
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
                  {displayedTranscript === "target" && handoff.outroTarget ? (
                    <motion.p
                      key="target-transcript"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2 }}
                      className="text-base leading-relaxed font-bold text-teal-950"
                    >
                      {handoff.outroTarget}
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
                      {handoff.outroNative ||
                        `Tap a button above to hear ${spriteName}'s mission debrief.`}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* 🧠 MINI MATRIX DASHBOARD */}
        <div className="mb-6 shrink-0">
          <div className="group relative overflow-hidden rounded-3xl bg-slate-900 p-1 shadow-lg">
            <div className="relative z-10 flex flex-col items-center justify-between gap-6 rounded-[22px] bg-slate-900 p-5 sm:flex-row sm:p-6">
              <div className="w-full flex-1 text-center sm:text-left">
                <div className="mb-3 flex items-center justify-center gap-2 text-xs font-bold tracking-widest text-sky-400 uppercase sm:justify-start">
                  <BrainCircuit size={16} /> Matrix Synced
                </div>

                {isMatrixLoading ? (
                  <div className="flex h-8 items-center justify-center gap-2 text-slate-400 sm:justify-start">
                    <Loader2 size={18} className="animate-spin" /> Compiling
                    stats...
                  </div>
                ) : (
                  <>
                    <h3 className="mb-3 text-2xl font-extrabold text-white">
                      {matrixStats.totalWords} Words Tracked
                    </h3>

                    <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                      {matrixStats.topWords.map((w, idx) => (
                        <span
                          key={idx}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200"
                        >
                          {w.word}
                        </span>
                      ))}
                      {matrixStats.totalWords > 5 && (
                        <span className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-400">
                          +{matrixStats.totalWords - 5} more
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                disabled={isMatrixLoading}
                className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-slate-900 transition-all hover:bg-slate-100 active:scale-95 disabled:opacity-50 sm:w-auto"
              >
                <span>View Details</span>
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-r from-sky-600/20 to-emerald-600/20 opacity-50 blur-xl transition-opacity group-hover:opacity-100" />
          </div>
        </div>

        {/* Feedback Footer & 3D Complete Button */}
        <div className="mt-auto border-t border-slate-100 pt-6 text-center">
          <h3 className="mb-4 text-sm font-black tracking-wider text-slate-900 uppercase">
            How was today&apos;s Spoon?
          </h3>

          <div className="mb-6 flex justify-center gap-4 sm:gap-6">
            <button
              onClick={() => setFeedback("hard")}
              disabled={isFinishing}
              className={`flex flex-col items-center gap-2 rounded-2xl p-3 transition-all ${
                feedback === "hard"
                  ? "scale-110 border-b-4 border-rose-600 bg-rose-100 text-rose-700 shadow-md"
                  : "bg-white text-slate-400 hover:scale-105 hover:bg-rose-50 hover:text-rose-500"
              }`}
            >
              <Frown size={36} />
              <span className="text-[10px] font-black tracking-widest uppercase sm:text-xs">
                Hard
              </span>
            </button>

            <button
              onClick={() => setFeedback("ok")}
              disabled={isFinishing}
              className={`flex flex-col items-center gap-2 rounded-2xl p-3 transition-all ${
                feedback === "ok"
                  ? "scale-110 border-b-4 border-blue-600 bg-blue-100 text-blue-700 shadow-md"
                  : "bg-white text-slate-400 hover:scale-105 hover:bg-blue-50 hover:text-blue-500"
              }`}
            >
              <Meh size={36} />
              <span className="text-[10px] font-black tracking-widest uppercase sm:text-xs">
                OK
              </span>
            </button>

            <button
              onClick={() => setFeedback("easy")}
              disabled={isFinishing}
              className={`flex flex-col items-center gap-2 rounded-2xl p-3 transition-all ${
                feedback === "easy"
                  ? "scale-110 border-b-4 border-emerald-600 bg-emerald-100 text-emerald-700 shadow-md"
                  : "bg-white text-slate-400 hover:scale-105 hover:bg-emerald-50 hover:text-emerald-500"
              }`}
            >
              <Smile size={36} />
              <span className="text-[10px] font-black tracking-widest uppercase sm:text-xs">
                Easy
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleFinish}
            disabled={!feedback || isFinishing}
            className={`inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border-b-4 px-10 py-4 text-base font-black transition-all ${
              feedback && !isFinishing
                ? "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-lg shadow-blue-500/25 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0"
                : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
            }`}
          >
            {isFinishing ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>Preparing your next step...</span>
              </>
            ) : (
              <>
                <span>Complete Lesson</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
          {finishError && (
            <p className="mt-3 text-sm font-semibold text-rose-600">
              {finishError}
            </p>
          )}
        </div>
      </div>

      {/* 🚀 FULL MATRIX SLIDE-OVER DRAWER */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsDrawerOpen(false)}
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 260 }}
              className="relative flex h-full w-full max-w-3xl flex-col bg-slate-50 shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/85 px-6 py-4 shadow-sm backdrop-blur-md">
                <div className="flex items-center gap-2 font-black text-slate-900">
                  <BrainCircuit className="text-sky-500" />
                  <h2>Detailed Neural Matrix</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <WordMatrix userId={userId} targetLang={targetLang} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}