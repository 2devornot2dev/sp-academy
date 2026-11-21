"use client";

import { Mic, Flame, CheckCircle2 } from "lucide-react";
import { Reveal } from "../misc/reveal";
import styles from "./hero.module.css";

const AUDIO_WAVE_HEIGHTS = [40, 70, 40, 100, 60, 30, 80, 50, 90, 40];

export default function HeroRightSide() {
  return (
    <div className="relative z-10 flex w-full shrink-0 lg:flex-1 items-center justify-center mt-0 lg:ml-10 h-[310px] min-h-[310px] min-[390px]:h-[340px] min-[390px]:min-h-[340px] sm:h-[460px] sm:min-h-[460px] md:h-[540px] md:min-h-[540px] lg:h-[650px] lg:min-h-[650px]">
      {/* Fixed desktop coordinate stage scaled uniformly */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex w-[640px] h-[620px] items-center justify-center origin-center scale-[0.5] min-[360px]:scale-[0.55] min-[400px]:scale-[0.6] sm:scale-[0.78] md:scale-[0.9] lg:scale-100">
        
        {/* 1. IMPORTED CSS VECTORS BACKGROUND */}
        <Reveal
          delay={0.15}
          y={0}
          scale={0.95}
          duration={1}
          className="absolute inset-0 pointer-events-none"
        >
          <div className={styles.vectorContainer}>
            <div
              className={`${styles.vectorBlue} scale-[0.82] sm:scale-100 origin-bottom-right transition-transform`}
            />
            <div className={styles.vectorGreen} />
            <div className={styles.vectorYellow} />
          </div>
        </Reveal>

        {/* 2. DECORATIVE DOTS */}
        <Reveal
          delay={0.25}
          y={-10}
          className="absolute right-[5%] top-[10%] z-10"
        >
          <div className="grid grid-cols-4 gap-2 opacity-30">
            {Array.from({ length: 16 }).map((_, i) => (
              <span key={i} className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            ))}
          </div>
        </Reveal>

        {/* 3. MAIN IMAGE CONTAINER */}
        <div className="relative z-20 w-[500px] flex justify-center">
          <Reveal
            delay={0.3}
            y={20}
            scale={0.95}
            duration={0.9}
            className="relative z-20 w-full flex justify-center"
          >
            <img
              src="/hero-image-new.png"
              alt="Language Learning App Interface"
              className="w-full h-auto object-contain transition-transform duration-700 hover:scale-[1.02]"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to bottom, rgba(0,0,0,1) 85%, rgba(0,0,0,0) 100%)",
                maskImage:
                  "linear-gradient(to bottom, rgba(0,0,0,1) 85%, rgba(0,0,0,0) 100%)",
              }}
            />
          </Reveal>

          {/* Purple Blob wrapped in Reveal */}
          <Reveal
            delay={0.35}
            y={12}
            scale={0.9}
            duration={0.9}
            className="absolute inset-0 z-20 pointer-events-none"
          >
            <div className={styles.vectorPurple} aria-hidden="true" />
          </Reveal>

          <FrenchPronunciationWidget />
          <SpanishStreakWidget />
          <PerfectLessonWidget />
        </div>
      </div>
    </div>
  );
}

function FrenchPronunciationWidget() {
  return (
    <div className="absolute top-[25%] -left-[15%] z-30">
      <Reveal
        delay={0.5}
        x={-28}
        y={10}
        duration={0.85}
        whileHover={{ y: -6, transition: { duration: 0.2 } }}
        className="flex w-[220px] flex-col gap-3 rounded-2xl border border-slate-100 bg-white/95 p-4 shadow-xl shadow-blue-900/5 backdrop-blur-md cursor-default"
      >
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
              <div
                key={i}
                className="w-full bg-blue-400 rounded-full"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  );
}

function SpanishStreakWidget() {
  return (
    <div className="absolute top-[18%] -right-[12%] z-30">
      <Reveal
        delay={0.65}
        x={28}
        y={10}
        duration={0.85}
        whileHover={{ y: -6, transition: { duration: 0.2 } }}
        className="flex w-[200px] flex-col gap-3 rounded-2xl border border-slate-100 bg-white/95 p-4 shadow-xl shadow-orange-900/5 backdrop-blur-md cursor-default"
      >
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
          <span className="text-xs font-bold text-orange-600 tracking-wide">
            12 Day Streak
          </span>
        </div>
      </Reveal>
    </div>
  );
}

function PerfectLessonWidget() {
  return (
    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-40">
      <Reveal
        delay={0.8}
        y={30}
        scale={0.94}
        duration={0.85}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        className="flex w-[320px] items-center gap-4 rounded-2xl border border-slate-100 bg-white/95 p-4 shadow-xl shadow-emerald-900/5 backdrop-blur-md cursor-default"
      >
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
      </Reveal>
    </div>
  );
}