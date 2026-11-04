"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Square,
  ArrowRight,
  RotateCcw,
  Loader2,
  Volume2,
  Headphones,
  AlertCircle,
  Turtle,
  Sparkles,
  Check,
  Lock,
} from "lucide-react";
import { useS3Media } from "@/context/s3-context";
import { useWordAudio } from "@/context/word-audio-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMatrix } from "@/context/matrix-context";

type WordTile = {
  id: string;
  text: string;
};

function isSameWord(a?: string, b?: string) {
  if (!a || !b) return false;
  return a.trim() === b.trim();
}

export function ListeningStep({
  data,
  onNext,
}: {
  data: any;
  onNext: () => void;
}) {
  const { playWord, stopAudio: stopWordAudio } = useWordAudio();
  const { trackInteraction } = useMatrix();

  const hasTrackedSeen = useRef(false);
  const hasHeardMainAudio = useRef(false);
  const heardTileIds = useRef<Set<string>>(new Set());
  const lastAudioTriggerRef = useRef<number>(0);

  const { urls, isLoading: isAudioLoading } = useS3Media([data.audioS3Key]);
  const resolvedAudioUrl = urls[0];

  const [isPlaying, setIsPlaying] = useState(false);
  const [playMode, setPlayMode] = useState<"words" | "sentence">("words");
  const [activeWordIdx, setActiveWordIdx] = useState<number | null>(null);
  const [hasCompletedFirstListen, setHasCompletedFirstListen] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sequenceTokenRef = useRef<number>(0);

  const initialTiles: WordTile[] = useMemo(
    () =>
      (data.wordBank || []).map((word: string, index: number) => ({
        id: `word-tile-${index}-${word}`,
        text: word,
      })),
    [data.wordBank]
  );

  const [availableWords, setAvailableWords] =
    useState<WordTile[]>(initialTiles);
  const [selectedWords, setSelectedWords] = useState<WordTile[]>([]);
  const [status, setStatus] = useState<"idle" | "correct" | "incorrect">(
    "idle"
  );
  const [feedbackMsg, setFeedbackMsg] = useState<string>("");

  const stopAllAudio = () => {
    sequenceTokenRef.current += 1;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    stopWordAudio();
    setIsPlaying(false);
    setActiveWordIdx(null);
  };

  useEffect(() => {
    stopAllAudio();
    setAvailableWords(initialTiles);
    setSelectedWords([]);
    setStatus("idle");
    setFeedbackMsg("");
    setHasCompletedFirstListen(false);
    hasTrackedSeen.current = false;
    hasHeardMainAudio.current = false;
    heardTileIds.current.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTiles]);

  useEffect(() => {
    if (!hasTrackedSeen.current && data.wordBank) {
      const uniqueWords = Array.from(new Set<string>(data.wordBank));
      uniqueWords.forEach((word) => {
        trackInteraction(word, { seen: 1 });
      });
      hasTrackedSeen.current = true;
    }
  }, [data.wordBank, trackInteraction]);

  useEffect(() => {
    return () => {
      stopAllAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trackHeardOnce = () => {
    if (!hasHeardMainAudio.current && data.expectedOrder) {
      const uniqueExpected = Array.from(new Set<string>(data.expectedOrder));
      uniqueExpected.forEach((word) => {
        trackInteraction(word, { heard: 1 });
      });
      hasHeardMainAudio.current = true;
    }
  };

  const playSlowWordByWord = async () => {
    const words: string[] = data.expectedOrder || [];
    if (words.length === 0) return;

    stopAllAudio();
    const myToken = ++sequenceTokenRef.current;

    trackHeardOnce();
    setPlayMode("words");
    setIsPlaying(true);

    for (let i = 0; i < words.length; i++) {
      if (sequenceTokenRef.current !== myToken) return;

      setActiveWordIdx(i);
      const startedAt = Date.now();

      try {
        await playWord(words[i], "m");
      } catch {
        // Ignore single word playback hiccup
      }

      if (sequenceTokenRef.current !== myToken) return;

      const elapsed = Date.now() - startedAt;
      const holdMs = Math.max(320, 950 - elapsed);
      await new Promise((r) => setTimeout(r, holdMs));
    }

    if (sequenceTokenRef.current === myToken) {
      setActiveWordIdx(null);
      setIsPlaying(false);
      setHasCompletedFirstListen(true);
    }
  };

  const playFullSentence = (playbackRate = 1.0) => {
    if (!resolvedAudioUrl) return;

    stopAllAudio();
    const myToken = ++sequenceTokenRef.current;

    trackHeardOnce();
    setPlayMode("sentence");
    setIsPlaying(true);

    const audio = new Audio(resolvedAudioUrl);
    audio.playbackRate = playbackRate;
    audioRef.current = audio;

    audio.onended = () => {
      if (sequenceTokenRef.current === myToken) {
        setIsPlaying(false);
      }
    };

    audio.play().catch((err) => {
      console.warn("Sentence audio playback skipped:", err);
      if (sequenceTokenRef.current === myToken) {
        setIsPlaying(false);
      }
    });
  };

  const handlePrimaryPlay = () => {
    if (isPlaying) {
      stopAllAudio();
      setHasCompletedFirstListen(true);
      return;
    }

    if (!hasCompletedFirstListen && status === "idle") {
      void playSlowWordByWord();
    } else {
      playFullSentence(1.0);
    }
  };

  const handleAddWord = (tile: WordTile) => {
    stopAllAudio();

    const now = Date.now();
    if (now - lastAudioTriggerRef.current > 80) {
      lastAudioTriggerRef.current = now;
      void playWord(tile.text, "m");
    }

    if (!heardTileIds.current.has(tile.id)) {
      trackInteraction(tile.text, { heard: 1 });
      heardTileIds.current.add(tile.id);
    }

    const nextSelected = [...selectedWords, tile];
    setSelectedWords(nextSelected);
    setAvailableWords((prev) => prev.filter((item) => item.id !== tile.id));

    // Auto-check if all expected words are placed and match 100%!
    const expected: string[] = data.expectedOrder || [];
    if (
      nextSelected.length === expected.length &&
      nextSelected.every((t, i) => isSameWord(t.text, expected[i]))
    ) {
      setHasCompletedFirstListen(true);
      nextSelected.forEach((t) =>
        trackInteraction(t.text, { tappedCorrect: 1 })
      );
      setStatus("correct");
      setFeedbackMsg("Excellent ear! You nailed the exact word order.");
    } else {
      setStatus("idle");
      setFeedbackMsg("");
    }
  };

  const handleRemoveWord = (tile: WordTile) => {
    if (status === "correct") return;
    setStatus("idle");
    setFeedbackMsg("");
    setSelectedWords((prev) => prev.filter((item) => item.id !== tile.id));
    setAvailableWords((prev) => [...prev, tile]);
  };

  const handleReset = () => {
    stopAllAudio();
    setStatus("idle");
    setFeedbackMsg("");
    setSelectedWords([]);
    setAvailableWords(initialTiles);
  };

  const handleCheck = () => {
    setHasCompletedFirstListen(true);

    const expected: string[] = data.expectedOrder || [];

    selectedWords.forEach((tile, i) => {
      if (isSameWord(tile.text, expected[i])) {
        trackInteraction(tile.text, { tappedCorrect: 1 });
      } else {
        trackInteraction(tile.text, { tappedWrong: 1 });
      }
    });

    const isCorrectLength = selectedWords.length === expected.length;
    const isPerfectMatch =
      isCorrectLength &&
      selectedWords.every((tile, i) => isSameWord(tile.text, expected[i]));

    if (isPerfectMatch) {
      setStatus("correct");
      setFeedbackMsg("Excellent ear! You nailed the exact word order.");
    } else {
      setStatus("incorrect");
      setFeedbackMsg(
        "Green tiles are in the right spot! Tap any red tile to adjust."
      );
    }
  };

  const handleNext = () => {
    stopAllAudio();
    onNext();
  };

  const expectedWords: string[] = data.expectedOrder || [];
  const activeWord =
    activeWordIdx !== null ? expectedWords[activeWordIdx] : null;

  return (
    <div className="flex h-full flex-col justify-between overflow-y-auto p-6 sm:p-10 animate-in fade-in duration-500">
      {/* 1. Header & Segmented Progress */}
      <div className="mb-6 flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <span className="text-[11px] font-black tracking-wider text-blue-600 uppercase">
            {!hasCompletedFirstListen && status === "idle"
              ? "Step 1 • Slow Word-by-Word Breakdown"
              : `${selectedWords.length} of ${expectedWords.length} Words Placed`}
          </span>
          <h2 className="mt-0.5 text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Listen &amp; Build
          </h2>
        </div>

        {expectedWords.length > 0 && (
          <div className="flex items-center gap-1.5">
            {expectedWords.map((_, idx) => {
              const isFilled = idx < selectedWords.length;
              const isCurrentlySpoken = activeWordIdx === idx;
              return (
                <div
                  key={idx}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    isCurrentlySpoken
                      ? "w-8 bg-indigo-600"
                      : status === "correct"
                        ? "w-5 bg-emerald-500"
                        : isFilled
                          ? "w-5 bg-gradient-to-r from-sky-400 to-blue-600"
                          : "w-3 bg-slate-200"
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* 2. 3D Centerpiece Acoustic Stage Card */}
      <div
        className={`relative mb-6 flex min-h-[180px] shrink-0 flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-b-[6px] bg-white p-7 text-center transition-all duration-300 ${
          isPlaying
            ? "border-indigo-500 ring-4 ring-indigo-500/10"
            : status === "correct"
              ? "border-emerald-500 bg-emerald-50/20 shadow-lg shadow-emerald-500/10"
              : "border-slate-200 shadow-sm"
        }`}
      >
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-100/70">
          <Headphones size={150} />
        </div>

        <div className="relative z-10 flex min-h-[92px] w-full flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {isPlaying && playMode === "words" && activeWord ? (
              <motion.div
                key={`word-${activeWordIdx}-${activeWord}`}
                initial={{ opacity: 0, y: 8, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.94 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex flex-col items-center gap-2"
              >
                <span className="rounded-2xl border-2 border-b-4 border-indigo-300 bg-indigo-50 px-8 py-3.5 text-3xl font-black tracking-tight text-indigo-950 shadow-sm md:text-4xl">
                  {activeWord}
                </span>
                <span className="text-[11px] font-black tracking-widest text-indigo-500 uppercase">
                  Word {(activeWordIdx ?? 0) + 1} of {expectedWords.length}
                </span>
              </motion.div>
            ) : isPlaying ? (
              <motion.div
                key="sentence-waveform"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3"
              >
                <div className="flex h-10 items-center justify-center gap-1.5">
                  {[0.4, 0.8, 0.5, 1, 0.65, 0.9, 0.45, 0.85, 0.55].map(
                    (scale, i) => (
                      <motion.span
                        key={i}
                        animate={{
                          height: [
                            "10px",
                            `${Math.round(scale * 38)}px`,
                            "10px",
                          ],
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 0.75 + (i % 3) * 0.15,
                          ease: "easeInOut",
                        }}
                        className="w-1.5 rounded-full bg-blue-600"
                      />
                    )
                  )}
                </div>
                <span className="text-xs font-black text-blue-600">
                  Playing full sentence...
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="idle-controls"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex w-full max-w-lg flex-col items-center gap-3"
              >
                <div className="flex w-full flex-wrap items-center justify-center gap-3">
                  {/* Primary 3D Listen Button */}
                  <button
                    type="button"
                    onClick={handlePrimaryPlay}
                    disabled={isAudioLoading}
                    className="inline-flex items-center justify-center gap-2.5 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-7 py-4 text-base font-black text-white shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0 disabled:opacity-50"
                  >
                    {isAudioLoading ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <Volume2 size={20} />
                    )}
                    <span>
                      {!hasCompletedFirstListen && status === "idle"
                        ? "Listen (Word by Word)"
                        : "Listen to Sentence"}
                    </span>
                  </button>

                  {/* Secondary 3D Slow Words Button */}
                  {hasCompletedFirstListen && (
                    <button
                      type="button"
                      onClick={() => void playSlowWordByWord()}
                      disabled={isAudioLoading}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-white px-5 py-3.5 text-sm font-black text-slate-700 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-sky-400 active:translate-y-0.5 active:border-b-2"
                      title="Play slow word-by-word breakdown"
                    >
                      <Turtle size={18} className="text-blue-600" />
                      <span>Slow Words</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isPlaying && (
            <button
              type="button"
              onClick={handlePrimaryPlay}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl border-2 border-b-[3px] border-slate-200 bg-white px-4 py-1.5 text-xs font-black text-slate-600 shadow-2xs transition hover:bg-slate-50"
            >
              <Square size={11} className="fill-current" />
              <span>Stop</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Sentence Builder Drop Zone (3D Placed Tiles) */}
      <div className="mb-5 shrink-0">
        <div
          className={`flex min-h-[84px] w-full flex-wrap items-center justify-center gap-2.5 rounded-3xl border-2 border-dashed p-4 transition-colors ${
            status === "correct"
              ? "border-emerald-400 bg-emerald-50/60"
              : status === "incorrect"
                ? "border-rose-300 bg-rose-50/50"
                : "border-slate-300 bg-slate-50/70"
          }`}
        >
          {selectedWords.length === 0 && (
            <span className="w-full text-center text-sm font-bold text-slate-400">
              Tap the 3D word tiles below in the order you heard them...
            </span>
          )}

          {selectedWords.map((tile, idx) => {
            const expected: string[] = data.expectedOrder || [];
            const isCorrectPosition = isSameWord(tile.text, expected[idx]);

            let wordStyle =
              "border-blue-700 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-sm";

            if (status === "correct" || isCorrectPosition) {
              wordStyle =
                "border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-sm";
            } else if (status === "incorrect" && !isCorrectPosition) {
              wordStyle =
                "border-rose-700 bg-gradient-to-b from-rose-400 to-rose-600 text-white shadow-sm";
            }

            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => handleRemoveWord(tile)}
                disabled={status === "correct"}
                className={`inline-flex items-center gap-1.5 rounded-2xl border-2 border-b-4 px-4 py-2 text-base sm:text-lg font-black transition-all active:translate-y-0.5 active:border-b-2 disabled:cursor-default ${wordStyle}`}
                title="Tap to remove"
              >
                <span>{tile.text}</span>
                {(status === "correct" || isCorrectPosition) && (
                  <Check size={15} className="shrink-0 stroke-[3.5]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. 3D Word Bank */}
      <div className="mb-6 w-full shrink-0">
        <ScrollArea className="max-h-[140px] w-full rounded-3xl border border-slate-200/80 bg-slate-50/50 p-4">
          <div className="flex flex-wrap justify-center gap-2.5">
            {availableWords.map((tile) => (
              <button
                key={tile.id}
                type="button"
                onClick={() => handleAddWord(tile)}
                className="rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-white px-4 py-2.5 text-base sm:text-lg font-black text-slate-800 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-sky-400 hover:bg-sky-50/40 active:translate-y-0.5 active:border-b-2"
              >
                {tile.text}
              </button>
            ))}
            {availableWords.length === 0 && (
              <span className="py-2 text-sm font-bold text-slate-400">
                All words placed above — click Check Answer!
              </span>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* 5. Zero-Shift Footer & 3D Action Buttons */}
      <div className="mt-auto flex min-h-[80px] shrink-0 flex-col items-center justify-between gap-4 rounded-3xl bg-slate-50 p-4 sm:flex-row sm:px-6 ring-1 ring-slate-200/80">
        <div className="flex flex-1 flex-col justify-center">
          <div className="flex items-center gap-2.5">
            {status === "correct" ? (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
                <Sparkles className="h-4 w-4" />
              </div>
            ) : status === "incorrect" ? (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                <AlertCircle className="h-4 w-4" />
              </div>
            ) : null}

            <div>
              <p
                className={`text-sm sm:text-base font-extrabold ${
                  status === "correct"
                    ? "text-emerald-800"
                    : status === "incorrect"
                      ? "text-rose-700"
                      : "text-slate-400"
                }`}
              >
                {feedbackMsg ||
                  "Listen closely and tap the word tiles in order."}
              </p>
              {status === "incorrect" && data.contrast && (
                <p className="mt-0.5 text-xs font-bold text-rose-600">
                  💡 Tip: {data.contrast}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex w-full sm:w-auto shrink-0 items-center gap-2.5">
          {selectedWords.length > 0 && status !== "correct" && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-2xl border-2 border-b-4 border-slate-300 bg-white px-4 py-3.5 text-xs sm:text-sm font-black text-slate-700 hover:bg-slate-50 active:translate-y-0.5 active:border-b-2"
            >
              <RotateCcw size={15} />
              <span>Reset</span>
            </button>
          )}

          {status === "correct" ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 px-8 py-4 text-base font-black text-white shadow-lg shadow-emerald-500/25 transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0"
            >
              <span>Next: Knowledge Check</span>
              <ArrowRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCheck}
              disabled={selectedWords.length === 0}
              className={`inline-flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-2xl px-8 py-4 text-base font-black transition-all ${
                selectedWords.length > 0
                  ? "border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-md shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-0"
                  : "cursor-not-allowed bg-slate-200/80 text-slate-400"
              }`}
            >
              {selectedWords.length === 0 && <Lock size={16} />}
              <span>Check Answer</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}