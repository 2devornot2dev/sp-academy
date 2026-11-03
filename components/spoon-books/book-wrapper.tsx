// components/books/book-wrapper.tsx
"use client";

import { useState, useMemo, useCallback, useRef } from "react";
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
  BookOpen,
  Mic,
} from "lucide-react";
import { useSprite } from "@/context/sprite-context";
import type {
  SpoonBookWebhookPayload,
  LocalizedPage, // 👈 Changed from LocalizedPageContent
  CheckpointOption,
} from "@/lib/schema/book-schema";

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

  // 1. LANGUAGE LOCKING LOGIC
  const defaultLang = profile?.targetLanguage || "fr-FR";
  const availableLanguages = Object.keys(book.translations || {});
  const [selectedLang, setSelectedLang] = useState<string>(
    book.translations[defaultLang]
      ? defaultLang
      : availableLanguages[0] || "fr-FR"
  );

  const isMultiLangUnlocked =
    userPlan === "unlimited" || userPlan === "enterprise";

  // 2. ACTIVE LOCALIZED SCRIPT & DYNAMIC PAGE COUNT
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

  // 3. MASTER PAGE STATE (0 = Intro, 1..totalPages = Story Pages, outroPage = Outro)
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [completedCheckpoints, setCompletedCheckpoints] = useState<Set<number>>(
    new Set(initialCompletedCheckpoints)
  );
  const [isCheckpointOverlayOpen, setIsCheckpointOverlayOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<CheckpointOption | null>(
    null
  );
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [playingAudioKey, setPlayingAudioKey] = useState<string | null>(null);

  const playAudioByKey = useCallback(
    (s3Key?: string) => {
      if (!s3Key || isAudioMuted) return;
      const url = book.mediaUrls?.sentenceAudioUrls?.[s3Key] || s3Key;
      if (!url) return;

      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      setPlayingAudioKey(s3Key);
      audio.onended = () => setPlayingAudioKey(null);
      audio.onerror = () => setPlayingAudioKey(null);
      void audio.play().catch(() => setPlayingAudioKey(null));
    },
    [book.mediaUrls?.sentenceAudioUrls, isAudioMuted]
  );

  // Sync progress silently to database
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
    setIsCheckpointOverlayOpen(false);
    setSelectedOption(null);
    syncProgress(nextPage, completedCheckpoints);
  };

  const handlePrevPage = () => {
    if (currentPage <= 0) return;
    const prevPage = currentPage - 1;
    setCurrentPage(prevPage);
    setIsCheckpointOverlayOpen(false);
    setSelectedOption(null);
    syncProgress(prevPage, completedCheckpoints);
  };

  const handleCompleteCurrentCheckpoint = () => {
    if (currentPage < 1 || currentPage > totalPages) return;
    const nextSet = new Set(completedCheckpoints);
    nextSet.add(currentPage);
    setCompletedCheckpoints(nextSet);
    syncProgress(currentPage, nextSet);
  };

  const isCurrentPageGated =
    currentPage >= 1 &&
    currentPage <= totalPages &&
    !completedCheckpoints.has(currentPage);

  const activePageContent: LocalizedPage | undefined =
    currentPage >= 1 && currentPage <= totalPages
      ? currentTranslation?.pages?.[currentPage - 1]
      : undefined;

  const activePageImageUrl =
    book.mediaUrls?.pageImageUrls?.[currentPage - 1] ||
    book.pageImageS3Keys?.[currentPage - 1];

  return (
    <div className="relative z-30 flex h-screen w-full flex-col overflow-hidden bg-[#0A0E17] font-sans text-white selection:bg-teal-500/30">
      {/* =====================================================================
          1. TOP MINIMAL CHROME BAR
          ===================================================================== */}
      <header className="relative z-20 flex h-12 w-full shrink-0 items-center justify-between border-b border-white/10 bg-[#0C121E]/95 px-4 backdrop-blur-md">
        <button
          type="button"
          onClick={onBackToLibrary}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Bookshelf</span>
        </button>

        <div className="flex max-w-[50%] items-center gap-2 truncate text-center">
          <BookOpen className="h-4 w-4 shrink-0 text-teal-400" />
          <span className="truncate text-xs font-black text-white">
            {currentTranslation?.title || book.slug}
          </span>
          <span className="shrink-0 rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-300">
            {currentPage === 0
              ? "Intro"
              : currentPage === outroPage
                ? "Outro"
                : `${currentPage} / ${totalPages}`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            {isMultiLangUnlocked ? (
              <select
                value={selectedLang}
                onChange={(e) => {
                  setSelectedLang(e.target.value);
                  setCurrentPage(0);
                }}
                className="rounded-lg border border-white/15 bg-slate-900 px-2 py-1 text-[11px] font-black text-teal-300 uppercase focus:outline-none"
              >
                {availableLanguages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang.split("-")[0].toUpperCase()}
                  </option>
                ))}
              </select>
            ) : (
              <div
                className="inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-white/10 bg-slate-900/80 px-2.5 py-1 text-[10px] font-bold text-slate-400"
                title="Multi-language book editions unlocked on Spoon Unlimited+"
              >
                <Globe2 className="h-3 w-3 text-teal-400" />
                <span>{selectedLang.split("-")[0].toUpperCase()}</span>
                <Lock className="ml-0.5 h-2.5 w-2.5 text-amber-400/80" />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsAudioMuted((prev) => !prev)}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            title={isAudioMuted ? "Unmute audio" : "Mute audio"}
          >
            {isAudioMuted ? (
              <VolumeX className="h-4 w-4 text-rose-400" />
            ) : (
              <Volume2 className="h-4 w-4 text-teal-400" />
            )}
          </button>
        </div>
      </header>

      {/* =====================================================================
          2. MAIN FULL-STAGE VIEWPORT
          ===================================================================== */}
      <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          {currentPage === 0 ? (
            /* ================= PAGE 0: BOOK INTRO ================= */
            <motion.div
              key="book-intro"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="my-auto flex w-full max-w-xl flex-1 flex-col justify-between p-6 text-center"
            >
              <div className="my-auto space-y-4">
                <div className="relative mx-auto aspect-[5/4] w-full max-w-md overflow-hidden rounded-3xl border-2 border-teal-500/30 bg-slate-900 shadow-2xl">
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
                        book.mediaUrls?.coverImageUrl ||
                        book.characterAvatarUrl
                      }
                      alt={currentTranslation?.title}
                      className="h-full w-full object-cover"
                    />
                  )}

                  <div className="absolute top-3 left-3 rounded-full border border-white/15 bg-slate-950/80 px-3 py-1 text-[10px] font-black tracking-wider text-teal-300 uppercase backdrop-blur-md">
                    Starring {book.characterName}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                    {currentTranslation?.title}
                  </h1>
                  <p className="mx-auto max-w-md text-xs leading-relaxed font-medium text-slate-300 sm:text-sm">
                    {currentTranslation?.synopsis}
                  </p>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleNextPage}
                  className="inline-flex w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-400 to-indigo-500 px-6 py-4 text-sm font-black text-slate-950 shadow-xl transition hover:brightness-110 active:scale-[0.98]"
                >
                  <span>Open Storybook</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ) : currentPage >= 1 && currentPage <= totalPages ? (
            /* ================= PAGES 1..N: STORY PAGE ================= */
            <motion.div
              key={`page-${currentPage}`}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="flex w-full max-w-2xl flex-1 flex-col justify-between overflow-y-auto p-4 sm:p-6"
            >
              {/* Top 3D Scene Illustration */}
              <div className="relative mx-auto aspect-[5/4] w-full max-w-lg shrink-0 overflow-hidden rounded-3xl border border-white/15 bg-slate-900 shadow-2xl">
                {activePageImageUrl && (
                  <img
                    src={activePageImageUrl}
                    alt={`Page ${currentPage}`}
                    className="h-full w-full object-cover"
                  />
                )}

                <div className="absolute top-3 right-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black tracking-wider uppercase backdrop-blur-md ${
                      completedCheckpoints.has(currentPage)
                        ? "border border-teal-400/40 bg-teal-400/20 text-teal-300"
                        : "animate-pulse border border-amber-300/40 bg-amber-400/20 text-amber-300"
                    }`}
                  >
                    <Sparkles className="h-3 w-3" />
                    {completedCheckpoints.has(currentPage)
                      ? "Checkpoint Solved"
                      : "Checkpoint Required"}
                  </span>
                </div>
              </div>

              {/* Story Sentences + Spotlight Vocabulary */}
              <div className="my-auto space-y-3 py-4">
                {activePageContent?.sentences.map((sent, i) => {
                  const isPlaying =
                    playingAudioKey && sent.audioS3Key === playingAudioKey;
                  return (
                    <div
                      key={sent.sentenceIndex ?? i}
                      onClick={() => playAudioByKey(sent.audioS3Key)}
                      className={`group cursor-pointer rounded-2xl border p-3.5 transition ${
                        isPlaying
                          ? "border-teal-400 bg-teal-500/10"
                          : "border-white/10 bg-white/[0.03] hover:border-teal-400/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-base leading-relaxed font-bold text-white sm:text-lg">
                          {sent.textTarget}
                        </p>
                        <Volume2 className="mt-1 h-4 w-4 shrink-0 text-teal-400 opacity-70 group-hover:opacity-100" />
                      </div>
                      <p className="mt-1 text-xs leading-snug font-semibold text-slate-400">
                        {sent.textNative}
                      </p>
                    </div>
                  );
                })}

                {/* Spotlight Definitions */}
                {activePageContent?.definitions &&
                  activePageContent.definitions.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {activePageContent.definitions.map((defn, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => playAudioByKey(defn.audioS3Key)}
                          className="inline-flex items-center gap-2 rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-3 py-1.5 text-left text-xs transition hover:border-indigo-400"
                        >
                          <Volume2 className="h-3.5 w-3.5 text-indigo-300" />
                          <span className="font-black text-indigo-200">
                            {defn.word}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            [{defn.phonetic}]
                          </span>
                          <span className="text-slate-300">
                            — {defn.translation}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
              </div>

              {/* Bottom Stage Action: Checkpoint Trigger & Page Turn Controls */}
              <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-2">
                <button
                  type="button"
                  onClick={handlePrevPage}
                  className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-white/10"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </button>

                {activePageContent?.checkpoint && (
                  <button
                    type="button"
                    onClick={() => setIsCheckpointOverlayOpen(true)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-black shadow-lg transition ${
                      completedCheckpoints.has(currentPage)
                        ? "border border-teal-400/40 bg-slate-800 text-teal-300"
                        : "animate-bounce bg-amber-300 text-slate-950 hover:bg-amber-200"
                    }`}
                  >
                    <span>? Checkpoint</span>
                    {completedCheckpoints.has(currentPage) && " ✓"}
                  </button>
                )}

                <button
                  type="button"
                  disabled={isCurrentPageGated}
                  onClick={handleNextPage}
                  className={`inline-flex items-center gap-1 rounded-xl px-4 py-2.5 text-xs font-black transition ${
                    isCurrentPageGated
                      ? "cursor-not-allowed border border-white/10 bg-slate-800 text-slate-500"
                      : "bg-teal-400 text-slate-950 shadow-md hover:bg-teal-300"
                  }`}
                >
                  <span>
                    {currentPage === totalPages ? "Finish Book" : "Next Page"}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* CHECKPOINT OVERLAY (Supports both multiple_choice & speak_phrase) */}
              <AnimatePresence>
                {isCheckpointOverlayOpen && activePageContent?.checkpoint && (
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    className="absolute inset-x-4 bottom-4 z-40 rounded-3xl border-2 border-amber-300/60 bg-[#0F172A] p-5 shadow-2xl"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-amber-300 px-2 py-0.5 text-[10px] font-black text-slate-950 uppercase">
                          {spriteName || "Reading Buddy"}
                        </span>
                        <h4 className="text-sm font-bold text-white">
                          {activePageContent.checkpoint.questionNative}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsCheckpointOverlayOpen(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>

                    {activePageContent.checkpoint.type === "multiple_choice" &&
                    activePageContent.checkpoint.options ? (
                      <div className="space-y-2">
                        {activePageContent.checkpoint.options.map((opt, i) => {
                          const isSelected = selectedOption?.text === opt.text;
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setSelectedOption(opt);
                                if (opt.isCorrect) {
                                  handleCompleteCurrentCheckpoint();
                                }
                              }}
                              className={`flex w-full items-center justify-between rounded-xl border p-3 text-left text-xs font-bold transition ${
                                isSelected
                                  ? opt.isCorrect
                                    ? "border-teal-400 bg-teal-400/20 text-teal-200"
                                    : "border-rose-400 bg-rose-500/20 text-rose-200"
                                  : "border-white/10 bg-slate-800 text-white hover:border-amber-300"
                              }`}
                            >
                              <span>{opt.text}</span>
                              <span className="text-[10px] text-slate-400">
                                {opt.spriteMood}
                              </span>
                            </button>
                          );
                        })}

                        {selectedOption && (
                          <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/90 p-3 text-xs leading-relaxed text-slate-200">
                            <span className="font-black text-amber-300">
                              {spriteName || "Vox"}:{" "}
                            </span>
                            {selectedOption.spriteReaction}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* SPEAK PHRASE CHECKPOINT */
                      <div className="space-y-3">
                        <div className="rounded-xl border border-teal-400/30 bg-slate-900 p-3.5 text-center">
                          <p className="text-base font-black text-teal-300">
                            &ldquo;
                            {
                              activePageContent.checkpoint.speakChallenge
                                ?.targetPhrase
                            }
                            &rdquo;
                          </p>
                          {activePageContent.checkpoint.speakChallenge
                            ?.phoneticGuide && (
                            <p className="mt-1 text-xs text-slate-400">
                              [
                              {
                                activePageContent.checkpoint.speakChallenge
                                  .phoneticGuide
                              }
                              ]
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={handleCompleteCurrentCheckpoint}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-400 py-3 text-xs font-black text-slate-950 transition hover:bg-teal-300"
                        >
                          <Mic className="h-4 w-4" />
                          <span>
                            {completedCheckpoints.has(currentPage)
                              ? "Pronunciation Checked ✓"
                              : "Tap after saying out loud"}
                          </span>
                        </button>
                      </div>
                    )}

                    {completedCheckpoints.has(currentPage) && (
                      <button
                        type="button"
                        onClick={handleNextPage}
                        className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 py-2.5 text-xs font-black text-slate-950"
                      >
                        <span>Continue to Next Page</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            /* ================= OUTRO & SCORECARD ================= */
            <motion.div
              key="book-outro"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="my-auto flex w-full max-w-md flex-1 flex-col justify-between space-y-6 p-6 text-center"
            >
              <div className="my-auto space-y-3">
                <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-amber-300 bg-amber-400/20 shadow-[0_0_50px_rgba(251,191,36,0.35)]">
                  <span className="text-3xl font-black text-amber-300">
                    {totalPages}/{totalPages}
                  </span>
                </div>

                <h2 className="text-2xl font-black text-white">
                  Story Completed! 🏆
                </h2>
                <p className="text-xs leading-relaxed font-medium text-slate-300">
                  You conquered all {totalPages} pages and cleared every
                  checkpoint in{" "}
                  <span className="font-bold text-teal-300">
                    {currentTranslation?.title}
                  </span>
                  . Your digital bookshelf has been stamped!
                </p>
              </div>

              <div className="space-y-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPage(1);
                    setCompletedCheckpoints(new Set());
                  }}
                  className="w-full rounded-2xl border border-white/15 bg-white/5 py-3 text-xs font-bold text-slate-200 transition hover:bg-white/10"
                >
                  Re-read Story
                </button>

                <button
                  type="button"
                  onClick={onBackToLibrary}
                  className="w-full rounded-2xl bg-teal-400 py-3.5 text-xs font-black text-slate-950 shadow-lg transition hover:bg-teal-300"
                >
                  Return to Bookshelf
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}