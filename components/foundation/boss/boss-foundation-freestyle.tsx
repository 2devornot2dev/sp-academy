// components/foundation/boss/boss-foundation-freestyle.tsx
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Heart,
  RotateCcw,
  Zap,
  Loader2,
  Play,
  Volume2,
  VolumeX,
  Sparkles,
  Target,
  RectangleHorizontal,
  MessagesSquare,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { BossMessage, useBossFoundation } from "@/context/boss-context";
import { BossFoundationFreestyleChatBubble } from "./boss-freestyle-chat-bubble";
import { useWordAudio } from "@/context/word-audio-context";
import { ExerciseBlock } from "./exercise-block";
import { playSfx, preloadSfx } from "@/lib/sfx";

interface Props {
  onEnd: () => void;
  onRetry: () => void;
  introVideoUrl?: string;
  coverImageUrl?: string;
  scenarioData?: unknown;
}

type BossStageMood = "default" | "happy" | "angry" | "sad" | "thinking";

function getBossMoodMotion(mood: BossStageMood) {
  switch (mood) {
    case "happy":
      return {
        scale: [1, 1.14, 1.04],
        y: [0, -10, 0],
        rotate: [0, -3, 3, 0],
      };
    case "angry":
      return {
        scale: [1, 1.08, 1.02],
        x: [0, -8, 8, -6, 6, -3, 3, 0],
      };
    case "sad":
      return {
        scale: [1, 0.95, 0.98],
        y: [0, 6, 3],
        rotate: [0, -4, -2],
      };
    case "thinking":
      return {
        scale: 1,
        rotate: [0, -3, 2, 0],
      };
    default:
      return { scale: 1, x: 0, y: 0, rotate: 0 };
  }
}

const BOSS_MOOD_OVERLAY: Record<
  BossStageMood,
  { tint: string; badge: string | null }
> = {
  default: { tint: "bg-transparent", badge: null },
  happy: { tint: "bg-emerald-400/20", badge: "✨" },
  angry: { tint: "bg-rose-600/30", badge: "💢" },
  sad: { tint: "bg-indigo-900/25", badge: "💧" },
  thinking: { tint: "bg-indigo-500/15", badge: "💭" },
};

export default function BossFoundationFreestyle({
  onEnd,
  onRetry,
  introVideoUrl,
  coverImageUrl,
}: Props) {
  const {
    boss,
    messages,
    bossAvatarUrl,
    getBossAvatarUrl,
    chances,
    xp,
    currentIndex,
    totalExercises,
    stageStatus,
    hasStartedExercises,
    isRecording,
    transcript,
    isProcessing,
    isAiProcessing,
    startExercises,
    submitExerciseAnswer,
    handleTimeOut,
    submitTurn,
    startRecording,
    stopRecording,
    playExerciseAudio,
    resolveAssetUrl,
    resetRecording,
    handleReplay,
  } = useBossFoundation();

  const { playWord, stopAudio: stopWordAudio } = useWordAudio();

  const [viewMode, setViewMode] = useState<"single" | "multi">("single");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasPlayedRef = useRef(false);
  const lastGradedMsgIdRef = useRef<string | number | null>(null);
  const prevStageStatusRef = useRef<string>(stageStatus);

  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoFinished, setVideoFinished] = useState(false);

  useEffect(() => {
    preloadSfx();
  }, []);

  const showThinking = isAiProcessing && !isRecording;

  const hasPendingExercise = messages.some(
    (message) => message.exercise && message.status === "pending",
  );

  const progressPercent =
    totalExercises > 0
      ? Math.min((currentIndex / totalExercises) * 100, 100)
      : 0;

  // Derive active Boss message & active Exercise for 1-on-1 Stage mode
  const latestBossChatMsg = useMemo(
    () =>
      [...messages]
        .reverse()
        .find(
          (m) => !m.exercise && m.role !== "user" && (m as any).sender !== "user",
        ) || null,
    [messages],
  );

  const activeExerciseMsg = useMemo(
    () =>
      [...messages].reverse().find((m) => m.exercise && m.status === "pending") ||
      [...messages].reverse().find((m) => Boolean(m.exercise)) ||
      null,
    [messages],
  );

  // Trigger SFX when a new graded Boss reaction arrives
  useEffect(() => {
    if (!latestBossChatMsg?.id) return;
    if (lastGradedMsgIdRef.current === latestBossChatMsg.id) return;

    if (latestBossChatMsg.status === "correct") {
      lastGradedMsgIdRef.current = latestBossChatMsg.id;
      playSfx("correct");
    } else if (latestBossChatMsg.status === "incorrect") {
      lastGradedMsgIdRef.current = latestBossChatMsg.id;
      playSfx("heart-lost");
    }
  }, [latestBossChatMsg?.id, latestBossChatMsg?.status]);

  // Trigger Victory / Defeat SFX on stage status change
  useEffect(() => {
    if (prevStageStatusRef.current === stageStatus) return;
    prevStageStatusRef.current = stageStatus;

    if (stageStatus === "PASSED") {
      playSfx("victory");
      confetti({
        particleCount: 150,
        spread: 75,
        origin: { y: 0.6 },
        colors: ["#6366F1", "#10B981", "#F59E0B", "#EC4899"],
      });
    } else if (stageStatus === "FAILED") {
      playSfx("wrong");
    }
  }, [stageStatus]);

  const effectiveMood: BossStageMood = useMemo(() => {
    if (showThinking) return "thinking";
    if (latestBossChatMsg?.status === "correct") return "happy";
    if (latestBossChatMsg?.status === "incorrect") return "angry";
    const rawMood = latestBossChatMsg?.mood;
    if (rawMood === "happy" || rawMood === "angry" || rawMood === "sad") {
      return rawMood;
    }
    return "default";
  }, [showThinking, latestBossChatMsg]);

  const activeStageAvatarUrl = useMemo(() => {
    const moodUrl =
      effectiveMood === "happy"
        ? getBossAvatarUrl("happy")
        : effectiveMood === "angry"
          ? getBossAvatarUrl("angry")
          : effectiveMood === "sad"
            ? getBossAvatarUrl("sad")
            : getBossAvatarUrl("default");
    return moodUrl || bossAvatarUrl || getBossAvatarUrl("default");
  }, [effectiveMood, bossAvatarUrl, getBossAvatarUrl]);

  // Auto-play the intro video if present; otherwise auto-play the Boss's intro audio line
  useEffect(() => {
    if (hasStartedExercises || hasPlayedRef.current) return;

    if (introVideoUrl) {
      const video = videoRef.current;
      if (!video) return;
      video.muted = false;
      setIsVideoMuted(false);
      hasPlayedRef.current = true;
      video.play().catch(() => {
        // If browser requires another tap for unmuted video, leave the Play button visible
        hasPlayedRef.current = false;
      });
      return;
    }

    if (boss?.introMessage) {
      hasPlayedRef.current = true;
      void playExerciseAudio(
        (boss as any)?.introAudioKey ?? null,
        boss.introMessage,
      );
    }
  }, [hasStartedExercises, introVideoUrl, boss, playExerciseAudio]);

  useEffect(() => {
    if (viewMode === "multi") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, transcript, isProcessing, isAiProcessing, viewMode]);

  useEffect(() => {
    if (hasStartedExercises && videoRef.current) {
      videoRef.current.pause();
    }
  }, [hasStartedExercises]);

  const handleVideoClick = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused || video.ended) {
      if (!hasPlayedRef.current) {
        video.muted = false;
        setIsVideoMuted(false);
        hasPlayedRef.current = true;
      }
      if (video.ended) video.currentTime = 0;
      video.play().catch((error) => {
        console.warn("Intro video could not play:", error);
      });
    } else {
      video.pause();
    }
  };

  const toggleVideoMute = (event: ReactMouseEvent) => {
    event.stopPropagation();
    const video = videoRef.current;
    const next = !isVideoMuted;
    if (video) video.muted = next;
    setIsVideoMuted(next);
  };

  return (
    <div className="relative z-10 mx-auto flex h-[calc(100vh-2rem)] max-h-[900px] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white shadow-2xl">
      {/* Failed state overlay */}
      {stageStatus === "FAILED" && (
        <div className="absolute inset-0 z-50 flex animate-in flex-col items-center justify-center bg-white/95 p-8 text-center backdrop-blur-sm duration-300 zoom-in-95">
          <div className="mb-5 h-28 w-28 overflow-hidden rounded-[2rem] border-2 border-b-[6px] border-rose-500 border-b-rose-800 bg-slate-900 shadow-xl">
            <img
              src={getBossAvatarUrl("angry") || bossAvatarUrl}
              alt={boss?.name || "Boss"}
              className="h-full w-full object-cover object-top"
            />
          </div>

          <h2 className="mb-2 text-3xl font-black text-slate-900">
            Out of Hearts!
          </h2>

          <p className="mb-7 max-w-sm text-sm font-bold text-slate-500">
            {boss?.name} was not impressed. Take a deep breath and challenge the
            arena again.
          </p>

          <button
            type="button"
            onClick={() => {
              playSfx("tap");
              onRetry();
            }}
            className="flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 py-4 text-sm font-black text-white shadow-xl shadow-blue-500/25 transition-all hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:border-b-0"
          >
            <RotateCcw size={18} />
            <span>Retry Encounter</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playSfx("tap");
              onEnd();
            }}
            className="mt-3 rounded-xl px-4 py-2 text-xs font-black text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            Exit to Learning Hub
          </button>
        </div>
      )}

      {/* 1. Vibrant Dark Arena Header + Single/Multi View Switcher */}
      <div className="relative shrink-0 overflow-hidden border-b border-slate-200 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 px-6 py-3.5 text-white">
        <div className="pointer-events-none absolute -top-12 right-10 h-32 w-32 rounded-full bg-sky-500/20 blur-2xl" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl border-2 border-b-4 border-sky-400 bg-slate-900 shadow-md">
              <img
                src={activeStageAvatarUrl}
                alt={boss?.name ? `${boss.name} avatar` : "Boss avatar"}
                className="h-full w-full object-cover object-top transition-all duration-300"
              />
              <span className="absolute right-0.5 bottom-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-black tracking-tight text-white sm:text-lg">
                  {boss?.name || "Milestone Boss"}
                </h2>
                <span className="rounded-lg border border-sky-400/40 bg-sky-500/20 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-sky-300 uppercase">
                  Boss Arena
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-300">
                Challenge{" "}
                <strong className="text-white">
                  {Math.min(currentIndex + 1, Math.max(1, totalExercises))}
                </strong>{" "}
                of <strong className="text-white">{totalExercises}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Single / Multi View Switcher */}
            <div className="flex items-center gap-1 rounded-xl border border-white/15 bg-slate-900/90 p-1">
              <button
                type="button"
                onClick={() => {
                  playSfx("tap");
                  setViewMode("single");
                }}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black transition ${
                  viewMode === "single"
                    ? "border-b-2 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-2xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <RectangleHorizontal className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">1-on-1 Stage</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playSfx("tap");
                  setViewMode("multi");
                }}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black transition ${
                  viewMode === "multi"
                    ? "border-b-2 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-2xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <MessagesSquare className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  Transcript ({messages.length})
                </span>
              </button>
            </div>

            {/* Hearts Pill */}
            <div className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-slate-900/90 px-3 py-1.5">
              {[1, 2, 3].map((heartIndex) => (
                <Heart
                  key={heartIndex}
                  size={18}
                  className={`transition-all duration-300 ${
                    heartIndex <= chances
                      ? "scale-100 fill-rose-500 text-rose-500 drop-shadow-2xs"
                      : "scale-90 fill-slate-700 text-slate-700"
                  }`}
                />
              ))}
            </div>

            {/* XP Pill */}
            <div className="flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-500/20 px-3 py-1.5">
              <Zap size={15} className="fill-amber-300 text-amber-300" />
              <span className="text-xs font-black text-amber-300">{xp} XP</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Arena Progress Strip */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200/80 bg-gradient-to-r from-sky-50/70 via-indigo-50/40 to-emerald-50/50 px-6 py-2.5">
        <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-black tracking-wider text-indigo-900 uppercase">
          <Target className="h-3.5 w-3.5 text-indigo-600" />
          Progress ({currentIndex}/{totalExercises})
        </span>

        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200/80 p-0.5 shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-emerald-400 transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* =====================================================================
          3A. SINGLE 1-ON-1 STAGE VIEW (Living Boss Portrait + Active Exercise)
          ===================================================================== */}
      {viewMode === "single" ? (
        <div className="relative flex-1 overflow-y-auto bg-slate-50/60 px-5 py-4">
          <div className="mx-auto flex max-w-3xl flex-col items-center space-y-3.5">
            {/* If Intro Video hasn't been started/skipped yet, spotlight the Cutscene */}
            {introVideoUrl && !hasStartedExercises ? (
              <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border-2 border-b-[6px] border-slate-200 border-b-slate-300 bg-slate-950 shadow-xl animate-in fade-in zoom-in-95 duration-300">
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={
                    isVideoPlaying ? "Pause intro video" : "Play intro video"
                  }
                  onClick={handleVideoClick}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleVideoClick();
                    }
                  }}
                  className="relative aspect-[16/9] w-full cursor-pointer"
                >
                  <video
                    ref={videoRef}
                    src={introVideoUrl}
                    poster={coverImageUrl}
                    preload="metadata"
                    playsInline
                    onPlay={() => setIsVideoPlaying(true)}
                    onPause={() => setIsVideoPlaying(false)}
                    onEnded={() => {
                      setIsVideoPlaying(false);
                      setVideoFinished(true);
                    }}
                    className="h-full w-full object-cover"
                  />

                  {!isVideoPlaying && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-xl">
                        <Play className="ml-1 h-7 w-7 fill-current" />
                      </div>
                    </div>
                  )}

                  <div className="pointer-events-none absolute top-3.5 left-3.5 inline-flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-slate-950/75 px-3 py-1 text-[11px] font-black tracking-wider text-sky-300 uppercase backdrop-blur-md">
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                    <span>{boss?.name || "Boss"} Intro</span>
                  </div>

                  <button
                    type="button"
                    onClick={toggleVideoMute}
                    className="absolute top-3.5 right-3.5 rounded-full border border-white/15 bg-slate-950/75 p-2 text-white backdrop-blur-md transition hover:bg-slate-900"
                    title={isVideoMuted ? "Unmute video" : "Mute video"}
                  >
                    {isVideoMuted ? (
                      <VolumeX className="h-4 w-4 text-slate-300" />
                    ) : (
                      <Volume2 className="h-4 w-4 text-emerald-400" />
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Living 1-on-1 Boss Portrait (Framer Motion Emote Engine) */
              <div className="flex flex-col items-center pt-1 text-center">
                <div className="relative mb-2.5">
                  {/* Ambient Mood Glow */}
                  <div
                    className={`pointer-events-none absolute -inset-3 rounded-[2.2rem] blur-xl transition-all duration-500 ${
                      effectiveMood === "happy"
                        ? "bg-emerald-400/50"
                        : effectiveMood === "angry"
                          ? "bg-rose-500/55"
                          : effectiveMood === "sad"
                            ? "bg-amber-400/40"
                            : "bg-sky-400/30"
                    }`}
                  />

                  {/* Expanding Shockwave Ring on Mood Change */}
                  <AnimatePresence>
                    <motion.div
                      key={`ring-${effectiveMood}-${latestBossChatMsg?.id}`}
                      initial={{ scale: 0.9, opacity: 0.85 }}
                      animate={{ scale: 1.35, opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.55, ease: "easeOut" }}
                      className={`pointer-events-none absolute inset-0 rounded-[1.75rem] border-4 ${
                        effectiveMood === "happy"
                          ? "border-emerald-400"
                          : effectiveMood === "angry"
                            ? "border-rose-500"
                            : effectiveMood === "sad"
                              ? "border-amber-400"
                              : "border-sky-400"
                      }`}
                    />
                  </AnimatePresence>

                  {/* Animated Portrait Box */}
                  <motion.div
                    key={`box-${effectiveMood}-${latestBossChatMsg?.id}`}
                    animate={getBossMoodMotion(effectiveMood)}
                    transition={
                      effectiveMood === "thinking"
                        ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
                        : { duration: 0.45, ease: "easeOut" }
                    }
                    className={`relative h-20 w-20 overflow-hidden rounded-[1.75rem] border-2 border-b-[5px] bg-slate-900 shadow-xl sm:h-24 sm:w-24 ${
                      effectiveMood === "happy"
                        ? "border-emerald-400 border-b-emerald-700"
                        : effectiveMood === "angry"
                          ? "border-rose-500 border-b-rose-800"
                          : effectiveMood === "sad"
                            ? "border-amber-400 border-b-orange-700"
                            : "border-sky-400 border-b-blue-800"
                    }`}
                  >
                    <img
                      src={activeStageAvatarUrl}
                      alt={boss?.name || "Boss"}
                      className="h-full w-full object-cover object-top"
                    />
                    <div
                      className={`pointer-events-none absolute inset-0 transition-colors duration-300 ${BOSS_MOOD_OVERLAY[effectiveMood].tint}`}
                    />
                  </motion.div>

                  {/* Popping Top-Right Emoji Burst */}
                  <AnimatePresence mode="wait">
                    {BOSS_MOOD_OVERLAY[effectiveMood].badge && (
                      <motion.div
                        key={`emoji-${effectiveMood}-${latestBossChatMsg?.id}`}
                        initial={{ scale: 0, rotate: -20, y: 8 }}
                        animate={{ scale: 1, rotate: 0, y: 0 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 420,
                          damping: 18,
                        }}
                        className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-xl border-2 border-white bg-transparent text-sm shadow-lg"
                      >
                        {BOSS_MOOD_OVERLAY[effectiveMood].badge}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Animated Emote Status Pill */}
                  <motion.span
                    key={`pill-${effectiveMood}`}
                    initial={{ scale: 0.85, y: 4 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 380, damping: 20 }}
                    className={`absolute -bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-b-2 px-3 py-0.5 text-[10px] font-black tracking-wider uppercase shadow-md ${
                      effectiveMood === "happy"
                        ? "border-emerald-800 bg-emerald-400 text-slate-950"
                        : effectiveMood === "thinking"
                          ? "border-indigo-900 bg-indigo-500 text-white"
                          : effectiveMood === "angry"
                            ? "border-rose-950 bg-rose-500 text-white"
                            : "border-blue-900 bg-sky-400 text-slate-950"
                    }`}
                  >
                    {effectiveMood === "happy"
                      ? "🔥 Impressed"
                      : effectiveMood === "thinking"
                        ? "💭 Thinking..."
                        : effectiveMood === "angry"
                          ? "💢 Not Impressed"
                          : `👑 ${boss?.name || "Boss"}`}
                  </motion.span>
                </div>
              </div>
            )}

            {/* Boss's Latest Spoken Line Card */}
            {latestBossChatMsg && (
              <div
                className={`w-full max-w-2xl rounded-3xl border-2 border-b-[5px] px-5 py-3 text-center shadow-sm transition-all ${
                  latestBossChatMsg.status === "correct"
                    ? "border-emerald-300 border-b-emerald-400 bg-emerald-50/95 text-emerald-950"
                    : latestBossChatMsg.status === "incorrect"
                      ? "border-rose-300 border-b-rose-400 bg-rose-50/95 text-rose-950"
                      : "border-slate-200 border-b-slate-300 bg-white text-slate-900"
                }`}
              >
                {(latestBossChatMsg.status === "correct" ||
                  latestBossChatMsg.status === "incorrect") && (
                  <div className="mb-1 flex items-center justify-center gap-1.5">
                    {latestBossChatMsg.status === "correct" ? (
                      <>
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        <span className="text-[10px] font-black tracking-wider text-emerald-700 uppercase">
                          Correct! +50 XP
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle size={14} className="text-rose-600" />
                        <span className="text-[10px] font-black tracking-wider text-rose-700 uppercase">
                          Incorrect • -1 Heart
                        </span>
                      </>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-center gap-2.5">
                  <p className="text-sm font-black leading-snug sm:text-lg">
                    &ldquo;{latestBossChatMsg.text}&rdquo;
                  </p>
                  {latestBossChatMsg.text && (
                    <button
                      type="button"
                      onClick={() => handleReplay(latestBossChatMsg.text!)}
                      title="Replay Boss audio"
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 border-b-[3px] border-sky-200 bg-sky-50 text-blue-600 transition hover:bg-sky-100"
                    >
                      <Volume2 size={15} />
                    </button>
                  )}
                </div>

                {latestBossChatMsg.translation && (
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {latestBossChatMsg.translation}
                  </p>
                )}
              </div>
            )}

            {/* Active Challenge Card (Centered on Stage) */}
            {activeExerciseMsg && (
              <div className="flex w-full justify-center">
                <ExerciseBlock
                  key={activeExerciseMsg.id}
                  message={activeExerciseMsg}
                  onSubmit={submitExerciseAnswer}
                  onSubmitVoice={submitTurn}
                  onTimeOut={handleTimeOut}
                  isRecording={isRecording}
                  isAiProcessing={isAiProcessing}
                  transcript={transcript}
                  startRecording={startRecording}
                  stopRecording={stopRecording}
                  resetRecording={resetRecording}
                  playExerciseAudio={playExerciseAudio}
                  resolveAssetUrl={resolveAssetUrl}
                  playWord={playWord}
                  stopWordAudio={stopWordAudio}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        /* =====================================================================
           3B. MULTI-THREAD TRANSCRIPT VIEW (Full Scrollable Feed)
           ===================================================================== */
        <div className="relative flex-1 overflow-hidden bg-slate-50/50">
          <ScrollArea className="h-full w-full">
            <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-8">
              {messages.map((message: BossMessage) => {
                if (!message.exercise) {
                  return (
                    <BossFoundationFreestyleChatBubble
                      key={message.id}
                      message={message}
                      aiAvatarUrl={
                        getBossAvatarUrl(message.mood || "default") ||
                        bossAvatarUrl
                      }
                      onReplay={handleReplay}
                      ttsStatus="idle"
                    />
                  );
                }

                return (
                  <ExerciseBlock
                    key={message.id}
                    message={message}
                    onSubmit={submitExerciseAnswer}
                    onSubmitVoice={submitTurn}
                    onTimeOut={handleTimeOut}
                    isRecording={isRecording}
                    isAiProcessing={isAiProcessing}
                    transcript={transcript}
                    startRecording={startRecording}
                    stopRecording={stopRecording}
                    resetRecording={resetRecording}
                    playExerciseAudio={playExerciseAudio}
                    resolveAssetUrl={resolveAssetUrl}
                    playWord={playWord}
                    stopWordAudio={stopWordAudio}
                  />
                );
              })}

              {showThinking && (
                <div className="flex w-full justify-center py-4 animate-in fade-in duration-300">
                  <Marker role="status">
                    <MarkerIcon>
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    </MarkerIcon>
                    <MarkerContent className="text-xs font-black tracking-wider text-slate-500 uppercase">
                      {boss?.name || "Boss"} is thinking...
                    </MarkerContent>
                  </Marker>
                </div>
              )}

              <div ref={messagesEndRef} className="h-4" />
            </div>
          </ScrollArea>
        </div>
      )}

      {/* 4. Bottom Control Bar */}
      <div className="relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-white px-6 py-4">
        {!hasStartedExercises ? (
          <button
            type="button"
            onClick={() => {
              playSfx("round-clear");
              startExercises();
            }}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 py-4 text-sm font-black text-white shadow-xl shadow-blue-500/25 transition-all hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:border-b-0 sm:text-base ${
              videoFinished ? "ring-4 ring-sky-300/60" : ""
            }`}
          >
            <span>
              {isProcessing ? "Skip Intro & Begin" : "I'm Ready, Let's Begin"}
            </span>
            <ArrowRight size={18} />
          </button>
        ) : stageStatus === "PLAYING" ? (
          <div className="flex w-full items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className={`h-3 w-3 rounded-full ${
                  isRecording
                    ? "animate-ping bg-emerald-500"
                    : isAiProcessing
                      ? "animate-pulse bg-indigo-500"
                      : "bg-sky-500"
                }`}
              />
              <span className="text-sm font-extrabold text-slate-700">
                {hasPendingExercise
                  ? "Complete the active challenge above to continue..."
                  : isAiProcessing
                    ? `${boss?.name || "Boss"} is speaking...`
                    : "Preparing next challenge..."}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            <p className="text-sm font-black tracking-wider text-slate-700 uppercase">
              Encounter {stageStatus}
            </p>
          </div>
        )}

        {stageStatus === "PASSED" && (
          <button
            type="button"
            onClick={() => {
              playSfx("tap");
              onEnd();
            }}
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-800 bg-gradient-to-b from-emerald-400 to-emerald-600 px-8 py-3.5 text-sm font-black text-white shadow-xl shadow-emerald-500/25 transition-all hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:border-b-0 md:w-auto"
          >
            <span>Claim Victory</span>
            <ArrowRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}