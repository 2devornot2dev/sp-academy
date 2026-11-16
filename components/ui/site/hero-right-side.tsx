"use client";

import { Mic, Flame, CheckCircle2 } from "lucide-react";

// Adjust this import path to wherever you saved the CSS module
import styles from "./hero.module.css";

// Simulated audio waveform heights for the French pronunciation widget.
// Pulled out so the widget markup below stays readable.
const AUDIO_WAVE_HEIGHTS = [40, 70, 40, 100, 60, 30, 80, 50, 90, 40];

export default function HeroRightSide() {
  return (
    <div className="relative z-10 flex w-full flex-1 items-center justify-center mt-0 lg:ml-10 min-h-[280px] sm:min-h-[420px] lg:min-h-[650px]">
      
      {/* 1. IMPORTED CSS VECTORS BACKGROUND */}
      <div className={styles.vectorContainer}>
        <div className={styles.vectorBlue} />
        <div className={styles.vectorGreen} />
        <div className={styles.vectorYellow} />
      </div>

      {/* 2. DECORATIVE DOTS */}
      <div className="absolute right-[5%] top-[10%] grid grid-cols-4 gap-2 opacity-30 z-10">
        {Array.from({ length: 16 }).map((_, i) => (
          <span key={i} className="h-1.5 w-1.5 rounded-full bg-blue-400" />
        ))}
      </div>

      {/* 3. MAIN IMAGE CONTAINER */}
      <div className="relative z-20 w-full max-w-[500px] flex justify-center">
        
        {/* Central Image with Bottom Gradient Mask to fix the flat crop */}
        <img
          src="/hero-image-new.png"
          alt="Language Learning App Interface"
          className="relative z-20 w-full h-auto object-contain transition-transform duration-700 hover:scale-[1.02]"
          style={{
            WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 85%, rgba(0,0,0,0) 100%)",
            maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 85%, rgba(0,0,0,0) 100%)",
          }}
        />

        <div className={styles.vectorPurple} aria-hidden="true" />

        <FrenchPronunciationWidget />
        <SpanishStreakWidget />
        <PerfectLessonWidget />
      </div>
    </div>
  );
}

function FrenchPronunciationWidget() {
  return (
    <div className="absolute top-[25%] -left-[15%] z-30 flex w-[220px] flex-col gap-3 rounded-2xl border border-slate-100 bg-white/95 p-4 shadow-xl shadow-blue-900/5 backdrop-blur-md transition-transform duration-500 hover:-translate-y-2 cursor-default">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-white shadow-sm border border-blue-100 text-xl">
          🇫🇷
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-800 leading-tight">French</h4>
          <p className="text-xs font-semibold text-slate-500">Bonjour!</p>
        </div>
      </div>
      {/* Simulated Audio Wave */}
      <div className="flex items-center justify-between bg-blue-50 rounded-lg p-2 border border-blue-100/50">
        <Mic className="h-4 w-4 text-blue-500" />
        <div className="flex items-end gap-[3px] h-4 px-1 flex-1 ml-2">
          {AUDIO_WAVE_HEIGHTS.map((height, i) => (
            <div key={i} className="w-full bg-blue-400 rounded-full" style={{ height: `${height}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SpanishStreakWidget() {
  return (
    <div className="absolute top-[18%] -right-[12%] z-30 flex w-[200px] flex-col gap-3 rounded-2xl border border-slate-100 bg-white/95 p-4 shadow-xl shadow-orange-900/5 backdrop-blur-md transition-transform duration-500 hover:-translate-y-2 cursor-default">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-50 to-white shadow-sm border border-orange-100 text-xl">
          🇪🇸
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-800 leading-tight">Spanish</h4>
          <p className="text-xs font-semibold text-slate-500">¡Hola!</p>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 w-fit border border-orange-100">
        <Flame className="h-4 w-4 text-orange-500" />
        <span className="text-xs font-bold text-orange-600 tracking-wide">12 Day Streak</span>
      </div>
    </div>
  );
}

function PerfectLessonWidget() {
  return (
    <div className="absolute -bottom-2 left-1/2 z-40 flex w-[320px] -translate-x-1/2 items-center gap-4 rounded-2xl border border-slate-100 bg-white/95 p-4 shadow-xl shadow-emerald-900/5 backdrop-blur-md transition-transform duration-500 hover:-translate-y-1 cursor-default">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-50 to-white shadow-sm border border-emerald-100">
        <CheckCircle2 className="h-6 w-6 text-emerald-500" />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1.5">
          <h4 className="text-sm font-bold text-slate-800">Perfect Lesson</h4>
          <span className="text-xs font-bold text-emerald-600">+50 XP</span>
        </div>
        {/* Progress Bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-full rounded-full bg-emerald-400" />
        </div>
      </div>
    </div>
  );
}