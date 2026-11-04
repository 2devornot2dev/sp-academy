"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ArrowRight,
  Play,
  Square,
  Loader2,
  Volume2,
  Sparkles,
} from "lucide-react";
import { useS3Media } from "@/context/s3-context";
import { useWordAudio } from "@/context/word-audio-context";
import { getPresignedUrls } from "@/app/actions/s3";

export function BridgeSceneStep({
  data,
  onNext,
}: {
  data: any;
  onNext: () => void;
}) {
  const { stopAudio } = useWordAudio();

  const audioKey: string | undefined =
    data.npcAudioS3Key ||
    data.npcAudio ||
    data.bridgeAssets?.npcAudioS3Key ||
    undefined;

  const { urls } = useS3Media([
    data.imageS3Key || "",
    data.videoS3Key || "",
  ]);
  const imageUrl = urls?.[0] || undefined;
  const videoUrl = data.videoS3Key ? urls?.[1] || undefined : undefined;

  // Support both npcLineNative (from bridgeSceneSchema) and nativeNpcLine fallback
  const npcNativeLine: string | undefined =
    data.npcLineNative || data.nativeNpcLine || undefined;

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [hasListenedOnce, setHasListenedOnce] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  const toggleAudio = async () => {
    if (isPlayingAudio) {
      audioRef.current?.pause();
      setIsPlayingAudio(false);
      return;
    }

    setAudioError(null);

    if (!audioKey) {
      setHasListenedOnce(true);
      setAudioError("No audio key on this bridge.");
      return;
    }

    setIsFetching(true);
    let url = "";
    try {
      const res = await getPresignedUrls([audioKey]);
      url = res[audioKey] || "";
    } catch (e: any) {
      setAudioError(`Signing threw: ${e?.message ?? e}`);
      setIsFetching(false);
      return;
    }
    setIsFetching(false);

    if (!url) {
      setAudioError(`Could not sign URL for: ${audioKey}`);
      return;
    }

    stopAudio();
    audioRef.current?.pause();

    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => {
      setIsPlayingAudio(false);
      setHasListenedOnce(true);
    };
    audio.onerror = () => {
      setAudioError(`Audio failed to load.`);
      setIsPlayingAudio(false);
      setHasListenedOnce(true);
    };
    try {
      await audio.play();
      setIsPlayingAudio(true);
      setHasListenedOnce(true);
    } catch (e: any) {
      setAudioError(`Playback blocked: ${e?.message ?? e}`);
      setIsPlayingAudio(false);
    }
  };

  const handleNext = () => {
    audioRef.current?.pause();
    onNext();
  };

  return (
    <div className="flex h-full flex-col justify-between p-6 sm:p-10 animate-in fade-in duration-500">
      {/* 1. Header */}
      <div className="mb-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
          Scene Context
        </h2>
        <p className="mt-1.5 text-sm sm:text-base font-medium text-slate-500">
          Listen to the NPC line in context before reviewing the key vocabulary.
        </p>
      </div>

      {/* 2. 16:9 Cinema Stage + Floating NPC Dialogue Dock */}
      <div className="relative my-auto flex aspect-[16/10] sm:aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-3xl bg-slate-900 shadow-xl ring-1 ring-slate-200/80">
        {videoUrl ? (
          <video
            src={videoUrl}
            poster={imageUrl}
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-cover"
          />
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={data.altText ?? "Scene Context"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full animate-pulse bg-slate-800" />
        )}

        {/* Bottom Scrim */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        {/* Floating 3D NPC Dialogue Dock */}
        <div
          className={`absolute inset-x-3 bottom-3 sm:inset-x-6 sm:bottom-5 rounded-2xl p-4 sm:p-5 transition-all duration-300 ${
            isPlayingAudio
              ? "bg-white/98 shadow-2xl ring-2 ring-sky-400"
              : "bg-white/90 hover:bg-white/96 shadow-xl backdrop-blur-md"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              {/* 3D Tactile Play Button */}
              <button
                type="button"
                onClick={toggleAudio}
                disabled={isFetching}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-b-4 transition-all active:translate-y-0.5 active:border-b-0 disabled:opacity-40 ${
                  isPlayingAudio
                    ? "border-rose-700 bg-gradient-to-b from-rose-400 to-rose-600 text-white shadow-md shadow-rose-500/25"
                    : "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-md shadow-blue-500/25 hover:-translate-y-0.5"
                }`}
                title={isPlayingAudio ? "Stop Audio" : "Listen to NPC"}
              >
                {isFetching ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : isPlayingAudio ? (
                  <Square size={18} className="fill-current" />
                ) : (
                  <Play size={20} className="ml-0.5 fill-current" />
                )}
              </button>

              {/* NPC Target Line + Native Translation */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-sky-100 px-2 py-0.5 text-[10px] font-black tracking-wider text-blue-800 uppercase">
                    <Volume2 className="h-3 w-3" />
                    Scene Dialogue
                  </span>
                  {hasListenedOnce && (
                    <span className="text-[10px] font-extrabold text-emerald-600">
                      • Heard ✓
                    </span>
                  )}
                </div>

                <p className="mt-1 text-base sm:text-xl font-black leading-snug text-slate-900">
                  &ldquo;{data.npcLine}&rdquo;
                </p>

                {/* Native Translation (npcLineNative) */}
                {npcNativeLine && showTranslation && (
                  <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-500">
                    {npcNativeLine}
                  </p>
                )}

                {audioError && (
                  <p className="mt-1.5 break-all text-xs font-semibold text-rose-600">
                    {audioError}
                  </p>
                )}
              </div>
            </div>

            {/* Show / Hide English Toggle (if npcLineNative is present) */}
            {npcNativeLine && (
              <button
                type="button"
                onClick={() => setShowTranslation((prev) => !prev)}
                className="shrink-0 rounded-xl border-b-2 border-slate-300 bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold text-slate-600 transition hover:bg-slate-200 active:translate-y-0.5 active:border-b-0"
              >
                {showTranslation ? "Hide EN" : "Show EN"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Footer 3D CTA Button */}
      <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-100 pt-5">
        <p className="hidden sm:block text-xs font-bold text-slate-400">
          {hasListenedOnce
            ? "Great! Continue to unlock the scene's core vocabulary."
            : "Tip: Tap the blue play button to hear the native speaker first."}
        </p>

        <button
          type="button"
          onClick={handleNext}
          className={`ml-auto inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-2xl border-b-4 px-10 py-4 text-base font-black text-white transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0 ${
            hasListenedOnce
              ? "border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/25"
              : "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 shadow-lg shadow-blue-500/25"
          }`}
        >
          <span>Next: Learn Vocab</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}