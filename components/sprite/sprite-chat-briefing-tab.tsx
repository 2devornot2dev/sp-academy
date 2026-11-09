// components/sprite/sprite-chat-briefing-tab.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Mic2,
  ArrowRight,
  Zap,
  Dumbbell,
  Loader2,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  X,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import { useSprite } from "@/context/sprite-context";
import { invokeSpriteExercise } from "@/app/actions/invoke-sprite-exercise";
import {
  getActiveSpriteExercise,
  type HydratedSpriteExercise,
} from "@/app/actions/complete-sprite-exercise";
import { SpriteExerciseArcade } from "./sprite-exercise-arcade";
import type { ChatContextData } from "./sprite-chat-utils";

interface SpriteChatBriefingTabProps {
  spriteName: string;
  aiBrain: ChatContextData;
  onTriggerPractice: (word: string) => void;
}

export function SpriteChatBriefingTab({
  spriteName,
  aiBrain,
  onTriggerPractice,
}: SpriteChatBriefingTabProps) {
  const {
    profile,
    liveTask,
    dbNotifications,
    dismissDbNotification,
    retryLiveTask,
  } = useSprite();
  const userId = profile?.userId;

  const [activeExercise, setActiveExercise] =
    useState<HydratedSpriteExercise | null>(null);
  const [isLoadingExercise, setIsLoadingExercise] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [isPlayingArcade, setIsPlayingArcade] = useState(false);

  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const refreshExercise = useCallback(async () => {
    if (!userId) return;
    setIsLoadingExercise(true);
    try {
      const ex = await getActiveSpriteExercise(userId);
      setActiveExercise(ex);
      if (ex?.status === "READY" || ex?.status === "COMPLETED") {
        setIsGenerating(false);
      } else if (ex?.status === "FAILED") {
        setIsGenerating(false);
      }
    } catch (err) {
      console.warn("[BriefingTab] Failed to fetch active exercise:", err);
    } finally {
      setIsLoadingExercise(false);
    }
  }, [userId]);

  useEffect(() => {
    void refreshExercise();
  }, [refreshExercise, liveTask?.status]);

  // Poll every 5 seconds ONLY while actively generating a workout in this session
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      void refreshExercise();
    }, 5000);
    const timeout = setTimeout(() => {
      setIsGenerating(false);
    }, 45000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isGenerating, refreshExercise]);

  const handleBuildNewWorkout = async () => {
    if (!userId) return;
    setGenError(null);
    setIsGenerating(true);

    const res = await invokeSpriteExercise({ userId });
    if (!res.ok) {
      setIsGenerating(false);
      setGenError(res.error);
      return;
    }

    await refreshExercise();
  };

  if (
    isPlayingArcade &&
    userId &&
    activeExercise &&
    (activeExercise.status === "READY" ||
      activeExercise.status === "COMPLETED") &&
    activeExercise.content
  ) {
    return (
      <div className="-mx-5 -my-4 flex-1 flex flex-col">
        <SpriteExerciseArcade
          userId={userId}
          exerciseId={activeExercise.id}
          title={activeExercise.title}
          spriteName={spriteName}
          content={activeExercise.content}
          onFinishExercise={() => {
            setIsPlayingArcade(false);
            void refreshExercise();
          }}
          onClose={() => setIsPlayingArcade(false)}
        />
      </div>
    );
  }

  const isBuildingNow =
    isGenerating ||
    (liveTask?.taskType === "SPRITE_EXERCISE_GENERATION" &&
      liveTask.status === "BUILDING");

  const isReadyToPlay =
    activeExercise?.status === "READY" && Boolean(activeExercise.content);

  const isCompletedWorkout =
    activeExercise?.status === "COMPLETED" && Boolean(activeExercise.content);

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto custom-scrollbar">
      {/* 1. DB-BACKED SYSTEM NOTIFICATIONS (Errors, Alerts) */}
      {dbNotifications.map((notif) => {
        const isErrorKind =
          notif.kind === "SYSTEM_ERROR" ||
          notif.kind === "BOSS_BUILD_FAILED" ||
          notif.kind === "EXERCISE_BUILD_FAILED";

        return (
          <div
            key={notif.id}
            className={`relative overflow-hidden rounded-3xl border p-5 shadow-lg shrink-0 ${
              isErrorKind
                ? "border-rose-500/30 bg-rose-950/40"
                : "border-sky-500/30 bg-sky-950/40"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm ${
                    isErrorKind
                      ? "bg-gradient-to-b from-rose-500 to-rose-700"
                      : "bg-gradient-to-b from-sky-400 to-blue-600"
                  }`}
                >
                  {isErrorKind ? (
                    <AlertTriangle size={20} />
                  ) : (
                    <Sparkles size={20} />
                  )}
                </span>
                <div>
                  <h3
                    className={`text-sm font-black uppercase tracking-wider ${
                      isErrorKind ? "text-rose-400" : "text-sky-400"
                    }`}
                  >
                    {notif.title || "System Alert"}
                  </h3>
                  <p className="text-sm font-medium text-white mt-0.5">
                    {notif.body}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => dismissDbNotification(notif.id)}
                className="rounded-full p-1.5 text-slate-400 transition hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {isErrorKind && (
                <button
                  type="button"
                  onClick={async () => {
                    const taskId = (notif.payload as any)?.taskId;
                    if (taskId) {
                      await retryLiveTask(taskId);
                    }
                    await dismissDbNotification(notif.id);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-rose-900/50 transition hover:bg-rose-500"
                >
                  <RotateCcw size={14} /> Retry Generation
                </button>
              )}

              {notif.detail && (
                <button
                  type="button"
                  onClick={() =>
                    setExpandedLogId(
                      expandedLogId === notif.id ? null : notif.id,
                    )
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 transition hover:text-white"
                >
                  View Error Log{" "}
                  <ChevronDown
                    size={14}
                    className={expandedLogId === notif.id ? "rotate-180" : ""}
                  />
                </button>
              )}
            </div>

            {expandedLogId === notif.id && notif.detail && (
              <div className="mt-3 rounded-xl border border-white/5 bg-slate-950/80 p-3">
                <pre className="custom-scrollbar max-h-40 overflow-y-auto whitespace-pre-wrap font-mono text-[10px] text-slate-400">
                  {notif.detail}
                </pre>
              </div>
            )}
          </div>
        );
      })}

      {/* 2. Active Lesson Objective Card */}
      <div className="relative shrink-0 overflow-hidden rounded-3xl border border-teal-500/30 bg-gradient-to-br from-teal-950/60 via-indigo-950/50 to-slate-900/80 p-5 shadow-lg">
        <span className="mb-1 block text-[10px] font-black tracking-widest text-teal-400 uppercase">
          Active Lesson Objective
        </span>
        <h2 className="text-lg font-extrabold text-white">
          {aiBrain.currentLessonTitle}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-300">
          Click any priority target below to immediately launch a 1-on-1
          practice session with {spriteName}.
        </p>
      </div>

      {/* 3. 3-ROUND SPRITE EXERCISE CARD */}
      <div
        className={`relative shrink-0 overflow-hidden rounded-3xl border p-5 shadow-lg transition ${
          isCompletedWorkout
            ? "border-teal-500/35 bg-gradient-to-r from-teal-950/50 via-slate-900/90 to-slate-950/90"
            : "border-amber-400/35 bg-gradient-to-r from-amber-950/40 via-indigo-950/60 to-slate-900/90"
        }`}
      >
        <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center justify-between">
          <div className="flex items-start gap-3.5">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-md ${
                isCompletedWorkout
                  ? "border-teal-400/40 bg-teal-400/15 text-teal-300"
                  : "border-amber-300/40 bg-amber-400/15 text-amber-300"
              }`}
            >
              {isCompletedWorkout ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <Dumbbell className="h-5 w-5" />
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-black text-white">
                  {isCompletedWorkout
                    ? "Sprite Exercise Completed!"
                    : "3-Round Mistake Repair Arcade"}
                </h3>
                {isCompletedWorkout ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-teal-400/40 bg-teal-400/20 px-2 py-0.5 text-[9px] font-black text-teal-300 uppercase">
                    ✓ +1 ⚡ Claimed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-300 px-2 py-0.5 text-[9px] font-black text-slate-950 uppercase">
                    +1 <Zap className="h-2.5 w-2.5 fill-current" /> Reward
                  </span>
                )}
              </div>

              <p className="mt-1 text-xs font-medium leading-relaxed text-slate-300">
                {isCompletedWorkout
                  ? `Milestone ${
                      activeExercise?.currentMilestone ?? ""
                    } Sprite Exercise complete! Beat Boss Stage ${
                      activeExercise?.currentMilestone ?? ""
                    } to unlock your next +1 ⚡ exercise.`
                  : isReadyToPlay
                    ? `Your custom 3-round Sprite Exercise (${activeExercise?.title}) is ready!`
                    : `Visual Match · Binary Sentence Dash · 3x Voice Burst built from your recent Chalkboard mistakes.`}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {isCompletedWorkout ? (
              <button
                type="button"
                onClick={() => setIsPlayingArcade(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-teal-400/40 bg-teal-500/15 px-3.5 py-2 text-xs font-extrabold text-teal-200 transition hover:bg-teal-500/25"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Replay Practice</span>
              </button>
            ) : isReadyToPlay ? (
              <button
                type="button"
                onClick={() => setIsPlayingArcade(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-teal-300 px-4 py-2.5 text-xs font-black text-slate-950 shadow-lg transition hover:brightness-110"
              >
                <Zap className="h-3.5 w-3.5 fill-current" />
                <span>Play 3-Round Workout</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isBuildingNow || isLoadingExercise}
                onClick={handleBuildNewWorkout}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-black text-white shadow-lg transition hover:bg-indigo-400 disabled:opacity-60"
              >
                {isBuildingNow ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Baking Workout...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Build Repair Workout</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        {genError && (
          <p className="mt-2.5 rounded-xl border border-rose-500/30 bg-rose-950/50 px-3 py-1.5 text-xs font-semibold text-rose-200">
            {genError}
          </p>
        )}
      </div>

      {/* 4. Priority Targets Row */}
      {(aiBrain.topWord || aiBrain.topPhrase) && (
        <div className="shrink-0 space-y-2">
          <span className="block text-[11px] font-black tracking-wider text-slate-300 uppercase">
            Priority Targets (Click to Launch in Session)
          </span>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {aiBrain.topWord && (
              <button
                onClick={() => onTriggerPractice(aiBrain.topWord!.word)}
                className="group relative flex overflow-hidden items-center justify-between rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-slate-900/90 to-indigo-950/50 p-4 text-left shadow-md transition hover:border-indigo-400"
              >
                <div>
                  <span className="block text-base font-extrabold text-white transition group-hover:text-indigo-300">
                    {aiBrain.topWord.word}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-400">
                    {aiBrain.topWord.translation || "Vocabulary word"}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {aiBrain.topWord.avgSpokenScore != null && (
                    <span className="rounded-md border border-rose-500/30 bg-rose-500/20 px-2 py-0.5 text-[10px] font-black text-rose-300">
                      <Mic2 className="mr-1 inline h-3 w-3" />
                      {aiBrain.topWord.avgSpokenScore}%
                    </span>
                  )}
                  <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-300" />
                </div>
              </button>
            )}

            {aiBrain.topPhrase && (
              <button
                onClick={() => onTriggerPractice(aiBrain.topPhrase!.word)}
                className="group relative flex overflow-hidden items-center justify-between rounded-2xl border border-teal-500/30 bg-gradient-to-br from-slate-900/90 to-teal-950/50 p-4 text-left shadow-md transition hover:border-teal-400"
              >
                <div>
                  <span className="block text-base font-extrabold text-white transition group-hover:text-teal-300">
                    {aiBrain.topPhrase.word}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-400">
                    {aiBrain.topPhrase.translation || "Key phrase"}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {aiBrain.topPhrase.avgSpokenScore != null && (
                    <span className="rounded-md border border-teal-500/30 bg-teal-500/20 px-2 py-0.5 text-[10px] font-black text-teal-300">
                      <Mic2 className="mr-1 inline h-3 w-3" />
                      {aiBrain.topPhrase.avgSpokenScore}%
                    </span>
                  )}
                  <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-teal-300" />
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 5. FLEX-1 COSMETIC TELEMETRY & VECTOR RADAR DECK */}
      <div className="relative flex min-h-[220px] flex-1 flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/75 via-[#090E1A]/90 to-indigo-950/40 p-5 shadow-xl">
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-40"
          viewBox="0 0 600 340"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="briefingWave" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.05" />
              <stop offset="50%" stopColor="#2DD4BF" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#818CF8" stopOpacity="0.05" />
            </linearGradient>
            <radialGradient id="radarCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.22" />
              <stop offset="60%" stopColor="#6366F1" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
            </radialGradient>
          </defs>

          <circle cx="300" cy="170" r="150" fill="url(#radarCore)" />
          <circle cx="300" cy="170" r="130" stroke="#334155" strokeWidth="1" strokeDasharray="4 6" />
          <circle cx="300" cy="170" r="90" stroke="#2DD4BF" strokeOpacity="0.25" strokeWidth="1" />
          <circle cx="300" cy="170" r="50" stroke="#818CF8" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="2 4" />

          <line x1="80" y1="170" x2="520" y2="170" stroke="#1E293B" strokeWidth="1" />
          <line x1="300" y1="20" x2="300" y2="320" stroke="#1E293B" strokeWidth="1" />

          <path d="M 40 170 Q 105 90, 170 170 T 300 170 T 430 170 T 560 170" stroke="url(#briefingWave)" strokeWidth="2.5" fill="none" />
          <path d="M 40 170 Q 105 230, 170 170 T 300 170 T 430 170 T 560 170" stroke="url(#briefingWave)" strokeWidth="1.25" strokeDasharray="3 3" fill="none" />

          <circle cx="210" cy="145" r="4" fill="#2DD4BF" />
          <circle cx="390" cy="195" r="4" fill="#818CF8" />
          <circle cx="335" cy="115" r="3" fill="#F472B6" />
          <circle cx="245" cy="215" r="3" fill="#38BDF8" />
        </svg>

        <div className="relative z-10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-ping rounded-full bg-teal-400" />
            <span className="text-[10px] font-black tracking-widest text-teal-300 uppercase">
              {spriteName} Neural Acoustic Sync
            </span>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-[10px] font-bold text-slate-400">
            {aiBrain.targetLang.toUpperCase()} · LIVE
          </span>
        </div>

        <div className="relative z-10 my-auto flex flex-col items-center justify-center py-3 text-center">
          <div className="mb-2.5 flex h-9 items-end justify-center gap-1.5">
            {[40, 75, 55, 100, 65, 85, 50, 95, 60, 80, 45].map((h, i) => (
              <span
                key={i}
                style={{ height: `${h}%` }}
                className={`w-1.5 rounded-full ${
                  i % 2 === 0
                    ? "bg-gradient-to-t from-teal-500/40 to-teal-300"
                    : "bg-gradient-to-t from-indigo-500/40 to-indigo-300"
                }`}
              />
            ))}
          </div>

          <p className="text-sm font-extrabold tracking-tight text-white">
            {aiBrain.avgPronunciation > 0
              ? `${aiBrain.avgPronunciation}% Spoken Resonance Index`
              : "Calibrated for 1-on-1 Chalkboard Drills"}
          </p>
          <p className="mt-0.5 max-w-xs text-[11px] font-medium text-slate-400">
            {spriteName} adapts grammar hints, accent checks, and chalkboard
            drills in real time as you answer.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10px] font-black tracking-wider text-slate-400 uppercase">
              Active Bank:
            </span>
            {(aiBrain.recentWords && aiBrain.recentWords.length > 0
              ? aiBrain.recentWords.slice(0, 4).map((w) => w.word)
              : ["J'ai faim", "J'ai soif", "fatigué", "de l'eau"]
            ).map((word, idx) => (
              <span
                key={idx}
                className="rounded-lg border border-white/10 bg-slate-950/70 px-2.5 py-1 text-[11px] font-bold text-slate-200"
              >
                {word}
              </span>
            ))}
          </div>

          <span className="text-[10px] font-bold text-teal-400/90">
            ⚡ Chalkboard Ready
          </span>
        </div>
      </div>
    </div>
  );
}