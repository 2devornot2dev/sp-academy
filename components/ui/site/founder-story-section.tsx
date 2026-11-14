// components/ui/site/founder-story-section.tsx
"use client";

import Image from "next/image";
import { Heart, Mic, Sparkles, CheckCircle2 } from "lucide-react";
import { Reveal } from "@/components/ui/misc/reveal";

export function FounderStorySection() {
  return (
    <section
      id="our-story"
      aria-labelledby="founder-story-heading"
      className="relative isolate overflow-clip bg-background py-[clamp(4.5rem,8vh,6.5rem)]"
    >
      {/* Background Radial Glows matching Pricing Section */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_12%_30%,hsl(var(--primary)/0.08),transparent_32rem),radial-gradient(circle_at_88%_30%,hsl(var(--tertiary)/0.08),transparent_30rem),linear-gradient(180deg,transparent,hsl(var(--muted)/0.22)_50%,transparent)]"
      />

      <div className="mx-auto w-full max-w-6xl px-4 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-12 lg:gap-16">
          {/* LEFT (5 Cols): Studio Photo Frame + SVG Vectors + Floating Reaction Badges */}
          <div className="order-2 lg:order-1 lg:col-span-5">
            <Reveal y={24}>
              <div className="group relative mx-auto max-w-md lg:max-w-none">
                {/* 1. Custom Decorative Vector SVG (Orbits, Sparkles & Sound Arcs) */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 520 580"
                  fill="none"
                  className="pointer-events-none absolute -inset-10 -z-10 h-[calc(100%+5rem)] w-[calc(100%+5rem)] overflow-visible"
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
                        stopOpacity="0.45"
                      />
                      <stop
                        offset="50%"
                        stopColor="#8B5CF6"
                        stopOpacity="0.35"
                      />
                      <stop
                        offset="100%"
                        stopColor="#10B981"
                        stopOpacity="0.45"
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
                    fillOpacity="0.55"
                  />

                  {/* Bottom-Right Vector Sparkle Star */}
                  <path
                    d="M482 518 C482 504, 482 504, 468 504 C482 504, 482 504, 482 490 C482 504, 482 504, 496 504 C482 504, 482 504, 482 518 Z"
                    fill="#10B981"
                    fillOpacity="0.65"
                  />

                  {/* Accent Dots */}
                  <circle
                    cx="478"
                    cy="88"
                    r="6"
                    fill="#8B5CF6"
                    fillOpacity="0.5"
                  />
                  <circle
                    cx="38"
                    cy="480"
                    r="5"
                    fill="hsl(var(--primary))"
                    fillOpacity="0.5"
                  />
                </svg>

                {/* Soft Ambient Glow Behind Photo */}
                <div className="pointer-events-none absolute -inset-2 -z-10 rounded-[2.25rem] bg-gradient-to-tr from-primary/20 via-purple-500/15 to-emerald-400/20 blur-2xl transition-opacity duration-500 group-hover:opacity-90" />

                {/* 2. Floating Top-Right Reaction Pill (Voice Prototype Moment) */}
                <div className="absolute -top-4 -right-3 z-20 flex items-center gap-2.5 rounded-2xl border border-border/80 bg-background/95 px-3.5 py-2 shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur-md transition-transform duration-500 group-hover:-translate-y-1 sm:-right-5">
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
                    {/* Mini Animated Audio Bars */}
                    <div className="mt-1 flex items-end gap-0.5">
                      {[10, 16, 8, 18, 12, 16, 9, 14].map((h, i) => (
                        <span
                          key={i}
                          style={{ height: `${h}px` }}
                          className="w-1 rounded-full bg-emerald-500/80"
                        />
                      ))}
                      <span className="ml-1.5 text-[10px] font-semibold text-muted-foreground">
                        Out loud
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Main Studio Photo Card (Crisp White Mat Border, No White Fog Scrim!) */}
                <div className="relative overflow-hidden rounded-[1.75rem] border border-border/80 bg-card p-2.5 shadow-[0_2px_4px_hsl(var(--foreground)/0.04),0_24px_60px_hsl(var(--foreground)/0.1)] transition-transform duration-500 group-hover:-translate-y-1">
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

                {/* 4. Floating Bottom-Left Reaction Pill */}
                <div className="absolute -bottom-4 left-4 z-20 inline-flex items-center gap-2.5 rounded-2xl border border-border/80 bg-background/95 px-4 py-2.5 shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur-md transition-transform duration-500 group-hover:translate-y-0.5 sm:-left-4">
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
              <span className="inline-flex min-h-8 w-fit items-center rounded-full border border-border/80 bg-background/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-foreground/70 backdrop-blur-md">
                <Sparkles className="mr-2 size-3.5 text-primary" />
                Why We Built This
              </span>

              <h2
                id="founder-story-heading"
                className="mt-5 text-balance text-[clamp(2.15rem,4vw,3.65rem)] font-bold leading-[1.02] tracking-[-0.045em] text-foreground"
              >
                It started with a promise{" "}
                <span className="text-foreground/55">to my daughter.</span>
              </h2>
            </Reveal>

            <Reveal y={18} delay={0.1}>
              <div className="mt-7 space-y-5 text-balance text-[clamp(1rem,1.5vw,1.1rem)] leading-relaxed text-muted-foreground">
                <p>
                  Every language app out there had my daughter tapping words on
                  a screen for months—yet the moment someone spoke French to her
                  in real life, she froze. I wanted her to actually{" "}
                  <strong className="font-semibold text-foreground">
                    talk
                  </strong>
                  , not just memorize vocabulary lists she&rsquo;d forget a week
                  later.
                </p>

                <p>
                  So one weekend, I hacked together a rough AI voice call that
                  asked her three simple questions in French. The first time she
                  answered with a full sentence out loud without second-guessing
                  herself, her whole face lit up.
                </p>

                <p>
                  That weekend project turned into{" "}
                  <strong className="font-semibold text-primary">
                    Spoon Academy
                  </strong>
                  —bite-sized audio lessons, real unscripted conversations, and
                  an AI partner that helps you find your voice from day one.
                </p>
              </div>
            </Reveal>

            {/* Signature Block */}
            <Reveal y={18} delay={0.2}>
              <div className="mt-9 flex items-center gap-4 border-t border-border/80 pt-6">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-lg font-bold text-primary shadow-inner">
                  PH
                </div>
                <div>
                  <h4 className="text-base font-bold tracking-tight text-foreground">
                    Paul Hendricks
                  </h4>
                  <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Founder &amp; Dad, Spoon Academy
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}