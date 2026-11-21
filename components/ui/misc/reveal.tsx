"use client";

import { motion, useReducedMotion, type TargetAndTransition } from "motion/react";
import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  duration?: number;
  x?: number;
  y?: number;
  scale?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article" | "span" | "p" | "h1" | "h2" | "h3";
  viewportMargin?: string;
  whileHover?: TargetAndTransition;
};

export function Reveal({
  children,
  delay = 0,
  duration = 0.8,
  x = 0,
  y = 24,
  scale = 1,
  className,
  as = "div",
  viewportMargin = "0px",
  whileHover,
}: RevealProps) {
  const reduceMotion = useReducedMotion();

  // @ts-ignore - motion dynamic tags are safe here
  const MotionTag = motion[as];

  return (
    <MotionTag
      className={className}
      initial={
        reduceMotion
          ? { opacity: 0 }
          : {
              opacity: 0,
              x,
              y,
              scale,
            }
      }
      whileInView={{
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
      }}
      whileHover={reduceMotion ? undefined : whileHover}
      viewport={{
        once: true,
        margin: viewportMargin,
      }}
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </MotionTag>
  );
}