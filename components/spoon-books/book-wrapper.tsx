// components/spoon-books/book-wrapper.tsx
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
  Headphones,
  Music,
  Loader2,
} from "lucide-react";
import { useSprite } from "@/context/sprite-context";
import { usePronunciation } from "@/context/pronunciation-context";
import { playSfx, preloadSfx } from "@/lib/sfx";
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
  { label: "0.75x", value: 0.75 },
  { label: "0.85x", value: 0.85 },
  { label: "1x", value: 1.0 },
] as const;

const CAMERA_MOTIONS = [
  { scale: [1.0, 1.065], x: ["0%", "-1.2%"], y: ["0%", "-0.8%"] },
  { scale: [1.05, 1.0], x: ["-1%", "0.8%"], y: ["-0.6%", "0%"] },
  { scale: [1.0, 1.06], x: ["0%", "1.2%"], y: ["0%", "-1%"] },
  { scale: [1.04, 1.0], x: ["1%", "-0.8%"], y: ["0.5%", "-0.5%"] },
];

export type ReadingMode = "listen" | "read";

export interface WordPronResult {
  word: string;
  accuracy: number;
  errorType?: string;
}

export interface PagePronResult {
  overallScore: number;
  wordScores: Record<string, WordPronResult>;
}

const cleanTokenKey = (w: string) =>
  w
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "")
    .trim();

function parseAzurePronunciation(rawResult: any): PagePronResult | null {
  if (!rawResult) return null;

  const overall = Math.round(
    Number(
      rawResult.pronunciationScore ??
        rawResult.accuracyScore ??
        rawResult.overallScore ??
        rawResult.score ??
        rawResult.NBest?.[0]?.PronunciationAssessment?.PronScore ??
        0
    )
  );

  const rawWords: any[] =
    rawResult.words ||
    rawResult.wordScores ||
    rawResult.NBest?.[0]?.Words ||
    [];

  const wordScores: Record<string, WordPronResult> = {};
  rawWords.forEach((w, idx) => {
    const surface = String(w.word ?? w.Word ?? "").trim();
    const acc = Math.round(
      Number(
        w.accuracyScore ??
          w.AccuracyScore ??
          w.score ??
          w.PronunciationAssessment?.AccuracyScore ??
          overall
      )
    );
    const err =
      w.errorType ??
      w.ErrorType ??
      w.PronunciationAssessment?.ErrorType ??
      "None";

    const key = cleanTokenKey(surface);
    if (key) {
      wordScores[key] = { word: surface, accuracy: acc, errorType: err };
      wordScores[`idx:${idx}`] = {
        word: surface,
        accuracy: acc,
        errorType: err,
      };
    }
  });

  return { overallScore: overall, wordScores };
}

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
  initialPronunciationScores?: Record<string, PagePronResult>;
  onBackToLibrary: () => void;
  onSaveProgress?: (progress: {
    bookId: string;
    targetLanguage: string;
    currentPage: number;
    completedCheckpoints: number[];
    isFinished: boolean;
    pronunciationScores?: Record<string, PagePronResult>;
  }) => Promise<void>;
}

export function BookWrapper({
  book,
  userPlan = "founder",
  initialPage = 0,
  initialCompletedCheckpoints = [],
  initialPronunciationScores = {},
  onBackToLibrary,
  onSaveProgress,
}: BookWrapperProps) {
  const { profile } = useSprite();
  const {
    status: pronStatus,
    isRecording,
    assessSpeech,
    stopRecording,
    cancelAssessment,
  } = usePronunciation();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
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

  // 3. MODE ("listen" = AI reads to you | "read" = You read out loud to pass each page)
  const [readingMode, setReadingMode] = useState<ReadingMode>("read");
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [completedCheckpoints, setCompletedCheckpoints] = useState<Set<number>>(
    new Set(initialCompletedCheckpoints)
  );
  const [pagePronScores, setPagePronScores] = useState<
    Record<string, PagePronResult>
  >(initialPronunciationScores);
  const [checkpointPronResult, setCheckpointPronResult] =
    useState<PagePronResult | null>(null);
  const [recordingTarget, setRecordingTarget] = useState<
    "page" | "checkpoint" | null
  >(null);

  const [isCheckpointDrawerOpen, setIsCheckpointDrawerOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<CheckpointOption | null>(
    null
  );
  const [emojiBurstKey, setEmojiBurstKey] = useState<number>(0);
  const [wrongShakeKey, setWrongShakeKey] = useState<number>(0);

  // Audio + 60fps Word Tracking + Ambient Music State
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(0.85);
  const [activeSentenceIdx, setActiveSentenceIdx] = useState<number | null>(
    null
  );
  const [activeWordIdx, setActiveWordIdx] = useState<number | null>(null);
  const [isPlayingPage, setIsPlayingPage] = useState<boolean>(false);
  const [activeVocab, setActiveVocab] = useState<PageDefinition | null>(null);
  const [showTranslations, setShowTranslations] = useState<boolean>(true);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);

  const pageScoreKey = `${selectedLang}:p${currentPage}`;
  const currentPagePron = pagePronScores[pageScoreKey] || null;
  const hasReadCurrentPageAloud = Boolean(currentPagePron);

  const isPlayDisabled =
    isRecording || (readingMode === "read" && !hasReadCurrentPageAloud);

  const activePageContent: LocalizedPage | undefined =
    currentPage >= 1 && currentPage <= totalPages
      ? currentTranslation?.pages?.[currentPage - 1]
      : undefined;

  const activePageImageUrl =
    book.mediaUrls?.pageImageUrls?.[currentPage - 1] ||
    book.mediaUrls?.coverImageUrl ||
    book.characterAvatarUrl;

  const ambientBackdropUrl =
    currentPage === 0
      ? book.mediaUrls?.coverImageUrl || book.characterAvatarUrl
      : activePageImageUrl;

  const isAudioActive = isPlayingPage || activeSentenceIdx !== null;
  const isSpeakingCheckpointOpen =
    isCheckpointDrawerOpen &&
    activePageContent?.checkpoint?.type === "speak_phrase";

  const cameraMotion =
    CAMERA_MOTIONS[(Math.max(1, currentPage) - 1) % CAMERA_MOTIONS.length];

  useEffect(() => {
    preloadSfx();

    const bg = new Audio("/sfx/book-ambient.mp3");
    bg.loop = true;
    bg.preload = "auto";
    bg.volume = 0.1;
    ambientAudioRef.current = bg;

    return () => {
      bg.pause();
      bg.src = "";
      ambientAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const bg = ambientAudioRef.current;
    if (!bg) return;

    const shouldPlay =
      isMusicEnabled &&
      !isAudioMuted &&
      currentPage >= 1 &&
      currentPage <= totalPages &&
      !isSpeakingCheckpointOpen &&
      !isRecording;

    if (!shouldPlay) {
      bg.pause();
      return;
    }

    bg.volume = isAudioActive ? 0.04 : 0.1;
    if (bg.paused) {
      void bg.play().catch(() => {});
    }
  }, [
    isMusicEnabled,
    isAudioMuted,
    currentPage,
    totalPages,
    isAudioActive,
    isSpeakingCheckpointOpen,
    isRecording,
  ]);

  const shuffledOptions = useMemo(() => {
    const opts = activePageContent?.checkpoint?.options;
    if (!opts) return [];

    const shuffled = [...opts];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [activePageContent?.checkpoint]);

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
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const resolveAudioUrl = useCallback(
    (s3Key?: string | null) => {
      if (!s3Key) return undefined;
      return book.mediaUrls?.sentenceAudioUrls?.[s3Key] || s3Key;
    },
    [book.mediaUrls?.sentenceAudioUrls]
  );

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

        if (audioRef.current) audioRef.current.pause();
        if (rafRef.current) cancelAnimationFrame(rafRef.current);

        const audio = new Audio(url);
        audio.playbackRate = playbackSpeed;
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
            let matchedIdx = -1;
            for (let i = 0; i < timestamps.length; i++) {
              const ts = timestamps[i];
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

  const runPageNarration = useCallback(
    async (sentences: BookSentence[]) => {
      if (!sentences.length) return;
      sequenceCancelledRef.current = false;
      setIsPlayingPage(true);

      for (let i = 0; i < sentences.length; i++) {
        if (sequenceCancelledRef.current) break;
        setActiveSentenceIdx(i);
        await playSentenceWithWordTracking(sentences[i]);

        if (!sequenceCancelledRef.current && i < sentences.length - 1) {
          await new Promise((r) => setTimeout(r, 380));
        }
      }

      if (!sequenceCancelledRef.current) {
        setIsPlayingPage(false);
        setActiveSentenceIdx(null);
        setActiveWordIdx(null);
      }
    },
    [playSentenceWithWordTracking]
  );

  const handlePlayAllSentences = useCallback(async () => {
    if (isPlayDisabled || !activePageContent?.sentences?.length) return;
    if (isPlayingPage) {
      stopAudio();
      return;
    }
    await runPageNarration(activePageContent.sentences);
  }, [
    isPlayDisabled,
    activePageContent,
    isPlayingPage,
    runPageNarration,
    stopAudio,
  ]);

  const syncProgress = useCallback(
    (
      page: number,
      checkpoints: Set<number>,
      scores: Record<string, PagePronResult> = pagePronScores
    ) => {
      if (!onSaveProgress) return;
      void onSaveProgress({
        bookId: book.id,
        targetLanguage: selectedLang,
        currentPage: page,
        completedCheckpoints: Array.from(checkpoints),
        isFinished: page === outroPage,
        pronunciationScores: scores,
      });
    },
    [book.id, selectedLang, onSaveProgress, outroPage, pagePronScores]
  );

  const handleReadPageAloud = useCallback(async () => {
    if (!activePageContent?.sentences?.length) return;
    stopAudio();

    if (isRecording && recordingTarget === "page") {
      stopRecording();
      setRecordingTarget(null);
      return;
    }

    const referenceText = activePageContent.sentences
      .map((s) => s.textTarget.trim())
      .join(" ");

    setRecordingTarget("page");
    const rawResult = await assessSpeech(referenceText, selectedLang);
    setRecordingTarget(null);

    const parsed = parseAzurePronunciation(rawResult) ?? {
      overallScore: 100,
      wordScores: {},
    };

    playSfx("correct");
    const nextScores = { ...pagePronScores, [pageScoreKey]: parsed };
    setPagePronScores(nextScores);

    const nextSet = new Set(completedCheckpoints);
    nextSet.add(currentPage);
    setCompletedCheckpoints(nextSet);
    syncProgress(currentPage, nextSet, nextScores);
  }, [
    activePageContent,
    stopAudio,
    isRecording,
    recordingTarget,
    stopRecording,
    assessSpeech,
    selectedLang,
    pagePronScores,
    pageScoreKey,
    completedCheckpoints,
    currentPage,
    syncProgress,
  ]);

  const handleCheckpointSpeak = useCallback(async () => {
    const targetPhrase =
      activePageContent?.checkpoint?.speakChallenge?.targetPhrase;
    if (!targetPhrase) return;
    stopAudio();

    if (isRecording && recordingTarget === "checkpoint") {
      stopRecording();
      setRecordingTarget(null);
      return;
    }

    setRecordingTarget("checkpoint");
    const rawResult = await assessSpeech(targetPhrase, selectedLang);
    setRecordingTarget(null);

    const parsed = parseAzurePronunciation(rawResult) ?? {
      overallScore: 100,
      wordScores: {},
    };

    setCheckpointPronResult(parsed);
    playSfx("correct");
    setEmojiBurstKey((prev) => prev + 1);

    const nextSet = new Set(completedCheckpoints);
    nextSet.add(currentPage);
    setCompletedCheckpoints(nextSet);
    syncProgress(currentPage, nextSet);
  }, [
    activePageContent,
    stopAudio,
    isRecording,
    recordingTarget,
    stopRecording,
    assessSpeech,
    selectedLang,
    completedCheckpoints,
    currentPage,
    syncProgress,
  ]);

  useEffect(() => {
    stopAudio();
    cancelAssessment();
    setRecordingTarget(null);
    setCheckpointPronResult(null);
    setActiveVocab(null);
    setSelectedOption(null);
    setEmojiBurstKey(0);

    if (
      readingMode === "listen" &&
      !isAudioMuted &&
      currentPage >= 1 &&
      currentPage <= totalPages &&
      activePageContent?.sentences?.length
    ) {
      const timer = setTimeout(() => {
        void runPageNarration(activePageContent.sentences);
      }, 480);
      return () => clearTimeout(timer);
    }
  }, [
    currentPage,
    selectedLang,
    readingMode,
    isAudioMuted,
    totalPages,
    activePageContent,
    runPageNarration,
    stopAudio,
    cancelAssessment,
  ]);

  const handleTapSentence = useCallback(
    async (index: number, sentence: BookSentence) => {
      if (isPlayDisabled) return;
      stopAudio();
      sequenceCancelledRef.current = false;
      setActiveSentenceIdx(index);
      await playSentenceWithWordTracking(sentence);
      if (!sequenceCancelledRef.current) {
        setActiveSentenceIdx(null);
        setActiveWordIdx(null);
      }
    },
    [isPlayDisabled, playSentenceWithWordTracking, stopAudio]
  );

  const handleTapVocab = useCallback(
    (defn: PageDefinition) => {
      playSfx("tap");
      stopAudio();
      setActiveVocab(defn);
      playVocabAudio(defn.audioS3Key || defn.audioUrl);
    },
    [playVocabAudio, stopAudio]
  );

  const handleNextPage = () => {
    if (currentPage >= outroPage) return;
    const nextPage = currentPage + 1;
    playSfx(nextPage === outroPage ? "victory" : "tap");

    if (isMusicEnabled && !isAudioMuted && ambientAudioRef.current?.paused) {
      ambientAudioRef.current.volume = 0.1;
      void ambientAudioRef.current.play().catch(() => {});
    }

    setCurrentPage(nextPage);
    setIsCheckpointDrawerOpen(false);
    setSelectedOption(null);
    setEmojiBurstKey(0);
    syncProgress(nextPage, completedCheckpoints);
  };

  const handlePrevPage = () => {
    if (currentPage <= 0) return;
    playSfx("tap");
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
    currentPage >= 1 &&
    currentPage <= totalPages &&
    (readingMode === "read" ? !hasReadCurrentPageAloud : !isCurrentPageSolved);

  const pageVocabSet = useMemo(() => {
    const map = new Map<string, PageDefinition>();
    for (const d of activePageContent?.definitions || []) {
      map.set(d.word.toLowerCase().replace(/[.,!?'"«»]/g, ""), d);
    }
    return map;
  }, [activePageContent?.definitions]);

  const getWordPronClass = (wordToken: string, flatWordIdx: number) => {
    if (!currentPagePron) return null;
    const key = cleanTokenKey(wordToken);
    const entry =
      currentPagePron.wordScores[`idx:${flatWordIdx}`] ||
      currentPagePron.wordScores[key];
    if (!entry) return null;

    if (entry.accuracy >= 80 && entry.errorType !== "Omission") {
      return "bg-emerald-500/35 text-emerald-200 ring-1 ring-emerald-400/70";
    }
    if (entry.accuracy >= 60 && entry.errorType !== "Omission") {
      return "bg-amber-400/35 text-amber-100 ring-1 ring-amber-300/80";
    }
    return "bg-rose-500/40 text-rose-100 underline decoration-rose-400 decoration-wavy underline-offset-4 ring-1 ring-rose-400/80";
  };

  let runningFlatWordIdx = 0;

  return (
    <div className="relative flex min-h-[calc(100dvh-3rem)] md:min-h-dvh w-full flex-col overflow-x-hidden bg-slate-100/90 text-slate-900">
      {/* DYNAMIC AMBILIGHT CINEMA BACKDROP */}
      {ambientBackdropUrl && (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <img
            key={`amb-${currentPage}-${ambientBackdropUrl}`}
            src={ambientBackdropUrl}
            alt=""
            className="h-full w-full scale-125 object-cover opacity-30 blur-[90px] saturate-150 transition-all duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/50 via-transparent to-slate-100/80" />
        </div>
      )}

      {/* =====================================================================
          1. 3D TACTILE HEADER BAR (Compact on mobile so nothing clips off right)
          ===================================================================== */}
      <header className="sticky top-0 z-20 flex h-12 sm:h-14 w-full items-center justify-between gap-2 border-b border-slate-200/70 bg-white/90 px-2.5 backdrop-blur-md sm:px-8">
        <button
          type="button"
          onClick={() => {
            ambientAudioRef.current?.pause();
            onBackToLibrary();
          }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border-2 border-b-[3px] border-slate-200 bg-white px-2.5 py-1.5 sm:px-3.5 text-xs font-black text-slate-700 transition hover:border-sky-300 active:translate-y-0.5 active:border-b-0"
          title="Back to Bookshelf"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Bookshelf</span>
        </button>

        {/* Center Title + Progress Pills */}
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <span className="max-w-full truncate text-[11px] font-black text-slate-900 sm:max-w-md sm:text-sm">
            {currentTranslation?.title || book.slug}
          </span>
          <div className="flex items-center gap-1 sm:gap-1.5">
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pNum = idx + 1;
              const isCurrent = currentPage === pNum;
              const isDone = completedCheckpoints.has(pNum);
              return (
                <div
                  key={pNum}
                  className={`h-1.5 rounded-full transition-all ${
                    isCurrent
                      ? "w-5 sm:w-7 bg-gradient-to-r from-sky-500 to-emerald-500"
                      : isDone
                        ? "w-2 sm:w-2.5 bg-emerald-400"
                        : "w-1.5 sm:w-2 bg-slate-200"
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* Mobile compact Read/Listen switch */}
          <button
            type="button"
            onClick={() =>
              setReadingMode((m) => (m === "read" ? "listen" : "read"))
            }
            className={`inline-flex items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-black text-white md:hidden ${
              readingMode === "read" ? "bg-emerald-500" : "bg-blue-600"
            }`}
            title={
              readingMode === "read"
                ? "Switch to Listen Along"
                : "Switch to Read Along"
            }
          >
            {readingMode === "read" ? (
              <Mic className="h-3.5 w-3.5" />
            ) : (
              <Headphones className="h-3.5 w-3.5" />
            )}
          </button>

          {/* Desktop Read/Listen switch */}
          <div className="hidden items-center rounded-xl bg-slate-100 p-1 ring-1 ring-slate-200/70 md:flex">
            <button
              type="button"
              onClick={() => setReadingMode("read")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-black transition ${
                readingMode === "read"
                  ? "bg-emerald-500 text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="You read each page out loud"
            >
              <Mic className="h-3.5 w-3.5" />
              <span>Read Along</span>
            </button>
            <button
              type="button"
              onClick={() => setReadingMode("listen")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-black transition ${
                readingMode === "listen"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Narrator reads each page to you"
            >
              <Headphones className="h-3.5 w-3.5" />
              <span>Listen Along</span>
            </button>
          </div>

          <div className="hidden items-center gap-0.5 rounded-xl bg-slate-100 p-1 ring-1 ring-slate-200/70 sm:flex">
            <Gauge className="mx-1.5 h-3.5 w-3.5 text-blue-600" />
            {SPEED_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPlaybackSpeed(opt.value)}
                className={`rounded-lg px-2 py-0.5 text-[11px] font-black transition ${
                  playbackSpeed === opt.value
                    ? "bg-white text-blue-700 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {opt.label}
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
              className="rounded-xl bg-slate-100 px-2 py-1.5 sm:px-3 text-[11px] sm:text-xs font-black text-blue-700 uppercase focus:outline-none"
            >
              {availableLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang.split("-")[0].toUpperCase()}
                </option>
              ))}
            </select>
          ) : (
            <div
              className="hidden sm:inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600"
              title="Multi-language editions unlocked on Unlimited+"
            >
              <Globe2 className="h-3.5 w-3.5 text-sky-500" />
              <span>{selectedLang.split("-")[0].toUpperCase()}</span>
              <Lock className="h-3 w-3 text-amber-500" />
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsMusicEnabled((prev) => !prev)}
            className={`rounded-xl p-1.5 sm:p-2 transition ${
              isMusicEnabled
                ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                : "bg-slate-100 text-slate-400 hover:bg-slate-200"
            }`}
            title={
              isMusicEnabled ? "Turn reading music off" : "Turn reading music on"
            }
          >
            <Music className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsAudioMuted((prev) => !prev)}
            className="rounded-xl bg-slate-100 p-1.5 sm:p-2 text-slate-700 transition hover:bg-slate-200"
            title={isAudioMuted ? "Unmute" : "Mute"}
          >
            {isAudioMuted ? (
              <VolumeX className="h-4 w-4 text-rose-500" />
            ) : (
              <Volume2 className="h-4 w-4 text-blue-600" />
            )}
          </button>
        </div>
      </header>

      {/* =====================================================================
          2. MAIN CINEMA STORYBOOK STAGE
          ===================================================================== */}
      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-3 py-3 sm:px-6">
        <AnimatePresence mode="wait">
          {currentPage === 0 ? (
            /* ================= PAGE 0: CINEMATIC COVER (Stacks cleanly on mobile!) ================= */
            <motion.div
              key="book-intro"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="relative w-full overflow-hidden rounded-3xl sm:rounded-[2.25rem] border-2 border-b-[6px] border-slate-900 bg-slate-950 shadow-2xl"
            >
              <div className="relative w-full bg-slate-950 sm:aspect-[16/9] sm:min-h-[440px]">
                {/* Cover Art / Intro Video: 16:10 hero on mobile, full bleed on sm+ */}
                <div className="relative aspect-[16/10] w-full overflow-hidden sm:absolute sm:inset-0 sm:aspect-auto">
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
                    <motion.img
                      src={
                        book.mediaUrls?.coverImageUrl || book.characterAvatarUrl
                      }
                      alt={currentTranslation?.title}
                      animate={{ scale: [1.0, 1.06] }}
                      transition={{
                        duration: 14,
                        repeat: Infinity,
                        repeatType: "reverse",
                        ease: "easeInOut",
                      }}
                      className="h-full w-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-black/30 to-transparent sm:from-black/95 sm:via-black/45" />
                </div>

                {/* Cover Content: stacked below art on mobile, overlaid at bottom on sm+ */}
                <div className="relative -mt-6 flex flex-col items-start justify-end px-4 pt-2 pb-5 text-white sm:absolute sm:inset-x-0 sm:bottom-0 sm:mt-0 sm:p-10">
                  <div className="mb-2.5 flex items-center gap-2">
                    <span className="rounded-lg bg-emerald-400 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-[11px] font-black tracking-wide text-slate-950 uppercase">
                      {book.levelBand}
                    </span>
                    <span className="rounded-lg bg-white/20 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-[11px] font-bold text-white capitalize backdrop-blur-md">
                      {book.genre}
                    </span>
                  </div>

                  <h1 className="text-2xl font-black leading-tight tracking-tight drop-shadow-md sm:text-5xl">
                    {currentTranslation?.title}
                  </h1>
                  <p className="mt-1.5 max-w-2xl text-xs font-medium leading-relaxed text-white/85 sm:mt-2 sm:text-base sm:text-white/90">
                    {currentTranslation?.synopsis}
                  </p>

                  {/* CHOOSE HOW TO EXPERIENCE THIS STORY */}
                  <div className="mt-4 sm:mt-5 grid w-full max-w-xl grid-cols-1 gap-2 sm:gap-2.5 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setReadingMode("read")}
                      className={`flex items-center gap-3 rounded-2xl border-2 border-b-4 p-2.5 sm:p-3 text-left transition-all ${
                        readingMode === "read"
                          ? "border-emerald-400 bg-emerald-950/85 text-white shadow-lg"
                          : "border-white/20 bg-white/10 text-white/75 backdrop-blur-md hover:bg-white/15"
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl ${
                          readingMode === "read"
                            ? "bg-emerald-400 text-slate-950"
                            : "bg-white/15 text-white"
                        }`}
                      >
                        <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide">
                          Read Along (You Speak)
                        </p>
                        <p className="text-[11px] text-white/75">
                          Read each page out loud with live word highlights
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReadingMode("listen")}
                      className={`flex items-center gap-3 rounded-2xl border-2 border-b-4 p-2.5 sm:p-3 text-left transition-all ${
                        readingMode === "listen"
                          ? "border-sky-400 bg-sky-950/85 text-white shadow-lg"
                          : "border-white/20 bg-white/10 text-white/75 backdrop-blur-md hover:bg-white/15"
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl ${
                          readingMode === "listen"
                            ? "bg-sky-400 text-slate-950"
                            : "bg-white/15 text-white"
                        }`}
                      >
                        <Headphones className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide">
                          Listen Along (AI Narrator)
                        </p>
                        <p className="text-[11px] text-white/75">
                          Narrator reads to you • Answer checkpoints
                        </p>
                      </div>
                    </button>
                  </div>

                  <div className="mt-4 sm:mt-5 flex w-full flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <div className="flex w-fit items-center gap-2.5 rounded-full border border-white/15 bg-white/15 py-1 pr-3.5 pl-1.5 backdrop-blur-md">
                      <img
                        src={book.characterAvatarUrl}
                        alt={book.characterName}
                        className="h-7 w-7 sm:h-8 sm:w-8 rounded-full object-cover ring-2 ring-emerald-400"
                      />
                      <span className="text-xs font-extrabold text-white">
                        Starring {book.characterName}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleNextPage}
                      className="inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-2xl border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 px-8 py-3.5 sm:py-4 text-sm font-black text-white shadow-xl shadow-emerald-500/30 transition-all hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:border-b-0 sm:text-base"
                    >
                      {readingMode === "read" ? (
                        <Mic className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4 fill-current" />
                      )}
                      <span>
                        {readingMode === "read"
                          ? "Start Read-Along"
                          : "Start Listen-Along"}
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : currentPage >= 1 && currentPage <= totalPages ? (
            /* ================= PAGES 1..N: CLEAN STACK ON MOBILE, CINEMA OVERLAY ON DESKTOP ================= */
            <motion.div
              key={`page-${currentPage}`}
              initial={{ opacity: 0, y: 12, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="flex w-full flex-col gap-3"
            >
              <div className="relative w-full overflow-hidden rounded-3xl sm:rounded-[2.25rem] border-2 border-b-[6px] border-slate-900/90 bg-slate-950 shadow-2xl sm:aspect-[16/9]">
                {/* Illustration Area: unobstructed 16:10 on mobile, full bleed on sm+ */}
                <div className="relative aspect-[16/10] w-full overflow-hidden sm:absolute sm:inset-0 sm:aspect-auto">
                  <motion.img
                    key={`art-${currentPage}-${activePageImageUrl}`}
                    src={activePageImageUrl}
                    alt={`Page ${currentPage}`}
                    animate={cameraMotion}
                    transition={{
                      duration: 16,
                      repeat: Infinity,
                      repeatType: "reverse",
                      ease: "easeInOut",
                    }}
                    className="h-full w-full object-cover will-change-transform"
                  />

                  <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/50 to-transparent" />
                  <div
                    className={`pointer-events-none absolute inset-x-0 bottom-0 transition-all duration-500 ${
                      isAudioActive || isRecording
                        ? "h-16 bg-gradient-to-t from-slate-950 to-transparent sm:h-60 sm:from-slate-950/95 sm:via-slate-950/80"
                        : "h-16 bg-gradient-to-t from-slate-950 to-transparent sm:h-48 sm:from-slate-950/90 sm:via-slate-950/55"
                    }`}
                  />

                  {/* Top Badges inside Illustration */}
                  <div className="absolute inset-x-3 top-3 sm:inset-x-4 sm:top-4 z-10 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="rounded-xl border border-white/15 bg-slate-950/75 px-2.5 py-1 sm:px-3.5 text-[11px] sm:text-xs font-black text-white shadow-sm backdrop-blur-md">
                        Page {currentPage} of {totalPages}
                      </span>

                      {currentPagePron && (
                        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/50 bg-emerald-950/80 px-3 py-1 text-xs font-black text-emerald-300 shadow-sm backdrop-blur-md">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>
                            Read Aloud ({currentPagePron.overallScore}%) • Tap
                            any word to hear
                          </span>
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        playSfx("tap");
                        setIsCheckpointDrawerOpen(true);
                      }}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border-b-[3px] px-3 py-1.5 sm:px-4 text-[11px] sm:text-xs font-black shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-0 ${
                        isCurrentPageSolved
                          ? "border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white"
                          : "border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950"
                      }`}
                    >
                      {isCurrentPageSolved ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Solved</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Checkpoint</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* CINEMA SUBTITLE STAGE: Cleanly stacked below art on mobile, overlaid on sm+ */}
                <div className="relative z-10 flex flex-col gap-3 bg-slate-950 px-4 pt-2 pb-4 sm:absolute sm:inset-x-7 sm:bottom-5 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:bg-transparent sm:p-0">
                  <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center gap-3">
                    {/* Controls Row on mobile (stays side-by-side with text on sm+) */}
                    <div className="flex items-center justify-between sm:justify-start gap-2.5 shrink-0">
                      <div className="flex items-center gap-2">
                        {readingMode === "read" && (
                          <button
                            type="button"
                            onClick={handleReadPageAloud}
                            className={`flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl border-b-4 shadow-xl transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-0 ${
                              recordingTarget === "page" &&
                              pronStatus === "listening"
                                ? "animate-pulse border-rose-800 bg-gradient-to-b from-rose-400 to-rose-600 text-white"
                                : recordingTarget === "page" &&
                                    pronStatus === "analyzing"
                                  ? "border-amber-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950"
                                  : "border-emerald-800 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white"
                            }`}
                            title="Tap and read this page out loud"
                          >
                            {recordingTarget === "page" &&
                            pronStatus === "analyzing" ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <Mic className="h-5 w-5" />
                            )}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={handlePlayAllSentences}
                          disabled={isPlayDisabled}
                          className={`flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl border-b-4 shadow-xl transition-all ${
                            isPlayDisabled
                              ? "cursor-not-allowed border-slate-700 bg-slate-800/80 text-slate-500"
                              : isPlayingPage
                                ? "border-rose-800 bg-gradient-to-b from-rose-400 to-rose-600 text-white hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-0"
                                : "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-0"
                          }`}
                          title={
                            isPlayDisabled
                              ? "Read this page out loud first to unlock narrator audio"
                              : isPlayingPage
                                ? "Stop narrator"
                                : "Listen to narrator"
                          }
                        >
                          {isPlayingPage ? (
                            <Square className="h-4 w-4 fill-current" />
                          ) : (
                            <Play className="ml-0.5 h-5 w-5 fill-current" />
                          )}
                        </button>

                        {currentPagePron && (
                          <span className="inline-flex sm:hidden items-center gap-1 rounded-xl border border-emerald-400/40 bg-emerald-950/80 px-2.5 py-1 text-[11px] font-black text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" />
                            {currentPagePron.overallScore}%
                          </span>
                        )}
                      </div>

                      {/* Hide EN button moves into controls row on mobile */}
                      <button
                        type="button"
                        onClick={() => setShowTranslations((prev) => !prev)}
                        className="sm:hidden shrink-0 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-black text-white/90"
                      >
                        {showTranslations ? "Hide EN" : "Show EN"}
                      </button>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      {readingMode === "read" &&
                        !hasReadCurrentPageAloud &&
                        pronStatus === "idle" && (
                          <p className="text-[11px] sm:text-xs font-black tracking-wide text-emerald-300 uppercase">
                            🎙️ Tap the Mic &amp; read out loud to continue
                          </p>
                        )}

                      {recordingTarget === "page" && pronStatus !== "idle" && (
                        <p className="text-[11px] sm:text-xs font-black tracking-wide text-amber-300 uppercase">
                          {pronStatus === "listening"
                            ? "🎙️ Listening... Tap mic when finished"
                            : "✨ Highlighting your pronunciation..."}
                        </p>
                      )}

                      <div className="text-base leading-relaxed font-black tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] sm:text-xl sm:leading-snug md:text-2xl">
                        {activePageContent?.sentences.map((sent, sIdx) => {
                          const isSentenceActive = activeSentenceIdx === sIdx;
                          const words = sent.textTarget.trim().split(/\s+/);

                          return (
                            <span
                              key={sent.sentenceIndex ?? sIdx}
                              onClick={() => handleTapSentence(sIdx, sent)}
                              className={`mr-2 inline rounded-lg px-0.5 py-0.5 transition-opacity sm:mr-2.5 sm:px-1 ${
                                isPlayDisabled
                                  ? "cursor-default"
                                  : "cursor-pointer"
                              } ${
                                activeSentenceIdx !== null && !isSentenceActive
                                  ? "opacity-65 hover:opacity-100"
                                  : "opacity-100"
                              }`}
                            >
                              {words.map((wordToken, wIdx) => {
                                const flatIdx = runningFlatWordIdx++;
                                const isWordHighlighted =
                                  isSentenceActive && activeWordIdx === wIdx;
                                const cleanToken = wordToken
                                  .toLowerCase()
                                  .replace(/[.,!?'"«»]/g, "");
                                const matchedDefn =
                                  pageVocabSet.get(cleanToken);
                                const pronClass = getWordPronClass(
                                  wordToken,
                                  flatIdx
                                );

                                return (
                                  <span
                                    key={wIdx}
                                    onClick={(e) => {
                                      if (matchedDefn) {
                                        e.stopPropagation();
                                        handleTapVocab(matchedDefn);
                                      }
                                    }}
                                    className={`mr-1 inline-block rounded-lg px-1 py-0.5 transition-all duration-150 sm:px-1.5 ${
                                      isWordHighlighted
                                        ? "-translate-y-0.5 scale-105 bg-amber-300 text-slate-950 shadow-[0_0_20px_rgba(252,211,77,0.65)]"
                                        : pronClass
                                          ? pronClass
                                          : matchedDefn
                                            ? "text-emerald-300 underline decoration-emerald-400 decoration-2 underline-offset-4 hover:bg-white/15"
                                            : "hover:text-sky-300"
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
                        <p className="text-xs font-semibold leading-relaxed text-slate-300/95 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] sm:text-sm">
                          {activePageContent?.sentences
                            .map((s) => s.textNative)
                            .join(" ")}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Desktop Hide EN button */}
                  <button
                    type="button"
                    onClick={() => setShowTranslations((prev) => !prev)}
                    className="hidden sm:inline-flex shrink-0 rounded-xl border border-white/20 bg-black/50 px-3 py-1.5 text-[10px] font-black text-white/90 backdrop-blur-md transition hover:bg-black/75"
                  >
                    {showTranslations ? "Hide EN" : "Show EN"}
                  </button>
                </div>
              </div>

              {/* BOTTOM BAR: WORD SPOTLIGHT + PAGE NAVIGATION */}
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3 rounded-2xl sm:rounded-3xl border-2 border-b-[5px] border-slate-200/90 border-b-slate-300 bg-white/95 px-3.5 py-3 sm:px-4 shadow-md backdrop-blur-md">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-[11px] font-black tracking-wide text-emerald-800 uppercase">
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
                        className={`inline-flex max-w-full flex-wrap items-center gap-1.5 sm:gap-2 rounded-2xl border-2 border-b-4 px-3 py-1.5 sm:px-3.5 text-xs transition-all active:translate-y-0.5 active:border-b-2 sm:text-sm ${
                          isSelected
                            ? "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-sm"
                            : "border-slate-200 border-b-slate-300 bg-slate-50/90 text-slate-900 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-white"
                        }`}
                      >
                        <Volume2
                          className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${
                            isSelected ? "text-white" : "text-blue-600"
                          }`}
                        />
                        <span className="font-black">{defn.word}</span>
                        {defn.phonetic && (
                          <span
                            className={`text-[11px] sm:text-xs font-semibold ${
                              isSelected ? "text-sky-100" : "text-slate-400"
                            }`}
                          >
                            /{defn.phonetic}/
                          </span>
                        )}
                        <span
                          className={`rounded-lg px-2 py-0.5 text-[11px] sm:text-xs font-black ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {defn.translation}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex w-full sm:w-auto sm:ml-auto items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevPage}
                    className="inline-flex flex-1 sm:flex-initial items-center justify-center gap-1 rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition-all hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0.5 active:border-b-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Previous</span>
                  </button>

                  {isCurrentPageGated ? (
                    readingMode === "read" ? (
                      <button
                        type="button"
                        onClick={handleReadPageAloud}
                        className={`inline-flex flex-[1.5] sm:flex-initial items-center justify-center gap-2 rounded-2xl border-b-4 px-4 sm:px-5 py-2.5 text-xs font-black shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-0 ${
                          recordingTarget === "page" &&
                          pronStatus === "listening"
                            ? "animate-pulse border-rose-800 bg-gradient-to-b from-rose-400 to-rose-600 text-white"
                            : "border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950 shadow-amber-500/20"
                        }`}
                      >
                        <Mic className="h-4 w-4 shrink-0" />
                        <span className="truncate">
                          {recordingTarget === "page" &&
                          pronStatus === "listening"
                            ? "Tap When Done"
                            : "Read Aloud to Continue"}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          playSfx("tap");
                          setIsCheckpointDrawerOpen(true);
                        }}
                        className="inline-flex flex-[1.5] sm:flex-initial items-center justify-center gap-2 rounded-2xl border-b-4 border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 px-4 sm:px-5 py-2.5 text-xs font-black text-slate-950 shadow-md shadow-amber-500/20 transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0"
                      >
                        <HelpCircle className="h-4 w-4 shrink-0" />
                        <span>Answer Checkpoint</span>
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={handleNextPage}
                      className="inline-flex flex-[1.5] sm:flex-initial items-center justify-center gap-1.5 rounded-2xl border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 px-5 sm:px-6 py-2.5 text-xs font-black text-white shadow-md shadow-emerald-500/25 transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0"
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
            /* ================= OUTRO: 3D COMPLETION CARD ================= */
            <motion.div
              key="book-outro"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="mx-auto flex w-full max-w-md flex-col items-center space-y-6 rounded-3xl border-2 border-b-[6px] border-slate-200 bg-white p-8 text-center shadow-xl"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl border-b-[5px] border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 text-2xl font-black text-slate-950 shadow-lg">
                {totalPages}/{totalPages}
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900">
                  Story Completed! 🏆
                </h2>
                <p className="text-sm leading-relaxed text-slate-600">
                  You finished all {totalPages} pages of{" "}
                  <span className="font-bold text-blue-600">
                    {currentTranslation?.title}
                  </span>
                  . Marked as <strong>Read</strong> on your bookshelf!
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    playSfx("tap");
                    setCurrentPage(1);
                    setCompletedCheckpoints(new Set());
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-white py-3.5 text-xs font-black text-slate-700 transition hover:bg-slate-50 active:translate-y-0.5 active:border-b-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Read Story Again</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    ambientAudioRef.current?.pause();
                    onBackToLibrary();
                  }}
                  className="w-full rounded-2xl border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 py-3.5 text-xs font-black text-white shadow-lg shadow-emerald-500/25 transition hover:brightness-105 active:translate-y-0.5 active:border-b-0"
                >
                  Back to Bookshelf
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* =====================================================================
          3. CHECKPOINT DRAWER (Zero Score Punishment on Speak Challenges)
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
              className="fixed inset-0 z-40 bg-slate-900/35 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="fixed inset-x-3 bottom-3 z-50 mx-auto max-h-[85dvh] w-auto max-w-xl overflow-y-auto rounded-[2rem] border-2 border-b-[6px] border-slate-200 bg-white p-5 shadow-2xl sm:inset-x-0 sm:bottom-5 sm:w-full sm:p-7"
            >
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
                        className="absolute top-0 text-2xl select-none sm:text-3xl"
                      >
                        {item.emoji}
                      </motion.span>
                    ))}
                  </div>
                )}
              </AnimatePresence>

              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-0.5 text-[10px] font-black tracking-wide text-blue-700 uppercase">
                    <Sparkles className="h-3 w-3" />
                    Page {currentPage} Challenge
                  </span>
                  <h3 className="mt-1.5 text-base font-extrabold text-slate-900 sm:text-lg">
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
              shuffledOptions.length > 0 ? (
                <div className="space-y-2.5">
                  {shuffledOptions.map((opt, i) => {
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
                            playSfx("correct");
                            setEmojiBurstKey((prev) => prev + 1);
                            handleCompleteCurrentCheckpoint();
                          } else {
                            playSfx("wrong");
                            setWrongShakeKey((prev) => prev + 1);
                          }
                        }}
                        className={`flex w-full items-center justify-between rounded-2xl border-2 border-b-4 px-4 py-3.5 text-left text-sm font-black transition-all duration-150 ${
                          isCorrectSelection
                            ? "border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/25"
                            : isWrongSelection
                              ? "border-rose-400 bg-rose-50 text-rose-900"
                              : "border-slate-200 border-b-slate-300 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-sky-300"
                        }`}
                      >
                        <span>{opt.text}</span>
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black transition-all ${
                            isCorrectSelection
                              ? "scale-110 bg-white/25 text-white"
                              : isWrongSelection
                                ? "bg-rose-200 text-rose-800"
                                : "bg-slate-100 text-slate-400"
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
                    <p className="flex flex-wrap items-center justify-center gap-1.5 text-lg font-black text-sky-900">
                      {(
                        activePageContent.checkpoint.speakChallenge
                          ?.targetPhrase || ""
                      )
                        .split(/\s+/)
                        .filter(Boolean)
                        .map((w, idx) => {
                          const entry =
                            checkpointPronResult?.wordScores[`idx:${idx}`] ||
                            checkpointPronResult?.wordScores[cleanTokenKey(w)];
                          const pillClass = !entry
                            ? ""
                            : entry.accuracy >= 80
                              ? "rounded-lg bg-emerald-100 px-1.5 py-0.5 text-emerald-800 ring-1 ring-emerald-300"
                              : entry.accuracy >= 60
                                ? "rounded-lg bg-amber-100 px-1.5 py-0.5 text-amber-900 ring-1 ring-amber-300"
                                : "rounded-lg bg-rose-100 px-1.5 py-0.5 text-rose-800 underline decoration-wavy ring-1 ring-rose-300";
                          return (
                            <span key={idx} className={pillClass}>
                              {w}
                            </span>
                          );
                        })}
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
                    onClick={handleCheckpointSpeak}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 py-3.5 text-sm font-black transition ${
                      recordingTarget === "checkpoint" &&
                      pronStatus === "listening"
                        ? "animate-pulse border-rose-800 bg-gradient-to-b from-rose-400 to-rose-600 text-white"
                        : isCurrentPageSolved
                          ? "border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/25"
                          : "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white"
                    }`}
                  >
                    {recordingTarget === "checkpoint" &&
                    pronStatus === "analyzing" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Highlighting Pronunciation...</span>
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4" />
                        <span>
                          {recordingTarget === "checkpoint" &&
                          pronStatus === "listening"
                            ? "Listening... Tap when done"
                            : isCurrentPageSolved
                              ? "Great Job Reading! 🎉"
                              : "Tap & Read Phrase Out Loud"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}

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
                      🎉 Challenge complete! You&apos;re ready for the next page.
                    </p>
                  ) : (
                    <p className="font-medium text-slate-400">
                      Complete the challenge above to unlock the next page...
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  disabled={!isCurrentPageSolved}
                  onClick={handleNextPage}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-2xl px-5 py-2.5 text-xs font-black transition-all ${
                    isCurrentPageSolved
                      ? "border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-md shadow-emerald-500/20 hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-0"
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