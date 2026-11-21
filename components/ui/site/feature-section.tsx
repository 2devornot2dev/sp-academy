"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Award, BookOpen, Bot, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Reveal } from "@/components/ui/misc/reveal";
import { Button } from "@/components/ui/button";

const TAB_DURATION = 6000;

type Feature = {
  id: string;
  icon: LucideIcon;
  title: string;
  shortTitle: string;
  label: string;
  description: string;
  imageSrc: string;
  accent: "primary" | "secondary" | "tertiary";
};

const FEATURES: Feature[] = [
  {
    id: "conversation",
    icon: Bot,
    title: "Conversational AI",
    shortTitle: "AI Tutor",
    label: "Speak naturally",
    description:
      "Practice real conversations with a tutor that listens, responds, and adapts. Receive immediate pronunciation feedback without following a rigid script.",
    imageSrc: "/feature-01.webp",
    accent: "primary",
  },
  {
    id: "lessons",
    icon: BookOpen,
    title: "Lessons built around you",
    shortTitle: "Your Lessons",
    label: "Learn your way",
    description:
      "Quizzes, challenges, and games are generated around your goals and current level, keeping every lesson relevant as your skills improve.",
    imageSrc: "/feature-02.webp",
    accent: "secondary",
  },
  {
    id: "achievements",
    icon: Award,
    title: "Progress worth showing",
    shortTitle: "Progress",
    label: "Prove your progress",
    description:
      "Track meaningful milestones, unlock achievements, and earn verified certificates that turn consistent practice into something tangible.",
    imageSrc: "/feature-03.webp",
    accent: "tertiary",
  },
];

const THEMES = {
  primary: {
    bg: "#cce6ff",
    text: "text-primary",
    progress: "bg-primary",
    ring: "focus-visible:ring-primary",
    blob: "bg-primary/20",
    border: "border-primary/30",
  },
  secondary: {
    bg: "#d3f3df",
    text: "text-secondary",
    progress: "bg-secondary",
    ring: "focus-visible:ring-secondary",
    blob: "bg-secondary/20",
    border: "border-secondary/30",
  },
  tertiary: {
    bg: "#ecdcfd",
    text: "text-tertiary",
    progress: "bg-tertiary",
    ring: "focus-visible:ring-tertiary",
    blob: "bg-tertiary/20",
    border: "border-tertiary/30",
  },
};

export default function FeaturesSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const activeFeature = FEATURES[activeIndex];
  const ActiveIcon = activeFeature.icon;
  const currentTheme = THEMES[activeFeature.accent];

  const selectFeature = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  useEffect(() => {
    if (reduceMotion || isPaused) return;

    const timer = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % FEATURES.length);
    }, TAB_DURATION);

    return () => window.clearTimeout(timer);
  }, [activeIndex, isPaused, reduceMotion]);

  function handleTabKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let nextIndex = index;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % FEATURES.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + FEATURES.length) % FEATURES.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = FEATURES.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    selectFeature(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="relative isolate overflow-clip py-12 sm:py-16 lg:flex lg:min-h-[100svh] lg:items-center lg:py-0 transition-colors duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{ backgroundColor: currentTheme.bg }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsPaused(false);
        }
      }}
    >
      {/* Hidden preloader block to entirely prevent image loading layout jumps */}
      <div aria-hidden="true" className="hidden">
        {FEATURES.map((feature) => (
          <Image key={feature.id} src={feature.imageSrc} priority width={760} height={560} alt="" />
        ))}
      </div>

      <div
        className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_10%_25%,hsl(var(--primary)/0.08),transparent_32rem),radial-gradient(circle_at_88%_20%,hsl(var(--secondary)/0.07),transparent_30rem),linear-gradient(180deg,transparent,hsl(var(--muted)/0.22)_50%,transparent)]"
        aria-hidden="true"
      />

      <div className="mx-auto w-full max-w-[72rem] px-4">
        <Reveal className="mx-auto max-w-[44rem] text-center" y={18}>
          <span className="inline-flex min-h-7 items-center rounded-full border border-border/80 bg-background/60 px-3 py-1 text-[11px] sm:text-xs font-bold uppercase tracking-[0.08em] text-foreground/72 backdrop-blur-md">
            See Spoon in action
          </span>

          <h2
            id="features-heading"
            className="mt-3 sm:mt-4 text-balance text-[clamp(1.85rem,4vw,3.65rem)] font-[760] leading-[1.04] tracking-[-0.045em] text-foreground"
          >
            Everything you need to{" "}
            <span className="text-foreground/55">actually learn.</span>
          </h2>

          <p className="mx-auto mt-2.5 sm:mt-3.5 max-w-[37rem] text-balance text-[0.94rem] sm:text-[clamp(1rem,1.5vw,1.1rem)] leading-relaxed text-muted-foreground">
            Conversation, adaptive lessons, and meaningful progress—working as
            one focused learning experience.
          </p>
        </Reveal>

        <Reveal delay={0.08} y={16}>
          {/* 3-col grid on ALL screen sizes so all 3 tabs stay visible with zero horizontal clipping */}
          <div
            className="mx-auto mt-6 md:mt-[clamp(2rem,4vh,3rem)] grid max-w-[58rem] grid-cols-3 gap-1 rounded-[1.15rem] md:rounded-[1.25rem] border border-border/75 bg-background/65 p-1 md:p-1.5 shadow-[0_1px_1px_hsl(var(--foreground)/0.03),0_18px_50px_hsl(var(--foreground)/0.04)] backdrop-blur-xl"
            role="tablist"
            aria-label="Product features"
          >
            {FEATURES.map((feature, index) => {
              const isActive = index === activeIndex;
              const theme = THEMES[feature.accent];

              return (
                <button
                  key={feature.id}
                  ref={(element) => {
                    tabRefs.current[index] = element;
                  }}
                  id={`feature-tab-${feature.id}`}
                  type="button"
                  role="tab"
                  tabIndex={isActive ? 0 : -1}
                  aria-selected={isActive}
                  aria-controls={`feature-panel-${feature.id}`}
                  className={`relative flex flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg md:rounded-xl px-2 py-2.5 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 md:flex-row md:justify-start md:gap-2.5 md:px-4 md:py-3.5 md:text-left ${
                    isActive
                      ? "bg-card/95 text-foreground shadow-[0_1px_2px_hsl(var(--foreground)/0.06),0_8px_24px_hsl(var(--foreground)/0.06)]"
                      : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                  } ${theme.ring}`}
                  onClick={() => selectFeature(index)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                >
                  <span className={`text-[0.65rem] md:text-[0.68rem] font-[750] tracking-[0.08em] ${theme.text}`}>
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span className="md:hidden text-[0.75rem] font-[680] leading-tight">
                    {feature.shortTitle}
                  </span>
                  <span className="hidden md:inline min-w-0 overflow-hidden text-[0.83rem] font-[650] text-ellipsis whitespace-nowrap">
                    {feature.title}
                  </span>

                  {isActive && !reduceMotion && !isPaused && (
                    <motion.span
                      key={`${feature.id}-${activeIndex}`}
                      className={`absolute bottom-0 left-2 right-2 md:left-2.5 md:right-2.5 h-[2px] origin-left rounded-full ${theme.progress}`}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{
                        duration: TAB_DURATION / 1000,
                        ease: "linear",
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </Reveal>

        <div className="relative mt-5 md:mt-[clamp(1.75rem,4vh,3rem)] w-full">
          {/* popLayout removes the exiting element from layout space immediately, solving height collapse jumps */}
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={activeFeature.id}
              id={`feature-panel-${activeFeature.id}`}
              role="tabpanel"
              aria-labelledby={`feature-tab-${activeFeature.id}`}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-1 items-center gap-5 md:min-h-[min(31rem,46vh)] md:grid-cols-[minmax(0,1.2fr)_minmax(17rem,0.8fr)] md:gap-[clamp(2.5rem,6vw,5.5rem)]"
            >
              <div className="relative grid place-items-center md:min-h-[clamp(20rem,43vh,31rem)]">
                <FeatureVectors
                  accent={activeFeature.accent}
                  reduceMotion={Boolean(reduceMotion)}
                />

                <motion.div
                  className="relative z-10 w-full max-w-[43rem] drop-shadow-[0_22px_26px_hsl(var(--foreground)/0.1)] drop-shadow-[0_5px_8px_hsl(var(--foreground)/0.06)]"
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.985 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Image
                    src={activeFeature.imageSrc}
                    alt={`${activeFeature.title} interface`}
                    width={760}
                    height={560}
                    sizes="(min-width: 768px) 56vw, 96vw"
                    className="block h-auto w-full object-contain"
                    priority
                  />
                </motion.div>
              </div>

              <div className="relative isolate flex items-center py-1 md:min-h-[20rem] md:py-0">
                <ActiveIcon
                  className={`pointer-events-none absolute right-0 top-0 -z-10 size-36 -rotate-[7deg] opacity-[0.055] md:top-1/2 md:-right-8 md:size-[clamp(12rem,24vw,20rem)] md:-translate-y-1/2 ${currentTheme.text}`}
                  strokeWidth={1.15}
                  aria-hidden="true"
                />

                <div className="relative z-10 w-full max-w-[28rem] text-center md:text-left mx-auto md:mx-0">
                  <span
                    className={`inline-flex items-center gap-[0.6rem] text-[0.72rem] sm:text-[0.75rem] font-[750] uppercase tracking-[0.1em] md:before:h-px md:before:w-7 md:before:bg-current md:before:content-[''] ${currentTheme.text}`}
                  >
                    {activeFeature.label}
                  </span>

                  <h3 className="mt-2 sm:mt-3.5 text-balance text-[clamp(1.6rem,3.2vw,3.25rem)] font-[740] leading-[1.05] tracking-[-0.04em] text-foreground">
                    {activeFeature.title}
                  </h3>

                  <p className="mt-3 sm:mt-[1.15rem] text-[0.95rem] sm:text-[clamp(1rem,1.35vw,1.08rem)] leading-[1.65] text-muted-foreground">
                    {activeFeature.description}
                  </p>

                  <Button
                    nativeButton={false}
                    render={<Link href="/signup" />}
                    className="mt-5 sm:mt-[1.6rem] h-[2.85rem] gap-[0.55rem] rounded-full border border-border bg-foreground px-6 font-[650] text-background shadow-none transition-all duration-180 hover:-translate-y-px hover:bg-foreground hover:opacity-90"
                  >
                    Start learning
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function FeatureVectors({
  accent,
  reduceMotion,
}: {
  accent: "primary" | "secondary" | "tertiary";
  reduceMotion: boolean;
}) {
  const theme = THEMES[accent];

  return (
    <div
      className="pointer-events-none absolute inset-[-5%] -z-10 overflow-visible"
      aria-hidden="true"
    >
      {/* Soft Ambient Glow */}
      <motion.div
        className={`absolute left-1/4 top-1/4 h-[50%] w-[50%] rounded-full mix-blend-multiply blur-[60px] md:blur-[80px] ${theme.blob}`}
        animate={
          reduceMotion
            ? undefined
            : { scale: [1, 1.15, 1], opacity: [0.35, 0.5, 0.35] }
        }
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating Glassmorphism Pill */}
      <motion.div
        className={`absolute right-[5%] top-[10%] h-[20%] w-[25%] rounded-[2rem] border backdrop-blur-xl md:right-[10%] md:h-[25%] md:w-[22%] ${theme.border} ${theme.blob}`}
        animate={
          reduceMotion
            ? undefined
            : { y: [0, -20, 0], rotate: [-2, 8, -2] }
        }
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ opacity: 0.8 }}
      />

      {/* Delicate Wireframe Ring */}
      <motion.div
        className={`absolute bottom-[10%] left-[5%] h-[20%] w-[15%] rounded-full border-2 md:left-[10%] md:h-[25%] md:w-[12%] ${theme.border}`}
        animate={
          reduceMotion
            ? undefined
            : { y: [0, 20, 0], rotate: [5, -15, 5] }
        }
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5,
        }}
        style={{ opacity: 0.5 }}
      />
    </div>
  );
}