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
  CheckCircle2,
  AlertCircle,
  Turtle,
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

  // Resolve full sentence S3 audio key
  const { urls, isLoading: isAudioLoading } = useS3Media([data.audioS3Key]);
  const resolvedAudioUrl = urls[0];

  const [isPlaying, setIsPlaying] = useState(false);
  const [playMode, setPlayMode] = useState<"words" | "sentence">("words");
  const [activeWordIdx, setActiveWordIdx] = useState<number | null>(null);
  const [hasCompletedFirstListen, setHasCompletedFirstListen] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Token to cancel an in-flight word-by-word sequence immediately if stopped
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

  // 1. TRACK "SEEN" ONCE PER UNIQUE WORD ON MOUNT
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

  /**
   * MODE 1 (First Listen / Slow Breakdown):
   * Speaks each word one at a time while displaying it calmly in the center for at least ~950ms.
   */
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

      // Ensure each word stays on screen long enough (~950ms minimum) to read comfortably
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

  /**
   * MODE 2 (Second+ Listen):
   * Plays the full fluid sentence MP3 (`listening.mp3`) at natural speed (or 0.85x if slow).
   */
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

  // Main Play / Stop handler:
  // 1st click -> Slow Word-by-Word with centered word reveal
  // 2nd+ click -> Fluid full sentence
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

    setStatus("idle");
    setSelectedWords((prev) => [...prev, tile]);
    setAvailableWords((prev) => prev.filter((item) => item.id !== tile.id));
  };

  const handleRemoveWord = (tile: WordTile) => {
    setStatus("idle");
    setSelectedWords((prev) => prev.filter((item) => item.id !== tile.id));
    setAvailableWords((prev) => [...prev, tile]);
  };

  const handleReset = () => {
    stopAllAudio();
    setStatus("idle");
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
        "Not quite right. Review the highlighted tiles and try again."
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
    <div className="flex h-full flex-col overflow-y-auto p-8 animate-in fade-in duration-500">
      {/* Header & Progress */}
      <div className="mb-8 shrink-0 text-center">
        <h2 className="mb-3 text-xl font-extrabold text-gray-900 md:text-2xl">
          Listen &amp; Build
        </h2>

        {expectedWords.length > 0 && (
          <div className="mb-2 flex items-center justify-center gap-1.5">
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
                        ? "w-5 bg-green-500"
                        : isFilled
                          ? "w-5 bg-blue-600"
                          : "w-2.5 bg-gray-200"
                  }`}
                />
              );
            })}
          </div>
        )}

        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
          {!hasCompletedFirstListen && status === "idle"
            ? "First Listen: Slow Word-by-Word Breakdown"
            : `${selectedWords.length} of ${expectedWords.length} Words Placed`}
        </p>
      </div>

      {/* Centerpiece Acoustic Stage Card */}
      <div
        className={`relative mb-6 flex min-h-[190px] shrink-0 flex-col items-center justify-center overflow-hidden rounded-3xl border bg-white p-8 text-center shadow-xs transition-all duration-300 ${
          isPlaying
            ? "border-indigo-300 ring-4 ring-indigo-500/10"
            : status === "correct"
              ? "border-green-300 bg-green-50/20"
              : "border-gray-200"
        }`}
      >
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-50 opacity-45">
          <Headphones size={150} />
        </div>

        {/* Center Display: Paced Word Card (1st Listen) OR Waveform (Full Sentence) OR Clean Play Controls */}
        <div className="relative z-10 flex min-h-[96px] w-full flex-col items-center justify-center">
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
                <span className="rounded-2xl border border-indigo-200 bg-indigo-50/90 px-8 py-3.5 text-3xl font-extrabold tracking-tight text-indigo-950 shadow-xs md:text-4xl">
                  {activeWord}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-500">
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
                        className="w-1.5 rounded-full bg-indigo-600"
                      />
                    )
                  )}
                </div>
                <span className="text-xs font-bold text-indigo-600">
                  Playing full sentence...
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="idle-controls"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3 w-full max-w-md"
              >
                <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                  {/* Primary Listen Button */}
                  <button
                    type="button"
                    onClick={handlePrimaryPlay}
                    disabled={isAudioLoading}
                    className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gray-900 px-7 py-4 text-base font-bold text-white shadow-md transition-all hover:bg-black active:scale-[0.98] disabled:opacity-50"
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

                  {/* Secondary Slow Button (Available after 1st listen so they can hear the slow breakdown or slow sentence anytime) */}
                  {hasCompletedFirstListen && (
                    <button
                      type="button"
                      onClick={() => void playSlowWordByWord()}
                      disabled={isAudioLoading}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm font-bold text-gray-700 shadow-2xs transition-all hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98]"
                      title="Play slow word-by-word breakdown"
                    >
                      <Turtle size={18} className="text-indigo-600" />
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
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-1.5 text-xs font-bold text-gray-600 shadow-2xs transition hover:bg-gray-50"
            >
              <Square size={11} className="fill-current" />
              <span>Stop</span>
            </button>
          )}
        </div>
      </div>

      {/* Sentence Builder Drop Zone */}
      <div className="mb-5 shrink-0">
        <div
          className={`flex min-h-[84px] w-full flex-wrap items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed p-4 transition-colors ${
            status === "correct"
              ? "border-green-400 bg-green-50/70"
              : status === "incorrect"
                ? "border-red-300 bg-red-50/60"
                : "border-gray-200 bg-gray-50/70"
          }`}
        >
          {selectedWords.length === 0 && (
            <span className="w-full text-center text-sm font-semibold text-gray-400">
              Tap the word tiles below in the order you heard them...
            </span>
          )}

          {selectedWords.map((tile, idx) => {
            const expected: string[] = data.expectedOrder || [];
            const isCorrectPosition = isSameWord(tile.text, expected[idx]);

            let wordStyle =
              "bg-white border-gray-200 text-gray-800 hover:bg-red-50 hover:border-red-200";

            if (status === "correct") {
              wordStyle =
                "bg-green-500 border-green-600 text-white hover:bg-green-600";
            } else if (status === "incorrect") {
              wordStyle = isCorrectPosition
                ? "bg-green-100 border-green-500 text-green-900 hover:bg-red-50 hover:border-red-300"
                : "bg-red-100 border-red-400 text-red-900 hover:bg-red-200";
            } else if (isCorrectPosition) {
              wordStyle =
                "bg-green-50 border-green-300 text-green-800 hover:bg-red-50 hover:border-red-200";
            }

            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => handleRemoveWord(tile)}
                className={`rounded-xl border-2 px-4 py-2 text-lg font-bold shadow-xs transition-all active:scale-95 ${wordStyle}`}
                title="Tap to remove"
              >
                {tile.text}
              </button>
            );
          })}
        </div>
      </div>

      {/* WORD BANK SCROLL AREA */}
      <div className="mb-8 w-full shrink-0">
        <ScrollArea className="max-h-[130px] w-full rounded-2xl border border-gray-200/80 bg-white shadow-2xs">
          <div className="flex flex-wrap justify-center gap-2.5 p-4">
            {availableWords.map((tile) => (
              <button
                key={tile.id}
                type="button"
                onClick={() => handleAddWord(tile)}
                className="rounded-xl border-2 border-gray-200 bg-gray-50/70 px-4 py-2 text-lg font-bold text-gray-800 shadow-2xs transition-all hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 active:scale-95"
              >
                {tile.text}
              </button>
            ))}
            {availableWords.length === 0 && (
              <span className="py-2 text-sm font-semibold text-gray-400">
                All words placed above — click Check Answer!
              </span>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Feedback & Action Area */}
      <div className="mt-auto flex shrink-0 flex-col items-center justify-between gap-4 border-t border-gray-100 pt-6 sm:flex-row">
        <div className="flex w-full flex-1 flex-col justify-center gap-1">
          {status !== "idle" && (
            <div
              className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm font-bold animate-in fade-in md:text-base ${
                status === "correct"
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              <span className="flex items-center gap-2">
                {status === "correct" ? (
                  <CheckCircle2 size={18} className="shrink-0 text-green-600" />
                ) : (
                  <AlertCircle size={18} className="shrink-0 text-red-600" />
                )}
                {feedbackMsg}
              </span>

              {selectedWords.length > 0 && status !== "correct" && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="ml-3 inline-flex shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-red-600 shadow-2xs transition-colors hover:bg-red-100"
                  title="Reset Sentence"
                >
                  <RotateCcw size={14} />
                  <span>Reset</span>
                </button>
              )}
            </div>
          )}

          {status === "incorrect" && data.contrast && (
            <p className="mt-1 px-1 text-xs font-semibold text-red-500 animate-in fade-in">
              💡 Hint — pay attention to: {data.contrast}
            </p>
          )}
        </div>

        {status === "correct" ? (
          <button
            type="button"
            onClick={handleNext}
            className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-lg font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-500 active:scale-95 sm:w-auto"
          >
            Next: Knowledge Check <ArrowRight size={20} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCheck}
            disabled={selectedWords.length === 0}
            className={`flex w-full shrink-0 items-center justify-center rounded-xl px-8 py-4 text-lg font-bold transition-all sm:w-auto ${
              selectedWords.length > 0
                ? "bg-gray-900 text-white shadow-md hover:bg-black active:scale-95"
                : "cursor-not-allowed bg-gray-100 text-gray-400"
            }`}
          >
            Check Answer
          </button>
        )}
      </div>
    </div>
  );
}