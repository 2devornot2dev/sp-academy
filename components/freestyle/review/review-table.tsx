// components/freestyle/review/review-table.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowRight,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Search,
  Sparkles,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import type { UserReviewListItem } from "@/app/actions/get-user-reviews";

const MODE_LABELS: Record<string, string> = {
  ALL: "All Modes",
  FOCUSED: "Spoon Focus",
  RANDOM: "Surprise Me",
  SPECIFIC: "Custom",
  ARGUMENTATIVE: "Debate",
};

function getGradeMeta(score: number | null) {
  if (score === null) {
    return {
      letter: "—",
      pill: "border-slate-200 bg-slate-100 text-slate-500",
      heroRing: "border-slate-500 bg-slate-800 text-slate-300",
    };
  }
  if (score >= 90) {
    return {
      letter: "A+",
      pill: "border-emerald-300 bg-emerald-50 text-emerald-700",
      heroRing: "border-emerald-400 bg-emerald-500/20 text-emerald-300",
    };
  }
  if (score >= 80) {
    return {
      letter: "A",
      pill: "border-emerald-300 bg-emerald-50 text-emerald-700",
      heroRing: "border-emerald-400 bg-emerald-500/20 text-emerald-300",
    };
  }
  if (score >= 70) {
    return {
      letter: "B",
      pill: "border-sky-300 bg-sky-50 text-sky-700",
      heroRing: "border-sky-400 bg-sky-500/20 text-sky-300",
    };
  }
  if (score >= 60) {
    return {
      letter: "C",
      pill: "border-amber-300 bg-amber-50 text-amber-700",
      heroRing: "border-amber-400 bg-amber-500/20 text-amber-300",
    };
  }
  return {
    letter: "D",
    pill: "border-rose-300 bg-rose-50 text-rose-700",
    heroRing: "border-rose-400 bg-rose-500/20 text-rose-300",
  };
}

function ScoreCell({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-xs font-bold text-slate-300">—</span>;
  }
  const color =
    value >= 80
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : value >= 65
        ? "text-sky-700 bg-sky-50 border-sky-200"
        : "text-amber-700 bg-amber-50 border-amber-200";
  return (
    <span
      className={`inline-flex min-w-[44px] items-center justify-center rounded-lg border px-2 py-0.5 text-xs font-black ${color}`}
    >
      {value}%
    </span>
  );
}

export function ReviewTable({ reviews }: { reviews: UserReviewListItem[] }) {
  const [selectedId, setSelectedId] = useState<string>(reviews[0]?.id ?? "");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [modeFilter, setModeFilter] = useState<string>("ALL");

  const filteredByMode = useMemo(() => {
    if (modeFilter === "ALL") return reviews;
    return reviews.filter((r) => r.mode === modeFilter);
  }, [reviews, modeFilter]);

  const selectedReview = useMemo(
    () => reviews.find((r) => r.id === selectedId) ?? reviews[0] ?? null,
    [reviews, selectedId],
  );

  const isLatest = selectedReview?.id === reviews[0]?.id;

  const columns = useMemo<ColumnDef<UserReviewListItem>[]>(
    () => [
      {
        accessorKey: "topic",
        header: ({ column }) => (
          <button
            type="button"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
            className="inline-flex items-center gap-1 text-[11px] font-black tracking-wider text-slate-500 uppercase hover:text-slate-900"
          >
            <span>Session</span>
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => {
          const item = row.original;
          const dateStr = new Date(item.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          return (
            <div className="min-w-[200px] py-1">
              <div className="font-black text-slate-900 text-sm">
                {item.topic || "Live Conversation Practice"}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-slate-400">
                <span className="rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-black text-indigo-700 uppercase">
                  {MODE_LABELS[item.mode] || item.mode}
                </span>
                <span>•</span>
                <span suppressHydrationWarning>{dateStr}</span>
                <span>•</span>
                <span className="inline-flex items-center gap-0.5">
                  <Clock className="h-3 w-3" />
                  {Math.max(1, Math.round(item.duration / 60))}m
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "overallScore",
        header: ({ column }) => (
          <button
            type="button"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
            className="inline-flex items-center gap-1 text-[11px] font-black tracking-wider text-slate-500 uppercase hover:text-slate-900"
          >
            <span>Grade</span>
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => {
          const item = row.original;
          if (!item.isReady) {
            return (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700">
                <Loader2 className="h-3 w-3 animate-spin" />
                Baking
              </span>
            );
          }
          const g = getGradeMeta(item.overallScore);
          return (
            <span
              className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-black ${g.pill}`}
            >
              <span>{g.letter}</span>
              <span className="opacity-75">({item.overallScore}%)</span>
            </span>
          );
        },
      },
      {
        accessorKey: "grammarScore",
        header: ({ column }) => (
          <button
            type="button"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
            className="inline-flex items-center gap-1 text-[11px] font-black tracking-wider text-slate-500 uppercase hover:text-slate-900"
          >
            <span>Grammar</span>
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => <ScoreCell value={row.original.grammarScore} />,
      },
      {
        accessorKey: "vocabScore",
        header: ({ column }) => (
          <button
            type="button"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
            className="inline-flex items-center gap-1 text-[11px] font-black tracking-wider text-slate-500 uppercase hover:text-slate-900"
          >
            <span>Vocab</span>
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => <ScoreCell value={row.original.vocabScore} />,
      },
      {
        accessorKey: "pronunciationScore",
        header: ({ column }) => (
          <button
            type="button"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
            className="inline-flex items-center gap-1 text-[11px] font-black tracking-wider text-slate-500 uppercase hover:text-slate-900"
          >
            <span>Speech</span>
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <ScoreCell value={row.original.pronunciationScore} />
        ),
      },
      {
        accessorKey: "fluencyScore",
        header: ({ column }) => (
          <button
            type="button"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
            className="inline-flex items-center gap-1 text-[11px] font-black tracking-wider text-slate-500 uppercase hover:text-slate-900"
          >
            <span>Fluency</span>
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => <ScoreCell value={row.original.fluencyScore} />,
      },
      {
        accessorKey: "topWeakness",
        header: () => (
          <span className="text-[11px] font-black tracking-wider text-slate-500 uppercase">
            Key Focus &amp; Fixes
          </span>
        ),
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="max-w-[240px]">
              <p className="truncate text-xs font-bold text-slate-700">
                {item.topWeakness ||
                  (item.isReady ? "Solid overall structure" : "Analyzing...")}
              </p>
              {item.isReady && (
                <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                  {item.mistakesCount} fixes • {item.vocabUpgradesCount} upgrades
                </p>
              )}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Open</span>,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Link
              href={`/conversation/${item.id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 rounded-xl border-b-[3px] border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-3.5 py-1.5 text-xs font-black text-white shadow-2xs transition hover:brightness-105 active:translate-y-0.5 active:border-b-0 whitespace-nowrap"
            >
              <span>{item.isReady ? "Open" : "Status"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          );
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredByMode,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue).toLowerCase();
      const r = row.original;
      return (
        (r.topic || "").toLowerCase().includes(q) ||
        (r.mode || "").toLowerCase().includes(q) ||
        (r.topWeakness || "").toLowerCase().includes(q)
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 8,
      },
    },
  });

  if (reviews.length === 0) {
    return (
      <div className="rounded-3xl border-2 border-b-[6px] border-slate-200 border-b-slate-300 bg-white p-12 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-md">
          <Sparkles className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">
          No Conversation Reviews Yet
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm font-medium text-slate-500">
          Complete your first 3-minute live AI conversation to unlock a full
          grammar, vocabulary, and pronunciation breakdown!
        </p>
        <Link
          href="/conversation"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 px-7 py-3.5 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-105"
        >
          <span>Start 3-Minute Conversation</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const selectedGrade = getGradeMeta(selectedReview?.overallScore ?? null);

  return (
    <div className="space-y-6">
      {/* =====================================================================
          1. FEATURED / SELECTED REVIEW HERO CARD (Updates when clicking rows!)
          ===================================================================== */}
      {selectedReview && (
        <div className="relative overflow-hidden rounded-3xl border-2 border-b-[6px] border-indigo-950/90 bg-gradient-to-r from-[#0F172A] via-[#131D36] to-[#1E1B4B] p-6 text-white shadow-xl sm:p-8">
          <div className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-12 h-56 w-56 rounded-full bg-sky-500/15 blur-3xl" />

          <div className="relative z-10 grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
            {/* Left Info (7 cols) */}
            <div className="space-y-4 lg:col-span-7">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/35 bg-sky-500/20 px-3 py-1 text-[10px] font-black tracking-wider text-sky-300 uppercase">
                  <Sparkles className="h-3 w-3 text-amber-300" />
                  {isLatest ? "Latest Session Review" : "Selected Session"}
                </span>

                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black tracking-wider text-slate-200 uppercase">
                  {MODE_LABELS[selectedReview.mode] || selectedReview.mode} •{" "}
                  {selectedReview.level}
                </span>

                <span
                  suppressHydrationWarning
                  className="text-xs font-bold text-slate-400"
                >
                  {new Date(selectedReview.createdAt).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric", year: "numeric" },
                  )}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div
                  className={`flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl border-2 shadow-lg ${selectedGrade.heroRing}`}
                >
                  {selectedReview.isReady ? (
                    <>
                      <span className="text-3xl font-black leading-none">
                        {selectedGrade.letter}
                      </span>
                      <span className="mt-1 text-[11px] font-extrabold text-white/90">
                        {selectedReview.overallScore}%
                      </span>
                    </>
                  ) : (
                    <Loader2 className="h-7 w-7 animate-spin text-amber-300" />
                  )}
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-2xl font-black tracking-tight text-white sm:text-3xl">
                    {selectedReview.topic || "Live Conversation Practice"}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-xs sm:text-sm font-medium leading-relaxed text-slate-300">
                    {selectedReview.summary ||
                      (selectedReview.isReady
                        ? "Open this session to review your grammar fixes and practice your pronunciation."
                        : "Your AI report is currently baking in the background.")}
                  </p>
                </div>
              </div>

              {/* Quick Insights Chips */}
              {selectedReview.isReady && (
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {selectedReview.topWeakness && (
                    <div className="inline-flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/15 px-3 py-1.5 text-xs font-bold text-rose-200">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                      <span className="truncate max-w-[260px]">
                        Focus: {selectedReview.topWeakness}
                      </span>
                    </div>
                  )}

                  {selectedReview.topUpgrade && (
                    <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-200">
                      <BookOpen className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span className="truncate max-w-[260px]">
                        Upgrade: {selectedReview.topUpgrade.better}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Metrics & CTA (5 cols) */}
            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.05] p-5 lg:col-span-5">
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: "Grammar", val: selectedReview.grammarScore },
                  { label: "Vocab", val: selectedReview.vocabScore },
                  { label: "Speech", val: selectedReview.pronunciationScore },
                  { label: "Fluency", val: selectedReview.fluencyScore },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="rounded-xl border border-white/10 bg-slate-900/70 py-2.5"
                  >
                    <span className="block text-[9px] font-black tracking-wider text-slate-400 uppercase">
                      {m.label}
                    </span>
                    <span className="mt-0.5 block text-base font-black text-white">
                      {m.val ?? "—"}
                      {m.val !== null ? "%" : ""}
                    </span>
                  </div>
                ))}
              </div>

              <Link
                href={`/conversation/${selectedReview.id}`}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 px-6 py-3.5 text-sm font-black text-white shadow-xl shadow-emerald-500/25 transition hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:border-b-0"
              >
                <span>
                  {selectedReview.isReady
                    ? "Open Interactive AI Review"
                    : "Check Report Status"}
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          2. FULL-WIDTH TANSTACK TABLE CARD
          ===================================================================== */}
      <div className="overflow-hidden rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white shadow-sm">
        {/* Table Toolbar: Search & Mode Filter */}
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2">
            {(["ALL", "FOCUSED", "RANDOM", "SPECIFIC", "ARGUMENTATIVE"] as const).map(
              (modeKey) => {
                const active = modeFilter === modeKey;
                return (
                  <button
                    key={modeKey}
                    type="button"
                    onClick={() => setModeFilter(modeKey)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${
                      active
                        ? "border-b-2 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                    }`}
                  >
                    {MODE_LABELS[modeKey]}
                  </button>
                );
              },
            )}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search topic or grammar focus..."
              className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 py-2 pr-4 pl-10 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="border-b border-slate-100 bg-slate-50/70"
                >
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-5 py-3.5">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody className="divide-y divide-slate-100">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-10 text-center text-sm font-bold text-slate-400"
                  >
                    No sessions match your filter.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => {
                  const isSelected = row.original.id === selectedReview?.id;
                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedId(row.original.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-sky-50/70 hover:bg-sky-50"
                          : "hover:bg-slate-50/80"
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-5 py-3.5 align-middle">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-3.5">
          <span className="text-xs font-bold text-slate-500">
            Showing{" "}
            <strong className="font-black text-slate-900">
              {table.getRowModel().rows.length}
            </strong>{" "}
            of{" "}
            <strong className="font-black text-slate-900">
              {table.getFilteredRowModel().rows.length}
            </strong>{" "}
            sessions • Click any row to preview above
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="inline-flex items-center gap-1 rounded-xl border-2 border-b-[3px] border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Prev</span>
            </button>

            <span className="px-2 text-xs font-black text-slate-600">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {Math.max(1, table.getPageCount())}
            </span>

            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="inline-flex items-center gap-1 rounded-xl border-2 border-b-[3px] border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}