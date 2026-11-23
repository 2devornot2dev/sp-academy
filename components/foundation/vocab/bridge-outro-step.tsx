"use client";

import React from "react";
import {
  CheckCircle2,
  PartyPopper,
  ArrowRight,
  Sparkles,
  Volume2,
  Zap,
  Swords,
} from "lucide-react";
import { useSpeakWord } from "@/components/foundation/word-tap";
import { playSfx } from "@/lib/sfx";

export function BridgeOutroStep({
  data,
  onFinish,
}: {
  data: any;
  onFinish: () => void;
}) {
  const speak = useSpeakWord();

  const meta = data.meta || {};
  const handoff = data.handoffFragment || {};
  const vocabMoment = (data.vocabMoment as Array<{ word: string; gloss?: string }>) || [];
  const lexicon: string[] =
    handoff.bridgeLexicon && handoff.bridgeLexicon.length > 0
      ? handoff.bridgeLexicon
      : vocabMoment.map((v) => v.word).filter(Boolean);

  const firstName =
    meta.firstName || data.user?.firstName || "there";
  const bridgeIndex =
    meta.bridgeIndex || data.bridgeIndex || data.lesson?.orderIndex || 1;
  const isBossNext = bridgeIndex % 3 === 0;
  const nextUnlockLabel = isBossNext
    ? `Milestone ${bridgeIndex / 3} Boss Arena`
    : `Spoon ${bridgeIndex + 1}`;

  return (
    <div className="flex h-full flex-col justify-between overflow-y-auto p-4 sm:p-8 md:p-10 animate-in fade-in duration-500">
      {/* 1. Top Celebration Header */}
      <div className="my-auto flex flex-col items-center text-center">
        <div className="mb-4 sm:mb-5 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl sm:rounded-3xl border-b-[5px] sm:border-b-[6px] border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950 shadow-xl shadow-amber-500/25">
          <PartyPopper className="size-8 sm:size-9" strokeWidth={2.5} />
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11px] sm:text-xs font-black tracking-wider text-emerald-800 uppercase">
          <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
          Vocab Bridge {bridgeIndex} Complete
        </span>

        <h2 className="mt-2.5 sm:mt-3 text-2xl sm:text-4xl font-black tracking-tight text-slate-900">
          Awesome work, {firstName}! 🎉
        </h2>

        <p className="mt-1.5 sm:mt-2 max-w-md text-xs sm:text-base font-medium text-slate-500">
          You&apos;ve locked in the vocabulary from Spoon {bridgeIndex} and
          unlocked{" "}
          <span className="font-extrabold text-slate-800">
            {nextUnlockLabel}
          </span>
          !
        </p>

        {/* 2. Banked Vocabulary Showcase */}
        {lexicon.length > 0 && (
          <div className="mt-5 sm:mt-8 w-full max-w-2xl rounded-2xl sm:rounded-3xl border-2 border-slate-200/80 bg-slate-50/70 p-4 sm:p-7">
            <div className="mb-3 sm:mb-4 flex items-center justify-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-black tracking-wider text-blue-700 uppercase">
              <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />
              <span>Added to Your Word Matrix • Tap to Listen</span>
            </div>

            <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5">
              {lexicon.map((word: string, idx: number) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    playSfx("tap");
                    speak(word);
                  }}
                  className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-white px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-base font-black text-slate-800 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-sky-400 hover:bg-sky-50/40 active:translate-y-0.5 active:border-b-2"
                >
                  <Volume2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                  <span>{word}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 3. Next Unlock Preview Pill */}
        <div
          className={`mt-4 sm:mt-6 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-[11px] sm:text-xs font-black ring-1 ${
            isBossNext
              ? "bg-purple-50 text-purple-800 ring-purple-200"
              : "bg-sky-50 text-blue-800 ring-sky-200"
          }`}
        >
          {isBossNext ? (
            <Swords className="h-4 w-4 text-purple-600" />
          ) : (
            <Zap className="h-4 w-4 fill-amber-400 text-amber-500" />
          )}
          <span>Unlocked Next: {nextUnlockLabel}</span>
        </div>
      </div>

      {/* 4. Footer 3D Emerald CTA */}
      <div className="mt-5 sm:mt-8 flex justify-center border-t border-slate-100 pt-4 sm:pt-6">
        <button
          type="button"
          onClick={() => {
            playSfx("victory");
            onFinish();
          }}
          className="inline-flex w-full sm:w-80 items-center justify-center gap-2.5 rounded-2xl border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 px-6 py-3.5 sm:px-8 sm:py-4 text-sm sm:text-lg font-black text-white shadow-lg shadow-emerald-500/25 transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0"
        >
          <span>Continue to Learning Hub</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}