// components/ui/site/founder-story-section.tsx
"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import {
  AudioLines,
  CheckCircle2,
  Heart,
  Languages,
  MessageCircle,
  Mic,
  Quote,
  Sparkles,
} from "lucide-react";
import { Reveal } from "@/components/ui/misc/reveal";

export function FounderStorySection() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="our-story"
      aria-labelledby="founder-story-heading"
      className="relative isolate overflow-clip bg-gradient-to-b from-slate-50/90 via-[#f4f7ff] to-background py-[clamp(4.5rem,8vh,6.5rem)]"
    >
      {/* ===================================================================
          1. LAYERED VECTOR & DOT-GRID BACKGROUND ART
          =================================================================== */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20"
      >
        {/* Subtle masked dot-matrix pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(hsl(var(--foreground)/0.08)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_50%,#000_40%,transparent_100%)]" />

        {/* Ambient multi-tone gradient washes */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_25%,hsl(var(--primary)/0.13),transparent_34rem),radial-gradient(circle_at_88%_22%,rgba(139,92,246,0.12),transparent_32rem),radial-gradient(circle_at_72%_82%,rgba(16,185,129,0.11),transparent_30rem)]" />

        {/* Sweeping background acoustic wave SVG */}
        <svg
          viewBox="0 0 1440 520"
          fill="none"
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-1/2 h-[420px] w-full -translate-y-1/2 opacity-45"
        >
          <defs>
            <linearGradient id="storyWaveA" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0" />
              <stop offset="35%" stopColor="hsl(var(--primary))" stopOpacity="0.22" />
              <stop offset="68%" stopColor="#8B5CF6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M-60 290 C 180 150, 420 420, 720 260 C 1020 100, 1240 360, 1500 200"
            stroke="url(#storyWaveA)"
            strokeWidth="2.5"
            strokeDasharray="8 10"
          />
          <path
            d="M-60 330 C 240 430, 500 120, 810 280 C 1080 420, 1280 180, 1500 260"
            stroke="url(#storyWaveA)"
            strokeWidth="1.5"
          />
        </svg>

        {/* Floating Glassmorphism Pill & Wireframe Ring (matches FeaturesSection) */}
        <motion.div
          animate={
            reduceMotion
              ? undefined
              : { y: [0, -16, 0], rotate: [-4, 4, -4] }
          }
          transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-14 left-[4%] hidden h-28 w-44 rounded-[2rem] border border-primary/20 bg-primary/10 backdrop-blur-xl lg:block"
        />
        <motion.div
          animate={
            reduceMotion
              ? undefined
              : { y: [0, 18, 0], rotate: [6, -6, 6] }
          }
          transition={{ duration: 8.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute right-[6%] bottom-16 hidden size-36 rounded-full border-2 border-emerald-500/20 bg-emerald-400/5 backdrop-blur-md lg:block"
        />

        {/* Giant Watermark Icons (Icon-font editorial depth) */}
        <Quote
          strokeWidth={1.1}
          className="absolute top-12 right-[7%] size-40 -rotate-12 text-primary/[0.06] sm:size-56"
        />
        <Languages
          strokeWidth={1.1}
          className="absolute bottom-10 right-[26%] hidden size-44 rotate-12 text-violet-600/[0.055] lg:block"
        />
        <AudioLines
          strokeWidth={1.25}
          className="absolute bottom-16 left-[3%] hidden size-36 -rotate-6 text-emerald-600/[0.065] md:block"
        />

        {/* Subtle Floating Language Greeting Chips in Far Background */}
        <motion.div
          animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 right-[18%] hidden items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-bold text-foreground/45 shadow-xs backdrop-blur-md xl:inline-flex"
        >
          <MessageCircle className="size-3.5 text-primary/60" />
          <span>&ldquo;Bonjour ! Ça va ?&rdquo;</span>
        </motion.div>

        <motion.div
          animate={reduceMotion ? undefined : { y: [0, 10, 0] }}
          transition={{
            duration: 6.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.6,
          }}
          className="absolute bottom-20 right-[10%] hidden items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-bold text-foreground/45 shadow-xs backdrop-blur-md xl:inline-flex"
        >
          <Sparkles className="size-3.5 text-emerald-500/70" />
          <span>&ldquo;¡Muy bien, gracias!&rdquo;</span>
        </motion.div>
      </div>

      {/* ===================================================================
          2. MAIN 2-COLUMN CONTENT
          =================================================================== */}
      <div className="mx-auto w-full max-w-6xl px-4 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* LEFT (5 Cols): Studio Photo Frame + SVG Vectors + Floating Reaction Badges */}
          <div className="order-2 lg:order-1 lg:col-span-5">
            <Reveal y={24}>
              <div className="group relative mx-auto max-w-md lg:max-w-none">
                {/* Custom Decorative Vector SVG (Orbits, Sparkles & Sound Arcs) */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 520 580"
                  fill="none"
                  className="pointer-events-none absolute -inset-6 -z-10 h-[calc(100%+3rem)] w-[calc(100%+3rem)] overflow-visible sm:-inset-10 sm:h-[calc(100%+5rem)] sm:w-[calc(100%+5rem)]"
                >
                  <defs>
                    <linearGradient
                      id="founderVectorGrad"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop
                        offset="0%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity="0.55"
                      />
                      <stop
                        offset="50%"
                        stopColor="#8B5CF6"
                        stopOpacity="0.4"
                      />
                      <stop
                        offset="100%"
                        stopColor="#10B981"
                        stopOpacity="0.55"
                      />
                    </linearGradient>
                  </defs>

                  {/* Outer Dashed Vector Orbit */}
                  <rect
                    x="28"
                    y="28"
                    width="464"
                    height="524"
                    rx="44"
                    stroke="url(#founderVectorGrad)"
                    strokeWidth="2"
                    strokeDasharray="10 10"
                    className="transition-transform duration-700 group-hover:rotate-2"
                    style={{ transformOrigin: "center" }}
                  />

                  {/* Offset Accent Vector Frame */}
                  <rect
                    x="36"
                    y="36"
                    width="448"
                    height="508"
                    rx="40"
                    stroke="url(#founderVectorGrad)"
                    strokeWidth="1.5"
                    className="-rotate-2 transition-transform duration-700 group-hover:-rotate-3"
                    style={{ transformOrigin: "center" }}
                  />

                  {/* Top-Left Vector Sparkle Star */}
                  <path
                    d="M42 74 C42 58, 42 58, 26 58 C42 58, 42 58, 42 42 C42 58, 42 58, 58 58 C42 58, 42 58, 42 74 Z"
                    fill="hsl(var(--primary))"
                    fillOpacity="0.65"
                  />

                  {/* Bottom-Right Vector Sparkle Star */}
                  <path
                    d="M482 518 C482 504, 482 504, 468 504 C482 504, 482 504, 482 490 C482 504, 482 504, 496 504 C482 504, 482 504, 482 518 Z"
                    fill="#10B981"
                    fillOpacity="0.7"
                  />

                  <circle cx="478" cy="88" r="6" fill="#8B5CF6" fillOpacity="0.55" />
                  <circle
                    cx="38"
                    cy="480"
                    r="5"
                    fill="hsl(var(--primary))"
                    fillOpacity="0.55"
                  />
                </svg>

                {/* Soft Ambient Glow Behind Photo */}
                <div className="pointer-events-none absolute -inset-3 -z-10 rounded-[2.25rem] bg-gradient-to-tr from-primary/25 via-purple-500/20 to-emerald-400/25 blur-2xl transition-opacity duration-500 group-hover:opacity-95" />

                {/* Floating Top-Right Reaction Pill (Voice Prototype Moment) */}
                <div className="absolute -top-3 right-2 z-20 flex items-center gap-2.5 rounded-2xl border border-b-4 border-border/80 border-b-slate-300 bg-background/95 px-3.5 py-2 shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur-md transition-transform duration-500 group-hover:-translate-y-1 sm:-top-4 sm:-right-5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
                    <Mic className="size-4" />
                  </span>
                  <div className="pr-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-foreground">
                        First French Call
                      </span>
                      <CheckCircle2 className="size-3.5 text-emerald-500" />
                    </div>
                    <div className="mt-1 flex items-end gap-0.5">
                      {[10, 16, 8, 18, 12, 16, 9, 14].map((h, i) => (
                        <span
                          key={i}
                          style={{ height: `${h}px` }}
                          className="w-1 rounded-full bg-emerald-500/85"
                        />
                      ))}
                      <span className="ml-1.5 text-[10px] font-semibold text-muted-foreground">
                        Out loud
                      </span>
                    </div>
                  </div>
                </div>

                {/* Main Studio Photo Card */}
                <div className="relative overflow-hidden rounded-[1.75rem] border border-b-[5px] border-border/80 border-b-slate-300 bg-card p-2.5 shadow-[0_2px_4px_hsl(var(--foreground)/0.04),0_24px_60px_hsl(var(--foreground)/0.1)] transition-transform duration-500 group-hover:-translate-y-1">
                  <div className="relative overflow-hidden rounded-[1.35rem]">
                    <Image
                      src="/paul-and-daughter.png"
                      alt="Paul and his daughter, the inspiration behind Spoon Academy"
                      width={600}
                      height={700}
                      className="h-auto w-full object-cover object-center transition duration-700 group-hover:scale-[1.03]"
                      priority
                    />
                  </div>
                </div>

                {/* Floating Bottom-Left Reaction Pill */}
                <div className="absolute -bottom-3 left-2 z-20 inline-flex items-center gap-2.5 rounded-2xl border border-b-4 border-border/80 border-b-slate-300 bg-background/95 px-4 py-2.5 shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur-md transition-transform duration-500 group-hover:translate-y-0.5 sm:-bottom-4 sm:-left-4">
                  <span className="flex size-7 items-center justify-center rounded-full bg-rose-500/15">
                    <Heart className="size-3.5 fill-rose-500 text-rose-500" />
                  </span>
                  <div className="text-left leading-tight">
                    <span className="block text-xs font-bold text-foreground">
                      Paul &amp; His Daughter
                    </span>
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Where Spoon Started
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* RIGHT (7 Cols): Letter from the Founder */}
          <div className="order-1 flex flex-col justify-center lg:order-2 lg:col-span-7">
            <Reveal y={18}>
              <span className="inline-flex min-h-8 w-fit items-center rounded-full border border-primary/25 bg-background/80 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-primary shadow-2xs backdrop-blur-md">
                <Sparkles className="mr-2 size-3.5 text-primary" />
                Why We Built This
              </span>

              <h2
                id="founder-story-heading"
                className="mt-5 text-balance text-[clamp(2.15rem,4vw,3.65rem)] font-bold leading-[1.04] tracking-[-0.045em] text-foreground"
              >
                It started with a promise{" "}
                <span className="relative inline-block text-foreground/70">
                  to my daughter.
                  {/* Hand-drawn style vector highlight stroke */}
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 260 16"
                    fill="none"
                    className="pointer-events-none absolute -bottom-2 left-0 w-full"
                  >
                    <path
                      d="M3 11 C 65 3, 185 3, 257 10"
                      stroke="hsl(var(--primary))"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeOpacity="0.45"
                    />
                  </svg>
                </span>
              </h2>
            </Reveal>

            <Reveal y={18} delay={0.1}>
              <div className="relative mt-7 rounded-3xl border border-border/80 bg-card/85 p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)] backdrop-blur-md sm:p-7">
                <div className="space-y-4 text-[clamp(0.98rem,1.4vw,1.08rem)] leading-relaxed text-muted-foreground">
                  <p>
                    Every language app out there had my daughter tapping words
                    on a screen for months—yet the moment someone spoke French
                    to her in real life, she froze. I wanted her to actually{" "}
                    <strong className="font-semibold text-foreground">
                      talk
                    </strong>
                    , not just memorize vocabulary lists she&rsquo;d forget a
                    week later.
                  </p>

                  {/* Highlighted Breakthrough Moment */}
                  <div className="rounded-2xl border-l-4 border-primary bg-primary/[0.06] px-4 py-3.5 text-foreground/90">
                    <p className="font-medium">
                      So one weekend, I hacked together a rough AI voice call
                      that asked her three simple questions in French. The first
                      time she answered with a full sentence out loud without
                      second-guessing herself, her whole face lit up.
                    </p>
                  </div>

                  <p>
                    That weekend project turned into{" "}
                    <strong className="font-semibold text-primary">
                      Spoon Academy
                    </strong>
                    —bite-sized audio lessons, real unscripted conversations,
                    and an AI partner that helps you find your voice from day
                    one.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Tactile 3D Signature Block */}
            <Reveal y={18} delay={0.2}>
              <div className="mt-7 flex flex-wrap items-center justify-between gap-4 px-1">
                <div className="flex items-center gap-3.5">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-base font-black text-white shadow-md shadow-blue-500/20">
                    PH
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold tracking-tight text-foreground">
                      Paul Hendricks
                    </h4>
                    <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Founder &amp; Dad, Spoon Academy
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold text-emerald-700">
                  <AudioLines className="size-3.5" />
                  <span>Built for real spoken fluency</span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}