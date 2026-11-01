// components/ui/site/founder-story-section.tsx
"use client";

import Image from "next/image";
import { Heart, Sparkles } from "lucide-react";
import { Reveal } from "@/components/ui/misc/reveal";

export function FounderStorySection() {
  return (
    <section
      id="our-story"
      aria-labelledby="founder-story-heading"
      className="relative isolate overflow-hidden bg-[#0A0F1D] py-20 lg:py-28 text-white"
    >
      {/* Background Radial Glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_40%,rgba(45,212,191,0.12),transparent_35rem),radial-gradient(circle_at_80%_60%,rgba(99,102,241,0.15),transparent_35rem)]"
      />

      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* LEFT: Authentic Photo Card */}
          <div className="lg:col-span-5">
            <Reveal y={20}>
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Glowing Outer Border Frame */}
                <div className="absolute -inset-2 rounded-[2rem] bg-gradient-to-tr from-teal-400 via-indigo-500 to-amber-400 opacity-30 blur-lg transition duration-500 hover:opacity-50" />

                <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-slate-900 shadow-2xl">
                  <Image
                    src="/paul-and-daughter.png"
                    alt="Paul and his daughter, the inspiration behind Spoon Academy"
                    width={600}
                    height={700}
                    className="h-auto w-full object-cover object-center transition duration-500 hover:scale-[1.02]"
                    priority
                  />

                  {/* Photo Caption Badge */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-transparent p-5 pt-10 text-center">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-400/30 bg-teal-950/80 px-3.5 py-1 text-xs font-bold text-teal-300 backdrop-blur-md">
                      <Heart className="h-3.5 w-3.5 text-rose-400 fill-current" />
                      <span>Paul &amp; His Daughter • The Inspiration</span>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* RIGHT: Letter from the Founder */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <Reveal y={20} delay={0.1}>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-400/10 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider text-amber-300 backdrop-blur-md w-fit mb-4">
                <Sparkles className="h-3.5 w-3.5" />
                <span>My Story</span>
              </div>

              <h2
                id="founder-story-heading"
                className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl leading-tight"
              >
                It started with a promise to my daughter.
              </h2>
            </Reveal>

            <Reveal y={20} delay={0.2}>
              <div className="mt-6 space-y-4 text-base lg:text-lg leading-relaxed text-slate-300 font-medium">
                <p>
                  I wanted my daughter to actually{" "}
                  <strong className="text-white font-bold">speak</strong>{" "}
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
                  <strong className="text-teal-300 font-bold">
                    Spoon Academy
                  </strong>
                  : a 1-on-1 space where anyone can build real speaking
                  confidence with an AI partner who never judges, never gets
                  tired, and celebrates every win. I built every part of it
                  myself.
                </p>
              </div>
            </Reveal>

            {/* Signature Block */}
            <Reveal y={20} delay={0.3}>
              <div className="mt-8 flex items-center gap-4 pt-6 border-t border-white/10">
              
                <div>
                  <h4 className="text-base font-extrabold text-white tracking-tight">
                    Paul Hendricks
                  </h4>
                  <p className="text-xs font-bold text-teal-400">
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