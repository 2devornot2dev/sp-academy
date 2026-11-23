"use client";

import { useState, useEffect } from "react";
import { Check, Mic, RotateCcw, Volume2, X } from "lucide-react";
import { playSfx } from "@/lib/sfx";

const MAX_RETRIES = 3;

interface PronunciationExerciseProps {
  target: string;
  onSubmit: () => void;
  onPlayReference: () => void;
  isRecording: boolean;
  transcript?: string;
  startRecording: () => void;
  stopRecording?: () => void;
  onReset: () => void;
  isCompleted?: boolean;
}

export function PronunciationExercise({
  target,
  onSubmit,
  onPlayReference,
  isRecording,
  transcript,
  startRecording,
  stopRecording,
  onReset,
  isCompleted = false,
}: PronunciationExerciseProps) {
  const [isReviewing, setIsReviewing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setIsReviewing(false);
    setRetryCount(0);
  }, [target]);

  useEffect(() => {
    if (!isRecording && transcript) {
      setIsReviewing(true);
    }
  }, [isRecording, transcript]);

  const handleStartRecording = () => {
    playSfx("tap");
    setIsReviewing(false);
    startRecording();
  };

  const handleDoneSpeaking = () => {
    playSfx("tap");
    if (transcript) {
      setIsReviewing(true);
      stopRecording?.();
    } else {
      // Nothing transcribed yet — stop cleanly so user isn't trapped on the red mic
      stopRecording?.();
      onReset();
    }
  };

  const handleRetry = () => {
    if (retryCount >= MAX_RETRIES) return;
    playSfx("tap");
    setRetryCount((prev) => prev + 1);
    setIsReviewing(false);
    stopRecording?.();
    onReset();
  };

  const retriesRemaining = MAX_RETRIES - retryCount;
  const showRecordingState = isRecording && !isReviewing && !isCompleted;
  const showReviewState = Boolean(transcript) && (isReviewing || !isRecording);

  return (
    <div className="flex flex-col items-center gap-3.5 sm:gap-5 text-center">
      {/* Target Word / Phrase */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <div className="text-lg sm:text-2xl font-extrabold text-slate-800">
          “{target}”
        </div>

        <button
          type="button"
          onClick={() => {
            playSfx("tap");
            onPlayReference();
          }}
          className="rounded-full bg-slate-100 p-2 text-indigo-500 transition-colors hover:bg-indigo-100"
          aria-label="Play reference audio"
        >
          <Volume2 size={18} />
        </button>
      </div>

      {/* 1. Initial State: Start Recording */}
      {!showRecordingState && !showReviewState && !isCompleted && (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleStartRecording}
            className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full border-b-4 border-indigo-700 bg-indigo-500 shadow-md transition-all hover:bg-indigo-400 active:translate-y-1 active:border-b-0"
            aria-label="Start recording"
          >
            <Mic className="text-white size-7 sm:size-8" />
          </button>
          {retryCount > 0 && (
            <p className="text-xs font-semibold text-slate-400">
              Attempt {retryCount + 1} of {MAX_RETRIES + 1}
            </p>
          )}
        </div>
      )}

      {/* 2. Recording State: Pulse Mic, Live Text, and Always-Available Stop Button */}
      {showRecordingState && (
        <div className="flex w-full flex-col items-center gap-2.5 sm:gap-3">
          <div className="flex h-16 w-16 sm:h-20 sm:w-20 animate-pulse items-center justify-center rounded-full bg-rose-500 shadow-lg shadow-rose-200">
            <Mic className="text-white size-7 sm:size-8" />
          </div>

          <p className="text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-indigo-500">
            Listening...
          </p>

          {transcript ? (
            <div className="w-full max-w-sm rounded-xl border border-indigo-100 bg-indigo-50/80 px-3.5 py-2 text-sm sm:text-base font-semibold text-indigo-900 transition-all">
              “{transcript}”
            </div>
          ) : (
            <p className="text-xs text-slate-400">Speak now...</p>
          )}

          <button
            type="button"
            onClick={handleDoneSpeaking}
            className={`mt-1 flex w-full max-w-xs items-center justify-center gap-2 rounded-xl border-b-4 py-2.5 sm:py-3 text-sm font-extrabold shadow-md transition-all active:translate-y-1 active:border-b-0 ${
              transcript
                ? "border-indigo-700 bg-indigo-500 text-white hover:bg-indigo-400"
                : "border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {transcript ? <Check size={18} /> : <X size={16} />}
            <span>{transcript ? "Done Speaking" : "Cancel"}</span>
          </button>
        </div>
      )}

      {/* 3. Review (Retry / Submit) & Completed State */}
      {showReviewState && (
        <div className="mt-1 w-full animate-in rounded-2xl border-2 border-slate-200 bg-slate-50 p-3 sm:p-4 duration-300 zoom-in-95">
          <p
            className={`text-xs sm:text-sm font-medium text-slate-500 ${
              isCompleted ? "mb-0" : "mb-3 sm:mb-4"
            }`}
          >
            Heard:{" "}
            <span className="text-sm sm:text-[15px] font-extrabold text-slate-800">
              “{transcript}”
            </span>
          </p>

          {!isCompleted && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2.5 sm:gap-3">
                {retriesRemaining > 0 && (
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-slate-200 bg-white py-2.5 sm:py-3.5 text-xs sm:text-sm font-bold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-800 active:translate-y-1"
                  >
                    <RotateCcw size={15} />
                    Retry ({retriesRemaining} left)
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    playSfx("tap");
                    stopRecording?.();
                    onSubmit();
                  }}
                  className="flex-1 rounded-xl border-b-4 border-emerald-700 bg-emerald-500 py-2.5 sm:py-3.5 text-xs sm:text-sm font-extrabold text-white transition-all hover:bg-emerald-400 active:translate-y-1 active:border-b-0"
                >
                  Submit
                </button>
              </div>

              {retriesRemaining === 0 && (
                <p className="text-xs font-semibold text-amber-600">
                  No retries remaining — please submit your answer.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}