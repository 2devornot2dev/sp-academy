// app/(dashboard)/conversation/review/page.tsx
import Link from "next/link";
import { requireUser } from "@/lib/auth-guard";
import { getUserReviews } from "@/app/actions/get-user-reviews";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Loader2,
  MessagesSquare,
  Sparkles,
  Trophy,
} from "lucide-react";

export const dynamic = "force-dynamic";

function getGradeBadge(score: number | null) {
  if (score === null) {
    return {
      letter: "—",
      style: "border-slate-300 bg-slate-100 text-slate-500",
    };
  }
  if (score >= 90)
    return {
      letter: "A+",
      style: "border-emerald-400 bg-emerald-50 text-emerald-700",
    };
  if (score >= 80)
    return {
      letter: "A",
      style: "border-emerald-400 bg-emerald-50 text-emerald-700",
    };
  if (score >= 70)
    return {
      letter: "B",
      style: "border-sky-400 bg-sky-50 text-sky-700",
    };
  if (score >= 60)
    return {
      letter: "C",
      style: "border-amber-400 bg-amber-50 text-amber-700",
    };
  return {
    letter: "D",
    style: "border-rose-400 bg-rose-50 text-rose-700",
  };
}

export default async function ConversationReviewsListPage() {
  const user = await requireUser();
  const reviews = await getUserReviews(user.id);

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 font-sans text-slate-900">
      {/* GLOBAL APP HEADER BANNER */}
      <header className="relative shrink-0 overflow-hidden animate-bg pt-6 pb-16 text-white shadow-lg">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/15 to-slate-950/35 backdrop-blur-[2px]" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[850px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/conversation"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-slate-950/40 px-4 py-1.5 text-xs font-black text-white shadow-sm backdrop-blur-md transition hover:bg-slate-950/60"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Conversation Arena</span>
            </Link>

            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/40 px-4 py-1.5 text-xs font-black text-amber-300 shadow-sm backdrop-blur-md">
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
              <span>{reviews.length} Total Reports</span>
            </div>
          </div>

          <div className="max-w-3xl">
            <h1 className="flex items-center gap-3 text-2xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.22)] sm:text-3xl md:text-4xl">
              <span>Past Conversation Reviews</span>
              <MessagesSquare className="h-7 w-7 text-white/90 sm:h-8 sm:w-8" />
            </h1>
            <p className="mt-1 text-sm font-medium text-white/90 sm:text-base">
              Revisit your AI grades, replay native vocabulary upgrades, and
              practice your toughest phrases.
            </p>
          </div>
        </div>
      </header>

      {/* MAIN GRID OVERLAPPING HEADER */}
      <main className="relative z-20 mx-auto -mt-10 w-full max-w-7xl flex-1 px-6 pb-16 lg:px-8">
        {reviews.length === 0 ? (
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
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((item) => {
              const grade = getGradeBadge(item.overallScore);
              const dateLabel = new Date(item.createdAt).toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric" },
              );

              return (
                <Link
                  key={item.id}
                  href={`/conversation/${item.id}`}
                  className="group flex flex-col justify-between rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-sky-300"
                >
                  <div>
                    {/* Top Row: Mode/Lang + Grade */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-black tracking-wider text-indigo-700 uppercase">
                            {item.mode}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">
                            {dateLabel}
                          </span>
                        </div>
                        <h3 className="line-clamp-2 text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                          {item.topic || "Live Conversation Practice"}
                        </h3>
                      </div>

                      {item.isReady ? (
                        <div
                          className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border-2 ${grade.style}`}
                        >
                          <span className="text-xl font-black leading-none">
                            {grade.letter}
                          </span>
                          <span className="mt-0.5 text-[10px] font-extrabold">
                            {item.overallScore}%
                          </span>
                        </div>
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-amber-200 bg-amber-50 text-amber-600">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span className="mt-0.5 text-[9px] font-black uppercase">
                            Baking
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Top Weakness / Status */}
                    {item.isReady && item.topWeakness ? (
                      <p className="mt-3 line-clamp-2 rounded-xl border border-rose-100 bg-rose-50/70 px-3 py-2 text-xs font-bold text-rose-800">
                        Focus: {item.topWeakness}
                      </p>
                    ) : (
                      <p className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                        {item.isReady
                          ? "Full grammar & vocabulary breakdown ready."
                          : "AI report is currently generating..."}
                      </p>
                    )}

                    {/* 4 Mini Score Pills */}
                    {item.isReady && (
                      <div className="mt-4 grid grid-cols-4 gap-1.5 text-center">
                        {[
                          { label: "Gram", val: item.grammarScore },
                          { label: "Vocab", val: item.vocabScore },
                          { label: "Speech", val: item.pronunciationScore },
                          { label: "Flow", val: item.fluencyScore },
                        ].map((m) => (
                          <div
                            key={m.label}
                            className="rounded-xl bg-slate-50 py-1.5"
                          >
                            <span className="block text-[9px] font-black text-slate-400 uppercase">
                              {m.label}
                            </span>
                            <span className="text-xs font-black text-slate-800">
                              {m.val ?? "—"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5 text-xs font-black">
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <Clock className="h-3.5 w-3.5" />
                      {Math.max(1, Math.round(item.duration / 60))} min
                    </span>
                    <span className="inline-flex items-center gap-1 text-blue-600 transition-transform group-hover:translate-x-0.5">
                      <span>{item.isReady ? "Open Report" : "View Status"}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}