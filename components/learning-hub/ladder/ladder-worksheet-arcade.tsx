// components/learning-hub/ladder-worksheet-arcade.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  Mic,
  Quote,
  Sparkles,
  Square,
  Trophy,
  Volume2,
  AlertCircle,
  Layers,
  Zap,
} from "lucide-react";
import { useSprite } from "@/context/sprite-context";
import { convertBlobToWav } from "@/lib/audio-utils";
import { playSfx, preloadSfx } from "@/lib/sfx";
import {
  completeLadderRung,
  type HydratedLadderRung,
} from "@/app/actions/ladder-actions";

export function LadderWorksheetArcade({
  userId,
  rung,
}: {
  userId: string;
  rung: HydratedLadderRung;
}) {
  const router = useRouter();
  const { spriteName, avatarSrc } = useSprite();

  const [stageIdx, setStageIdx] = useState<0 | 1 | 2>(0);
  const [completed, setCompleted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    preloadSfx();
  }, []);

  const playAudio = (url?: string | null) => {
    if (!url) return;
    try {
      if (audioRef.current) audioRef.current.pause();
      const a = new Audio(url);
      audioRef.current = a;
      void a.play();
    } catch {}
  };

  // ================= SHARED MIC / PRONUNCIATION RECORDER =================
  const [isRecording, setIsRecording] = useState(false);
  const [isGrading, setIsGrading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startMsRef = useRef<number>(0);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const stopActiveMic = () => {
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      playSfx("tap");
      mediaRecorderRef.current.stop();
    }
  };

  const startSpeechAssessment = async ({
    transcript,
    shortErrorMessage,
    micBlockedMessage,
    onPass,
    onRetry,
  }: {
    transcript: string;
    shortErrorMessage: string;
    micBlockedMessage: string;
    onPass: (score: number | null) => void;
    onRetry: (message: string) => void;
  }) => {
    if (isRecording || isGrading) return;
    if (audioRef.current) audioRef.current.pause();
    playSfx("tap");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      mediaRecorderRef.current = rec;
      startMsRef.current = Date.now();
      setIsRecording(true);

      rec.ondataavailable = (e) => {
        if (e.data?.size > 0) chunksRef.current.push(e.data);
      };

      rec.onstop = async () => {
        const elapsed = Date.now() - startMsRef.current;
        cleanupMic();
        setIsRecording(false);
        const blob = new Blob(chunksRef.current, {
          type: rec.mimeType || "audio/webm",
        });

        if (elapsed < 500 || blob.size < 900) {
          playSfx("wrong");
          onRetry(shortErrorMessage);
          return;
        }

        setIsGrading(true);
        try {
          const wav = await convertBlobToWav(blob);
          const fd = new FormData();
          fd.append("audio", wav, "recording.wav");
          fd.append("transcript", transcript);
          fd.append("language", rung.targetLanguage);

          const res = await fetch("/api/pronunciation-assessment", {
            method: "POST",
            body: fd,
          });
          if (res.ok) {
            const data = await res.json();
            const score = Math.round(
              data?.pronunciationScore ??
                data?.pronScore ??
                data?.accuracyScore ??
                85,
            );
            if (score >= 55) {
              playSfx("correct");
              onPass(score);
            } else {
              playSfx("wrong");
              onRetry(`Scored ${score}% — listen once and give it another try!`);
            }
          } else {
            playSfx("correct");
            onPass(null);
          }
        } catch {
          playSfx("correct");
          onPass(null);
        } finally {
          setIsGrading(false);
        }
      };

      rec.start();
      autoStopTimerRef.current = setTimeout(() => stopActiveMic(), 5000);
    } catch {
      playSfx("wrong");
      setIsRecording(false);
      onRetry(micBlockedMessage);
    }
  };

  // ================= STAGE 1: CONTRAST PAIRS + SNAP MATCH =================
  const [pairWave, setPairWave] = useState<0 | 1>(0);
  const [pairPhase, setPairPhase] = useState<"explore" | "match">("explore");
  const [heardIds, setHeardIds] = useState<Set<string>>(new Set());
  const [matchIdx, setMatchIdx] = useState(0);
  const [matchDone, setMatchDone] = useState(false);
  const [matchWrongId, setMatchWrongId] = useState<string | null>(null);
  const [matchSolvedIds, setMatchSolvedIds] = useState<Set<string>>(new Set());

  const waveItems = useMemo(
    () => rung.items.slice(pairWave * 4, pairWave * 4 + 4),
    [rung.items, pairWave],
  );
  const wavePairs = useMemo(() => {
    const groups = [1, 2, 3, 4].slice(pairWave * 2, pairWave * 2 + 2);
    return groups.map((g) => waveItems.filter((it) => it.pairGroup === g));
  }, [waveItems, pairWave]);

  // Pick 1 item from each pair in the current wave for a fast 2-question Snap Match
  const matchTargets = useMemo(() => {
    const picks: typeof waveItems = [];
    wavePairs.forEach((pair, pIdx) => {
      if (pair.length > 0) {
        picks.push(pair[(pairWave + pIdx) % pair.length]);
      }
    });
    return picks;
  }, [wavePairs, pairWave]);

  const currentMatchTarget = matchTargets[matchIdx] ?? null;
  const allWaveHeard = waveItems.every((it) => heardIds.has(it.id));

  const handleTapPairCard = (item: (typeof waveItems)[number]) => {
    if (pairPhase === "explore") {
      playSfx("tap");
      playAudio(item.wordAudioUrl);
      setHeardIds((prev) => {
        if (prev.has(item.id)) return prev;
        const next = new Set(prev);
        next.add(item.id);
        return next;
      });
      return;
    }

    // Snap Match phase: active recall from English meaning -> target word
    if (matchDone || !currentMatchTarget) return;

    if (item.id === currentMatchTarget.id) {
      playSfx("correct");
      playAudio(item.wordAudioUrl);
      setMatchWrongId(null);
      setMatchSolvedIds((prev) => {
        const next = new Set(prev);
        next.add(item.id);
        return next;
      });

      if (matchIdx + 1 < matchTargets.length) {
        setMatchIdx((prev) => prev + 1);
      } else {
        setMatchDone(true);
      }
    } else {
      playSfx("wrong");
      setMatchWrongId(item.id);
    }
  };

  const handleAdvanceStage1 = () => {
    if (pairPhase === "explore") {
      playSfx("tap");
      setPairPhase("match");
      setMatchIdx(0);
      setMatchDone(false);
      setMatchWrongId(null);
      setMatchSolvedIds(new Set());
      return;
    }

    if (pairWave === 0) {
      playSfx("round-clear");
      setPairWave(1);
      setPairPhase("explore");
      setMatchIdx(0);
      setMatchDone(false);
      setMatchWrongId(null);
      setMatchSolvedIds(new Set());
    } else {
      playSfx("round-clear");
      setStageIdx(1);
    }
  };

  // ================= STAGE 2: 3-RUNG SENTENCE STACK + SPEAK RUNG 3 =================
  const stackItems = useMemo(() => {
    const picked: typeof rung.items = [];
    for (const g of [1, 2, 3, 4]) {
      const match = rung.items.find((it) => it.pairGroup === g);
      if (match) picked.push(match);
    }
    return picked.length > 0 ? picked : rung.items.slice(0, 4);
  }, [rung.items]);

  const [stackIdx, setStackIdx] = useState(0);
  const [unlockedRungStep, setUnlockedRungStep] = useState<1 | 2 | 3>(1);
  const [rung3Heard, setRung3Heard] = useState(false);
  const [stackSpoken, setStackSpoken] = useState(false);
  const [stackFeedback, setStackFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const currentStack = stackItems[stackIdx];

  const handleClimbStackRung = (stepNum: 1 | 2 | 3) => {
    if (!currentStack) return;
    playSfx(stepNum === 3 ? "spark" : "tap");

    if (stepNum === 1) {
      playAudio(currentStack.wordAudioUrl);
      if (unlockedRungStep < 2) setUnlockedRungStep(2);
    } else if (stepNum === 2) {
      playAudio(currentStack.rung2AudioUrl);
      if (unlockedRungStep < 3) setUnlockedRungStep(3);
    } else {
      playAudio(currentStack.rung3AudioUrl);
      setRung3Heard(true);
    }
  };

  const startStackMic = () => {
    if (!currentStack || stackSpoken) return;
    setStackFeedback(null);
    void startSpeechAssessment({
      transcript: currentStack.rung3,
      shortErrorMessage: "Too short — say the full Rung 3 sentence out loud!",
      micBlockedMessage:
        "Mic unavailable — tap 'Continue without mic' below to advance.",
      onPass: (score) => {
        setStackSpoken(true);
        setStackFeedback({
          ok: true,
          message: score
            ? `Nailed it! Speech Score ${score}% — "${currentStack.rung3}"`
            : `Great job saying "${currentStack.rung3}"!`,
        });
      },
      onRetry: (msg) => {
        setStackFeedback({ ok: false, message: msg });
      },
    });
  };

  // ================= STAGE 3: THE FLIP CHALLENGE =================
  const flips = rung.flips;
  const [flipIdx, setFlipIdx] = useState(0);
  const [flipSolved, setFlipSolved] = useState(false);
  const [flipFeedback, setFlipFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const currentFlip = flips[flipIdx];

  const flipChoices = useMemo(() => {
    if (!currentFlip) return [];
    const list = [
      currentFlip.targetAnswer,
      ...(currentFlip.distractors || []).slice(0, 3),
    ];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }, [currentFlip]);

  useEffect(() => {
    if (stageIdx === 2 && currentFlip?.promptAudioUrl) {
      const t = setTimeout(() => playAudio(currentFlip.promptAudioUrl), 250);
      return () => clearTimeout(t);
    }
  }, [stageIdx, flipIdx, currentFlip?.promptAudioUrl]);

  const handleFlipTapChoice = (choice: string) => {
    if (!currentFlip || flipSolved) return;
    const norm = (s: string) => s.trim().toLowerCase();
    const isRight =
      norm(choice) === norm(currentFlip.targetAnswer) ||
      currentFlip.acceptableAnswers.some((a) => norm(a) === norm(choice));

    if (isRight) {
      playSfx("correct");
      playAudio(currentFlip.targetAnswerAudioUrl);
      setFlipSolved(true);
      setFlipFeedback({
        ok: true,
        message: `"${currentFlip.targetAnswer}" — ${currentFlip.targetAnswerNative}`,
      });
    } else {
      playSfx("wrong");
      setFlipFeedback({
        ok: false,
        message: `Not quite — read the cue carefully and try again!`,
      });
    }
  };

  const startFlipMic = () => {
    if (!currentFlip || flipSolved) return;
    setFlipFeedback(null);
    void startSpeechAssessment({
      transcript: currentFlip.targetAnswer,
      shortErrorMessage:
        "Too short — tap Speak and say the full flipped sentence!",
      micBlockedMessage: "Mic blocked — tap the correct choice below instead!",
      onPass: (score) => {
        setFlipSolved(true);
        setFlipFeedback({
          ok: true,
          message: score
            ? `Speech Score ${score}% — "${currentFlip.targetAnswer}"!`
            : `Nice! "${currentFlip.targetAnswer}"`,
        });
      },
      onRetry: (msg) => {
        setFlipFeedback({ ok: false, message: msg });
      },
    });
  };

  const handleFinishRung = async () => {
    setIsSaving(true);
    await completeLadderRung({
      userId,
      ladderPackId: rung.id,
      targetLanguage: rung.targetLanguage,
      score: 100,
    });
    setIsSaving(false);
    setCompleted(true);
    playSfx("victory");
    confetti({
      particleCount: 140,
      spread: 75,
      origin: { y: 0.6 },
      colors: ["#6366F1", "#10B981", "#F59E0B", "#EC4899"],
    });
    router.refresh();
  };

  const coachMessage = completed
    ? `Rung ${rung.rungOrder} cleared! All 8 expressions are now in your Word Matrix.`
    : stageIdx === 0
      ? pairPhase === "explore"
        ? `Tap both sides of each opposite pair to hear how they contrast.`
        : matchDone
          ? `Snap Match cleared! Ready for the next set.`
          : `Quick Recall: tap the word that matches the English cue!`
      : stageIdx === 1
        ? !rung3Heard
          ? `Tap Rungs 1 → 2 → 3 from bottom to top to hear the sentence grow.`
          : stackSpoken
            ? `Clean delivery! Climb to the next sentence ladder.`
            : `Now say Rung 3 out loud to lock the full sentence into muscle memory!`
        : `Read the cue, then speak (or tap) the flipped transformation!`;

  return (
    <div className="flex h-[calc(100dvh-3rem)] md:h-dvh min-h-0 flex-col overflow-hidden animate-bg p-2.5 font-sans text-slate-900 sm:p-5">
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-2.5 sm:gap-3.5">
        {/* 1. HORIZONTAL VOX/VIVI COACH BAR */}
        <div className="flex shrink-0 items-center justify-between gap-2.5 sm:gap-4 rounded-2xl sm:rounded-[1.75rem] bg-white px-3.5 py-2.5 sm:px-5 sm:py-3.5 shadow-sm ring-1 ring-slate-200/70">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3.5">
            <div className="relative shrink-0">
              <img
                src={avatarSrc}
                alt={spriteName}
                className="h-10 w-10 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl border-2 border-sky-200 object-cover object-top shadow-xs"
              />
              <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full border-2 border-white bg-emerald-500" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="truncate text-xs sm:text-sm font-black text-slate-900">
                  {rung.icon} Rung {rung.rungOrder}: {rung.title}
                </span>
                <span className="hidden sm:inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-amber-800 uppercase">
                  {spriteName} Coach
                </span>
              </div>
              <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] sm:text-sm font-bold text-slate-600">
                <Quote className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 rotate-180 text-blue-500" />
                <span className="truncate">{coachMessage}</span>
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
            <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 sm:px-3 sm:py-1.5">
              <div className="hidden sm:block h-2 w-16 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 via-amber-400 to-emerald-400 transition-all duration-500"
                  style={{
                    width: completed
                      ? "100%"
                      : `${Math.round(((stageIdx + 1) / 3) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-[11px] font-black text-slate-700">
                {completed ? "3/3" : `${stageIdx + 1}/3`}
              </span>
            </div>

            <Link
              href="/learning-hub/ladder"
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-b-[3px] border-slate-200 bg-white px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-blue-600" />
              <span className="hidden sm:inline">Ladder</span>
            </Link>
          </div>
        </div>

        {/* 2. EXERCISE CARD */}
        <section className="flex min-h-0 flex-1 flex-col overflow-y-auto md:overflow-hidden rounded-2xl sm:rounded-[2rem] bg-white p-3.5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
          {completed ? (
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
                  Rung {rung.rungOrder} Cleared!
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-slate-500">
                  You mastered {rung.title} and banked all 8 items in your Word
                  Matrix.
                </p>
              </div>

              <div className="flex w-full flex-col gap-2.5 sm:flex-row">
                <Link
                  href="/learning-hub"
                  className="flex flex-1 items-center justify-center rounded-2xl border-2 border-b-4 border-slate-200 bg-white px-4 py-3.5 text-xs font-black text-slate-700 hover:bg-slate-50"
                >
                  Learning Hub
                </Link>
                <Link
                  href="/learning-hub/ladder"
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-5 py-3.5 text-xs font-black text-white shadow-md hover:brightness-105"
                >
                  <span>Next Rung</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          ) : stageIdx === 0 ? (
            /* ================= STAGE 1: CONTRAST PAIRS + SNAP MATCH ================= */
            <div className="flex flex-1 flex-col justify-between gap-2.5 sm:gap-3 md:min-h-0">
              <div className="flex shrink-0 items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-black tracking-wider text-blue-600 uppercase">
                  {pairPhase === "match" && (
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  )}
                  Stage 1 •{" "}
                  {pairPhase === "explore"
                    ? `Contrast Pairs (Set ${pairWave + 1}/2)`
                    : `Snap Match (Set ${pairWave + 1}/2)`}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-[11px] font-black ${
                    pairPhase === "match"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-sky-100 text-blue-700"
                  }`}
                >
                  {pairPhase === "explore"
                    ? `${waveItems.filter((i) => heardIds.has(i.id)).length}/${waveItems.length} Heard`
                    : `${matchSolvedIds.size}/${matchTargets.length} Matched`}
                </span>
              </div>

              {/* Snap Match Prompt Banner */}
              {pairPhase === "match" && (
                <div
                  className={`flex shrink-0 items-center justify-between gap-3 rounded-2xl border-2 px-3.5 py-2.5 sm:px-4 ${
                    matchDone
                      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                      : "border-indigo-200 bg-indigo-50/80 text-indigo-950"
                  }`}
                >
                  {matchDone ? (
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-black">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span>
                        Spot on! You nailed all {matchTargets.length} opposite
                        matches.
                      </span>
                    </div>
                  ) : (
                    <div className="flex min-w-0 items-center gap-2 text-xs sm:text-sm font-black">
                      <span className="shrink-0 rounded-lg bg-indigo-600 px-2 py-0.5 text-[10px] text-white uppercase">
                        Tap Match
                      </span>
                      <span className="truncate">
                        Which word means:{" "}
                        <span className="text-indigo-700 underline decoration-indigo-300 decoration-2 underline-offset-2">
                          &ldquo;{currentMatchTarget?.gloss}&rdquo;
                        </span>
                        ?
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid flex-1 grid-cols-1 gap-2.5 sm:grid-rows-2 sm:gap-3 md:min-h-0">
                {wavePairs.map((pair, pIdx) => {
                  const pairNumber = pairWave * 2 + pIdx + 1;
                  const pairBothHeard =
                    pair.length > 0 && pair.every((it) => heardIds.has(it.id));

                  return (
                    <div
                      key={pIdx}
                      className={`relative flex min-h-0 flex-col justify-center gap-1.5 rounded-2xl sm:rounded-3xl p-2 sm:p-3 ring-1 transition-colors ${
                        pairPhase === "explore" && pairBothHeard
                          ? "bg-emerald-50/60 ring-emerald-300"
                          : "bg-slate-50/95 ring-slate-200/90"
                      }`}
                    >
                      {/* Pair Header Label */}
                      <div className="flex items-center justify-between px-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-black tracking-wider text-slate-500 uppercase">
                          <ArrowLeftRight className="h-3 w-3 text-indigo-500" />
                          Pair {pairNumber} • Opposite Contrast
                        </span>
                        {pair[0] && pair[1] && (
                          <span className="truncate text-[10px] font-extrabold text-slate-400">
                            {pair[0].word} ↔ {pair[1].word}
                          </span>
                        )}
                      </div>

                      {/* 2-Card Contrast Grid with central Flip badge */}
                      <div className="relative grid min-h-0 flex-1 grid-cols-2 gap-2.5 sm:gap-4">
                        <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
                          <div
                            className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border-2 border-b-[3px] text-[10px] font-black shadow-md transition-colors ${
                              pairPhase === "explore" && pairBothHeard
                                ? "border-emerald-600 bg-emerald-500 text-white"
                                : "border-indigo-700 bg-gradient-to-b from-indigo-500 to-purple-600 text-white"
                            }`}
                          >
                            <ArrowLeftRight className="h-3.5 w-3.5 stroke-[2.75]" />
                          </div>
                        </div>

                        {pair.map((item, sideIdx) => {
                          const heard = heardIds.has(item.id);
                          const isLeft = sideIdx === 0;
                          const isSolvedInMatch = matchSolvedIds.has(item.id);
                          const isWrongInMatch =
                            pairPhase === "match" && matchWrongId === item.id;

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleTapPairCard(item)}
                              className={`group relative flex min-h-0 flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3.5 rounded-xl sm:rounded-2xl border-2 border-b-[4px] p-2.5 sm:p-3 text-left transition-all ${
                                isWrongInMatch
                                  ? "border-rose-400 border-b-rose-600 bg-rose-50"
                                  : pairPhase === "match"
                                    ? isSolvedInMatch
                                      ? "border-emerald-500 border-b-emerald-700 bg-emerald-50/70 shadow-sm"
                                      : "border-indigo-200 border-b-indigo-300 bg-white hover:-translate-y-0.5 hover:border-indigo-400"
                                    : heard
                                      ? "border-emerald-400 border-b-emerald-600 bg-white shadow-sm"
                                      : isLeft
                                        ? "border-amber-200/90 border-b-amber-400 bg-white hover:-translate-y-0.5 hover:border-amber-400"
                                        : "border-sky-200/90 border-b-sky-400 bg-white hover:-translate-y-0.5 hover:border-sky-400"
                              }`}
                            >
                              {item.imageUrl && (
                                <div className="h-20 w-full sm:h-full sm:max-h-24 sm:w-28 shrink-0 overflow-hidden rounded-lg sm:rounded-xl bg-slate-100">
                                  <img
                                    src={item.imageUrl}
                                    alt={item.word}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              )}

                              <div className="min-w-0 w-full sm:flex-1 space-y-0.5 sm:space-y-1">
                                <span
                                  className={`inline-block rounded-md px-1.5 py-0.5 text-[9px] sm:px-2 sm:text-[10px] font-black uppercase ${
                                    isLeft
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-sky-100 text-blue-700"
                                  }`}
                                >
                                  {isLeft ? "Side A" : "Side B"} • {item.tag}
                                </span>

                                <div className="flex items-center gap-1">
                                  <span className="truncate text-sm sm:text-xl font-black text-slate-900">
                                    {item.word}
                                  </span>
                                  {pairPhase === "explore" && (
                                    <Volume2
                                      className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${
                                        isLeft
                                          ? "text-amber-600"
                                          : "text-blue-600"
                                      }`}
                                    />
                                  )}
                                </div>

                                <p className="line-clamp-2 text-[11px] sm:text-xs font-bold leading-snug text-slate-500">
                                  {pairPhase === "explore" || isSolvedInMatch
                                    ? `"${item.gloss}"`
                                    : "Tap to match"}
                                </p>
                              </div>

                              {((pairPhase === "explore" && heard) ||
                                (pairPhase === "match" && isSolvedInMatch)) && (
                                <span className="absolute top-2 right-2 sm:static flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs">
                                  <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 stroke-[3.5]" />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={pairPhase === "explore" ? !allWaveHeard : !matchDone}
                onClick={handleAdvanceStage1}
                className={`flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl py-3 sm:py-3.5 text-xs sm:text-sm font-black transition ${
                  (pairPhase === "explore" ? allWaveHeard : matchDone)
                    ? pairPhase === "match"
                      ? "border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-md hover:brightness-105"
                      : "border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-md hover:brightness-105"
                    : "cursor-not-allowed bg-slate-200 text-slate-400"
                }`}
              >
                <span>
                  {pairPhase === "explore"
                    ? "Quick Snap Match (2)"
                    : pairWave === 0
                      ? "Next 2 Contrast Pairs"
                      : "Next: 3-Rung Sentence Stack"}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : stageIdx === 1 ? (
            /* ================= STAGE 2: 3-RUNG SENTENCE STACK + SPEAK RUNG 3 ================= */
            <div className="flex flex-1 flex-col justify-between gap-3 sm:gap-4 md:min-h-0">
              <div className="flex shrink-0 items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-black tracking-wider text-amber-700 uppercase">
                  <Layers className="h-4 w-4 shrink-0" />
                  Stage 2 • 3-Rung Stack ({stackIdx + 1}/{stackItems.length})
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                    stackSpoken
                      ? "bg-emerald-100 text-emerald-700"
                      : rung3Heard
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {stackSpoken
                    ? "Spoken ✓"
                    : rung3Heard
                      ? "Speak Rung 3"
                      : `Step ${unlockedRungStep}/3`}
                </span>
              </div>

              {currentStack && (
                <div className="my-auto flex flex-col gap-3">
                  <div className="flex flex-col-reverse gap-2 sm:gap-2.5">
                    {[
                      {
                        num: 1 as const,
                        label: "Rung 1 • Core Word",
                        text: currentStack.rung1,
                        gloss: currentStack.gloss,
                      },
                      {
                        num: 2 as const,
                        label: "Rung 2 • Short Clause",
                        text: currentStack.rung2,
                        gloss: currentStack.rung2Gloss,
                      },
                      {
                        num: 3 as const,
                        label: "Rung 3 • Full Sentence",
                        text: currentStack.rung3,
                        gloss: currentStack.rung3Gloss,
                      },
                    ].map((stepObj) => {
                      const isAvailable = unlockedRungStep >= stepObj.num;
                      return (
                        <button
                          key={stepObj.num}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => handleClimbStackRung(stepObj.num)}
                          className={`flex items-center justify-between gap-3 sm:gap-4 rounded-2xl border-2 border-b-[4px] p-2.5 sm:p-3.5 text-left transition-all ${
                            isAvailable
                              ? stepObj.num === 3
                                ? "border-emerald-500 border-b-emerald-700 bg-emerald-50/70 hover:-translate-y-0.5"
                                : "border-sky-300 border-b-blue-500 bg-sky-50/50 hover:-translate-y-0.5"
                              : "cursor-not-allowed border-slate-200 bg-slate-50 opacity-45"
                          }`}
                        >
                          <div className="min-w-0">
                            <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
                              {stepObj.label}
                            </span>
                            <p className="mt-0.5 text-sm sm:text-lg font-black text-slate-900">
                              {stepObj.text}
                            </p>
                            <p className="text-[11px] sm:text-xs font-semibold text-slate-500">
                              &ldquo;{stepObj.gloss}&rdquo;
                            </p>
                          </div>

                          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl border-b-2 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white">
                            <Volume2 className="h-4 w-4" />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Speak Rung 3 Out Loud Box (Unlocks after tapping Rung 3) */}
                  {rung3Heard && (
                    <div className="space-y-2 rounded-2xl border-2 border-sky-200 bg-sky-50/60 p-3 text-center">
                      {isRecording ? (
                        <button
                          type="button"
                          onClick={stopActiveMic}
                          className="flex w-full animate-pulse items-center justify-center gap-2 rounded-2xl border-b-4 border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 py-2.5 text-xs sm:text-sm font-black text-slate-950"
                        >
                          <Square className="h-4 w-4 fill-current" />
                          <span>Listening... Tap Done</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={stackSpoken || isGrading}
                          onClick={startStackMic}
                          className={`flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 py-2.5 text-xs sm:text-sm font-black text-white shadow-sm transition ${
                            stackSpoken
                              ? "border-emerald-700 bg-emerald-500"
                              : "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 hover:brightness-105 disabled:opacity-50"
                          }`}
                        >
                          {isGrading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : stackSpoken ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Mic className="h-4 w-4" />
                          )}
                          <span>
                            {isGrading
                              ? "Checking Pronunciation..."
                              : stackSpoken
                                ? "Rung 3 Spoken!"
                                : `Say Rung 3 Out Loud: "${currentStack.rung3}"`}
                          </span>
                        </button>
                      )}

                      {stackFeedback && (
                        <p
                          className={`text-[11px] font-bold ${
                            stackFeedback.ok
                              ? "text-emerald-700"
                              : "text-rose-600"
                          }`}
                        >
                          {stackFeedback.message}
                        </p>
                      )}

                      {!stackSpoken && !isRecording && !isGrading && (
                        <button
                          type="button"
                          onClick={() => {
                            playSfx("tap");
                            setStackSpoken(true);
                          }}
                          className="text-[11px] font-bold text-slate-400 underline underline-offset-2 hover:text-slate-600"
                        >
                          Can&apos;t speak right now? Continue without mic
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                disabled={!stackSpoken}
                onClick={() => {
                  stopActiveMic();
                  if (stackIdx + 1 < stackItems.length) {
                    playSfx("tap");
                    setStackIdx(stackIdx + 1);
                    setUnlockedRungStep(1);
                    setRung3Heard(false);
                    setStackSpoken(false);
                    setStackFeedback(null);
                  } else {
                    playSfx("round-clear");
                    setStageIdx(2);
                  }
                }}
                className={`flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl py-3 sm:py-3.5 text-xs sm:text-sm font-black transition ${
                  stackSpoken
                    ? "border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-md hover:brightness-105"
                    : "cursor-not-allowed bg-slate-200 text-slate-400"
                }`}
              >
                <span>
                  {stackIdx + 1 < stackItems.length
                    ? "Next Sentence Ladder"
                    : "Final Stage: Flip Challenge"}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            /* ================= STAGE 3: THE FLIP CHALLENGE ================= */
            <div className="flex flex-1 flex-col justify-between gap-3 md:min-h-0">
              <div className="flex shrink-0 items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-black tracking-wider text-purple-700 uppercase">
                  <Zap className="h-4 w-4 fill-current" />
                  Stage 3 • Flip Challenge ({flipIdx + 1}/{flips.length})
                </span>
              </div>

              {currentFlip && (
                <div className="my-auto space-y-3 sm:space-y-4 text-center">
                  <div className="space-y-1">
                    <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-[11px] sm:text-xs font-black text-amber-900">
                      {currentFlip.cueNative}
                    </span>
                    <div className="mt-1.5 flex items-center justify-center gap-2">
                      <h3 className="text-lg sm:text-2xl font-black text-slate-900">
                        &ldquo;{currentFlip.promptTarget}&rdquo;
                      </h3>
                      {currentFlip.promptAudioUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            playSfx("tap");
                            playAudio(currentFlip.promptAudioUrl);
                          }}
                          className="rounded-xl border border-sky-200 bg-sky-50 p-1.5 sm:p-2 text-blue-600 hover:bg-sky-100"
                        >
                          <Volume2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] sm:text-xs font-semibold text-slate-400">
                      ({currentFlip.promptNative})
                    </p>
                  </div>

                  {/* Speak Option */}
                  <div className="mx-auto max-w-md">
                    {isRecording ? (
                      <button
                        type="button"
                        onClick={stopActiveMic}
                        className="flex w-full animate-pulse items-center justify-center gap-2 rounded-2xl border-b-4 border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 py-2.5 sm:py-3 text-xs sm:text-sm font-black text-slate-950"
                      >
                        <Square className="h-4 w-4 fill-current" />
                        <span>Listening... Tap Done</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={flipSolved || isGrading}
                        onClick={startFlipMic}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 py-2.5 sm:py-3 text-xs sm:text-sm font-black text-white shadow-sm disabled:opacity-50"
                      >
                        {isGrading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Mic className="h-4 w-4" />
                        )}
                        <span>
                          {isGrading
                            ? "Checking..."
                            : "Speak the Flipped Sentence"}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Or Quick-Tap 2x2 Choices */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                    {flipChoices.map((opt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        disabled={flipSolved}
                        onClick={() => handleFlipTapChoice(opt)}
                        className={`rounded-2xl border-2 border-b-[4px] px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm font-black transition ${
                          flipSolved && opt === currentFlip.targetAnswer
                            ? "border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white"
                            : "border-slate-200 border-b-slate-300 bg-white text-slate-800 hover:border-sky-300"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  {flipFeedback && (
                    <div
                      className={`mx-auto flex max-w-md items-center justify-center gap-2 rounded-2xl border px-3.5 py-2 text-[11px] sm:text-xs font-bold ${
                        flipFeedback.ok
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-rose-200 bg-rose-50 text-rose-700"
                      }`}
                    >
                      {flipFeedback.ok ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                      )}
                      <span>{flipFeedback.message}</span>
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                disabled={!flipSolved || isSaving}
                onClick={() => {
                  if (flipIdx + 1 < flips.length) {
                    playSfx("tap");
                    setFlipIdx(flipIdx + 1);
                    setFlipSolved(false);
                    setFlipFeedback(null);
                  } else {
                    void handleFinishRung();
                  }
                }}
                className={`flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl py-3 sm:py-3.5 text-xs sm:text-sm font-black transition ${
                  flipSolved
                    ? "border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-md hover:brightness-105"
                    : "cursor-not-allowed bg-slate-200 text-slate-400"
                }`}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>
                      {flipIdx + 1 < flips.length
                        ? "Next Flip Challenge"
                        : `Complete Rung ${rung.rungOrder}!`}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}