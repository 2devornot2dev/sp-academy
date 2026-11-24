// components/learning-hub/ladder-worksheet-arcade.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  Mic,
  Quote,
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

  // ================= STAGE 1: CONTRAST PAIRS =================
  const [pairWave, setPairWave] = useState<0 | 1>(0);
  const [heardIds, setHeardIds] = useState<Set<string>>(new Set());

  const waveItems = useMemo(
    () => rung.items.slice(pairWave * 4, pairWave * 4 + 4),
    [rung.items, pairWave],
  );
  const wavePairs = useMemo(() => {
    const groups = [1, 2, 3, 4].slice(pairWave * 2, pairWave * 2 + 2);
    return groups.map((g) => waveItems.filter((it) => it.pairGroup === g));
  }, [waveItems, pairWave]);

  const allWaveHeard = waveItems.every((it) => heardIds.has(it.id));

  const handleTapPairCard = (itemId: string, audioUrl?: string | null) => {
    playSfx("tap");
    playAudio(audioUrl);
    setHeardIds((prev) => {
      if (prev.has(itemId)) return prev;
      const next = new Set(prev);
      next.add(itemId);
      return next;
    });
  };

  // ================= STAGE 2: 3-RUNG SENTENCE STACK =================
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
    }
  };

  // ================= STAGE 3: THE FLIP CHALLENGE =================
  const flips = rung.flips;
  const [flipIdx, setFlipIdx] = useState(0);
  const [flipSolved, setFlipSolved] = useState(false);
  const [flipFeedback, setFlipFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isGrading, setIsGrading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startMsRef = useRef<number>(0);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const stopFlipMic = () => {
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

  const startFlipMic = async () => {
    if (!currentFlip || flipSolved || isRecording || isGrading) return;
    if (audioRef.current) audioRef.current.pause();
    playSfx("tap");
    setFlipFeedback(null);

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
          setFlipFeedback({
            ok: false,
            message: "Too short — hold Speak and say the full flipped sentence!",
          });
          return;
        }

        setIsGrading(true);
        try {
          const wav = await convertBlobToWav(blob);
          const fd = new FormData();
          fd.append("audio", wav, "recording.wav");
          fd.append("transcript", currentFlip.targetAnswer);
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
              setFlipSolved(true);
              setFlipFeedback({
                ok: true,
                message: `Speech Score ${score}% — "${currentFlip.targetAnswer}"!`,
              });
            } else {
              playSfx("wrong");
              setFlipFeedback({
                ok: false,
                message: `Scored ${score}%. Listen once or tap the flipped phrase below!`,
              });
            }
          } else {
            playSfx("correct");
            setFlipSolved(true);
            setFlipFeedback({
              ok: true,
              message: `Nice! "${currentFlip.targetAnswer}"`,
            });
          }
        } catch {
          playSfx("correct");
          setFlipSolved(true);
          setFlipFeedback({
            ok: true,
            message: `Nice! "${currentFlip.targetAnswer}"`,
          });
        } finally {
          setIsGrading(false);
        }
      };

      rec.start();
      autoStopTimerRef.current = setTimeout(() => stopFlipMic(), 5000);
    } catch {
      playSfx("wrong");
      setIsRecording(false);
      setFlipFeedback({
        ok: false,
        message: "Mic blocked — tap the correct choice below instead!",
      });
    }
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
      ? `Tap every contrast card to hear how the pairs differ, then climb to the Sentence Stack.`
      : stageIdx === 1
        ? `Tap Rungs 1 → 2 → 3 from bottom to top to watch the word grow into a real sentence.`
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

        {/* 2. EXERCISE CARD (scrolls cleanly on short phones, zero-scroll on desktop) */}
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
            /* ================= STAGE 1: CONTRAST PAIRS ================= */
            <div className="flex flex-1 flex-col justify-between gap-3 md:min-h-0">
              <div className="flex shrink-0 items-center justify-between gap-2">
                <span className="text-[11px] sm:text-xs font-black tracking-wider text-blue-600 uppercase">
                  Stage 1 • Contrast Pairs (Set {pairWave + 1}/2)
                </span>
                <span className="shrink-0 rounded-full bg-sky-100 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-[11px] font-black text-blue-700">
                  {waveItems.filter((i) => heardIds.has(i.id)).length}/
                  {waveItems.length} Heard
                </span>
              </div>

              <div className="grid flex-1 grid-cols-1 gap-2.5 sm:grid-rows-2 sm:gap-3 md:min-h-0">
                {wavePairs.map((pair, pIdx) => (
                  <div
                    key={pIdx}
                    className="grid min-h-0 grid-cols-2 gap-2 sm:gap-3 rounded-2xl sm:rounded-3xl bg-slate-50/90 p-2 sm:p-3 ring-1 ring-slate-200/80"
                  >
                    {pair.map((item) => {
                      const heard = heardIds.has(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            handleTapPairCard(item.id, item.wordAudioUrl)
                          }
                          className={`group relative flex min-h-0 flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5 rounded-xl sm:rounded-2xl border-2 border-b-[4px] p-2.5 sm:p-3 text-left transition-all ${
                            heard
                              ? "border-emerald-400 border-b-emerald-500 bg-white shadow-sm"
                              : "border-slate-200 border-b-slate-300 bg-white hover:-translate-y-0.5 hover:border-sky-400"
                          }`}
                        >
                          {item.imageUrl && (
                            <div className="h-20 w-full sm:h-full sm:max-h-28 sm:w-32 shrink-0 overflow-hidden rounded-lg sm:rounded-xl bg-slate-100">
                              <img
                                src={item.imageUrl}
                                alt={item.gloss}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          )}

                          <div className="min-w-0 w-full flex-1 space-y-0.5 sm:space-y-1">
                            <span className="inline-block rounded-md bg-sky-100 px-1.5 py-0.5 text-[9px] sm:px-2 sm:text-[10px] font-black text-blue-700 uppercase">
                              {item.tag}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="truncate text-sm sm:text-xl font-black text-slate-900">
                                {item.word}
                              </span>
                              <Volume2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-blue-600" />
                            </div>
                            <p className="truncate text-[11px] sm:text-xs font-bold text-slate-500">
                              &ldquo;{item.gloss}&rdquo;
                            </p>
                          </div>

                          {heard && (
                            <span className="absolute top-2 right-2 sm:static flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs">
                              <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 stroke-[3.5]" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              <button
                type="button"
                disabled={!allWaveHeard}
                onClick={() => {
                  if (pairWave === 0) {
                    playSfx("tap");
                    setPairWave(1);
                  } else {
                    playSfx("round-clear");
                    setStageIdx(1);
                  }
                }}
                className={`flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl py-3 sm:py-3.5 text-xs sm:text-sm font-black transition ${
                  allWaveHeard
                    ? "border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-md hover:brightness-105"
                    : "cursor-not-allowed bg-slate-200 text-slate-400"
                }`}
              >
                <span>
                  {pairWave === 0
                    ? "Next 2 Contrast Pairs"
                    : "Next: 3-Rung Sentence Stack"}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : stageIdx === 1 ? (
            /* ================= STAGE 2: 3-RUNG SENTENCE STACK ================= */
            <div className="flex flex-1 flex-col justify-between gap-3 sm:gap-4 md:min-h-0">
              <div className="flex shrink-0 items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-black tracking-wider text-amber-700 uppercase">
                  <Layers className="h-4 w-4 shrink-0" />
                  Stage 2 • 3-Rung Stack ({stackIdx + 1}/{stackItems.length})
                </span>
              </div>

              {currentStack && (
                <div className="my-auto flex flex-col-reverse gap-2.5 sm:gap-3">
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
                        className={`flex items-center justify-between gap-3 sm:gap-4 rounded-2xl border-2 border-b-[4px] p-3 sm:p-4 text-left transition-all ${
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
                          <p className="mt-0.5 text-sm sm:text-xl font-black text-slate-900">
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
              )}

              <button
                type="button"
                disabled={unlockedRungStep < 3}
                onClick={() => {
                  if (stackIdx + 1 < stackItems.length) {
                    playSfx("tap");
                    setStackIdx(stackIdx + 1);
                    setUnlockedRungStep(1);
                  } else {
                    playSfx("round-clear");
                    setStageIdx(2);
                  }
                }}
                className={`flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl py-3 sm:py-3.5 text-xs sm:text-sm font-black transition ${
                  unlockedRungStep >= 3
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
                        onClick={stopFlipMic}
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