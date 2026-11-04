"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Square,
  HelpCircle,
  Layers,
  Sparkles,
  Check,
  Lock,
} from "lucide-react";
import { useSpeech } from "@/context/speech-context";
import { useWordAudio } from "@/context/word-audio-context";
import { useMatrix } from "@/context/matrix-context";

// --------------------------------------------------------
// 1. VERBAL CLOZE COMPONENT (3D Stage Card + 3D Mic Dock)
// --------------------------------------------------------
function VerbalClozeQuestion({
  item,
  targetLang,
  onResolve,
}: {
  item: any;
  targetLang: string;
  onResolve: (status: "idle" | "correct" | "incorrect", msg: string) => void;
}) {
  const {
    startRecording,
    stopRecording,
    isRecording,
    transcript,
    resetSpeechState,
  } = useSpeech();
  const [localStatus, setLocalStatus] = useState<
    "idle" | "correct" | "incorrect"
  >("idle");
  const [attempts, setAttempts] = useState(0);

  const { trackInteraction } = useMatrix();
  const hasTrackedSeen = useRef(false);
  const targetWord = item.acceptableAnswers[0];

  useEffect(() => {
    if (!hasTrackedSeen.current && targetWord) {
      trackInteraction(targetWord, { seen: 1 });
      hasTrackedSeen.current = true;
    }
  }, [targetWord, trackInteraction]);

  useEffect(() => {
    if (!isRecording || !transcript) return;

    const spokenText = transcript.toLowerCase();
    const isMatch = item.acceptableAnswers.some((ans: string) =>
      spokenText.includes(ans.toLowerCase())
    );

    if (isMatch) {
      stopRecording();
      setLocalStatus("correct");

      trackInteraction(targetWord, {
        tappedCorrect: 1,
        spokenAttempt: true,
        spokenScore: 100,
      });

      onResolve(
        "correct",
        "Excellent pronunciation! You nailed the missing chunk."
      );
    }
  }, [
    transcript,
    isRecording,
    item,
    stopRecording,
    onResolve,
    targetWord,
    trackInteraction,
  ]);

  const handleToggleMic = async () => {
    if (isRecording) {
      await stopRecording();
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);

      // Safety valve: after 2 mic tries, reveal & allow advancing so a noisy mic never soft-locks
      if (nextAttempts >= 2) {
        setLocalStatus("correct");
        onResolve(
          "correct",
          `Target word: "${targetWord}". Unlocked to continue!`
        );
        return;
      }

      setLocalStatus("incorrect");
      trackInteraction(targetWord, {
        tappedWrong: 1,
        spokenAttempt: true,
        spokenScore: 0,
      });

      onResolve(
        "incorrect",
        `Heard: "${
          transcript || "Nothing detected"
        }". Try saying "${targetWord}" once more!`
      );
    } else {
      resetSpeechState();
      setLocalStatus("idle");
      onResolve("idle", "");
      await startRecording(targetLang);
    }
  };

  const promptParts = item.prompt.split("___");

  return (
    <div className="flex w-full flex-col items-center animate-in fade-in duration-300">
      {/* 3D Stage Card */}
      <div
        className={`relative mb-6 w-full overflow-hidden rounded-3xl border-2 border-b-[6px] bg-white p-8 sm:p-10 text-center transition-all duration-300 ${
          isRecording
            ? "border-indigo-500 ring-4 ring-indigo-500/10"
            : localStatus === "correct"
              ? "border-emerald-500 bg-emerald-50/20 shadow-lg shadow-emerald-500/10"
              : localStatus === "incorrect"
                ? "border-rose-400 bg-rose-50/10"
                : "border-slate-200 shadow-sm"
        }`}
      >
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-100/70">
          <Mic size={150} />
        </div>

        <p className="relative z-10 mb-3 text-[11px] font-black tracking-widest text-blue-600 uppercase">
          Speak the Missing Word Out Loud
        </p>

        <div className="relative z-10 mb-6 text-2xl sm:text-4xl font-black tracking-tight leading-snug text-slate-900">
          {promptParts[0]}
          <span
            className={`mx-1.5 inline-block rounded-2xl border-b-4 px-4 py-1 transition-colors ${
              localStatus === "correct"
                ? "border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white"
                : "border-sky-300 bg-sky-50 text-blue-600"
            }`}
          >
            {localStatus === "correct" ? item.acceptableAnswers[0] : "____"}
          </span>
          {promptParts[1]}
        </div>

        {item.hint && (
          <div className="relative z-10 inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs sm:text-sm font-black text-amber-900">
            <AlertCircle size={16} className="text-amber-600" />
            <span>Hint: {item.hint}</span>
          </div>
        )}
      </div>

      {/* 3D Recorder Control Dock */}
      <div className="flex w-full max-w-md flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleToggleMic}
          disabled={localStatus === "correct"}
          className={`inline-flex w-full items-center justify-center gap-3 rounded-2xl border-b-4 px-6 py-4 text-base font-black text-white shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-0 ${
            localStatus === "correct"
              ? "cursor-default border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600"
              : isRecording
                ? "border-rose-800 bg-gradient-to-b from-rose-500 to-rose-600 ring-4 ring-rose-100"
                : localStatus === "incorrect"
                  ? "border-orange-700 bg-gradient-to-b from-amber-400 to-orange-500 text-slate-950"
                  : "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 shadow-blue-500/25"
          }`}
        >
          {localStatus === "correct" ? (
            <>
              <CheckCircle2 size={22} />
              <span>Pronunciation Verified</span>
            </>
          ) : isRecording ? (
            <>
              <Square size={18} className="fill-current" />
              <span>Tap When Done Speaking</span>
            </>
          ) : (
            <>
              <Mic size={22} />
              <span>
                {localStatus === "incorrect"
                  ? "Try Speaking Again"
                  : "Start Speaking"}
              </span>
            </>
          )}
        </button>

        <div className="min-h-[24px] text-center">
          {isRecording ? (
            <p className="animate-pulse text-xs font-black text-blue-600">
              Listening:{" "}
              <span className="italic text-slate-800">
                &ldquo;{transcript || "..."}&rdquo;
              </span>
            </p>
          ) : (
            <p className="text-xs font-semibold text-slate-400">
              {localStatus === "correct"
                ? "Click Next Question below to continue"
                : "Say the missing word clearly — matches automatically"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------
// 2. TRUE/FALSE COMPONENT (3D Stage Card + 3D True/False Buttons)
// --------------------------------------------------------
function TrueFalseQuestion({
  item,
  onResolve,
}: {
  item: any;
  onResolve: (status: "idle" | "correct" | "incorrect", msg: string) => void;
}) {
  const [guessed, setGuessed] = useState<boolean | null>(null);

  const isTrueAnswer =
    typeof item.isTrue === "boolean"
      ? item.isTrue
      : String(item.isTrue).toLowerCase() === "true";

  const { trackInteraction } = useMatrix();
  const hasTrackedSeen = useRef(false);
  const targetWord = item.targetWord || item.targetChunk;

  useEffect(() => {
    if (targetWord && !hasTrackedSeen.current) {
      trackInteraction(targetWord, { seen: 1 });
      hasTrackedSeen.current = true;
    }
  }, [targetWord, trackInteraction]);

  const isCorrectGuess = guessed !== null && guessed === isTrueAnswer;

  const handleGuess = (guess: boolean) => {
    setGuessed(guess);
    if (guess === isTrueAnswer) {
      if (targetWord) trackInteraction(targetWord, { tappedCorrect: 1 });
      onResolve("correct", "Spot on! You caught the grammar nuance.");
    } else {
      if (targetWord) trackInteraction(targetWord, { tappedWrong: 1 });
      onResolve(
        "incorrect",
        "Not quite — check the tip above and tap the other option."
      );
    }
  };

  return (
    <div className="flex w-full flex-col animate-in fade-in duration-300">
      {/* 3D Stage Card */}
      <div
        className={`relative mb-6 w-full overflow-hidden rounded-3xl border-2 border-b-[6px] bg-white p-8 sm:p-10 text-center transition-all duration-300 ${
          guessed === null
            ? "border-slate-200 shadow-sm"
            : isCorrectGuess
              ? "border-emerald-500 bg-emerald-50/20 shadow-lg shadow-emerald-500/10"
              : "border-rose-400 bg-rose-50/10"
        }`}
      >
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-100/70">
          <HelpCircle size={150} />
        </div>

        <p className="relative z-10 mb-3 text-[11px] font-black tracking-widest text-blue-600 uppercase">
          True or False?
        </p>

        <p className="relative z-10 mx-auto max-w-2xl text-2xl sm:text-3xl font-black leading-snug text-slate-900">
          &ldquo;{item.statement}&rdquo;
        </p>
      </div>

      {/* 3D True / False Choice Buttons */}
      <div className="grid w-full grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => handleGuess(true)}
          disabled={isCorrectGuess || guessed === true}
          className={`rounded-2xl border-2 border-b-[5px] px-6 py-4 text-lg font-black transition-all duration-150 ${
            guessed === true && isTrueAnswer
              ? "border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/25"
              : guessed === true && !isTrueAnswer
                ? "cursor-not-allowed border-rose-300 bg-rose-50 text-rose-700 opacity-65"
                : "border-slate-200 border-b-slate-300 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-sky-400 hover:bg-sky-50/40 active:translate-y-0.5 active:border-b-2"
          }`}
        >
          True
        </button>

        <button
          type="button"
          onClick={() => handleGuess(false)}
          disabled={isCorrectGuess || guessed === false}
          className={`rounded-2xl border-2 border-b-[5px] px-6 py-4 text-lg font-black transition-all duration-150 ${
            guessed === false && !isTrueAnswer
              ? "border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/25"
              : guessed === false && isTrueAnswer
                ? "cursor-not-allowed border-rose-300 bg-rose-50 text-rose-700 opacity-65"
                : "border-slate-200 border-b-slate-300 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-sky-400 hover:bg-sky-50/40 active:translate-y-0.5 active:border-b-2"
          }`}
        >
          False
        </button>
      </div>

      {/* Dedicated Explanation Card */}
      {guessed !== null && item.explanation && (
        <div
          className={`mt-5 flex items-start gap-3 rounded-2xl border p-4 text-sm font-semibold leading-relaxed animate-in fade-in slide-in-from-top-2 duration-200 ${
            isCorrectGuess
              ? "border-emerald-200 bg-emerald-50/80 text-emerald-900"
              : "border-amber-200 bg-amber-50/80 text-amber-900"
          }`}
        >
          {isCorrectGuess ? (
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0 text-emerald-600"
            />
          ) : (
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600" />
          )}
          <div>
            <span className="mb-0.5 block font-black">
              {isCorrectGuess ? "Why this is right:" : "Quick tip:"}
            </span>
            <span>{item.explanation}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------
// 3. REORDER COMPONENT (3D Word Builder)
// --------------------------------------------------------
function ReorderQuestion({
  item,
  onResolve,
}: {
  item: any;
  onResolve: (status: "idle" | "correct" | "incorrect", msg: string) => void;
}) {
  const { playWord } = useWordAudio();
  const { trackInteraction } = useMatrix();
  const hasTrackedSeen = useRef(false);
  const heardWords = useRef<Set<string>>(new Set());

  const [availableWords, setAvailableWords] = useState<string[]>(
    item.scrambledBank
  );
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [localStatus, setLocalStatus] = useState<
    "idle" | "correct" | "incorrect"
  >("idle");

  useEffect(() => {
    if (!hasTrackedSeen.current && item.scrambledBank) {
      item.scrambledBank.forEach((w: string) =>
        trackInteraction(w, { seen: 1 })
      );
      hasTrackedSeen.current = true;
    }
  }, [item.scrambledBank, trackInteraction]);

  const handleAddWord = (word: string, idx: number) => {
    void playWord(word, "m");

    if (!heardWords.current.has(word)) {
      trackInteraction(word, { heard: 1 });
      heardWords.current.add(word);
    }

    setLocalStatus("idle");
    onResolve("idle", "");
    setSelectedWords([...selectedWords, word]);
    const newAvailable = [...availableWords];
    newAvailable.splice(idx, 1);
    setAvailableWords(newAvailable);
  };

  const handleRemoveWord = (word: string, idx: number) => {
    if (localStatus === "correct") return;
    setLocalStatus("idle");
    onResolve("idle", "");
    const newSelected = [...selectedWords];
    newSelected.splice(idx, 1);
    setSelectedWords(newSelected);
    setAvailableWords([...availableWords, word]);
  };

  const handleReset = () => {
    setLocalStatus("idle");
    onResolve("idle", "");
    setSelectedWords([]);
    setAvailableWords(item.scrambledBank);
  };

  useEffect(() => {
    if (selectedWords.length === item.expectedWords.length) {
      selectedWords.forEach((word, i) => {
        if (word === item.expectedWords[i]) {
          trackInteraction(word, { tappedCorrect: 1 });
        } else {
          trackInteraction(word, { tappedWrong: 1 });
        }
      });

      const isPerfectMatch = selectedWords.every(
        (word, i) => word === item.expectedWords[i]
      );
      if (isPerfectMatch) {
        setLocalStatus("correct");
        onResolve("correct", "Spot on! Perfect sentence order.");
      } else {
        setLocalStatus("incorrect");
        onResolve(
          "incorrect",
          "Green tiles are in the right spot! Tap any red tile to fix the order."
        );
      }
    }
  }, [selectedWords, item.expectedWords, onResolve, trackInteraction]);

  return (
    <div className="flex w-full flex-col animate-in fade-in duration-300">
      {/* 3D Prompt Card */}
      <div className="relative mb-5 w-full overflow-hidden rounded-3xl border-2 border-b-[5px] border-slate-200 bg-white p-7 text-center shadow-xs">
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-100/70">
          <Layers size={140} />
        </div>

        <p className="relative z-10 mb-2 text-[11px] font-black tracking-widest text-blue-600 uppercase">
          Build the Sentence
        </p>
        <h3 className="relative z-10 text-xl sm:text-2xl font-black text-slate-900">
          {item.prompt}
        </h3>
      </div>

      {/* Sentence Drop Zone */}
      <div
        className={`mb-5 flex min-h-[84px] w-full flex-wrap items-center justify-center gap-2.5 rounded-3xl border-2 border-dashed p-4 transition-colors ${
          localStatus === "correct"
            ? "border-emerald-400 bg-emerald-50/60"
            : localStatus === "incorrect"
              ? "border-rose-300 bg-rose-50/50"
              : "border-slate-300 bg-slate-50/70"
        }`}
      >
        {selectedWords.length === 0 && (
          <span className="w-full text-center text-sm font-bold text-slate-400">
            Tap the 3D word tiles below in the right order...
          </span>
        )}
        {selectedWords.map((word, idx) => {
          const isCorrectPos = word === item.expectedWords[idx];
          let tileClass =
            "border-blue-700 bg-gradient-to-b from-sky-400 to-blue-600 text-white";

          if (localStatus === "correct" || isCorrectPos) {
            tileClass =
              "border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white";
          } else if (localStatus === "incorrect" && !isCorrectPos) {
            tileClass =
              "border-rose-700 bg-gradient-to-b from-rose-400 to-rose-600 text-white";
          }

          return (
            <button
              key={`sel-${idx}`}
              type="button"
              onClick={() => handleRemoveWord(word, idx)}
              disabled={localStatus === "correct"}
              className={`inline-flex items-center gap-1.5 rounded-2xl border-2 border-b-4 px-4 py-2 text-base sm:text-lg font-black shadow-sm transition-all active:translate-y-0.5 active:border-b-2 ${tileClass}`}
              title="Tap to remove"
            >
              <span>{word}</span>
              {(localStatus === "correct" || isCorrectPos) && (
                <Check size={15} className="shrink-0 stroke-[3.5]" />
              )}
            </button>
          );
        })}
      </div>

      {/* 3D Word Bank */}
      <div className="rounded-3xl border border-slate-200/80 bg-slate-50/50 p-4">
        <div className="flex flex-wrap justify-center gap-2.5">
          {availableWords.map((word, idx) => (
            <button
              key={`bank-${idx}`}
              type="button"
              onClick={() => handleAddWord(word, idx)}
              className="rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-white px-4 py-2.5 text-base sm:text-lg font-black text-slate-800 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-sky-400 hover:bg-sky-50/40 active:translate-y-0.5 active:border-b-2"
            >
              {word}
            </button>
          ))}
          {availableWords.length === 0 && (
            <div className="flex items-center gap-3 py-1">
              <span className="text-sm font-bold text-slate-400">
                All words placed!
              </span>
              {localStatus === "incorrect" && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1 rounded-xl border-b-2 border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-600 hover:bg-rose-100"
                >
                  <RotateCcw size={13} />
                  <span>Reset Order</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------
// MAIN PARENT COMPONENT
// --------------------------------------------------------
export function QuizStep({
  data,
  targetLang,
  onNext,
}: {
  data: any;
  targetLang: string;
  onNext: () => void;
}) {
  const { stopAudio } = useWordAudio();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState<"idle" | "correct" | "incorrect">(
    "idle"
  );
  const [feedback, setFeedback] = useState<string>("");

  const totalQuestions = data.items.length;
  const currentItem = data.items[currentIndex];

  const handleResolve = (
    newStatus: "idle" | "correct" | "incorrect",
    msg: string
  ) => {
    setStatus(newStatus);
    setFeedback(msg);
  };

  const handleNextQuestion = () => {
    stopAudio();
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
      setStatus("idle");
      setFeedback("");
    } else {
      onNext();
    }
  };

  return (
    <div className="flex h-full flex-col justify-between overflow-y-auto p-6 sm:p-10 animate-in fade-in duration-500">
      {/* 1. Header & Segmented Progress */}
      <div className="mb-6 flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <span className="text-[11px] font-black tracking-wider text-blue-600 uppercase">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          <h2 className="mt-0.5 text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Knowledge Check
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {data.items.map((_: any, idx: number) => (
            <div
              key={idx}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? "w-9 bg-gradient-to-r from-sky-400 to-blue-600"
                  : idx < currentIndex
                    ? "w-5 bg-emerald-500"
                    : "w-5 bg-slate-200"
              }`}
            />
          ))}
        </div>
      </div>

      {/* 2. Dynamic Question Stage */}
      <div className="mx-auto my-auto flex w-full max-w-3xl flex-1 flex-col justify-center">
        {currentItem.type === "verbal_cloze" && (
          <VerbalClozeQuestion
            key={`cloze-${currentIndex}`}
            item={currentItem}
            targetLang={targetLang}
            onResolve={handleResolve}
          />
        )}
        {currentItem.type === "true_false" && (
          <TrueFalseQuestion
            key={`tf-${currentIndex}`}
            item={currentItem}
            onResolve={handleResolve}
          />
        )}
        {currentItem.type === "reorder" && (
          <ReorderQuestion
            key={`reorder-${currentIndex}`}
            item={currentItem}
            onResolve={handleResolve}
          />
        )}
      </div>

      {/* 3. Zero-Shift Footer */}
      <div className="mt-6 flex min-h-[80px] shrink-0 flex-col items-center justify-between gap-4 rounded-3xl bg-slate-50 p-4 sm:flex-row sm:px-6 ring-1 ring-slate-200/80">
        <div className="flex items-center gap-3 text-center sm:text-left">
          {status === "correct" ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
          ) : status === "incorrect" ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <AlertCircle className="h-5 w-5" />
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
            {feedback || "Complete the challenge above to unlock the next step."}
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
            {currentIndex === totalQuestions - 1
              ? "Enter Final Mission"
              : "Next Question"}
          </span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}