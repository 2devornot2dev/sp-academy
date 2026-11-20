"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Volume2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Zap,
  Sparkles,
  Lock,
  Check,
  Lightbulb,
} from "lucide-react";
import { useS3Media } from "@/context/s3-context";
import { useWordAudio } from "@/context/word-audio-context";
import { useMatrix } from "@/context/matrix-context";
import {
  WordTap,
  useSpeakWord,
  cleanWord,
} from "@/components/foundation/word-tap";

type HighlightColor = "amber" | "violet" | "teal" | "rose";

interface HighlightLink {
  promptTerm: string;
  targetTerm: string;
  replacedTerm?: string | null;
  color?: HighlightColor;
}

const HIGHLIGHT_STYLES: Record<
  HighlightColor,
  {
    promptPill: string;
    replacedPill: string;
    bankTile: string;
    placedTile: string;
    badge: string;
  }
> = {
  amber: {
    promptPill:
      "rounded-md bg-amber-100 px-1.5 py-0.5 font-black text-amber-900 ring-1 ring-amber-300",
    replacedPill:
      "rounded-lg bg-amber-50 px-1.5 py-0.5 text-amber-800 line-through decoration-amber-500 decoration-2 ring-1 ring-amber-200",
    bankTile:
      "border-amber-400 border-b-amber-500 bg-amber-50 text-amber-950 shadow-2xs hover:-translate-y-0.5 hover:border-amber-500 hover:bg-amber-100/80 active:translate-y-0.5 active:border-b-2",
    placedTile:
      "border-amber-600 bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 shadow-sm",
    badge: "bg-amber-100 text-amber-900 ring-amber-300",
  },
  violet: {
    promptPill:
      "rounded-md bg-violet-100 px-1.5 py-0.5 font-black text-violet-900 ring-1 ring-violet-300",
    replacedPill:
      "rounded-lg bg-violet-50 px-1.5 py-0.5 text-violet-800 line-through decoration-violet-500 decoration-2 ring-1 ring-violet-200",
    bankTile:
      "border-violet-400 border-b-violet-500 bg-violet-50 text-violet-950 shadow-2xs hover:-translate-y-0.5 hover:border-violet-500 hover:bg-violet-100/80 active:translate-y-0.5 active:border-b-2",
    placedTile:
      "border-violet-700 bg-gradient-to-b from-violet-400 to-violet-600 text-white shadow-sm",
    badge: "bg-violet-100 text-violet-900 ring-violet-300",
  },
  teal: {
    promptPill:
      "rounded-md bg-teal-100 px-1.5 py-0.5 font-black text-teal-900 ring-1 ring-teal-300",
    replacedPill:
      "rounded-lg bg-teal-50 px-1.5 py-0.5 text-teal-800 line-through decoration-teal-500 decoration-2 ring-1 ring-teal-200",
    bankTile:
      "border-teal-400 border-b-teal-500 bg-teal-50 text-teal-950 shadow-2xs hover:-translate-y-0.5 hover:border-teal-500 hover:bg-teal-100/80 active:translate-y-0.5 active:border-b-2",
    placedTile:
      "border-teal-700 bg-gradient-to-b from-teal-400 to-teal-600 text-white shadow-sm",
    badge: "bg-teal-100 text-teal-900 ring-teal-300",
  },
  rose: {
    promptPill:
      "rounded-md bg-rose-100 px-1.5 py-0.5 font-black text-rose-900 ring-1 ring-rose-300",
    replacedPill:
      "rounded-lg bg-rose-50 px-1.5 py-0.5 text-rose-800 line-through decoration-rose-500 decoration-2 ring-1 ring-rose-200",
    bankTile:
      "border-rose-400 border-b-rose-500 bg-rose-50 text-rose-950 shadow-2xs hover:-translate-y-0.5 hover:border-rose-500 hover:bg-rose-100/80 active:translate-y-0.5 active:border-b-2",
    placedTile:
      "border-rose-700 bg-gradient-to-b from-rose-400 to-rose-600 text-white shadow-sm",
    badge: "bg-rose-100 text-rose-900 ring-rose-300",
  },
};

const getColorStyle = (color?: string) =>
  HIGHLIGHT_STYLES[(color as HighlightColor) || "amber"] ??
  HIGHLIGHT_STYLES.amber;

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Lowercase, strip accents and punctuation, collapse spaces.
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (s: string) =>
  s
    .split(/\s+/)
    .map((t) => t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
    .filter(Boolean)
    .map((t, i) => (i === 0 ? t.toLowerCase() : t));

const shuffle = (arr: string[], seed: number) =>
  arr
    .map((w, i) => ({
      w,
      k: Math.sin(seed * 9301 + i * 49297 + w.length * 233),
    }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.w);

const hasLetters = (s: string) => /[\p{L}\p{N}]/u.test(s);

function renderHighlightedPrompt(
  text: string | undefined,
  highlights: HighlightLink[]
): React.ReactNode {
  if (!text || highlights.length === 0) return text ?? "";

  const terms = highlights
    .filter((h) => h.promptTerm?.trim())
    .sort((a, b) => b.promptTerm.length - a.promptTerm.length);

  if (terms.length === 0) return text;

  const pattern = new RegExp(
    `(${terms.map((h) => escapeRegex(h.promptTerm.trim())).join("|")})`,
    "gi"
  );

  return text.split(pattern).map((part, idx) => {
    const match = terms.find(
      (h) => h.promptTerm.trim().toLowerCase() === part.toLowerCase()
    );
    if (!match) return <React.Fragment key={idx}>{part}</React.Fragment>;
    return (
      <span key={idx} className={getColorStyle(match.color).promptPill}>
        {part}
      </span>
    );
  });
}

const MECHANIC_LABELS: Record<string, string> = {
  word_coupling: "Word Coupling",
  variable_shift: "Sentence Builder",
  context_clash: "Context Match",
  video_spotlight: "Video Spotlight",
};

export function CooldownStep({
  data,
  onNext,
}: {
  data: any[];
  onNext: () => void;
}) {
  const { stopAudio, activeWord } = useWordAudio();
  const { trackInteraction } = useMatrix();
  const speak = useSpeakWord();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState<"idle" | "correct" | "incorrect">(
    "idle"
  );
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [selected, setSelected] = useState<number[]>([]);

  const [selectedMcOption, setSelectedMcOption] = useState<string | null>(null);
  const [wrongMcOptions, setWrongMcOptions] = useState<Set<string>>(new Set());

  const { urls: videoUrls } = useS3Media(data.map((d) => d.videoS3Key));

  const item = data[currentIndex];
  const videoUrl = videoUrls[currentIndex] || undefined;
  const isBuilder = item.mechanic === "variable_shift";
  const isMultipleChoice = !isBuilder;

  const highlights: HighlightLink[] = useMemo(
    () => (Array.isArray(item.highlights) ? item.highlights : []),
    [item]
  );

  // Use backend expectedChunks when available; fall back to tokenizing expected[0]
  const expectedChunks = useMemo(() => {
    if (Array.isArray(item.expectedChunks) && item.expectedChunks.length > 0) {
      return item.expectedChunks as string[];
    }
    return tokenize(item.expected?.[0] ?? "");
  }, [item]);

  const expectedChunksNorm = useMemo(
    () => expectedChunks.map(normalize),
    [expectedChunks]
  );

  const isChunkMode = useMemo(
    () => expectedChunks.some((c) => c.trim().includes(" ")),
    [expectedChunks]
  );

  // Matrix: the words shown in this drill count as "seen"
  useEffect(() => {
    const words: string[] = [];
    if (item.targetWord) words.push(cleanWord(item.targetWord));
    if (item.mechanic === "variable_shift") {
      tokenize(item.expected?.[0] ?? "").forEach((w) =>
        words.push(cleanWord(w))
      );
    }
    words.filter(Boolean).forEach((w) => trackInteraction(w, { seen: 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  const bank = useMemo(() => {
    if (!isBuilder) return [] as string[];
    if (Array.isArray(item.chunkBank) && item.chunkBank.length > 0) {
      return item.chunkBank as string[];
    }
    if (Array.isArray(item.wordBank) && item.wordBank.length > 0) {
      return shuffle(item.wordBank, currentIndex + 1);
    }

    const answer = expectedChunks;
    const seen = new Set(answer.map(normalize));
    const extras: string[] = [];

    const candidates = [
      ...tokenize(item.baseSentence ?? ""),
      ...Object.keys(item.rejectFeedback ?? {}).flatMap(tokenize),
    ];
    for (const word of candidates) {
      const n = normalize(word);
      if (n && !seen.has(n)) {
        seen.add(n);
        extras.push(word);
      }
    }
    return shuffle([...answer, ...extras], currentIndex + 1);
  }, [item, currentIndex, isBuilder, expectedChunks]);

  const placedWords = selected.map((i) => bank[i]);

  // Match a bank/placed tile against a highlight targetTerm
  const getTileHighlight = (tile: string): HighlightLink | undefined => {
    const nTile = normalize(tile);
    return highlights.find((h) => {
      const nTarget = normalize(h.targetTerm);
      return (
        nTarget &&
        (nTile === nTarget || nTile.includes(nTarget))
      );
    });
  };

  // Match a word in baseSentence against a highlight replacedTerm
  const getBaseWordHighlight = (token: string): HighlightLink | undefined => {
    const nToken = normalize(token);
    if (!nToken) return undefined;
    return highlights.find((h) => {
      if (!h.replacedTerm) return false;
      const nRep = normalize(h.replacedTerm);
      return nRep === nToken || nRep.split(" ").includes(nToken);
    });
  };

  const handleNextQuestion = () => {
    stopAudio();
    if (currentIndex < data.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setStatus("idle");
      setFeedbackMsg("");
      setSelected([]);
      setSelectedMcOption(null);
      setWrongMcOptions(new Set());
    } else {
      onNext();
    }
  };

  const handleMultipleChoiceGuess = (guess: string) => {
    setSelectedMcOption(guess);
    speak(guess, { track: item.mechanic !== "context_clash" });

    let isCorrect = false;
    if (item.mechanic === "video_spotlight") {
      isCorrect = guess === item.targetWord;
    } else if (Array.isArray(item.correct)) {
      isCorrect = item.correct.includes(guess);
    } else {
      isCorrect = item.correct === guess;
    }

    if (item.targetWord) {
      trackInteraction(
        cleanWord(item.targetWord),
        isCorrect ? { tappedCorrect: 1 } : { tappedWrong: 1 }
      );
    }

    if (isCorrect) {
      setStatus("correct");
      setFeedbackMsg("Spot on! Great job.");
    } else {
      setStatus("incorrect");
      setWrongMcOptions((prev) => new Set(prev).add(guess));
      const specificHint =
        item.feedback?.[guess] || item.rejectFeedback?.[guess];
      setFeedbackMsg(specificHint || "Not quite right. Try another option!");
    }
  };

  const markBuilderCorrect = (chunks: string[]) => {
    setStatus("correct");
    setFeedbackMsg(
      item.whyNote?.trim()
        ? `Spot on! ${item.whyNote.trim()}`
        : "Perfect sentence adaptation!"
    );
    chunks
      .flatMap((c) => tokenize(c))
      .forEach((w) => trackInteraction(cleanWord(w), { tappedCorrect: 1 }));
    speak(chunks.join(" "), { each: true });
  };

  const addWord = (bankIndex: number) => {
    if (status === "correct" || selected.includes(bankIndex)) return;
    const chunk = bank[bankIndex];
    speak(chunk, { each: chunk.includes(" ") });

    const nextSelected = [...selected, bankIndex];
    setSelected(nextSelected);

    const nextPlaced = nextSelected.map((i) => bank[i]);
    const guess = normalize(nextPlaced.join(" "));
    const accepted = [
      ...(item.expected ?? []),
      ...(item.expectedFolds ?? []),
    ].map(normalize);

    if (accepted.includes(guess)) {
      markBuilderCorrect(nextPlaced);
      return;
    }

    if (status === "incorrect") {
      setStatus("idle");
      setFeedbackMsg("");
    }
  };

  const removeWord = (bankIndex: number) => {
    if (status === "correct") return;
    setSelected((prev) => prev.filter((i) => i !== bankIndex));
    if (status === "incorrect") {
      setStatus("idle");
      setFeedbackMsg("");
    }
  };

  const handleBuilderSubmit = () => {
    const guess = normalize(placedWords.join(" "));
    const accepted = [
      ...(item.expected ?? []),
      ...(item.expectedFolds ?? []),
    ].map(normalize);
    const answerSet = new Set(expectedChunksNorm);

    if (accepted.includes(guess)) {
      markBuilderCorrect(placedWords);
      return;
    }

    placedWords
      .filter((c) => !answerSet.has(normalize(c)))
      .flatMap((c) => tokenize(c))
      .forEach((w) => trackInteraction(cleanWord(w), { tappedWrong: 1 }));

    setStatus("incorrect");
    const rejectKey = Object.keys(item.rejectFeedback ?? {}).find(
      (k) => normalize(k) === guess
    );
    const hint =
      (rejectKey ? item.rejectFeedback[rejectKey] : "") ||
      item.whyNote?.trim() ||
      "Green chunks are in the right spot! Tap any red chunk to adjust.";
    setFeedbackMsg(hint);
  };

  const titleLabel =
    MECHANIC_LABELS[item.mechanic] || item.mechanic.replace(/_/g, " ");

  return (
    <div className="flex h-full flex-col justify-between overflow-y-auto p-6 sm:p-10 animate-in fade-in duration-500">
      {/* =====================================================================
          1. TOP HEADER & SEGMENTED DRILL TRACKER
          ===================================================================== */}
      <div className="mb-6 flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <span className="text-[11px] font-black tracking-wider text-blue-600 uppercase">
            Cooldown Drill {currentIndex + 1} of {data.length}
          </span>
          <h2 className="mt-0.5 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 capitalize">
            {titleLabel}
          </h2>
        </div>

        {/* Segmented Progress Pills */}
        <div className="flex items-center gap-2">
          {data.map((_, idx) => {
            const isDone = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            return (
              <div
                key={idx}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  isCurrent
                    ? "w-10 bg-gradient-to-r from-sky-400 to-blue-600 shadow-2xs"
                    : isDone
                      ? "w-6 bg-emerald-500"
                      : "w-6 bg-slate-200"
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          2. MAIN DRILL STAGE
          ===================================================================== */}
      <div className="mx-auto my-auto flex w-full max-w-3xl flex-1 flex-col justify-center">
        {/* Video Spotlight (16:9 Cinema Frame) */}
        {item.mechanic === "video_spotlight" && item.videoS3Key && (
          <div className="relative mb-6 flex aspect-video max-h-[300px] w-full items-center justify-center overflow-hidden rounded-3xl bg-slate-950 shadow-lg ring-1 ring-slate-200">
            {videoUrl ? (
              <video
                key={item.videoS3Key}
                src={videoUrl}
                controls
                autoPlay
                loop
                playsInline
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full w-full animate-pulse items-center justify-center bg-slate-900 text-sm font-bold text-slate-400">
                Loading video clip...
              </div>
            )}
          </div>
        )}

        {/* Context & Instruction Prompt Card (with color-coded clue words) */}
        <div className="mb-6 flex items-start gap-4 rounded-3xl bg-slate-50 p-5 sm:p-6 ring-1 ring-slate-200/80">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-b-4 border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950 shadow-sm">
            <Zap className="h-5 w-5 fill-current" />
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-sm sm:text-base font-semibold leading-relaxed text-slate-600">
              {renderHighlightedPrompt(item.contextNative, highlights)}
            </p>
            <p className="text-base sm:text-lg font-black text-slate-900">
              {renderHighlightedPrompt(item.instructionNative, highlights)}
            </p>
          </div>
        </div>

        {/* =================================================================
            A. SENTENCE BUILDER (variable_shift)
            ================================================================= */}
        {isBuilder && (
          <>
            {/* Base Sentence Card */}
            <div className="mb-5 rounded-3xl border-2 border-slate-200/80 bg-white p-5 text-center shadow-xs">
              <p className="mb-2.5 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                Base Sentence • Tap any word to hear
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5">
                {(item.baseSentence ?? "")
                  .split(/\s+/)
                  .filter(Boolean)
                  .map((token: string, i: number) => {
                    const hl = getBaseWordHighlight(token);
                    const hlClass = hl
                      ? getColorStyle(hl.color).replacedPill
                      : "rounded-lg px-1.5 py-0.5 text-slate-900 hover:bg-sky-50 hover:text-blue-600";

                    return hasLetters(token) ? (
                      <WordTap
                        key={i}
                        word={token}
                        className={`text-xl sm:text-2xl font-black ${hlClass}`}
                      />
                    ) : (
                      <span
                        key={i}
                        className="text-xl sm:text-2xl font-black text-slate-900"
                      >
                        {token}
                      </span>
                    );
                  })}

                <button
                  type="button"
                  onClick={() =>
                    speak(item.baseSentence, { each: true, track: true })
                  }
                  aria-label="Play full sentence"
                  className={`ml-2 flex h-10 w-10 items-center justify-center rounded-xl border-b-[3px] transition-all active:translate-y-0.5 active:border-b-0 ${
                    activeWord === item.baseSentence
                      ? "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-sm"
                      : "border-sky-200 bg-sky-50 text-blue-600 hover:bg-sky-100"
                  }`}
                >
                  <Volume2 size={18} />
                </button>
              </div>

              {/* Color-coded swap legend */}
              {highlights.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 border-t border-slate-100 pt-3">
                  {highlights.map((h, i) => {
                    const style = getColorStyle(h.color);
                    return (
                      <span
                        key={i}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold ring-1 ${style.badge}`}
                      >
                        <Lightbulb size={13} className="shrink-0" />
                        {h.replacedTerm ? (
                          <span>
                            Swap <strong>{h.replacedTerm}</strong> for{" "}
                            <strong>{h.promptTerm}</strong>
                          </span>
                        ) : (
                          <span>
                            Include phrase for <strong>{h.promptTerm}</strong>
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Answer Tray (Placed 3D Chunk/Word Pills) */}
            <div
              className={`mb-5 flex min-h-[84px] flex-wrap items-center gap-2.5 rounded-3xl border-2 border-dashed p-4 transition-colors ${
                status === "correct"
                  ? "border-emerald-400 bg-emerald-50/60"
                  : status === "incorrect"
                    ? "border-rose-300 bg-rose-50/40"
                    : "border-slate-300 bg-slate-50/70"
              }`}
            >
              {placedWords.length === 0 && (
                <span className="w-full text-center text-sm font-bold text-slate-400">
                  {isChunkMode
                    ? "Tap the phrase chunks below to build your sentence..."
                    : "Tap the 3D word tiles below to build your sentence..."}
                </span>
              )}

              {selected.map((bankIndex, posIdx) => {
                const word = bank[bankIndex];
                const isRightSpot =
                  status === "correct" ||
                  (expectedChunksNorm[posIdx] !== undefined &&
                    normalize(word) === expectedChunksNorm[posIdx]);

                const isWrongSpot = status === "incorrect" && !isRightSpot;
                const hl = getTileHighlight(word);

                return (
                  <button
                    key={`${bankIndex}-${posIdx}`}
                    type="button"
                    onClick={() => removeWord(bankIndex)}
                    disabled={status === "correct"}
                    title={
                      isRightSpot ? "Correct position!" : "Tap to remove chunk"
                    }
                    className={`inline-flex items-center gap-1.5 rounded-2xl border-2 border-b-4 px-4 py-2 text-base sm:text-lg font-black transition-all active:translate-y-0.5 active:border-b-2 disabled:cursor-default ${
                      isRightSpot
                        ? "border-emerald-600 bg-gradient-to-b from-emerald-400 to-emerald-500 text-white shadow-sm"
                        : isWrongSpot
                          ? "border-rose-600 bg-gradient-to-b from-rose-400 to-rose-500 text-white"
                          : hl
                            ? getColorStyle(hl.color).placedTile
                            : "border-blue-700 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-sm hover:brightness-105"
                    }`}
                  >
                    <span>{word}</span>
                    {isRightSpot && (
                      <Check size={16} className="shrink-0 stroke-[3]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* 3D Chunk / Word Bank */}
            <div className="mb-6 flex flex-wrap justify-center gap-2.5">
              {bank.map((word, bankIndex) => {
                const used = selected.includes(bankIndex);
                const hl = getTileHighlight(word);

                return (
                  <button
                    key={bankIndex}
                    type="button"
                    onClick={() => addWord(bankIndex)}
                    disabled={used || status === "correct"}
                    className={`rounded-2xl border-2 border-b-4 px-4 py-2.5 text-base sm:text-lg font-black transition-all ${
                      used
                        ? "cursor-not-allowed border-slate-200/60 bg-slate-100 text-transparent select-none"
                        : activeWord === word
                          ? "-translate-y-0.5 border-blue-600 bg-sky-50 text-blue-800 shadow-sm"
                          : hl
                            ? getColorStyle(hl.color).bankTile
                            : "border-slate-200 border-b-slate-300 bg-white text-slate-800 shadow-2xs hover:-translate-y-0.5 hover:border-sky-400 hover:bg-sky-50/40 active:translate-y-0.5 active:border-b-2"
                    }`}
                  >
                    {word}
                  </button>
                );
              })}
            </div>

            {/* Builder Actions: 3D Reset + 3D Check Answer */}
            {status !== "correct" && (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelected([]);
                    setStatus("idle");
                    setFeedbackMsg("");
                  }}
                  disabled={selected.length === 0}
                  className="inline-flex items-center gap-2 rounded-2xl border-2 border-b-4 border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 transition-all hover:bg-slate-50 active:translate-y-0.5 active:border-b-2 disabled:pointer-events-none disabled:opacity-40"
                >
                  <RotateCcw size={16} />
                  <span>Reset</span>
                </button>

                <button
                  type="button"
                  onClick={handleBuilderSubmit}
                  disabled={selected.length === 0}
                  className="flex-1 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-8 py-3.5 text-base font-black text-white shadow-md shadow-blue-500/20 transition-all hover:brightness-105 active:translate-y-0.5 active:border-b-0 disabled:pointer-events-none disabled:border-b-0 disabled:bg-slate-200 disabled:from-transparent disabled:to-transparent disabled:text-slate-400 disabled:shadow-none"
                >
                  Check Answer
                </button>
              </div>
            )}
          </>
        )}

        {/* =================================================================
            B. MULTIPLE CHOICE (3D Tactile Option Cards)
            ================================================================= */}
        {isMultipleChoice && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {item.options?.map((opt: string, idx: number) => {
              const isSelectedCorrect =
                status === "correct" && selectedMcOption === opt;
              const isTriedWrong = wrongMcOptions.has(opt);

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={status === "correct" || isTriedWrong}
                  onClick={() => handleMultipleChoiceGuess(opt)}
                  className={`flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-3xl border-2 border-b-[6px] p-5 text-center text-base sm:text-lg font-black leading-snug transition-all duration-150 ${
                    isSelectedCorrect
                      ? "border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/25"
                      : isTriedWrong
                        ? "cursor-not-allowed border-rose-300 bg-rose-50 text-rose-700 opacity-65"
                        : status === "correct"
                          ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                          : activeWord === opt
                            ? "-translate-y-0.5 border-blue-500 bg-sky-50 text-blue-900 shadow-md"
                            : "border-slate-200 border-b-slate-300 bg-white text-slate-800 shadow-xs hover:-translate-y-1 hover:border-sky-400 hover:bg-sky-50/40 hover:shadow-md active:translate-y-0.5 active:border-b-2"
                  }`}
                >
                  <span>{opt}</span>
                  {isSelectedCorrect && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-black text-white">
                      <CheckCircle2 size={14} /> Correct
                    </span>
                  )}
                  {isTriedWrong && (
                    <span className="inline-flex items-center gap-1 text-xs font-extrabold text-rose-600">
                      <XCircle size={14} /> Try another
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* =====================================================================
          3. ZERO-SHIFT FOOTER: FEEDBACK BAR + 3D NEXT BUTTON
          ===================================================================== */}
      <div className="mt-6 flex min-h-[80px] shrink-0 flex-col items-center justify-between gap-4 rounded-3xl bg-slate-50 p-4 sm:flex-row sm:px-6 ring-1 ring-slate-200/80">
        <div className="flex items-center gap-3 text-center sm:text-left">
          {status === "correct" ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
          ) : status === "incorrect" ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <XCircle className="h-5 w-5" />
            </div>
          ) : null}

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
              (isBuilder
                ? "Build the adapted sentence above and check your answer."
                : "Tap the matching option above to continue.")}
          </p>
        </div>

        <button
          type="button"
          onClick={handleNextQuestion}
          disabled={status !== "correct"}
          className={`inline-flex w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-2xl px-8 py-4 text-base font-black transition-all ${
            status === "correct"
              ? "border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0"
              : "cursor-not-allowed bg-slate-200/80 text-slate-400"
          }`}
        >
          {status !== "correct" && <Lock size={16} />}
          <span>
            {currentIndex === data.length - 1
              ? "Finish Cooldown"
              : "Next Drill"}
          </span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}