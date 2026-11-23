// components/learning-hub/dashboard-header.tsx
"use client";
import { Flame, Trophy } from "lucide-react";

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
  completedCount,
  streak,
  name,
}: DashboardHeaderProps) {
  const greeting = getGreeting();
  const greetingText = name ? `${greeting}, ${name}!` : `${greeting}!`;

  return (
    <header className="relative shrink-0 overflow-hidden animate-bg pt-4 pb-14 sm:pt-6 sm:pb-16 text-white shadow-lg">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/15 to-slate-950/35 backdrop-blur-[2px]" />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[850px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top Bar: Streak & Completed Pills */}
        <div className="mb-4 sm:mb-6 flex flex-wrap items-center justify-end gap-2.5">
          <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/35 px-3 py-1 sm:px-3.5 sm:py-1.5 text-[11px] sm:text-xs font-extrabold text-amber-300 shadow-sm backdrop-blur-md">
            <Flame className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
            <span>Streak: {streak}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/35 px-3 py-1 sm:px-3.5 sm:py-1.5 text-[11px] sm:text-xs font-extrabold text-emerald-300 shadow-sm backdrop-blur-md">
            <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
            <span>{completedCount} Completed</span>
          </div>
        </div>

        {/* Main Greeting Copy */}
        <div className="max-w-3xl">
          <h1 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.22)]">
            {greetingText} Ready to learn today?
          </h1>
          <p className="mt-1.5 sm:mt-2.5 text-xs sm:text-base md:text-lg font-medium text-white/90 drop-shadow-[0_1px_4px_rgba(15,23,42,0.18)]">
            Master essential speech patterns step-by-step through bite-sized
            interactive audio lessons.
          </p>
        </div>
      </div>
    </header>
  );
}