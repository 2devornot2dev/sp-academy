"use client";

import { ArrowRight, Globe, MessageSquare, Star, Users, Languages, Brain } from "lucide-react";
import Link from "next/link";

import { Reveal } from "@/components/ui/misc/reveal";
import { Button } from "@/components/ui/button";

const STATS = [
  {
    id: "languages",
    icon: Languages,
    value: "3",
    label: "EN · FR · ES",
    color: "primary",
  },
  {
    id: "founder",
    icon: Star,
    value: "Beta",
    label: "Founder Pricing",
    color: "secondary",
  },
  {
    id: "brain",
    icon: Brain,
    value: "Everyday",
    label: "New Chanllenges",
    color: "tertiary",
  },
  {
    id: "community",
    icon: Users,
    value: "Community",
    label: "Private Community",
    color: "accent",
  },
] as const;

const TESTIMONIALS = [
  {
    content:
      "I've tried every app out there, but Spoon's conversational AI actually helped me speak French without freezing up. Incredible!",
    author: "Sarah M.",
    role: "Learning French",
    avatar: "🇫🇷",
    themeKey: "primary",
  },
  {
    content:
      "Having a personalized tutor available 24/7 means I can practice on my commute. My pronunciation has improved drastically.",
    author: "Michael R.",
    role: "Learning Spanish",
    avatar: "🇪🇸",
    themeKey: "secondary",
  },
  {
    content:
      "The lessons adapt to my level so I never feel overwhelmed. I'm finally confident enough to use my new skills in the real world.",
    author: "Lisa K.",
    role: "Learning English",
    avatar: "🇬🇧",
    themeKey: "tertiary",
  },
] as const;

// Themes for the 4 solid stat cards
const STAT_THEMES = {
  primary: {
    card: "bg-primary text-white",
    icon: "bg-white/20",
  },
  secondary: {
    card: "bg-secondary text-white",
    icon: "bg-white/20",
  },
  tertiary: {
    card: "bg-tertiary text-white",
    icon: "bg-white/20",
  },
  accent: {
    card: "bg-accent text-white",
    icon: "bg-white/20", 
  },
};

// Subtle themes for the testimonial cards
const TESTIMONIAL_THEMES = {
  primary: { text: "text-primary" },
  secondary: { text: "text-secondary" },
  tertiary: { text: "text-tertiary" },
};

const CARD_BASE =
  "relative isolate flex w-full flex-col overflow-hidden rounded-[1.25rem] border border-border/75 bg-card/90 backdrop-blur-xl shadow-[0_1px_1px_hsl(var(--foreground)/0.03),0_18px_50px_hsl(var(--foreground)/0.04)]";

export default function StatsSection() {
  return (
    <section
      aria-labelledby="stats-heading"
      className="relative isolate overflow-clip bg-background py-[clamp(4rem,7vh,5.5rem)]"
    >
      {/* Ambient Background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_12%_30%,hsl(var(--primary)/0.08),transparent_32rem),radial-gradient(circle_at_88%_30%,hsl(var(--tertiary)/0.08),transparent_30rem),linear-gradient(180deg,transparent,hsl(var(--muted)/0.22)_50%,transparent)]"
      />

      <div className="mx-auto w-full max-w-6xl px-4">
        <Reveal className="mx-auto max-w-[44rem] text-center" y={18}>
          <span className="inline-flex min-h-8 items-center rounded-full border border-border/80 bg-background/60 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-foreground/72 backdrop-blur-md">
            Success Stories
          </span>

          <h2
            id="stats-heading"
            className="mt-4 text-balance text-[clamp(2.15rem,4vw,3.65rem)] font-[760] leading-[1.02] tracking-[-0.045em] text-foreground"
          >
            Learning that leaves a{" "}
            <span className="text-foreground/55">lasting impact.</span>
          </h2>

          <p className="mx-auto mt-3.5 max-w-[37rem] text-balance text-[clamp(1rem,1.5vw,1.1rem)] leading-relaxed text-muted-foreground">
            See how Spoon is helping learners of all levels build confidence and achieve
            measurable fluency every single day.
          </p>
        </Reveal>

        {/* Stats Grid - Solid Brand Colors with White Text */}
        <div className="mx-auto mt-[clamp(2rem,4vh,3rem)] grid max-w-[58rem] grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {STATS.map((stat, index) => {
            const Icon = stat.icon;
            const theme = STAT_THEMES[stat.color];

            return (
              <Reveal key={stat.id} delay={0.08 + index * 0.08} y={16}>
                <div
                  className={`relative isolate flex w-full flex-col items-center overflow-hidden rounded-[1.25rem] border border-white/10 p-6 text-center shadow-xl transition-transform duration-300 hover:-translate-y-1 ${theme.card}`}
                >
                  <div
                    className={`mb-4 flex size-12 items-center justify-center rounded-full ${theme.icon}`}
                  >
                    <Icon className="size-5" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-[clamp(1.75rem,2.5vw,2.25rem)] font-bold leading-none tracking-[-0.04em]">
                    {stat.value}
                  </h3>
                  <p className="mt-2 text-sm font-medium opacity-90">
                    {stat.label}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* Testimonials Grid - Glassmorphism */}
        <div className="mx-auto mt-4 grid max-w-[58rem] grid-cols-1 gap-4 md:mt-6 md:grid-cols-3 md:gap-6">
          {TESTIMONIALS.map((testimonial, index) => {
            const theme = TESTIMONIAL_THEMES[testimonial.themeKey];

            return (
              <Reveal
                key={testimonial.author}
                delay={0.16 + index * 0.08}
                y={16}
                className="flex"
              >
                <article
                  className={`${CARD_BASE} p-6 transition-transform duration-300 hover:-translate-y-1 md:p-8`}
                >
                  <div className="flex h-full flex-col">
                    <div className="mb-5 text-3xl opacity-90">
                      {testimonial.avatar}
                    </div>
                    <p className="text-[clamp(1rem,1.15vw,1.05rem)] leading-[1.7] text-foreground/85">
                      &ldquo;{testimonial.content}&rdquo;
                    </p>

                    <div className="mt-auto pt-7">
                      <div className="border-t border-border/80 pt-5">
                        <p className={`text-[0.95rem] font-bold ${theme.text}`}>
                          {testimonial.author}
                        </p>
                        <p className="mt-0.5 text-sm font-medium text-muted-foreground">
                          {testimonial.role}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>

        {/* Call to Action */}
        <Reveal
          delay={0.4}
          y={16}
          className="mt-[clamp(2.5rem,5vh,3.5rem)] flex justify-center"
        >
          <Button
            nativeButton={false}
            render={<Link href="#pricing" />}
            className="h-[2.85rem] gap-2 rounded-full border border-border bg-foreground px-6 font-semibold text-background shadow-none transition-all duration-200 hover:-translate-y-px hover:bg-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            Start your language journey
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </Reveal>
      </div>
    </section>
  );
}