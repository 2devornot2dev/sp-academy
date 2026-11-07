// components/matrix/matrix-client.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Sparkles, Database, ChevronLeft, ChevronRight } from "lucide-react";
import { usePronunciation } from "@/context/pronunciation-context";
import { useMatrix } from "@/context/matrix-context";
import { useSpeak } from "@/hooks/use-speak";

import {
  CATEGORY_META,
  classifyWord,
  EnrichedWordStat,
  LanguageProfile,
  MatrixData,
  SessionScore,
  SortByOption,
  StructuralType,
  ViewMode,
  WordStat,
} from "./matrix-types";
import { MatrixHeroHeader } from "./matrix-hero-header";
import { MatrixFilterBar } from "./matrix-filter-bar";
import { MatrixWordCard } from "./matrix-word-card";
import { MatrixFamiliesView } from "./matrix-families-view";
import { MatrixDojoModal } from "./matrix-dojo-modal";
import { MatrixStudioTab } from "./matrix-studio-tab";
import { MatrixWordDetailModal } from "./matrix-word-detail-modal";

export * from "./matrix-types";

interface MatrixClientProps {
  matrix: MatrixData | null;
  userId?: string;
}

const ITEMS_PER_PAGE = 18;

export default function MatrixClient({ matrix, userId }: MatrixClientProps) {
  const profiles = matrix?.languageProfiles || [];

  const [selectedLang, setSelectedLang] = useState<string>(
    profiles[0]?.languageCode || "fr-FR"
  );
  const [localProfiles, setLocalProfiles] =
    useState<LanguageProfile[]>(profiles);

  useEffect(() => {
    setLocalProfiles(matrix?.languageProfiles || []);
  }, [matrix]);

  const [mainTab, setMainTab] = useState<"STUDIO" | "VAULT">("STUDIO");

  const [viewMode, setViewMode] = useState<ViewMode>("ALL");
  // Default to "ALL" so Full Matrix Vault shows all unlocked words immediately
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortByOption>("recent");
  const [currentPage, setCurrentPage] = useState(1);

  const [detailWordId, setDetailWordId] = useState<string | null>(null);

  const [activeMicWordId, setActiveMicWordId] = useState<string | null>(null);
  const [activeTtsKey, setActiveTtsKey] = useState<string | null>(null);
  const [sessionScores, setSessionScores] = useState<
    Record<string, SessionScore>
  >({});

  const [isDojoOpen, setIsDojoOpen] = useState(false);
  const [dojoQueue, setDojoQueue] = useState<EnrichedWordStat[]>([]);
  const [dojoIndex, setDojoIndex] = useState(0);

  const {
    status,
    score,
    error,
    assessSpeech,
    stopRecording,
    cancelAssessment,
  } = usePronunciation();
  const { trackInteraction, syncCart } = useMatrix();
  const {
    speak,
    stop: stopTts,
    isPlaying: isTtsPlaying,
    isLoading: isTtsLoading,
  } = useSpeak();

  const currentProfile = useMemo(
    () => localProfiles.find((p) => p.languageCode === selectedLang),
    [localProfiles, selectedLang]
  );

  const enrichedWords = useMemo<EnrichedWordStat[]>(() => {
    const rawList = currentProfile?.wordStats || [];

    const baseItems = rawList.map((item) => {
      const cleanWord = item.word.trim();
      const tokens =
        item.componentWords && item.componentWords.length > 0
          ? item.componentWords.map((t) => t.toLowerCase())
          : cleanWord
              .toLowerCase()
              .split(/[\s']+/)
              .filter(Boolean);

      const structuralType: StructuralType =
        item.wordType === "PHRASE" ||
        cleanWord.includes(" ") ||
        cleanWord.includes("'")
          ? "PHRASE"
          : "WORD";

      const category = classifyWord(
        cleanWord,
        item.partOfSpeech,
        structuralType
      );

      return {
        ...item,
        cleanWord,
        tokens,
        structuralType,
        category,
        categoryLabel: CATEGORY_META[category].label,
      };
    });

    return baseItems.map((item) => {
      const lowerWord = item.cleanWord.toLowerCase();
      const lowerLemma = item.lemma?.toLowerCase();

      const sameLemmaWords = lowerLemma
        ? baseItems.filter(
            (other) =>
              other.id !== item.id &&
              other.lemma?.toLowerCase() === lowerLemma
          )
        : [];

      if (item.structuralType === "WORD") {
        const relatedPhrases = baseItems.filter(
          (other) =>
            other.id !== item.id &&
            other.structuralType === "PHRASE" &&
            (other.tokens.includes(lowerWord) ||
              (lowerLemma ? other.tokens.includes(lowerLemma) : false))
        );
        return {
          ...item,
          relatedPhrases,
          linkedComponentWords: [],
          sameLemmaWords,
        };
      } else {
        const linkedComponentWords = baseItems.filter(
          (other) =>
            other.id !== item.id &&
            other.structuralType === "WORD" &&
            (item.tokens.includes(other.cleanWord.toLowerCase()) ||
              (other.lemma
                ? item.tokens.includes(other.lemma.toLowerCase())
                : false))
        );
        return {
          ...item,
          relatedPhrases: [],
          linkedComponentWords,
          sameLemmaWords,
        };
      }
    });
  }, [currentProfile]);

  const wordFamilies = useMemo(() => {
    const roots = enrichedWords.filter(
      (w) => w.structuralType === "WORD" && w.relatedPhrases.length > 0
    );
    const coveredIds = new Set<string>();
    const groups = roots.map((root) => {
      coveredIds.add(root.id);
      root.relatedPhrases.forEach((p) => coveredIds.add(p.id));
      return {
        root,
        phrases: enrichedWords.filter((e) =>
          root.relatedPhrases.some((rp) => rp.id === e.id)
        ),
      };
    });

    const standalonePhrases = enrichedWords.filter(
      (w) => w.structuralType === "PHRASE" && !coveredIds.has(w.id)
    );

    return { groups, standalonePhrases };
  }, [enrichedWords]);

  const filteredWords = useMemo(() => {
    return enrichedWords
      .filter((item) => {
        if (viewMode === "WORDS" && item.structuralType !== "WORD")
          return false;
        if (viewMode === "PHRASES" && item.structuralType !== "PHRASE")
          return false;
        if (categoryFilter !== "ALL" && item.category !== categoryFilter)
          return false;
        if (statusFilter !== "ALL" && item.status !== statusFilter)
          return false;

        if (searchQuery.trim() !== "") {
          const q = searchQuery.toLowerCase().trim();
          return (
            item.cleanWord.toLowerCase().includes(q) ||
            (item.translation && item.translation.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "alpha") return a.cleanWord.localeCompare(b.cleanWord);
        if (sortBy === "mastery") return b.masteryScore - a.masteryScore;
        if (sortBy === "score")
          return (b.avgSpokenScore ?? -1) - (a.avgSpokenScore ?? -1);
        return (
          new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime()
        );
      });
  }, [
    enrichedWords,
    viewMode,
    categoryFilter,
    statusFilter,
    searchQuery,
    sortBy,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    viewMode,
    categoryFilter,
    statusFilter,
    searchQuery,
    sortBy,
    selectedLang,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredWords.length / ITEMS_PER_PAGE)
  );
  const paginatedWords = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredWords.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredWords, currentPage]);

  const statsSummary = useMemo(() => {
    const total = enrichedWords.length;
    const singleWordsCount = enrichedWords.filter(
      (w) => w.structuralType === "WORD"
    ).length;
    const phrasesCount = enrichedWords.filter(
      (w) => w.structuralType === "PHRASE"
    ).length;
    const practicedCount = enrichedWords.filter(
      (w) => w.spokenAttempts > 0
    ).length;
    const scoredWords = enrichedWords.filter((w) => w.avgSpokenScore !== null);
    const avgPronunciation =
      scoredWords.length > 0
        ? Math.round(
            scoredWords.reduce((acc, w) => acc + (w.avgSpokenScore || 0), 0) /
              scoredWords.length
          )
        : null;

    return {
      total,
      singleWordsCount,
      phrasesCount,
      practicedCount,
      avgPronunciation,
    };
  }, [enrichedWords]);

  const updateLocalWordStat = (
    wordId: string,
    updater: (prev: WordStat) => WordStat
  ) => {
    setLocalProfiles((prevProfiles) =>
      prevProfiles.map((prof) => {
        if (prof.languageCode !== selectedLang) return prof;
        return {
          ...prof,
          wordStats: prof.wordStats.map((w) =>
            w.id === wordId ? updater(w) : w
          ),
        };
      })
    );
  };

  const handleListen = async (
    wordStat: WordStat,
    speed: number = 0.9,
    gender?: "m" | "f"
  ) => {
    if (status !== "idle") return;

    const ttsKey = gender
      ? `${wordStat.id}-${speed}-${gender}`
      : `${wordStat.id}-${speed}`;

    if (activeTtsKey === ttsKey && isTtsPlaying) {
      stopTts();
      setActiveTtsKey(null);
      return;
    }

    setActiveTtsKey(ttsKey);

    const s3Key =
      gender === "f"
        ? wordStat.audioFemaleKey
        : gender === "m"
          ? wordStat.audioMaleKey
          : null;

    let playedS3 = false;
    if (s3Key) {
      try {
        const baseUrl = (
          process.env.NEXT_PUBLIC_S3_CDN_URL ||
          process.env.NEXT_PUBLIC_ASSET_URL ||
          ""
        ).replace(/\/$/, "");
        if (baseUrl) {
          const audio = new Audio(`${baseUrl}/${s3Key}`);
          audio.playbackRate = speed;
          await audio.play();
          playedS3 = true;
        }
      } catch {
        playedS3 = false;
      }
    }

    if (!playedS3) {
      await speak(
        wordStat.word,
        selectedLang,
        speed,
        gender === "f" ? "female" : "male"
      );
    }

    updateLocalWordStat(wordStat.id, (prev) => ({
      ...prev,
      heardCount: prev.heardCount + 1,
      lastHeardAt: new Date().toISOString(),
    }));

    trackInteraction(wordStat.word, { heard: 1 });
    if (userId) syncCart(userId, selectedLang);
  };

  const handleTapQuizResult = (wordStat: WordStat, isCorrect: boolean) => {
    updateLocalWordStat(wordStat.id, (prev) => ({
      ...prev,
      tappedCorrect: prev.tappedCorrect + (isCorrect ? 1 : 0),
      tappedWrong: prev.tappedWrong + (isCorrect ? 0 : 1),
      lastTappedAt: new Date().toISOString(),
    }));

    trackInteraction(wordStat.word, {
      tappedCorrect: isCorrect ? 1 : 0,
      tappedWrong: isCorrect ? 0 : 1,
    });
    if (userId) syncCart(userId, selectedLang);
  };

  const handlePronunciationTest = async (wordStat: WordStat) => {
    if (activeMicWordId === wordStat.id && status === "listening") {
      stopRecording();
      return;
    }

    if (status !== "idle") {
      cancelAssessment();
    }

    stopTts();
    setActiveMicWordId(wordStat.id);

    const result: any = await assessSpeech(wordStat.word, selectedLang);

    const numericScore: number | null =
      result !== null && result !== undefined
        ? typeof result === "number"
          ? Math.round(result)
          : Math.round(
              result.pronunciationScore ??
                result.accuracyScore ??
                result.overallScore ??
                0
            )
        : null;

    if (numericScore !== null) {
      setSessionScores((prev) => ({
        ...prev,
        [wordStat.id]: {
          overall: numericScore,
          accuracy: result?.accuracyScore
            ? Math.round(result.accuracyScore)
            : null,
          fluency: result?.fluencyScore
            ? Math.round(result.fluencyScore)
            : null,
        },
      }));

      updateLocalWordStat(wordStat.id, (prev) => {
        const newAttempts = prev.spokenAttempts + 1;
        const prevAvg = prev.avgSpokenScore ?? numericScore;
        const newAvg =
          prev.spokenAttempts === 0
            ? numericScore
            : Math.round(
                (prevAvg * prev.spokenAttempts + numericScore) / newAttempts
              );

        return {
          ...prev,
          spokenAttempts: newAttempts,
          avgSpokenScore: newAvg,
          lastSpokenAt: new Date().toISOString(),
        };
      });

      trackInteraction(wordStat.word, {
        spokenAttempt: true,
        spokenScore: numericScore,
      });
      if (userId) {
        await syncCart(userId, selectedLang);
      }
    }
  };

  useEffect(() => {
    if (status === "idle" && score && activeMicWordId) {
      const s: any = score;
      const numericScore = Math.round(
        typeof s === "number"
          ? s
          : s.pronunciationScore ?? s.accuracyScore ?? s.overallScore ?? 0
      );

      setSessionScores((prev) => ({
        ...prev,
        [activeMicWordId]: {
          overall: numericScore,
          accuracy: s?.accuracyScore ? Math.round(s.accuracyScore) : null,
          fluency: s?.fluencyScore ? Math.round(s.fluencyScore) : null,
        },
      }));
    }
  }, [status, score, activeMicWordId]);

  const startDojo = (customQueue: EnrichedWordStat[]) => {
    if (customQueue.length === 0) return;
    setDojoQueue(customQueue);
    setDojoIndex(0);
    setIsDojoOpen(true);
  };

  const activeDojoWord = useMemo(() => {
    const target = dojoQueue[dojoIndex];
    if (!target) return null;
    return enrichedWords.find((w) => w.id === target.id) || target;
  }, [dojoQueue, dojoIndex, enrichedWords]);

  const activeDetailWord = useMemo(
    () => enrichedWords.find((w) => w.id === detailWordId) || null,
    [enrichedWords, detailWordId]
  );

  if (!profiles.length) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-lg">
          <Sparkles className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">
          Your Word Matrix is Empty
        </h2>
        <p className="mt-2 max-w-md text-sm font-medium text-slate-500">
          Complete lessons to unlock words and phrases. Every word you encounter
          will be organized here for pronunciation mastery.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/80 pb-24 font-sans text-slate-900 selection:bg-indigo-100">
      <MatrixHeroHeader
        localProfiles={localProfiles}
        selectedLang={selectedLang}
        onSelectLang={(lang) => {
          if (status !== "idle") cancelAssessment();
          setSelectedLang(lang);
        }}
        statsSummary={statsSummary}
      />

      <main className="mx-auto max-w-7xl px-6 pt-8 lg:px-8">
        {/* TOP 2-TAB 3D MODE SWITCHER */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex gap-2 rounded-3xl border-2 border-b-[5px] border-slate-200/90 border-b-slate-300 bg-white p-2 shadow-xs">
            <button
              type="button"
              onClick={() => setMainTab("STUDIO")}
              className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-black transition-all duration-150 ${
                mainTab === "STUDIO"
                  ? "border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-sm shadow-blue-500/25 active:translate-y-0.5 active:border-b-0"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>Learning Studio</span>
            </button>

            <button
              type="button"
              onClick={() => setMainTab("VAULT")}
              className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-black transition-all duration-150 ${
                mainTab === "VAULT"
                  ? "border-b-4 border-indigo-900 bg-gradient-to-b from-indigo-500 to-purple-700 text-white shadow-sm shadow-indigo-500/25 active:translate-y-0.5 active:border-b-0"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Database className="h-4 w-4" />
              <span>Full Matrix Vault ({statsSummary.total})</span>
            </button>
          </div>
        </div>

        {mainTab === "STUDIO" ? (
          <MatrixStudioTab
            enrichedWords={enrichedWords}
            activeMicWordId={activeMicWordId}
            status={status}
            activeTtsKey={activeTtsKey}
            isTtsPlaying={isTtsPlaying}
            isTtsLoading={isTtsLoading}
            sessionScores={sessionScores}
            onListen={handleListen}
            onPronunciationTest={handlePronunciationTest}
            onTapQuizResult={handleTapQuizResult}
            onStartDojo={startDojo}
          />
        ) : (
          <>
            <MatrixFilterBar
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              statsSummary={statsSummary}
              familiesCount={wordFamilies.groups.length}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              categoryFilter={categoryFilter}
              onCategoryChange={setCategoryFilter}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />

            {viewMode === "FAMILIES" ? (
              <MatrixFamiliesView
                groups={wordFamilies.groups}
                onListen={handleListen}
                onPronunciationTest={handlePronunciationTest}
              />
            ) : filteredWords.length === 0 ? (
              <div className="rounded-3xl border-2 border-b-[6px] border-slate-200 bg-white p-12 text-center shadow-xs">
                <p className="font-bold text-slate-500">
                  No words or phrases match your current filter.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {paginatedWords.map((wordStat, index) => (
                    <MatrixWordCard
                      key={wordStat.id}
                      index={index}
                      wordStat={wordStat}
                      activeMicWordId={activeMicWordId}
                      status={status}
                      error={error}
                      activeTtsKey={activeTtsKey}
                      isTtsPlaying={isTtsPlaying}
                      isTtsLoading={isTtsLoading}
                      sessionResult={sessionScores[wordStat.id]}
                      onListen={handleListen}
                      onPronunciationTest={handlePronunciationTest}
                      onSelectRelatedWord={(relId) => setDetailWordId(relId)}
                      onOpenDetail={(w) => setDetailWordId(w.id)}
                    />
                  ))}
                </div>

                {/* 3D PAGINATION FOOTER */}
                {totalPages > 1 && (
                  <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border-2 border-b-[5px] border-slate-200/90 border-b-slate-300 bg-white px-5 py-3.5 shadow-xs">
                    <span className="text-xs font-bold text-slate-500">
                      Showing{" "}
                      <strong className="font-black text-slate-900">
                        {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                        {Math.min(
                          currentPage * ITEMS_PER_PAGE,
                          filteredWords.length
                        )}
                      </strong>{" "}
                      of{" "}
                      <strong className="font-black text-slate-900">
                        {filteredWords.length}
                      </strong>{" "}
                      items
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        className="inline-flex items-center gap-1 rounded-xl border-2 border-b-[3px] border-slate-200 border-b-slate-300 bg-white px-3.5 py-1.5 text-xs font-black text-slate-700 transition hover:bg-slate-50 active:translate-y-0.5 active:border-b-0 disabled:pointer-events-none disabled:opacity-40"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        Prev
                      </button>

                      <span className="px-2 text-xs font-black text-slate-700">
                        Page {currentPage} of {totalPages}
                      </span>

                      <button
                        type="button"
                        disabled={currentPage === totalPages}
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        className="inline-flex items-center gap-1 rounded-xl border-2 border-b-[3px] border-slate-200 border-b-slate-300 bg-white px-3.5 py-1.5 text-xs font-black text-slate-700 transition hover:bg-slate-50 active:translate-y-0.5 active:border-b-0 disabled:pointer-events-none disabled:opacity-40"
                      >
                        Next
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* FULL WORD X-RAY DETAIL MODAL */}
      <MatrixWordDetailModal
        wordStat={activeDetailWord}
        activeMicWordId={activeMicWordId}
        status={status}
        activeTtsKey={activeTtsKey}
        isTtsPlaying={isTtsPlaying}
        isTtsLoading={isTtsLoading}
        sessionResult={
          activeDetailWord ? sessionScores[activeDetailWord.id] : undefined
        }
        onClose={() => setDetailWordId(null)}
        onListen={handleListen}
        onPronunciationTest={handlePronunciationTest}
        onSelectWord={(w) => setDetailWordId(w.id)}
        allEnrichedWords={enrichedWords}
      />

      <MatrixDojoModal
        isOpen={isDojoOpen}
        activeDojoWord={activeDojoWord}
        dojoIndex={dojoIndex}
        dojoQueueLength={dojoQueue.length}
        activeMicWordId={activeMicWordId}
        status={status}
        sessionResult={
          activeDojoWord ? sessionScores[activeDojoWord.id] : undefined
        }
        onClose={() => {
          if (status !== "idle") cancelAssessment();
          setIsDojoOpen(false);
        }}
        onPrev={() => {
          if (status !== "idle") cancelAssessment();
          setDojoIndex((i) => Math.max(0, i - 1));
        }}
        onNext={() => {
          if (status !== "idle") cancelAssessment();
          setDojoIndex((i) => i + 1);
        }}
        onListen={handleListen}
        onPronunciationTest={handlePronunciationTest}
      />
    </div>
  );
}