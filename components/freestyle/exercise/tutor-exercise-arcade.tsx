// components/freestyle/exercise/tutor-exercise-arcade.tsx
"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Volume2,
  CheckCircle2,
  Zap,
  ArrowRight,
  ArrowLeft,
  Mic,
  Trophy,
  AlertCircle,
  Loader2,
  Dumbbell,
} from "lucide-react";
import {
  completeTutorExercise,
  type HydratedTutorExerciseContent,
} from "@/app/actions/tutor-exercise-actions";

interface TutorExerciseArcadeProps {
  userId: string;
  exerciseId: string;
  sessionId: string;
  title: string;
  tutorName: string;
  targetLanguage: string;
  content: HydratedTutorExerciseContent;
}

export function TutorExerciseArcade({
  userId,
  exerciseId,
  sessionId,
  title,
  tutorName,
  targetLanguage,
  content,
}: TutorExerciseArcadeProps) {
  const router = useRouter();
  const [roundIdx, setRoundIdx] = useState<0 | 1 | 2>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudioUrl = (url?: string | null) => {
    if (!url) return;
    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      void audio.play();
    } catch {
      // Ignore autoplay errors
    }
  };

  // ================= ROUND 1 STATE: VISUAL MATCH =================
  const cards = content.visualMatch?.cards || [];
  const [selectedWordId, setSelectedWordId] = useState<string | null>(
    cards[0]?.id ?? null,
  );
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [wrongCardId, setWrongCardId] = useState<string | null>(null);

  const shuffledWordPills = useMemo(
    () => [...cards].sort((a, b) => a.word.localeCompare(b.word)),
    [cards],
  );

  const handleCardTap = (cardId: string, audioUrl?: string | null) => {
    if (matchedIds.has(cardId) || !selectedWordId) return;

    if (cardId === selectedWordId) {
      if (audioUrl) playAudioUrl(audioUrl);
      const nextMatched = new Set(matchedIds);
      nextMatched.add(cardId);
      setMatchedIds(nextMatched);

      const nextUnmatched = shuffledWordPills.find(
        (c) => !nextMatched.has(c.id),
      );
      setSelectedWordId(nextUnmatched?.id ?? null);
    } else {
      setWrongCardId(cardId);
      setTimeout(() => setWrongCardId(null), 500);
    }
  };

  // ================= ROUND 2 STATE: BINARY SENTENCE DASH =================
  const dashItems = content.sentenceDash?.items || [];
  const [dashItemIdx, setDashItemIdx] = useState(0);
  const [forkIdx, setForkIdx] = useState(0);
  const [builtTokens, setBuiltTokens] = useState<string[]>([]);
  const [trapFeedback, setTrapFeedback] = useState<string | null>(null);

  const currentDashItem = dashItems[dashItemIdx];
  const currentFork = currentDashItem?.forks?.[forkIdx];

  const forkOptions = useMemo(() => {
    if (!currentFork) return [];
    const flip = (dashItemIdx + forkIdx) % 2 === 1;
    return flip
      ? [
          { text: currentFork.trap, isCorrect: false },
          { text: currentFork.correct, isCorrect: true },
        ]
      : [
          { text: currentFork.correct, isCorrect: true },
          { text: currentFork.trap, isCorrect: false },
        ];
  }, [currentFork, dashItemIdx, forkIdx]);

  const handlePickFork = (opt: { text: string; isCorrect: boolean }) => {
    if (!currentDashItem || !currentFork) return;

    if (opt.isCorrect) {
      setTrapFeedback(null);
      const nextBuilt = [...builtTokens, opt.text];
      setBuiltTokens(nextBuilt);

      if (forkIdx + 1 < currentDashItem.forks.length) {
        setForkIdx(forkIdx + 1);
      } else if (currentDashItem.audioUrl) {
        playAudioUrl(currentDashItem.audioUrl);
      }
    } else {
      setTrapFeedback(
        currentFork.whyTrap ||
          `Watch out! "${opt.text}" is a common trap here.`,
      );
    }
  };

  const isDashSentenceComplete =
    currentDashItem && builtTokens.length >= currentDashItem.forks.length;

  const advanceDashOrRound = () => {
    if (dashItemIdx + 1 < dashItems.length) {
      setDashItemIdx(dashItemIdx + 1);
      setForkIdx(0);
      setBuiltTokens([]);
      setTrapFeedback(null);
    } else {
      setRoundIdx(2);
    }
  };

  // ================= ROUND 3 STATE: 3-REP SPEECH BURST =================
  const burst = content.speechBurst;
  const requiredReps = burst?.requiredReps || 3;
  const [repsDone, setRepsDone] = useState(0);
  const [isListeningRep, setIsListeningRep] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [workoutCompleted, setWorkoutCompleted] = useState(false);
  const recognitionRef = useRef<any>(null);

  const completeOneSpeechRep = () => {
    setIsListeningRep(false);
    setRepsDone((prev) => Math.min(requiredReps, prev + 1));
  };

  const triggerSpeechRep = () => {
    if (repsDone >= requiredReps || isListeningRep) return;

    const SpeechRec =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition ||
          (window as any).webkitSpeechRecognition
        : null;

    setIsListeningRep(true);

    if (SpeechRec) {
      try {
        const rec = new SpeechRec();
        recognitionRef.current = rec;
        rec.lang = targetLanguage || "fr-FR";
        rec.interimResults = false;
        rec.maxAlternatives = 1;

        rec.onresult = () => {
          completeOneSpeechRep();
        };
        rec.onerror = () => {
          completeOneSpeechRep();
        };
        rec.start();
        return;
      } catch {
        // Fallback below
      }
    }

    setTimeout(() => {
      completeOneSpeechRep();
    }, 1400);
  };

  const handleFinishWorkout = async () => {
    setIsCompleting(true);
    await completeTutorExercise({ userId, exerciseId });
    setIsCompleting(false);
    setWorkoutCompleted(true);
    router.refresh();
  };

  return (
    <div className="mx-auto flex min-h-[680px] w-full max-w-4xl flex-col justify-between overflow-hidden rounded-[2rem] border-2 border-b-[6px] border-indigo-950 bg-[#141D2E] shadow-2xl">
      {/* TOP ARCADE HEADER & 3-ROUND PROGRESS */}
      <div className="shrink-0 space-y-3 border-b border-slate-600/60 bg-[#0E1522] px-6 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-300 px-2.5 py-1 text-[10px] font-black text-slate-950 uppercase">
              <Dumbbell className="h-3.5 w-3.5" /> 3-Min Tutor Workout
            </span>
            <h4 className="truncate text-sm font-black text-white sm:text-base">
              {title}
            </h4>
          </div>

          <Link
            href="/conversation/review"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-black text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Report Card</span>
          </Link>
        </div>

        {/* 3-Round Progress Bar */}
        <div className="grid grid-cols-3 gap-2">
          {["1. Visual Match", "2. Sentence Dash", "3. Voice Drill"].map(
            (label, idx) => (
              <div key={label} className="space-y-1">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    idx < roundIdx || workoutCompleted
                      ? "bg-teal-400"
                      : idx === roundIdx
                        ? "bg-amber-300"
                        : "bg-slate-700"
                  }`}
                />
                <span
                  className={`block text-[10px] font-extrabold tracking-wider uppercase ${
                    idx === roundIdx ? "text-amber-300" : "text-slate-400"
                  }`}
                >
                  {label}
                </span>
              </div>
            ),
          )}
        </div>
      </div>

      {/* MAIN STAGE BODY */}
      <div className="flex flex-1 flex-col justify-between overflow-y-auto px-6 py-6 sm:px-8">
        {workoutCompleted ? (
          /* ================= WORKOUT COMPLETE SCREEN ================= */
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="my-auto flex flex-col items-center justify-center space-y-4 py-8 text-center"
          >
            <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border-2 border-amber-300 bg-amber-400/20 shadow-[0_0_40px_rgba(251,191,36,0.35)]">
              <Trophy className="h-10 w-10 text-amber-300" />
            </div>

            <h3 className="text-2xl font-black text-white">
              3-Minute Tutor Workout Complete! 🎉
            </h3>
            <p className="max-w-sm text-sm leading-relaxed font-semibold text-slate-300">
              You locked in your vocabulary upgrades and repaired the grammar
              slips from your session with {tutorName}.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href={`/conversation/${sessionId}`}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15"
              >
                <span>View Session Review</span>
              </Link>

              <Link
                href="/conversation/review"
                className="inline-flex items-center gap-2 rounded-xl bg-teal-400 px-6 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:bg-teal-300"
              >
                <span>Back to Report Card</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        ) : roundIdx === 0 ? (
          /* ================= ROUND 1: 2x2 PRUNA 3D VISUAL MATCH ================= */
          <div className="flex flex-1 flex-col justify-between space-y-5">
            <div className="text-center">
              <p className="text-sm font-extrabold text-slate-200">
                {content.visualMatch?.instruction ||
                  "Select a phrase below, then tap its matching 3D scene!"}
              </p>
            </div>

            {/* 2x2 Grid of 3D Picture Cards */}
            <div className="my-auto grid grid-cols-2 gap-3.5">
              {cards.map((card) => {
                const isMatched = matchedIds.has(card.id);
                const isWrong = wrongCardId === card.id;

                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handleCardTap(card.id, card.audioUrl)}
                    className={`group relative aspect-[16/10] overflow-hidden rounded-2xl border-2 transition-all ${
                      isMatched
                        ? "border-teal-400 ring-2 ring-teal-400/30"
                        : isWrong
                          ? "animate-shake border-rose-500"
                          : "border-slate-600/80 hover:border-amber-300"
                    }`}
                  >
                    {card.imageUrl ? (
                      <img
                        src={card.imageUrl}
                        alt={card.translation}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-800 p-3 text-center text-xs font-bold text-slate-300">
                        {card.translation}
                      </div>
                    )}

                    {isMatched && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/75 p-2 backdrop-blur-[2px]">
                        <CheckCircle2 className="mb-1 h-6 w-6 text-teal-400" />
                        <span className="text-sm font-black text-white">
                          {card.word}
                        </span>
                        <span className="text-[11px] font-bold text-teal-300">
                          {card.translation}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 4 Selectable Target Word Pills */}
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-2.5">
                {shuffledWordPills.map((pill) => {
                  const isMatched = matchedIds.has(pill.id);
                  const isSelected = selectedWordId === pill.id;

                  return (
                    <button
                      key={pill.id}
                      type="button"
                      disabled={isMatched}
                      onClick={() => {
                        setSelectedWordId(pill.id);
                        if (pill.audioUrl) playAudioUrl(pill.audioUrl);
                      }}
                      className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-xs font-black transition ${
                        isMatched
                          ? "border-teal-500/30 bg-teal-950/30 text-teal-400/50 line-through"
                          : isSelected
                            ? "border-amber-300 bg-amber-300/20 text-white shadow-md"
                            : "border-slate-600 bg-[#24324B] text-slate-200 hover:border-slate-400"
                      }`}
                    >
                      <span className="truncate">{pill.word}</span>
                      <Volume2 className="ml-1.5 h-3.5 w-3.5 shrink-0 text-teal-300" />
                    </button>
                  );
                })}
              </div>

              {matchedIds.size >= cards.length && (
                <button
                  type="button"
                  onClick={() => setRoundIdx(1)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-400 py-3 text-xs font-black text-slate-950 shadow-lg transition hover:bg-teal-300"
                >
                  <span>Next: Binary Sentence Dash</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ) : roundIdx === 1 ? (
          /* ================= ROUND 2: BINARY SENTENCE DASH ================= */
          <div className="flex flex-1 flex-col justify-between space-y-5">
            {currentDashItem && (
              <>
                <div className="space-y-1.5 text-center">
                  <span className="text-[10px] font-black tracking-widest text-amber-300 uppercase">
                    Sentence {dashItemIdx + 1} of {dashItems.length}
                  </span>
                  <h3 className="text-lg font-black text-white">
                    &ldquo;{currentDashItem.promptNative}&rdquo;
                  </h3>
                </div>

                <div className="flex min-h-[76px] flex-wrap items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-500/60 bg-[#0E1522] p-4">
                  {builtTokens.map((tok, i) => (
                    <motion.span
                      key={i}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="rounded-xl bg-teal-400 px-3.5 py-1.5 text-sm font-black text-slate-950 shadow-sm"
                    >
                      {tok}
                    </motion.span>
                  ))}

                  {!isDashSentenceComplete && (
                    <span className="animate-pulse rounded-xl border border-amber-300/50 bg-amber-300/10 px-4 py-1.5 text-xs font-bold text-amber-200">
                      Pick word {forkIdx + 1} of {currentDashItem.forks.length}
                      ...
                    </span>
                  )}
                </div>

                {!isDashSentenceComplete && currentFork ? (
                  <div className="my-auto space-y-4">
                    <p className="text-center text-xs font-bold tracking-wider text-slate-400 uppercase">
                      Choose the correct next piece:
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      {forkOptions.map((opt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handlePickFork(opt)}
                          className="rounded-2xl border-2 border-slate-500/60 bg-[#24324B] px-4 py-6 text-center text-xl font-black text-white shadow-lg transition hover:border-amber-300 hover:bg-[#2C3E5D] active:scale-95"
                        >
                          {opt.text}
                        </button>
                      ))}
                    </div>

                    {trapFeedback && (
                      <div className="flex items-center gap-2 rounded-xl border border-rose-400/40 bg-rose-950/60 px-4 py-2.5 text-xs font-bold text-rose-200">
                        <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                        <span>{trapFeedback}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="my-auto flex flex-col items-center gap-4 text-center">
                    <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/40 bg-teal-400/20 px-4 py-1.5 text-xs font-black text-teal-300">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Sentence Nailed!</span>
                    </div>

                    <button
                      type="button"
                      onClick={advanceDashOrRound}
                      className="flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-teal-400 py-3 text-xs font-black text-slate-950 shadow-lg transition hover:bg-teal-300"
                    >
                      <span>
                        {dashItemIdx + 1 < dashItems.length
                          ? "Next Sentence"
                          : "Final Round: 3x Voice Drill"}
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* ================= ROUND 3: 3-REP SPEECH BURST ================= */
          <div className="flex flex-1 flex-col items-center justify-between py-2 text-center">
            <div className="space-y-1">
              <span className="text-[10px] font-black tracking-widest text-teal-300 uppercase">
                Final Round · Rapid Muscle Memory
              </span>
              <h3 className="text-lg font-extrabold text-white">
                {burst?.instruction ||
                  `Say "${burst?.targetPhrase}" ${requiredReps} times out loud!`}
              </h3>
            </div>

            <div className="relative my-auto flex flex-col items-center justify-center py-6">
              <motion.div
                animate={{
                  scale: 1 + repsDone * 0.18,
                }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className={`relative flex h-32 w-32 flex-col items-center justify-center rounded-full border-4 shadow-2xl transition-colors ${
                  repsDone >= requiredReps
                    ? "border-amber-300 bg-gradient-to-tr from-amber-400/30 to-teal-400/30 shadow-[0_0_60px_rgba(45,212,191,0.5)]"
                    : "border-teal-400/60 bg-[#24324B]"
                }`}
              >
                <Zap
                  className={`h-10 w-10 ${
                    repsDone >= requiredReps
                      ? "fill-current text-amber-300"
                      : "text-teal-300"
                  }`}
                />
                <span className="mt-1 text-xs font-black text-white">
                  {repsDone} / {requiredReps} Reps
                </span>
              </motion.div>

              <div className="mt-6 rounded-2xl border border-slate-500/50 bg-[#24324B] px-6 py-3.5 shadow-md">
                <div className="text-2xl font-black text-white">
                  {burst?.targetPhrase}
                </div>
                <div className="mt-0.5 text-xs font-bold text-teal-300">
                  &ldquo;{burst?.translation}&rdquo;
                </div>
              </div>
            </div>

            <div className="w-full max-w-sm space-y-2.5">
              {repsDone < requiredReps ? (
                <div className="flex items-center gap-2.5">
                  {burst?.audioUrl && (
                    <button
                      type="button"
                      onClick={() => playAudioUrl(burst.audioUrl)}
                      className="rounded-xl border border-slate-500 bg-[#24324B] p-3.5 text-white transition hover:border-teal-300"
                      title="Listen"
                    >
                      <Volume2 className="h-5 w-5 text-teal-300" />
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isListeningRep}
                    onClick={triggerSpeechRep}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-black shadow-lg transition ${
                      isListeningRep
                        ? "animate-pulse bg-amber-300 text-slate-950"
                        : "bg-teal-400 text-slate-950 hover:bg-teal-300"
                    }`}
                  >
                    <Mic className="h-4 w-4" />
                    <span>
                      {isListeningRep
                        ? `Listening... Say "${burst?.targetPhrase}"!`
                        : `Speak Rep ${repsDone + 1} of ${requiredReps}`}
                    </span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isCompleting}
                  onClick={handleFinishWorkout}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-teal-400 py-3.5 text-sm font-black text-slate-950 shadow-xl transition hover:brightness-110"
                >
                  {isCompleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Trophy className="h-4 w-4" />
                      <span>Complete 3-Min Workout!</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}