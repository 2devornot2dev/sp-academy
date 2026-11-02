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
} from "lucide-react";
import { useSpeech } from "@/context/speech-context";
import { useWordAudio } from "@/context/word-audio-context";
import { useMatrix } from "@/context/matrix-context";

// --------------------------------------------------------
// 1. VERBAL CLOZE COMPONENT (Unified Stage Card + Mic Dock)
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

  const { trackInteraction } = useMatrix();
  const hasTrackedSeen = useRef(false);
  const targetWord = item.acceptableAnswers[0];

  useEffect(() => {
    if (!hasTrackedSeen.current && targetWord) {
      trackInteraction(targetWord, { seen: 1 });
      hasTrackedSeen.current = true;
    }
  }, [targetWord, trackInteraction]);

  // Live evaluation: Check transcript in real-time
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

      onResolve("correct", "Excellent pronunciation! You nailed the missing chunk.");
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
      setLocalStatus("incorrect");

      trackInteraction(targetWord, {
        tappedWrong: 1,
        spokenAttempt: true,
        spokenScore: 0,
      });

      onResolve(
        "incorrect",
        `Heard: "${transcript || "Nothing detected"}". Try speaking the missing word again!`
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
    <div className="flex flex-col items-center w-full animate-in fade-in duration-300">
      {/* Centerpiece Stage Card (Matches PronunciationStep) */}
      <div
        className={`relative mb-6 w-full overflow-hidden rounded-3xl border bg-white p-8 md:p-10 text-center shadow-xs transition-all duration-300 ${
          isRecording
            ? "border-indigo-300 ring-4 ring-indigo-500/10"
            : localStatus === "correct"
              ? "border-green-300 bg-green-50/20"
              : localStatus === "incorrect"
                ? "border-red-300 bg-red-50/10"
                : "border-gray-200"
        }`}
      >
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-50 opacity-45">
          <Mic size={150} />
        </div>

        <p className="relative z-10 mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
          Speak the Missing Word Out Loud
        </p>

        <div className="relative z-10 mb-6 text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight leading-snug">
          {promptParts[0]}
          <span
            className={`mx-1.5 inline-block rounded-xl px-3 py-0.5 border-b-4 transition-colors ${
              localStatus === "correct"
                ? "bg-green-100 border-green-500 text-green-800"
                : "bg-indigo-50 border-dashed border-indigo-300 text-indigo-600"
            }`}
          >
            {localStatus === "correct" ? item.acceptableAnswers[0] : "____"}
          </span>
          {promptParts[1]}
        </div>

        {item.hint && (
          <div className="relative z-10 inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
            <AlertCircle size={16} />
            <span>Hint: {item.hint}</span>
          </div>
        )}
      </div>

      {/* Unified Recorder Control Dock */}
      <div className="w-full max-w-md flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleToggleMic}
          disabled={localStatus === "correct"}
          className={`w-full py-4 px-6 rounded-2xl font-bold text-base flex items-center justify-center gap-3 shadow-md transition-all active:scale-[0.98] ${
            localStatus === "correct"
              ? "bg-green-500 text-white cursor-default"
              : isRecording
                ? "bg-red-500 hover:bg-red-600 text-white ring-4 ring-red-100"
                : "bg-gray-900 hover:bg-black text-white"
          }`}
        >
          {localStatus === "correct" ? (
            <>
              <CheckCircle2 size={22} />
              <span>Pronunciation Verified</span>
            </>
          ) : isRecording ? (
            <>
              <Square size={20} className="fill-current" />
              <span>Stop Recording</span>
            </>
          ) : (
            <>
              <Mic size={22} />
              <span>
                {localStatus === "incorrect" ? "Try Speaking Again" : "Start Speaking"}
              </span>
            </>
          )}
        </button>

        <div className="min-h-[24px] text-center">
          {isRecording ? (
            <p className="text-xs font-bold text-indigo-600 animate-pulse">
              Listening:{" "}
              <span className="italic text-gray-800">
                &ldquo;{transcript || "..."}&rdquo;
              </span>
            </p>
          ) : (
            <p className="text-xs font-medium text-gray-400">
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
// 2. TRUE/FALSE COMPONENT (Unified Stage Card + Dedicated Explanation Box)
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
      // Keep footer status short; full explanation renders in the dedicated card below!
      onResolve("correct", "Correct answer!");
    } else {
      if (targetWord) trackInteraction(targetWord, { tappedWrong: 1 });
      onResolve("incorrect", "Not quite — review the explanation above and try the other option.");
    }
  };

  return (
    <div className="flex flex-col w-full animate-in fade-in duration-300">
      {/* Centerpiece Stage Card */}
      <div
        className={`relative mb-6 w-full overflow-hidden rounded-3xl border bg-white p-8 md:p-10 text-center shadow-xs transition-all duration-300 ${
          guessed === null
            ? "border-gray-200"
            : isCorrectGuess
              ? "border-green-300 bg-green-50/20"
              : "border-red-300 bg-red-50/10"
        }`}
      >
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-50 opacity-45">
          <HelpCircle size={150} />
        </div>

        <p className="relative z-10 mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
          True or False?
        </p>

        <p className="relative z-10 text-2xl md:text-3xl font-extrabold text-gray-900 leading-snug max-w-2xl mx-auto">
          &ldquo;{item.statement}&rdquo;
        </p>
      </div>

      {/* True / False Choice Buttons */}
      <div className="grid grid-cols-2 gap-4 w-full">
        <button
          type="button"
          onClick={() => handleGuess(true)}
          disabled={isCorrectGuess || guessed === true}
          className={`py-4 px-6 rounded-2xl border-2 font-bold text-lg transition-all shadow-xs active:scale-[0.98] ${
            guessed === true && isTrueAnswer
              ? "bg-green-500 border-green-600 text-white"
              : guessed === true && !isTrueAnswer
                ? "bg-red-50 border-red-300 text-red-700 opacity-65 cursor-not-allowed"
                : "bg-white border-gray-200 text-gray-800 hover:border-blue-400 hover:bg-blue-50/50 disabled:opacity-50"
          }`}
        >
          True
        </button>

        <button
          type="button"
          onClick={() => handleGuess(false)}
          disabled={isCorrectGuess || guessed === false}
          className={`py-4 px-6 rounded-2xl border-2 font-bold text-lg transition-all shadow-xs active:scale-[0.98] ${
            guessed === false && !isTrueAnswer
              ? "bg-green-500 border-green-600 text-white"
              : guessed === false && isTrueAnswer
                ? "bg-red-50 border-red-300 text-red-700 opacity-65 cursor-not-allowed"
                : "bg-white border-gray-200 text-gray-800 hover:border-blue-400 hover:bg-blue-50/50 disabled:opacity-50"
          }`}
        >
          False
        </button>
      </div>

      {/* Dedicated Explanation Card (Never crammed into the bottom footer bar!) */}
      {guessed !== null && item.explanation && (
        <div
          className={`mt-5 rounded-2xl border p-4 text-sm font-semibold leading-relaxed animate-in fade-in slide-in-from-top-2 duration-200 flex items-start gap-3 ${
            isCorrectGuess
              ? "border-green-200 bg-green-50/80 text-green-900"
              : "border-amber-200 bg-amber-50/80 text-amber-900"
          }`}
        >
          {isCorrectGuess ? (
            <CheckCircle2 size={18} className="shrink-0 text-green-600 mt-0.5" />
          ) : (
            <AlertCircle size={18} className="shrink-0 text-amber-600 mt-0.5" />
          )}
          <div>
            <span className="font-extrabold block mb-0.5">
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
// 3. REORDER COMPONENT (Matches ListeningStep Builder)
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
          "Not quite right. Tap the red tiles to fix the order or click Reset."
        );
      }
    }
  }, [selectedWords, item.expectedWords, onResolve, trackInteraction]);

  return (
    <div className="flex flex-col w-full animate-in fade-in duration-300">
      {/* Centerpiece Prompt Card */}
      <div className="relative mb-5 w-full overflow-hidden rounded-3xl border border-gray-200 bg-white p-7 text-center shadow-xs">
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-50 opacity-45">
          <Layers size={140} />
        </div>

        <p className="relative z-10 mb-2 text-xs font-bold uppercase tracking-widest text-gray-400">
          Build the Sentence
        </p>
        <h3 className="relative z-10 text-xl md:text-2xl font-extrabold text-gray-900">
          {item.prompt}
        </h3>
      </div>

      {/* Sentence Drop Zone (Matches ListeningStep) */}
      <div
        className={`min-h-[84px] w-full p-4 mb-5 rounded-2xl border-2 border-dashed flex flex-wrap justify-center gap-2.5 items-center transition-colors ${
          localStatus === "correct"
            ? "border-green-400 bg-green-50/70"
            : localStatus === "incorrect"
              ? "border-red-300 bg-red-50/60"
              : "border-gray-200 bg-gray-50/70"
        }`}
      >
        {selectedWords.length === 0 && (
          <span className="text-gray-400 text-sm font-semibold w-full text-center">
            Tap the word tiles below in the right order...
          </span>
        )}
        {selectedWords.map((word, idx) => {
          const isCorrectPos = word === item.expectedWords[idx];
          let tileClass =
            "bg-white border-gray-200 text-gray-800 hover:bg-red-50 hover:border-red-200";

          if (localStatus === "correct") {
            tileClass = "bg-green-500 border-green-600 text-white";
          } else if (localStatus === "incorrect") {
            tileClass = isCorrectPos
              ? "bg-green-100 border-green-500 text-green-900"
              : "bg-red-100 border-red-400 text-red-900";
          }

          return (
            <button
              key={`sel-${idx}`}
              type="button"
              onClick={() => handleRemoveWord(word, idx)}
              className={`px-4 py-2 border-2 rounded-xl shadow-xs font-bold transition-all active:scale-95 text-lg ${tileClass}`}
              title="Tap to remove"
            >
              {word}
            </button>
          );
        })}
      </div>

      {/* Word Bank Container (Matches ListeningStep) */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-2xs">
        <div className="flex flex-wrap justify-center gap-2.5">
          {availableWords.map((word, idx) => (
            <button
              key={`bank-${idx}`}
              type="button"
              onClick={() => handleAddWord(word, idx)}
              className="px-4 py-2 bg-gray-50/70 border-2 border-gray-200 rounded-xl font-bold text-gray-800 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 shadow-2xs transition-all active:scale-95 text-lg"
            >
              {word}
            </button>
          ))}
          {availableWords.length === 0 && (
            <div className="flex items-center gap-3 py-1">
              <span className="text-sm font-semibold text-gray-400">
                All words placed!
              </span>
              {localStatus === "incorrect" && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-100"
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
// MAIN PARENT COMPONENT (Unified Header & Footer)
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
    <div className="flex flex-col h-full p-8 overflow-y-auto animate-in fade-in duration-500">
      {/* Header & Progress (Identical to PronunciationStep & ListeningStep) */}
      <div className="mb-8 shrink-0 text-center">
        <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 mb-3">
          Knowledge Check
        </h2>

        <div className="flex items-center justify-center gap-2 mb-2">
          {data.items.map((_: any, idx: number) => (
            <div
              key={idx}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? "w-8 bg-blue-600"
                  : idx < currentIndex
                    ? "w-2.5 bg-green-500"
                    : "w-2.5 bg-gray-200"
              }`}
            />
          ))}
        </div>

        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Question {currentIndex + 1} of {totalQuestions}
        </p>
      </div>

      {/* Dynamic Question Stage */}
      <div className="flex-1 flex flex-col justify-center mb-8">
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

      {/* Unified Footer (Identical to ListeningStep & PronunciationStep) */}
      <div className="mt-auto shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 pt-6">
        <div className="flex w-full flex-1 flex-col justify-center">
          {status !== "idle" && feedback && (
            <div
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold animate-in fade-in ${
                status === "correct"
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {status === "correct" ? (
                <CheckCircle2 size={18} className="shrink-0 text-green-600" />
              ) : (
                <AlertCircle size={18} className="shrink-0 text-red-600" />
              )}
              <span>{feedback}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleNextQuestion}
          disabled={status !== "correct"}
          className={`w-full sm:w-auto shrink-0 px-8 py-4 font-bold rounded-xl text-lg transition-all flex items-center justify-center gap-2 ${
            status === "correct"
              ? "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 active:scale-95"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          <span>
            {currentIndex === totalQuestions - 1
              ? "Enter AI Conversation"
              : "Next Question"}
          </span>
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}