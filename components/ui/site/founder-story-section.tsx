// components/ui/site/founder-story-section.tsx
"use client";

import Image from "next/image";
import { Heart, Quote, Sparkles } from "lucide-react";
import { Reveal } from "@/components/ui/misc/reveal";

export function FounderStorySection() {
  return (
    <section
      id="our-story"
      aria-labelledby="founder-story-heading"
      className="relative isolate overflow-clip bg-background py-[clamp(4rem,7vh,5.5rem)]"
    >
      {/* Background Radial Glows matching Pricing Section */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_12%_30%,hsl(var(--primary)/0.08),transparent_32rem),radial-gradient(circle_at_88%_30%,hsl(var(--tertiary)/0.08),transparent_30rem),linear-gradient(180deg,transparent,hsl(var(--muted)/0.22)_50%,transparent)]"
      />

      <div className="mx-auto w-full max-w-6xl px-4 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          
          {/* LEFT: Clean Image Frame with Subtle Vector Treatment */}
          <div className="lg:order-1 order-2">
            <Reveal y={24}>
              <div className="group relative mx-auto max-w-md lg:max-w-none">
                
                {/* Accent Vector Frame (Subtle outline shift on hover) */}
                <div className="pointer-events-none absolute -inset-3 -z-10 rounded-[2rem] border border-primary/20 bg-primary/5 transition-transform duration-700 group-hover:-rotate-2 group-hover:scale-[1.02]" />
                <div className="pointer-events-none absolute -inset-3 -z-10 rounded-[2rem] border border-tertiary/20 bg-tertiary/5 transition-transform duration-700 group-hover:rotate-2 group-hover:scale-[1.02]" />

                {/* Main Photo Card */}
                <div className="relative overflow-hidden rounded-[1.5rem] border border-border/80 bg-card shadow-[0_1px_1px_hsl(var(--foreground)/0.03),0_18px_50px_hsl(var(--foreground)/0.04)]">
                  <div className="relative w-full">
                    <Image
                      src="/paul-and-daughter.png"
                      alt="Paul and his daughter, the inspiration behind Spoon Academy"
                      width={600}
                      height={700}
                      className="h-auto w-full object-cover object-center transition duration-700 group-hover:scale-[1.03]"
                      priority
                    />
                    {/* Inner Scrim for Badge */}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent" />
                  </div>

                  {/* Photo Caption Badge */}
                  <div className="absolute bottom-6 left-0 right-0 flex justify-center px-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/80 px-4 py-2 text-[11px] font-bold text-foreground shadow-sm backdrop-blur-md">
                      <Heart className="size-3.5 fill-rose-500 text-rose-500" />
                      <span className="uppercase tracking-widest text-foreground/80">
                        The Inspiration
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* RIGHT: Letter from the Founder */}
          <div className="flex flex-col justify-center lg:order-2 order-1">
            <Reveal y={18}>
              <span className="inline-flex min-h-8 items-center rounded-full border border-border/80 bg-background/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-foreground/70 backdrop-blur-md">
                <Sparkles className="mr-2 size-3.5 text-primary" />
                My Story
              </span>

              <h2
                id="founder-story-heading"
                className="mt-5 text-balance text-[clamp(2.15rem,4vw,3.65rem)] font-bold leading-[1.02] tracking-[-0.045em] text-foreground"
              >
                It started with a promise{" "}
                <span className="text-foreground/55">
                  to my daughter.
                </span>
              </h2>
            </Reveal>

            <Reveal y={18} delay={0.1}>
              <div className="relative mt-8">
                <Quote className="absolute -top-4 -left-4 size-14 rotate-180 text-primary/10" />
                
                <div className="relative z-10 space-y-5 text-balance text-[clamp(1rem,1.5vw,1.1rem)] leading-relaxed text-muted-foreground">
                  <p>
                    I wanted my daughter to actually{" "}
                    <strong className="font-semibold text-foreground">speak</strong>{" "}
                    French, not just tap multiple-choice buttons or memorize
                    vocabulary lists she&rsquo;d forget a week later.
                  </p>

                  <p>
                    So I built a rough prototype: a simple AI phone call that
                    asked her three basic questions. The first time she answered
                    with a real sentence out loud, her face lit up, and I knew
                    I&rsquo;d stumbled onto something.
                  </p>

                  <p>
                    That prototype became{" "}
                    <strong className="font-semibold text-primary">
                      Spoon Academy
                    </strong>
                    : a 1-on-1 space where anyone can build real speaking
                    confidence with an AI partner who never judges, never gets
                    tired, and celebrates every win. I built every part of it
                    myself.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Signature Block */}
            <Reveal y={18} delay={0.2}>
              <div className="mt-10 flex items-center gap-4 border-t border-border/80 pt-6">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-lg font-bold text-primary shadow-inner">
                  PH
                </div>
                <div>
                  <h4 className="text-base font-bold tracking-tight text-foreground">
                    Paul Hendricks
                  </h4>
                  <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Founder, Spoon Academy
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