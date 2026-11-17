// components/learning-hub/generation-cycle-card.tsx
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Sparkles } from "lucide-react";
import type { UserGenerationData } from "@/lib/upstash";

const LOCALE_NAMES: Record<string, string> = {
  "en-US": "English",
  "fr-FR": "French",
  "es-ES": "Spanish",
  "de-DE": "German",
  "it-IT": "Italian",
  "pt-BR": "Portuguese",
  "ja-JP": "Japanese",
  "ko-KR": "Korean",
  "zh-CN": "Chinese",
  "ru-RU": "Russian",
  "ar-SA": "Arabic",
};

const STAGES = [
  {
    id: "analyzing",
    label: "Analyzing",
    startSec: 0,
    endSec: 18,
    getTitle: (name: string, lang: string) =>
      `Analyzing ${name}'s ${lang} profile...`,
    getSub: (level: string, goal: string) =>
      `Calibrating ${level} baseline around ${goal} and speaking targets.`,
  },
  {
    id: "designing",
    label: "Designing",
    startSec: 18,
    endSec: 38,
    getTitle: (_: string, lang: string) =>
      `Designing your ${lang} curriculum...`,
    getSub: () =>
      `Mapping progression curves, speaking drills, and scenario checkpoints.`,
  },
  {
    id: "spoons",
    label: "Spoons",
    startSec: 38,
    endSec: 65,
    getTitle: () => `Building your first Spoons...`,
    getSub: () =>
      `Generating bite-sized core audio lessons, scene visuals, and dialogue.`,
  },
  {
    id: "vocabs",
    label: "Vocab Bridges",
    startSec: 65,
    endSec: 90,
    getTitle: () => `Synthesizing Vocab & voices...`,
    getSub: () =>
      `Extracting key scene words and generating native voice actors.`,
  },
  {
    id: "bosses",
    label: "Boss Arena",
    startSec: 90,
    endSec: 108,
    getTitle: () => `Setting up your Boss Stage...`,
    getSub: () =>
      `Configuring Boss avatar moods, 3-heart rules, and timed challenges.`,
  },
  {
    id: "ready",
    label: "Almost Ready",
    startSec: 108,
    endSec: 9999,
    getTitle: (_: string, lang: string) =>
      `Almost Ready! Finalizing your ${lang} hub...`,
    getSub: () =>
      `Putting the final touches on Spoon 1. Opening your hub automatically...`,
  },
];

export function GenerationCycleCard({ data }: { data: UserGenerationData }) {
  const [elapsed, setElapsed] = useState(0);

  const firstName = data.firstName || "Learner";
  const targetLang =
    (data.targetLanguage && LOCALE_NAMES[data.targetLanguage]) ||
    data.targetLanguage ||
    "Language";
  const nativeLang =
    (data.nativeLanguage && LOCALE_NAMES[data.nativeLanguage]) ||
    data.nativeLanguage ||
    "";
  const level = data.level || "beginner";
  const goal = data.goal || "fluency";

  const isVivi = data.spriteSlug === "vivi";
  const companionName = isVivi ? "Vivi" : "Vox";
  const companionAvatar = isVivi ? "/sprite-f.png" : "/sprite-m.png";

  useEffect(() => {
    const startTime = data.createdAt || Date.now();

    const tick = () => {
      const diff = Math.floor((Date.now() - startTime) / 1000);
      setElapsed(Math.max(0, diff));
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [data.createdAt]);

  const foundIndex = STAGES.findIndex(
    (s) => elapsed >= s.startSec && elapsed < s.endSec,
  );
  const activeIndex = foundIndex === -1 ? STAGES.length - 1 : foundIndex;
  const activeStage = STAGES[activeIndex];

  const progress = Math.min(97, Math.max(4, Math.round((elapsed / 115) * 100)));

  return (
    <div className="fixed inset-0 z-50 flex min-h-screen w-full flex-col items-center justify-center overflow-hidden animate-bg px-4 py-8 font-sans text-slate-900 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-slate-950/15 backdrop-blur-[1px]" />

      <div className="relative z-10 w-full max-w-2xl">
        {/* Top Context Pills */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-slate-950/45 px-4 py-1.5 text-xs font-black tracking-wide text-white uppercase shadow-sm backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>Spoon Academy Setup</span>
          </span>

          <div className="flex flex-wrap items-center gap-2 text-xs font-black text-white">
            {nativeLang && (
              <span className="rounded-full border border-white/20 bg-slate-950/45 px-3 py-1 backdrop-blur-md">
                {nativeLang} → {targetLang}
              </span>
            )}
            <span className="rounded-full border border-white/20 bg-slate-950/45 px-3 py-1 capitalize backdrop-blur-md">
              {level}
            </span>
            <span className="rounded-full border border-white/20 bg-slate-950/45 px-3 py-1 capitalize backdrop-blur-md">
              {goal}
            </span>
          </div>
        </div>

        {/* Main 3D White Spoon Card */}
        <div className="relative overflow-hidden rounded-[2rem] border-2 border-b-[6px] border-slate-200 border-b-slate-300 bg-white p-6 shadow-2xl sm:p-9">
          {/* Top Status + Percentage */}
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-[11px] font-black tracking-wider text-blue-700 uppercase">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
              <span>
                Step {activeIndex + 1} of {STAGES.length} • {activeStage.label}
              </span>
            </span>

            <span className="rounded-xl border-b-2 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-3 py-1 text-xs font-black text-white shadow-2xs">
              {progress}%
            </span>
          </div>

          {/* Vox / Vivi Avatar + Dynamic Stage Headline */}
          <div className="my-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative shrink-0 self-start sm:self-center">
              <div className="h-16 w-16 overflow-hidden rounded-2xl border-2 border-b-4 border-sky-400 border-b-blue-600 bg-slate-100 shadow-md sm:h-20 sm:w-20">
                <img
                  src={companionAvatar}
                  alt={companionName}
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <span className="absolute -right-1 -bottom-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
            </div>

            <div className="min-h-[76px] min-w-0 flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStage.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                >
                  <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                    {activeStage.getTitle(firstName, targetLang)}
                  </h1>
                  <p className="mt-1.5 text-xs font-semibold leading-relaxed text-slate-500 sm:text-sm">
                    {activeStage.getSub(level, goal)}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* 3D Progress Bar */}
          <div className="mb-7 h-3.5 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 shadow-inner ring-1 ring-slate-200/70">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-emerald-400 transition-all duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* 6 3D Tactile Stage Pills */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {STAGES.map((stage, idx) => {
              const isDone = idx < activeIndex;
              const isCurrent = idx === activeIndex;

              return (
                <div
                  key={stage.id}
                  className={`flex items-center gap-2.5 rounded-2xl border-2 px-3.5 py-2.5 text-xs font-black tracking-wide transition-all duration-300 ${
                    isDone
                      ? "border-emerald-200 border-b-4 border-b-emerald-300 bg-emerald-50/70 text-emerald-800"
                      : isCurrent
                        ? "border-sky-400 border-b-4 border-b-blue-600 bg-sky-50 text-slate-900 shadow-sm"
                        : "border-slate-200/70 bg-slate-50/70 text-slate-400"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-black ${
                      isDone
                        ? "border-b-2 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white"
                        : isCurrent
                          ? "border-b-2 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white"
                          : "bg-slate-200/80 text-slate-500"
                    }`}
                  >
                    {isDone ? (
                      <Check className="h-3.5 w-3.5 stroke-[3.5]" />
                    ) : (
                      idx + 1
                    )}
                  </span>
                  <span className="truncate">{stage.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Reassurance */}
        <p className="mt-5 text-center text-xs font-extrabold text-white/95 drop-shadow-[0_1px_4px_rgba(15,23,42,0.3)]">
          {companionName} is putting your {targetLang} hub together. It will
          open automatically when ready!
        </p>
      </div>
    </div>
  );
}