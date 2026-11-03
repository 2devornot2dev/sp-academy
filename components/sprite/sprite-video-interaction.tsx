// components/sprite/sprite-video-interaction.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Volume2,
  VolumeX,
  ArrowRight,
  Sparkles,
  RotateCcw,
  Play,
  Pause,
} from "lucide-react";

interface SpriteVideoInteractionProps {
  videoUrl: string;
  spriteName?: string;
  fallbackAvatarUrl?: string;
  title?: string;
  subtitle?: string;
  onComplete: () => void;
  autoPlay?: boolean;
}

export function SpriteVideoInteraction({
  videoUrl,
  spriteName = "Vox",
  fallbackAvatarUrl = "/sprite-m.png",
  title = "Mission Briefing",
  subtitle = "Lock in and listen to your mission orders",
  onComplete,
  autoPlay = true,
}: SpriteVideoInteractionProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(10);
  const [currentTime, setCurrentTime] = useState(0);
  const [needsUserUnmute, setNeedsUserUnmute] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Autoplay handler with audio policy fallback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !autoPlay) return;

    // Try playing with sound first
    video.muted = false;
    video
      .play()
      .then(() => {
        setIsPlaying(true);
        setIsMuted(false);
      })
      .catch((err) => {
        console.warn("[SpriteVideo] Unmuted autoplay blocked, retrying muted:", err);
        // Fallback: play muted and prompt user to unmute
        video.muted = true;
        setIsMuted(true);
        setNeedsUserUnmute(true);
        video
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setHasError(true));
      });
  }, [autoPlay, videoUrl]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    const dur = video.duration || duration;
    setDuration(dur);
    setProgress((video.currentTime / dur) * 100);
  };

  const handleTogglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().then(() => setIsPlaying(true));
    }
  };

  const handleToggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !isMuted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted) setNeedsUserUnmute(false);
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    onComplete();
  };

  const secondsRemaining = Math.max(0, Math.ceil(duration - currentTime));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative z-50 flex h-full min-h-[500px] w-full flex-col items-center justify-between overflow-hidden rounded-[2rem] border-2 border-indigo-500/30 bg-[#070B14] p-6 text-white shadow-2xl"
    >
      {/* Background Ambient Aura Glow */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-teal-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-indigo-500/25 blur-3xl" />

      {/* TOP BAR: Title + Time Left + Skip Button */}
      <div className="relative z-10 flex w-full items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 rounded-full bg-teal-400 animate-ping" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-teal-300">
                {spriteName} Broadcast
              </span>
              <span className="rounded-md bg-white/10 px-1.5 py-0.2 text-[9px] font-bold text-slate-300">
                0:0{secondsRemaining}s
              </span>
            </div>
            <h3 className="text-sm font-extrabold text-white truncate">{title}</h3>
          </div>
        </div>

        {/* Skip Button */}
        <button
          type="button"
          onClick={onComplete}
          className="group inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-black text-slate-200 backdrop-blur-md transition hover:border-teal-400 hover:bg-teal-400/20 hover:text-white"
        >
          <span>Skip</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* CENTER STAGE: The Lip-Synced Avatar Video */}
      <div className="relative z-10 my-auto flex w-full max-w-md flex-col items-center justify-center">
        <div className="relative aspect-video w-full overflow-hidden rounded-3xl border-2 border-teal-400/40 bg-slate-900 shadow-[0_0_50px_rgba(45,212,191,0.25)]">
          {!hasError ? (
            <video
              ref={videoRef}
              src={videoUrl}
              playsInline
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnded}
              onError={() => setHasError(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="relative flex h-full w-full items-center justify-center bg-slate-900">
              <img
                src={fallbackAvatarUrl}
                alt={spriteName}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          {/* Unmute Prompt Overlay (If browser forced muted autoplay) */}
          <AnimatePresence>
            {needsUserUnmute && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                type="button"
                onClick={handleToggleMute}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px] transition hover:bg-slate-950/70"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-400 text-slate-950 shadow-lg animate-pulse mb-2">
                  <VolumeX className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-black text-slate-900 shadow-md">
                  Tap to Enable {spriteName}&apos;s Voice
                </span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <p className="mt-3 text-center text-xs font-semibold text-slate-300">
          {subtitle}
        </p>
      </div>

      {/* BOTTOM CONTROLS & TIMELINE */}
      <div className="relative z-10 w-full space-y-2.5 pt-4 border-t border-white/10">
        {/* Timeline Bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-teal-400 to-indigo-500 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs font-bold text-slate-400">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="text-slate-300 hover:text-white transition"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={handleToggleMute}
              className="text-slate-300 hover:text-white transition"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4 text-rose-400" />
              ) : (
                <Volume2 className="h-4 w-4 text-teal-300" />
              )}
            </button>
          </div>

          <div className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-teal-400" />
            <span className="text-[11px] font-extrabold uppercase text-slate-300">
              Live Arena Cutscene
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}