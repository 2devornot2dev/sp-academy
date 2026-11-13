// components/freestyle/review/freestyle-review-hub.tsx
"use client";

import { Fragment, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  Sparkles,
  Trophy,
  Volume2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Swords,
  Loader2,
  Check,
  BarChart3,
  Wrench,
  Mic,
  Crown,
  Quote,
} from "lucide-react";
import {
  FreestyleGrammarReview,
  type RepairCardItem,
} from "./freestyle-grammar-review";
import { FreestylePronunciationReview } from "./freestyle-pronunciation-review";
import { useSprite } from "@/context/sprite-context";
import { getAlphaGrade, type TrickyWordItem } from "@/lib/freestyle/grades";
import { getFreestyleTutor } from "@/lib/freestyle/tutors";

type Step = 1 | 2 | 3 | "celebration";

export interface ReviewApiResponse {
  session: SessionData;
  review: ReviewData;
  trickyWords?: TrickyWordItem[];
}

interface Props {
  sessionId: string;
  initialData?: ReviewApiResponse | null;
  onComplete?: () => void;
}

const STEPS = [
  { id: 1, label: "Scorecard & Wins", icon: BarChart3 },
  { id: 2, label: "Fix & Upgrade Deck", icon: Wrench },
  { id: 3, label: "Word Lab & Speaking", icon: Mic },
] as const;

function getBarColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return "bg-slate-600";
  if (score >= 90) return "bg-gradient-to-r from-emerald-400 to-teal-400";
  if (score >= 80) return "bg-gradient-to-r from-sky-400 to-blue-500";
  if (score >= 70) return "bg-gradient-to-r from-amber-300 to-orange-400";
  return "bg-gradient-to-r from-rose-400 to-pink-500";
}

export function FreestyleReviewHub({
  sessionId,
  initialData = null,
  onComplete,
}: Props) {
  const [step, setStep] = useState<Step>(1);
  const [data, setData] = useState<ReviewApiResponse | null>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const { avatarSrc, spriteName } = useSprite();

  useEffect(() => {
    if (initialData) return;
    fetch(`/api/freestyle/review/${sessionId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.review) setData(res);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sessionId, initialData]);

  const playSpriteOutroAudio = async (outro?: SpriteOutro | null) => {
    if (!outro) return;
    const playUrl = (url: string) =>
      new Promise<void>((resolve) => {
        const audio = new Audio(url);
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      });

    if (outro.nativeAudioUrl) {
      await playUrl(outro.nativeAudioUrl);
    }
    if (outro.targetAudioUrl) {
      await playUrl(outro.targetAudioUrl);
    }
  };

  const repairCards = useMemo<RepairCardItem[]>(() => {
    if (!data?.review) return [];
    const list: RepairCardItem[] = [];
    const seenOriginals = new Set<string>();

    for (const [idx, m] of (data.review.mistakes || []).entries()) {
      const norm = m.mistake.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
      if (norm) seenOriginals.add(norm);
      list.push({
        id: `fix-${idx}`,
        kind: "FIX",
        badge: `${m.category} FIX`,
        severity: m.severity,
        original: m.mistake,
        improved: m.correction,
        explanation: m.explanation,
      });
    }

    for (const [idx, u] of (data.review.vocabUpgrades || []).entries()) {
      const norm = u.original.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
      if (norm && seenOriginals.has(norm)) continue;
      list.push({
        id: `upg-${idx}`,
        kind: "UPGRADE",
        badge: "NATIVE UPGRADE",
        original: u.original,
        improved: u.better,
        explanation: u.explanation,
      });
    }

    return list;
  }, [data?.review]);

  const practicePhrases = useMemo<string[]>(() => {
    if (!data?.review) return [];
    const pronMistakes = (data.review.mistakes || [])
      .filter((m) => m.category === "PRONUNCIATION")
      .map((m) => m.correction);
    const otherFixes = (data.review.mistakes || []).map((m) => m.correction);
    const upgrades = (data.review.vocabUpgrades || []).map((u) => u.better);

    const pool = Array.from(
      new Set([...pronMistakes, ...otherFixes, ...upgrades].filter(Boolean)),
    );
    return pool.slice(0, 3);
  }, [data?.review]);

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-slate-100 p-6">
        <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-b-[6px] border-slate-200 bg-white px-10 py-8 shadow-sm">
          <Loader2 className="h-9 w-9 animate-spin text-blue-600" />
          <p className="text-sm font-black tracking-wide text-slate-700 uppercase">
            Loading your AI Review...
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-slate-100 p-6">
        <div className="max-w-md space-y-4 rounded-3xl border-2 border-b-[6px] border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-base font-extrabold text-slate-700">
            Your AI Review is still baking...
          </p>
          <button
            onClick={onComplete}
            className="rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-6 py-3 text-sm font-black text-white shadow-md transition hover:brightness-105"
          >
            Back to All Reviews
          </button>
        </div>
      </div>
    );
  }

  const { session, review } = data;
  const trickyWords = data.trickyWords || [];

  const savedGender = (review.overallFeedback as any)?.voiceGender;
  const inferredGender =
    savedGender ||
    (JSON.stringify(review).toLowerCase().includes("antoine")
      ? "male"
      : "female");
  const tutor = getFreestyleTutor(inferredGender);

  const overallGrade = getAlphaGrade(review.metrics.overallScore);
  const skillRows = [
    { label: "Grammar", score: review.metrics.grammarScore },
    { label: "Vocabulary", score: review.metrics.vocabScore },
    { label: "Pronunciation", score: review.metrics.pronunciationScore },
    { label: "Fluency", score: review.metrics.fluencyScore },
  ];

  const triggerCelebration = () => {
    setStep("celebration");
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#6366F1", "#10B981", "#F59E0B", "#EC4899"],
    });
    if (review.spriteOutro) {
      void playSpriteOutroAudio(review.spriteOutro);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 font-sans text-slate-900 selection:bg-indigo-100">
      {/* =====================================================================
          1. GLOBAL APP HEADER BANNER
          ===================================================================== */}
      <header className="relative shrink-0 overflow-hidden animate-bg pt-5 pb-14 text-white shadow-lg">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/15 to-slate-950/35 backdrop-blur-[2px]" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[850px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-6xl px-6 lg:px-8">
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/conversation/review"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-slate-950/40 px-4 py-1.5 text-xs font-black text-white shadow-sm backdrop-blur-md transition hover:bg-slate-950/60"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-cyan-300" />
              <span>All Reviews</span>
            </Link>

            <div className="flex items-center gap-2">
              <span className="rounded-full border border-white/20 bg-slate-950/40 px-3.5 py-1.5 text-xs font-extrabold text-sky-200 backdrop-blur-md">
                {session.mode} • {session.level} •{" "}
                {Math.max(1, Math.round(session.duration / 60))}m
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-black backdrop-blur-md ${overallGrade.headerPill}`}
              >
                <Trophy className="h-3.5 w-3.5" />
                <span>Grade: {overallGrade.letter}</span>
              </span>
            </div>
          </div>

          <div className="max-w-3xl">
            <h1 className="text-2xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.22)] sm:text-3xl">
              <span>Conversation: </span>
              <span className="font-extrabold italic text-sky-200">
                {session.topic || "Live Practice"}
              </span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm font-medium text-white/90">
              {step === 1
                ? "Step 1: Review your report card, tutor note, and #1 grammar pattern."
                : step === 2
                  ? "Step 2: Walk through your fixes and tap individual words to hear them."
                  : step === 3
                    ? "Step 3: Practice tricky words from your call and speak phrases back."
                    : "Review complete — ready for your next challenge!"}
            </p>
          </div>
        </div>
      </header>

      {/* =====================================================================
          2. MAIN STEPPER CONTAINER OVERLAPPING HEADER (-mt-8)
          ===================================================================== */}
      <main className="relative z-20 mx-auto -mt-8 w-full max-w-6xl flex-1 px-6 pb-8 lg:px-8">
        {/* Always-Visible 3D Stepper Bar (Lets you jump freely between Steps 1, 2, 3) */}
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-3xl border-2 border-b-[5px] border-slate-200 border-b-slate-300 bg-white px-6 py-3 shadow-sm">
          {STEPS.map((s, idx) => {
            const isCurrent = step === s.id;
            const isDone =
              step === "celebration" ||
              (typeof step === "number" && step > s.id);
            const Icon = s.icon;
            return (
              <Fragment key={s.id}>
                <button
                  type="button"
                  onClick={() => setStep(s.id)}
                  className="flex items-center gap-2.5 text-left transition hover:opacity-85"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-b-[3px] text-xs font-black transition-all ${
                      isDone
                        ? "border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white"
                        : isCurrent
                          ? "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-xs"
                          : "border-slate-300 bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isDone ? <Check className="h-4 w-4 stroke-[3.5]" /> : s.id}
                  </span>
                  <span
                    className={`flex items-center gap-1.5 text-xs font-black tracking-wider uppercase ${
                      isCurrent || isDone ? "text-slate-900" : "text-slate-400"
                    }`}
                  >
                    <Icon
                      className={`h-3.5 w-3.5 ${
                        isCurrent ? "text-blue-600" : "text-slate-400"
                      }`}
                    />
                    <span className="hidden sm:inline">{s.label}</span>
                  </span>
                </button>

                {idx < STEPS.length - 1 && (
                  <div
                    className={`h-1 flex-1 rounded-full ${
                      step === "celebration" ||
                      (typeof step === "number" && step > s.id)
                        ? "bg-gradient-to-r from-emerald-400 to-sky-500"
                        : "bg-slate-100"
                    }`}
                  />
                )}
              </Fragment>
            );
          })}
        </div>

        {/* ===================================================================
            STEP 1: SCORECARD + TUTOR CARD + HORIZONTAL SKILL BARS
            =================================================================== */}
        {step === 1 && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 animate-in fade-in duration-300">
            {/* Left 6 Cols: 3D Dark Grade + Tutor + Horizontal Skill Bars */}
            <div className="group flex flex-col justify-between gap-5 rounded-[2rem] border-2 border-b-[6px] border-indigo-950/90 bg-gradient-to-br from-[#0F172A] via-[#171F3F] to-[#241645] p-6 sm:p-7 text-white shadow-xl transition-all duration-200 hover:-translate-y-0.5 lg:col-span-6">
              {/* Top: Grade Emblem + Summary */}
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/35 bg-sky-500/20 px-3 py-1 text-[10px] font-black tracking-wider text-sky-300 uppercase">
                    <Sparkles className="h-3 w-3 text-amber-300" />
                    Overall Report Card
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">
                    {repairCards.length} Repairs • {trickyWords.length} Tricky
                    Words
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-5">
                  <div className="relative shrink-0">
                    <div
                      className={`flex h-22 w-22 -rotate-3 flex-col items-center justify-center rounded-3xl border-b-[6px] shadow-xl transition-transform duration-300 group-hover:rotate-0 ${overallGrade.heroEmblem}`}
                    >
                      <span className="text-4xl font-black leading-none">
                        {overallGrade.letter}
                      </span>
                      <span className="mt-1 text-[9px] font-black tracking-wider uppercase opacity-85">
                        {overallGrade.tier}
                      </span>
                    </div>
                    <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-950 bg-amber-300 text-slate-950 shadow">
                      <Crown className="h-3.5 w-3.5 fill-current" />
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm font-medium leading-relaxed text-slate-200">
                    {review.overallFeedback.summary}
                  </p>
                </div>
              </div>

              {/* Middle: Tutor Partner Card (Fills void with real personality!) */}
              <div className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.06] p-3.5 backdrop-blur-md">
                <img
                  src={
                    overallGrade.letter.startsWith("A")
                      ? tutor.avatars.happy
                      : tutor.avatars.default
                  }
                  alt={tutor.name}
                  className="h-12 w-12 shrink-0 rounded-2xl border-2 border-sky-400/70 object-cover object-top shadow-md"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white">
                      {tutor.name}
                    </span>
                    <span className="rounded-md bg-sky-500/20 px-2 py-0.5 text-[9px] font-black tracking-wider text-sky-300 uppercase">
                      AI Partner
                    </span>
                  </div>
                  <p className="mt-0.5 flex items-start gap-1.5 text-xs font-medium italic text-slate-300">
                    <Quote className="mt-0.5 h-3 w-3 shrink-0 text-sky-400 rotate-180" />
                    <span className="line-clamp-2">
                      {review.overallFeedback.encouragement}
                    </span>
                  </p>
                </div>
              </div>

              {/* Bottom: 4 Sleek Horizontal Skill Bars */}
              <div className="space-y-2.5">
                {skillRows.map((row) => {
                  const g = getAlphaGrade(row.score);
                  const pct = row.score !== null ? Math.min(100, row.score) : 0;
                  return (
                    <div
                      key={row.label}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/65 px-4 py-2.5"
                    >
                      <span className="w-28 shrink-0 text-xs font-black tracking-wide text-slate-200 uppercase">
                        {row.label}
                      </span>

                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${getBarColor(
                            row.score,
                          )}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <span
                        className={`inline-flex h-8 min-w-[44px] items-center justify-center rounded-xl px-2.5 text-sm font-black ${g.tile}`}
                      >
                        {g.letter}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right 6 Cols: Strengths + #1 Grammar Focus + Guided CTA */}
            <div className="flex flex-col justify-between gap-4 lg:col-span-6">
              {review.overallFeedback.strengths &&
                review.overallFeedback.strengths.length > 0 && (
                  <div className="rounded-3xl border-2 border-b-[5px] border-slate-200 border-b-slate-300 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                    <span className="flex items-center gap-1.5 text-[10px] font-black tracking-widest text-emerald-600 uppercase">
                      <Trophy className="h-3.5 w-3.5" />
                      What You Nailed
                    </span>
                    <ul className="mt-3 space-y-2.5">
                      {review.overallFeedback.strengths.map((s, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 text-xs font-semibold leading-snug text-slate-700 sm:text-sm"
                        >
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {review.grammarAnalysis && (
                <div className="rounded-3xl border-2 border-b-[5px] border-rose-200 border-b-rose-300 bg-gradient-to-r from-rose-50 via-white to-amber-50/40 p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                  <span className="flex items-center gap-1.5 text-[10px] font-black tracking-widest text-rose-600 uppercase">
                    <AlertCircle className="h-3.5 w-3.5" />
                    #1 Pattern to Master
                  </span>
                  <h3 className="mt-1.5 text-base font-black text-slate-900 sm:text-lg">
                    {review.grammarAnalysis.topWeakness}
                  </h3>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600 sm:text-sm">
                    {review.grammarAnalysis.explanation}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setStep(repairCards.length > 0 ? 2 : 3)}
                className="flex w-full items-center justify-between gap-3 rounded-3xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-6 py-4 text-left text-white shadow-xl shadow-blue-500/25 transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0"
              >
                <div>
                  <span className="block text-sm font-black sm:text-base">
                    {repairCards.length > 0
                      ? `Step 2: Fix & Upgrade Deck (${repairCards.length} Cards)`
                      : "Step 3: Word Lab & Speaking"}
                  </span>
                  <span className="block text-[11px] font-bold text-sky-100">
                    Walk through one card at a time with clickable word audio
                  </span>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                  <ArrowRight className="h-5 w-5" />
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================
            STEP 2: GUIDED 1-BY-1 FIX & UPGRADE DECK
            =================================================================== */}
        {step === 2 && (
          <div className="mx-auto max-w-3xl">
            <FreestyleGrammarReview
              cards={repairCards}
              targetLanguage={session.targetLanguage}
              onBack={() => setStep(1)}
              onComplete={() => setStep(3)}
            />
          </div>
        )}

        {/* ===================================================================
            STEP 3: WORD AUDIO LAB + SPEAK IT BACK (Full Width, Zero Scroll)
            =================================================================== */}
        {step === 3 && (
          <div className="w-full">
            <FreestylePronunciationReview
              phrases={practicePhrases}
              trickyWords={trickyWords}
              targetLanguage={session.targetLanguage}
              onBack={() => setStep(repairCards.length > 0 ? 2 : 1)}
              onComplete={triggerCelebration}
            />
          </div>
        )}

        {/* ===================================================================
            FINALE: CELEBRATION + VOX / VIVI PERSONALIZED OUTRO
            =================================================================== */}
        {step === "celebration" && (
          <div className="mx-auto max-w-2xl space-y-6 rounded-3xl border-2 border-b-[6px] border-emerald-200 bg-white p-8 text-center shadow-xl animate-in zoom-in-95 duration-300">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-4xl text-white shadow-lg">
              🏆
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900">
                Review Complete!
              </h2>
              <p className="mt-1.5 text-sm font-semibold text-slate-500">
                Your fixes and native upgrades are saved in your Word Matrix,
                and your Milestone Boss is ready!
              </p>
            </div>

            {review.spriteOutro && (
              <div className="rounded-2xl border-2 border-sky-200 bg-sky-50/70 p-5 text-left">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={avatarSrc}
                      alt={review.spriteOutro.spriteName || spriteName}
                      className="h-10 w-10 rounded-xl border border-sky-300 object-cover object-top"
                    />
                    <span className="text-xs font-black tracking-wider text-blue-700 uppercase">
                      {review.spriteOutro.spriteName || spriteName} Dispatch
                    </span>
                  </div>

                  {(review.spriteOutro.nativeAudioUrl ||
                    review.spriteOutro.targetAudioUrl) && (
                    <button
                      type="button"
                      onClick={() =>
                        void playSpriteOutroAudio(review.spriteOutro)
                      }
                      className="inline-flex items-center gap-1 rounded-xl border border-sky-300 bg-white px-3 py-1.5 text-[11px] font-black text-blue-600 shadow-2xs hover:bg-sky-50"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                      <span>Replay Voice</span>
                    </button>
                  )}
                </div>

                <p className="mt-3 text-sm font-bold text-slate-800">
                  &ldquo;{review.spriteOutro.nativeLine}&rdquo;
                </p>
                <p className="mt-1.5 text-xs font-black text-indigo-700">
                  &ldquo;{review.spriteOutro.targetLine}&rdquo;
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center justify-center gap-1.5 rounded-2xl border-2 border-b-4 border-slate-200 bg-white px-4 py-4 text-xs font-black text-slate-600 transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Scorecard</span>
              </button>

              <Link
                href="/learning-hub"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border-b-4 border-purple-950 bg-gradient-to-b from-violet-500 via-purple-600 to-fuchsia-600 px-5 py-4 text-xs sm:text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-110"
              >
                <Swords className="h-4 w-4" />
                <span>Challenge Boss</span>
              </Link>

              <button
                onClick={onComplete}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-slate-50 px-5 py-4 text-xs sm:text-sm font-black text-slate-800 transition hover:bg-white"
              >
                <BookOpen className="h-4 w-4 text-blue-600" />
                <span>All Reviews</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ------------------------------
// TYPES
// ------------------------------
export interface ReviewMetrics {
  overallScore: number;
  grammarScore: number;
  vocabScore: number;
  pronunciationScore: number | null;
  fluencyScore: number;
}

export interface ReviewMistake {
  category: "GENDER" | "GRAMMAR" | "PRONUNCIATION" | "VOCABULARY";
  severity: "MINOR" | "MAJOR" | "CRITICAL";
  mistake: string;
  correction: string;
  explanation: string;
  context?: string;
}

export interface ReviewOverallFeedback {
  summary: string;
  strengths?: string[];
  focusAreas?: string[];
  encouragement: string;
}

export interface GrammarAnalysis {
  topWeakness: string;
  explanation: string;
}

export interface VocabUpgrade {
  original: string;
  better: string;
  explanation: string;
}

export interface SpriteOutro {
  spriteName?: string;
  nativeLine: string;
  targetLine: string;
  nativeAudioUrl?: string | null;
  targetAudioUrl?: string | null;
}

export interface ReviewData {
  metrics: ReviewMetrics;
  mistakes: ReviewMistake[];
  overallFeedback: ReviewOverallFeedback;
  grammarAnalysis?: GrammarAnalysis;
  vocabUpgrades?: VocabUpgrade[];
  spriteOutro?: SpriteOutro | null;
}

export interface SessionData {
  id: string;
  nativeLanguage: string;
  targetLanguage: string;
  level: string;
  mode: string;
  topic?: string | null;
  duration: number;
}
