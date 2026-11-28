// components/home/dashboard-hero-card.tsx
"use client";

import Link from "next/link";
import { ArrowRight, Check, Crown, Mic, Sparkles } from "lucide-react";
import type { HomeDashboardData } from "@/app/actions/get-home-dashboard";
import { HeroTrophyIllustration } from "./utils";

function getFlagBands(targetLang?: string): [string, string, string] {
  const raw = (targetLang || "fr-FR").toLowerCase();
  if (raw.startsWith("es") || raw.includes("spanish")) {
    // Spain: Red / Gold / Red
    return ["#EF4444", "#FACC15", "#EF4444"];
  }
  if (raw.startsWith("en") || raw.includes("english")) {
    // Royal Blue / White / Crimson
    return ["#1D4ED8", "#FFFFFF", "#EF4444"];
  }
  // France default: Blue / White / Red
  return ["#2563EB", "#FFFFFF", "#EF4444"];
}

type DashboardHeroCardProps = {
  languageCard: HomeDashboardData["languageCard"];
  upcoming: HomeDashboardData["upcoming"];
};

export function DashboardHeroCard({
  languageCard,
  upcoming,
}: DashboardHeroCardProps) {
  const isBossFocus = upcoming.focusType === "BOSS";
  const isBridgeFocus = upcoming.focusType === "BRIDGE";
  const isConvoGate = isBossFocus && upcoming.href === "/conversation";

  const cta3DStyle = isConvoGate
    ? "border-amber-700 bg-gradient-to-b from-amber-300 via-amber-400 to-orange-500 text-slate-950 shadow-amber-500/30"
    : isBossFocus
      ? "border-amber-700 bg-gradient-to-b from-amber-300 via-amber-400 to-orange-500 text-slate-950 shadow-amber-500/30"
      : isBridgeFocus
        ? "border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950 shadow-amber-500/30"
        : "border-emerald-800 bg-gradient-to-b from-emerald-300 via-emerald-400 to-teal-500 text-slate-950 shadow-emerald-500/30";

  const flagBands = getFlagBands(languageCard.targetLanguage);

  return (
    <div className="relative shrink-0 overflow-hidden rounded-2xl sm:rounded-3xl border-b-[6px] border-indigo-950/40 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-4 sm:p-6 sm:px-7 text-white shadow-[0_12px_30px_rgba(37,99,235,0.28),inset_0_2px_0_rgba(255,255,255,0.35)]">
      {/* Vibrant Primary / Secondary / Accent Color Mesh Orbs */}
      <div className="pointer-events-none absolute -top-16 -left-10 h-52 w-52 rounded-full bg-cyan-400/30 blur-3xl animate-pulse" />
      <div
        className="pointer-events-none absolute -top-12 right-4 h-56 w-56 rounded-full bg-fuchsia-500/30 blur-3xl animate-pulse"
        style={{ animationDelay: "1.2s" }}
      />
      <div
        className="pointer-events-none absolute -bottom-16 right-16 h-48 w-48 rounded-full bg-amber-300/25 blur-2xl animate-pulse"
        style={{ animationDelay: "0.6s" }}
      />

      {/* Subtle Right -> Left Target-Language Flag Wash behind Trophy */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-[62%] overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(to left, rgba(0,0,0,0.26) 0%, rgba(0,0,0,0.10) 48%, transparent 88%)",
          WebkitMaskImage:
            "linear-gradient(to left, rgba(0,0,0,0.26) 0%, rgba(0,0,0,0.10) 48%, transparent 88%)",
        }}
      >
        <div className="flex h-full w-full -skew-x-12 scale-125">
          <div
            className="h-full flex-1"
            style={{ backgroundColor: flagBands[0] }}
          />
          <div
            className="h-full flex-1"
            style={{ backgroundColor: flagBands[1] }}
          />
          <div
            className="h-full flex-1"
            style={{ backgroundColor: flagBands[2] }}
          />
        </div>
      </div>

      {/* Right-Anchored Conversational Vectors & Glitter Stars (Never collides with left text on mobile!) */}
      <svg
        aria-hidden="true"
        viewBox="0 0 320 220"
        className="pointer-events-none absolute inset-y-0 right-0 h-full w-[58%] sm:w-[55%]"
        fill="none"
      >
        {/* Conversational Speech Bubble Vector 1 */}
        <g className="animate-pulse" style={{ animationDuration: "3.2s" }}>
          <rect
            x="24"
            y="14"
            width="74"
            height="38"
            rx="13"
            fill="white"
            fillOpacity="0.11"
            stroke="white"
            strokeOpacity="0.24"
            strokeWidth="1.5"
          />
          <path d="M42 52L34 62L52 52H42Z" fill="white" fillOpacity="0.11" />
          <rect
            x="40"
            y="28"
            width="3.5"
            height="10"
            rx="1.75"
            fill="#FDE047"
            fillOpacity="0.7"
          />
          <rect
            x="48"
            y="23"
            width="3.5"
            height="20"
            rx="1.75"
            fill="#38BDF8"
            fillOpacity="0.8"
          />
          <rect
            x="56"
            y="26"
            width="3.5"
            height="14"
            rx="1.75"
            fill="#4ADE80"
            fillOpacity="0.8"
          />
          <rect
            x="64"
            y="21"
            width="3.5"
            height="24"
            rx="1.75"
            fill="#F472B6"
            fillOpacity="0.75"
          />
          <rect
            x="72"
            y="27"
            width="3.5"
            height="12"
            rx="1.75"
            fill="#FDE047"
            fillOpacity="0.7"
          />
        </g>

        {/* Conversational Speech Bubble Vector 2 */}
        <g
          className="animate-pulse"
          style={{
            animationDuration: "4s",
            animationDelay: "1.1s",
          }}
        >
          <rect
            x="54"
            y="108"
            width="58"
            height="30"
            rx="11"
            fill="#38BDF8"
            fillOpacity="0.14"
            stroke="#7DD3FC"
            strokeOpacity="0.3"
            strokeWidth="1.5"
          />
          <circle cx="71" cy="123" r="3" fill="#FDE047" fillOpacity="0.75" />
          <circle cx="83" cy="123" r="3" fill="#4ADE80" fillOpacity="0.75" />
          <circle cx="95" cy="123" r="3" fill="#F472B6" fillOpacity="0.75" />
        </g>

        {/* Phasing Sound Rings behind Trophy */}
        <circle
          cx="225"
          cy="92"
          r="74"
          stroke="white"
          strokeOpacity="0.14"
          strokeWidth="1.5"
          strokeDasharray="7 7"
        />
        <circle
          cx="225"
          cy="92"
          r="98"
          stroke="#38BDF8"
          strokeOpacity="0.16"
          strokeWidth="1.5"
        />

        {/* 4-Point Glitter Stars */}
        <path
          d="M135 20L137 26L143 28L137 30L135 36L133 30L127 28L133 26L135 20Z"
          fill="#FDE047"
          fillOpacity="0.9"
          className="animate-pulse"
        />
        <path
          d="M36 82L37.5 86.5L42 88L37.5 89.5L36 94L34.5 89.5L30 88L34.5 86.5L36 82Z"
          fill="#F472B6"
          fillOpacity="0.85"
          className="animate-pulse"
          style={{ animationDelay: "1.3s" }}
        />
        <path
          d="M286 24L288 30L294 32L288 34L286 40L284 34L278 32L284 30L286 24Z"
          fill="#67E8F9"
          fillOpacity="0.9"
          className="animate-pulse"
          style={{ animationDelay: "0.6s" }}
        />
      </svg>

      <div className="relative z-10 flex flex-col gap-3">
        {/* Top Row: Left Info + Right 3D Trophy */}
        <div className="flex items-center justify-between gap-2 sm:gap-5">
          <div className="min-w-0 flex-1 space-y-2 text-left sm:space-y-2.5">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.25)] sm:text-4xl">
                Milestone {languageCard.currentMilestone}
              </h2>
              <p className="mt-0.5 text-xs font-bold text-sky-100">
                Next Unlock:{" "}
                <span className="font-black text-amber-300 drop-shadow-2xs">
                  🎁 {upcoming.nextBossReward}
                </span>
              </p>
            </div>

            {/* 4-Node Progress Track */}
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center gap-2">
                {[1, 2, 3].map((stepIdx) => {
                  const isStepDone =
                    isBossFocus || languageCard.spoonsInCurrentCycle >= stepIdx;
                  const isStepCurrent =
                    !isBossFocus &&
                    languageCard.spoonsInCurrentCycle + 1 === stepIdx;
                  return (
                    <div
                      key={stepIdx}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg border-b-2 text-[11px] font-black transition-all ${
                        isStepDone
                          ? "border-emerald-700 bg-gradient-to-b from-emerald-300 to-emerald-500 text-slate-950 shadow-sm"
                          : isStepCurrent
                            ? "border-amber-700 bg-gradient-to-b from-amber-300 to-orange-400 text-slate-950 ring-2 ring-white/70"
                            : "border-white/20 bg-white/15 text-white/70 backdrop-blur-xs"
                      }`}
                    >
                      {isStepDone ? (
                        <Check className="h-3.5 w-3.5 stroke-[3.5]" />
                      ) : (
                        stepIdx
                      )}
                    </div>
                  );
                })}

                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg border-b-2 ${
                    isBossFocus && !isConvoGate
                      ? "border-amber-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950 animate-bounce shadow-md"
                      : "border-white/25 bg-white/15 text-amber-300 backdrop-blur-xs"
                  }`}
                >
                  <Crown className="h-3.5 w-3.5 fill-current" />
                </div>
              </div>

              <p className="text-[11px] sm:text-xs font-extrabold text-amber-200 drop-shadow-2xs">
                {isConvoGate
                  ? `🔒 Complete 1 3-Min AI Chat to Unlock Boss ${languageCard.currentMilestone}`
                  : isBossFocus
                    ? `⚡ Boss Stage ${languageCard.currentMilestone} Unlocked!`
                    : `${languageCard.spoonsInCurrentCycle} / 3 Spoons to Boss ${languageCard.currentMilestone}`}
              </p>
            </div>
          </div>

          {/* Dynamic Engraved Milestone Trophy Illustration */}
          <div className="-mr-2 shrink-0">
            <HeroTrophyIllustration milestone={languageCard.currentMilestone} />
          </div>
        </div>

        {/* Bottom Action CTA */}
        <div className="flex items-center justify-start pt-0.5">
          <Link
            href={upcoming.href}
            className={`inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border-b-4 px-5 py-3 text-xs sm:px-6 sm:text-sm font-black shadow-xl transition-all duration-150 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0 ${cta3DStyle}`}
          >
            {isConvoGate ? (
              <Mic className="h-4 w-4 shrink-0" />
            ) : (
              <Sparkles className="h-4 w-4 shrink-0" />
            )}
            <span className="opacity-85">Up Next:</span>
            <span className="truncate max-w-[190px] sm:max-w-xs">
              {isConvoGate ? upcoming.ctaLabel : upcoming.title}
            </span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </Link>
        </div>
      </div>
    </div>
  );
}