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
  Flame,
  Crown,
} from "lucide-react";
import type { UserReviewListItem } from "@/app/actions/get-user-reviews";
import { getAlphaGrade } from "@/lib/freestyle/grades";

const MODE_LABELS: Record<string, string> = {
  ALL: "All Modes",
  FOCUSED: "Spoon Focus",
  RANDOM: "Surprise Me",
  SPECIFIC: "Custom",
  ARGUMENTATIVE: "Debate",
};


function GradeCell({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-xs font-black text-slate-300">—</span>;
  }
  const g = getAlphaGrade(value);
  return (
    <span
      className={`inline-flex min-w-[42px] items-center justify-center rounded-xl border border-b-[3px] px-2.5 py-1 text-xs font-black ${g.pill}`}
    >
      {g.letter}
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
            <div className="min-w-[210px] py-0.5">
              <div className="text-sm font-black text-slate-900">
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
            <span>Overall</span>
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
          const g = getAlphaGrade(item.overallScore);
          return (
            <span
              className={`inline-flex min-w-[48px] items-center justify-center rounded-xl border border-b-[3px] px-3 py-1 text-sm font-black ${g.pill}`}
            >
              {g.letter}
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
        cell: ({ row }) => <GradeCell value={row.original.grammarScore} />,
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
        cell: ({ row }) => <GradeCell value={row.original.vocabScore} />,
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
          <GradeCell value={row.original.pronunciationScore} />
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
        cell: ({ row }) => <GradeCell value={row.original.fluencyScore} />,
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
            <div className="max-w-[230px]">
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
              className="inline-flex items-center gap-1.5 rounded-xl border-b-[3px] border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-3.5 py-2 text-xs font-black text-white shadow-2xs transition hover:brightness-105 active:translate-y-0.5 active:border-b-0 whitespace-nowrap"
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

  const selectedGrade = getAlphaGrade(selectedReview?.overallScore ?? null);
  const gGrade = getAlphaGrade(selectedReview?.grammarScore ?? null);
  const vGrade = getAlphaGrade(selectedReview?.vocabScore ?? null);
  const sGrade = getAlphaGrade(selectedReview?.pronunciationScore ?? null);
  const fGrade = getAlphaGrade(selectedReview?.fluencyScore ?? null);

  return (
    <div className="space-y-6">
      {/* =====================================================================
          1. PLAYFUL, TALLER 3D FEATURED / SELECTED REVIEW HERO CARD
          ===================================================================== */}
      {selectedReview && (
        <div className="group relative overflow-hidden rounded-[2rem] border-2 border-b-[6px] border-indigo-950/90 bg-gradient-to-br from-[#0F172A] via-[#171F3F] to-[#241645] p-7 text-white shadow-2xl sm:p-10">
          {/* Playful Ambient Glows */}
          <div className="pointer-events-none absolute -top-24 -right-12 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />

          <div className="relative z-10 grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            {/* Left Showcase (7 cols) */}
            <div className="space-y-5 lg:col-span-7">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-sky-500/20 px-3.5 py-1 text-[11px] font-black tracking-wider text-sky-300 uppercase backdrop-blur-md">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  {isLatest ? "Latest Session Spotlight" : "Selected Spotlight"}
                </span>

                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-black tracking-wider text-slate-200 uppercase">
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

              {/* Big Tilted 3D Grade Shield + Title */}
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="relative shrink-0 self-start sm:self-center">
                  <div
                    className={`flex h-24 w-24 -rotate-3 flex-col items-center justify-center rounded-3xl border-b-[6px] shadow-xl transition-transform duration-300 group-hover:rotate-0 ${selectedGrade.heroEmblem}`}
                  >
                    {selectedReview.isReady ? (
                      <>
                        <span className="text-4xl font-black leading-none tracking-tight">
                          {selectedGrade.letter}
                        </span>
                        <span className="mt-1 text-[10px] font-black tracking-wider uppercase opacity-85">
                          {selectedGrade.tier}
                        </span>
                      </>
                    ) : (
                      <Loader2 className="h-8 w-8 animate-spin text-amber-300" />
                    )}
                  </div>
                  {selectedReview.isReady && (
                    <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-950 bg-amber-300 text-slate-950 shadow-md">
                      <Crown className="h-3.5 w-3.5 fill-current" />
                    </span>
                  )}
                </div>

                <div className="min-w-0 space-y-1.5">
                  <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                    {selectedReview.topic || "Live Conversation Practice"}
                  </h2>
                  <p className="line-clamp-3 text-xs font-medium leading-relaxed text-slate-300 sm:text-sm">
                    {selectedReview.summary ||
                      (selectedReview.isReady
                        ? "Open this session to review your grammar fixes and practice your pronunciation."
                        : "Your AI report is currently baking in the background.")}
                  </p>
                </div>
              </div>

              {/* Playful Highlight Chips */}
              {selectedReview.isReady && (
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {selectedReview.topWeakness && (
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/35 bg-rose-500/15 px-3.5 py-2 text-xs font-bold text-rose-200">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                      <span className="max-w-[270px] truncate">
                        Focus: {selectedReview.topWeakness}
                      </span>
                    </div>
                  )}

                  {selectedReview.topUpgrade && (
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/35 bg-emerald-500/15 px-3.5 py-2 text-xs font-bold text-emerald-200">
                      <BookOpen className="h-4 w-4 shrink-0 text-emerald-400" />
                      <span className="max-w-[270px] truncate">
                        Upgrade: {selectedReview.topUpgrade.better}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right 3D Grade Board & Action (5 cols) */}
            <div className="flex flex-col justify-between gap-5 rounded-3xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur-md lg:col-span-5">
              <div className="flex items-center justify-between text-[10px] font-black tracking-widest text-slate-300 uppercase">
                <span className="flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-amber-400" />
                  Skill Scorecard
                </span>
                <span>
                  {selectedReview.mistakesCount} Fixes •{" "}
                  {selectedReview.vocabUpgradesCount} Upgrades
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2.5 text-center">
                {[
                  { label: "Grammar", meta: gGrade },
                  { label: "Vocab", meta: vGrade },
                  { label: "Speech", meta: sGrade },
                  { label: "Fluency", meta: fGrade },
                ].map((m) => (
                  <div
                    key={m.label}
                    className={`rounded-2xl border py-3 ${m.meta.tile}`}
                  >
                    <span className="block text-[9px] font-black tracking-wider uppercase opacity-80">
                      {m.label}
                    </span>
                    <span className="mt-1 block text-xl font-black">
                      {m.meta.letter}
                    </span>
                  </div>
                ))}
              </div>

              <Link
                href={`/conversation/${selectedReview.id}`}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 px-6 py-4 text-sm font-black text-white shadow-xl shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:border-b-0"
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
          2. ZEBRA-STRIPED TANSTACK TABLE CARD
          ===================================================================== */}
      <div className="overflow-hidden rounded-[2rem] border-2 border-b-[6px] border-slate-200 border-b-slate-300 bg-white shadow-md">
        {/* Table Toolbar */}
        <div className="flex flex-col justify-between gap-4 border-b-2 border-slate-100 bg-slate-50/70 px-6 py-4 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2">
            {(
              ["ALL", "FOCUSED", "RANDOM", "SPECIFIC", "ARGUMENTATIVE"] as const
            ).map((modeKey) => {
              const active = modeFilter === modeKey;
              return (
                <button
                  key={modeKey}
                  type="button"
                  onClick={() => setModeFilter(modeKey)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-black transition ${
                    active
                      ? "border-b-2 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-2xs"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {MODE_LABELS[modeKey]}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search topic or grammar focus..."
              className="w-full rounded-2xl border-2 border-slate-200 bg-white py-2 pr-4 pl-10 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
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
                  className="border-b-2 border-slate-200/80 bg-slate-100/80"
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

            <tbody className="divide-y divide-slate-200/60">
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
                table.getRowModel().rows.map((row, idx) => {
                  const isSelected = row.original.id === selectedReview?.id;
                  const isEvenRow = idx % 2 === 1;
                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedId(row.original.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-sky-100/70 ring-2 ring-inset ring-sky-400/50"
                          : isEvenRow
                            ? "bg-slate-100/75 hover:bg-sky-50/60"
                            : "bg-white hover:bg-sky-50/60"
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-5 py-4 align-middle">
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-slate-100 bg-slate-50 px-6 py-4">
          <span className="text-xs font-bold text-slate-500">
            Showing{" "}
            <strong className="font-black text-slate-900">
              {table.getRowModel().rows.length}
            </strong>{" "}
            of{" "}
            <strong className="font-black text-slate-900">
              {table.getFilteredRowModel().rows.length}
            </strong>{" "}
            sessions • Click any row to spotlight above
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