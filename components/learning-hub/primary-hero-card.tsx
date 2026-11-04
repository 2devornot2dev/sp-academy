// primary-hero-card.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Headphones,
  Loader2,
  Mic,
  Quote,
  Swords,
  Zap,
  Sparkles,
  Clock,
} from "lucide-react";
import type { LearningPath } from "@/app/actions/get-learning-path";
import { vocabWordCount } from "@/lib/utils";

type Lesson = LearningPath["lessons"][number];

const BOSS_THEMES = [
  {
    name: "neon-fuchsia",
    scrim: "from-slate-950 via-slate-950/80 to-fuchsia-950/40",
    glow: "radial-gradient(circle at 85% 20%, rgba(217, 70, 239, 0.28), transparent 60%)",
    badge: "border-fuchsia-400/35 bg-fuchsia-500/20 text-fuchsia-200",
    icon: "text-fuchsia-300",
    accentText: "text-fuchsia-300",
    avatarBorder: "border-fuchsia-400/75 shadow-fuchsia-500/30",
    button:
      "from-fuchsia-500 to-indigo-600 shadow-fuchsia-500/30 hover:from-fuchsia-400 hover:to-indigo-500",
  },
  {
    name: "cyber-emerald",
    scrim: "from-slate-950 via-slate-950/80 to-teal-950/40",
    glow: "radial-gradient(circle at 85% 20%, rgba(16, 185, 129, 0.28), transparent 60%)",
    badge: "border-emerald-400/35 bg-emerald-500/20 text-emerald-200",
    icon: "text-emerald-300",
    accentText: "text-emerald-300",
    avatarBorder: "border-emerald-400/75 shadow-emerald-500/30",
    button:
      "from-emerald-500 to-teal-600 shadow-emerald-500/30 hover:from-emerald-400 hover:to-teal-500",
  },
  {
    name: "electric-cyan",
    scrim: "from-slate-950 via-slate-950/80 to-cyan-950/40",
    glow: "radial-gradient(circle at 85% 20%, rgba(6, 182, 212, 0.28), transparent 60%)",
    badge: "border-cyan-400/35 bg-cyan-500/20 text-cyan-200",
    icon: "text-cyan-300",
    accentText: "text-cyan-300",
    avatarBorder: "border-cyan-400/75 shadow-cyan-500/30",
    button:
      "from-cyan-500 to-blue-600 shadow-cyan-500/30 hover:from-cyan-400 hover:to-blue-500",
  },
] as const;

type PrimaryHeroCardProps = {
  path: LearningPath | null;
  vocabDue?: Lesson;
  nextLesson?: Lesson;
  bossDue?: Lesson;
  waitingOnSpoon?: boolean;
  waitingOnVocab: boolean;
  waitingOnBoss?: boolean;
  getLessonHref: (id: string) => string;
  getBossHref?: (bossId: string, lessonId: string) => string;
  displayTitles?: Map<string, string>;
};

export function PrimaryHeroCard({
  path,
  vocabDue,
  nextLesson,
  bossDue,
  waitingOnSpoon = false,
  waitingOnVocab,
  waitingOnBoss = false,
  getLessonHref,
  getBossHref,
  displayTitles,
}: PrimaryHeroCardProps) {
  const [themeIndex, setThemeIndex] = useState(0);

  useEffect(() => {
    setThemeIndex(Math.floor(Math.random() * BOSS_THEMES.length));
  }, []);

  const theme = BOSS_THEMES[themeIndex];

  if (!path) {
    return (
      <div className="rounded-3xl bg-white/80 p-8 shadow-sm backdrop-blur-md">
        <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
          Getting Started
        </span>
        <h3 className="mt-2 text-2xl font-black text-slate-900">
          Welcome to your curriculum
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Hold tight while your initial learning path is being prepared.
        </p>
      </div>
    );
  }

  // 1. WAITING ON GENERATION
  if (waitingOnSpoon || waitingOnVocab || waitingOnBoss) {
    const spoonNum =
      nextLesson?.orderIndex ??
      vocabDue?.orderIndex ??
      bossDue?.orderIndex ??
      1;

    // Safely format title if lesson exists, otherwise default to Spoon {spoonNum}
    const waitingSpoonTitle = nextLesson
      ? displayTitles?.get(nextLesson.id) || nextLesson.title || `Spoon ${spoonNum}`
      : `Spoon ${spoonNum}`;

    return (
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-7 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-teal-500/15 blur-3xl" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/20 px-3.5 py-1 text-xs font-extrabold tracking-wide text-indigo-200 uppercase">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-300" />
            {waitingOnSpoon
              ? `Crafting ${waitingSpoonTitle}`
              : waitingOnBoss
                ? "Building Boss Arena"
                : `Building Vocab Bridge ${spoonNum}`}
          </div>

          <h3 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">
            {waitingOnSpoon
              ? `Personalizing ${waitingSpoonTitle} for you...`
              : waitingOnBoss
                ? "Designing Your Boss Stage Scenario..."
                : "Synthesizing Your Vocab Bridge..."}
          </h3>

          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
            {waitingOnSpoon
              ? "Our language engine is generating your custom audio, speaking drills, and visual scene. This takes about 20–30 seconds."
              : "Preparing your interactive checkpoint. Ready in just a moment..."}
          </p>

          <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-5">
            <div className="h-2 w-48 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-indigo-400" />
            </div>
            <span className="text-xs font-bold text-indigo-300">
              Auto-updating when ready...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 2. BOSS STAGE READY
  if (bossDue?.bossStage) {
    const bossStage = bossDue.bossStage;
    const milestoneNum =
      bossStage.milestoneIndex ?? Math.ceil(bossDue.orderIndex / 3);
    const startSpoon = Math.max(1, bossDue.orderIndex - 2);
    const scenario = bossStage.scenarioData;
    const boss = scenario?.boss;

    const coverUrl =
      bossStage.coverUrl || boss?.coverUrl || bossDue.imageUrl || null;
    const avatarUrl = bossStage.avatarUrl || boss?.avatar?.default || null;

    const bossName =
      boss?.name ||
      scenario?.title ||
      `Milestone ${milestoneNum}: AI Conversation Checkpoint`;

    const bossPersona =
      boss?.persona ||
      scenario?.description ||
      `Put Spoons ${startSpoon}–${bossDue.orderIndex} to the test to unlock the next unit.`;

    const bossHref = getBossHref
      ? getBossHref(bossStage.id, bossDue.id)
      : `/foundation/boss/${bossStage.id}`;

    return (
      <div className="group relative overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl shadow-indigo-950/15 transition-colors duration-700">
        {coverUrl && (
          <img
            src={coverUrl}
            alt={bossName}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-55 transition-transform duration-700 group-hover:scale-105"
          />
        )}

        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-r transition-all duration-700 ${theme.scrim}`}
        />
        <div
          className="pointer-events-none absolute inset-0 transition-all duration-700"
          style={{ background: theme.glow }}
        />

        <div className="relative z-10 p-7 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-extrabold tracking-wide uppercase backdrop-blur-md ${theme.badge}`}
            >
              <Swords className={`h-3.5 w-3.5 ${theme.icon}`} />
              Milestone {milestoneNum} Boss Stage
            </span>

            <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/75 px-3 py-1 text-xs font-bold text-slate-200 backdrop-blur-md">
              <span>🎯 Covers Spoons {startSpoon}–{bossDue.orderIndex}</span>
              {scenario?.rules?.passingScore && (
                <>
                  <span className="text-white/30">•</span>
                  <span className={theme.accentText}>
                    Pass: {scenario.rules.passingScore}/
                    {scenario.rules.totalExercises}
                  </span>
                </>
              )}
            </span>
          </div>

          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
            {avatarUrl && (
              <div className="relative shrink-0">
                <div
                  className={`h-24 w-24 overflow-hidden rounded-2xl border-2 bg-slate-900 shadow-lg sm:h-28 sm:w-28 ${theme.avatarBorder}`}
                >
                  <img
                    src={avatarUrl}
                    alt={bossName}
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="absolute -right-1.5 -bottom-1.5 rounded-full bg-emerald-400 px-2 py-0.5 text-[10px] font-black tracking-wider text-slate-950 uppercase shadow">
                  Boss
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <span
                className={`text-xs font-extrabold tracking-wider uppercase ${theme.accentText}`}
              >
                Milestone Challenger
              </span>
              <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                {bossName}
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-200 line-clamp-2">
                {bossPersona}
              </p>
            </div>
          </div>

          {boss?.introMessage && (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur-md">
              <div className="flex items-start gap-3">
                <Quote
                  className={`mt-0.5 h-4 w-4 shrink-0 rotate-180 ${theme.icon}`}
                />
                <p className="text-xs leading-relaxed font-medium text-slate-100 italic sm:text-sm">
                  &ldquo;{boss.introMessage}&rdquo;
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Mic className={`h-4 w-4 ${theme.icon}`} />
              <span>Live AI Checkpoint • 15 Exercises</span>
            </div>

            <Link
              href={bossHref}
              className={`inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r px-7 py-3.5 text-sm font-extrabold text-white shadow-lg transition-all active:scale-95 ${theme.button}`}
            >
              Challenge {bossName.split(",")[0]}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. VOCAB BRIDGE READY
  if (vocabDue?.bridge) {
    const isMilestoneLesson = vocabDue.orderIndex % 3 === 0;
    const unlockTargetText = isMilestoneLesson
      ? `Milestone ${vocabDue.orderIndex / 3} Boss Stage`
      : `Spoon ${vocabDue.orderIndex + 1}`;

    const words =
      (vocabDue.bridge.vocabMoment as Array<{
        word: string;
        gloss?: string;
      }>) ?? [];

    const bridgeTitle =
      displayTitles?.get(vocabDue.id) || vocabDue.title || `Spoon ${vocabDue.orderIndex}`;

    return (
      <div className="group relative overflow-hidden rounded-3xl border border-amber-200/90 bg-white text-slate-900 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Left Content */}
          <div className="flex flex-col justify-between p-7 sm:p-8 md:col-span-7">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3.5 py-1 text-xs font-extrabold tracking-wide text-amber-900 uppercase">
                  <Zap className="h-3.5 w-3.5 fill-amber-500 text-amber-600" />
                  Vocab Bridge {vocabDue.orderIndex}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                  🔓 Unlocks {unlockTargetText}
                </span>
              </div>

              <h3 className="mt-4 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Review: {bridgeTitle}
              </h3>
              <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-600">
                Master the {vocabWordCount(vocabDue.bridge.vocabMoment)} core
                expressions from Spoon {vocabDue.orderIndex} to unlock{" "}
                <span className="font-extrabold text-amber-700">
                  {unlockTargetText}
                </span>
                .
              </p>

              {words.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {words.slice(0, 5).map((w, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50/90 ring-1 ring-amber-200/80 px-3 py-1 text-xs font-extrabold text-slate-900"
                    >
                      <span className="text-amber-700">{w.word}</span>
                      {w.gloss && (
                        <span className="font-semibold text-slate-500">
                          • {w.gloss}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
              <span className="text-xs font-bold text-slate-500">
                ⚡ ~3 min interactive recall
              </span>
              <Link
                href={`/foundation/vocab/${vocabDue.bridge.id}`}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-7 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.02] active:scale-95"
              >
                Start Bridge {vocabDue.orderIndex}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Right Clear Scene Artwork */}
          <div className="relative min-h-[220px] overflow-hidden bg-slate-900 md:col-span-5">
            {vocabDue.imageUrl && (
              <img
                src={vocabDue.imageUrl}
                alt={vocabDue.title ?? "Vocab Image"}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent md:bg-gradient-to-r md:from-white/20 md:to-transparent" />
          </div>
        </div>
      </div>
    );
  }

  // 4. NEXT SPOON READY
  if (nextLesson) {
    const milestoneNum = Math.ceil(nextLesson.orderIndex / 3);
    const stepInMilestone = ((nextLesson.orderIndex - 1) % 3) + 1; // 1, 2, or 3
    const titleToDisplay =
      displayTitles?.get(nextLesson.id) || nextLesson.title || `Spoon ${nextLesson.orderIndex}`;

    return (
      <div className="group relative overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl ring-1 ring-white/10">
        {/* Right-aligned Bright Artwork with Smooth Left Gradient Blend */}
        {nextLesson.imageUrl && (
          <div className="pointer-events-none absolute inset-y-0 right-0 w-full md:w-[58%] overflow-hidden">
            <img
              src={nextLesson.imageUrl}
              alt={nextLesson.imageAlt ?? "Spoon Image"}
              className="h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-105"
            />
            {/* Smooth blend into the dark left text column */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/30" />
          </div>
        )}

        <div className="relative z-10 flex flex-col justify-between p-7 sm:p-9">
          <div className="max-w-xl">
            {/* Top Status & Session Duration Pills */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3.5 py-1 text-xs font-extrabold tracking-wide text-emerald-300 uppercase backdrop-blur-md">
                <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400" />
                Spoon {nextLesson.orderIndex} Ready
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-200 backdrop-blur-md">
                <Clock className="h-3.5 w-3.5 text-sky-300" />
                5–7 min session
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-bold text-indigo-200 backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
                Unit {milestoneNum} • Part {stepInMilestone} of 3
              </span>
            </div>

            {/* Title with Roman Numeral */}
            <h2 className="mt-5 text-2xl font-black tracking-tight text-white sm:text-4xl">
              Spoon {nextLesson.orderIndex}: {titleToDisplay}
            </h2>
            <p className="mt-2.5 max-w-lg text-sm leading-relaxed text-slate-300 sm:text-base">
              Master essential speech patterns, native pronunciation, and
              interactive listening drills in this bite-sized audio lesson.
            </p>
          </div>

          {/* Bottom Bar: Feature Tags + Primary Start CTA */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <Headphones className="h-4 w-4 text-sky-400" />
                Interactive Audio Lesson
              </span>
              <span className="text-white/20">•</span>
              <span className="inline-flex items-center gap-1.5">
                <Mic className="h-4 w-4 text-emerald-400" />
                Live Speech Coaching
              </span>
            </div>

            <Link
              href={getLessonHref(nextLesson.id)}
              className="inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400 px-8 py-3.5 text-sm font-black text-slate-950 shadow-xl shadow-sky-500/25 transition-all hover:scale-[1.02] hover:brightness-110 active:scale-95"
            >
              <span>Start Spoon {nextLesson.orderIndex}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white/80 p-7 backdrop-blur-md">
      <h3 className="text-2xl font-black text-slate-900">All caught up! 🎉</h3>
      <p className="mt-1 text-sm text-slate-500">
        You&apos;ve completed every available spoon on this track.
      </p>
    </div>
  );
}