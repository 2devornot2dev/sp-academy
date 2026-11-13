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
import { getAlphaGrade, type TrickyWordItem } from "@/lib/freestyle/grades";

interface Props {
  phrases: string[];
  trickyWords?: TrickyWordItem[];
  targetLanguage: string;
  onComplete: () => void;
}

export function FreestylePronunciationReview({
  phrases,
  trickyWords = [],
  targetLanguage,
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
      <div className="space-y-4 rounded-3xl border-2 border-b-[6px] border-slate-200 bg-white p-8 text-center shadow-sm animate-in fade-in">
        <p className="text-sm font-bold text-slate-600">
          Your pronunciation was super crisp — ready to claim your completion!
        </p>
        <button
          onClick={onComplete}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 px-8 py-4 text-sm font-black text-white shadow-lg transition hover:brightness-105"
        >
          <span>Finish Review &amp; Hear Sprite Outro</span>
          <ArrowRight className="h-4 w-4" />
        </button>
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

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* =====================================================================
          PART A: WORD AUDIO LAB (Real words from their call — tap to hear!)
          ===================================================================== */}
      {trickyWords.length > 0 && (
        <div className="rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase">
                Word Sound Lab • From Your Call
              </span>
              <h3 className="text-base font-black text-slate-900">
                Tap any word to hear its native pronunciation
              </h3>
            </div>
            <span className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-500 uppercase">
              {trickyWords.length} Words Tracked
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2.5">
            {trickyWords.map((item, idx) => {
              const g = getAlphaGrade(item.score);
              const key = `lab-${idx}-${item.word}`;
              const isActive = activeWordKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => void handleSpeakWord(item.word, key)}
                  className={`inline-flex items-center gap-2 rounded-2xl border-2 border-b-4 px-3.5 py-2 text-sm font-black transition-all active:translate-y-0.5 ${
                    isActive
                      ? "border-blue-700 bg-blue-600 text-white shadow-md"
                      : "border-slate-200 border-b-slate-300 bg-slate-50 text-slate-900 hover:border-sky-400 hover:bg-sky-50"
                  }`}
                >
                  <Volume2
                    className={`h-4 w-4 ${
                      isActive ? "text-white" : "text-blue-600"
                    }`}
                  />
                  <span>{item.word}</span>
                  <span
                    className={`rounded-lg border px-1.5 py-0.5 text-[10px] font-black ${
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
      )}

      {/* =====================================================================
          PART B: SPEAK IT BACK (Full Phrase + Tappable Words + Azure Mic)
          ===================================================================== */}
      <div className="space-y-6 rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-6 text-center shadow-sm sm:p-8">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-black tracking-wider text-blue-700 uppercase">
              Speak It Back
            </span>
            <span className="text-xs font-black text-slate-400">
              Phrase {index + 1} of {totalPhrases}
            </span>
          </div>

          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Target Phrase Stage Card (Every word is clickable!) */}
        <div className="rounded-3xl border-2 border-indigo-950 bg-gradient-to-b from-slate-900 to-indigo-950 px-6 py-7 text-white shadow-inner">
          <span className="block text-[10px] font-black tracking-widest text-sky-300 uppercase">
            Tap any word to hear it, then record the full phrase
          </span>

          {score?.words?.length ? (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
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
                    className={`rounded-xl border px-3 py-1 text-xl font-black transition hover:scale-105 sm:text-2xl ${pill}`}
                  >
                    {w.word}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {phraseWords.map((word, wIdx) => {
                const key = `prompt-${wIdx}`;
                const isActive = activeWordKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => void handleSpeakWord(word, key)}
                    className={`rounded-xl border px-3 py-1 text-xl font-black transition sm:text-2xl ${
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
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-extrabold text-sky-200 transition hover:bg-white/20 disabled:opacity-50"
          >
            <Volume2 className="h-4 w-4" />
            <span>{isPlaying ? "Playing..." : "Hear Full Phrase"}</span>
          </button>
        </div>

        {/* 3D Mic Recorder */}
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

        {/* Score Result + Next / Finish */}
        {score && (
          <div className="space-y-4 border-t border-slate-100 pt-4 animate-in fade-in zoom-in-95 duration-300">
            {(() => {
              const g = getAlphaGrade(score.pronunciationScore);
              const accG = getAlphaGrade(score.accuracyScore);
              const flowG = getAlphaGrade(score.fluencyScore);
              return (
                <div className="flex items-center justify-center gap-4">
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-b-4 text-2xl font-black ${g.pill}`}
                  >
                    {g.letter}
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
                      Accuracy: <strong>{accG.letter}</strong> • Fluency:{" "}
                      <strong>{flowG.letter}</strong>
                    </p>
                  </div>
                </div>
              );
            })()}

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
      </div>
    </div>
  );
}