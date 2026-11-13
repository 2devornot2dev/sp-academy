// components/freestyle/review/freestyle-pronunciation-review.tsx
"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Flame,
  Mic,
  RotateCcw,
  Sparkles,
  Target,
  Volume2,
} from "lucide-react";
import { usePronunciation } from "@/context/pronunciation-context";
import { useSpeak } from "@/hooks/use-speak";
import { useWordAudio } from "@/context/word-audio-context";
import { getAlphaGrade, type TrickyWordItem } from "@/lib/freestyle/grades";
import type { RepairCardItem } from "./freestyle-grammar-review";

interface Props {
  phrases: string[];
  repairCards?: RepairCardItem[];
  trickyWords?: TrickyWordItem[];
  targetLanguage: string;
  onBack?: () => void;
  onComplete: () => void;
}

export function FreestylePronunciationReview({
  phrases,
  repairCards = [],
  targetLanguage,
  onBack,
  onComplete,
}: Props) {
  const { isRecording, score, error, assessSpeech, reset } =
    usePronunciation();
  const { speak, isPlaying } = useSpeak();
  const { playWord } = useWordAudio();

  const [index, setIndex] = useState(0);
  const [completedScores, setCompletedScores] = useState<
    Record<number, number>
  >({});
  const [activeWordKey, setActiveWordKey] = useState<string | null>(null);

  const handleSpeakWord = async (rawWord: string, key: string) => {
    const clean = rawWord.replace(/^[^\p{L}\p{N}'’-]+|[^\p{L}\p{N}'’-]+$/gu, "");
    if (!clean) return;
    setActiveWordKey(key);
    try {
      await playWord(clean);
    } catch {
      await speak(clean, targetLanguage, 0.85);
    } finally {
      setActiveWordKey((cur) => (cur === key ? null : cur));
    }
  };

  if (!phrases.length) {
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

  const current = phrases[index] || phrases[0];
  const totalPhrases = phrases.length;
  const isLast = index >= totalPhrases - 1;
  const phraseWords = current.trim().split(/\s+/);

  const matchedCard = repairCards.find(
    (c) => c.improved.trim().toLowerCase() === current.trim().toLowerCase(),
  );

  const selectPhrase = (newIdx: number) => {
    if (score?.pronunciationScore) {
      setCompletedScores((prev) => ({
        ...prev,
        [index]: score.pronunciationScore,
      }));
    }
    reset();
    setActiveWordKey(null);
    setIndex(newIdx);
  };

  const handlePractice = async () => {
    reset();
    await assessSpeech(current, targetLanguage);
  };

  const handleContinue = () => {
    if (score?.pronunciationScore) {
      setCompletedScores((prev) => ({
        ...prev,
        [index]: score.pronunciationScore,
      }));
    }
    if (isLast) {
      onComplete();
    } else {
      setIndex((i) => i + 1);
      reset();
    }
  };

  return (
    <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12 animate-in fade-in">
      {/* =====================================================================
          LEFT (5 Cols): SPEAKING DRILL QUEUE (Shows all 3 phrases & grades!)
          ===================================================================== */}
      <div className="flex flex-col justify-between rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-5 shadow-sm lg:col-span-5">
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div>
              <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase">
                Speaking Drill Queue
              </span>
              <h3 className="text-base font-black text-slate-900">
                Practice Your Upgraded Phrases ({index + 1}/{totalPhrases})
              </h3>
            </div>
          </div>

          <div className="mt-3.5 space-y-2.5">
            {phrases.map((p, i) => {
              const isSelected = i === index;
              const savedScore =
                i === index && score?.pronunciationScore
                  ? score.pronunciationScore
                  : completedScores[i];
              const g =
                savedScore !== undefined ? getAlphaGrade(savedScore) : null;
              const sourceCard = repairCards.find(
                (c) =>
                  c.improved.trim().toLowerCase() === p.trim().toLowerCase(),
              );

              return (
                <button
                  key={`${p}-${i}`}
                  type="button"
                  onClick={() => selectPhrase(i)}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-b-4 px-4 py-3.5 text-left transition-all ${
                    isSelected
                      ? "border-blue-600 border-b-blue-800 bg-sky-50/80 shadow-2xs"
                      : "border-slate-200 border-b-slate-300 bg-white hover:border-sky-300 hover:bg-slate-50/70"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    {sourceCard && (
                      <span className="block truncate text-[11px] font-bold text-slate-400 line-through">
                        {sourceCard.original}
                      </span>
                    )}
                    <p className="truncate text-sm font-black text-slate-900">
                      {p}
                    </p>
                  </div>

                  {g ? (
                    <span
                      className={`inline-flex min-w-[40px] items-center justify-center rounded-xl border border-b-2 px-2.5 py-1 text-xs font-black ${g.pill}`}
                    >
                      {g.letter}
                    </span>
                  ) : (
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {i + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Fix Deck</span>
            </button>
          ) : (
            <span />
          )}
          <span className="text-[11px] font-bold text-slate-400">
            Tap any word on the right to hear it
          </span>
        </div>
      </div>

      {/* =====================================================================
          RIGHT (7 Cols): SPEAKING STAGE WITH UNIFIED 3D WORD BUTTONS
          ===================================================================== */}
      <div className="flex flex-col justify-between space-y-5 rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-6 text-center shadow-sm sm:p-7 lg:col-span-7">
        <div className="flex items-center justify-between">
          <span className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-black tracking-wider text-blue-700 uppercase">
            Speak It Back • Phrase {index + 1} of {totalPhrases}
          </span>
          <button
            type="button"
            disabled={isPlaying}
            onClick={() => void speak(current, targetLanguage, 0.9)}
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-b-[3px] border-sky-200 border-b-sky-300 bg-sky-50 px-3.5 py-1.5 text-xs font-black text-blue-600 transition hover:bg-sky-100 disabled:opacity-50"
          >
            <Volume2 className="h-3.5 w-3.5" />
            <span>{isPlaying ? "Playing..." : "Hear Full Phrase"}</span>
          </button>
        </div>

        {/* Context Strip if from a mistake/upgrade */}
        {matchedCard && (
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-2.5 text-left text-xs">
            <span className="font-bold text-slate-400">Instead of: </span>
            <span className="font-bold text-rose-500 line-through">
              &ldquo;{matchedCard.original}&rdquo;
            </span>
          </div>
        )}

        {/* Unified 3D Tactile Word Buttons Stage */}
        <div className="rounded-3xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-gradient-to-br from-slate-50 via-white to-sky-50/40 px-6 py-7">
          <span className="block text-[10px] font-black tracking-widest text-slate-400 uppercase">
            Tap any word to hear its MP3, then record the full phrase
          </span>

          {score?.words?.length ? (
            <div className="mt-4 flex flex-wrap justify-center gap-2.5">
              {score.words.map((w: any, idx: number) => {
                const acc = w.accuracyScore ?? 0;
                const key = `scored-${idx}`;
                const isActive = activeWordKey === key;
                const tileStyle = isActive
                  ? "border-blue-700 border-b-blue-900 bg-gradient-to-b from-sky-400 to-blue-600 text-white"
                  : acc >= 80
                    ? "border-emerald-300 border-b-emerald-500 bg-emerald-50 text-emerald-950 hover:bg-emerald-100"
                    : acc >= 60
                      ? "border-amber-300 border-b-amber-500 bg-amber-50 text-amber-950 hover:bg-amber-100"
                      : "border-rose-300 border-b-rose-500 bg-rose-50 text-rose-950 hover:bg-rose-100";

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => void handleSpeakWord(w.word, key)}
                    title={`Grade: ${getAlphaGrade(acc).letter} — Tap to hear word`}
                    className={`inline-flex items-center gap-1.5 rounded-2xl border-2 border-b-4 px-4 py-2 text-lg font-black shadow-2xs transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-2 sm:text-xl ${tileStyle}`}
                  >
                    <Volume2 className="h-4 w-4 opacity-70" />
                    <span>{w.word}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap justify-center gap-2.5">
              {phraseWords.map((word, wIdx) => {
                const key = `prompt-${wIdx}`;
                const isActive = activeWordKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => void handleSpeakWord(word, key)}
                    title="Tap to hear word audio"
                    className={`inline-flex items-center gap-1.5 rounded-2xl border-2 border-b-4 px-4 py-2 text-lg font-black shadow-2xs transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-2 sm:text-xl ${
                      isActive
                        ? "border-blue-700 border-b-blue-900 bg-gradient-to-b from-sky-400 to-blue-600 text-white"
                        : "border-slate-200 border-b-slate-300 bg-white text-slate-900 hover:border-sky-400 hover:bg-sky-50"
                    }`}
                  >
                    <Volume2
                      className={`h-4 w-4 ${
                        isActive ? "text-white" : "text-blue-600"
                      }`}
                    />
                    <span>{word}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Recorder / Score Row */}
        {!score ? (
          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                if (index > 0) {
                  selectPhrase(index - 1);
                } else {
                  onBack?.();
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-white px-4 py-3 text-xs font-black text-slate-600 transition hover:bg-slate-50"
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
              className="inline-flex items-center gap-1 rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-slate-50 px-4 py-3 text-xs font-black text-slate-500 transition hover:bg-white hover:text-slate-800"
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