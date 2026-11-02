// components/home/word-signatures-widget.tsx
"use client";

import Link from "next/link";
import { Eye, MousePointerClick, Mic2, Headphones, ChevronRight } from "lucide-react";
import type { HomeDashboardData } from "@/app/actions/get-home-dashboard";

export function WordSignaturesWidget({
  superlatives,
  totalWordsBanked,
}: {
  superlatives: HomeDashboardData["wordSuperlatives"];
  totalWordsBanked: number;
}) {
  const cards = [
    {
      id: "seen",
      label: "Most Seen",
      Icon: Eye,
      data: superlatives.mostSeen,
      fallbackWord: "bonjour",
      fallbackSub: "Start a Spoon to track",
      accentBg: "bg-sky-50 border-sky-200/80",
      iconBg: "bg-gradient-to-br from-sky-400 to-blue-600 text-white",
      badgeText: "text-sky-700 bg-sky-100",
    },
    {
      id: "tapped",
      label: "Most Tapped",
      Icon: MousePointerClick,
      data: superlatives.mostTapped,
      fallbackWord: "je voudrais",
      fallbackSub: "Tap tiles in lessons",
      accentBg: "bg-amber-50/80 border-amber-200/80",
      iconBg: "bg-gradient-to-br from-amber-400 to-orange-500 text-white",
      badgeText: "text-amber-800 bg-amber-100",
    },
    {
      id: "spoken",
      label: "Most Spoken",
      Icon: Mic2,
      data: superlatives.mostSpoken,
      fallbackWord: "fatigué",
      fallbackSub: "Speak in Pronunciation Lab",
      accentBg: "bg-emerald-50/80 border-emerald-200/80",
      iconBg: "bg-gradient-to-br from-emerald-400 to-teal-600 text-white",
      badgeText: "text-emerald-800 bg-emerald-100",
    },
    {
      id: "heard",
      label: "Most Heard",
      Icon: Headphones,
      data: superlatives.mostHeard,
      fallbackWord: "l'addition",
      fallbackSub: "Listen to native audio",
      accentBg: "bg-purple-50/80 border-purple-200/80",
      iconBg: "bg-gradient-to-br from-purple-500 to-indigo-600 text-white",
      badgeText: "text-purple-800 bg-purple-100",
    },
  ];

  return (
    <div className="rounded-[28px] border border-white bg-white/95 p-6 shadow-[0_10px_35px_rgba(15,23,42,0.05)] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-black text-slate-900">
            Word Matrix Signatures
          </h2>
          <p className="text-xs font-semibold text-slate-400">
            {totalWordsBanked} active words tracked across your lessons
          </p>
        </div>
        <Link
          href="/learning-hub"
          className="inline-flex items-center gap-0.5 text-xs font-extrabold text-blue-600 hover:text-blue-700"
        >
          <span>Full Matrix</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-auto">
        {cards.map(({ id, label, Icon, data, fallbackWord, fallbackSub, accentBg, iconBg, badgeText }) => (
          <div
            key={id}
            className={`flex items-center gap-3.5 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${accentBg}`}
          >
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-md ${iconBg}`}
            >
              <Icon className="h-6 w-6" />
            </div>

            <div className="min-w-0 flex-1">
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${badgeText}`}
              >
                {label}
              </span>
              <h3 className="mt-1 text-lg font-black text-slate-900 truncate">
                {data?.word || fallbackWord}
              </h3>
              <p className="text-[11px] font-bold text-slate-500 truncate">
                {data ? `"${data.translation}" · ${data.subLabel}` : fallbackSub}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}