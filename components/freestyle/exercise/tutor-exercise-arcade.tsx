// components/freestyle/exercise/tutor-exercise-arcade.tsx
"use client";

import { Fragment, useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import confetti from "canvas-confetti";
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
  Sparkles,
  Check,
  Quote,
} from "lucide-react";
import { getFreestyleTutor } from "@/lib/freestyle/tutors";
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
  voiceGender: "male" | "female";
  level: string;
  targetLanguage: string;
  content: HydratedTutorExerciseContent;
}

const ROUNDS = [
  { id: 0, step: 1, label: "Visual Match", icon: Sparkles },
  { id: 1, step: 2, label: "Sentence Dash", icon: Dumbbell },
  { id: 2, step: 3, label: "Voice Drill", icon: Mic },
] as const;

function normalizeSpeech(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isPhraseMatch(spoken: string, target: string): boolean {
  const spokenNorm = normalizeSpeech(spoken);
  const targetNorm = normalizeSpeech(target);
  if (!spokenNorm || !targetNorm) return false;
  if (spokenNorm.includes(targetNorm) || targetNorm.includes(spokenNorm)) {
    return true;
  }
  const targetWords = targetNorm.split(" ").filter(Boolean);
  const spokenSet = new Set(spokenNorm.split(" ").filter(Boolean));
  const hits = targetWords.filter((w) => spokenSet.has(w)).length;
  return hits / targetWords.length >= 0.6;
}

export function TutorExerciseArcade({
  userId,
  exerciseId,
  sessionId,
  title,
  tutorName,
  voiceGender,
  level,
  targetLanguage,
  content,
}: TutorExerciseArcadeProps) {
  const router = useRouter();
  const tutor = getFreestyleTutor(voiceGender);
  const displayTutorName = tutor.name || tutorName;

  const [roundIdx, setRoundIdx] = useState<0 | 1 | 2>(0);
  const [workoutCompleted, setWorkoutCompleted] = useState(false);
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

  // ================= ROUND 3 STATE: 3-REP VOICE DRILL =================
  const burst = content.speechBurst;
  const requiredReps = burst?.requiredReps || 3;
  const [repsDone, setRepsDone] = useState(0);
  const [isListeningRep, setIsListeningRep] = useState(false);
  const [speechFeedback, setSpeechFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRec =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition ||
          (window as any).webkitSpeechRecognition
        : null;
    setSpeechSupported(Boolean(SpeechRec));

    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore cleanup errors
      }
    };
  }, []);

  const triggerSpeechRep = () => {
    if (repsDone >= requiredReps || isListeningRep) return;
    setSpeechFeedback(null);

    const SpeechRec =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition ||
          (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRec) {
      setSpeechSupported(false);
      return;
    }

    try {
      const rec = new SpeechRec();
      recognitionRef.current = rec;
      rec.lang = targetLanguage || "fr-FR";
      rec.interimResults = false;
      rec.maxAlternatives = 3;
      setIsListeningRep(true);

      rec.onresult = (event: any) => {
        setIsListeningRep(false);
        const alternatives: string[] = [];
        const results = event?.results?.[0];
        if (results) {
          for (let i = 0; i < results.length; i++) {
            if (results[i]?.transcript) alternatives.push(results[i].transcript);
          }
        }
        const bestTranscript = alternatives[0] || "";
        const matched = alternatives.some((alt) =>
          isPhraseMatch(alt, burst?.targetPhrase || ""),
        );

        if (matched) {
          setRepsDone((prev) => Math.min(requiredReps, prev + 1));
          setSpeechFeedback({
            ok: true,
            message: `Heard "${bestTranscript}" — nailed it!`,
          });
        } else {
          setSpeechFeedback({
            ok: false,
            message: bestTranscript
              ? `Heard "${bestTranscript}". Listen closely and try saying "${burst?.targetPhrase}" again!`
              : "Didn't catch that clearly — tap Speak and try again.",
          });
        }
      };

      rec.onerror = (err: any) => {
        setIsListeningRep(false);
        setSpeechFeedback({
          ok: false,
          message:
            err?.error === "not-allowed"
              ? "Microphone permission is blocked. Enable mic access in your browser to continue."
              : "Didn't catch any audio — speak closer to your mic and try again.",
        });
      };

      rec.onend = () => {
        setIsListeningRep(false);
      };

      rec.start();
    } catch {
      setIsListeningRep(false);
      setSpeechFeedback({
        ok: false,
        message: "Could not start microphone. Check browser mic permissions.",
      });
    }
  };

  const handleFinishWorkout = async () => {
    setIsCompleting(true);
    await completeTutorExercise({ userId, exerciseId });
    setIsCompleting(false);
    setWorkoutCompleted(true);
    confetti({
      particleCount: 140,
      spread: 75,
      origin: { y: 0.6 },
      colors: ["#6366F1", "#10B981", "#F59E0B", "#EC4899"],
    });
    router.refresh();
  };

  // Dynamic Tutor coaching line & avatar mood
  const isTutorHappy =
    workoutCompleted ||
    (roundIdx === 0 && matchedIds.size >= cards.length) ||
    (roundIdx === 1 && Boolean(isDashSentenceComplete)) ||
    (roundIdx === 2 && repsDone >= requiredReps);

  const tutorCoachMessage = workoutCompleted
    ? `Bravo! You turned every slip from our call into muscle memory.`
    : roundIdx === 0
      ? matchedIds.size >= cards.length
        ? `Clean sweep! Ready to build full sentences next?`
        : `Tap a phrase below, listen to how I pronounce it, then match it to its scene.`
      : roundIdx === 1
        ? trapFeedback
          ? trapFeedback
          : isDashSentenceComplete
            ? `Spot on! That's exactly how a native speaker says it.`
            : `Watch out for the trap words from our conversation — pick the right chunk!`
        : repsDone >= requiredReps
          ? `3 out of 3! Lock it in and claim your workout victory.`
          : `Listen to my audio if you need a refresher, then repeat it ${requiredReps} times out loud!`;

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 font-sans text-slate-900 selection:bg-indigo-100">
      {/* ===================================================================
          1. SPOON ACADEMY HEADER BANNER (Matches Conversation & Review UI)
          =================================================================== */}
      <header className="relative shrink-0 overflow-hidden animate-bg pt-5 pb-16 text-white shadow-lg">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/15 to-slate-950/35 backdrop-blur-[2px]" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[850px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-6xl px-6 lg:px-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/conversation/review"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-slate-950/40 px-4 py-1.5 text-xs font-black text-white shadow-sm backdrop-blur-md transition hover:bg-slate-950/60"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-cyan-300" />
              <span>Back to Report Card</span>
            </Link>

            <div className="flex items-center gap-2">
              <span className="rounded-full border border-white/20 bg-slate-950/40 px-3.5 py-1.5 text-xs font-extrabold text-sky-200 backdrop-blur-md">
                {displayTutorName} • {level}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-400/20 px-3.5 py-1.5 text-xs font-black text-amber-200 backdrop-blur-md">
                <Dumbbell className="h-3.5 w-3.5" />
                <span>3-Min Tutor Workout</span>
              </span>
            </div>
          </div>

          <div className="max-w-3xl">
            <h1 className="text-2xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.22)] sm:text-3xl">
              {title}
            </h1>
            <p className="mt-1 text-xs font-medium text-white/90 sm:text-sm">
              Targeted 3-round repair drill built from your live conversation
              with {displayTutorName}.
            </p>
          </div>
        </div>
      </header>

      {/* ===================================================================
          2. MAIN WORKSPACE OVERLAPPING HEADER
          =================================================================== */}
      <main className="relative z-20 mx-auto -mt-9 w-full max-w-6xl flex-1 px-6 pb-12 lg:px-8">
        {/* 3D Stepper Bar */}
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-3xl border-2 border-b-[5px] border-slate-200 border-b-slate-300 bg-white px-6 py-3.5 shadow-sm">
          {ROUNDS.map((r, idx) => {
            const isCurrent = !workoutCompleted && roundIdx === r.id;
            const isDone = workoutCompleted || roundIdx > r.id;
            const Icon = r.icon;
            return (
              <Fragment key={r.id}>
                <div className="flex items-center gap-2.5 text-left">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-b-[3px] text-xs font-black transition-all ${
                      isDone
                        ? "border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white"
                        : isCurrent
                          ? "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-xs"
                          : "border-slate-300 bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isDone ? (
                      <Check className="h-4 w-4 stroke-[3.5]" />
                    ) : (
                      r.step
                    )}
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
                    <span className="hidden sm:inline">{r.label}</span>
                  </span>
                </div>

                {idx < ROUNDS.length - 1 && (
                  <div
                    className={`h-1 flex-1 rounded-full ${
                      workoutCompleted || roundIdx > r.id
                        ? "bg-gradient-to-r from-emerald-400 to-sky-500"
                        : "bg-slate-100"
                    }`}
                  />
                )}
              </Fragment>
            );
          })}
        </div>

        {/* AI Tutor Live Coach Banner */}
        <div className="mb-5 flex items-center gap-4 rounded-3xl border-2 border-b-[5px] border-indigo-950/90 bg-gradient-to-r from-[#0F172A] via-[#171F3F] to-[#241645] p-4 text-white shadow-lg sm:px-6">
          <div className="relative shrink-0">
            <img
              src={isTutorHappy ? tutor.avatars.happy : tutor.avatars.default}
              alt={displayTutorName}
              className="h-14 w-14 rounded-2xl border-2 border-sky-400 object-cover object-top shadow-md sm:h-16 sm:w-16"
            />
            <span className="absolute -right-1 -bottom-1 h-3.5 w-3.5 rounded-full border-2 border-slate-950 bg-emerald-400" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white sm:text-sm">
                {displayTutorName}
              </span>
              <span className="rounded-md bg-sky-500/20 px-2 py-0.5 text-[10px] font-black tracking-wider text-sky-300 uppercase">
                AI Tutor Coach
              </span>
            </div>
            <p className="mt-1 flex items-start gap-1.5 text-xs font-medium text-slate-200 sm:text-sm">
              <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 rotate-180 text-sky-400" />
              <span>{tutorCoachMessage}</span>
            </p>
          </div>
        </div>

        {/* MAIN STAGE CARD */}
        <div className="overflow-hidden rounded-[2rem] border-2 border-b-[6px] border-indigo-950/90 bg-gradient-to-br from-[#0F172A] via-[#171F3F] to-[#1E163B] p-6 text-white shadow-2xl sm:p-8">
          {workoutCompleted ? (
            /* ================= WORKOUT COMPLETE SCREEN ================= */
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mx-auto flex max-w-lg flex-col items-center justify-center space-y-5 py-10 text-center"
            >
              <img
                src={tutor.avatars.happy}
                alt={displayTutorName}
                className="h-24 w-24 rounded-3xl border-4 border-emerald-400 object-cover object-top shadow-xl"
              />

              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-500/20 px-3.5 py-1 text-[11px] font-black tracking-wider text-emerald-300 uppercase">
                  <Trophy className="h-3.5 w-3.5" />
                  3-Min Workout Complete
                </span>
                <h3 className="text-2xl font-black text-white sm:text-3xl">
                  Nice work with {displayTutorName}!
                </h3>
                <p className="text-sm font-medium leading-relaxed text-slate-300">
                  You matched your target expressions, dodged your common traps,
                  and nailed the voice drill.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link
                  href={`/conversation/${sessionId}`}
                  className="inline-flex items-center gap-2 rounded-2xl border-2 border-white/15 bg-white/10 px-5 py-3.5 text-xs font-black text-white transition hover:bg-white/15 sm:text-sm"
                >
                  <span>View Session Review</span>
                </Link>

                <Link
                  href="/conversation/review"
                  className="inline-flex items-center gap-2 rounded-2xl border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 px-6 py-3.5 text-xs font-black text-white shadow-xl shadow-emerald-500/25 transition hover:-translate-y-0.5 hover:brightness-110 sm:text-sm"
                >
                  <span>Back to Report Card</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          ) : roundIdx === 0 ? (
            /* ================= ROUND 1: 2x2 PRUNA 3D VISUAL MATCH ================= */
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-extrabold text-slate-200 sm:text-base">
                  {content.visualMatch?.instruction ||
                    "Select a phrase below, then tap its matching scene!"}
                </p>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black text-sky-300">
                  {matchedIds.size} / {cards.length} Matched
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                          ? "border-emerald-400 ring-2 ring-emerald-400/30"
                          : isWrong
                            ? "animate-shake border-rose-500"
                            : "border-white/15 hover:border-amber-300"
                      }`}
                    >
                      {card.imageUrl ? (
                        <img
                          src={card.imageUrl}
                          alt={card.translation}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-800 p-4 text-center text-xs font-bold text-slate-300">
                          {card.translation}
                        </div>
                      )}

                      {isMatched && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/75 p-3 backdrop-blur-[2px]">
                          <CheckCircle2 className="mb-1.5 h-7 w-7 text-emerald-400" />
                          <span className="text-base font-black text-white">
                            {card.word}
                          </span>
                          <span className="mt-0.5 text-xs font-bold text-emerald-300">
                            {card.translation}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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
                        className={`flex items-center justify-between rounded-2xl border-2 px-4 py-3 text-left text-xs font-black transition sm:text-sm ${
                          isMatched
                            ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-400/50 line-through"
                            : isSelected
                              ? "border-amber-300 bg-amber-300/20 text-white shadow-md"
                              : "border-white/15 bg-white/[0.06] text-slate-200 hover:border-white/35"
                        }`}
                      >
                        <span className="truncate">{pill.word}</span>
                        <Volume2 className="ml-2 h-4 w-4 shrink-0 text-sky-300" />
                      </button>
                    );
                  })}
                </div>

                {matchedIds.size >= cards.length && (
                  <button
                    type="button"
                    onClick={() => setRoundIdx(1)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 py-4 text-sm font-black text-white shadow-xl shadow-emerald-500/25 transition hover:-translate-y-0.5 hover:brightness-110"
                  >
                    <span>Next: Sentence Dash</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ) : roundIdx === 1 ? (
            /* ================= ROUND 2: BINARY SENTENCE DASH ================= */
            <div className="space-y-6 py-2">
              {currentDashItem && (
                <>
                  <div className="space-y-1.5 text-center">
                    <span className="text-[11px] font-black tracking-widest text-amber-300 uppercase">
                      Sentence {dashItemIdx + 1} of {dashItems.length}
                    </span>
                    <h3 className="text-xl font-black text-white sm:text-2xl">
                      &ldquo;{currentDashItem.promptNative}&rdquo;
                    </h3>
                  </div>

                  <div className="flex min-h-[88px] flex-wrap items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-white/20 bg-slate-950/60 p-5">
                    {builtTokens.map((tok, i) => (
                      <motion.span
                        key={i}
                        initial={{ scale: 0.85, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="rounded-xl border-b-[3px] border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 px-4 py-2 text-sm font-black text-white shadow-sm sm:text-base"
                      >
                        {tok}
                      </motion.span>
                    ))}

                    {!isDashSentenceComplete && (
                      <span className="animate-pulse rounded-xl border border-amber-300/50 bg-amber-300/10 px-4 py-2 text-xs font-bold text-amber-200">
                        Pick chunk {forkIdx + 1} of{" "}
                        {currentDashItem.forks.length}...
                      </span>
                    )}
                  </div>

                  {!isDashSentenceComplete && currentFork ? (
                    <div className="space-y-4">
                      <p className="text-center text-xs font-bold tracking-wider text-slate-400 uppercase">
                        Choose the right block:
                      </p>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {forkOptions.map((opt, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handlePickFork(opt)}
                            className="rounded-2xl border-2 border-b-[5px] border-white/20 bg-white/[0.07] px-5 py-6 text-center text-xl font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-white/[0.12] active:translate-y-0.5 active:border-b-2"
                          >
                            {opt.text}
                          </button>
                        ))}
                      </div>

                      {trapFeedback && (
                        <div className="flex items-center gap-2.5 rounded-2xl border border-rose-400/40 bg-rose-950/60 px-4 py-3 text-xs font-bold text-rose-200 sm:text-sm">
                          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                          <span>{trapFeedback}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4 pt-2 text-center">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/20 px-4 py-1.5 text-xs font-black text-emerald-300">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Sentence Nailed!</span>
                        </span>
                        {currentDashItem.audioUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              playAudioUrl(currentDashItem.audioUrl)
                            }
                            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-black text-sky-300 hover:bg-white/15"
                          >
                            <Volume2 className="h-3.5 w-3.5" />
                            <span>Replay</span>
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={advanceDashOrRound}
                        className="flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 py-4 text-sm font-black text-white shadow-xl shadow-emerald-500/25 transition hover:-translate-y-0.5 hover:brightness-110"
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
            /* ================= ROUND 3: 3-REP VOICE DRILL ================= */
            <div className="flex flex-col items-center justify-between space-y-6 py-4 text-center">
              <div className="space-y-1">
                <span className="text-[11px] font-black tracking-widest text-sky-300 uppercase">
                  Final Round • Muscle Memory
                </span>
                <h3 className="text-lg font-extrabold text-white sm:text-xl">
                  {burst?.instruction ||
                    `Say "${burst?.targetPhrase}" ${requiredReps} times out loud!`}
                </h3>
              </div>

              <motion.div
                animate={{
                  scale: 1 + repsDone * 0.14,
                }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className={`relative flex h-32 w-32 flex-col items-center justify-center rounded-full border-4 shadow-2xl transition-colors ${
                  repsDone >= requiredReps
                    ? "border-emerald-400 bg-gradient-to-tr from-emerald-400/30 to-sky-400/30 shadow-[0_0_50px_rgba(16,185,129,0.45)]"
                    : "border-sky-400/60 bg-white/[0.06]"
                }`}
              >
                <Zap
                  className={`h-9 w-9 ${
                    repsDone >= requiredReps
                      ? "fill-current text-amber-300"
                      : "text-sky-300"
                  }`}
                />
                <span className="mt-1 text-xs font-black text-white">
                  {repsDone} / {requiredReps} Reps
                </span>
              </motion.div>

              <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-white/[0.06] px-6 py-4 shadow-md">
                <div className="text-xl font-black text-white sm:text-2xl">
                  {burst?.targetPhrase}
                </div>
                <div className="mt-1 text-xs font-bold text-sky-300 sm:text-sm">
                  &ldquo;{burst?.translation}&rdquo;
                </div>
                {burst?.phoneticHint && (
                  <div className="mt-1 text-[11px] font-medium text-slate-400">
                    {burst.phoneticHint}
                  </div>
                )}
              </div>

              {speechFeedback && (
                <div
                  className={`flex max-w-md items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-bold ${
                    speechFeedback.ok
                      ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
                      : "border-rose-400/40 bg-rose-500/15 text-rose-200"
                  }`}
                >
                  {speechFeedback.ok ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  )}
                  <span>{speechFeedback.message}</span>
                </div>
              )}

              <div className="w-full max-w-md space-y-2.5">
                {repsDone < requiredReps ? (
                  speechSupported ? (
                    <div className="flex items-center gap-2.5">
                      {burst?.audioUrl && (
                        <button
                          type="button"
                          onClick={() => playAudioUrl(burst.audioUrl)}
                          className="rounded-2xl border-2 border-white/15 bg-white/[0.07] p-4 text-white transition hover:border-sky-300"
                          title="Listen"
                        >
                          <Volume2 className="h-5 w-5 text-sky-300" />
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isListeningRep}
                        onClick={triggerSpeechRep}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 py-4 text-sm font-black shadow-lg transition ${
                          isListeningRep
                            ? "animate-pulse border-amber-500 bg-amber-300 text-slate-950"
                            : "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white hover:brightness-110"
                        }`}
                      >
                        <Mic className="h-4 w-4" />
                        <span>
                          {isListeningRep
                            ? "Listening... Speak now!"
                            : `Speak Rep ${repsDone + 1} of ${requiredReps}`}
                        </span>
                      </button>
                    </div>
                  ) : (
                    /* Fallback only if browser has zero SpeechRecognition support (e.g. Firefox) */
                    <div className="space-y-2">
                      <p className="text-[11px] font-medium text-slate-400">
                        Browser voice detection isn&apos;t supported here — listen
                        and practice out loud, then mark each rep:
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setRepsDone((prev) => Math.min(requiredReps, prev + 1))
                        }
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 py-4 text-sm font-black text-white"
                      >
                        <Check className="h-4 w-4" />
                        <span>
                          Mark Spoken Rep {repsDone + 1} of {requiredReps}
                        </span>
                      </button>
                    </div>
                  )
                ) : (
                  <button
                    type="button"
                    disabled={isCompleting}
                    onClick={handleFinishWorkout}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 py-4 text-sm font-black text-white shadow-xl shadow-emerald-500/25 transition hover:-translate-y-0.5 hover:brightness-110"
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
      </main>
    </div>
  );
}