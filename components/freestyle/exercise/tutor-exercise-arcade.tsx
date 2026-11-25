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
  Square,
  Trophy,
  AlertCircle,
  Loader2,
  Quote,
} from "lucide-react";
import { getFreestyleTutor } from "@/lib/freestyle/tutors";
import { convertBlobToWav } from "@/lib/audio-utils";
import {
  completeTutorExercise,
  type HydratedTutorExerciseContent,
} from "@/app/actions/tutor-exercise-actions";
import { useSpeak } from "@/hooks/use-speak";
import { playSfx, preloadSfx } from "@/lib/sfx";

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

function normalizeLang(raw?: string): string {
  if (!raw) return "fr-FR";
  const lower = raw.trim().toLowerCase();
  if (lower === "fr" || lower === "french") return "fr-FR";
  if (lower === "es" || lower === "spanish") return "es-ES";
  if (lower === "en" || lower === "english") return "en-US";
  return raw;
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
  const resolvedLang = normalizeLang(targetLanguage);

  const [roundIdx, setRoundIdx] = useState<0 | 1 | 2>(0);
  const [workoutCompleted, setWorkoutCompleted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { speak, stop: stopSpeak, isPlaying: isTutorSpeaking } = useSpeak();
  const round3AutoPlayedRef = useRef(false);

  useEffect(() => {
    preloadSfx();
  }, []);

  const stopAllAudio = () => {
    stopSpeak();
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const playAudioUrl = (url?: string | null) => {
    if (!url) return;
    try {
      stopAllAudio();
      const audio = new Audio(url);
      audioRef.current = audio;
      void audio.play();
    } catch {
      // Ignore autoplay errors
    }
  };

  const speakLine = (text?: string | null, lang = resolvedLang) => {
    if (!text) return;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    void speak(text, lang, 0.95, voiceGender);
  };

  // Auto-model the Round 3 phrase once when entering Voice Drill
  useEffect(() => {
    if (roundIdx === 2 && !round3AutoPlayedRef.current) {
      round3AutoPlayedRef.current = true;
      const t = setTimeout(() => {
        if (content.speechBurst?.audioUrl) {
          playAudioUrl(content.speechBurst.audioUrl);
        } else if (content.speechBurst?.targetPhrase) {
          speakLine(content.speechBurst.targetPhrase, resolvedLang);
        }
      }, 250);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx]);

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
      const nextMatched = new Set(matchedIds);
      nextMatched.add(cardId);
      setMatchedIds(nextMatched);

      playSfx(nextMatched.size >= cards.length ? "round-clear" : "spark");
      if (audioUrl) playAudioUrl(audioUrl);

      const nextUnmatched = shuffledWordPills.find(
        (c) => !nextMatched.has(c.id),
      );
      setSelectedWordId(nextUnmatched?.id ?? null);
    } else {
      playSfx("wrong");
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
        playSfx("correct");
        setForkIdx(forkIdx + 1);
      } else {
        playSfx("round-clear");
        if (currentDashItem.audioUrl) {
          playAudioUrl(currentDashItem.audioUrl);
        }
      }
    } else {
      playSfx("wrong");
      setTrapFeedback(
        currentFork.whyTrap ||
          `Watch out! "${opt.text}" is a common trap here.`,
      );
    }
  };

  const isDashSentenceComplete =
    currentDashItem && builtTokens.length >= currentDashItem.forks.length;

  const advanceDashOrRound = () => {
    playSfx("tap");
    if (dashItemIdx + 1 < dashItems.length) {
      setDashItemIdx(dashItemIdx + 1);
      setForkIdx(0);
      setBuiltTokens([]);
      setTrapFeedback(null);
    } else {
      setRoundIdx(2);
    }
  };

  // ================= ROUND 3 STATE: REAL MIC RECORDING + AZURE GRADING =================
  const burst = content.speechBurst;
  const requiredReps = burst?.requiredReps || 3;
  const [repsDone, setRepsDone] = useState(0);
  const [isRecordingRep, setIsRecordingRep] = useState(false);
  const [isGradingRep, setIsGradingRep] = useState(false);
  const [speechFeedback, setSpeechFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordStartMsRef = useRef<number>(0);
  const autoStopTimerRef = useRef<NodeJS.Timeout | null>(null);

  const cleanupMic = () => {
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupMic();
    };
  }, []);

  const stopAndGradeRep = () => {
    if (
      !mediaRecorderRef.current ||
      mediaRecorderRef.current.state === "inactive"
    ) {
      return;
    }
    playSfx("tap");
    mediaRecorderRef.current.stop();
  };

  const startRecordingRep = async () => {
    if (repsDone >= requiredReps || isRecordingRep || isGradingRep) return;
    stopAllAudio();
    playSfx("tap");
    setSpeechFeedback(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recordStartMsRef.current = Date.now();
      setIsRecordingRep(true);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const elapsedMs = Date.now() - recordStartMsRef.current;
        cleanupMic();
        setIsRecordingRep(false);

        const rawBlob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        if (elapsedMs < 600 || rawBlob.size < 1000) {
          playSfx("wrong");
          setSpeechFeedback({
            ok: false,
            message:
              "Recording was too short — tap Speak, say the full phrase, then tap Done!",
          });
          return;
        }

        setIsGradingRep(true);
        try {
          const wavBlob = await convertBlobToWav(rawBlob);
          const formData = new FormData();
          formData.append("audio", wavBlob, "recording.wav");
          formData.append("transcript", burst?.targetPhrase || "");
          formData.append("language", resolvedLang);

          const res = await fetch("/api/pronunciation-assessment", {
            method: "POST",
            body: formData,
          });

          if (res.ok) {
            const scoreData = await res.json();
            const score = Math.round(
              scoreData?.pronunciationScore ??
                scoreData?.pronScore ??
                scoreData?.accuracyScore ??
                85,
            );

            if (score >= 55) {
              setRepsDone((prev) => {
                const next = Math.min(requiredReps, prev + 1);
                playSfx(next >= requiredReps ? "round-clear" : "correct");
                return next;
              });
              setSpeechFeedback({
                ok: true,
                message: `Pronunciation Score: ${score}% — Nailed it!`,
              });
            } else {
              playSfx("wrong");
              setSpeechFeedback({
                ok: false,
                message: `Scored ${score}%. Listen to the audio once and try saying "${burst?.targetPhrase}" clearly!`,
              });
            }
          } else {
            setRepsDone((prev) => {
              const next = Math.min(requiredReps, prev + 1);
              playSfx(next >= requiredReps ? "round-clear" : "correct");
              return next;
            });
            setSpeechFeedback({
              ok: true,
              message: "Nice pronunciation! Rep locked in.",
            });
          }
        } catch {
          setRepsDone((prev) => {
            const next = Math.min(requiredReps, prev + 1);
            playSfx(next >= requiredReps ? "round-clear" : "correct");
            return next;
          });
          setSpeechFeedback({
            ok: true,
            message: "Nice pronunciation! Rep locked in.",
          });
        } finally {
          setIsGradingRep(false);
        }
      };

      recorder.start();

      autoStopTimerRef.current = setTimeout(() => {
        stopAndGradeRep();
      }, 5000);
    } catch {
      playSfx("wrong");
      setIsRecordingRep(false);
      setSpeechFeedback({
        ok: false,
        message:
          "Microphone access is blocked. Please allow mic permissions in your browser.",
      });
    }
  };

  const handleFinishWorkout = async () => {
    setIsCompleting(true);
    await completeTutorExercise({ userId, exerciseId });
    setIsCompleting(false);
    setWorkoutCompleted(true);
    playSfx("victory");
    confetti({
      particleCount: 140,
      spread: 75,
      origin: { y: 0.6 },
      colors: ["#6366F1", "#10B981", "#F59E0B", "#EC4899"],
    });
    const cheer = resolvedLang.startsWith("es")
      ? "¡Bravo! ¡Excelente trabajo!"
      : resolvedLang.startsWith("en")
        ? "Awesome job! You crushed it!"
        : "Bravo ! Très bien joué !";

    speakLine(cheer, resolvedLang);
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
    <div className="flex h-[calc(100dvh-3rem)] md:h-dvh min-h-0 flex-col overflow-hidden animate-bg p-2.5 font-sans text-slate-900 sm:p-5">
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-2.5 sm:gap-3.5">
        {/* 1. HORIZONTAL AI TUTOR BAR */}
        <div className="flex shrink-0 items-center justify-between gap-2.5 sm:gap-4 rounded-2xl sm:rounded-[1.75rem] bg-white px-3.5 py-2.5 sm:px-5 sm:py-3.5 shadow-sm ring-1 ring-slate-200/70">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3.5">
            <div className="relative shrink-0">
              <img
                src={isTutorHappy ? tutor.avatars.happy : tutor.avatars.default}
                alt={displayTutorName}
                className="h-10 w-10 rounded-xl sm:h-14 sm:w-14 sm:rounded-2xl border-2 border-sky-200 object-cover object-top shadow-xs"
              />
              <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full border-2 border-white bg-emerald-500" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-xs sm:text-sm font-black text-slate-900">
                  {displayTutorName}
                </span>
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[9px] sm:text-[10px] font-black tracking-wider text-blue-700 uppercase">
                  AI Tutor • {level}
                </span>
                <span className="hidden truncate text-[11px] font-bold text-slate-400 md:inline">
                  • {title}
                </span>
              </div>
              <div className="mt-0.5 sm:mt-1 flex items-center gap-1.5 sm:gap-2">
                <p className="flex min-w-0 items-center gap-1 sm:gap-1.5 truncate text-[11px] font-bold text-slate-600 sm:text-sm">
                  <Quote className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 rotate-180 text-blue-500" />
                  <span className="truncate">{tutorCoachMessage}</span>
                </p>
                <button
                  type="button"
                  onClick={() =>
                    isTutorSpeaking
                      ? stopSpeak()
                      : speakLine(tutorCoachMessage, "en-US")
                  }
                  title="Hear coaching tip"
                  className={`inline-flex shrink-0 items-center justify-center rounded-lg border p-1 transition ${
                    isTutorSpeaking
                      ? "border-amber-300 bg-amber-100 text-amber-800"
                      : "border-sky-200 bg-sky-50 text-blue-600 hover:bg-sky-100"
                  }`}
                >
                  <Volume2
                    className={`h-3 w-3 ${isTutorSpeaking ? "animate-pulse" : ""}`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-slate-100 px-2.5 py-1 sm:px-3 sm:py-1.5">
              <div className="hidden sm:block h-2 w-16 overflow-hidden rounded-full bg-slate-200">
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
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-b-[3px] border-slate-200 bg-white px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 active:translate-y-0.5 active:border-b-2"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-blue-600" />
              <span className="hidden sm:inline">Exit</span>
            </Link>
          </div>
        </div>

        {/* 2. EXERCISE CARD UNDERNEATH */}
        <section className="flex min-h-0 flex-1 flex-col overflow-y-auto md:overflow-hidden rounded-2xl sm:rounded-[2rem] bg-white p-3.5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
          {workoutCompleted ? (
            /* ================= WORKOUT COMPLETE ================= */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="m-auto flex max-w-md flex-col items-center space-y-5 py-4 text-center"
            >
              <div className="flex h-18 w-18 sm:h-20 sm:w-20 items-center justify-center rounded-3xl border-b-[5px] border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-lg">
                <Trophy className="h-9 w-9 sm:h-10 sm:w-10" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                  3-Min Workout Complete!
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-slate-500">
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
            <div className="flex min-h-0 flex-1 flex-col gap-2.5 sm:gap-3.5">
              <div className="flex shrink-0 items-center justify-between gap-2">
                <p className="text-[11px] font-black text-slate-800 sm:text-sm">
                  {content.visualMatch?.instruction ||
                    "Select a phrase below, then tap its matching scene"}
                </p>
                <span className="shrink-0 rounded-full bg-sky-100 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-[11px] font-black text-blue-700">
                  {matchedIds.size} / {cards.length} Matched
                </span>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2.5 sm:gap-3">
                {cards.map((card) => {
                  const isMatched = matchedIds.has(card.id);
                  const isWrong = wrongCardId === card.id;

                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => handleCardTap(card.id, card.audioUrl)}
                      className={`group relative h-full w-full overflow-hidden rounded-xl sm:rounded-2xl border-2 transition-all ${
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
                          <CheckCircle2 className="mb-1 h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />
                          <span className="text-xs font-black text-white sm:text-sm">
                            {card.word}
                          </span>
                          <span className="text-[10px] sm:text-[11px] font-bold text-emerald-300">
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
                  onClick={() => {
                    playSfx("tap");
                    setRoundIdx(1);
                  }}
                  className="flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 py-3 sm:py-3.5 text-xs sm:text-sm font-black text-white shadow-md transition hover:brightness-105 active:translate-y-0.5 active:border-b-0"
                >
                  <span>Next</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <div className="grid shrink-0 grid-cols-2 gap-2 sm:gap-2.5">
                  {shuffledWordPills.map((pill) => {
                    const isMatched = matchedIds.has(pill.id);
                    const isSelected = selectedWordId === pill.id;

                    return (
                      <button
                        key={pill.id}
                        type="button"
                        disabled={isMatched}
                        onClick={() => {
                          playSfx("tap");
                          setSelectedWordId(pill.id);
                          if (pill.audioUrl) playAudioUrl(pill.audioUrl);
                        }}
                        className={`flex items-center justify-between rounded-xl sm:rounded-2xl border-2 px-3 py-2 sm:px-3.5 sm:py-2.5 text-left text-xs font-black transition sm:text-sm ${
                          isMatched
                            ? "border-emerald-200 bg-emerald-50 text-emerald-600/60 line-through"
                            : isSelected
                              ? "border-orange-700 border-b-[4px] bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950 shadow-sm"
                              : "border-slate-200 border-b-[4px] bg-white text-slate-800 hover:border-sky-300"
                        }`}
                      >
                        <span className="truncate">{pill.word}</span>
                        <Volume2
                          className={`ml-1.5 sm:ml-2 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${
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
            <div className="flex flex-1 flex-col justify-between gap-3 sm:gap-4 md:min-h-0">
              {currentDashItem && (
                <>
                  <div className="shrink-0 space-y-1 text-center">
                    <span className="text-[10px] sm:text-[11px] font-black tracking-widest text-blue-600 uppercase">
                      Sentence {dashItemIdx + 1} of {dashItems.length}
                    </span>
                    <h3 className="text-base font-black text-slate-900 sm:text-xl">
                      &ldquo;{currentDashItem.promptNative}&rdquo;
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        currentDashItem.audioUrl
                          ? playAudioUrl(currentDashItem.audioUrl)
                          : speakLine(currentDashItem.fullTarget, resolvedLang)
                      }
                      className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-black text-blue-600 transition hover:bg-sky-100"
                    >
                      <Volume2 className="h-3 w-3" />
                      <span>Hear Target Sentence</span>
                    </button>
                  </div>

                  <div className="flex min-h-[72px] sm:min-h-[84px] flex-wrap items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-3 sm:p-4">
                    {builtTokens.map((tok, i) => (
                      <motion.span
                        key={i}
                        initial={{ scale: 0.85, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="rounded-xl border-b-[3px] border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 px-3 py-1 sm:px-3.5 sm:py-1.5 text-xs sm:text-sm font-black text-white shadow-xs"
                      >
                        {tok}
                      </motion.span>
                    ))}

                    {!isDashSentenceComplete && (
                      <span className="animate-pulse rounded-xl bg-amber-100 px-3 py-1 sm:px-3.5 sm:py-1.5 text-xs font-black text-amber-800">
                        Pick chunk {forkIdx + 1} of{" "}
                        {currentDashItem.forks.length}...
                      </span>
                    )}
                  </div>

                  {!isDashSentenceComplete && currentFork ? (
                    <div className="my-auto space-y-2.5 sm:space-y-3">
                      <p className="text-center text-[11px] sm:text-xs font-black tracking-wider text-slate-400 uppercase">
                        Choose the right block
                      </p>
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        {forkOptions.map((opt, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handlePickFork(opt)}
                            className="rounded-2xl border-2 border-b-[5px] border-slate-200 bg-white px-3 py-4 sm:px-4 sm:py-6 text-center text-base font-black text-slate-900 shadow-xs transition hover:-translate-y-0.5 hover:border-sky-400 hover:bg-sky-50/50 active:translate-y-0.5 active:border-b-2 sm:text-xl"
                          >
                            {opt.text}
                          </button>
                        ))}
                      </div>

                      {trapFeedback && (
                        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-[11px] sm:text-xs font-bold text-rose-700">
                          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                          <span>{trapFeedback}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="my-auto flex flex-col items-center gap-3.5 sm:gap-4 text-center">
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
                        className="flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 py-3 sm:py-3.5 text-xs sm:text-sm font-black text-white shadow-md transition hover:brightness-105"
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
            <div className="flex flex-1 flex-col items-center justify-between gap-2.5 py-1 sm:py-2 text-center md:min-h-0">
              <div className="space-y-1">
                <span className="text-[10px] sm:text-[11px] font-black tracking-widest text-blue-600 uppercase">
                  Muscle Memory
                </span>
                <h3 className="text-sm font-black text-slate-900 sm:text-lg">
                  {burst?.instruction ||
                    `Say "${burst?.targetPhrase}" ${requiredReps} times out loud`}
                </h3>
              </div>

              <motion.div
                animate={{ scale: 1 + repsDone * 0.1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className={`flex h-24 w-24 sm:h-28 sm:w-28 flex-col items-center justify-center rounded-full border-4 shadow-md transition-colors ${
                  repsDone >= requiredReps
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-sky-400 bg-sky-50 text-blue-700"
                }`}
              >
                <Zap
                  className={`h-7 w-7 sm:h-8 sm:w-8 ${
                    repsDone >= requiredReps
                      ? "fill-amber-400 text-amber-500"
                      : "text-blue-600"
                  }`}
                />
                <span className="mt-1 text-xs font-black">
                  {repsDone} / {requiredReps} Reps
                </span>
              </motion.div>

              <div className="w-full max-w-md rounded-2xl bg-slate-50 px-4 py-3 sm:px-5 sm:py-3.5 ring-1 ring-slate-200/80">
                <div className="text-base font-black text-slate-900 sm:text-xl">
                  {burst?.targetPhrase}
                </div>
                <div className="mt-0.5 text-xs font-bold text-blue-600">
                  &ldquo;{burst?.translation}&rdquo;
                </div>
              </div>

              {speechFeedback && (
                <div
                  className={`flex max-w-md items-center gap-2 rounded-2xl border px-3.5 py-2 text-[11px] sm:text-xs font-bold ${
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
                  <div className="flex items-center gap-2">
                    {burst?.audioUrl && (
                      <button
                        type="button"
                        onClick={() => playAudioUrl(burst.audioUrl)}
                        className="rounded-2xl border-2 border-b-4 border-slate-200 bg-white p-3 sm:p-3.5 text-blue-600 transition hover:bg-slate-50"
                        title="Listen"
                      >
                        <Volume2 className="h-5 w-5" />
                      </button>
                    )}

                    {isRecordingRep ? (
                      <button
                        type="button"
                        onClick={stopAndGradeRep}
                        className="flex flex-1 animate-pulse items-center justify-center gap-2 rounded-2xl border-b-4 border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 py-3 sm:py-3.5 text-xs sm:text-sm font-black text-slate-950 shadow-md transition"
                      >
                        <Square className="h-4 w-4 fill-current" />
                        <span>Recording... Tap Done</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isGradingRep}
                        onClick={startRecordingRep}
                        className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 py-3 sm:py-3.5 text-xs sm:text-sm font-black text-white shadow-md transition hover:brightness-105 disabled:opacity-60"
                      >
                        {isGradingRep ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Checking Pronunciation...</span>
                          </>
                        ) : (
                          <>
                            <Mic className="h-4 w-4" />
                            <span>
                              Speak Rep {repsDone + 1} of {requiredReps}
                            </span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isCompleting}
                    onClick={handleFinishWorkout}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 py-3 sm:py-3.5 text-xs sm:text-sm font-black text-white shadow-md transition hover:brightness-105"
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