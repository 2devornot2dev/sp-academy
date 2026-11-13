// components/freestyle/review/freestyle-review-hub.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  Sparkles,
  Trophy,
  Volume2,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Swords,
  Mic,
  Zap,
  Loader2,
} from "lucide-react";
import { FreestyleAvatarReview } from "./freestyle-avatar-review";
import { FreestyleGrammarReview } from "./freestyle-grammar-review";
import { FreestylePronunciationReview } from "./freestyle-pronunciation-review";
import { useReviewTTS } from "@/hooks/use-review-tts";
import { useSpeak } from "@/hooks/use-speak";
import { useSprite } from "@/context/sprite-context";
import { ReviewData, SessionData, SpriteOutro, } from "./review-types";

type Phase =
  | "landing"
  | "preparing"
  | "intro"
  | "grammar"
  | "transition"
  | "pronunciation"
  | "outro"
  | "celebration";

interface ApiResponse {
  session: SessionData;
  review: ReviewData;
}

interface Props {
  sessionId: string;
  onComplete?: () => void;
}



export function FreestyleReviewHub({ sessionId, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("landing");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { isSpeaking, speak } = useReviewTTS();
  const { speak: speakTarget } = useSpeak();
  const { avatarSrc, spriteName } = useSprite()

  useEffect(() => {
    fetch(`/api/freestyle/review/${sessionId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.review) setData(res);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sessionId]);

  const getGrade = (score: number) => {
    if (score >= 90)
      return {
        letter: "A+",
        ring: "border-emerald-400 bg-emerald-500/20 text-emerald-300",
      };
    if (score >= 80)
      return {
        letter: "A",
        ring: "border-emerald-400 bg-emerald-500/20 text-emerald-300",
      };
    if (score >= 70)
      return {
        letter: "B",
        ring: "border-sky-400 bg-sky-500/20 text-sky-300",
      };
    if (score >= 60)
      return {
        letter: "C",
        ring: "border-amber-400 bg-amber-500/20 text-amber-300",
      };
    return {
      letter: "D",
      ring: "border-rose-400 bg-rose-500/20 text-rose-300",
    };
  };

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-slate-100/80 p-6">
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
      <div className="flex min-h-screen w-full items-center justify-center bg-slate-100/80 p-6">
        <div className="max-w-md space-y-4 rounded-3xl border-2 border-b-[6px] border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-base font-extrabold text-slate-700">
            Your AI Review is still baking...
          </p>
          <button
            onClick={onComplete}
            className="rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-6 py-3 text-sm font-black text-white shadow-md transition hover:brightness-105"
          >
            Back to Conversation Hub
          </button>
        </div>
      </div>
    );
  }

  const { session, review } = data;
  const grade = getGrade(review.metrics.overallScore);

  const grammarMistakes = review.mistakes.filter(
    (m) => m.category === "GRAMMAR" || m.category === "GENDER",
  );

  const pronunciationPhrases = review.mistakes
    .filter((m) => m.category === "PRONUNCIATION")
    .map((m) => m.correction)
    .slice(0, 3);

  const fallbackPhrases = review.mistakes.map((m) => m.correction).slice(0, 3);
  const practicePhrases =
    pronunciationPhrases.length > 0 ? pronunciationPhrases : fallbackPhrases;

  const hasGrammar = grammarMistakes.length > 0;
  const hasPronunciation = practicePhrases.length > 0;

  const startReview = () => {
    setPhase("preparing");
    setTimeout(() => {
      if (!hasGrammar && !hasPronunciation) {
        setPhase("outro");
        speak(review.overallFeedback.encouragement, session.nativeLanguage, () =>
          setPhase("celebration"),
        );
        return;
      }

      setPhase("intro");
      const text = hasGrammar
        ? `${review.overallFeedback.summary} Let's review your grammar.`
        : `${review.overallFeedback.summary} Let's practice your pronunciation.`;

      speak(text, session.nativeLanguage, () =>
        setPhase(hasGrammar ? "grammar" : "pronunciation"),
      );
    }, 800);
  };

  const handleGrammarComplete = () => {
    if (hasPronunciation) {
      setPhase("transition");
      speak(
        "Great job! Now let's practice your pronunciation.",
        session.nativeLanguage,
        () => setPhase("pronunciation"),
      );
    } else {
      setPhase("outro");
      speak(review.overallFeedback.encouragement, session.nativeLanguage, () =>
        setPhase("celebration"),
      );
    }
  };

  const handlePronunciationComplete = () => {
    setPhase("outro");
    const text = `${review.overallFeedback.encouragement} You did amazing today!`;
    speak(text, session.nativeLanguage, () => {
      setPhase("celebration");
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#6366F1", "#10B981", "#F59E0B", "#EC4899"],
      });
    });
  };

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

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-100/80 font-sans text-slate-900 lg:h-screen lg:overflow-hidden">
      {/* =====================================================================
          COMPACT TOP COMMAND BAR (No oversized banner eating space!)
          ===================================================================== */}
      <header className="shrink-0 border-b border-slate-200 bg-white px-6 py-3 shadow-2xs">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="scale-75 origin-left -my-3">
              <FreestyleAvatarReview isSpeaking={isSpeaking} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
                  AI Session Report
                </h1>
                <span className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-black tracking-wider text-indigo-700 uppercase">
                  {session.topic || session.mode}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500">
                {session.targetLanguage} • {Math.max(1, Math.round(session.duration / 60))} min live voice
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {phase !== "landing" && (
              <button
                type="button"
                onClick={() => setPhase("landing")}
                className="rounded-xl border-2 border-b-[3px] border-slate-200 bg-white px-3.5 py-1.5 text-xs font-black text-slate-600 transition hover:bg-slate-50"
              >
                ← Back to Report
              </button>
            )}
            <button
              type="button"
              onClick={onComplete}
              className="rounded-xl border-2 border-b-[3px] border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-black text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
            >
              Done
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================================
          MAIN VIEWPORT AREA (NO PAGE SCROLL ON LANDING)
          ===================================================================== */}
      <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-6 py-5 lg:overflow-hidden">
        {/* 1. LANDING: 12-COL NO-SCROLL WIDESCREEN DASHBOARD */}
        {phase === "landing" && (
          <div className="grid h-full min-h-0 w-full grid-cols-1 gap-6 lg:grid-cols-12 animate-in fade-in duration-300">
            {/* LEFT COLUMN (5 Cols): Grade Hero + 4 Metrics + Strengths + CTA */}
            <div className="flex min-h-0 flex-col justify-between gap-4 lg:col-span-5">
              {/* Dark 3D Score Card */}
              <div className="relative overflow-hidden rounded-3xl border-2 border-b-[6px] border-indigo-950/90 bg-gradient-to-br from-slate-950 via-[#131D36] to-indigo-950 p-6 text-white shadow-xl">
                <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />

                <div className="relative z-10 flex items-center gap-5">
                  <div
                    className={`flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-3xl border-4 shadow-lg ${grade.ring}`}
                  >
                    <span className="text-4xl font-black leading-none">
                      {grade.letter}
                    </span>
                    <span className="mt-1 text-xs font-extrabold text-white/90">
                      {review.metrics.overallScore}%
                    </span>
                  </div>

                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1 text-[10px] font-black tracking-widest text-sky-300 uppercase">
                      <Sparkles className="h-3 w-3 text-amber-300" />
                      Performance Summary
                    </span>
                    <p className="mt-1 text-xs sm:text-sm font-semibold leading-snug text-slate-200 line-clamp-3">
                      {review.overallFeedback.summary}
                    </p>
                  </div>
                </div>

                {/* 4 Metric Pills */}
                <div className="relative z-10 mt-5 grid grid-cols-4 gap-2">
                  {[
                    { label: "Grammar", value: review.metrics.grammarScore },
                    { label: "Vocab", value: review.metrics.vocabScore },
                    {
                      label: "Speech",
                      value: review.metrics.pronunciationScore ?? "—",
                    },
                    { label: "Fluency", value: review.metrics.fluencyScore },
                  ].map((m) => (
                    <div
                      key={m.label}
                      className="rounded-2xl border border-white/10 bg-white/[0.07] px-2 py-2.5 text-center"
                    >
                      <div className="text-[9px] font-black tracking-wider text-slate-400 uppercase">
                        {m.label}
                      </div>
                      <div className="mt-0.5 text-lg font-black text-white">
                        {m.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths Card */}
              {review.overallFeedback.strengths &&
                review.overallFeedback.strengths.length > 0 && (
                  <div className="flex-1 overflow-y-auto rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-5 shadow-xs">
                    <span className="flex items-center gap-1.5 text-[10px] font-black tracking-widest text-emerald-600 uppercase">
                      <Trophy className="h-3.5 w-3.5" />
                      What You Nailed
                    </span>
                    <ul className="mt-3 space-y-2.5">
                      {review.overallFeedback.strengths.map((s, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 text-xs sm:text-sm font-semibold leading-snug text-slate-700"
                        >
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Primary CTA Pinned Right Above the Fold */}
              <button
                onClick={startReview}
                className="flex w-full shrink-0 items-center justify-between gap-3 rounded-3xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-6 py-4 text-left text-white shadow-xl shadow-blue-500/25 transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0"
              >
                <div>
                  <span className="block text-sm sm:text-base font-black">
                    Start Interactive Mistake Repair
                  </span>
                  <span className="block text-[11px] font-bold text-sky-100">
                    {grammarMistakes.length} Grammar Fixes •{" "}
                    {practicePhrases.length} Speaking Drills
                  </span>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                  <ArrowRight className="h-5 w-5" />
                </span>
              </button>
            </div>

            {/* RIGHT COLUMN (7 Cols): Top Grammar Weakness + Vocab Upgrades Deck */}
            <div className="flex min-h-0 flex-col gap-4 lg:col-span-7">
              {/* Top Grammar Weakness */}
              {review.grammarAnalysis && (
                <div className="shrink-0 rounded-3xl border-2 border-b-[5px] border-rose-200 border-b-rose-300 bg-gradient-to-r from-rose-50 via-white to-amber-50/40 p-5 shadow-xs">
                  <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-rose-600 uppercase">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Top Grammar Focus</span>
                  </div>
                  <h3 className="mt-1 text-base sm:text-lg font-black text-slate-900">
                    {review.grammarAnalysis.topWeakness}
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm font-medium leading-relaxed text-slate-600">
                    {review.grammarAnalysis.explanation}
                  </p>
                </div>
              )}

              {/* Vocabulary Upgrades (Scrolls neatly INSIDE the card, never the page!) */}
              {review.vocabUpgrades && review.vocabUpgrades.length > 0 && (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-5 shadow-xs">
                  <div className="mb-3 flex shrink-0 items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="flex items-center gap-1.5 text-[11px] font-black tracking-widest text-indigo-600 uppercase">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>
                        Native Vocabulary Upgrades ({review.vocabUpgrades.length})
                      </span>
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">
                      Click 🔊 to hear native phrasing
                    </span>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                    {review.vocabUpgrades.map((upgrade, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl border-2 border-slate-100 bg-slate-50/70 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/30"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-rose-500 line-through">
                              {upgrade.original}
                            </span>
                            <span className="font-black text-slate-400">→</span>
                            <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-sm font-black text-emerald-800">
                              {upgrade.better}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              void speakTarget(
                                upgrade.better,
                                session.targetLanguage || "fr-FR",
                                0.95,
                              )
                            }
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-sky-200 bg-white text-blue-600 shadow-2xs transition hover:bg-sky-50"
                            title="Listen to native phrasing"
                          >
                            <Volume2 size={15} />
                          </button>
                        </div>

                        <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-600">
                          {upgrade.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. INTERACTIVE REPAIR PHASES (Centered Full-Height Stage) */}
        {phase !== "landing" && (
          <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center py-4">
            {/* Phase Progress Pill */}
            {(phase === "grammar" || phase === "pronunciation") && (
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-black text-slate-600 shadow-2xs">
                <span
                  className={
                    phase === "grammar" ? "text-blue-600" : "text-emerald-600"
                  }
                >
                  {phase === "grammar"
                    ? "Step 1 of 2 • Grammar Polish"
                    : "Step 2 of 2 • Speak It Back"}
                </span>
              </div>
            )}

            {phase === "preparing" && (
              <div className="w-full rounded-3xl border-2 border-b-[6px] border-slate-200 bg-white p-10 text-center shadow-sm">
                <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-blue-600" />
                <p className="text-lg font-black text-slate-900">
                  Prepping your interactive drills...
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Turning your session notes into quick repair cards.
                </p>
              </div>
            )}

            {(phase === "intro" ||
              phase === "transition" ||
              phase === "outro") && (
              <div className="w-full rounded-3xl border-2 border-b-[6px] border-slate-200 bg-white p-10 text-center shadow-sm">
                <div className="inline-flex items-center gap-3 rounded-full border border-sky-200 bg-sky-50 px-6 py-3">
                  <span className="h-2.5 w-2.5 animate-ping rounded-full bg-blue-600" />
                  <span className="text-sm font-black text-blue-900">
                    {isSpeaking
                      ? "Your AI Tutor is speaking..."
                      : "Loading voice coaching..."}
                  </span>
                </div>
              </div>
            )}

            {phase === "grammar" && (
              <div className="w-full">
                <FreestyleGrammarReview
                  mistakes={grammarMistakes}
                  targetLanguage={session.targetLanguage}
                  onComplete={handleGrammarComplete}
                />
              </div>
            )}

            {phase === "pronunciation" && (
              <div className="w-full">
                <FreestylePronunciationReview
                  phrases={practicePhrases}
                  targetLanguage={session.targetLanguage}
                  onComplete={handlePronunciationComplete}
                />
              </div>
            )}

            {phase === "celebration" && (
              <div className="w-full space-y-6 rounded-3xl border-2 border-b-[6px] border-emerald-200 bg-white p-8 text-center shadow-xl animate-in zoom-in-95 duration-300">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-4xl text-white shadow-lg">
                  🏆
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-900">
                    Review Complete!
                  </h2>
                  <p className="mt-1.5 text-sm font-semibold text-slate-500">
                    Your mistakes and new native phrases have been added to your
                    Word Matrix, and your Milestone Boss is unlocked!
                  </p>
                </div>

                {review.spriteOutro && (
                  <div className="rounded-2xl border-2 border-sky-200 bg-sky-50/70 p-4 text-left">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={avatarSrc}
                          alt={review.spriteOutro.spriteName || spriteName}
                          className="h-9 w-9 rounded-xl border border-sky-300 object-cover object-top"
                        />
                        <span className="text-xs font-black uppercase tracking-wider text-blue-700">
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
                          className="inline-flex items-center gap-1 rounded-xl border border-sky-300 bg-white px-3 py-1 text-[11px] font-black text-blue-600 shadow-2xs hover:bg-sky-50"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                          <span>Replay Voice</span>
                        </button>
                      )}
                    </div>

                    <p className="mt-2.5 text-sm font-bold text-slate-800">
                      &ldquo;{review.spriteOutro.nativeLine}&rdquo;
                    </p>
                    <p className="mt-1 text-xs font-black text-indigo-700">
                      &ldquo;{review.spriteOutro.targetLine}&rdquo;
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                  <Link
                    href="/learning-hub"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border-b-4 border-purple-950 bg-gradient-to-b from-violet-500 via-purple-600 to-fuchsia-600 px-6 py-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-110"
                  >
                    <Swords className="h-4 w-4" />
                    <span>Go to Learning Hub (Boss)</span>
                  </Link>

                  <button
                    onClick={onComplete}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-slate-50 px-6 py-4 text-sm font-black text-slate-800 transition hover:bg-white"
                  >
                    <span>Back to Conversation Hub</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

