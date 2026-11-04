// components/books/book-wrapper.tsx
"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Globe2,
  Lock,
  Volume2,
  VolumeX,
  Sparkles,
  Play,
  Square,
  Mic,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  X,
  Gauge,
  BookOpenCheck,
} from "lucide-react";
import { useSprite } from "@/context/sprite-context";
import type {
  SpoonBookWebhookPayload,
  LocalizedPage,
  CheckpointOption,
  PageDefinition,
  BookSentence,
} from "@/lib/schema/book-schema";

const CELEBRATION_EMOJIS = [
  { emoji: "🎉", left: "12%", delay: 0, xDrift: -18 },
  { emoji: "✨", left: "26%", delay: 0.06, xDrift: 14 },
  { emoji: "🌟", left: "42%", delay: 0.02, xDrift: -10 },
  { emoji: "🥳", left: "58%", delay: 0.08, xDrift: 20 },
  { emoji: "💫", left: "74%", delay: 0.04, xDrift: -15 },
  { emoji: "🏆", left: "88%", delay: 0.1, xDrift: 12 },
];

const SPEED_OPTIONS = [
  { label: "0.75x Slow", value: 0.75 },
  { label: "0.85x Learner", value: 0.85 },
  { label: "1.0x Normal", value: 1.0 },
] as const;

export interface BookWrapperProps {
  book: SpoonBookWebhookPayload & {
    id: string;
    mediaUrls?: {
      coverImageUrl?: string;
      introVideoUrl?: string;
      pageImageUrls?: string[];
      sentenceAudioUrls?: Record<string, string>;
    };
  };
  userPlan?: string;
  initialPage?: number;
  initialCompletedCheckpoints?: number[];
  onBackToLibrary: () => void;
  onSaveProgress?: (progress: {
    bookId: string;
    targetLanguage: string;
    currentPage: number;
    completedCheckpoints: number[];
    isFinished: boolean;
  }) => Promise<void>;
}

export function BookWrapper({
  book,
  userPlan = "founder",
  initialPage = 0,
  initialCompletedCheckpoints = [],
  onBackToLibrary,
  onSaveProgress,
}: BookWrapperProps) {
  const { profile, spriteName } = useSprite();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const sequenceCancelledRef = useRef<boolean>(false);

  // 1. LANGUAGE SELECTION
  const defaultLang = profile?.targetLanguage || "fr-FR";
  const availableLanguages = Object.keys(book.translations || {});
  const [selectedLang, setSelectedLang] = useState<string>(
    book.translations[defaultLang]
      ? defaultLang
      : availableLanguages[0] || "fr-FR"
  );

  const isMultiLangUnlocked =
    userPlan === "unlimited" || userPlan === "enterprise";

  // 2. ACTIVE LOCALIZED EDITION & PAGE COUNT
  const currentTranslation = useMemo(() => {
    return (
      book.translations[selectedLang] ||
      book.translations[defaultLang] ||
      book.translations[availableLanguages[0]]
    );
  }, [book.translations, selectedLang, defaultLang, availableLanguages]);

  const totalPages =
    currentTranslation?.pages?.length || book.pageImageS3Keys?.length || 5;
  const outroPage = totalPages + 1;

  // 3. READER & KARAOKE WORD STATE
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [completedCheckpoints, setCompletedCheckpoints] = useState<Set<number>>(
    new Set(initialCompletedCheckpoints)
  );
  const [isCheckpointDrawerOpen, setIsCheckpointDrawerOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<CheckpointOption | null>(
    null
  );
  const [emojiBurstKey, setEmojiBurstKey] = useState<number>(0);
  const [wrongShakeKey, setWrongShakeKey] = useState<number>(0);

  // Audio + 60fps Word Tracking State
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(0.85); // Default to 0.85x learner pace!
  const [activeSentenceIdx, setActiveSentenceIdx] = useState<number | null>(
    null
  );
  const [activeWordIdx, setActiveWordIdx] = useState<number | null>(null);
  const [isPlayingPage, setIsPlayingPage] = useState<boolean>(false);
  const [activeVocab, setActiveVocab] = useState<PageDefinition | null>(null);
  const [showTranslations, setShowTranslations] = useState<boolean>(true);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  const activePageContent: LocalizedPage | undefined =
    currentPage >= 1 && currentPage <= totalPages
      ? currentTranslation?.pages?.[currentPage - 1]
      : undefined;

  const activePageImageUrl =
    book.mediaUrls?.pageImageUrls?.[currentPage - 1] ||
    book.mediaUrls?.coverImageUrl ||
    book.characterAvatarUrl;

  const isAudioActive = isPlayingPage || activeSentenceIdx !== null;

  // Stop any playing audio & cancel 60fps loop
  const stopAudio = useCallback(() => {
    sequenceCancelledRef.current = true;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlayingPage(false);
    setActiveSentenceIdx(null);
    setActiveWordIdx(null);
  }, []);

  useEffect(() => {
    stopAudio();
    setActiveVocab(null);
    setSelectedOption(null);
    setEmojiBurstKey(0);
  }, [currentPage, selectedLang, stopAudio]);

  // Update live audio playbackRate if user toggles speed mid-sentence
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Resolve presigned audio URL from S3 key
  const resolveAudioUrl = useCallback(
    (s3Key?: string | null) => {
      if (!s3Key) return undefined;
      return book.mediaUrls?.sentenceAudioUrls?.[s3Key] || s3Key;
    },
    [book.mediaUrls?.sentenceAudioUrls]
  );

  // Play a sentence with 60fps word-by-word karaoke highlighting!
  const playSentenceWithWordTracking = useCallback(
    (sentence: BookSentence): Promise<void> => {
      return new Promise((resolve) => {
        if (!sentence.audioS3Key || isAudioMuted) {
          resolve();
          return;
        }
        const url = resolveAudioUrl(sentence.audioS3Key);
        if (!url || !url.startsWith("http")) {
          resolve();
          return;
        }

        if (audioRef.current) {
          audioRef.current.pause();
        }
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }

        const audio = new Audio(url);
        audio.playbackRate = playbackSpeed;
        // Keep natural voice pitch when slowed down
        if ("preservesPitch" in audio) {
          audio.preservesPitch = true;
        }
        audioRef.current = audio;

        const words = sentence.textTarget.trim().split(/\s+/);
        const timestamps = sentence.wordTimestamps || [];

        const updateWordHighlight = () => {
          if (!audioRef.current || audioRef.current.paused) return;
          const currentMs = audioRef.current.currentTime * 1000;

          if (timestamps.length > 0) {
            // Use exact Groq Whisper millisecond timestamps
            let matchedIdx = -1;
            for (let i = 0; i < timestamps.length; i++) {
              const ts = timestamps[i];
              // Give a tiny 60ms lookahead so highlighting feels snappy
              if (currentMs >= ts.startMs - 60 && currentMs <= ts.endMs + 120) {
                matchedIdx = i;
                break;
              }
              if (currentMs >= ts.startMs) {
                matchedIdx = i;
              }
            }
            if (matchedIdx !== -1) {
              setActiveWordIdx(Math.min(matchedIdx, words.length - 1));
            }
          } else if (audioRef.current.duration > 0) {
            // Proportional fallback if Whisper timestamps weren't returned
            const progress =
              audioRef.current.currentTime / audioRef.current.duration;
            const estIdx = Math.min(
              words.length - 1,
              Math.floor(progress * words.length)
            );
            setActiveWordIdx(estIdx);
          }

          rafRef.current = requestAnimationFrame(updateWordHighlight);
        };

        audio.onplay = () => {
          setActiveWordIdx(0);
          rafRef.current = requestAnimationFrame(updateWordHighlight);
        };

        const cleanupAndResolve = () => {
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
          setActiveWordIdx(null);
          resolve();
        };

        audio.onended = cleanupAndResolve;
        audio.onerror = cleanupAndResolve;
        audio.play().catch(cleanupAndResolve);
      });
    },
    [isAudioMuted, playbackSpeed, resolveAudioUrl]
  );

  // Play isolated vocabulary word audio
  const playVocabAudio = useCallback(
    (s3Key?: string | null) => {
      if (!s3Key || isAudioMuted) return;
      const url = resolveAudioUrl(s3Key);
      if (!url || !url.startsWith("http")) return;
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(url);
      audio.playbackRate = playbackSpeed;
      audioRef.current = audio;
      void audio.play().catch(() => {});
    },
    [isAudioMuted, playbackSpeed, resolveAudioUrl]
  );

  // Play ALL sentences on the current page back-to-back with a natural 380ms breather between sentences
  const handlePlayAllSentences = useCallback(async () => {
    if (!activePageContent?.sentences?.length) return;

    if (isPlayingPage) {
      stopAudio();
      return;
    }

    sequenceCancelledRef.current = false;
    setIsPlayingPage(true);

    for (let i = 0; i < activePageContent.sentences.length; i++) {
      if (sequenceCancelledRef.current) break;
      setActiveSentenceIdx(i);
      await playSentenceWithWordTracking(activePageContent.sentences[i]);

      // Natural pause between sentences so it doesn't rush!
      if (
        !sequenceCancelledRef.current &&
        i < activePageContent.sentences.length - 1
      ) {
        await new Promise((r) => setTimeout(r, 380));
      }
    }

    if (!sequenceCancelledRef.current) {
      setIsPlayingPage(false);
      setActiveSentenceIdx(null);
      setActiveWordIdx(null);
    }
  }, [
    activePageContent,
    isPlayingPage,
    playSentenceWithWordTracking,
    stopAudio,
  ]);

  // Play a single sentence when tapped
  const handleTapSentence = useCallback(
    async (index: number, sentence: BookSentence) => {
      stopAudio();
      sequenceCancelledRef.current = false;
      setActiveSentenceIdx(index);
      await playSentenceWithWordTracking(sentence);
      if (!sequenceCancelledRef.current) {
        setActiveSentenceIdx(null);
        setActiveWordIdx(null);
      }
    },
    [playSentenceWithWordTracking, stopAudio]
  );

  const handleTapVocab = useCallback(
    (defn: PageDefinition) => {
      stopAudio();
      setActiveVocab(defn);
      playVocabAudio(defn.audioS3Key || defn.audioUrl);
    },
    [playVocabAudio, stopAudio]
  );

  const syncProgress = useCallback(
    (page: number, checkpoints: Set<number>) => {
      if (!onSaveProgress) return;
      void onSaveProgress({
        bookId: book.id,
        targetLanguage: selectedLang,
        currentPage: page,
        completedCheckpoints: Array.from(checkpoints),
        isFinished: page === outroPage,
      });
    },
    [book.id, selectedLang, onSaveProgress, outroPage]
  );

  const handleNextPage = () => {
    if (currentPage >= outroPage) return;
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    setIsCheckpointDrawerOpen(false);
    setSelectedOption(null);
    setEmojiBurstKey(0);
    syncProgress(nextPage, completedCheckpoints);
  };

  const handlePrevPage = () => {
    if (currentPage <= 0) return;
    const prevPage = currentPage - 1;
    setCurrentPage(prevPage);
    setIsCheckpointDrawerOpen(false);
    setSelectedOption(null);
    setEmojiBurstKey(0);
    syncProgress(prevPage, completedCheckpoints);
  };

  const handleCompleteCurrentCheckpoint = () => {
    if (currentPage < 1 || currentPage > totalPages) return;
    const nextSet = new Set(completedCheckpoints);
    nextSet.add(currentPage);
    setCompletedCheckpoints(nextSet);
    syncProgress(currentPage, nextSet);
  };

  const isCurrentPageSolved = completedCheckpoints.has(currentPage);
  const isCurrentPageGated =
    currentPage >= 1 && currentPage <= totalPages && !isCurrentPageSolved;

  // Build a set of spotlight vocabulary words on this page so we can underline them inline
  const pageVocabSet = useMemo(() => {
    const map = new Map<string, PageDefinition>();
    for (const d of activePageContent?.definitions || []) {
      map.set(d.word.toLowerCase().replace(/[.,!?'"«»]/g, ""), d);
    }
    return map;
  }, [activePageContent?.definitions]);

  return (
    <div className="relative flex min-h-[calc(100vh-1rem)] w-full flex-col bg-gradient-to-br from-slate-50 via-sky-50/30 to-emerald-50/30 text-slate-900">
      {/* =====================================================================
          1. CLEAN LIGHT HEADER BAR (With Speed Control!)
          ===================================================================== */}
      <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between bg-white/85 px-4 sm:px-8 backdrop-blur-md">
        <button
          type="button"
          onClick={onBackToLibrary}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Bookshelf</span>
        </button>

        {/* Center Title + Progress Pills */}
        <div className="flex flex-col items-center gap-1">
          <span className="max-w-[200px] sm:max-w-md truncate text-sm font-extrabold text-slate-800">
            {currentTranslation?.title || book.slug}
          </span>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pNum = idx + 1;
              const isCurrent = currentPage === pNum;
              const isDone = completedCheckpoints.has(pNum);
              return (
                <div
                  key={pNum}
                  className={`h-1.5 rounded-full transition-all ${
                    isCurrent
                      ? "w-7 bg-gradient-to-r from-sky-500 to-emerald-500"
                      : isDone
                        ? "w-2.5 bg-emerald-400"
                        : "w-2 bg-slate-200"
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Right Controls: Reading Pace + Language + Mute */}
        <div className="flex items-center gap-2">
          {/* Voice Speed Control */}
          <div className="hidden sm:flex items-center gap-1 rounded-full bg-slate-100 p-1">
            <Gauge className="ml-2 h-3.5 w-3.5 text-sky-600" />
            {SPEED_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPlaybackSpeed(opt.value)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold transition ${
                  playbackSpeed === opt.value
                    ? "bg-white text-sky-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {opt.value}x
              </button>
            ))}
          </div>

          {isMultiLangUnlocked ? (
            <select
              value={selectedLang}
              onChange={(e) => {
                setSelectedLang(e.target.value);
                setCurrentPage(0);
              }}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-sky-700 uppercase focus:outline-none"
            >
              {availableLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang.split("-")[0].toUpperCase()}
                </option>
              ))}
            </select>
          ) : (
            <div
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600"
              title="Multi-language editions unlocked on Unlimited+"
            >
              <Globe2 className="h-3.5 w-3.5 text-sky-500" />
              <span>{selectedLang.split("-")[0].toUpperCase()}</span>
              <Lock className="h-3 w-3 text-amber-500" />
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsAudioMuted((prev) => !prev)}
            className="rounded-full bg-slate-100 p-2 text-slate-700 transition hover:bg-slate-200"
            title={isAudioMuted ? "Unmute" : "Mute"}
          >
            {isAudioMuted ? (
              <VolumeX className="h-4 w-4 text-rose-500" />
            ) : (
              <Volume2 className="h-4 w-4 text-sky-600" />
            )}
          </button>
        </div>
      </header>

      {/* =====================================================================
          2. MAIN CINEMA STORYBOOK STAGE
          ===================================================================== */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 py-3 sm:px-6">
        <AnimatePresence mode="wait">
          {currentPage === 0 ? (
            /* ================= PAGE 0: CINEMATIC COVER ================= */
            <motion.div
              key="book-intro"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="relative w-full overflow-hidden rounded-[2rem] bg-white shadow-xl"
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
                {book.mediaUrls?.introVideoUrl ? (
                  <video
                    src={book.mediaUrls.introVideoUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src={
                      book.mediaUrls?.coverImageUrl || book.characterAvatarUrl
                    }
                    alt={currentTranslation?.title}
                    className="h-full w-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 flex flex-col items-start justify-end p-6 sm:p-10 text-white">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="rounded-full bg-emerald-400 px-3 py-1 text-[11px] font-black tracking-wide text-slate-950 uppercase">
                      {book.levelBand}
                    </span>
                    <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold text-white capitalize backdrop-blur-md">
                      {book.genre}
                    </span>
                  </div>

                  <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
                    {currentTranslation?.title}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm font-medium text-white/90 sm:text-base">
                    {currentTranslation?.synopsis}
                  </p>

                  <div className="mt-6 flex w-full flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 rounded-full bg-white/15 py-1.5 pr-4 pl-1.5 backdrop-blur-md">
                      <img
                        src={book.characterAvatarUrl}
                        alt={book.characterName}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                      <span className="text-xs font-bold text-white">
                        Starring {book.characterName}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleNextPage}
                      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-400 via-teal-400 to-emerald-400 px-8 py-3.5 text-sm font-black text-slate-950 shadow-lg transition hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <span>Start Story</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : currentPage >= 1 && currentPage <= totalPages ? (
            /* ================= PAGES 1..N: 16:9 STAGE + KARAOKE DOCK ================= */
            <motion.div
              key={`page-${currentPage}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="flex w-full flex-col gap-3.5"
            >
              {/* LARGE 16:9 ILLUSTRATION CANVAS */}
              <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden rounded-[2rem] bg-slate-200 shadow-2xl">
                <img
                  src={activePageImageUrl}
                  alt={`Page ${currentPage}`}
                  className="h-full w-full object-cover"
                />

                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/45 to-transparent" />

                {/* Top Floating Badges */}
                <div className="absolute top-4 inset-x-4 flex items-center justify-between">
                  <span className="rounded-full bg-white/90 px-3.5 py-1 text-xs font-extrabold text-slate-800 shadow-sm backdrop-blur-md">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setIsCheckpointDrawerOpen(true)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-extrabold shadow-md backdrop-blur-md transition ${
                      isCurrentPageSolved
                        ? "bg-emerald-500/95 text-white"
                        : "bg-amber-400 text-slate-950 hover:scale-105"
                    }`}
                  >
                    {isCurrentPageSolved ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Checkpoint Solved</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Open Checkpoint</span>
                      </>
                    )}
                  </button>
                </div>

                {/* =============================================================
                    LOW FLOATING STORY DOCK WITH WORD-BY-WORD KARAOKE HIGHLIGHTING
                    ============================================================= */}
                <div
                  className={`absolute inset-x-2.5 bottom-2 sm:inset-x-4 sm:bottom-3 rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 transition-all duration-500 ${
                    isAudioActive
                      ? "bg-white/96 opacity-100 shadow-2xl ring-2 ring-sky-400/60 backdrop-blur-xl"
                      : "bg-white/75 opacity-90 hover:bg-white/95 hover:opacity-100 shadow-lg backdrop-blur-md"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <button
                        type="button"
                        onClick={handlePlayAllSentences}
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-md transition ${
                          isPlayingPage
                            ? "bg-rose-500 text-white"
                            : "bg-gradient-to-tr from-sky-500 to-emerald-400 text-white hover:scale-105"
                        }`}
                        title={
                          isPlayingPage
                            ? "Stop reading"
                            : "Read page aloud word-by-word"
                        }
                      >
                        {isPlayingPage ? (
                          <Square className="h-4 w-4 fill-current" />
                        ) : (
                          <Play className="h-5 w-5 fill-current ml-0.5" />
                        )}
                      </button>

                      {/* WORD-BY-WORD KARAOKE SENTENCE RENDERER */}
                      <div className="space-y-1">
                        <div className="text-base sm:text-lg md:text-xl font-extrabold leading-relaxed text-slate-900">
                          {activePageContent?.sentences.map((sent, sIdx) => {
                            const isSentenceActive = activeSentenceIdx === sIdx;
                            const words = sent.textTarget.trim().split(/\s+/);

                            return (
                              <span
                                key={sent.sentenceIndex ?? sIdx}
                                onClick={() => handleTapSentence(sIdx, sent)}
                                className={`mr-2.5 inline cursor-pointer rounded-lg px-1 py-0.5 transition-colors ${
                                  isSentenceActive
                                    ? "bg-sky-50/90 ring-1 ring-sky-200"
                                    : "hover:bg-slate-100/70"
                                }`}
                              >
                                {words.map((wordToken, wIdx) => {
                                  const isWordHighlighted =
                                    isSentenceActive && activeWordIdx === wIdx;
                                  const cleanToken = wordToken
                                    .toLowerCase()
                                    .replace(/[.,!?'"«»]/g, "");
                                  const isVocabWord =
                                    pageVocabSet.has(cleanToken);

                                  return (
                                    <span
                                      key={wIdx}
                                      className={`mr-1 inline-block rounded-md px-1 py-0.5 transition-all duration-150 ${
                                        isWordHighlighted
                                          ? "bg-sky-500 text-white scale-105 shadow-xs"
                                          : isVocabWord
                                            ? "underline decoration-emerald-500 decoration-2 underline-offset-4 text-sky-950"
                                            : ""
                                      }`}
                                    >
                                      {wordToken}
                                    </span>
                                  );
                                })}
                              </span>
                            );
                          })}
                        </div>

                        {showTranslations && (
                          <p className="text-xs sm:text-sm font-semibold text-slate-600">
                            {activePageContent?.sentences
                              .map((s) => s.textNative)
                              .join(" ")}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowTranslations((prev) => !prev)}
                      className="shrink-0 rounded-full bg-slate-900/10 px-2.5 py-1 text-[10px] font-bold text-slate-700 transition hover:bg-slate-900/15"
                    >
                      {showTranslations ? "Hide EN" : "Show EN"}
                    </button>
                  </div>
                </div>
              </div>

              {/* =================================================================
                  BOTTOM BAR: PROMINENT VOCABULARY CARD + PAGE NAVIGATION
                  ================================================================= */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/90 px-4 py-3 shadow-md backdrop-blur-md">
                {/* High-Visibility Spotlight Vocabulary Pills */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black tracking-wide text-emerald-800 uppercase">
                    <BookOpenCheck className="h-3.5 w-3.5" />
                    Word Spotlight
                  </span>

                  {activePageContent?.definitions?.map((defn, idx) => {
                    const isSelected = activeVocab?.word === defn.word;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleTapVocab(defn)}
                        className={`inline-flex items-center gap-2.5 rounded-xl px-4 py-2 text-xs sm:text-sm transition-all ${
                          isSelected
                            ? "bg-sky-600 text-white shadow-md scale-[1.02]"
                            : "bg-sky-50/90 text-slate-900 hover:bg-sky-100 ring-1 ring-sky-200/80"
                        }`}
                      >
                        <Volume2
                          className={`h-4 w-4 ${
                            isSelected ? "text-white" : "text-sky-600"
                          }`}
                        />
                        <span className="text-sm font-black">{defn.word}</span>
                        {defn.phonetic && (
                          <span
                            className={`text-xs font-medium ${
                              isSelected ? "text-sky-100" : "text-slate-500"
                            }`}
                          >
                            /{defn.phonetic}/
                          </span>
                        )}
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-extrabold ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : "bg-emerald-500/15 text-emerald-700"
                          }`}
                        >
                          {defn.translation}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Page Navigation + Checkpoint Trigger */}
                <div className="ml-auto flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handlePrevPage}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Previous</span>
                  </button>

                  {isCurrentPageGated ? (
                    <button
                      type="button"
                      onClick={() => setIsCheckpointDrawerOpen(true)}
                      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-5 py-2.5 text-xs font-black text-slate-950 shadow-md transition hover:scale-105"
                    >
                      <HelpCircle className="h-4 w-4" />
                      <span>Answer Checkpoint to Continue</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleNextPage}
                      className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 px-6 py-2.5 text-xs font-black text-white shadow-md transition hover:scale-105"
                    >
                      <span>
                        {currentPage === totalPages
                          ? "Finish Story"
                          : "Next Page"}
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            /* ================= OUTRO: COMPLETION CARD ================= */
            <motion.div
              key="book-outro"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="mx-auto flex w-full max-w-md flex-col items-center space-y-6 rounded-3xl bg-white p-8 text-center shadow-xl"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-amber-300 to-emerald-400 text-2xl font-black text-slate-950 shadow-md">
                {totalPages}/{totalPages}
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900">
                  Story Completed! 🏆
                </h2>
                <p className="text-sm leading-relaxed text-slate-600">
                  You finished all {totalPages} pages of{" "}
                  <span className="font-bold text-sky-600">
                    {currentTranslation?.title}
                  </span>
                  .
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPage(1);
                    setCompletedCheckpoints(new Set());
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-100 py-3.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Read Story Again</span>
                </button>

                <button
                  type="button"
                  onClick={onBackToLibrary}
                  className="w-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 py-3.5 text-xs font-black text-white shadow-md transition hover:brightness-105"
                >
                  Back to Bookshelf
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* =====================================================================
          3. ZERO-SHIFT GAMIFIED CHECKPOINT DRAWER + EMOJI DROP
          ===================================================================== */}
      <AnimatePresence>
        {isCheckpointDrawerOpen && activePageContent?.checkpoint && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsCheckpointDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-slate-900/25 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="fixed inset-x-3 bottom-3 sm:inset-x-0 sm:bottom-5 z-50 mx-auto w-auto sm:w-full max-w-xl overflow-hidden rounded-[2rem] bg-white p-6 sm:p-7 shadow-2xl ring-1 ring-slate-200/80"
            >
              {/* 🎉 EMOJI DROP RAIN OVERLAY */}
              <AnimatePresence>
                {emojiBurstKey > 0 && (
                  <div
                    key={emojiBurstKey}
                    className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
                  >
                    {CELEBRATION_EMOJIS.map((item, idx) => (
                      <motion.span
                        key={idx}
                        initial={{
                          y: -40,
                          x: 0,
                          opacity: 1,
                          scale: 0.5,
                          rotate: -15,
                        }}
                        animate={{
                          y: [0, 140, 280],
                          x: [0, item.xDrift, item.xDrift * 1.3],
                          opacity: [1, 1, 0],
                          scale: [0.8, 1.35, 1],
                          rotate: [-15, 18, -10],
                        }}
                        transition={{
                          duration: 1.25,
                          delay: item.delay,
                          ease: "easeOut",
                        }}
                        style={{ left: item.left }}
                        className="absolute top-0 text-2xl sm:text-3xl select-none"
                      >
                        {item.emoji}
                      </motion.span>
                    ))}
                  </div>
                )}
              </AnimatePresence>

              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-0.5 text-[10px] font-black tracking-wide text-sky-700 uppercase">
                    <Sparkles className="h-3 w-3" />
                    Page {currentPage} Challenge
                  </span>
                  <h3 className="mt-1.5 text-base sm:text-lg font-extrabold text-slate-900">
                    {activePageContent.checkpoint.questionNative}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCheckpointDrawerOpen(false)}
                  className="rounded-full bg-slate-100 p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {activePageContent.checkpoint.type === "multiple_choice" &&
              activePageContent.checkpoint.options ? (
                <div className="space-y-2.5">
                  {activePageContent.checkpoint.options.map((opt, i) => {
                    const isSelected = selectedOption?.text === opt.text;
                    const isCorrectSelection = isSelected && opt.isCorrect;
                    const isWrongSelection = isSelected && !opt.isCorrect;

                    return (
                      <motion.button
                        key={i}
                        type="button"
                        animate={
                          isWrongSelection
                            ? { x: [0, -6, 6, -4, 4, 0] }
                            : isCorrectSelection
                              ? { scale: [1, 1.02, 1] }
                              : { x: 0, scale: 1 }
                        }
                        transition={{ duration: 0.32 }}
                        onClick={() => {
                          setSelectedOption(opt);
                          if (opt.isCorrect) {
                            setEmojiBurstKey((prev) => prev + 1);
                            handleCompleteCurrentCheckpoint();
                          } else {
                            setWrongShakeKey((prev) => prev + 1);
                          }
                        }}
                        className={`flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left text-sm font-bold transition-colors duration-200 ${
                          isCorrectSelection
                            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                            : isWrongSelection
                              ? "bg-rose-50 text-rose-900 ring-2 ring-rose-300"
                              : "bg-slate-100/80 text-slate-800 hover:bg-sky-50/90"
                        }`}
                      >
                        <span>{opt.text}</span>
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black transition-all ${
                            isCorrectSelection
                              ? "bg-white/25 text-white scale-110"
                              : isWrongSelection
                                ? "bg-rose-200 text-rose-800"
                                : "bg-white/70 text-slate-400"
                          }`}
                        >
                          {isCorrectSelection
                            ? "✓"
                            : isWrongSelection
                              ? "✗"
                              : String.fromCharCode(65 + i)}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-2xl bg-sky-50 p-4 text-center">
                    <p className="text-lg font-black text-sky-900">
                      &ldquo;
                      {
                        activePageContent.checkpoint.speakChallenge
                          ?.targetPhrase
                      }
                      &rdquo;
                    </p>
                    {activePageContent.checkpoint.speakChallenge
                      ?.phoneticGuide && (
                      <p className="mt-1 text-xs font-medium text-sky-600">
                        /
                        {
                          activePageContent.checkpoint.speakChallenge
                            .phoneticGuide
                        }
                        /
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEmojiBurstKey((prev) => prev + 1);
                      handleCompleteCurrentCheckpoint();
                    }}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black transition ${
                      isCurrentPageSolved
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                        : "bg-slate-100 text-slate-800 hover:bg-sky-50"
                    }`}
                  >
                    <Mic className="h-4 w-4" />
                    <span>
                      {isCurrentPageSolved
                        ? "Awesome Pronunciation! 🎉"
                        : "Tap After Saying Out Loud"}
                    </span>
                  </button>
                </div>
              )}

              {/* RESERVED FIXED-HEIGHT FEEDBACK & CONTINUE SLOT */}
              <div className="mt-4 flex min-h-[76px] items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex-1 text-xs leading-relaxed">
                  {selectedOption ? (
                    <motion.p
                      key={`${selectedOption.text}-${wrongShakeKey}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={
                        selectedOption.isCorrect
                          ? "font-semibold text-emerald-800"
                          : "font-medium text-rose-700"
                      }
                    >
                      <span className="font-black">
                        {selectedOption.isCorrect ? "🎉 Spot on! " : "💡 Hint: "}
                      </span>
                      {selectedOption.spriteReaction}
                    </motion.p>
                  ) : isCurrentPageSolved ? (
                    <p className="font-semibold text-emerald-700">
                      🎉 Checkpoint cleared! You&apos;re ready for the next page.
                    </p>
                  ) : (
                    <p className="font-medium text-slate-400">
                      Select an answer above to unlock the next page...
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  disabled={!isCurrentPageSolved}
                  onClick={handleNextPage}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-black transition-all ${
                    isCurrentPageSolved
                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-600 hover:scale-105"
                      : "cursor-not-allowed bg-slate-200/70 text-slate-400"
                  }`}
                >
                  <span>
                    {currentPage === totalPages ? "Finish" : "Next Page"}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}