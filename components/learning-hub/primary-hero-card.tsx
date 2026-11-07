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
  Crown,
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
    avatarBorder: "border-fuchsia-400/80 border-b-4 shadow-fuchsia-500/30",
    button3D:
      "border-purple-950 bg-gradient-to-b from-violet-500 via-purple-600 to-fuchsia-600 text-white shadow-purple-500/30",
  },
  {
    name: "cyber-emerald",
    scrim: "from-slate-950 via-slate-950/80 to-teal-950/40",
    glow: "radial-gradient(circle at 85% 20%, rgba(16, 185, 129, 0.28), transparent 60%)",
    badge: "border-emerald-400/35 bg-emerald-500/20 text-emerald-200",
    icon: "text-emerald-300",
    accentText: "text-emerald-300",
    avatarBorder: "border-emerald-400/80 border-b-4 shadow-emerald-500/30",
    button3D:
      "border-emerald-800 bg-gradient-to-b from-teal-400 to-emerald-600 text-white shadow-emerald-500/30",
  },
  {
    name: "electric-cyan",
    scrim: "from-slate-950 via-slate-950/80 to-cyan-950/40",
    glow: "radial-gradient(circle at 85% 20%, rgba(6, 182, 212, 0.28), transparent 60%)",
    badge: "border-cyan-400/35 bg-cyan-500/20 text-cyan-200",
    icon: "text-cyan-300",
    accentText: "text-cyan-300",
    avatarBorder: "border-cyan-400/80 border-b-4 shadow-cyan-500/30",
    button3D:
      "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-blue-500/30",
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
      <div className="rounded-3xl border-2 border-b-[6px] border-slate-200 bg-white p-8 shadow-sm">
        <span className="text-xs font-black tracking-wider text-slate-400 uppercase">
          Getting Started
        </span>
        <h3 className="mt-2 text-2xl font-black text-slate-900">
          Welcome to your curriculum
        </h3>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Hold tight while your initial learning path is being prepared.
        </p>
      </div>
    );
  }

  // =========================================================================
  // 1. WAITING ON GENERATION (3D Tactile Loading Stage)
  // =========================================================================
  if (waitingOnSpoon || waitingOnVocab || waitingOnBoss) {
    const spoonNum =
      nextLesson?.orderIndex ??
      vocabDue?.orderIndex ??
      bossDue?.orderIndex ??
      1;

    const waitingSpoonTitle = nextLesson
      ? displayTitles?.get(nextLesson.id) ||
        nextLesson.title ||
        `Spoon ${spoonNum}`
      : `Spoon ${spoonNum}`;

    return (
      <div className="relative overflow-hidden rounded-3xl border-2 border-b-[6px] border-indigo-950/90 bg-slate-950 p-7 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-xl border-b-2 border-indigo-800 bg-indigo-500/25 px-3.5 py-1 text-xs font-black tracking-wide text-indigo-200 uppercase">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-300" />
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

          <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-slate-300">
            {waitingOnSpoon
              ? "Our language engine is generating your custom audio, speaking drills, and visual scene. This takes about 20–30 seconds."
              : "Preparing your interactive checkpoint. Ready in just a moment..."}
          </p>

          <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-5">
            <div className="h-2.5 w-48 overflow-hidden rounded-full bg-white/10 p-0.5">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-sky-400 to-emerald-400" />
            </div>
            <span className="text-xs font-extrabold text-sky-300">
              Auto-updating when ready...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. BOSS STAGE READY (3D Tertiary Purple/Fuchsia Arena Card)
  // =========================================================================
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

    const totalEx = scenario?.rules?.totalExercises ?? 15;

    return (
      <div className="group relative overflow-hidden rounded-3xl border-2 border-b-[6px] border-purple-950/90 bg-slate-950 text-white shadow-xl transition-colors duration-700">
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
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-black tracking-wide uppercase backdrop-blur-md ${theme.badge}`}
            >
              <Crown className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
              Milestone {milestoneNum} Boss Stage
            </span>

            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/80 px-3 py-1 text-xs font-extrabold text-slate-200 backdrop-blur-md">
              <span>🎯 Covers Spoons {startSpoon}–{bossDue.orderIndex}</span>
              {scenario?.rules?.passingScore && (
                <>
                  <span className="text-white/30">•</span>
                  <span className={theme.accentText}>
                    Pass: {scenario.rules.passingScore}/{totalEx}
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
                <span className="absolute -right-1.5 -bottom-1.5 rounded-full border-b-2 border-emerald-700 bg-emerald-400 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-slate-950 uppercase shadow">
                  Boss
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <span
                className={`text-xs font-black tracking-wider uppercase ${theme.accentText}`}
              >
                Milestone Challenger
              </span>
              <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                {bossName}
              </h2>
              <p className="line-clamp-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-200">
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
                <p className="text-xs font-medium leading-relaxed text-slate-100 italic sm:text-sm">
                  &ldquo;{boss.introMessage}&rdquo;
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Swords className={`h-4 w-4 ${theme.icon}`} />
              <span>Live AI Checkpoint • {totalEx} Challenges</span>
            </div>

            <Link
              href={bossHref}
              className={`inline-flex items-center gap-2.5 rounded-2xl border-b-4 px-8 py-3.5 text-sm font-black shadow-xl transition-all hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:border-b-0 ${theme.button3D}`}
            >
              <span>Challenge {bossName.split(",")[0]}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. VOCAB BRIDGE READY (3D Split Cinema Card with Accent Amber Theme!)
  // =========================================================================
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
      displayTitles?.get(vocabDue.id) ||
      vocabDue.title ||
      `Spoon ${vocabDue.orderIndex}`;

    return (
      <div className="group relative overflow-hidden rounded-3xl border-2 border-b-[6px] border-indigo-950/90 bg-slate-950 text-white shadow-xl">
        {/* Right-aligned Bright Artwork with Smooth Left Gradient Blend */}
        {vocabDue.imageUrl && (
          <div className="pointer-events-none absolute inset-y-0 right-0 w-full overflow-hidden md:w-[56%]">
            <img
              src={vocabDue.imageUrl}
              alt={vocabDue.title ?? "Vocab Image"}
              className="h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/75 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/30" />
          </div>
        )}

        <div className="relative z-10 flex flex-col justify-between p-7 sm:p-9">
          <div className="max-w-xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/20 px-3.5 py-1 text-xs font-black tracking-wide text-amber-300 uppercase backdrop-blur-md">
                <Zap className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                Vocab Bridge {vocabDue.orderIndex} Ready
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-200 backdrop-blur-md">
                🔓 Unlocks {unlockTargetText}
              </span>
            </div>

            <h2 className="mt-5 text-2xl font-black tracking-tight text-white sm:text-4xl">
              Review: {bridgeTitle}
            </h2>

            <p className="mt-2 max-w-lg text-sm font-medium leading-relaxed text-slate-300 sm:text-base">
              Lock in the {vocabWordCount(vocabDue.bridge.vocabMoment)} core
              scene expressions from Spoon {vocabDue.orderIndex} to unlock{" "}
              <span className="font-black text-amber-300">
                {unlockTargetText}
              </span>
              .
            </p>

            {/* 3D Amber Word Preview Chips */}
            {words.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {words.slice(0, 5).map((w, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/30 bg-slate-900/85 px-3 py-1.5 text-xs font-black text-white backdrop-blur-md"
                  >
                    <Zap className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span className="text-amber-300">{w.word}</span>
                    {w.gloss && (
                      <span className="font-semibold text-slate-400">
                        • {w.gloss}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Zap className="h-4 w-4 text-amber-400" />
              <span>~3 Min Interactive Recall &amp; Pronunciation</span>
            </div>

            <Link
              href={`/foundation/vocab/${vocabDue.bridge.id}`}
              className="inline-flex items-center gap-2.5 rounded-2xl border-b-4 border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 px-8 py-3.5 text-sm font-black text-slate-950 shadow-xl shadow-amber-500/25 transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0"
            >
              <span>Start Bridge {vocabDue.orderIndex}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 4. NEXT SPOON READY (3D Split Cinema Card with Primary Blue CTA!)
  // =========================================================================
  if (nextLesson) {
    const milestoneNum = Math.ceil(nextLesson.orderIndex / 3);
    const stepInMilestone = ((nextLesson.orderIndex - 1) % 3) + 1;
    const titleToDisplay =
      displayTitles?.get(nextLesson.id) ||
      nextLesson.title ||
      `Spoon ${nextLesson.orderIndex}`;

    return (
      <div className="group relative overflow-hidden rounded-3xl border-2 border-b-[6px] border-indigo-950/90 bg-slate-950 text-white shadow-xl">
        {/* Right-aligned Bright Artwork with Smooth Left Gradient Blend */}
        {nextLesson.imageUrl && (
          <div className="pointer-events-none absolute inset-y-0 right-0 w-full overflow-hidden md:w-[58%]">
            <img
              src={nextLesson.imageUrl}
              alt={nextLesson.imageAlt ?? "Spoon Image"}
              className="h-full w-full object-cover opacity-85 transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/30" />
          </div>
        )}

        <div className="relative z-10 flex flex-col justify-between p-7 sm:p-9">
          <div className="max-w-xl">
            {/* Top Status & Session Duration Pills */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/35 bg-sky-500/20 px-3.5 py-1 text-xs font-black tracking-wide text-sky-300 uppercase backdrop-blur-md">
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
            <p className="mt-2.5 max-w-lg text-sm font-medium leading-relaxed text-slate-300 sm:text-base">
              Master essential speech patterns, native pronunciation, and
              interactive listening drills in this bite-sized audio lesson.
            </p>
          </div>

          {/* Bottom Bar: Feature Tags + 3D Primary Blue Start CTA */}
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
              className="inline-flex items-center gap-2.5 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-8 py-3.5 text-sm font-black text-white shadow-xl shadow-blue-500/30 transition-all hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:border-b-0"
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
    <div className="rounded-3xl border-2 border-b-[6px] border-slate-200 bg-white p-7 shadow-sm">
      <h3 className="text-2xl font-black text-slate-900">All caught up! 🎉</h3>
      <p className="mt-1 text-sm font-medium text-slate-500">
        You&apos;ve completed every available spoon on this track.
      </p>
    </div>
  );
}