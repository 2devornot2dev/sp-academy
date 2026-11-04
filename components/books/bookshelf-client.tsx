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
  Clock,
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
  gradient: string;
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
    gradient: "from-sky-500 to-emerald-500",
    badgeBg: "bg-sky-50 text-sky-700",
    icon: <Layers className="h-5 w-5 text-sky-500" />,
  },
  {
    id: "q-to",
    name: "Q-to",
    seriesTitle: "Chronicles of Pluto",
    tagline: "Mischievous alien baby adventures",
    matchCharacter: "q-to",
    gradient: "from-violet-500 to-fuchsia-500",
    badgeBg: "bg-violet-50 text-violet-700",
    icon: <Orbit className="h-5 w-5 text-violet-500" />,
    avatarUrl:
      "https://res.cloudinary.com/dmllgn0t7/image/upload/v1793732453/q-to.jpg",
  },
  {
    id: "billy",
    name: "Billy",
    seriesTitle: "The Trap",
    tagline: "Street-smart hustles & big heart",
    matchCharacter: "billy",
    gradient: "from-amber-500 to-orange-500",
    badgeBg: "bg-amber-50 text-amber-800",
    icon: <Flame className="h-5 w-5 text-amber-500" />,
  },
  {
    id: "momentum-man",
    name: "Momentum Man",
    seriesTitle: "Momentum Universe",
    tagline: "High-voltage kinetic heroics",
    matchCharacter: "momentum",
    gradient: "from-cyan-500 to-blue-600",
    badgeBg: "bg-cyan-50 text-cyan-700",
    icon: <Zap className="h-5 w-5 text-cyan-500" />,
  },
];

export function BookshelfClient({ books }: { books: BookshelfItem[] }) {
  const [selectedSeries, setSelectedSeries] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // 1. Pick the Hero Book:
  // Prioritize the most recently read in-progress book -> otherwise most recently touched -> otherwise newest book
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

  // 3. Filter books for the catalog table
  const filteredBooks = useMemo(() => {
    const activeCat = SPOON_SERIES_CATEGORIES.find(
      (c) => c.id === selectedSeries
    );

    return books.filter((book) => {
      // Character / Series filter
      if (activeCat?.matchCharacter) {
        if (
          !book.characterName
            .toLowerCase()
            .includes(activeCat.matchCharacter.toLowerCase())
        ) {
          return false;
        }
      }

      // Level filter
      if (
        selectedLevel !== "all" &&
        book.levelBand.toLowerCase() !== selectedLevel
      ) {
        return false;
      }

      // Status filter
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

      // Search query
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
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl bg-white p-12 text-center shadow-sm">
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

  return (
    <div className="mx-auto -mt-6 max-w-7xl space-y-10 px-6 lg:px-8 relative z-20">
      {/* =====================================================================
          1. HERO SPOTLIGHT CARD (Continue Reading / Last Read)
          ===================================================================== */}
      {heroBook && (
        <div className="overflow-hidden rounded-[2rem] bg-white shadow-xl ring-1 ring-slate-200/70">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Left 7 Cols: True 16:9 Presigned Book Cover (or Intro Video!) */}
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-900 lg:col-span-7">
              {heroBook.introVideoUrl ? (
                <video
                  src={heroBook.introVideoUrl}
                  poster={heroBook.coverUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <img
                  src={heroBook.coverUrl}
                  alt={heroBook.title}
                  className="h-full w-full object-cover"
                />
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-black/15" />

              {/* Top Left Status Pill */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1 text-[11px] font-black tracking-wide text-slate-900 uppercase shadow-md backdrop-blur-md">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  {!heroBook.isCompleted && heroBook.currentPage > 0
                    ? "Continue Reading"
                    : heroBook.isCompleted
                      ? "Last Completed Story"
                      : "Featured Story"}
                </span>
              </div>

              {/* Bottom Left Character Badge */}
              <div className="absolute bottom-4 left-4 flex items-center gap-2.5 rounded-full bg-slate-950/75 py-1.5 pr-4 pl-1.5 text-white backdrop-blur-md">
                <img
                  src={heroBook.characterAvatarUrl}
                  alt={heroBook.characterName}
                  className="h-7 w-7 rounded-full object-cover ring-2 ring-emerald-400"
                />
                <span className="text-xs font-bold">
                  Starring {heroBook.characterName}
                </span>
              </div>
            </div>

            {/* Right 5 Cols: Story Details, Progress & Primary CTA */}
            <div className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-5">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-[11px] font-black tracking-wide text-sky-800 uppercase">
                    {heroBook.levelBand}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600 capitalize">
                    {heroBook.genre}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                    {heroBook.totalPages} Pages
                  </span>
                </div>

                <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  {heroBook.title}
                </h2>

                <p className="text-sm leading-relaxed text-slate-600">
                  {heroBook.synopsis}
                </p>
              </div>

              <div className="mt-6 space-y-4 pt-4 border-t border-slate-100">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-extrabold text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      {heroBook.completedCheckpointsCount} of{" "}
                      {heroBook.totalPages} Checkpoints Solved
                    </span>
                    <span className="text-sky-600">
                      {Math.round(
                        (heroBook.completedCheckpointsCount /
                          heroBook.totalPages) *
                          100
                      )}
                      %
                    </span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            (heroBook.completedCheckpointsCount /
                              heroBook.totalPages) *
                              100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 pt-1">
                  <div className="flex items-center gap-1.5">
                    {heroBook.availableLanguages.map((lang) => (
                      <span
                        key={lang}
                        className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600 uppercase"
                      >
                        {lang.split("-")[0]}
                      </span>
                    ))}
                  </div>

                  <Link
                    href={`/books/${heroBook.slug}`}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-sky-500/20 transition hover:scale-[1.02] active:scale-[0.98]"
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
          </div>
        </div>
      )}

      {/* =====================================================================
          2. SPOON UNIVERSE SERIES / CHARACTER SELECTOR
          ===================================================================== */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900">
              Choose a Character Series
            </h3>
            <p className="text-xs font-medium text-slate-500">
              Filter stories by your favorite Spoon Universe character
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {SPOON_SERIES_CATEGORIES.map((cat) => {
            const isSelected = selectedSeries === cat.id;
            const count = seriesCounts[cat.id] ?? 0;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedSeries(cat.id)}
                className={`group relative flex items-center gap-3.5 rounded-2xl p-4 text-left transition-all ${
                  isSelected
                    ? "bg-white shadow-lg ring-2 ring-sky-500 scale-[1.01]"
                    : "bg-white/80 hover:bg-white shadow-xs ring-1 ring-slate-200/70"
                }`}
              >
                {/* Avatar or Series Icon */}
                {cat.avatarUrl ? (
                  <img
                    src={cat.avatarUrl}
                    alt={cat.name}
                    className="h-12 w-12 shrink-0 rounded-2xl object-cover shadow-xs"
                  />
                ) : (
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${cat.badgeBg}`}
                  >
                    {cat.icon}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate text-sm font-black text-slate-900">
                      {cat.name}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${
                        isSelected
                          ? "bg-sky-500 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {count} {count === 1 ? "Book" : "Books"}
                    </span>
                  </div>
                  <p className="truncate text-[11px] font-bold text-sky-600">
                    {cat.seriesTitle}
                  </p>
                  <p className="truncate text-[11px] text-slate-400">
                    {cat.tagline}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* =====================================================================
          3. INTERACTIVE STORY CATALOG TABLE & FILTERS
          ===================================================================== */}
      <section className="overflow-hidden rounded-[2rem] bg-white shadow-md ring-1 ring-slate-200/70">
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
                  {/* Left: 16:9 Real Cover Thumbnail + Title & Synopsis */}
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="relative aspect-[16/10] w-28 sm:w-36 shrink-0 overflow-hidden rounded-2xl bg-slate-200 shadow-xs">
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
                    {/* Progress Column */}
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

                    {/* Languages */}
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

                    {/* Action Button */}
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