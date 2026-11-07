// components/matrix/matrix-studio-tab.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Eye,
  Ear,
  MousePointerClick,
  Mic,
  Volume2,
  Turtle,
  Trophy,
  Play,
  HelpCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Flame,
  Square,
  Loader2,
  Check,
} from "lucide-react";
import { EnrichedWordStat, SessionScore, WordStat } from "./matrix-types";
import { VoiceMicButton } from "@/components/ui/misc/voice-mic-button";

interface MatrixStudioTabProps {
  enrichedWords: EnrichedWordStat[];
  activeMicWordId: string | null;
  status: string;
  activeTtsKey: string | null;
  isTtsPlaying: boolean;
  isTtsLoading: boolean;
  sessionScores: Record<string, SessionScore>;
  onListen: (wordStat: WordStat, speed?: number) => void;
  onPronunciationTest: (wordStat: WordStat) => void;
  onTapQuizResult: (wordStat: WordStat, isCorrect: boolean) => void;
  onStartDojo: (customQueue: EnrichedWordStat[]) => void;
}

export function MatrixStudioTab({
  enrichedWords,
  activeMicWordId,
  status,
  activeTtsKey,
  isTtsPlaying,
  isTtsLoading,
  sessionScores,
  onListen,
  onPronunciationTest,
  onTapQuizResult,
  onStartDojo,
}: MatrixStudioTabProps) {
  // ============================================================================
  // 1. TOP 3 PODIUM LISTS (1st Champion + 2nd & 3rd Runner-Ups)
  // ============================================================================
  const { mostSeenTop3, mostHeardTop3, mostTappedTop3, mostSpokenTop3 } =
    useMemo(() => {
      const usedChampions = new Set<string>();

      const pickTop3 = (
        list: EnrichedWordStat[],
        sortFn: (a: EnrichedWordStat, b: EnrichedWordStat) => number,
      ) => {
        const sorted = [...list].sort(sortFn);
        if (sorted.length === 0) return [];
        const champIdx = sorted.findIndex((w) => !usedChampions.has(w.id));
        const champ = sorted[champIdx !== -1 ? champIdx : 0];
        usedChampions.add(champ.id);
        const others = sorted.filter((w) => w.id !== champ.id).slice(0, 2);
        return [champ, ...others];
      };

      const seen = pickTop3(
        enrichedWords.filter((w) => w.seenCount > 0),
        (a, b) => b.seenCount - a.seenCount,
      );

      const heard = pickTop3(
        enrichedWords.filter((w) => w.heardCount > 0),
        (a, b) => b.heardCount - a.heardCount,
      );

      const tapped = pickTop3(
        enrichedWords.filter((w) => w.tappedCorrect + w.tappedWrong > 0),
        (a, b) => b.tappedCorrect - a.tappedCorrect,
      );

      const spoken = pickTop3(
        enrichedWords.filter((w) => w.spokenAttempts > 0),
        (a, b) =>
          (b.avgSpokenScore ?? 0) !== (a.avgSpokenScore ?? 0)
            ? (b.avgSpokenScore ?? 0) - (a.avgSpokenScore ?? 0)
            : b.spokenAttempts - a.spokenAttempts,
      );

      return {
        mostSeenTop3: seen,
        mostHeardTop3: heard,
        mostTappedTop3: tapped,
        mostSpokenTop3: spoken,
      };
    }, [enrichedWords]);

  // ============================================================================
  // 2. ACTION DECK: "0 SPOKEN / LOW LISTEN" GAPS
  // ============================================================================
  const zeroSpokenHighSeen = useMemo(
    () =>
      [...enrichedWords]
        .filter(
          (w) =>
            w.spokenAttempts === 0 && (w.seenCount > 0 || w.tappedCorrect > 0),
        )
        .sort(
          (a, b) =>
            b.seenCount +
            b.tappedCorrect * 2 -
            (a.seenCount + a.tappedCorrect * 2),
        )
        .slice(0, 6),
    [enrichedWords],
  );

  const lowListenWords = useMemo(
    () =>
      [...enrichedWords]
        .filter((w) => w.heardCount <= 1)
        .sort(
          (a, b) => a.heardCount - b.heardCount || b.seenCount - a.seenCount,
        )
        .slice(0, 6),
    [enrichedWords],
  );

  const [gapTab, setGapTab] = useState<"ZERO_SPOKEN" | "LOW_LISTEN">(
    "ZERO_SPOKEN",
  );
  const activeGapList =
    gapTab === "ZERO_SPOKEN" ? zeroSpokenHighSeen : lowListenWords;

  // ============================================================================
  // 3. MINI AUDIO QUIZ ("EAR & TAP BOOSTER")
  // ============================================================================
  const [quizTarget, setQuizTarget] = useState<EnrichedWordStat | null>(null);
  const [quizOptions, setQuizOptions] = useState<EnrichedWordStat[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [quizStreak, setQuizStreak] = useState(0);

  const generateNextQuizRound = useCallback(
    (autoPlay = false) => {
      if (enrichedWords.length < 3) return;

      const pool = [...enrichedWords].sort(
        (a, b) =>
          a.heardCount + a.tappedCorrect - (b.heardCount + b.tappedCorrect),
      );
      const candidatePool = pool.slice(
        0,
        Math.max(6, Math.floor(pool.length * 0.4)),
      );
      const target =
        candidatePool[Math.floor(Math.random() * candidatePool.length)] ||
        enrichedWords[0];

      const distractors = enrichedWords
        .filter((w) => w.id !== target.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 2);

      const choices = [target, ...distractors].sort(() => Math.random() - 0.5);

      setQuizTarget(target);
      setQuizOptions(choices);
      setSelectedOptionId(null);

      if (autoPlay) {
        onListen(target, 0.9);
      }
    },
    [enrichedWords, onListen],
  );

  useEffect(() => {
    if (!quizTarget && enrichedWords.length >= 3) {
      generateNextQuizRound(false);
    }
  }, [enrichedWords.length, generateNextQuizRound, quizTarget]);

  const handleQuizSelect = (option: EnrichedWordStat) => {
    if (!quizTarget || selectedOptionId) return;
    setSelectedOptionId(option.id);

    const isCorrect = option.id === quizTarget.id;
    onTapQuizResult(quizTarget, isCorrect);

    if (isCorrect) {
      setQuizStreak((s) => s + 1);
    } else {
      setQuizStreak(0);
    }
  };

  // ============================================================================
  // HELPER TO RENDER EACH OF THE 4 3D PODIUM CARDS
  // ============================================================================
  const renderPodiumCard = (config: {
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    items: EnrichedWordStat[];
    headerGradient: string;
    badgeColor: string;
    micBtn3D: string;
    formatMetric: (w: EnrichedWordStat) => string;
  }) => {
    const champion = config.items[0];
    const runnersUp = config.items.slice(1, 3);

    return (
      <div className="flex flex-col justify-between overflow-hidden rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white shadow-sm transition-transform hover:-translate-y-0.5">
        {/* Top Colored 3D Banner */}
        <div
          className={`border-b-4 border-black/15 px-5 py-4 text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.3)] ${config.headerGradient}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black tracking-wider text-white/80 uppercase">
                {config.subtitle}
              </span>
              <h3 className="text-lg font-black tracking-tight drop-shadow-2xs">
                {config.title}
              </h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border-b-2 border-white/30 bg-white/20 shadow-inner backdrop-blur-xs">
              {config.icon}
            </div>
          </div>
        </div>

        {/* Body: #1 Champion + #2 & #3 Runner-Ups */}
        <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
          {!champion ? (
            <div className="flex h-40 flex-col items-center justify-center text-center text-xs font-bold text-slate-400">
              No stats recorded yet. Practice to crown a #1 word!
            </div>
          ) : (
            <>
              {/* #1 Champion 3D Box */}
              <div className="rounded-2xl border-2 border-b-4 border-slate-200/90 border-b-slate-300 bg-slate-50/70 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-lg border-b-2 border-orange-600/40 bg-amber-100 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-amber-900 uppercase">
                    <Trophy className="h-3 w-3 text-amber-600" /> #1 Champion
                  </span>
                  <span
                    className={`rounded-lg px-2.5 py-0.5 text-[11px] font-black ${config.badgeColor}`}
                  >
                    {config.formatMetric(champion)}
                  </span>
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xl font-black text-slate-900">
                      {champion.cleanWord}
                    </p>
                    <p className="truncate text-xs font-bold text-slate-400">
                      {champion.translation || champion.categoryLabel}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onListen(champion, 0.9)}
                      disabled={status !== "idle"}
                      title="Listen"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-b-[3px] border-slate-200 border-b-slate-300 bg-white text-indigo-600 transition-all hover:border-sky-300 hover:bg-sky-50 active:translate-y-0.5 active:border-b-0"
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                    <VoiceMicButton
                      size="icon"
                      isListening={
                        activeMicWordId === champion.id &&
                        status === "listening"
                      }
                      isAnalyzing={
                        activeMicWordId === champion.id &&
                        status === "analyzing"
                      }
                      onClick={() => onPronunciationTest(champion)}
                    />
                  </div>
                </div>
              </div>

              {/* #2 and #3 3D Runner-Ups */}
              <div className="mt-3 space-y-2">
                {runnersUp.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-xl border-2 border-b-[3px] border-slate-200/80 border-b-slate-300/80 bg-white px-3 py-2 text-xs transition hover:border-sky-300"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-black text-slate-600">
                        #{idx + 2}
                      </span>
                      <span className="truncate font-black text-slate-800">
                        {item.cleanWord}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-bold text-slate-400">
                        {config.formatMetric(item)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onListen(item, 0.9)}
                        disabled={status !== "idle"}
                        className="rounded-lg bg-slate-100 p-1 text-slate-500 transition hover:bg-sky-100 hover:text-blue-600"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* ====================================================================
          ROW 1: THE 4 3D HALL OF FAME PODIUM CARDS
      ==================================================================== */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {renderPodiumCard({
          title: "Most Seen",
          subtitle: "Visual Exposure",
          icon: <Eye className="h-5 w-5 text-white" />,
          items: mostSeenTop3,
          headerGradient: "bg-gradient-to-b from-sky-400 to-blue-600",
          badgeColor: "bg-sky-100 text-blue-800",
          micBtn3D:
            "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 hover:brightness-105",
          formatMetric: (w) => `${w.seenCount}x seen`,
        })}

        {renderPodiumCard({
          title: "Most Heard",
          subtitle: "Ear Training",
          icon: <Ear className="h-5 w-5 text-white" />,
          items: mostHeardTop3,
          headerGradient: "bg-gradient-to-b from-indigo-500 to-purple-700",
          badgeColor: "bg-purple-100 text-purple-800",
          micBtn3D:
            "border-purple-950 bg-gradient-to-b from-violet-500 to-purple-700 hover:brightness-105",
          formatMetric: (w) => `${w.heardCount}x heard`,
        })}

        {renderPodiumCard({
          title: "Most Tapped",
          subtitle: "Exercise Accuracy",
          icon: <MousePointerClick className="h-5 w-5 text-slate-950" />,
          items: mostTappedTop3,
          headerGradient:
            "bg-gradient-to-b from-amber-400 to-orange-500 text-slate-950!",
          badgeColor: "bg-amber-100 text-amber-900",
          micBtn3D:
            "border-orange-700 bg-gradient-to-b from-amber-400 to-orange-500 text-slate-950! hover:brightness-105",
          formatMetric: (w) =>
            `${w.tappedCorrect}/${w.tappedCorrect + w.tappedWrong} taps`,
        })}

        {renderPodiumCard({
          title: "Most Spoken",
          subtitle: "Voice Mastery",
          icon: <Mic className="h-5 w-5 text-white" />,
          items: mostSpokenTop3,
          headerGradient: "bg-gradient-to-b from-emerald-400 to-teal-600",
          badgeColor: "bg-emerald-100 text-emerald-800",
          micBtn3D:
            "border-emerald-800 bg-gradient-to-b from-emerald-400 to-teal-600 hover:brightness-105",
          formatMetric: (w) => {
            const sc = sessionScores[w.id]?.overall ?? w.avgSpokenScore;
            return sc !== null
              ? `${sc}% (${w.spokenAttempts}x)`
              : `${w.spokenAttempts}x`;
          },
        })}
      </div>

      {/* ====================================================================
          ROW 2: 3D INTERACTIVE LEARNING BOOSTERS
      ==================================================================== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* LEFT 7 COLS: "0 Spoken" & "Low Listen" 3D Action Deck */}
        <div className="flex flex-col justify-between rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-6 shadow-sm lg:col-span-7">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-black tracking-widest text-blue-600 uppercase">
                  Smart Blind-Spot Detector
                </span>
                <h3 className="text-xl font-black text-slate-900">
                  Level Up Your Unspoken &amp; Unheard Words
                </h3>
              </div>

              {/* 3D Sub-toggle: 0 Spoken vs Low Listen */}
              <div className="flex items-center gap-1.5 rounded-2xl bg-slate-100 p-1.5 text-xs font-black">
                <button
                  type="button"
                  onClick={() => setGapTab("ZERO_SPOKEN")}
                  className={`rounded-xl px-3 py-1.5 transition-all ${
                    gapTab === "ZERO_SPOKEN"
                      ? "border-b-2 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  🎙️ 0 Spoken ({zeroSpokenHighSeen.length})
                </button>
                <button
                  type="button"
                  onClick={() => setGapTab("LOW_LISTEN")}
                  className={`rounded-xl px-3 py-1.5 transition-all ${
                    gapTab === "LOW_LISTEN"
                      ? "border-b-2 border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  👂 Low Listen ({lowListenWords.length})
                </button>
              </div>
            </div>

            <p className="mt-3 text-xs font-semibold text-slate-500">
              {gapTab === "ZERO_SPOKEN"
                ? "You've seen and tapped these words in lessons, but you haven't spoken them out loud yet. Say them once to boost your mastery!"
                : "These words have low audio exposure. Tap Normal or Slow (0.6x) to lock their sound into your ear!"}
            </p>

            {/* Grid of 6 3D Action Pills */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {activeGapList.map((item) => {
                const isListening =
                  activeMicWordId === item.id && status === "listening";
                const isAnalyzing =
                  activeMicWordId === item.id && status === "analyzing";
                const isPlayingNormal =
                  activeTtsKey === `${item.id}-0.9` &&
                  (isTtsPlaying || isTtsLoading);
                const isPlayingSlow =
                  activeTtsKey === `${item.id}-0.6` &&
                  (isTtsPlaying || isTtsLoading);

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-2xl border-2 border-b-4 border-slate-200/90 border-b-slate-300 bg-slate-50/60 px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:bg-white"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-slate-900">
                        {item.cleanWord}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] font-bold text-slate-400">
                        <span>👁️ {item.seenCount}</span>
                        <span>👂 {item.heardCount}</span>
                        <span>👆 {item.tappedCorrect}</span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onListen(item, 0.9)}
                        disabled={status !== "idle"}
                        title="Listen (1.0x)"
                        className={`flex h-9 w-9 items-center justify-center rounded-xl border-2 border-b-[3px] transition-all active:translate-y-0.5 active:border-b-0 ${
                          isPlayingNormal
                            ? "animate-pulse border-blue-800 bg-blue-600 text-white"
                            : "border-slate-200 border-b-slate-300 bg-white text-blue-600 hover:border-sky-300 hover:bg-sky-50"
                        }`}
                      >
                        <Volume2 className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onListen(item, 0.6)}
                        disabled={status !== "idle"}
                        title="Slow (0.6x)"
                        className={`flex h-8 w-8 items-center justify-center rounded-xl border-2 border-b-[3px] transition-all active:translate-y-0.5 active:border-b-0 ${
                          isPlayingSlow
                            ? "animate-pulse border-orange-700 bg-amber-400 text-slate-950"
                            : "border-slate-200 border-b-slate-300 bg-white text-slate-500 hover:border-amber-300 hover:text-amber-600"
                        }`}
                      >
                        <Turtle className="h-3.5 w-3.5" />
                      </button>

                      <VoiceMicButton
                        size="sm"
                        idleLabel="Say"
                        isListening={isListening}
                        isAnalyzing={isAnalyzing}
                        onClick={() => onPronunciationTest(item)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {activeGapList.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <span className="text-xs font-bold text-slate-400">
                Want to clear all {activeGapList.length} in a guided session?
              </span>
              <button
                type="button"
                onClick={() => onStartDojo(activeGapList)}
                className="inline-flex items-center gap-2 rounded-2xl border-b-4 border-indigo-800 bg-gradient-to-b from-indigo-500 to-indigo-700 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-indigo-500/20 transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Practice {activeGapList.length} Words in Dojo</span>
              </button>
            </div>
          )}
        </div>

        {/* RIGHT 5 COLS: 3D INTERACTIVE MINI AUDIO QUIZ ("EAR & TAP BOOSTER") */}
        <div className="flex flex-col justify-between rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-6 shadow-sm lg:col-span-5">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-black tracking-widest text-amber-600 uppercase">
                  Mini Audio Challenge
                </span>
                <h3 className="text-xl font-black text-slate-900">
                  Ear &amp; Tap Booster
                </h3>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-xl border-b-2 border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 px-3 py-1 text-xs font-black text-slate-950 shadow-2xs">
                <Flame className="h-3.5 w-3.5 fill-current" />
                <span>Streak: {quizStreak}</span>
              </div>
            </div>

            {!quizTarget ? (
              <div className="flex h-48 items-center justify-center text-center text-xs font-bold text-slate-400">
                Unlock at least 3 words to play the Ear &amp; Tap Booster!
              </div>
            ) : (
              <div className="mt-5">
                {/* 3D Mystery Speaker Box */}
                <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-sky-200 bg-sky-50/40 p-5 text-center">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onListen(quizTarget, 0.9)}
                      disabled={status !== "idle"}
                      className="inline-flex items-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-5 py-3 text-sm font-black text-white shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0"
                    >
                      <Volume2 className="h-5 w-5" />
                      <span>Play Mystery Audio</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onListen(quizTarget, 0.6)}
                      disabled={status !== "idle"}
                      title="Play Slow (0.6x)"
                      className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-b-4 border-amber-300 border-b-orange-500 bg-amber-50 text-amber-700 transition-all hover:-translate-y-0.5 hover:bg-amber-100 active:translate-y-0.5 active:border-b-2"
                    >
                      <Turtle className="h-5 w-5" />
                    </button>
                  </div>

                  <p className="mt-2.5 text-xs font-bold text-slate-500">
                    Listen closely and tap the word you heard (+1 Heard &amp; +1
                    Tap)
                  </p>
                </div>

                {/* 3 Multiple-Choice 3D Word Pills */}
                <div className="mt-4 space-y-2.5">
                  {quizOptions.map((option, idx) => {
                    const isPicked = selectedOptionId === option.id;
                    const isCorrectTarget = option.id === quizTarget.id;
                    const showResult = selectedOptionId !== null;

                    let btnStyle =
                      "border-slate-200 border-b-slate-300 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-sky-400 hover:bg-sky-50/40 active:translate-y-0.5 active:border-b-2";

                    if (showResult) {
                      if (isCorrectTarget) {
                        btnStyle =
                          "border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-md shadow-emerald-500/20";
                      } else if (isPicked && !isCorrectTarget) {
                        btnStyle = "border-rose-400 bg-rose-50 text-rose-800";
                      } else {
                        btnStyle =
                          "border-slate-200 bg-slate-50 text-slate-400 opacity-60";
                      }
                    }

                    return (
                      <button
                        key={option.id}
                        type="button"
                        disabled={showResult}
                        onClick={() => handleQuizSelect(option)}
                        className={`flex w-full items-center justify-between rounded-2xl border-2 border-b-4 px-4 py-3 text-left font-black transition-all duration-150 ${btnStyle}`}
                      >
                        <div>
                          <span className="text-base">{option.cleanWord}</span>
                          {showResult && option.translation && (
                            <span className="ml-2 text-xs font-bold opacity-85">
                              ({option.translation})
                            </span>
                          )}
                        </div>

                        {showResult && isCorrectTarget ? (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/25 text-white">
                            <Check className="h-3.5 w-3.5 stroke-[3.5]" />
                          </span>
                        ) : showResult && isPicked && !isCorrectTarget ? (
                          <XCircle className="h-5 w-5 text-rose-600" />
                        ) : (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-400">
                            {String.fromCharCode(65 + idx)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {quizTarget && (
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-xs font-extrabold text-slate-500">
                {selectedOptionId
                  ? selectedOptionId === quizTarget.id
                    ? "🎉 Spot on! +1 Tap & +1 Heard logged."
                    : `Answer: "${quizTarget.cleanWord}"`
                  : "Pick an option above"}
              </span>

              <button
                type="button"
                onClick={() => generateNextQuizRound(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border-b-[3px] border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-4 py-2 text-xs font-black text-white shadow-2xs transition hover:brightness-105 active:translate-y-0.5 active:border-b-0"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Next Word</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
