// components/freestyle/exercise/tutor-exercise-arcade.tsx
"use client";

import { useState, useMemo, useRef, useEffect } from "react";
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
              ? `Heard "${bestTranscript}". Try saying "${burst?.targetPhrase}" again!`
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
              ? "Microphone permission is blocked. Enable mic access in your browser."
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

  const isTutorHappy =
    workoutCompleted ||
    (roundIdx === 0 && matchedIds.size >= cards.length) ||
    (roundIdx === 1 && Boolean(isDashSentenceComplete)) ||
    (roundIdx === 2 && repsDone >= requiredReps);

  const tutorCoachMessage = workoutCompleted
    ? `Bravo! You locked in every repair from our conversation.`
    : roundIdx === 0
      ? matchedIds.size >= cards.length
        ? `Clean sweep! Hit Next to jump into Sentence Dash.`
        : `Tap a phrase below, listen to how I pronounce it, then match it to its scene.`
      : roundIdx === 1
        ? trapFeedback
          ? trapFeedback
          : isDashSentenceComplete
            ? `Spot on! That's the exact natural phrasing.`
            : `Dodge the trap word from our conversation and pick the right piece!`
        : repsDone >= requiredReps
          ? `3 out of 3! Click Complete Workout to finish.`
          : `Listen once if you need a refresher, then speak the phrase ${requiredReps} times!`;

  return (
    <div className="flex h-screen flex-col overflow-hidden animate-bg p-4 font-sans text-slate-900 sm:p-5">
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-3.5">
        {/* 1. HORIZONTAL AI TUTOR BAR */}
        <div className="flex shrink-0 items-center justify-between gap-4 rounded-[1.75rem] bg-white px-5 py-3.5 shadow-sm ring-1 ring-slate-200/70">
          <div className="flex min-w-0 flex-1 items-center gap-3.5">
            <div className="relative shrink-0">
              <img
                src={isTutorHappy ? tutor.avatars.happy : tutor.avatars.default}
                alt={displayTutorName}
                className="h-12 w-12 rounded-2xl border-2 border-sky-200 object-cover object-top shadow-xs sm:h-14 sm:w-14"
              />
              <span className="absolute -right-1 -bottom-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-black text-slate-900">
                  {displayTutorName}
                </span>
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-black tracking-wider text-blue-700 uppercase">
                  AI Tutor • {level}
                </span>
                <span className="hidden truncate text-[11px] font-bold text-slate-400 md:inline">
                  • {title}
                </span>
              </div>
              <p className="mt-1 flex items-center gap-1.5 truncate text-xs font-bold text-slate-600 sm:text-sm">
                <Quote className="h-3.5 w-3.5 shrink-0 rotate-180 text-blue-500" />
                <span className="truncate">{tutorCoachMessage}</span>
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <div className="hidden items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 sm:flex">
              <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-emerald-400 transition-all duration-500"
                  style={{
                    width: workoutCompleted
                      ? "100%"
                      : `${Math.round(((roundIdx + 1) / 3) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-[11px] font-black text-slate-600">
                {workoutCompleted ? "3/3" : `${roundIdx + 1}/3`}
              </span>
            </div>

            <Link
              href="/conversation/review"
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-b-[3px] border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 active:translate-y-0.5 active:border-b-2"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-blue-600" />
              <span className="hidden sm:inline">Exit</span>
            </Link>
          </div>
        </div>

        {/* 2. EXERCISE CARD UNDERNEATH (Strictly fills remaining height, no scroll) */}
        <section className="flex min-h-0 flex-1 flex-col rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
          {workoutCompleted ? (
            /* ================= WORKOUT COMPLETE ================= */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="m-auto flex max-w-md flex-col items-center space-y-5 text-center"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl border-b-[5px] border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-lg">
                <Trophy className="h-10 w-10" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-2xl font-black text-slate-900">
                  3-Min Workout Complete!
                </h3>
                <p className="text-sm font-semibold text-slate-500">
                  You locked in your expressions and fixed the traps from your
                  call with {displayTutorName}.
                </p>
              </div>

              <div className="flex w-full flex-col gap-2.5 sm:flex-row">
                <Link
                  href={`/conversation/${sessionId}`}
                  className="flex flex-1 items-center justify-center rounded-2xl border-2 border-b-4 border-slate-200 bg-white px-4 py-3.5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                >
                  View Review
                </Link>
                <Link
                  href="/conversation/review"
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-5 py-3.5 text-xs font-black text-white shadow-md transition hover:brightness-105"
                >
                  <span>Back to Review Page</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          ) : roundIdx === 0 ? (
            /* ================= ROUND 1: VISUAL MATCH ================= */
            <div className="flex min-h-0 flex-1 flex-col gap-3.5">
              <div className="flex shrink-0 items-center justify-between gap-2">
                <p className="text-xs font-black text-slate-800 sm:text-sm">
                  {content.visualMatch?.instruction ||
                    "Select a phrase below, then tap its matching scene"}
                </p>
                <span className="shrink-0 rounded-full bg-sky-100 px-3 py-1 text-[11px] font-black text-blue-700">
                  {matchedIds.size} / {cards.length} Matched
                </span>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-3">
                {cards.map((card) => {
                  const isMatched = matchedIds.has(card.id);
                  const isWrong = wrongCardId === card.id;

                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => handleCardTap(card.id, card.audioUrl)}
                      className={`group relative h-full w-full overflow-hidden rounded-2xl border-2 transition-all ${
                        isMatched
                          ? "border-emerald-500 ring-2 ring-emerald-400/30"
                          : isWrong
                            ? "animate-shake border-rose-500"
                            : "border-slate-200 hover:border-amber-400"
                      }`}
                    >
                      {card.imageUrl ? (
                        <img
                          src={card.imageUrl}
                          alt={card.translation}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-100 p-3 text-center text-xs font-bold text-slate-600">
                          {card.translation}
                        </div>
                      )}

                      {isMatched && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 p-2 backdrop-blur-[2px]">
                          <CheckCircle2 className="mb-1 h-6 w-6 text-emerald-400" />
                          <span className="text-xs font-black text-white sm:text-sm">
                            {card.word}
                          </span>
                          <span className="text-[11px] font-bold text-emerald-300">
                            {card.translation}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {matchedIds.size >= cards.length ? (
                <button
                  type="button"
                  onClick={() => setRoundIdx(1)}
                  className="flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 py-3.5 text-sm font-black text-white shadow-md transition hover:brightness-105 active:translate-y-0.5 active:border-b-0"
                >
                  <span>Next</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <div className="grid shrink-0 grid-cols-2 gap-2.5">
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
                        className={`flex items-center justify-between rounded-2xl border-2 px-3.5 py-2.5 text-left text-xs font-black transition sm:text-sm ${
                          isMatched
                            ? "border-emerald-200 bg-emerald-50 text-emerald-600/60 line-through"
                            : isSelected
                              ? "border-orange-700 border-b-[4px] bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950 shadow-sm"
                              : "border-slate-200 border-b-[4px] bg-white text-slate-800 hover:border-sky-300"
                        }`}
                      >
                        <span className="truncate">{pill.word}</span>
                        <Volume2
                          className={`ml-2 h-4 w-4 shrink-0 ${
                            isSelected ? "text-slate-950" : "text-blue-600"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : roundIdx === 1 ? (
            /* ================= ROUND 2: BINARY SENTENCE DASH ================= */
            <div className="flex min-h-0 flex-1 flex-col justify-between gap-4">
              {currentDashItem && (
                <>
                  <div className="shrink-0 space-y-1 text-center">
                    <span className="text-[11px] font-black tracking-widest text-blue-600 uppercase">
                      Sentence {dashItemIdx + 1} of {dashItems.length}
                    </span>
                    <h3 className="text-lg font-black text-slate-900 sm:text-xl">
                      &ldquo;{currentDashItem.promptNative}&rdquo;
                    </h3>
                  </div>

                  <div className="flex min-h-[84px] flex-wrap items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4">
                    {builtTokens.map((tok, i) => (
                      <motion.span
                        key={i}
                        initial={{ scale: 0.85, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="rounded-xl border-b-[3px] border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 px-3.5 py-1.5 text-sm font-black text-white shadow-xs"
                      >
                        {tok}
                      </motion.span>
                    ))}

                    {!isDashSentenceComplete && (
                      <span className="animate-pulse rounded-xl bg-amber-100 px-3.5 py-1.5 text-xs font-black text-amber-800">
                        Pick chunk {forkIdx + 1} of{" "}
                        {currentDashItem.forks.length}...
                      </span>
                    )}
                  </div>

                  {!isDashSentenceComplete && currentFork ? (
                    <div className="my-auto space-y-3">
                      <p className="text-center text-xs font-black tracking-wider text-slate-400 uppercase">
                        Choose the right block
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        {forkOptions.map((opt, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handlePickFork(opt)}
                            className="rounded-2xl border-2 border-b-[5px] border-slate-200 bg-white px-4 py-6 text-center text-lg font-black text-slate-900 shadow-xs transition hover:-translate-y-0.5 hover:border-sky-400 hover:bg-sky-50/50 active:translate-y-0.5 active:border-b-2 sm:text-xl"
                          >
                            {opt.text}
                          </button>
                        ))}
                      </div>

                      {trapFeedback && (
                        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700">
                          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                          <span>{trapFeedback}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="my-auto flex flex-col items-center gap-4 text-center">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-black text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Sentence Nailed!</span>
                        </span>
                        {currentDashItem.audioUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              playAudioUrl(currentDashItem.audioUrl)
                            }
                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-black text-blue-600 hover:bg-slate-50"
                          >
                            <Volume2 className="h-3.5 w-3.5" />
                            <span>Replay</span>
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={advanceDashOrRound}
                        className="flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 py-3.5 text-sm font-black text-white shadow-md transition hover:brightness-105"
                      >
                        <span>
                          {dashItemIdx + 1 < dashItems.length
                            ? "Next Sentence"
                            : "Next"}
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
            <div className="flex min-h-0 flex-1 flex-col items-center justify-between py-2 text-center">
              <div className="space-y-1">
                <span className="text-[11px] font-black tracking-widest text-blue-600 uppercase">
                  Muscle Memory
                </span>
                <h3 className="text-base font-black text-slate-900 sm:text-lg">
                  {burst?.instruction ||
                    `Say "${burst?.targetPhrase}" ${requiredReps} times out loud`}
                </h3>
              </div>

              <motion.div
                animate={{ scale: 1 + repsDone * 0.12 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className={`flex h-28 w-28 flex-col items-center justify-center rounded-full border-4 shadow-md transition-colors ${
                  repsDone >= requiredReps
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-sky-400 bg-sky-50 text-blue-700"
                }`}
              >
                <Zap
                  className={`h-8 w-8 ${
                    repsDone >= requiredReps
                      ? "fill-amber-400 text-amber-500"
                      : "text-blue-600"
                  }`}
                />
                <span className="mt-1 text-xs font-black">
                  {repsDone} / {requiredReps} Reps
                </span>
              </motion.div>

              <div className="w-full max-w-md rounded-2xl bg-slate-50 px-5 py-3.5 ring-1 ring-slate-200/80">
                <div className="text-lg font-black text-slate-900 sm:text-xl">
                  {burst?.targetPhrase}
                </div>
                <div className="mt-0.5 text-xs font-bold text-blue-600">
                  &ldquo;{burst?.translation}&rdquo;
                </div>
              </div>

              {speechFeedback && (
                <div
                  className={`flex max-w-md items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-bold ${
                    speechFeedback.ok
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                  }`}
                >
                  {speechFeedback.ok ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                  )}
                  <span>{speechFeedback.message}</span>
                </div>
              )}

              <div className="w-full max-w-md shrink-0">
                {repsDone < requiredReps ? (
                  speechSupported ? (
                    <div className="flex items-center gap-2.5">
                      {burst?.audioUrl && (
                        <button
                          type="button"
                          onClick={() => playAudioUrl(burst.audioUrl)}
                          className="rounded-2xl border-2 border-b-4 border-slate-200 bg-white p-3.5 text-blue-600 transition hover:bg-slate-50"
                          title="Listen"
                        >
                          <Volume2 className="h-5 w-5" />
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isListeningRep}
                        onClick={triggerSpeechRep}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 py-3.5 text-sm font-black shadow-md transition ${
                          isListeningRep
                            ? "animate-pulse border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950"
                            : "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white hover:brightness-105"
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
                    <button
                      type="button"
                      onClick={() =>
                        setRepsDone((prev) => Math.min(requiredReps, prev + 1))
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 py-3.5 text-sm font-black text-white"
                    >
                      <Check className="h-4 w-4" />
                      <span>
                        Mark Spoken Rep {repsDone + 1} of {requiredReps}
                      </span>
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    disabled={isCompleting}
                    onClick={handleFinishWorkout}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 py-3.5 text-sm font-black text-white shadow-md transition hover:brightness-105"
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
        </section>
      </div>
    </div>
  );
}