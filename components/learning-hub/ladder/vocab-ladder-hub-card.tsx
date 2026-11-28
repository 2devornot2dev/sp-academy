// components/learning-hub/vocab-ladder-hub-card.tsx
"use client";

import Link from "next/link";
import { ArrowRight, Check, Lock, Sparkles, TrendingUp } from "lucide-react";
import type { LadderOverviewData } from "@/app/actions/ladder-actions";

export function VocabLadderHubCard({
  ladder,
}: {
  ladder: LadderOverviewData | null;
}) {
  if (!ladder) return null;

  const unlockPct = Math.min(
    100,
    Math.round((ladder.completedSpoonsCount / ladder.unlockThreshold) * 100),
  );

  // Locked State (Spoons 1–14)
  if (!ladder.isUnlocked) {
    return (
      <div className="flex flex-col justify-between overflow-hidden rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-xl border-b-2 border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 px-3 py-1 text-[11px] font-black tracking-wider text-slate-950 uppercase">
            <TrendingUp className="h-3.5 w-3.5" /> Vocab Ladder
          </span>
          <span className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500 uppercase">
            <Lock className="h-3 w-3" /> Spoon {ladder.unlockThreshold}
          </span>
        </div>

        <div className="my-4 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 p-4">
          <p className="text-sm font-black text-slate-900">
            Colors, Opposites &amp; Verbs
          </p>
          <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
            Finish{" "}
            <strong className="text-amber-700">
              {Math.max(0, ladder.unlockThreshold - ladder.completedSpoonsCount)}{" "}
              more Spoons
            </strong>{" "}
            to unlock the 10-Rung Sentence Stack &amp; Verb Time Machine.
          </p>

          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase">
              <span>Unlock Progress</span>
              <span className="text-amber-700">
                {ladder.completedSpoonsCount} / {ladder.unlockThreshold} Spoons
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white p-0.5 ring-1 ring-amber-200/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-500 transition-all duration-500"
                style={{ width: `${Math.max(6, unlockPct)}%` }}
              />
            </div>
          </div>
        </div>

        <Link
          href="/learning-hub/ladder"
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-b-[3px] border-slate-200 bg-slate-50 py-2.5 text-xs font-black text-slate-600 transition hover:bg-white hover:text-slate-900"
        >
          <span>Preview 10-Rung Ladder</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  // Unlocked State (Spoon 15+): Show 3-Rung Vertical Window around the Active Rung
  const activeIdx = Math.max(
    0,
    ladder.rungs.findIndex((r) => r.status === "ACTIVE"),
  );
  const windowStart = Math.max(0, Math.min(activeIdx - 1, ladder.rungs.length - 3));
  const visibleRungs = ladder.rungs.slice(windowStart, windowStart + 3);
  const activeRung = ladder.activeRung;

  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-xl border-b-2 border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 px-3 py-1 text-[11px] font-black tracking-wider text-slate-950 uppercase">
          <TrendingUp className="h-3.5 w-3.5" /> Vocab Ladder
        </span>
        <Link
          href="/learning-hub/ladder"
          className="rounded-xl bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-800 ring-1 ring-amber-200 transition hover:bg-amber-100"
        >
          {ladder.completedCount}/{ladder.totalCount || 10} Rungs →
        </Link>
      </div>

      {/* 3-Rung Vertical Preview */}
      <div className="my-4 space-y-2">
        {visibleRungs.length === 0 ? (
          <p className="py-4 text-center text-xs font-bold text-slate-400">
            No rungs published yet.
          </p>
        ) : (
          visibleRungs.map((r) => {
            const isDone = r.status === "COMPLETED";
            const isActive = r.status === "ACTIVE";
            return (
              <div
                key={r.id}
                className={`flex items-center justify-between gap-2.5 rounded-2xl px-3.5 py-2.5 ${
                  isActive
                    ? "bg-sky-50 ring-2 ring-sky-300"
                    : isDone
                      ? "bg-emerald-50/70 ring-1 ring-emerald-200"
                      : "bg-slate-50 opacity-65 ring-1 ring-slate-200/70"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                      isDone
                        ? "border-b-2 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white"
                        : isActive
                          ? "border-b-2 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white"
                          : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {isDone ? (
                      <Check className="h-4 w-4 stroke-[3.5]" />
                    ) : isActive ? (
                      <span>{r.icon}</span>
                    ) : (
                      <Lock className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <span className="block text-[9px] font-black tracking-wider text-slate-400 uppercase">
                      Rung {r.rungOrder}
                    </span>
                    <span className="block truncate text-xs font-black text-slate-900">
                      {r.title}
                    </span>
                  </div>
                </div>

                {isActive && (
                  <span className="shrink-0 rounded-full bg-slate-900 px-2 py-0.5 text-[9px] font-black text-amber-300 uppercase">
                    Active
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {activeRung ? (
        <Link
          href={`/learning-hub/ladder/${activeRung.slug}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 py-3 text-xs font-black text-slate-950 shadow-md shadow-amber-500/20 transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0 sm:text-sm"
        >
          <Sparkles className="h-4 w-4" />
          <span>
            {activeRung.status === "COMPLETED"
              ? "View Full Ladder"
              : `Start: ${activeRung.title}`}
          </span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : (
        <Link
          href="/learning-hub/ladder"
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 py-3 text-xs font-black text-white shadow-md"
        >
          <span>Open Vocab Ladder</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}