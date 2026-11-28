// components/learning-hub/primary-hero-card.tsx
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
  Lock,
} from "lucide-react";
import type { LearningPath, LearningTrack } from "@/app/actions/get-learning-path";
import { vocabWordCount } from "@/lib/utils";

type Lesson = LearningTrack["lessons"][number];

/**
 * Image panel on the right side of the card. The panel itself is masked so the
 * photo dissolves into the card's own gradient on md+ (no hard seam where the
 * panel starts), and the tint overlays are semi-transparent so the image stays
 * vivid. On mobile the panel spans the full card, so a slightly stronger tint
 * keeps the text readable.
 */
const IMAGE_PANEL_MASK =
  "md:[mask-image:linear-gradient(to_right,transparent_0%,rgba(0,0,0,0.55)_22%,black_55%)] md:[-webkit-mask-image:linear-gradient(to_right,transparent_0%,rgba(0,0,0,0.55)_22%,black_55%)]";

const BOSS_THEMES = [
  {
    name: "neon-fuchsia",
    cardBg: "border-purple-950/40 bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 shadow-[0_12px_30px_rgba(147,51,234,0.28),inset_0_2px_0_rgba(255,255,255,0.3)]",
    scrim: "from-indigo-950/90 via-purple-950/70 to-fuchsia-900/30",
    glow: "radial-gradient(circle at 85% 20%, rgba(244, 114, 182, 0.35), transparent 60%)",
    badge: "border-white/30 bg-white/15 text-white",
    icon: "text-amber-300",
    accentText: "text-amber-200",
    avatarBorder: "border-white/80 border-b-4 shadow-purple-900/40",
    button3D:
      "border-amber-700 bg-gradient-to-b from-amber-300 via-amber-400 to-orange-500 text-slate-950 shadow-amber-500/30",
  },
  {
    name: "cyber-emerald",
    cardBg: "border-teal-950/40 bg-gradient-to-br from-blue-600 via-teal-600 to-emerald-600 shadow-[0_12px_30px_rgba(16,185,129,0.26),inset_0_2px_0_rgba(255,255,255,0.3)]",
    scrim: "from-slate-900/85 via-teal-950/65 to-emerald-900/25",
    glow: "radial-gradient(circle at 85% 20%, rgba(52, 211, 153, 0.35), transparent 60%)",
    badge: "border-white/30 bg-white/15 text-white",
    icon: "text-amber-300",
    accentText: "text-emerald-200",
    avatarBorder: "border-white/80 border-b-4 shadow-emerald-900/40",
    button3D:
      "border-amber-700 bg-gradient-to-b from-amber-300 via-amber-400 to-orange-500 text-slate-950 shadow-amber-500/30",
  },
  {
    name: "electric-cyan",
    cardBg: "border-blue-950/40 bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 shadow-[0_12px_30px_rgba(37,99,235,0.28),inset_0_2px_0_rgba(255,255,255,0.3)]",
    scrim: "from-blue-950/85 via-indigo-950/65 to-sky-900/25",
    glow: "radial-gradient(circle at 85% 20%, rgba(56, 189, 248, 0.35), transparent 60%)",
    badge: "border-white/30 bg-white/15 text-white",
    icon: "text-amber-300",
    accentText: "text-sky-200",
    avatarBorder: "border-white/80 border-b-4 shadow-blue-900/40",
    button3D:
      "border-emerald-800 bg-gradient-to-b from-emerald-300 via-emerald-400 to-teal-500 text-slate-950 shadow-emerald-500/30",
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
      <div className="rounded-3xl border-2 border-b-[6px] border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <span className="text-xs font-black tracking-wider text-slate-400 uppercase">
          Getting Started
        </span>
        <h3 className="mt-2 text-xl sm:text-2xl font-black text-slate-900">
          Welcome to your curriculum
        </h3>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Hold tight while your initial learning path is being prepared.
        </p>
      </div>
    );
  }

  // =========================================================================
  // 1. WAITING ON GENERATION
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
      <div className="relative overflow-hidden rounded-3xl border-b-[6px] border-indigo-950/40 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-5 text-white shadow-[0_12px_30px_rgba(37,99,235,0.28),inset_0_2px_0_rgba(255,255,255,0.3)] sm:p-8">
        <div className="pointer-events-none absolute -top-16 -left-10 h-52 w-52 rounded-full bg-cyan-400/30 blur-3xl animate-pulse" />
        <div
          className="pointer-events-none absolute -bottom-16 right-4 h-56 w-56 rounded-full bg-fuchsia-400/25 blur-3xl animate-pulse"
          style={{ animationDelay: "0.8s" }}
        />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/15 px-3.5 py-1 text-xs font-black tracking-wide text-white uppercase backdrop-blur-md">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-300" />
            {waitingOnSpoon
              ? `Crafting ${waitingSpoonTitle}`
              : waitingOnBoss
                ? "Building Boss Arena"
                : `Building Vocab Bridge ${spoonNum}`}
          </div>

          <h3 className="mt-4 text-xl font-black tracking-tight text-white drop-shadow-xs sm:text-3xl">
            {waitingOnSpoon
              ? `Personalizing ${waitingSpoonTitle} for you...`
              : waitingOnBoss
                ? "Designing Your Boss Stage Scenario..."
                : "Synthesizing Your Vocab Bridge..."}
          </h3>

          <p className="mt-2 max-w-xl text-xs sm:text-sm font-medium leading-relaxed text-sky-100">
            {waitingOnSpoon
              ? "Our language engine is generating your custom audio, speaking drills, and visual scene. This takes about 20–30 seconds."
              : "Preparing your interactive checkpoint. Ready in just a moment..."}
          </p>

          <div className="mt-5 sm:mt-6 flex items-center gap-3 border-t border-white/20 pt-4 sm:pt-5">
            <div className="h-2.5 w-40 sm:w-48 overflow-hidden rounded-full bg-white/20 p-0.5">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-amber-300 to-emerald-300" />
            </div>
            <span className="text-xs font-extrabold text-amber-200">
              Auto-updating when ready...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. BOSS STAGE READY (With Tilted LOCKED Stamp Overlay When Gated)
  // =========================================================================
  if (bossDue?.bossStage) {
    const bossStage = bossDue.bossStage;
    const isFreestyleUnlocked = (bossStage as any).freestyleUnlocked ?? true;
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

    const totalEx = scenario?.rules?.totalExercises ?? 10;

    return (
      <div
        className={`group relative overflow-hidden rounded-3xl border-b-[6px] text-white transition-colors duration-700 ${theme.cardBg}`}
      >
        {coverUrl && (
          <img
            src={coverUrl}
            alt={bossName}
            className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 ${
              isFreestyleUnlocked ? "opacity-45" : "opacity-25 grayscale-[40%]"
            }`}
          />
        )}

        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-r transition-all duration-700 ${theme.scrim}`}
        />
        <div
          className="pointer-events-none absolute inset-0 transition-all duration-700"
          style={{ background: theme.glow }}
        />

        {!isFreestyleUnlocked && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-16 right-4 z-20 -rotate-12 select-none sm:top-10 sm:right-8"
          >
            <div className="flex items-center gap-2 rounded-2xl border-4 border-rose-400 bg-slate-950/75 px-4 py-1.5 shadow-[0_0_25px_rgba(244,63,94,0.35)] backdrop-blur-xs sm:px-6 sm:py-2">
              <Lock className="h-4 w-4 sm:h-6 sm:w-6 text-rose-400" strokeWidth={3} />
              <span className="text-base sm:text-2xl font-black tracking-[0.22em] text-rose-400 uppercase">
                LOCKED
              </span>
            </div>
          </div>
        )}

        <div className="relative z-10 p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] sm:text-xs font-black tracking-wide uppercase backdrop-blur-md ${theme.badge}`}
            >
              <Crown className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
              Milestone {milestoneNum} Boss Stage
            </span>

            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[11px] sm:text-xs font-extrabold text-white backdrop-blur-md">
              <span>🎯 Spoons {startSpoon}–{bossDue.orderIndex}</span>
              {scenario?.rules?.passingScore && (
                <>
                  <span className="text-white/40">•</span>
                  <span className={theme.accentText}>
                    Pass: {scenario.rules.passingScore}/{totalEx}
                  </span>
                </>
              )}
            </span>
          </div>

          <div className="mt-5 sm:mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
            {avatarUrl && (
              <div className="relative w-fit shrink-0">
                <div
                  className={`relative h-20 w-20 sm:h-28 sm:w-28 overflow-hidden rounded-2xl border-2 bg-slate-900 shadow-lg ${theme.avatarBorder}`}
                >
                  <img
                    src={avatarUrl}
                    alt={bossName}
                    className={`h-full w-full object-cover ${
                      !isFreestyleUnlocked ? "opacity-45 grayscale" : ""
                    }`}
                  />
                  {!isFreestyleUnlocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/45">
                      <Lock className="h-7 w-7 sm:h-8 sm:w-8 text-rose-400 drop-shadow" />
                    </div>
                  )}
                </div>
                <span
                  className={`absolute -right-1.5 -bottom-1.5 rounded-full border-b-2 px-2.5 py-0.5 text-[10px] font-black tracking-wider uppercase shadow ${
                    isFreestyleUnlocked
                      ? "border-emerald-700 bg-emerald-400 text-slate-950"
                      : "border-rose-900 bg-rose-500 text-white"
                  }`}
                >
                  {isFreestyleUnlocked ? "Boss" : "Locked"}
                </span>
              </div>
            )}

            <div className="space-y-1">
              <span
                className={`text-[11px] sm:text-xs font-black tracking-wider uppercase ${theme.accentText}`}
              >
                Milestone Challenger
              </span>
              <h2 className="text-2xl font-black tracking-tight text-white drop-shadow-xs sm:text-3xl">
                {bossName}
              </h2>
              <p className="line-clamp-2 max-w-2xl text-xs sm:text-sm font-medium leading-relaxed text-white/90">
                {bossPersona}
              </p>
            </div>
          </div>

          {boss?.introMessage && (
            <div className="mt-4 sm:mt-5 rounded-2xl border border-white/20 bg-white/10 p-3.5 sm:p-4 backdrop-blur-md">
              <div className="flex items-start gap-2.5 sm:gap-3">
                <Quote
                  className={`mt-0.5 h-4 w-4 shrink-0 rotate-180 ${theme.icon}`}
                />
                <p className="text-xs font-medium leading-relaxed text-white italic sm:text-sm">
                  &ldquo;{boss.introMessage}&rdquo;
                </p>
              </div>
            </div>
          )}

          <div className="mt-5 sm:mt-6 flex flex-wrap items-center justify-between gap-3.5 sm:gap-4 border-t border-white/20 pt-4 sm:pt-5">
            {isFreestyleUnlocked ? (
              <>
                <div className="flex items-center gap-2 text-xs font-bold text-white/90">
                  <Swords className={`h-4 w-4 ${theme.icon}`} />
                  <span>Live AI Checkpoint • {totalEx} Challenges</span>
                </div>

                <Link
                  href={bossHref}
                  className={`inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-2xl border-b-4 px-7 py-3.5 text-sm font-black shadow-xl transition-all hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:border-b-0 ${theme.button3D}`}
                >
                  <span>Challenge {bossName.split(",")[0]}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-xs font-bold text-amber-200">
                  <Lock className="h-4 w-4 shrink-0 text-amber-300" />
                  <span>
                    Complete 1 Live 3-Min AI Conversation to Unlock Boss
                  </span>
                </div>

                <Link
                  href="/conversation"
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-2xl border-b-4 border-amber-700 bg-gradient-to-b from-amber-300 via-amber-400 to-orange-500 px-7 py-3.5 text-sm font-black text-slate-950 shadow-xl shadow-amber-500/30 transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0"
                >
                  <Mic className="h-4 w-4 shrink-0" />
                  <span>Unlock Boss: Start 3-Min AI Chat</span>
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. VOCAB BRIDGE READY
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
      <div className="group relative overflow-hidden rounded-3xl border-b-[6px] border-indigo-950/40 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white shadow-[0_12px_30px_rgba(37,99,235,0.28),inset_0_2px_0_rgba(255,255,255,0.3)]">
        <div className="pointer-events-none absolute -top-16 -left-10 h-52 w-52 rounded-full bg-amber-300/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-20 h-48 w-48 rounded-full bg-cyan-400/25 blur-3xl" />

        {vocabDue.imageUrl && (
          <div
            className={`pointer-events-none absolute inset-y-0 right-0 w-full overflow-hidden md:w-[62%] ${IMAGE_PANEL_MASK}`}
          >
            <img
              src={vocabDue.imageUrl}
              alt={vocabDue.title ?? "Vocab Image"}
              className="h-full w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105"
            />
            {/* Light tint: stronger on mobile for text contrast, subtle on md+ */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-700/70 via-indigo-700/45 to-indigo-700/10 md:from-blue-700/25 md:via-indigo-700/10 md:to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/45 via-transparent to-transparent" />
          </div>
        )}

        <div className="relative z-10 flex flex-col justify-between p-5 sm:p-9">
          <div className="max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/50 bg-amber-400/25 px-3 py-1 text-[11px] sm:text-xs font-black tracking-wide text-amber-200 uppercase backdrop-blur-md">
                <Zap className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                Vocab Bridge {vocabDue.orderIndex} Ready
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[11px] sm:text-xs font-bold text-white backdrop-blur-md">
                🔓 Unlocks {unlockTargetText}
              </span>
            </div>

            <h2 className="mt-4 sm:mt-5 text-2xl font-black tracking-tight text-white drop-shadow-xs sm:text-4xl">
              Review: {bridgeTitle}
            </h2>

            <p className="mt-2 max-w-lg text-xs sm:text-base font-medium leading-relaxed text-sky-100">
              Lock in the {vocabWordCount(vocabDue.bridge.vocabMoment)} core
              scene expressions from Spoon {vocabDue.orderIndex} to unlock{" "}
              <span className="font-black text-amber-300">
                {unlockTargetText}
              </span>
              .
            </p>

            {words.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5 sm:gap-2">
                {words.slice(0, 5).map((w, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/15 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-black text-white backdrop-blur-md"
                  >
                    <Zap className="h-3 w-3 fill-amber-300 text-amber-300" />
                    <span className="text-amber-200">{w.word}</span>
                    {w.gloss && (
                      <span className="font-semibold text-white/75">
                        • {w.gloss}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 sm:mt-7 flex flex-wrap items-center justify-between gap-3.5 sm:gap-4 border-t border-white/20 pt-4 sm:pt-5">
            <div className="flex items-center gap-2 text-xs font-bold text-white/90">
              <Zap className="h-4 w-4 text-amber-300" />
              <span>~3 Min Interactive Recall &amp; Pronunciation</span>
            </div>

            <Link
              href={`/foundation/vocab/${vocabDue.bridge.id}`}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-2xl border-b-4 border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 px-8 py-3.5 text-sm font-black text-slate-950 shadow-xl shadow-amber-500/25 transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0"
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
  // 4. NEXT SPOON READY
  // =========================================================================
  if (nextLesson) {
    const milestoneNum = Math.ceil(nextLesson.orderIndex / 3);
    const stepInMilestone = ((nextLesson.orderIndex - 1) % 3) + 1;
    const titleToDisplay =
      displayTitles?.get(nextLesson.id) ||
      nextLesson.title ||
      `Spoon ${nextLesson.orderIndex}`;

    return (
      <div className="group relative overflow-hidden rounded-3xl border-b-[6px] border-indigo-950/40 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white shadow-[0_12px_30px_rgba(37,99,235,0.28),inset_0_2px_0_rgba(255,255,255,0.3)]">
        <div className="pointer-events-none absolute -top-16 -left-10 h-52 w-52 rounded-full bg-cyan-400/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-20 h-48 w-48 rounded-full bg-fuchsia-400/25 blur-3xl" />

        {nextLesson.imageUrl && (
          <div
            className={`pointer-events-none absolute inset-y-0 right-0 w-full overflow-hidden md:w-[62%] ${IMAGE_PANEL_MASK}`}
          >
            <img
              src={nextLesson.imageUrl}
              alt={nextLesson.imageAlt ?? "Spoon Image"}
              className="h-full w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105"
            />
            {/* Light tint: stronger on mobile for text contrast, subtle on md+ */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-700/70 via-indigo-700/45 to-indigo-700/10 md:from-blue-700/25 md:via-indigo-700/10 md:to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/45 via-transparent to-transparent" />
          </div>
        )}

        <div className="relative z-10 flex flex-col justify-between p-5 sm:p-9">
          <div className="max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[11px] sm:text-xs font-black tracking-wide text-white uppercase backdrop-blur-md">
                <span className="h-2 w-2 animate-ping rounded-full bg-emerald-300" />
                Spoon {nextLesson.orderIndex} Ready
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[11px] sm:text-xs font-bold text-white backdrop-blur-md">
                <Clock className="h-3.5 w-3.5 text-sky-200" />
                5–7 min session
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[11px] sm:text-xs font-bold text-amber-200 backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                Unit {milestoneNum} • Part {stepInMilestone} of 3
              </span>
            </div>

            <h2 className="mt-4 sm:mt-5 text-2xl font-black tracking-tight text-white drop-shadow-xs sm:text-4xl">
              Spoon {nextLesson.orderIndex}: {titleToDisplay}
            </h2>
            <p className="mt-2 max-w-lg text-xs sm:text-base font-medium leading-relaxed text-sky-100">
              Master essential speech patterns, native pronunciation, and
              interactive listening drills in this bite-sized audio lesson.
            </p>
          </div>

          <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/20 pt-4 sm:pt-5">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-bold text-white/90">
              <span className="inline-flex items-center gap-1.5">
                <Headphones className="h-4 w-4 text-sky-200" />
                Interactive Audio Lesson
              </span>
              <span className="hidden sm:inline text-white/30">•</span>
              <span className="inline-flex items-center gap-1.5">
                <Mic className="h-4 w-4 text-emerald-300" />
                Live Speech Coaching
              </span>
            </div>

            <Link
              href={getLessonHref(nextLesson.id)}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-2xl border-b-4 border-emerald-800 bg-gradient-to-b from-emerald-300 via-emerald-400 to-teal-500 px-8 py-3.5 text-sm font-black text-slate-950 shadow-xl shadow-emerald-500/25 transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0"
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
    <div className="rounded-3xl border-2 border-b-[6px] border-slate-200 bg-white p-6 sm:p-7 shadow-sm">
      <h3 className="text-xl sm:text-2xl font-black text-slate-900">
        All caught up! 🎉
      </h3>
      <p className="mt-1 text-sm font-medium text-slate-500">
        You&apos;ve completed every available spoon on this track.
      </p>
    </div>
  );
}