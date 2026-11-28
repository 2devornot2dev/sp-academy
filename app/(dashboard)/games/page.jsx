// app/(dashboard)/games/page.tsx
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Dice3,
  Ear,
  Gamepad2,
  Layers,
  Mic,
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react";

const UPCOMING_ARCADE_MODES = [
  {
    title: "Voice Reflex Dash",
    badge: "Spoken Speed",
    description:
      "Beat the clock by speaking target chunks out loud before the tiles drop.",
    icon: Mic,
    theme:
      "border-sky-200 border-b-sky-300 bg-sky-50/60 text-blue-700",
    iconBox:
      "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white",
  },
  {
    title: "Acoustic Ear Traps",
    badge: "Listening Precision",
    description:
      "Spot subtle accent and sound contrasts in rapid-fire native audio rounds.",
    icon: Ear,
    theme:
      "border-amber-200 border-b-amber-300 bg-amber-50/60 text-amber-900",
    iconBox:
      "border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950",
  },
  {
    title: "Word Matrix Blitz",
    badge: "Memory Recall",
    description:
      "Chain together words from your personal Word Matrix for combo multipliers.",
    icon: Zap,
    theme:
      "border-purple-200 border-b-purple-300 bg-purple-50/60 text-purple-900",
    iconBox:
      "border-purple-900 bg-gradient-to-b from-violet-500 to-purple-700 text-white",
  },
];

export default function GamesPage() {
  return (
    <div className="flex min-h-[calc(100dvh-3rem)] md:min-h-dvh flex-col bg-slate-100/80 font-sans text-slate-900">
      {/* SPOON HEADER BANNER */}
      <header className="relative shrink-0 overflow-hidden animate-bg pt-5 pb-16 text-white shadow-lg sm:pt-6 sm:pb-20">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/15 to-slate-950/35 backdrop-blur-[2px]" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[850px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5 sm:mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-slate-950/35 px-3.5 py-1.5 text-xs font-extrabold tracking-wide text-white uppercase shadow-sm backdrop-blur-md">
              <Gamepad2 className="h-4 w-4 text-cyan-300" />
              <span>Interactive Language Arcade</span>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-slate-950/45 px-3.5 py-1.5 text-xs font-black text-amber-300 shadow-sm backdrop-blur-md">
              <Wrench className="h-3.5 w-3.5 text-amber-400" />
              <span>Under Construction • ETA Real Soon</span>
            </div>
          </div>

          <div className="max-w-3xl">
            <h1 className="flex items-center gap-3 text-2xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.22)] sm:text-4xl">
              <span>Language Games</span>
              <Dice3
                strokeWidth={2}
                className="size-8 text-white/95 drop-shadow-md sm:size-10"
              />
            </h1>
            <p className="mt-2 text-xs font-medium text-white/90 drop-shadow-[0_1px_4px_rgba(15,23,42,0.18)] sm:text-base">
              Fast-paced voice, reflex, and listening mini-games powered by your
              personal Word Matrix.
            </p>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT OVERLAPPING HEADER */}
      <main className="relative z-20 mx-auto -mt-10 sm:-mt-12 w-full max-w-6xl flex-1 px-3.5 pb-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl sm:rounded-[2rem] border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-5 shadow-xl sm:p-9">
          {/* Top Under-Construction Hero Banner */}
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-3xl border-b-[5px] border-amber-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950 shadow-lg">
              <Gamepad2 className="h-8 w-8 sm:h-10 sm:w-10" />
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1 text-[11px] font-black tracking-wider text-amber-800 uppercase">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Beta Drop #2 • Coming Real Soon
            </span>

            <h2 className="mt-3 text-xl font-black tracking-tight text-slate-900 sm:text-3xl">
              We&apos;re Putting the Finishing Touches on the Arcade!
            </h2>

            <p className="mt-2 max-w-xl text-xs font-semibold leading-relaxed text-slate-500 sm:text-sm">
              Our new voice-activated mini-games are currently in final tuning so
              they sync directly with the words and chunks you unlock in your
              Spoons.
            </p>
          </div>

          {/* 3 Preview Cards of What's Dropping */}
          <div className="mt-7 grid grid-cols-1 gap-3.5 sm:gap-4 md:grid-cols-3">
            {UPCOMING_ARCADE_MODES.map((mode) => {
              const Icon = mode.icon;
              return (
                <div
                  key={mode.title}
                  className={`flex flex-col justify-between rounded-2xl border-2 border-b-4 p-4 sm:p-5 ${mode.theme}`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-xl border-b-2 shadow-2xs ${mode.iconBox}`}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-[10px] font-black tracking-wider uppercase ring-1 ring-black/5">
                        {mode.badge}
                      </span>
                    </div>

                    <h3 className="mt-3.5 text-base font-black text-slate-900">
                      {mode.title}
                    </h3>
                    <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600">
                      {mode.description}
                    </p>
                  </div>

                  <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-black opacity-75">
                    <Wrench className="h-3 w-3" />
                    <span>In Final Testing</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Jump Back to Active Modes */}
          <div className="mt-7 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/80 sm:p-5">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div className="text-center sm:text-left">
                <p className="text-xs font-black tracking-wide text-slate-900 uppercase">
                  While the Arcade Finishes Baking...
                </p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  Keep building your Word Matrix so your game decks are stacked
                  on launch day:
                </p>
              </div>

              <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
                <Link
                  href="/conversation"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-white px-4 py-3 text-xs font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50/40"
                >
                  <Mic className="h-4 w-4 text-purple-600" />
                  <span>3-Min AI Chat</span>
                </Link>

                <Link
                  href="/books"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-white px-4 py-3 text-xs font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50/40"
                >
                  <BookOpen className="h-4 w-4 text-amber-600" />
                  <span>Story Books</span>
                </Link>

                <Link
                  href="/learning-hub"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-5 py-3 text-xs font-black text-white shadow-md transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0"
                >
                  <Layers className="h-4 w-4" />
                  <span>Back to Learning Hub</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}