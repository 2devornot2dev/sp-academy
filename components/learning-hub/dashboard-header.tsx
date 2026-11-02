// componenents/learning-hub/dashboard-header.tsx
"use client";
import { Flame, Globe2, Trophy } from "lucide-react";

type DashboardHeaderProps = {
  name?: string | null;
  lang: { nativeLanguage: string; targetLanguage: string | null | any };
  completedCount: number;
  streak: number;
};

const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return "Good morning";
  } else if (hour >= 20 || hour < 5) {
    return "Up late";
  } else {
    return "Hi";
  }
};

export function DashboardHeader({
  lang,
  completedCount,
  streak,
  name,
}: DashboardHeaderProps) {
  const greeting = getGreeting();
  const greetingText = name ? `${greeting}, ${name}!` : `${greeting}!`;

  return (
    <header className="relative overflow-hidden animate-bg pt-9 pb-22 text-white shadow-lg">
      {/* Subtle dark-glass contrast scrim so white text is always razor-sharp against bright Spoon colors */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/15 to-slate-950/35 backdrop-blur-[2px]" />

      {/* Soft ambient highlights */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-[850px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        {/* Top Bar: Frosted Dark-Glass Pills */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          {/* Language Pill */}
          <div className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-slate-950/35 px-4 py-1.5 text-xs font-semibold tracking-wide text-white shadow-sm backdrop-blur-md">
            <Globe2 className="h-4 w-4 text-cyan-300" />
            <span>
              Learning{" "}
              <strong className="font-extrabold text-white uppercase">
                {lang?.targetLanguage ?? "French"}
              </strong>{" "}
              <span className="text-white/75">
                from{" "}
                <span className="font-bold text-white capitalize">
                  {lang?.nativeLanguage?.toLowerCase() ?? "English"}
                </span>
              </span>
            </span>
          </div>

          {/* Streak & Completed Pills */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/35 px-3.5 py-1.5 text-xs font-extrabold text-amber-300 shadow-sm backdrop-blur-md">
              <Flame className="h-4 w-4 fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
              <span>Streak: {streak}</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/35 px-3.5 py-1.5 text-xs font-extrabold text-emerald-300 shadow-sm backdrop-blur-md">
              <Trophy className="h-4 w-4 text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
              <span>{completedCount} Completed</span>
            </div>
          </div>
        </div>

        {/* Main Greeting Copy with Subtle Text Shadow for Crisp Readability */}
        <div className="max-w-3xl">
          <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.22)] sm:text-4xl lg:text-5xl">
            {greetingText} Ready to learn today?
          </h1>
          <p className="mt-2.5 text-base font-medium text-white/90 drop-shadow-[0_1px_4px_rgba(15,23,42,0.18)] sm:text-lg">
            Master essential speech patterns step-by-step through bite-sized
            interactive audio lessons.
          </p>
        </div>
      </div>
    </header>
  );
}