// components/freestyle/review/freestyle-pronunciation-review.tsx
"use client";

import { useState } from "react";
import {
  ArrowRight,
  Flame,
  Mic,
  RotateCcw,
  Sparkles,
  Target,
  Volume2,
} from "lucide-react";
import { usePronunciation } from "@/context/pronunciation-context";
import { useSpeak } from "@/hooks/use-speak";

interface Props {
  phrases: string[];
  targetLanguage: string;
  onComplete: () => void;
}

export function FreestylePronunciationReview({
  phrases,
  targetLanguage,
  onComplete,
}: Props) {
  const { isRecording, score, error, assessSpeech, reset } =
    usePronunciation();
  const { speak, isPlaying } = useSpeak();
  const [index, setIndex] = useState(0);

  if (!phrases.length) {
    return (
      <div className="space-y-4 rounded-3xl border-2 border-b-[6px] border-slate-200 bg-white p-8 text-center shadow-sm animate-in fade-in">
        <p className="text-sm font-bold text-slate-600">
          No pronunciation drills needed for this session!
        </p>
        <button
          onClick={onComplete}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-8 py-4 text-sm font-black text-white shadow-lg transition hover:brightness-105"
        >
          <span>Finish Review</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const current = phrases[index];
  const isLast = index === phrases.length - 1;
  const progressPct = Math.round(((index + 1) / phrases.length) * 100);

  const handlePractice = async () => {
    reset();
    await assessSpeech(current, targetLanguage);
  };

  const handleContinue = () => {
    if (isLast) {
      onComplete();
    } else {
      setIndex((i) => i + 1);
      reset();
    }
  };

  return (
    <div className="space-y-6 rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-6 text-center shadow-md sm:p-7 animate-in slide-in-from-bottom-4">
      {/* Top Bar + Progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="rounded-xl border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-black tracking-wider text-blue-700 uppercase">
            Speak It Back
          </span>
          <span className="text-xs font-black text-slate-400">
            Phrase {index + 1} of {phrases.length}
          </span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Target Phrase Stage Card (With Word Coloring + Listen Button) */}
      <div className="rounded-3xl border-2 border-slate-200 bg-gradient-to-b from-slate-900 to-indigo-950 px-6 py-7 text-white shadow-inner">
        <span className="block text-[10px] font-black tracking-widest text-sky-300 uppercase">
          Listen, then say this phrase out loud
        </span>

        {score?.words?.length ? (
          <p className="mt-3 flex flex-wrap justify-center gap-2 text-2xl font-black leading-snug">
            {score.words.map((w: any, idx: number) => {
              const acc = w.accuracyScore ?? 0;
              const pill =
                acc >= 80
                  ? "bg-emerald-500/25 text-emerald-300 border-emerald-400/50"
                  : acc >= 60
                    ? "bg-amber-500/25 text-amber-200 border-amber-400/50"
                    : "bg-rose-500/25 text-rose-200 border-rose-400/50";
              return (
                <span
                  key={idx}
                  title={`Accuracy: ${Math.round(acc)}%`}
                  className={`rounded-xl border px-2.5 py-0.5 ${pill}`}
                >
                  {w.word}
                </span>
              );
            })}
          </p>
        ) : (
          <p className="mt-3 text-2xl font-black leading-snug text-white">
            &ldquo;{current}&rdquo;
          </p>
        )}

        <button
          type="button"
          disabled={isPlaying}
          onClick={() => void speak(current, targetLanguage, 0.9)}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-extrabold text-sky-200 transition hover:bg-white/20 disabled:opacity-50"
        >
          <Volume2 className="h-4 w-4" />
          <span>{isPlaying ? "Playing..." : "Hear Pronunciation"}</span>
        </button>
      </div>

      {/* 3D Tactile Mic Button */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={handlePractice}
          disabled={isRecording}
          className={`flex h-20 w-20 items-center justify-center rounded-3xl border-b-[6px] text-white shadow-xl transition-all ${
            isRecording
              ? "scale-110 animate-pulse border-rose-800 bg-gradient-to-b from-rose-500 to-red-600 ring-4 ring-rose-200"
              : "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-2"
          }`}
        >
          <Mic className="h-8 w-8" />
        </button>

        <span className="text-xs font-extrabold text-slate-500">
          {isRecording
            ? "Listening... Speak clearly!"
            : score
              ? "Tap mic to try again, or continue below"
              : "Tap mic to record"}
        </span>
      </div>

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600">
          {error}
        </p>
      )}

      {/* Score Result + Action Row */}
      {score && (
        <div className="space-y-4 border-t border-slate-100 pt-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center justify-center gap-4">
            <div className="inline-flex items-baseline gap-1 rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-5 py-2">
              <span className="text-4xl font-black text-emerald-700">
                {Math.round(score.pronunciationScore)}
              </span>
              <span className="text-sm font-black text-emerald-500">%</span>
            </div>

            <div className="text-left">
              <p className="flex items-center gap-1.5 text-base font-black text-slate-900">
                {score.pronunciationScore >= 80 ? (
                  <>
                    <Flame className="h-4 w-4 text-emerald-500" />
                    <span>Nailed it!</span>
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4 text-amber-500" />
                    <span>Good effort!</span>
                  </>
                )}
              </p>
              <p className="text-xs font-bold text-slate-500">
                Accuracy {Math.round(score.accuracyScore)}% • Fluency{" "}
                {Math.round(score.fluencyScore)}%
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handlePractice}
              disabled={isRecording}
              className="inline-flex items-center justify-center gap-1.5 rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-slate-50 px-5 py-3.5 text-xs font-black text-slate-700 transition hover:bg-white"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Retry</span>
            </button>

            <button
              onClick={handleContinue}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 py-3.5 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0"
            >
              {isLast ? (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Complete Review</span>
                </>
              ) : (
                <>
                  <span>Next Phrase</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}