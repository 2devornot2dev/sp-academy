// components/foundation/boss/exercise-block.tsx
"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Headphones,
  MessageSquare,
  Sparkles,
  Volume2,
  XCircle,
} from "lucide-react";

import type { BossMessage } from "@/context/boss-context";
import { PictureSelector } from "./picture-selector";
import { PronunciationExercise } from "./pronuncation-exercise";
import { SentenceBuilder } from "./sentence-builder";

interface ExerciseBlockProps {
  message: BossMessage;
  onSubmit: (answer: unknown) => void;
  onSubmitVoice: () => void;
  onTimeOut: () => void;
  isRecording: boolean;
  isAiProcessing: boolean;
  transcript?: string;
  startRecording: () => void;
  resetRecording: () => void;
  playExerciseAudio: (
    audioKey?: string,
    targetText?: string,
  ) => void | Promise<void>;
  resolveAssetUrl: (key: string) => string;
  playWord?: (phrase: string, gender?: "m" | "f") => Promise<void>;
  stopWordAudio?: () => void;
  stopRecording?: () => void;
}

const TIME_BY_TYPE: Record<string, number> = {
  MULTIPLE_CHOICE: 45,
  LISTEN_PICTURE_SELECTOR: 45,
  SENTENCE_BUILDER: 60,
  LISTEN_SENTENCE_BUILDER: 60,
  PRONUNCIATION: 45,
  CONVERSATION: 50,
};

export function ExerciseBlock({
  message,
  onSubmit,
  onTimeOut,
  isRecording,
  isAiProcessing,
  transcript,
  startRecording,
  playExerciseAudio,
  resolveAssetUrl,
  onSubmitVoice,
  playWord,
  stopWordAudio,
  resetRecording,
  stopRecording,
}: ExerciseBlockProps) {
  const exercise = message.exercise;

  const initialTime = TIME_BY_TYPE[exercise?.type ?? ""] ?? 45;
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [selectedBlank, setSelectedBlank] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  const isCompleted =
    message.status === "correct" || message.status === "incorrect";

  const isTimerPaused = isCompleted || isRecording || isAiProcessing;

  useEffect(() => {
    setTimeLeft(initialTime);
    setSelectedBlank(null);
    setShowHint(false);
  }, [message.id, initialTime]);

  useEffect(() => {
    if (isTimerPaused || timeLeft <= 0) {
      if (timeLeft <= 0 && !isTimerPaused) {
        onTimeOut();
      }
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((previous) => previous - 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [timeLeft, isTimerPaused, onTimeOut]);

  if (!exercise) {
    return null;
  }

  const isClozeQuestion =
    exercise.type === "MULTIPLE_CHOICE" &&
    typeof exercise.question === "string" &&
    exercise.question.includes("___");

  const isAudioMc =
    exercise.type === "MULTIPLE_CHOICE" && Boolean(exercise.audioKey);

  const badgeLabel = isClozeQuestion
    ? "SNAP THE BLANK"
    : isAudioMc
      ? "AUDIO REFLEX"
      : exercise.type === "CONVERSATION"
        ? "VOICE COMEBACK"
        : exercise.type.replace(/_/g, " ");

  const renderQuestionBox = () => {
    if (!exercise.question) return null;

    if (isClozeQuestion) {
      const parts = exercise.question.split("___");
      return (
        <div className="mb-5 rounded-2xl border-2 border-b-4 border-sky-200 border-b-sky-300 bg-gradient-to-br from-sky-50 via-white to-indigo-50/40 px-5 py-5 text-center text-lg font-black text-slate-900 shadow-2xs">
          <span>{parts[0]}</span>
          <span
            className={`mx-1.5 inline-flex min-w-[90px] items-center justify-center rounded-xl border-2 border-b-[3px] px-3 py-1 text-base font-black transition-all ${
              selectedBlank
                ? message.status === "correct"
                  ? "border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white"
                  : message.status === "incorrect"
                    ? "border-rose-700 bg-gradient-to-b from-rose-500 to-rose-600 text-white"
                    : "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white"
                : "border-dashed border-sky-400 bg-white text-blue-600"
            }`}
          >
            {selectedBlank || " ? "}
          </span>
          <span>{parts.slice(1).join("___")}</span>
        </div>
      );
    }

    return (
      <div className="mb-5 flex items-center justify-center gap-2.5 rounded-2xl border-2 border-b-4 border-sky-200 border-b-sky-300 bg-gradient-to-br from-sky-50 via-white to-indigo-50/40 px-5 py-4 text-center text-lg font-black text-slate-900 shadow-2xs">
        <MessageSquare className="h-5 w-5 shrink-0 text-blue-600" />
        <span>&ldquo;{exercise.question}&rdquo;</span>
      </div>
    );
  };

  return (
    <div
      className={`w-full max-w-[92%] rounded-3xl border-2 border-b-[6px] p-5 shadow-md transition-all duration-300 sm:p-6 md:max-w-[88%] ${
        message.status === "correct"
          ? "border-emerald-300 border-b-emerald-400 bg-emerald-50/90"
          : message.status === "incorrect"
            ? "border-rose-300 border-b-rose-400 bg-rose-50/90"
            : "border-slate-200 border-b-slate-300 bg-white"
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-black tracking-wider text-indigo-700 uppercase">
          {isAudioMc ? (
            <Headphones size={13} className="text-indigo-600" />
          ) : (
            <Sparkles size={13} className="text-amber-500" />
          )}
          {badgeLabel}
        </span>

        {message.status === "correct" && (
          <CheckCircle2
            className="animate-in text-emerald-600 zoom-in"
            size={26}
          />
        )}

        {message.status === "incorrect" && (
          <XCircle className="animate-in text-rose-600 zoom-in" size={26} />
        )}

        {message.status === "pending" && (
          <div
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-black ${
              timeLeft <= 5
                ? "animate-pulse border-rose-200 bg-rose-50 text-rose-600"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            <Clock size={14} />
            <span>{timeLeft}s</span>
          </div>
        )}
      </div>

      <p className="mb-4 text-sm font-extrabold text-slate-800 sm:text-[15px]">
        {exercise.instruction}
      </p>

      {renderQuestionBox()}

      {(exercise.audioKey || exercise.type.includes("LISTEN")) && (
        <button
          type="button"
          onClick={() =>
            playExerciseAudio(
              exercise.audioKey ?? undefined,
              exercise.targetText ?? undefined,
            )
          }
          className="mb-5 flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-4 py-3 text-xs font-black text-white shadow-md transition hover:brightness-105 active:translate-y-0.5 active:border-b-0 sm:text-sm"
        >
          <Volume2 size={18} />
          <span>Listen to Boss Audio</span>
        </button>
      )}

      {message.status === "pending" && (
        <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              timeLeft <= 5
                ? "bg-rose-500"
                : "bg-gradient-to-r from-sky-400 via-blue-500 to-emerald-400"
            }`}
            style={{
              width: `${Math.max(0, (timeLeft / initialTime) * 100)}%`,
            }}
          />
        </div>
      )}

      <div className="relative">
        {isCompleted && (
          <div
            className="absolute inset-0 z-10 bg-transparent"
            aria-hidden="true"
          />
        )}

        {exercise.type === "MULTIPLE_CHOICE" && (
          <div
            className={
              isClozeQuestion
                ? "grid grid-cols-1 gap-3 sm:grid-cols-2"
                : "flex flex-col gap-3"
            }
          >
            {exercise.options?.map((option: string, index: number) => (
              <button
                key={`${option}-${index}`}
                type="button"
                onClick={() => {
                  setSelectedBlank(option);
                  onSubmit(option);
                }}
                className={`w-full rounded-2xl border-2 border-b-[4px] px-5 py-4 text-sm font-black transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-2 sm:text-base ${
                  isClozeQuestion ? "text-center" : "text-left"
                } ${
                  selectedBlank === option
                    ? "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-sm"
                    : "border-slate-200 border-b-slate-300 bg-white text-slate-800 hover:border-sky-300 hover:bg-sky-50/50"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {(exercise.type === "SENTENCE_BUILDER" ||
          exercise.type === "LISTEN_SENTENCE_BUILDER") && (
          <SentenceBuilder
            words={exercise.scrambledWords ?? []}
            expectedCount={exercise.correctAnswer?.length}
            onSubmit={onSubmit}
            playWord={playWord}
            stopWordAudio={stopWordAudio}
          />
        )}

        {exercise.type === "LISTEN_PICTURE_SELECTOR" && (
          <PictureSelector
            options={exercise.imageOptions ?? []}
            resolveAssetUrl={resolveAssetUrl}
            onSubmit={onSubmit}
            playWord={playWord}
            stopWordAudio={stopWordAudio}
          />
        )}

        {exercise.type === "PRONUNCIATION" && (
          <PronunciationExercise
            target={exercise.targetText ?? ""}
            isRecording={isRecording}
            transcript={transcript}
            startRecording={startRecording}
            stopRecording={stopRecording}
            onReset={resetRecording}
            isCompleted={isCompleted}
            onPlayReference={() =>
              playExerciseAudio(
                exercise.audioKey ?? undefined,
                exercise.targetText ?? undefined,
              )
            }
            onSubmit={onSubmitVoice}
          />
        )}

        {exercise.type === "CONVERSATION" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border-2 border-b-4 border-amber-200 border-b-amber-300 bg-amber-50/60 px-4 py-3">
              <span className="text-xs font-black text-amber-900">
                {showHint
                  ? `Target phrase: "${exercise.targetText}"`
                  : "Speak from memory! Need a lifeline?"}
              </span>
              <button
                type="button"
                onClick={() => setShowHint((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-white px-3 py-1 text-xs font-black text-amber-700 shadow-2xs transition hover:bg-amber-100"
              >
                {showHint ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{showHint ? "Hide Hint" : "Peek Hint"}</span>
              </button>
            </div>

            <PronunciationExercise
              target={showHint ? (exercise.targetText ?? "") : "???"}
              isRecording={isRecording}
              transcript={transcript}
              startRecording={startRecording}
              stopRecording={stopRecording}
              onReset={resetRecording}
              isCompleted={isCompleted}
              onPlayReference={() =>
                playExerciseAudio(
                  exercise.audioKey ?? undefined,
                  exercise.targetText ?? undefined,
                )
              }
              onSubmit={onSubmitVoice}
            />
          </div>
        )}
      </div>
    </div>
  );
}