// components/foundation/boss/boss-foundation-freestyle.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Heart,
  RotateCcw,
  Zap,
  Loader2,
  Volume2,
  VolumeX,
  Sparkles,
} from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import {
  BossMessage,
  useBossFoundation,
} from "@/context/boss-context";
import { BossFoundationFreestyleChatBubble } from "./boss-freestyle-chat-bubble";
import { useWordAudio } from "@/context/word-audio-context";
import { ExerciseBlock } from "./exercise-block";

interface Props {
  onEnd: () => void;
  onRetry: () => void;
  introVideoUrl?: string;
  coverImageUrl?: string;
  scenarioData?: unknown;
}

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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [videoFinished, setVideoFinished] = useState(false);

  const showThinking = isAiProcessing && !isRecording;

  const hasPendingExercise = messages.some(
    (message) => message.exercise && message.status === "pending",
  );

  const progressPercent =
    totalExercises > 0
      ? Math.min((currentIndex / totalExercises) * 100, 100)
      : 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, transcript, isProcessing, isAiProcessing]);

  // Pause intro video once the user clicks "Begin"
  useEffect(() => {
    if (hasStartedExercises && videoRef.current) {
      videoRef.current.pause();
    }
  }, [hasStartedExercises]);

  return (
    <div className="relative mx-auto flex h-[calc(100vh-2rem)] max-h-[900px] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-xl">
      {/* Failed state */}
      {stageStatus === "FAILED" && (
        <div className="absolute inset-0 z-50 flex animate-in flex-col items-center justify-center bg-white/95 p-8 text-center backdrop-blur-sm duration-500 zoom-in-95">
          <div className="mb-6 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-rose-200 bg-rose-50 shadow-lg">
            <img
              src={getBossAvatarUrl("angry")}
              alt={boss?.name || "Boss"}
              className="h-full w-full object-cover"
            />
          </div>

          <h2 className="mb-3 text-3xl font-extrabold text-slate-900">
            Out of Hearts!
          </h2>

          <p className="mb-8 max-w-sm font-medium text-slate-500">
            {boss?.name} was not impressed. Take a deep breath and try the
            encounter again.
          </p>

          <button
            type="button"
            onClick={onRetry}
            className="flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 py-4 text-lg font-extrabold text-white shadow-sm transition-all hover:bg-indigo-500 active:translate-y-1 active:border-b-0"
          >
            <RotateCcw size={20} />
            Retry Encounter
          </button>

          <button
            type="button"
            onClick={onEnd}
            className="mt-4 font-bold text-slate-400 transition-colors hover:text-slate-600"
          >
            Flee Battle
          </button>
        </div>
      )}

      {/* Stats header */}
      <div className="z-10 flex shrink-0 flex-col gap-3 border-b border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100 shadow-sm">
              <img
                src={bossAvatarUrl}
                alt={boss?.name ? `${boss.name} avatar` : "Boss avatar"}
                className="h-full w-full object-cover transition-all duration-300"
              />
            </div>

            <h4 className="hidden text-sm font-extrabold uppercase tracking-wide text-slate-900 sm:block">
              {boss?.name || "Milestone Boss"}
            </h4>
          </div>

          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((heartIndex) => (
              <Heart
                key={heartIndex}
                size={22}
                className={`transition-all duration-300 ${
                  heartIndex <= chances
                    ? "scale-100 fill-rose-500 text-rose-500 drop-shadow-sm"
                    : "scale-90 fill-slate-200 text-slate-200"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5">
            <Zap size={18} className="fill-amber-500 text-amber-500" />
            <span className="text-sm font-extrabold text-amber-600">
              {xp} XP
            </span>
          </div>
        </div>

        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-amber-400 transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Chat and exercise area */}
      <div className="relative flex-1 overflow-hidden bg-slate-50/50">
        <ScrollArea className="h-full w-full">
          <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-8">
            {/* ===============================================================
                BOSS INTRO VIDEO CUTSCENE (Shown before exercises begin!)
                =============================================================== */}
            {introVideoUrl && !hasStartedExercises && (
              <div className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border-2 border-indigo-500/20 bg-slate-950 shadow-xl animate-in fade-in zoom-in-95 duration-300">
                <div className="relative aspect-[16/9] w-full">
                  <video
                    ref={videoRef}
                    src={introVideoUrl}
                    poster={coverImageUrl}
                    autoPlay
                    loop
                    muted={isVideoMuted}
                    playsInline
                    onEnded={() => setVideoFinished(true)}
                    className="h-full w-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25" />

                  {/* Top Left Cutscene Pill */}
                  <div className="absolute top-3.5 left-3.5 inline-flex items-center gap-1.5 rounded-full bg-slate-950/75 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-300 backdrop-blur-md">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{boss?.name || "Boss"} Intro</span>
                  </div>

                  {/* Top Right Mute/Unmute Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsVideoMuted((prev) => !prev)}
                    className="absolute top-3.5 right-3.5 rounded-full bg-slate-950/75 p-2 text-white transition hover:bg-slate-900 backdrop-blur-md"
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
            )}

            {messages.length === 0 && !isProcessing && !isRecording && (
              <div className="flex min-h-[200px] flex-col items-center justify-center text-center opacity-60">
                <p className="text-sm font-medium text-slate-500">
                  Initializing challenge...
                </p>
              </div>
            )}

            {messages.map((message: BossMessage) => {
              if (!message.exercise) {
                return (
                  <BossFoundationFreestyleChatBubble
                    key={message.id}
                    message={message}
                    aiAvatarUrl={getBossAvatarUrl(message.mood || "default")}
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
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  </MarkerIcon>
                  <MarkerContent className="text-sm font-medium text-slate-500">
                    Boss is thinking...
                  </MarkerContent>
                </Marker>
              </div>
            )}

            <div ref={messagesEndRef} className="h-4" />
          </div>
        </ScrollArea>
      </div>

      {/* Bottom action bar */}
      <div className="relative z-10 flex shrink-0 flex-col gap-4 border-t border-slate-200 bg-white p-4 sm:p-6 md:flex-row">
        {!hasStartedExercises ? (
          <button
            type="button"
            onClick={startExercises}
            className={`flex w-full animate-in items-center justify-center rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 py-4 text-lg font-extrabold text-white shadow-sm transition-all slide-in-from-bottom-2 hover:bg-indigo-500 active:translate-y-1 active:border-b-0 ${
              videoFinished ? "ring-4 ring-indigo-300" : ""
            }`}
          >
            {isProcessing ? "Skip Intro & Begin" : "I'm Ready, Let's Begin"}
          </button>
        ) : stageStatus === "PLAYING" ? (
          <div className="flex flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-4 text-center">
            <span className="text-sm font-bold uppercase tracking-wider text-slate-500">
              {hasPendingExercise
                ? "Complete the exercise above to continue"
                : isAiProcessing
                  ? "Waiting for the boss to finish speaking..."
                  : "Waiting for the next exercise..."}
            </span>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-2xl border-2 border-slate-200 bg-slate-50 px-6 py-4">
            <p className="font-bold uppercase tracking-widest text-slate-400">
              Encounter {stageStatus}
            </p>
          </div>
        )}

        {stageStatus === "PASSED" && (
          <button
            type="button"
            onClick={onEnd}
            className="flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 px-8 py-4 text-lg font-extrabold text-white shadow-sm transition-all hover:bg-emerald-400 active:translate-y-1 active:border-b-0 md:w-auto"
          >
            Claim Victory
            <ArrowRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
}