"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  MapPin,
  Play,
  Square,
  Loader2,
  ArrowRight,
  User,
  Check,
  Volume2,
  Lock,
} from "lucide-react";
import { useS3Media } from "@/context/s3-context";
import { useMatrix } from "@/context/matrix-context";
import { useSpeakWord } from "@/components/foundation/word-tap";

export function VisualStep({
  data,
  onNext,
}: {
  data: any;
  onNext: () => void;
}) {
  const speak = useSpeakWord();
  const { urls, isLoading: isMediaLoading } = useS3Media([
    data.imageS3Key,
    data.npcAudioS3Key,
  ]);
  const [imageUrl, audioUrl] = urls;

  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [selectedReply, setSelectedReply] = useState<string | null>(null);

  const { trackInteraction } = useMatrix();

  const hasTrackedSeen = useRef(false);
  const hasTrackedHeard = useRef(false);

  // Support both nativeNpcLine (from VisualGen) and npcLineNative fallback
  const npcNativeLine: string | undefined =
    data.nativeNpcLine || data.npcLineNative || undefined;

  useEffect(() => {
    if (data.constraint?.requiredChunk && !hasTrackedSeen.current) {
      trackInteraction(data.constraint.requiredChunk, { seen: 1 });
      hasTrackedSeen.current = true;
    }
  }, [data.constraint?.requiredChunk, trackInteraction]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  const toggleAudio = () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }
    if (!audioUrl) return;

    if (data.constraint?.requiredChunk && !hasTrackedHeard.current) {
      trackInteraction(data.constraint.requiredChunk, { heard: 1 });
      hasTrackedHeard.current = true;
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.onended = () => setIsPlaying(false);
    audio.play().catch((e) => {
      console.warn("Audio playback skipped:", e);
      setIsPlaying(false);
    });
    setIsPlaying(true);
  };

  const handleSelectReply = (reply: string) => {
    setSelectedReply(reply);
    speak(reply, { each: true });
  };

  const handleNext = () => {
    if (audioRef.current) audioRef.current.pause();

    if (selectedReply && data.constraint?.requiredChunk) {
      trackInteraction(data.constraint.requiredChunk, { tappedCorrect: 1 });
    }

    onNext();
  };

  return (
    <div className="flex h-full flex-col justify-between overflow-y-auto p-6 sm:p-10 animate-in fade-in duration-500">
      {/* 1. Header & Scene Location Pill */}
      <div className="mb-5 shrink-0 space-y-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Setting the Scene
          </h2>
          <p className="mt-1 text-sm sm:text-base font-medium text-slate-500">
            Listen to the NPC and choose your response using the target chunk.
          </p>
        </div>

        {data.sceneDescription && (
          <div className="flex items-start gap-2.5 rounded-2xl bg-slate-50 px-4 py-3 text-slate-700 ring-1 ring-slate-200/80">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
            <p className="text-xs sm:text-sm font-semibold leading-snug">
              {data.sceneDescription}
            </p>
          </div>
        )}
      </div>

      {/* 2. 16:9 Scene Image & Floating 3D NPC Dialogue Dock */}
      <div className="relative mb-6 flex aspect-[16/10] sm:aspect-[16/9] w-full shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-slate-900 shadow-lg ring-1 ring-slate-200">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={data.altText}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {isMediaLoading ? (
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            ) : (
              <span className="text-sm font-semibold text-slate-400">
                Image not found
              </span>
            )}
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />

        {/* Floating 3D NPC Dialogue Dock */}
        <div
          className={`absolute inset-x-3 bottom-3 sm:inset-x-5 sm:bottom-4 rounded-2xl p-3.5 sm:p-4 transition-all duration-300 ${
            isPlaying
              ? "bg-white/98 shadow-2xl ring-2 ring-sky-400"
              : "bg-white/92 hover:bg-white/96 shadow-xl backdrop-blur-md"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3.5">
              {/* 3D Play Button */}
              <button
                type="button"
                onClick={toggleAudio}
                disabled={isMediaLoading || !audioUrl}
                className={`flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl border-b-4 transition-all active:translate-y-0.5 active:border-b-0 disabled:opacity-40 ${
                  isPlaying
                    ? "border-rose-700 bg-gradient-to-b from-rose-400 to-rose-600 text-white shadow-md"
                    : "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-md hover:-translate-y-0.5"
                }`}
              >
                {isMediaLoading && audioUrl === undefined ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : isPlaying ? (
                  <Square size={16} className="fill-current" />
                ) : (
                  <Play size={18} className="ml-0.5 fill-current" />
                )}
              </button>

              <div className="min-w-0 flex-1">
                <span className="inline-flex items-center gap-1 rounded-md bg-sky-100 px-2 py-0.5 text-[10px] font-black tracking-wider text-blue-800 uppercase">
                  <Volume2 className="h-3 w-3" />
                  NPC Says
                </span>
                <p className="mt-1 text-sm sm:text-lg font-black leading-snug text-slate-900">
                  &ldquo;{data.npcLine}&rdquo;
                </p>
                {npcNativeLine && showTranslation && (
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">
                    {npcNativeLine}
                  </p>
                )}
              </div>
            </div>

            {npcNativeLine && (
              <button
                type="button"
                onClick={() => setShowTranslation((prev) => !prev)}
                className="shrink-0 rounded-xl border-b-2 border-slate-300 bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold text-slate-600 hover:bg-slate-200"
              >
                {showTranslation ? "Hide EN" : "Show EN"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Required Chunk & 3D Response Options */}
      <div className="mb-6 shrink-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm sm:text-base font-black text-slate-900">
            <User className="h-4 w-4 text-blue-600" />
            <span>Choose your response:</span>
          </div>

          {data.constraint?.requiredChunk && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black tracking-wide text-amber-800 uppercase">
              Target Chunk: &ldquo;{data.constraint.requiredChunk}&rdquo;
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3">
          {data.constraint?.validReplies?.map((reply: string, idx: number) => {
            const isSelected = selectedReply === reply;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectReply(reply)}
                className={`flex items-center justify-between gap-3 rounded-2xl border-2 border-b-[5px] px-5 py-3.5 text-left text-sm sm:text-base font-black transition-all duration-150 ${
                  isSelected
                    ? "border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-md shadow-emerald-500/20"
                    : "border-slate-200 border-b-slate-300 bg-white text-slate-800 shadow-2xs hover:-translate-y-0.5 hover:border-sky-400 hover:bg-sky-50/40 active:translate-y-0.5 active:border-b-2"
                }`}
              >
                <span>{reply}</span>
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                    isSelected
                      ? "bg-white/25 text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {isSelected ? (
                    <Check className="h-3.5 w-3.5 stroke-[3.5]" />
                  ) : (
                    String.fromCharCode(65 + idx)
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Footer 3D CTA */}
      <div className="mt-auto flex shrink-0 justify-end border-t border-slate-100 pt-5">
        <button
          type="button"
          onClick={handleNext}
          disabled={!selectedReply}
          className={`inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl px-8 py-4 text-base font-black transition-all ${
            selectedReply
              ? "border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0"
              : "cursor-not-allowed bg-slate-200/80 text-slate-400"
          }`}
        >
          {!selectedReply && <Lock size={16} />}
          <span>Next: Grammar &amp; Meaning</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}