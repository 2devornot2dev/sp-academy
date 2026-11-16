"use client";

import { useRef, useState } from "react";
// Make sure to adjust this import path to wherever you saved your Reveal component!
import { Reveal } from "../misc/reveal";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Sparkles, ArrowRight, Globe2, Zap, Users, Star } from "lucide-react";

// The right-side visual (image, vector blobs, floating widgets) lives in its own component.
// Adjust this import path to wherever you saved it.
import HeroRightSide from "./hero-right-side";

const BOTTOM_FEATURES = [
  {
    id: 1,
    icon: Globe2,
    bgColor: "bg-primary",
    title: "Real Conversations",
    desc: "Practice what you'll actually use",
  },
  {
    id: 2,
    icon: Zap,
    bgColor: "bg-secondary",
    title: "Personalized Learning",
    desc: "Built for your goals and level",
  },
  {
    id: 3,
    icon: Users,
    bgColor: "bg-tertiary",
    title: "Your Pace, Your Progress",
    desc: "Learning that adapts as you grow",
  },
  {
    id: 4,
    icon: Star,
    bgColor: "bg-accent",
    title: "Learn Anywhere",
    desc: "On your phone, tablet or computer",
  },
];

export default function HeroSection() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const handleCarouselScroll = () => {
    const el = carouselRef.current;
    if (!el) return;
    const cards = Array.from(el.children) as HTMLElement[];
    if (!cards.length) return;

    const scrollLeft = el.scrollLeft;
    let closestIndex = 0;
    let minDistance = Infinity;

    cards.forEach((card, index) => {
      const distance = Math.abs(card.offsetLeft - el.offsetLeft - scrollLeft);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    setActiveSlide(closestIndex);
  };

  const scrollToSlide = (index: number) => {
    const el = carouselRef.current;
    if (!el) return;
    const card = el.children[index] as HTMLElement | undefined;
    if (!card) return;

    el.scrollTo({
      left: card.offsetLeft - el.offsetLeft,
      behavior: "smooth",
    });
  };

  return (
    <main
      id="home"
      className="relative flex min-h-screen flex-col overflow-hidden bg-white selection:bg-blue-100"
    >
      <div className="relative mx-auto flex w-full max-w-[1600px] flex-col px-5 sm:px-8 md:px-12 lg:px-16 xl:px-24 pt-4 sm:pt-8 lg:pt-14 pb-10 lg:pb-16">
        {/* Main Content Split: flex-col-reverse puts HeroRightSide first on mobile */}
        <div className="flex w-full flex-col-reverse gap-8 sm:gap-10 lg:flex-row lg:items-center xl:gap-16">
          {/* ========================================= */}
          {/* LEFT SIDE CONTENT (2nd on mobile, 1st on desktop) */}
          {/* ========================================= */}
          <div className="relative z-20 flex min-w-0 flex-1 flex-col items-center text-center lg:items-start lg:text-left">
            <Reveal delay={0.2} scale={0.9}>
              <div className="mb-4 lg:mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100/50 bg-blue-50 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-blue-600">
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Learn a new language, your way
              </div>
            </Reveal>

            <h1 className="text-[28px] min-[400px]:text-[32px] font-extrabold leading-[1.12] tracking-tight text-[#0B192C] sm:text-4xl md:text-5xl lg:text-6xl xl:text-[68px]">
              <Reveal
                as="span"
                delay={0.3}
                className="mb-1 sm:mb-2 block sm:whitespace-nowrap"
              >
                Real Conversations.
              </Reveal>
              <Reveal
                as="span"
                delay={0.4}
                className="mb-1 sm:mb-2 block text-blue-500"
              >
                Real Progress.
              </Reveal>
              <Reveal as="span" delay={0.5} className="block">
                <span className="text-secondary">A</span>{" "}
                <span className="text-accent">Brighter</span>{" "}
                <span className="text-tertiary">You.</span>
              </Reveal>
            </h1>

            <Reveal
              as="p"
              delay={0.6}
              className="mt-4 sm:mt-5 max-w-xl text-[15px] sm:text-base lg:text-lg leading-relaxed text-gray-500"
            >
              SPOON makes language learning simple, fun, and effective. Build
              real-world skills, speak with confidence, and open the door to new
              cultures — one lesson at a time.
            </Reveal>

            <Reveal
              delay={0.7}
              className="mt-6 lg:mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start"
            >
              <Link href="#pricing" className="w-full sm:w-auto">
                <Button className="h-12 sm:h-14 w-full rounded-full bg-blue-500 px-7 sm:px-8 text-base sm:text-lg font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:scale-105 hover:bg-blue-600 sm:w-auto">
                  Start Learning Today
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </Link>
            </Reveal>

            {/* Bottom Features: Swipeable Carousel on mobile, 4-col Grid on sm+ */}
            <Reveal delay={0.9} className="mt-8 lg:mt-12 w-full max-w-2xl lg:max-w-none">
              <div
                ref={carouselRef}
                onScroll={handleCarouselScroll}
                className="flex w-full snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-4 sm:gap-4 sm:overflow-visible sm:pb-0 lg:gap-6"
              >
                {BOTTOM_FEATURES.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={feature.id}
                      className={`flex w-[74%] shrink-0 snap-start flex-col items-start rounded-2xl p-4 text-left sm:w-auto sm:items-center sm:text-center lg:items-start lg:text-left ${feature.bgColor}`}
                    >
                      <div className="mb-2.5 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/20">
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                      </div>
                      <h3 className="mb-1 text-sm font-bold text-white">
                        {feature.title}
                      </h3>
                      <p className="text-xs leading-snug text-white/85">
                        {feature.desc}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Mobile Carousel Dots */}
              <div className="mt-3 flex items-center justify-center gap-1.5 sm:hidden">
                {BOTTOM_FEATURES.map((feature, index) => (
                  <button
                    key={feature.id}
                    type="button"
                    aria-label={`Go to ${feature.title}`}
                    onClick={() => scrollToSlide(index)}
                    className={`h-1.5 rounded-full transition-all ${
                      activeSlide === index
                        ? "w-5 bg-blue-500"
                        : "w-1.5 bg-gray-300"
                    }`}
                  />
                ))}
              </div>
            </Reveal>
          </div>

          {/* ========================================= */}
          {/* RIGHT SIDE — IMAGE & UI WIDGETS           */}
          {/* (1st on mobile, 2nd on desktop)           */}
          {/* ========================================= */}
          <HeroRightSide />
        </div>
      </div>
    </main>
  );
}