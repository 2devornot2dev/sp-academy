// components/books/book-wrapper.tsx
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { useSprite } from "@/context/sprite-context";
import type {
  SpoonBookWebhookPayload,
  LocalizedBookPage,
  BookSentence,
  BookPageCheckpoint,
} from "@/lib/schema/book-schema";

// ============================================================================
// 📘 JSDOC COMPONENT BLUEPRINTS (Reference for building remaining 4 files)
// ============================================================================

/**
 * ----------------------------------------------------------------------------
 * 1. BookIntro (`components/books/book-intro.tsx`)
 * ----------------------------------------------------------------------------
 * @description Page 0: The Hook & Cinematic Cover.
 *
 * PROPS EXPECTED:
 * @param {string} title - Localized book title
 * @param {string} synopsis - 1-sentence hook in user's native language
 * @param {string} characterName - Name of the star (e.g. "Léo")
 * @param {string} characterAvatarUrl - Cloudinary reference portrait
 * @param {string | null} introVideoUrl - Presigned S3 URL of the 5s Pruna video
 * @param {string} coverImageUrl - Presigned S3 URL of Page 1's 3D illustration
 * @param {string} levelBand - "beginner" | "intermediate" | "advanced"
 * @param {() => void} onStartReading - Callback to advance to Page 1
 *
 * HOW TO BUILD:
 * - Render introVideoUrl in an autoplaying, looping, muted <video> (falls back to coverImageUrl).
 * - Display title, characterAvatarUrl badge, and synopsis.
 * - Glowing "[ Open Storybook ➔ ]" CTA button that calls onStartReading().
 */

/**
 * ----------------------------------------------------------------------------
 * 2. BookPage (`components/books/book-page.tsx`)
 * ----------------------------------------------------------------------------
 * @description Pages 1 to 5: The Interactive Reader with 60fps Whisper Read-Along.
 *
 * PROPS EXPECTED:
 * @param {number} pageNumber - 1 to 5
 * @param {string} imageUrl - Presigned S3 URL for this page's 5:4 3D scene
 * @param {BookSentence[]} sentences - 2 to 3 sentences with textTarget, textNative, audioUrl, wordTimestamps
 * @param {boolean} isAudioMuted - Whether audio narration is muted
 * @param {boolean} isCheckpointCompleted - Whether the user has passed this page's '?' challenge
 * @param {() => void} onOpenCheckpoint - Callback when user taps the floating '?' button
 *
 * HOW TO BUILD:
 * - Top 55%: High-contrast 5:4 aspect ratio image (<img src={imageUrl} />).
 * - Bottom 45%: Sentences container. Plays sentence 0 audio -> highlights words at 60fps via
 *   `wordTimestamps` -> onended advances to sentence 1 -> sentence 2.
 * - Allow tapping any sentence to isolate and replay only that line!
 * - Floating in bottom-right: Pulsing button: `[ ? Checkpoint ]` (calls onOpenCheckpoint()).
 */

/**
 * ----------------------------------------------------------------------------
 * 3. BookSpriteQuestionnaire (`components/books/book-sprite-questionnaire.tsx`)
 * ----------------------------------------------------------------------------
 * @description The '?' Checkpoint overlay: 3 options with pre-baked Sprite teaching reactions!
 *
 * PROPS EXPECTED:
 * @param {BookPageCheckpoint} checkpoint - Contains questionNative, options[], speakChallenge, explanationNative
 * @param {string} spriteName - "Vox" | "Vivi" from useSprite()
 * @param {string} avatarSrc - Default avatar image from useSprite()
 * @param {string[]} moodUrls - [excitedUrl, thinkingUrl, celebratingUrl] from sprite profile
 * @param {boolean} isCompleted - Whether currently solved
 * @param {(optionIndex: number) => void} onSelectOption - Callback when option tapped
 * @param {() => void} onPassCheckpoint - Callback to mark checkpoint solved & unlock next page
 * @param {() => void} onClose - Callback to close overlay and look back at the page text
 *
 * HOW TO BUILD:
 * - Slides up as an overlay over the bottom half of BookPage.
 * - Displays questionNative and 3 options.
 * - When option X is tapped:
 *   * Instantly highlights option (teal if isCorrect, red/shake if wrong).
 *   * Sprite slides up using `option.spriteMood` pose (from moodUrls).
 *   * Speech bubble displays `option.spriteReaction` (Praise + Secret if correct; Trap breakdown if wrong).
 *   * If correct, calls onPassCheckpoint() and displays "[ Turn to Next Page ➔ ]".
 */

/**
 * ----------------------------------------------------------------------------
 * 4. BookOutro (`components/books/book-outro.tsx`)
 * ----------------------------------------------------------------------------
 * @description Page 6: The Climax Payoff, Scorecard & Bookshelf Completion Wax Seal.
 *
 * PROPS EXPECTED:
 * @param {string} title - Localized title
 * @param {string} coverImageUrl - Cover image
 * @param {number} totalCheckpointsCleared - e.g. 5
 * @param {string} spriteName - "Vox" | "Vivi"
 * @param {() => void} onReRead - Reset to Page 0
 * @param {() => void} onReturnToLibrary - Return to /books library
 *
 * HOW TO BUILD:
 * - Displays a golden wax seal stamped on the book cover: "COMPLETED".
 * - Shows "5 / 5 Checkpoints Cleared" scorecard.
 * - Celebrating Sprite avatar thanking them for reading.
 * - Two buttons: "[ Re-read Story ]" and "[ Return to Bookshelf ]".
 */

// ============================================================================
// MASTER COMPONENT PROPS
// ============================================================================

export interface BookWrapperProps {
  /** The full SpoonBook record from Postgres */
  book: SpoonBookWebhookPayload & {
    id: string;
    /** Presigned URLs map for S3 assets (optional, or pass keys) */
    mediaUrls?: {
      coverImageUrl?: string;
      introVideoUrl?: string;
      pageImageUrls?: string[];
      sentenceAudioUrls?: Record<string, string>; // keyed by audioS3Key
    };
  };
  /** User's subscription plan id: "trial" | "founder" | "unlimited" */
  userPlan?: string;
  /** Initial progress if resuming (from UserBookProgress) */
  initialPage?: number;
  initialCompletedCheckpoints?: number[];
  /** Callbacks */
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
  const { profile, spriteName, avatarSrc } = useSprite();

  // 1. LANGUAGE LOCKING LOGIC
  // Default to learner's active target language (e.g. "fr-FR")
  const defaultLang = profile?.targetLanguage || "fr-FR";
  const [selectedLang, setSelectedLang] = useState<string>(defaultLang);

  // GATING: Only Spoon Unlimited+ or Enterprise can toggle between foreign editions!
  const isMultiLangUnlocked =
    userPlan === "unlimited" || userPlan === "enterprise";

  const availableLanguages = Object.keys(book.translations || {});

  // 2. ACTIVE LOCALIZED SCRIPT
  const currentTranslation = useMemo(() => {
    return (
      book.translations[selectedLang] ||
      book.translations[defaultLang] ||
      book.translations[availableLanguages[0]]
    );
  }, [book.translations, selectedLang, defaultLang, availableLanguages]);

  // 3. MASTER PAGE STATE (0 = Intro, 1..5 = Story Pages, 6 = Outro)
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [completedCheckpoints, setCompletedCheckpoints] = useState<Set<number>>(
    new Set(initialCompletedCheckpoints)
  );
  const [isCheckpointOverlayOpen, setIsCheckpointOverlayOpen] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Sync progress silently to database
  const syncProgress = useCallback(
    (page: number, checkpoints: Set<number>) => {
      if (!onSaveProgress) return;
      void onSaveProgress({
        bookId: book.id,
        targetLanguage: selectedLang,
        currentPage: page,
        completedCheckpoints: Array.from(checkpoints),
        isFinished: page === 6,
      });
    },
    [book.id, selectedLang, onSaveProgress]
  );

  const handleNextPage = () => {
    if (currentPage >= 6) return;
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    setIsCheckpointOverlayOpen(false);
    syncProgress(nextPage, completedCheckpoints);
  };

  const handlePrevPage = () => {
    if (currentPage <= 0) return;
    const prevPage = currentPage - 1;
    setCurrentPage(prevPage);
    setIsCheckpointOverlayOpen(false);
    syncProgress(prevPage, completedCheckpoints);
  };

  const handleCompleteCurrentCheckpoint = () => {
    if (currentPage < 1 || currentPage > 5) return;
    const nextSet = new Set(completedCheckpoints);
    nextSet.add(currentPage);
    setCompletedCheckpoints(nextSet);
    syncProgress(currentPage, nextSet);
  };

  // Check if current page is gated (must solve '?' before turning to next page)
  const isCurrentPageGated =
    currentPage >= 1 &&
    currentPage <= 5 &&
    !completedCheckpoints.has(currentPage);

  const activePageContent: LocalizedBookPage | undefined =
    currentPage >= 1 && currentPage <= 5
      ? currentTranslation?.pages?.[currentPage - 1]
      : undefined;

  const activePageImageUrl =
    book.mediaUrls?.pageImageUrls?.[currentPage - 1] ||
    book.pageImageS3Keys?.[currentPage - 1];

  return (
    <div className="relative z-30 flex h-screen w-full flex-col overflow-hidden bg-[#0A0E17] text-white font-sans selection:bg-teal-500/30">
      {/* =====================================================================
          1. TOP MINIMAL CHROME BAR (Only 48px tall)
          ===================================================================== */}
      <header className="relative z-20 flex h-12 w-full shrink-0 items-center justify-between border-b border-white/10 bg-[#0C121E]/95 px-4 backdrop-blur-md">
        {/* LEFT: Exit to Library */}
        <button
          type="button"
          onClick={onBackToLibrary}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-400 hover:bg-white/10 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Bookshelf</span>
        </button>

        {/* CENTER: Title & Page Progress Indicator */}
        <div className="flex items-center gap-2 max-w-[50%] truncate text-center">
          <BookOpen className="h-4 w-4 text-teal-400 shrink-0" />
          <span className="text-xs font-black text-white truncate">
            {currentTranslation?.title || book.slug}
          </span>
          <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-300 shrink-0">
            {currentPage === 0
              ? "Intro"
              : currentPage === 6
                ? "Outro"
                : `${currentPage} / 5`}
          </span>
        </div>

        {/* RIGHT: Language Selector (Gated) & Volume Toggle */}
        <div className="flex items-center gap-2">
          {/* Language Gate */}
          <div className="relative flex items-center">
            {isMultiLangUnlocked ? (
              <select
                value={selectedLang}
                onChange={(e) => {
                  setSelectedLang(e.target.value);
                  setCurrentPage(0); // Reset to intro on language switch
                }}
                className="rounded-lg border border-white/15 bg-slate-900 px-2 py-1 text-[11px] font-black uppercase text-teal-300 focus:outline-none"
              >
                {availableLanguages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang.split("-")[0].toUpperCase()}
                  </option>
                ))}
              </select>
            ) : (
              <div
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-slate-900/80 px-2.5 py-1 text-[10px] font-bold text-slate-400 cursor-not-allowed"
                title="Multi-language book editions unlocked on Spoon Unlimited+"
              >
                <Globe2 className="h-3 w-3 text-teal-400" />
                <span>{selectedLang.split("-")[0].toUpperCase()}</span>
                <Lock className="h-2.5 w-2.5 text-amber-400/80 ml-0.5" />
              </div>
            )}
          </div>

          {/* Audio Mute Toggle */}
          <button
            type="button"
            onClick={() => setIsAudioMuted((prev) => !prev)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
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
          2. MAIN FULL-STAGE VIEWPORT (Pages 0..6)
          ===================================================================== */}
      <main className="relative flex-1 overflow-hidden flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {currentPage === 0 ? (
            /* ================= PAGE 0: BOOK INTRO ================= */
            <motion.div
              key="book-intro"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="flex-1 w-full max-w-xl flex flex-col justify-between p-6 text-center my-auto"
            >
              <div className="space-y-4 my-auto">
                {/* 3D Cover Image or Intro Video Preview */}
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

                  <div className="absolute top-3 left-3 rounded-full bg-slate-950/80 border border-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-teal-300 backdrop-blur-md">
                    Starring {book.characterName}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {currentTranslation?.title}
                  </h1>
                  <p className="text-xs sm:text-sm font-medium text-slate-300 max-w-md mx-auto leading-relaxed">
                    {currentTranslation?.synopsis}
                  </p>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleNextPage}
                  className="w-full max-w-md inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-400 to-indigo-500 px-6 py-4 text-sm font-black text-slate-950 shadow-xl hover:brightness-110 active:scale-[0.98] transition"
                >
                  <span>Open Storybook</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ) : currentPage >= 1 && currentPage <= 5 ? (
            /* ================= PAGES 1..5: STORY PAGE ================= */
            <motion.div
              key={`page-${currentPage}`}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="flex-1 w-full max-w-2xl flex flex-col justify-between p-4 sm:p-6 overflow-y-auto"
            >
              {/* Top 3D Scene Illustration */}
              <div className="relative mx-auto aspect-[5/4] w-full max-w-lg overflow-hidden rounded-3xl border border-white/15 bg-slate-900 shadow-2xl shrink-0">
                {activePageImageUrl && (
                  <img
                    src={activePageImageUrl}
                    alt={`Page ${currentPage}`}
                    className="h-full w-full object-cover"
                  />
                )}

                {/* Floating Checkpoint Status Badge */}
                <div className="absolute top-3 right-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider backdrop-blur-md ${
                      completedCheckpoints.has(currentPage)
                        ? "bg-teal-400/20 border border-teal-400/40 text-teal-300"
                        : "bg-amber-400/20 border border-amber-300/40 text-amber-300 animate-pulse"
                    }`}
                  >
                    <Sparkles className="h-3 w-3" />
                    {completedCheckpoints.has(currentPage)
                      ? "Checkpoint Solved"
                      : "Checkpoint Required"}
                  </span>
                </div>
              </div>

              {/* Story Sentences Stream (Sequential Read-Along) */}
              <div className="my-auto py-4 space-y-3">
                {activePageContent?.sentences.map((sent, i) => (
                  <div
                    key={sent.sentenceIndex || i}
                    className="group rounded-2xl bg-white/[0.03] border border-white/10 p-3.5 hover:border-teal-400/40 transition cursor-pointer"
                  >
                    <p className="text-base sm:text-lg font-bold text-white leading-relaxed">
                      {sent.textTarget}
                    </p>
                    <p className="text-xs font-semibold text-slate-400 mt-1 leading-snug">
                      {sent.textNative}
                    </p>
                  </div>
                ))}
              </div>

              {/* Bottom Stage Action: Checkpoint Trigger & Page Turn Controls */}
              <div className="pt-2 flex items-center justify-between gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={handlePrevPage}
                  className="inline-flex items-center gap-1 rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10 transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </button>

                {/* Pulsing '?' Checkpoint Button */}
                {activePageContent?.checkpoint && (
                  <button
                    type="button"
                    onClick={() => setIsCheckpointOverlayOpen(true)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-black transition shadow-lg ${
                      completedCheckpoints.has(currentPage)
                        ? "bg-slate-800 border border-teal-400/40 text-teal-300"
                        : "bg-amber-300 text-slate-950 hover:bg-amber-200 animate-bounce"
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
                      ? "bg-slate-800 text-slate-500 border border-white/10 cursor-not-allowed"
                      : "bg-teal-400 text-slate-950 hover:bg-teal-300 shadow-md"
                  }`}
                  title={
                    isCurrentPageGated
                      ? "Complete the '?' Checkpoint to turn the page!"
                      : "Turn page"
                  }
                >
                  <span>Next Page</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* CHECKPOINT OVERLAY PLACEHOLDER
                  (Will render <BookSpriteQuestionnaire /> once created) */}
              <AnimatePresence>
                {isCheckpointOverlayOpen && activePageContent?.checkpoint && (
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    className="absolute inset-x-4 bottom-4 z-40 rounded-3xl border-2 border-amber-300/60 bg-[#0F172A] p-5 shadow-2xl"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-amber-300 px-2 py-0.5 text-[10px] font-black uppercase text-slate-950">
                          Reading Buddy
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

                    {/* Pre-baked Options */}
                    <div className="space-y-2">
                      {activePageContent.checkpoint.options?.map((opt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            if (opt.isCorrect) {
                              handleCompleteCurrentCheckpoint();
                            }
                          }}
                          className={`w-full text-left rounded-xl border p-3 text-xs font-bold transition flex items-center justify-between ${
                            opt.isCorrect &&
                            completedCheckpoints.has(currentPage)
                              ? "bg-teal-400/20 border-teal-400 text-teal-200"
                              : "bg-slate-800 border-white/10 text-white hover:border-amber-300"
                          }`}
                        >
                          <span>{opt.text}</span>
                          <span className="text-[10px] text-slate-400">
                            {opt.spriteMood}
                          </span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            /* ================= PAGE 6: BOOK OUTRO & SCORECARD ================= */
            <motion.div
              key="book-outro"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 w-full max-w-md flex flex-col justify-between p-6 text-center my-auto space-y-6"
            >
              <div className="space-y-3 my-auto">
                <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-amber-300 bg-amber-400/20 shadow-[0_0_50px_rgba(251,191,36,0.35)]">
                  <span className="text-3xl font-black text-amber-300">5/5</span>
                </div>

                <h2 className="text-2xl font-black text-white">
                  Story Completed! 🏆
                </h2>
                <p className="text-xs font-medium text-slate-300 leading-relaxed">
                  You conquered all 5 pages and cleared every checkpoint in{" "}
                  <span className="text-teal-300 font-bold">
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
                  className="w-full rounded-2xl border border-white/15 bg-white/5 py-3 text-xs font-bold text-slate-200 hover:bg-white/10 transition"
                >
                  Re-read Story
                </button>

                <button
                  type="button"
                  onClick={onBackToLibrary}
                  className="w-full rounded-2xl bg-teal-400 py-3.5 text-xs font-black text-slate-950 hover:bg-teal-300 transition shadow-lg"
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