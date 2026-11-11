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

  // Badge label that feels more like a game mode than a raw enum
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
        <div className="mb-5 rounded-2xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-slate-50 px-5 py-5 text-center text-lg font-extrabold text-slate-800 shadow-inner">
          <span>{parts[0]}</span>
          <span
            className={`mx-1.5 inline-flex min-w-[90px] items-center justify-center rounded-xl border-2 px-3 py-1 text-base font-black transition-all ${
              selectedBlank
                ? message.status === "correct"
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : message.status === "incorrect"
                    ? "border-rose-500 bg-rose-500 text-white"
                    : "border-indigo-500 bg-indigo-600 text-white"
                : "border-dashed border-indigo-400 bg-white text-indigo-400"
            }`}
          >
            {selectedBlank || " ? "}
          </span>
          <span>{parts.slice(1).join("___")}</span>
        </div>
      );
    }

    return (
      <div className="mb-5 flex items-center justify-center gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-center text-lg font-extrabold text-slate-800">
        <MessageSquare className="h-5 w-5 shrink-0 text-indigo-500" />
        <span>“{exercise.question}”</span>
      </div>
    );
  };

  return (
    <div
      className={`w-full max-w-[90%] rounded-3xl border-2 p-5 shadow-sm transition-all duration-300 sm:p-6 md:max-w-[85%] ${
        message.status === "correct"
          ? "border-emerald-200 bg-emerald-50 shadow-emerald-100"
          : message.status === "incorrect"
            ? "border-rose-200 bg-rose-50 shadow-rose-100"
            : "border-slate-200 bg-white"
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-slate-500">
          {isAudioMc ? (
            <Headphones size={13} className="text-indigo-500" />
          ) : (
            <Sparkles size={13} className="text-amber-500" />
          )}
          {badgeLabel}
        </span>

        {message.status === "correct" && (
          <CheckCircle2
            className="animate-in text-emerald-500 zoom-in"
            size={28}
          />
        )}

        {message.status === "incorrect" && (
          <XCircle className="animate-in text-rose-500 zoom-in" size={28} />
        )}

        {message.status === "pending" && (
          <div
            className={`flex items-center gap-1.5 font-bold ${
              timeLeft <= 5 ? "animate-pulse text-rose-500" : "text-amber-500"
            }`}
          >
            <Clock size={18} />
            {timeLeft}s
          </div>
        )}
      </div>

      <p className="mb-4 text-[15px] font-bold text-slate-700">
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
          className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-extrabold text-indigo-600 transition-colors hover:bg-indigo-100 active:scale-95"
        >
          <Volume2 size={20} />
          Listen to Boss Audio
        </button>
      )}

      {message.status === "pending" && (
        <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              timeLeft <= 5 ? "bg-rose-500" : "bg-amber-400"
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
                className={`w-full rounded-2xl border-2 border-b-4 px-5 py-4 font-bold transition-all active:translate-y-1 active:border-b-2 ${
                  isClozeQuestion ? "text-center text-base" : "text-left"
                } ${
                  selectedBlank === option
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-white text-slate-700 hover:border-indigo-400 hover:bg-indigo-50"
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
            <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-2.5">
              <span className="text-xs font-bold text-amber-800">
                {showHint
                  ? `Target phrase: "${exercise.targetText}"`
                  : "Speak from memory! Need help?"}
              </span>
              <button
                type="button"
                onClick={() => setShowHint((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1 text-xs font-extrabold text-amber-700 shadow-sm transition hover:bg-amber-100"
              >
                {showHint ? <EyeOff size={14} /> : <Eye size={14} />}
                {showHint ? "Hide Hint" : "Show Hint"}
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