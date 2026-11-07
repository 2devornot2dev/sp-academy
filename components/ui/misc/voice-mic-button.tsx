// components/ui/voice-mic-button.tsx
"use client";

import React, { useEffect, useRef } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Compact 60fps Web Audio API microphone waveform that fits INSIDE any button
 * with zero layout shift.
 */
export function InlineMicWave({
  bars = 7,
  maxHeight = 16,
  barClassName = "bg-white",
}: {
  bars?: number;
  maxHeight?: number;
  barClassName?: string;
}) {
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    let audioCtx: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let rafId: number | null = null;
    let cancelled = false;

    async function startWave() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        audioCtx = new AudioCtx();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.7;
        source.connect(analyser);

        const data = new Uint8Array(analyser.frequencyBinCount);
        const center = Math.floor(bars / 2);

        const tick = () => {
          analyser.getByteFrequencyData(data);

          for (let i = 0; i < bars; i++) {
            const distFromCenter = Math.abs(i - center);
            const binVal = data[distFromCenter + 1] ?? 0;
            const norm = Math.min(1, binVal / 185);
            const minH = 4;
            const h = Math.max(minH, Math.round(norm * maxHeight));

            const el = barRefs.current[i];
            if (el) {
              el.style.height = `${h}px`;
              el.style.opacity = `${0.5 + norm * 0.5}`;
            }
          }

          rafId = requestAnimationFrame(tick);
        };

        rafId = requestAnimationFrame(tick);
      } catch {
        // Fallback gentle pulse if mic stream is already locked by another API
      }
    }

    startWave();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (audioCtx && audioCtx.state !== "closed") {
        audioCtx.close().catch(() => {});
      }
    };
  }, [bars, maxHeight]);

  return (
    <span
      className="inline-flex items-center justify-center gap-[2.5px]"
      style={{ height: `${maxHeight}px` }}
      aria-hidden="true"
    >
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            barRefs.current[i] = el;
          }}
          style={{ height: "4px", opacity: 0.6 }}
          className={cn(
            "w-[2.5px] rounded-full transition-[height,opacity] duration-75 ease-out",
            barClassName
          )}
        />
      ))}
    </span>
  );
}

interface VoiceMicButtonProps {
  isListening: boolean;
  isAnalyzing?: boolean;
  disabled?: boolean;
  score?: number | null;
  onClick: () => void;
  size?: "icon" | "sm" | "md" | "lg";
  idleLabel?: string;
  listeningLabel?: string;
  analyzingLabel?: string;
  colorVariant?: "blue" | "indigo" | "emerald" | "amber" | "purple";
  className?: string;
}

const VARIANT_CLASSES: Record<
  NonNullable<VoiceMicButtonProps["colorVariant"]>,
  string
> = {
  blue: "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white",
  indigo:
    "border-indigo-800 bg-gradient-to-b from-indigo-500 to-indigo-700 text-white",
  emerald:
    "border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white",
  amber:
    "border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950!",
  purple:
    "border-purple-950 bg-gradient-to-b from-violet-500 to-purple-700 text-white",
};

export function VoiceMicButton({
  isListening,
  isAnalyzing = false,
  disabled = false,
  score = null,
  onClick,
  size = "sm",
  idleLabel = "Try",
  listeningLabel = "Stop",
  analyzingLabel = "Scoring...",
  colorVariant = "blue",
  className,
}: VoiceMicButtonProps) {
  // Automatically color by score if a score is passed
  const resolvedVariant =
    score !== null && score !== undefined
      ? score >= 80
        ? "emerald"
        : "amber"
      : colorVariant;

  const sizeStyles =
    size === "icon"
      ? "h-9 min-w-9 px-2 rounded-xl border-b-[3px] text-xs"
      : size === "sm"
        ? "h-8 px-3 rounded-xl border-b-[3px] text-xs gap-1.5"
        : size === "md"
          ? "px-4 py-2.5 rounded-xl border-b-4 text-xs gap-2"
          : "w-full py-4 px-6 rounded-2xl border-b-4 text-base gap-3 shadow-lg";

  const waveBars = size === "lg" ? 11 : size === "md" ? 7 : 5;
  const waveHeight = size === "lg" ? 20 : 14;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isAnalyzing}
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-black shadow-2xs transition-all duration-150 select-none active:translate-y-0.5 active:border-b-0 disabled:opacity-45",
        sizeStyles,
        isListening
          ? "border-rose-800 bg-gradient-to-b from-rose-500 to-rose-600 text-white ring-2 ring-rose-300/60"
          : isAnalyzing
            ? "cursor-wait border-indigo-800 bg-indigo-600 text-white"
            : VARIANT_CLASSES[resolvedVariant],
        className
      )}
    >
      {isListening ? (
        <>
          <InlineMicWave
            bars={waveBars}
            maxHeight={waveHeight}
            barClassName="bg-white"
          />
          {size !== "icon" && <span>{listeningLabel}</span>}
          <Square className="h-2.5 w-2.5 shrink-0 fill-current" />
        </>
      ) : isAnalyzing ? (
        <>
          <Loader2
            className={cn(
              "animate-spin shrink-0",
              size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5"
            )}
          />
          {size !== "icon" && <span>{analyzingLabel}</span>}
        </>
      ) : (
        <>
          <Mic
            className={cn(
              "shrink-0",
              size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5"
            )}
          />
          {size !== "icon" && (
            <span>
              {score !== null && score !== undefined && idleLabel === "Try"
                ? `${Math.round(score)}%`
                : idleLabel}
            </span>
          )}
        </>
      )}
    </button>
  );
}