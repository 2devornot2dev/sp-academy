// components/sprite/sprite-chat.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Award,
  Loader2,
  MessagesSquare,
  Sparkles,
  X,
  AlertTriangle,
  Compass,
  Volume2,
  Square,
  RotateCcw,
} from "lucide-react";
import { useSprite } from "@/context/sprite-context";
import type { ChatContextData } from "./sprite-chat-utils";

export type { ChatContextData } from "./sprite-chat-utils";

interface SpriteChatProps {
  userId: string;
  initialContext?: ChatContextData;
}

export function SpriteChat({ initialContext }: SpriteChatProps) {
  const {
    profile,
    spriteName,
    avatarSrc,
    isChatOpen,
    openChat,
    closeChat,
    isShowing,
    liveTask,
    lastNotification,
    isPlaying,
    playAudioUrl,
    stopAudio,
    retryLiveTask,
    isRetryingTask,
  } = useSprite();
  const router = useRouter();

  const [isLabelExpanded, setIsLabelExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const aiBrain: ChatContextData = initialContext || {
    userName: "Student",
    nativeLang: "English",
    targetLang: profile?.targetLanguage || "French",
    currentLessonTitle: "Active Lesson",
    avgPronunciation: 0,
  };

  useEffect(() => {
    setIsLabelExpanded(true);
    const timer = setTimeout(() => {
      setIsLabelExpanded(false);
    }, 5500);
    return () => clearTimeout(timer);
  }, [aiBrain.currentLessonTitle]);

  const isBuilding = liveTask?.status === "BUILDING";
  const isFailed = liveTask?.status === "FAILED";
  const showLauncherPill = isLabelExpanded || isHovered || isBuilding;

  const handlePrimaryAction = () => {
    closeChat();
    if (aiBrain.activeStepHref) {
      router.push(aiBrain.activeStepHref);
    } else {
      router.push("/learning-hub");
    }
  };

  return (
    <>
      {/* 1. FLOATING LAUNCHER (Morphs into notification popup when `isShowing` is true) */}
      <AnimatePresence>
        {!isChatOpen && !isShowing && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => openChat()}
            className="group fixed right-5 bottom-5 z-40 flex cursor-pointer items-center gap-3 sm:right-6 sm:bottom-6"
          >
            <AnimatePresence initial={false}>
              {showLauncherPill && (
                <motion.div
                  key="launcher-pill"
                  initial={{ opacity: 0, x: 14, scale: 0.94 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 10, scale: 0.94 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="hidden flex-col items-end overflow-hidden rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-white px-4 py-2 text-right whitespace-nowrap shadow-xl sm:flex"
                >
                  <span className="max-w-[230px] truncate text-[10px] font-black tracking-wider text-blue-600 uppercase">
                    {isBuilding
                      ? `Baking: ${liveTask?.label || "Next Stage"}`
                      : `Up Next: ${aiBrain.currentLessonTitle}`}
                  </span>
                  <span className="text-xs font-extrabold text-slate-900">
                    {spriteName} Quick Hub
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative h-14 w-14 shrink-0">
              <div className="h-full w-full overflow-hidden rounded-2xl border-2 border-b-4 border-sky-400 border-b-blue-600 bg-white shadow-xl transition-transform group-hover:-translate-y-0.5">
                <img
                  src={avatarSrc}
                  alt={spriteName}
                  className="h-full w-full object-cover object-top"
                />
              </div>

              {isBuilding ? (
                <span className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-amber-400 text-slate-950 shadow-md">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                </span>
              ) : isFailed ? (
                <span className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-rose-500 text-white shadow-md">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </span>
              ) : (
                <span className="absolute -right-1 -bottom-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. COMPACT 3D QUICK HUB POPOVER (Docks at the exact same bottom-right corner) */}
      <AnimatePresence>
        {isChatOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeChat}
              className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[1px]"
            />

            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 360, damping: 28 }}
              className="fixed right-4 bottom-4 z-50 w-[calc(100vw-2rem)] max-w-[360px] overflow-hidden rounded-[2rem] border-2 border-b-[6px] border-slate-200 border-b-slate-300 bg-white font-sans text-slate-900 shadow-2xl sm:right-6 sm:bottom-6"
            >
              {/* Dark Header */}
              <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 px-5 py-4 text-white">
                <div className="flex items-center gap-3">
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl border-2 border-b-4 border-sky-400 bg-slate-900">
                    <img
                      src={avatarSrc}
                      alt={spriteName}
                      className="h-full w-full object-cover object-top"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-black text-white">
                        {spriteName}
                      </h3>
                      <span className="rounded-md bg-sky-500/20 px-2 py-0.5 text-[9px] font-black tracking-wider text-sky-300 uppercase">
                        Quick Hub
                      </span>
                    </div>
                    <p className="max-w-[190px] truncate text-[11px] font-semibold text-slate-300">
                      {aiBrain.currentLessonTitle}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeChat}
                  className="rounded-xl border border-white/15 bg-white/10 p-1.5 text-slate-300 transition hover:bg-white/20 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="space-y-3.5 p-5">
                {/* 1. Live Build / Error Banner */}
                {isBuilding ? (
                  <div className="flex items-center gap-3 rounded-2xl border-2 border-amber-200 bg-amber-50/80 px-4 py-3">
                    <Loader2 className="h-5 w-5 shrink-0 animate-spin text-amber-600" />
                    <div className="min-w-0">
                      <span className="block text-[10px] font-black tracking-wider text-amber-700 uppercase">
                        Building in Background
                      </span>
                      <span className="block truncate text-xs font-extrabold text-slate-800">
                        {liveTask?.label || "Preparing next stage..."}
                      </span>
                    </div>
                  </div>
                ) : isFailed ? (
                  <div className="space-y-2.5 rounded-2xl border-2 border-rose-200 bg-rose-50/80 p-3.5">
                    <div className="flex items-center gap-2 text-xs font-black text-rose-700">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                      <span>
                        {liveTask?.label || "Stage"} build interrupted
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={isRetryingTask}
                      onClick={() => void retryLiveTask()}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border-b-[3px] border-rose-800 bg-gradient-to-b from-rose-500 to-rose-600 py-2 text-xs font-black text-white shadow-xs transition hover:brightness-105 disabled:opacity-50"
                    >
                      {isRetryingTask ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {isRetryingTask ? "Retrying..." : "Retry Build Now"}
                      </span>
                    </button>
                  </div>
                ) : null}

                {/* 2. Latest Sprite Dispatch / Notification (or Active Focus fallback) */}
                {lastNotification ? (
                  <div className="rounded-2xl border-2 border-sky-200 bg-sky-50/70 p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-black tracking-wider text-blue-700 uppercase">
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        {lastNotification.badge || `${spriteName} Note`}
                      </span>

                      {lastNotification.audioUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            isPlaying
                              ? stopAudio()
                              : playAudioUrl(lastNotification.audioUrl!)
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-white px-2 py-0.5 text-[10px] font-black text-blue-600 hover:bg-sky-50"
                        >
                          {isPlaying ? (
                            <>
                              <Square className="h-2.5 w-2.5 fill-current" />
                              <span>Stop</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="h-3 w-3" />
                              <span>Listen</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <p className="mt-1.5 text-xs font-extrabold leading-relaxed text-slate-800">
                      &ldquo;{lastNotification.text}&rdquo;
                    </p>
                    {lastNotification.targetText && (
                      <p className="mt-0.5 text-[11px] font-black text-indigo-600">
                        &ldquo;{lastNotification.targetText}&rdquo;
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border-2 border-sky-100 bg-sky-50/60 px-4 py-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-black tracking-wider text-blue-600 uppercase">
                      <Compass className="h-3.5 w-3.5" />
                      <span>Active Focus</span>
                    </div>
                    <p className="mt-1 text-xs font-extrabold text-slate-800">
                      {aiBrain.currentLessonTitle}
                    </p>
                  </div>
                )}

                {/* 3. 3D Shortcuts Stack */}
                <div className="space-y-2.5">
                  {aiBrain.activeStepHref && (
                    <button
                      type="button"
                      onClick={handlePrimaryAction}
                      className="flex w-full items-center justify-between rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-4 py-3.5 text-left text-xs font-black text-white shadow-md transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0 sm:text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-300" />
                        <span>
                          {aiBrain.activeStepLabel || "Continue Path"}
                        </span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0" />
                    </button>
                  )}

                  <Link
                    href="/conversation"
                    onClick={closeChat}
                    className="flex w-full items-center justify-between rounded-2xl border-2 border-b-4 border-emerald-200 border-b-emerald-300 bg-emerald-50/70 px-4 py-3 text-xs font-black text-emerald-900 transition hover:-translate-y-0.5 hover:bg-emerald-50"
                  >
                    <span className="flex items-center gap-2">
                      <MessagesSquare className="h-4 w-4 text-emerald-600" />
                      <span>Live 3-Min AI Tutor Call</span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-emerald-600" />
                  </Link>

                  <Link
                    href="/conversation/review"
                    onClick={closeChat}
                    className="flex w-full items-center justify-between rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-white px-4 py-3 text-xs font-black text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50"
                  >
                    <span className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-blue-600" />
                      <span>Report Card &amp; 3-Min Workouts</span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}