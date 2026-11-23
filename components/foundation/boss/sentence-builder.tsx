"use client";

import { useEffect, useState } from "react";
import { playSfx } from "@/lib/sfx";

interface SentenceBuilderProps {
  words: string[];
  expectedCount?: number;
  onSubmit: (answer: string[]) => void;
  playWord?: (phrase: string, gender?: "m" | "f") => Promise<void>;
  stopWordAudio?: () => void;
}

export function SentenceBuilder({
  words,
  expectedCount,
  onSubmit,
  playWord,
  stopWordAudio,
}: SentenceBuilderProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [available, setAvailable] = useState<string[]>(words);

  useEffect(() => {
    setSelected([]);
    setAvailable(words);
  }, [words]);

  const selectWord = (word: string, index: number) => {
    stopWordAudio?.();
    playWord?.(word, "m");

    setSelected((previous) => [...previous, word]);
    setAvailable((previous) =>
      previous.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const removeWord = (word: string, index: number) => {
    playSfx("tap");
    setAvailable((previous) => [...previous, word]);
    setSelected((previous) =>
      previous.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const requiredLength = expectedCount ?? words.length;
  const canSubmit = selected.length >= requiredLength;

  return (
    <div className="flex flex-col gap-3.5 sm:gap-5">
      <div className="flex min-h-[56px] sm:min-h-[70px] flex-wrap items-center gap-1.5 sm:gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-3 sm:p-4">
        {selected.length === 0 && (
          <span className="ml-1 text-xs sm:text-sm font-medium text-slate-400">
            Tap words below...
          </span>
        )}

        {selected.map((word, index) => (
          <button
            key={`${word}-${index}`}
            type="button"
            onClick={() => removeWord(word, index)}
            className="rounded-xl bg-indigo-600 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-extrabold text-white shadow-sm transition-transform active:scale-95"
          >
            {word}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
        {available.map((word, index) => (
          <button
            key={`${word}-${index}`}
            type="button"
            onClick={() => selectWord(word, index)}
            className="rounded-xl border-2 border-b-4 border-slate-200 bg-white px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-extrabold text-slate-700 transition-all hover:border-indigo-300 hover:bg-indigo-50 active:translate-y-1 active:border-b-2"
          >
            {word}
          </button>
        ))}
      </div>

      {canSubmit && (
        <button
          type="button"
          onClick={() => {
            playSfx("tap");
            onSubmit(selected);
          }}
          className="mt-1 w-full animate-in rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 py-3 sm:py-4 text-sm sm:text-base font-extrabold text-white transition-all slide-in-from-bottom-2 hover:bg-emerald-400 active:translate-y-1 active:border-b-0"
        >
          Check Answer
        </button>
      )}
    </div>
  );
}