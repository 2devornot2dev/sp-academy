// components/books/bookshelf-client.tsx
"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Search,
  Play,
  BookOpen,
  Flame,
  Zap,
  Orbit,
  Layers,
  RotateCcw,
  Eye,
  Film,
} from "lucide-react";

export interface BookshelfItem {
  id: string;
  slug: string;
  title: string;
  synopsis: string;
  characterName: string;
  characterAvatarUrl: string;
  levelBand: string;
  genre: string;
  coverUrl: string;
  introVideoUrl: string | null;
  totalPages: number;
  currentPage: number;
  completedCheckpointsCount: number;
  isCompleted: boolean;
  lastReadAt: string | null;
  availableLanguages: string[];
}

interface SeriesCategory {
  id: string;
  name: string;
  seriesTitle: string;
  tagline: string;
  matchCharacter: string | null; // null = All
  badgeBg: string;
  icon: React.ReactNode;
  avatarUrl?: string;
}

const SPOON_SERIES_CATEGORIES: SeriesCategory[] = [
  {
    id: "all",
    name: "All Stories",
    seriesTitle: "Complete Catalog",
    tagline: "Every interactive story",
    matchCharacter: null,
    badgeBg: "bg-sky-100 text-blue-700",
    icon: <Layers className="h-4 w-4 text-blue-600" />,
  },
  {
    id: "q-to",
    name: "Q-to",
    seriesTitle: "Chronicles of Pluto",
    tagline: "Alien baby adventures",
    matchCharacter: "q-to",
    badgeBg: "bg-violet-100 text-violet-700",
    icon: <Orbit className="h-4 w-4 text-violet-600" />,
    avatarUrl:
      "https://res.cloudinary.com/dmllgn0t7/image/upload/v1793732453/q-to.jpg",
  },
  {
    id: "billy",
    name: "Billy",
    seriesTitle: "The Trap",
    tagline: "Street-smart hustles",
    matchCharacter: "billy",
    badgeBg: "bg-amber-100 text-amber-800",
    icon: <Flame className="h-4 w-4 text-amber-600" />,
    avatarUrl:
      "https://res.cloudinary.com/dmllgn0t7/image/upload/v1793817840/cover.png",
  },
  {
    id: "momentum-man",
    name: "Momentum Man",
    seriesTitle: "Momentum Universe",
    tagline: "Kinetic heroics",
    matchCharacter: "momentum",
    badgeBg: "bg-cyan-100 text-cyan-700",
    icon: <Zap className="h-4 w-4 text-cyan-600" />,
  },
];

export function BookshelfClient({ books }: { books: BookshelfItem[] }) {
  const [selectedSeries, setSelectedSeries] = useState<string>("all");
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // 1. Count books per character series
  const seriesCounts = useMemo(() => {
    const counts: Record<string, number> = { all: books.length };
    for (const cat of SPOON_SERIES_CATEGORIES) {
      if (!cat.matchCharacter) continue;
      counts[cat.id] = books.filter((b) =>
        b.characterName
          .toLowerCase()
          .includes(cat.matchCharacter!.toLowerCase())
      ).length;
    }
    return counts;
  }, [books]);

  // 2. Books belonging to the currently selected Character Series
  const seriesBooks = useMemo(() => {
    const activeCat = SPOON_SERIES_CATEGORIES.find(
      (c) => c.id === selectedSeries
    );
    if (!activeCat?.matchCharacter) return books;
    return books.filter((b) =>
      b.characterName
        .toLowerCase()
        .includes(activeCat.matchCharacter!.toLowerCase())
    );
  }, [books, selectedSeries]);

  // 3. Dynamic Hero Book:
  //    a) Explicitly clicked episode (`selectedBookId`) inside current series
  //    b) In-progress book in current series
  //    c) Most recently read book in current series
  //    d) First index `seriesBooks[0]` in current series (falls back to `books[0]` if series has 0 books)
  const heroBook = useMemo(() => {
    const pool = seriesBooks.length > 0 ? seriesBooks : books;
    if (!pool.length) return null;

    if (selectedBookId) {
      const explicit = pool.find((b) => b.id === selectedBookId);
      if (explicit) return explicit;
    }

    const inProgress = pool
      .filter((b) => !b.isCompleted && b.currentPage > 0)
      .sort((a, b) =>
        (b.lastReadAt || "").localeCompare(a.lastReadAt || "")
      );
    if (inProgress.length > 0) return inProgress[0];

    const recentlyRead = pool
      .filter((b) => b.lastReadAt)
      .sort((a, b) =>
        (b.lastReadAt || "").localeCompare(a.lastReadAt || "")
      );
    if (recentlyRead.length > 0) return recentlyRead[0];

    return pool[0];
  }, [books, seriesBooks, selectedBookId]);

  // 4. Filter books for the catalog list below
  const filteredBooks = useMemo(() => {
    return seriesBooks.filter((book) => {
      if (
        selectedLevel !== "all" &&
        book.levelBand.toLowerCase() !== selectedLevel
      ) {
        return false;
      }

      if (selectedStatus === "completed" && !book.isCompleted) return false;
      if (
        selectedStatus === "in-progress" &&
        (book.isCompleted || book.completedCheckpointsCount === 0)
      ) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = book.title.toLowerCase().includes(q);
        const matchSynopsis = book.synopsis.toLowerCase().includes(q);
        const matchChar = book.characterName.toLowerCase().includes(q);
        const matchGenre = book.genre.toLowerCase().includes(q);
        if (!matchTitle && !matchSynopsis && !matchChar && !matchGenre) {
          return false;
        }
      }

      return true;
    });
  }, [seriesBooks, selectedLevel, selectedStatus, searchQuery]);

  if (!books.length) {
    return (
      <div className="mx-auto mt-10 max-w-7xl px-6">
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-b-[6px] border-slate-200 bg-white p-12 text-center shadow-xs">
          <BookOpen className="h-10 w-10 text-sky-500" />
          <h3 className="text-lg font-extrabold text-slate-800">
            Your bookshelf is empty
          </h3>
          <p className="max-w-sm text-xs text-slate-500">
            Once your SpoonBook generator finishes baking stories, they will
            appear right here.
          </p>
        </div>
      </div>
    );
  }

  const heroPct = heroBook
    ? Math.min(
        100,
        Math.round(
          (heroBook.completedCheckpointsCount / heroBook.totalPages) * 100
        )
      )
    : 0;

  const activeSeriesObj =
    SPOON_SERIES_CATEGORIES.find((c) => c.id === selectedSeries) ??
    SPOON_SERIES_CATEGORIES[0];

  const heroEpisodeIndex = heroBook
    ? seriesBooks.findIndex((b) => b.id === heroBook.id)
    : -1;

  return (
    <div className="relative z-20 mx-auto -mt-6 max-w-7xl space-y-8 px-6 lg:px-8">
      {/* =====================================================================
          UNIFIED 3D HERO CARD:
          Left: Dynamic Video/Cover Preview for Currently Selected Series/Episode
          Right: Character Series Selector + Interactive Episode Switcher
          ===================================================================== */}
      {heroBook && (
        <div className="overflow-hidden rounded-[2.25rem] border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* -------------------------------------------------------------
                LEFT (7 COLS): Dynamic 16:9 Video/Cover Preview
                ------------------------------------------------------------- */}
            <div className="relative flex min-h-[420px] flex-col justify-between overflow-hidden bg-slate-950 p-6 sm:min-h-[460px] sm:p-8 lg:col-span-7">
              {/* Keyed by heroBook.id so switching episodes immediately reloads video/cover! */}
              {heroBook.introVideoUrl ? (
                <video
                  key={`vid-${heroBook.id}`}
                  src={heroBook.introVideoUrl}
                  poster={heroBook.coverUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover animate-in fade-in duration-300"
                />
              ) : (
                <img
                  key={`img-${heroBook.id}`}
                  src={heroBook.coverUrl}
                  alt={heroBook.title}
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover animate-in fade-in duration-300"
                />
              )}

              {/* Scrim Overlay */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/30" />

              {/* Top Row: Dynamic Status Tag + Character Pill */}
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1 text-[11px] font-black tracking-wide text-slate-900 uppercase shadow-md backdrop-blur-md">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  {selectedBookId === heroBook.id
                    ? `Selected Preview${
                        heroEpisodeIndex >= 0
                          ? ` • Ep. ${heroEpisodeIndex + 1}`
                          : ""
                      }`
                    : !heroBook.isCompleted && heroBook.currentPage > 0
                      ? `Continue • Page ${heroBook.currentPage}`
                      : heroBook.lastReadAt
                        ? "Last Read Story"
                        : `Featured • Ep. ${
                            heroEpisodeIndex >= 0 ? heroEpisodeIndex + 1 : 1
                          }`}
                </span>

                <div className="flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/75 py-1 pr-3 pl-1 text-white backdrop-blur-md">
                  <img
                    src={heroBook.characterAvatarUrl}
                    alt={heroBook.characterName}
                    className="h-6 w-6 rounded-full object-cover ring-2 ring-emerald-400"
                  />
                  <span className="text-xs font-extrabold">
                    Starring {heroBook.characterName}
                  </span>
                </div>
              </div>

              {/* Bottom Overlaid Metadata, Progress, and 3D Action CTA */}
              <div className="relative z-10 space-y-4 pt-16 text-white">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {heroEpisodeIndex >= 0 && (
                      <span className="rounded-lg bg-sky-400 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-slate-950 uppercase">
                        Episode {heroEpisodeIndex + 1}
                      </span>
                    )}
                    <span className="rounded-lg bg-emerald-400 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-slate-950 uppercase">
                      {heroBook.levelBand}
                    </span>
                    <span className="rounded-lg bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white capitalize backdrop-blur-md">
                      {heroBook.genre}
                    </span>
                    <span className="rounded-lg bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                      {heroBook.totalPages} Pages
                    </span>
                  </div>

                  <h2 className="text-2xl font-black tracking-tight drop-shadow-md sm:text-3xl lg:text-4xl">
                    {heroBook.title}
                  </h2>

                  <p className="line-clamp-2 max-w-xl text-xs leading-relaxed text-slate-200 drop-shadow-xs sm:text-sm">
                    {heroBook.synopsis}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                      {heroBook.completedCheckpointsCount} of{" "}
                      {heroBook.totalPages} Checkpoints Solved
                    </span>
                    <span className="font-extrabold text-emerald-400">
                      {heroPct}%
                    </span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/20 backdrop-blur-md">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-500"
                      style={{ width: `${heroPct}%` }}
                    />
                  </div>
                </div>

                {/* Bottom Row: Language Pills + 3D Play CTA */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-1.5">
                    {heroBook.availableLanguages.map((lang) => (
                      <span
                        key={lang}
                        className="rounded-lg bg-white/15 px-2.5 py-1 text-[10px] font-black tracking-wider uppercase backdrop-blur-md"
                      >
                        {lang.split("-")[0]}
                      </span>
                    ))}
                  </div>

                  <Link
                    href={`/books/${heroBook.slug}`}
                    className="inline-flex items-center gap-2 rounded-2xl border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 px-7 py-3.5 text-xs font-black text-white shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:border-b-0 sm:text-sm"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>
                      {!heroBook.isCompleted && heroBook.currentPage > 0
                        ? `Resume Page ${heroBook.currentPage}`
                        : heroBook.isCompleted
                          ? "Read Again"
                          : "Start Reading"}
                    </span>
                  </Link>
                </div>
              </div>
            </div>

            {/* -------------------------------------------------------------
                RIGHT (5 COLS): Character Series Selector + Episode Picker
                ------------------------------------------------------------- */}
            <div className="flex flex-col justify-between border-t border-slate-100 bg-slate-50/70 p-5 sm:p-6 lg:col-span-5 lg:border-t-0 lg:border-l">
              <div className="space-y-4">
                {/* 1. Character Series Grid (2x2 Compact 3D Buttons) */}
                <div>
                  <div className="mb-2.5 flex items-center justify-between">
                    <h3 className="text-xs font-black tracking-wider text-slate-800 uppercase">
                      1. Choose Character Series
                    </h3>
                    <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-[10px] font-black text-slate-700">
                      {books.length} Stories
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {SPOON_SERIES_CATEGORIES.map((cat) => {
                      const isSelected = selectedSeries === cat.id;
                      const count = seriesCounts[cat.id] ?? 0;

                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setSelectedSeries(cat.id);
                            setSelectedBookId(null); // Auto-loads this character's last read or Ep 1 into the Hero Preview!
                          }}
                          className={`group flex items-center gap-2.5 rounded-2xl border-2 border-b-4 p-2.5 text-left transition-all duration-150 ${
                            isSelected
                              ? "border-blue-600 bg-white shadow-sm"
                              : "border-slate-200/90 border-b-slate-300 bg-white/90 hover:-translate-y-0.5 hover:border-sky-300 active:translate-y-0.5 active:border-b-2"
                          }`}
                        >
                          {cat.avatarUrl ? (
                            <img
                              src={cat.avatarUrl}
                              alt={cat.name}
                              className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-2xs"
                            />
                          ) : (
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cat.badgeBg}`}
                            >
                              {cat.icon}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <p className="truncate text-xs font-black text-slate-900">
                                {cat.name}
                              </p>
                              <span
                                className={`shrink-0 rounded-full px-1.5 py-0.2 text-[9px] font-black ${
                                  isSelected
                                    ? "bg-blue-600 text-white"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {count}
                              </span>
                            </div>
                            <p className="truncate text-[10px] font-bold text-slate-400">
                              {cat.seriesTitle}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Episodes in Selected Series (Click to Preview in Hero Video!) */}
                <div className="space-y-2 border-t border-slate-200/70 pt-3.5">
                  <div className="flex items-center justify-between">
                    <h4 className="flex items-center gap-1.5 text-xs font-black tracking-wider text-slate-800 uppercase">
                      <Film className="h-3.5 w-3.5 text-blue-600" />
                      <span>2. {activeSeriesObj.name} Episodes</span>
                    </h4>
                    <span className="text-[10px] font-bold text-blue-600">
                      Click to preview video
                    </span>
                  </div>

                  {seriesBooks.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/70 p-4 text-center">
                      <p className="text-xs font-black text-slate-700">
                        {activeSeriesObj.name} episodes coming soon!
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                        Currently previewing {heroBook.characterName} on the
                        left.
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-[195px] space-y-2 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">
                      {seriesBooks.map((ep, idx) => {
                        const isCurrentlyPreviewed = heroBook.id === ep.id;

                        return (
                          <button
                            key={ep.id}
                            type="button"
                            onClick={() => setSelectedBookId(ep.id)}
                            className={`flex w-full items-center justify-between gap-2.5 rounded-2xl border-2 border-b-4 p-2.5 text-left transition-all duration-150 ${
                              isCurrentlyPreviewed
                                ? "border-emerald-600 bg-emerald-50/70 shadow-2xs"
                                : "border-slate-200/80 border-b-slate-300 bg-white hover:border-sky-300"
                            }`}
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-2.5">
                              {/* Mini 3D Episode Number Badge */}
                              <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-b-2 text-[11px] font-black ${
                                  isCurrentlyPreviewed
                                    ? "border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white"
                                    : "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white"
                                }`}
                              >
                                #{idx + 1}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-black text-slate-900">
                                  {ep.title}
                                </p>
                                <p className="truncate text-[10px] font-bold text-slate-400">
                                  {ep.characterName} •{" "}
                                  {ep.isCompleted
                                    ? "Completed ✓"
                                    : ep.currentPage > 0
                                      ? `Page ${ep.currentPage}/${ep.totalPages}`
                                      : `${ep.totalPages} Pages`}
                                </p>
                              </div>
                            </div>

                            <span
                              className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-black uppercase ${
                                isCurrentlyPreviewed
                                  ? "bg-emerald-500 text-white"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {isCurrentlyPreviewed ? "Playing" : "Preview"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Status Helper */}
              <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-3 text-[11px] font-semibold text-slate-400">
                <span>Now Previewing:</span>
                <span className="truncate max-w-[180px] font-black text-slate-800">
                  {heroBook.title}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          2. INTERACTIVE STORY CATALOG TABLE & FILTERS
          ===================================================================== */}
      <section className="overflow-hidden rounded-[2.25rem] border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white shadow-sm">
        {/* Filter Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stories, characters, or genres..."
              className="w-full rounded-full bg-slate-100/90 py-2 pr-4 pl-10 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-full bg-slate-100 p-1">
              {(["all", "beginner", "intermediate", "advanced"] as const).map(
                (lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSelectedLevel(lvl)}
                    className={`rounded-full px-3 py-1 text-[11px] font-extrabold capitalize transition ${
                      selectedLevel === lvl
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {lvl === "all" ? "All Levels" : lvl}
                  </button>
                )
              )}
            </div>

            <div className="flex items-center rounded-full bg-slate-100 p-1">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "in-progress", label: "In Progress" },
                  { id: "completed", label: "Completed" },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSelectedStatus(st.id)}
                  className={`rounded-full px-3 py-1 text-[11px] font-extrabold transition ${
                    selectedStatus === st.id
                      ? "bg-white text-sky-700 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Story Rows List */}
        {filteredBooks.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-bold text-slate-700">
              No stories match your current filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedSeries("all");
                setSelectedBookId(null);
                setSelectedLevel("all");
                setSelectedStatus("all");
                setSearchQuery("");
              }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-4 py-1.5 text-xs font-extrabold text-sky-700 hover:bg-sky-100"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Filters</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredBooks.map((book) => {
              const pct = Math.min(
                100,
                Math.round(
                  (book.completedCheckpointsCount / book.totalPages) * 100
                )
              );
              const isPreviewed = heroBook?.id === book.id;

              return (
                <div
                  key={book.id}
                  className={`group flex flex-col gap-4 p-4 transition sm:flex-row sm:items-center sm:justify-between sm:p-5 ${
                    isPreviewed ? "bg-sky-50/50" : "hover:bg-slate-50/80"
                  }`}
                >
                  {/* Left: 16:9 Cover Thumbnail + Title & Synopsis */}
                  <div
                    onClick={() => setSelectedBookId(book.id)}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-4"
                  >
                    <div className="relative aspect-[16/10] w-28 shrink-0 overflow-hidden rounded-2xl border-2 border-b-4 border-slate-200 bg-slate-200 shadow-2xs sm:w-36">
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      {book.isCompleted && (
                        <div className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-slate-950 shadow-xs">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pr-2.5 pl-1 text-[10px] font-bold text-slate-700">
                          <img
                            src={book.characterAvatarUrl}
                            alt={book.characterName}
                            className="h-4 w-4 rounded-full object-cover"
                          />
                          {book.characterName}
                        </span>

                        <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[10px] font-extrabold text-sky-700 uppercase">
                          {book.levelBand}
                        </span>

                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500 capitalize">
                          {book.genre}
                        </span>
                      </div>

                      <h4 className="truncate text-base font-black text-slate-900 transition-colors group-hover:text-sky-600">
                        {book.title}
                      </h4>

                      <p className="line-clamp-1 text-xs text-slate-500">
                        {book.synopsis}
                      </p>
                    </div>
                  </div>

                  {/* Right: Progress + Preview Button + 3D Read CTA */}
                  <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                    <div className="w-28 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                        <span>
                          {book.completedCheckpointsCount}/{book.totalPages}
                        </span>
                        <span
                          className={
                            book.isCompleted
                              ? "font-extrabold text-emerald-600"
                              : ""
                          }
                        >
                          {book.isCompleted
                            ? "Completed"
                            : pct > 0
                              ? `${pct}%`
                              : `${book.totalPages} Pages`}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full transition-all ${
                            book.isCompleted
                              ? "bg-emerald-500"
                              : "bg-gradient-to-r from-sky-500 to-emerald-400"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedBookId(book.id)}
                      className={`hidden sm:inline-flex items-center gap-1 rounded-xl border-2 border-b-[3px] px-3 py-1.5 text-xs font-black transition ${
                        isPreviewed
                          ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-sky-300"
                      }`}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>{isPreviewed ? "Previewing" : "Preview"}</span>
                    </button>

                    <Link
                      href={`/books/${book.slug}`}
                      className={`inline-flex items-center gap-1.5 rounded-xl border-b-[3px] px-4 py-2 text-xs font-black text-white shadow-2xs transition hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-0 ${
                        book.isCompleted
                          ? "border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600"
                          : book.currentPage > 0
                            ? "border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950"
                            : "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600"
                      }`}
                    >
                      <span>
                        {book.isCompleted
                          ? "Re-read"
                          : book.currentPage > 0
                            ? "Resume"
                            : "Read"}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}