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
  const { profile, liveTask } = useSprite();
  const userId = profile?.userId;

  const [activeExercise, setActiveExercise] =
    useState<HydratedSpriteExercise | null>(null);
  const [isLoadingExercise, setIsLoadingExercise] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [isPlayingArcade, setIsPlayingArcade] = useState(false);
  const [energyCount, setEnergyCount] = useState<number>(
    (profile as any)?.energy ?? 1
  );

  const refreshExercise = useCallback(async () => {
    if (!userId) return;
    setIsLoadingExercise(true);
    try {
      const ex = await getActiveSpriteExercise(userId);
      setActiveExercise(ex);
      if (ex?.status === "READY") {
        setIsGenerating(false);
      } else if (ex?.status === "BUILDING") {
        setIsGenerating(true);
      }
    } catch (err) {
      console.warn("[BriefingTab] Failed to fetch active exercise:", err);
    } finally {
      setIsLoadingExercise(false);
    }
  }, [userId]);

  // Fetch on mount & whenever liveTask transitions (e.g. when Pusher signals completion)
  useEffect(() => {
    void refreshExercise();
  }, [refreshExercise, liveTask?.status]);

  const handleGenerateOrLaunch = async () => {
    if (!userId) return;
    setGenError(null);

    // If a READY exercise is already waiting, launch the 3-Round Arcade immediately!
    if (activeExercise?.status === "READY" && activeExercise.content) {
      setIsPlayingArcade(true);
      return;
    }

    setIsGenerating(true);
    const res = await invokeSpriteExercise({ userId });
    if (!res.ok) {
      setIsGenerating(false);
      setGenError(res.error);
      return;
    }

    await refreshExercise();
  };

  // If the user clicked "Play Workout", render the 3-Round Arcade full-stage!
  if (
    isPlayingArcade &&
    userId &&
    activeExercise?.status === "READY" &&
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
          onFinishExercise={(newEnergy) => {
            setEnergyCount(newEnergy);
            setIsPlayingArcade(false);
            setActiveExercise(null);
          }}
          onClose={() => setIsPlayingArcade(false)}
        />
      </div>
    );
  }

  const isBuildingNow =
    isGenerating ||
    activeExercise?.status === "BUILDING" ||
    (liveTask?.taskType === "SPRITE_EXERCISE_GENERATION" &&
      liveTask.status === "BUILDING");

  const isReadyToPlay =
    activeExercise?.status === "READY" && Boolean(activeExercise.content);

  return (
    <div className="flex-1 flex flex-col gap-4">
      {/* 1. Active Lesson Objective Card */}
     // Inside components/sprite/sprite-chat-briefing-tab.tsx:

      {/* 1. Active Lesson Objective Card */}
      <div className="relative overflow-hidden rounded-3xl border border-teal-500/30 bg-gradient-to-br from-teal-950/60 via-indigo-950/50 to-slate-900/80 p-5 shadow-lg shrink-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-teal-400">
            Active Lesson Objective
          </span>

          {/* ⚡ 3-Slot Energy Meter in Briefing Tab */}
          <div className="inline-flex items-center gap-1 rounded-full bg-slate-950/80 border border-amber-300/40 px-2.5 py-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 mr-0.5">
              Energy
            </span>
            {[1, 2, 3].map((slot) => (
              <Zap
                key={slot}
                className={`h-3.5 w-3.5 transition-all ${
                  slot <= energyCount
                    ? "text-amber-300 fill-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                    : "text-slate-600 fill-slate-800/80"
                }`}
              />
            ))}
          </div>
        </div>

        <h2 className="text-lg font-extrabold text-white">
          {aiBrain.currentLessonTitle}
        </h2>
        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
          Click any priority target below to launch a 1-on-1 practice session,
          or run a 3-round repair workout to earn{" "}
          <span className="text-amber-300 font-bold">+1 ⚡ Energy</span>.
        </p>
      </div>

      {/* 2. SPRITE REPAIR ARCADE LAUNCHER CARD (+1 ⚡ ENERGY) */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-400/35 bg-gradient-to-r from-amber-950/40 via-indigo-950/60 to-slate-900/90 p-5 shadow-lg shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-300/40 bg-amber-400/15 text-amber-300 shadow-md">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white">
                  3-Round Mistake Repair Arcade
                </h3>
                <span className="rounded-md bg-amber-300 px-2 py-0.5 text-[9px] font-black uppercase text-slate-950">
                  +1 ⚡ Reward
                </span>
              </div>
              <p className="text-xs font-medium text-slate-300 mt-0.5 leading-relaxed">
                {isReadyToPlay
                  ? `Your custom 3-round workout (${activeExercise?.title}) is ready!`
                  : `Visual Match · Binary Sentence Dash · 3x Voice Burst built from your recent Chalkboard mistakes.`}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isBuildingNow || isLoadingExercise}
            onClick={handleGenerateOrLaunch}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition shrink-0 shadow-lg ${
              isReadyToPlay
                ? "bg-gradient-to-r from-amber-300 to-teal-300 text-slate-950 hover:brightness-110"
                : "bg-indigo-500 text-white hover:bg-indigo-400 disabled:opacity-60"
            }`}
          >
            {isBuildingNow ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Baking Workout...</span>
              </>
            ) : isReadyToPlay ? (
              <>
                <Zap className="h-3.5 w-3.5 fill-current" />
                <span>Play 3-Round Workout</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Build Repair Workout</span>
              </>
            )}
          </button>
        </div>

        {genError && (
          <p className="mt-2.5 rounded-xl border border-rose-500/30 bg-rose-950/50 px-3 py-1.5 text-xs font-semibold text-rose-200">
            {genError}
          </p>
        )}
      </div>

      {/* 3. Priority Targets Row */}
      {(aiBrain.topWord || aiBrain.topPhrase) && (
        <div className="space-y-2 shrink-0">
          <span className="block text-[11px] font-black uppercase tracking-wider text-slate-300">
            Priority Targets (Click to Launch in Session)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {aiBrain.topWord && (
              <button
                onClick={() => onTriggerPractice(aiBrain.topWord!.word)}
                className="group relative overflow-hidden flex items-center justify-between rounded-2xl bg-gradient-to-br from-slate-900/90 to-indigo-950/50 p-4 border border-indigo-500/30 hover:border-indigo-400 transition text-left shadow-md"
              >
                <div>
                  <span className="font-extrabold text-white text-base block group-hover:text-indigo-300 transition">
                    {aiBrain.topWord.word}
                  </span>
                  <span className="text-xs text-slate-400 block mt-0.5">
                    {aiBrain.topWord.translation || "Vocabulary word"}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {aiBrain.topWord.avgSpokenScore != null && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/30 text-rose-300">
                      <Mic2 className="h-3 w-3 inline mr-1" />
                      {aiBrain.topWord.avgSpokenScore}%
                    </span>
                  )}
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 group-hover:text-indigo-300 transition" />
                </div>
              </button>
            )}

            {aiBrain.topPhrase && (
              <button
                onClick={() => onTriggerPractice(aiBrain.topPhrase!.word)}
                className="group relative overflow-hidden flex items-center justify-between rounded-2xl bg-gradient-to-br from-slate-900/90 to-teal-950/50 p-4 border border-teal-500/30 hover:border-teal-400 transition text-left shadow-md"
              >
                <div>
                  <span className="font-extrabold text-white text-base block group-hover:text-teal-300 transition">
                    {aiBrain.topPhrase.word}
                  </span>
                  <span className="text-xs text-slate-400 block mt-0.5">
                    {aiBrain.topPhrase.translation || "Key phrase"}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {aiBrain.topPhrase.avgSpokenScore != null && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-teal-500/20 border border-teal-500/30 text-teal-300">
                      <Mic2 className="h-3 w-3 inline mr-1" />
                      {aiBrain.topPhrase.avgSpokenScore}%
                    </span>
                  )}
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 group-hover:text-teal-300 transition" />
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. FLEX-1 COSMETIC TELEMETRY & VECTOR RADAR DECK */}
      <div className="relative flex-1 min-h-[220px] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/75 via-[#090E1A]/90 to-indigo-950/40 p-5 flex flex-col justify-between shadow-xl">
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
          <circle
            cx="300"
            cy="170"
            r="130"
            stroke="#334155"
            strokeWidth="1"
            strokeDasharray="4 6"
          />
          <circle
            cx="300"
            cy="170"
            r="90"
            stroke="#2DD4BF"
            strokeOpacity="0.25"
            strokeWidth="1"
          />
          <circle
            cx="300"
            cy="170"
            r="50"
            stroke="#818CF8"
            strokeOpacity="0.3"
            strokeWidth="1"
            strokeDasharray="2 4"
          />

          <line
            x1="80"
            y1="170"
            x2="520"
            y2="170"
            stroke="#1E293B"
            strokeWidth="1"
          />
          <line
            x1="300"
            y1="20"
            x2="300"
            y2="320"
            stroke="#1E293B"
            strokeWidth="1"
          />

          <path
            d="M 40 170 Q 105 90, 170 170 T 300 170 T 430 170 T 560 170"
            stroke="url(#briefingWave)"
            strokeWidth="2.5"
            fill="none"
          />
          <path
            d="M 40 170 Q 105 230, 170 170 T 300 170 T 430 170 T 560 170"
            stroke="url(#briefingWave)"
            strokeWidth="1.25"
            strokeDasharray="3 3"
            fill="none"
          />

          <circle cx="210" cy="145" r="4" fill="#2DD4BF" />
          <circle cx="390" cy="195" r="4" fill="#818CF8" />
          <circle cx="335" cy="115" r="3" fill="#F472B6" />
          <circle cx="245" cy="215" r="3" fill="#38BDF8" />
        </svg>

        <div className="relative z-10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-teal-400 animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-widest text-teal-300">
              {spriteName} Neural Acoustic Sync
            </span>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-[10px] font-bold text-slate-400">
            {aiBrain.targetLang.toUpperCase()} · LIVE
          </span>
        </div>

        <div className="relative z-10 my-auto py-3 flex flex-col items-center justify-center text-center">
          <div className="flex items-end justify-center gap-1.5 h-9 mb-2.5">
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

          <p className="text-sm font-extrabold text-white tracking-tight">
            {aiBrain.avgPronunciation > 0
              ? `${aiBrain.avgPronunciation}% Spoken Resonance Index`
              : "Calibrated for 1-on-1 Chalkboard Drills"}
          </p>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5 max-w-xs">
            {spriteName} adapts grammar hints, accent checks, and chalkboard
            drills in real time as you answer.
          </p>
        </div>

        <div className="relative z-10 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1">
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