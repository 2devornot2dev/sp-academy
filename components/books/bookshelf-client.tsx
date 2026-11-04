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
    seriesTitle: "Complete Spoon Catalog",
    tagline: "Every interactive story & series",
    matchCharacter: null,
    badgeBg: "bg-sky-50 text-sky-700",
    icon: <Layers className="h-4 w-4 text-sky-500" />,
  },
  {
    id: "q-to",
    name: "Q-to",
    seriesTitle: "Chronicles of Pluto",
    tagline: "Mischievous alien baby adventures",
    matchCharacter: "q-to",
    badgeBg: "bg-violet-50 text-violet-700",
    icon: <Orbit className="h-4 w-4 text-violet-500" />,
    avatarUrl:
      "https://res.cloudinary.com/dmllgn0t7/image/upload/v1793732453/q-to.jpg",
  },
  {
    id: "billy",
    name: "Billy",
    seriesTitle: "The Trap",
    tagline: "Street-smart hustles & big heart",
    matchCharacter: "billy",
    badgeBg: "bg-amber-50 text-amber-800",
    icon: <Flame className="h-4 w-4 text-amber-500" />,
  },
  {
    id: "momentum-man",
    name: "Momentum Man",
    seriesTitle: "Momentum Universe",
    tagline: "High-voltage kinetic heroics",
    matchCharacter: "momentum",
    badgeBg: "bg-cyan-50 text-cyan-700",
    icon: <Zap className="h-4 w-4 text-cyan-500" />,
  },
];

export function BookshelfClient({ books }: { books: BookshelfItem[] }) {
  const [selectedSeries, setSelectedSeries] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // 1. Pick Hero Book (In-progress -> recently finished -> newest)
  const heroBook = useMemo(() => {
    if (!books.length) return null;
    const inProgress = books
      .filter((b) => !b.isCompleted && b.currentPage > 0)
      .sort((a, b) =>
        (b.lastReadAt || "").localeCompare(a.lastReadAt || "")
      );
    if (inProgress.length > 0) return inProgress[0];

    const recentlyRead = books
      .filter((b) => b.lastReadAt)
      .sort((a, b) =>
        (b.lastReadAt || "").localeCompare(a.lastReadAt || "")
      );
    if (recentlyRead.length > 0) return recentlyRead[0];

    return books[0];
  }, [books]);

  // 2. Count books per character series
  const seriesCounts = useMemo(() => {
    const counts: Record<string, number> = { all: books.length };
    for (const cat of SPOON_SERIES_CATEGORIES) {
      if (!cat.matchCharacter) continue;
      counts[cat.id] = books.filter((b) =>
        b.characterName.toLowerCase().includes(cat.matchCharacter!)
      ).length;
    }
    return counts;
  }, [books]);

  // 3. Filter books for the catalog list
  const filteredBooks = useMemo(() => {
    const activeCat = SPOON_SERIES_CATEGORIES.find(
      (c) => c.id === selectedSeries
    );

    return books.filter((book) => {
      if (activeCat?.matchCharacter) {
        if (
          !book.characterName
            .toLowerCase()
            .includes(activeCat.matchCharacter.toLowerCase())
        ) {
          return false;
        }
      }

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
      if (
        selectedStatus === "unread" &&
        (book.isCompleted || book.completedCheckpointsCount > 0)
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
  }, [books, selectedSeries, selectedLevel, selectedStatus, searchQuery]);

  if (!books.length) {
    return (
      <div className="mx-auto mt-10 max-w-7xl px-6">
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl bg-white p-12 text-center shadow-xs">
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

  return (
    <div className="mx-auto -mt-6 max-w-7xl space-y-8 px-6 lg:px-8 relative z-20">
      {/* =====================================================================
          UNIFIED HERO CARD:
          Left: Cinema Art + Story Overlay
          Right: Character Series Selector Dock
          ===================================================================== */}
      {heroBook && (
        <div className="overflow-hidden rounded-[2.5rem] bg-white shadow-xl ring-1 ring-slate-200/80">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* -------------------------------------------------------------
                LEFT (7.5 COLS): 16:9 Video/Cover with all text overlaid on top
                ------------------------------------------------------------- */}
            <div className="relative min-h-[420px] sm:min-h-[460px] overflow-hidden bg-slate-950 lg:col-span-7 xl:col-span-8 flex flex-col justify-between p-6 sm:p-8">
              {/* Media Background */}
              {heroBook.introVideoUrl ? (
                <video
                  src={heroBook.introVideoUrl}
                  poster={heroBook.coverUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <img
                  src={heroBook.coverUrl}
                  alt={heroBook.title}
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                />
              )}

              {/* Scrim Overlay */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/35" />

              {/* Top Row: Status Tag + Character Avatar */}
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1 text-[11px] font-black tracking-wide text-slate-900 uppercase shadow-md backdrop-blur-md">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  {!heroBook.isCompleted && heroBook.currentPage > 0
                    ? `Continue • Page ${heroBook.currentPage}`
                    : heroBook.isCompleted
                      ? "Last Completed Story"
                      : "Featured Story"}
                </span>

                <div className="flex items-center gap-2 rounded-full bg-slate-950/70 py-1 pr-3 pl-1 text-white backdrop-blur-md">
                  <img
                    src={heroBook.characterAvatarUrl}
                    alt={heroBook.characterName}
                    className="h-6 w-6 rounded-full object-cover ring-2 ring-emerald-400"
                  />
                  <span className="text-xs font-bold">
                    {heroBook.characterName}
                  </span>
                </div>
              </div>

              {/* Bottom Overlaid Metadata, Progress, and Action CTA */}
              <div className="relative z-10 space-y-4 pt-16 text-white">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-400 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-slate-950 uppercase">
                      {heroBook.levelBand}
                    </span>
                    <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white capitalize backdrop-blur-md">
                      {heroBook.genre}
                    </span>
                    <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                      {heroBook.totalPages} Pages
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight drop-shadow-md">
                    {heroBook.title}
                  </h2>

                  <p className="line-clamp-2 max-w-xl text-xs sm:text-sm text-slate-200 drop-shadow-xs">
                    {heroBook.synopsis}
                  </p>
                </div>

                {/* Progress bar on top of image */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                      {heroBook.completedCheckpointsCount} of{" "}
                      {heroBook.totalPages} Checkpoints Solved
                    </span>
                    <span className="text-emerald-400 font-extrabold">
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

                {/* Bottom Row: Language Pills + Play CTA */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-1">
                    {heroBook.availableLanguages.map((lang) => (
                      <span
                        key={lang}
                        className="rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider backdrop-blur-md"
                      >
                        {lang.split("-")[0]}
                      </span>
                    ))}
                  </div>

                  <Link
                    href={`/books/${heroBook.slug}`}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-400 via-teal-400 to-emerald-400 px-6 py-3 text-xs sm:text-sm font-black text-slate-950 shadow-lg transition hover:scale-[1.02] active:scale-[0.98]"
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
                RIGHT (4.5 COLS): Character Series Collection Dock
                ------------------------------------------------------------- */}
            <div className="flex flex-col justify-between p-6 sm:p-7 bg-slate-50/60 lg:col-span-5 xl:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-100">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Character Series
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Select a series to filter catalog
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-[11px] font-black text-slate-700">
                    {books.length} Total
                  </span>
                </div>

                <div className="space-y-2.5">
                  {SPOON_SERIES_CATEGORIES.map((cat) => {
                    const isSelected = selectedSeries === cat.id;
                    const count = seriesCounts[cat.id] ?? 0;

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedSeries(cat.id)}
                        className={`group flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all ${
                          isSelected
                            ? "bg-white shadow-md ring-2 ring-sky-500 scale-[1.01]"
                            : "bg-white/80 hover:bg-white shadow-2xs ring-1 ring-slate-200/70"
                        }`}
                      >
                        {cat.avatarUrl ? (
                          <img
                            src={cat.avatarUrl}
                            alt={cat.name}
                            className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-2xs"
                          />
                        ) : (
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cat.badgeBg}`}
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
                              className={`shrink-0 rounded-full px-2 py-0.2 text-[10px] font-bold ${
                                isSelected
                                  ? "bg-sky-500 text-white"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {count}
                            </span>
                          </div>
                          <p className="truncate text-[11px] font-bold text-sky-600">
                            {cat.seriesTitle}
                          </p>
                          <p className="truncate text-[10px] text-slate-400">
                            {cat.tagline}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Quick Reset Helper */}
              <div className="pt-4 mt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400">
                <span>Active Filter:</span>
                <span className="font-bold text-slate-700 capitalize">
                  {selectedSeries} Series
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          2. INTERACTIVE STORY CATALOG TABLE & FILTERS
          ===================================================================== */}
      <section className="overflow-hidden rounded-[2.5rem] bg-white shadow-md ring-1 ring-slate-200/70">
        {/* Filter Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stories, characters, or genres..."
              className="w-full rounded-full bg-slate-100/90 py-2 pr-4 pl-10 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          {/* Level & Status Filter Pills */}
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

              return (
                <Link
                  key={book.id}
                  href={`/books/${book.slug}`}
                  className="group flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 transition hover:bg-sky-50/40"
                >
                  {/* Left: 16:9 Cover Thumbnail + Title & Synopsis */}
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="relative aspect-[16/10] w-28 sm:w-36 shrink-0 overflow-hidden rounded-2xl bg-slate-200 shadow-2xs">
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

                      <h4 className="truncate text-base font-black text-slate-900 group-hover:text-sky-600 transition-colors">
                        {book.title}
                      </h4>

                      <p className="line-clamp-1 text-xs text-slate-500">
                        {book.synopsis}
                      </p>
                    </div>
                  </div>

                  {/* Right: Checkpoints Progress + Languages + CTA Pill */}
                  <div className="flex items-center justify-between gap-6 sm:justify-end shrink-0">
                    <div className="w-32 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                        <span>
                          {book.completedCheckpointsCount}/{book.totalPages}
                        </span>
                        <span
                          className={
                            book.isCompleted
                              ? "text-emerald-600 font-extrabold"
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

                    <div className="hidden md:flex items-center gap-1">
                      {book.availableLanguages.map((lang) => (
                        <span
                          key={lang}
                          className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-500 uppercase"
                        >
                          {lang.split("-")[0]}
                        </span>
                      ))}
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-black transition ${
                        book.isCompleted
                          ? "bg-slate-100 text-slate-700 group-hover:bg-sky-500 group-hover:text-white"
                          : book.currentPage > 0
                            ? "bg-amber-400 text-slate-950 shadow-xs"
                            : "bg-sky-50 text-sky-700 group-hover:bg-sky-500 group-hover:text-white"
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
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}