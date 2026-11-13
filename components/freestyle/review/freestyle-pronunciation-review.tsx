// components/freestyle/review/freestyle-pronunciation-review.tsx
"use client";

import { useState } from "react";
import {
  ArrowLeft,
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
import { getAlphaGrade, type TrickyWordItem } from "@/lib/freestyle/grades";

interface Props {
  phrases: string[];
  trickyWords?: TrickyWordItem[];
  targetLanguage: string;
  onBack?: () => void;
  onComplete: () => void;
}

export function FreestylePronunciationReview({
  phrases,
  trickyWords = [],
  targetLanguage,
  onBack,
  onComplete,
}: Props) {
  const { isRecording, score, error, assessSpeech, reset } =
    usePronunciation();
  const { speak, isPlaying } = useSpeak();
  const [index, setIndex] = useState(0);
  const [activeWordKey, setActiveWordKey] = useState<string | null>(null);

  const handleSpeakWord = async (rawWord: string, key: string) => {
    const clean = rawWord.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
    if (!clean) return;
    setActiveWordKey(key);
    await speak(clean, targetLanguage, 0.85);
    setActiveWordKey((cur) => (cur === key ? null : cur));
  };

  if (!phrases.length && !trickyWords.length) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 rounded-3xl border-2 border-b-[6px] border-slate-200 bg-white p-8 text-center shadow-sm animate-in fade-in">
        <p className="text-sm font-bold text-slate-600">
          Your pronunciation was super crisp — ready to claim your completion!
        </p>
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 rounded-2xl border-2 border-b-[3px] border-slate-200 bg-white px-5 py-4 text-xs font-black text-slate-600 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
          )}
          <button
            onClick={onComplete}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 px-8 py-4 text-sm font-black text-white shadow-lg transition hover:brightness-105"
          >
            <span>Finish Review &amp; Hear Sprite Outro</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  const current = phrases[index] || trickyWords[0]?.word || "";
  const totalPhrases = Math.max(1, phrases.length);
  const isLast = index >= totalPhrases - 1;
  const progressPct = Math.round(((index + 1) / totalPhrases) * 100);
  const phraseWords = current.trim().split(/\s+/);

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

  const hasLab = trickyWords.length > 0;

  return (
    <div
      className={
        hasLab
          ? "grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12 animate-in fade-in"
          : "mx-auto max-w-3xl animate-in fade-in"
      }
    >
      {/* LEFT (4 Cols): WORD SOUND LAB */}
      {hasLab && (
        <div className="flex flex-col justify-between rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md lg:col-span-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase">
                Word Sound Lab
              </span>
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-black text-slate-500 uppercase">
                {trickyWords.length} Words
              </span>
            </div>
            <h3 className="mt-1 text-base font-black text-slate-900">
              Tap any word from your call
            </h3>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              Hear individual words pronounced slowly before speaking the full
              phrase.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {trickyWords.map((item, idx) => {
                const g = getAlphaGrade(item.score);
                const key = `lab-${idx}-${item.word}`;
                const isActive = activeWordKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => void handleSpeakWord(item.word, key)}
                    className={`inline-flex items-center gap-1.5 rounded-2xl border-2 border-b-[3px] px-3 py-1.5 text-xs sm:text-sm font-black transition-all active:translate-y-0.5 ${
                      isActive
                        ? "border-blue-700 bg-blue-600 text-white shadow-sm"
                        : "border-slate-200 border-b-slate-300 bg-slate-50 text-slate-900 hover:border-sky-400 hover:bg-sky-50"
                    }`}
                  >
                    <Volume2
                      className={`h-3.5 w-3.5 ${
                        isActive ? "text-white" : "text-blue-600"
                      }`}
                    />
                    <span>{item.word}</span>
                    <span
                      className={`rounded-md border px-1.5 py-0.5 text-[10px] font-black ${
                        isActive
                          ? "border-white/30 bg-white/20 text-white"
                          : g.pill
                      }`}
                    >
                      {g.letter}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50/70 p-3 text-[11px] font-semibold leading-relaxed text-sky-900">
            💡 <strong className="font-black">Tip:</strong> Tap individual words
            inside the dark stage on the right too!
          </div>
        </div>
      )}

      {/* RIGHT (8 Cols): SPEAK IT BACK */}
      <div
        className={`flex flex-col justify-between space-y-4 rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-5 text-center shadow-sm transition-all duration-200 hover:shadow-md sm:p-6 ${
          hasLab ? "lg:col-span-8" : ""
        }`}
      >
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-black tracking-wider text-blue-700 uppercase">
              Speak It Back
            </span>
            <span className="text-xs font-black text-slate-400">
              Phrase {index + 1} of {totalPhrases}
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Target Phrase Stage Card */}
        <div className="rounded-2xl border-2 border-indigo-950 bg-gradient-to-b from-slate-900 to-indigo-950 px-5 py-5 text-white shadow-inner">
          <span className="block text-[10px] font-black tracking-widest text-sky-300 uppercase">
            Tap any word to hear it, then record the full phrase
          </span>

          {score?.words?.length ? (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {score.words.map((w: any, idx: number) => {
                const acc = w.accuracyScore ?? 0;
                const pill =
                  acc >= 80
                    ? "bg-emerald-500/25 text-emerald-300 border-emerald-400/50"
                    : acc >= 60
                      ? "bg-amber-500/25 text-amber-200 border-amber-400/50"
                      : "bg-rose-500/25 text-rose-200 border-rose-400/50";
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      void handleSpeakWord(w.word, `scored-${idx}`)
                    }
                    title={`Grade: ${getAlphaGrade(acc).letter} (Tap to hear)`}
                    className={`rounded-xl border px-3 py-1 text-lg font-black transition hover:scale-105 sm:text-xl ${pill}`}
                  >
                    {w.word}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {phraseWords.map((word, wIdx) => {
                const key = `prompt-${wIdx}`;
                const isActive = activeWordKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => void handleSpeakWord(word, key)}
                    className={`rounded-xl border px-3 py-1 text-lg font-black transition sm:text-xl ${
                      isActive
                        ? "border-sky-300 bg-sky-500 text-white"
                        : "border-white/15 bg-white/10 text-white hover:border-sky-300 hover:bg-white/20"
                    }`}
                  >
                    {word}
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            disabled={isPlaying}
            onClick={() => void speak(current, targetLanguage, 0.9)}
            className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-extrabold text-sky-200 transition hover:bg-white/20 disabled:opacity-50"
          >
            <Volume2 className="h-3.5 w-3.5" />
            <span>{isPlaying ? "Playing..." : "Hear Full Phrase"}</span>
          </button>
        </div>

        {/* Bottom Control Row */}
        {!score ? (
          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                if (index > 0) {
                  setIndex((i) => i - 1);
                  reset();
                } else {
                  onBack?.();
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-2xl border-2 border-b-[3px] border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-600 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{index > 0 ? "Previous" : "Back"}</span>
            </button>

            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={handlePractice}
                disabled={isRecording}
                className={`flex h-16 w-16 items-center justify-center rounded-3xl border-b-[5px] text-white shadow-lg transition-all ${
                  isRecording
                    ? "scale-110 animate-pulse border-rose-800 bg-gradient-to-b from-rose-500 to-red-600 ring-4 ring-rose-200"
                    : "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-2"
                }`}
              >
                <Mic className="h-7 w-7" />
              </button>
              <span className="text-[11px] font-extrabold text-slate-500">
                {isRecording
                  ? "Listening... Speak clearly!"
                  : "Tap mic to record"}
              </span>
            </div>

            <button
              type="button"
              onClick={handleContinue}
              className="inline-flex items-center gap-1 rounded-2xl border-2 border-b-[3px] border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-black text-slate-500 transition hover:bg-white hover:text-slate-800"
            >
              <span>Skip</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-3 sm:flex-row animate-in fade-in duration-200">
            {(() => {
              const g = getAlphaGrade(score.pronunciationScore);
              const accG = getAlphaGrade(score.accuracyScore);
              const flowG = getAlphaGrade(score.fluencyScore);
              return (
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-b-4 text-xl font-black ${g.pill}`}
                  >
                    {g.letter}
                  </div>
                  <div className="text-left">
                    <p className="flex items-center gap-1 text-sm font-black text-slate-900">
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
                    <p className="text-[11px] font-bold text-slate-500">
                      Accuracy: <strong>{accG.letter}</strong> • Fluency:{" "}
                      <strong>{flowG.letter}</strong>
                    </p>
                  </div>
                </div>
              );
            })()}

            <div className="flex w-full gap-2.5 sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  if (index > 0) {
                    setIndex((i) => i - 1);
                    reset();
                  } else {
                    onBack?.();
                  }
                }}
                className="inline-flex items-center justify-center gap-1 rounded-2xl border-2 border-b-4 border-slate-200 bg-white px-3.5 py-3 text-xs font-black text-slate-600 transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handlePractice}
                disabled={isRecording}
                className="inline-flex items-center justify-center gap-1.5 rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-slate-50 px-4 py-3 text-xs font-black text-slate-700 transition hover:bg-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Retry</span>
              </button>

              <button
                onClick={handleContinue}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 px-6 py-3 text-xs sm:text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0 sm:flex-none"
              >
                {isLast ? (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Finish &amp; Hear Sprite Outro</span>
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

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}