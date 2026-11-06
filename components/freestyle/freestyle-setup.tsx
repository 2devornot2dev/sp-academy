// components/freestyle/freestyle-setup.tsx
"use client";

import { Fragment, useState } from "react";
import {
  Settings2,
  Play,
  Sparkles,
  Globe2,
  BarChart3,
  Mic,
  Check,
  ArrowLeft,
  ArrowRight,
  MessageSquarePlus,
  Loader2,
  Timer,
  MessagesSquare,
  ShieldCheck,
  Compass,
} from "lucide-react";

const MODES = [
  {
    id: "INTRODUCTION",
    label: "Introduction",
    tagline: "First impressions, greetings & small talk",
    preview:
      "Warm icebreakers: introduce yourself, where you're from, and your interests.",
    icon: "👋",
    active3D:
      "border-blue-700 bg-gradient-to-b from-sky-50/90 to-white ring-2 ring-sky-400/40",
    icon3D:
      "border-b-[3px] border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white",
  },
  {
    id: "RANDOM",
    label: "Surprise Me",
    tagline: "Spontaneous everyday real-world situations",
    preview:
      "Your AI partner will drop you into a surprise café, travel, or street scenario!",
    icon: "🎲",
    active3D:
      "border-purple-700 bg-gradient-to-b from-purple-50/90 to-white ring-2 ring-purple-400/40",
    icon3D:
      "border-b-[3px] border-purple-900 bg-gradient-to-b from-violet-500 to-purple-700 text-white",
  },
  {
    id: "SPECIFIC",
    label: "Custom Topic",
    tagline: "Roleplay any custom scenario you want",
    preview: "Type any real-world scenario or pick a quick topic below.",
    icon: "🎯",
    active3D:
      "border-orange-700 bg-gradient-to-b from-amber-50/90 to-white ring-2 ring-amber-400/40",
    icon3D:
      "border-b-[3px] border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950",
  },
  {
    id: "ARGUMENTATIVE",
    label: "Friendly Debate",
    tagline: "Defend your opinion & practice persuading",
    preview:
      "Take a stance on a fun everyday topic and persuade your AI partner.",
    icon: "⚖️",
    active3D:
      "border-emerald-700 bg-gradient-to-b from-emerald-50/90 to-white ring-2 ring-emerald-400/40",
    icon3D:
      "border-b-[3px] border-emerald-700 bg-gradient-to-b from-teal-400 to-emerald-600 text-white",
  },
];

const LEVELS = [
  {
    id: "ZERO",
    label: "Zero",
    badge: "A0 Starter",
    desc: "Ultra-short phrases & patient hints",
    activeClass:
      "border-blue-700 bg-gradient-to-b from-sky-50 to-white text-sky-950 ring-2 ring-sky-400/40",
    badgeClass:
      "border-b-2 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white",
  },
  {
    id: "EASY",
    label: "Easy",
    badge: "A1–A2",
    desc: "Simple vocabulary, slow & clear pace",
    activeClass:
      "border-emerald-700 bg-gradient-to-b from-emerald-50 to-white text-emerald-950 ring-2 ring-emerald-400/40",
    badgeClass:
      "border-b-2 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white",
  },
  {
    id: "MEDIUM",
    label: "Medium",
    badge: "B1–B2",
    desc: "Natural cadence & everyday idioms",
    activeClass:
      "border-orange-700 bg-gradient-to-b from-amber-50 to-white text-amber-950 ring-2 ring-amber-400/40",
    badgeClass:
      "border-b-2 border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950",
  },
  {
    id: "FLUENT",
    label: "Fluent",
    badge: "C1+",
    desc: "Native speed & complex topics",
    activeClass:
      "border-purple-800 bg-gradient-to-b from-purple-50 to-white text-purple-950 ring-2 ring-purple-400/40",
    badgeClass:
      "border-b-2 border-purple-950 bg-gradient-to-b from-violet-500 to-purple-700 text-white",
  },
] as const;

const PERSONAS = [
  {
    id: "FRIENDLY",
    label: "Friendly",
    icon: "😊",
    desc: "Warm, patient and encouraging",
  },
  {
    id: "COACH",
    label: "Coach",
    icon: "💪",
    desc: "Pushes you and corrects often",
  },
  {
    id: "LOCAL",
    label: "Local",
    icon: "🧢",
    desc: "Casual slang and everyday phrasing",
  },
  {
    id: "PRO",
    label: "Pro",
    icon: "💼",
    desc: "Polished, formal and business-ready",
  },
] as const;

const SUPPORTED_LANGUAGES = [
  { code: "en-US", label: "English (US)", flag: "🇺🇸" },
  { code: "fr-FR", label: "French", flag: "🇫🇷" },
  { code: "es-ES", label: "Spanish", flag: "🇪🇸" },
  { code: "de-DE", label: "German", flag: "🇩🇪" },
  { code: "it-IT", label: "Italian", flag: "🇮🇹" },
];

const QUICK_TOPICS = [
  "Ordering coffee at a Parisian café",
  "Asking directions to the metro",
  "Meeting a new neighbor",
  "Checking into a boutique hotel",
  "Shopping for a jacket",
];

const STEPS = [
  { id: 1, label: "Conversation Type", icon: Settings2 },
  { id: 2, label: "Difficulty Tier", icon: BarChart3 },
] as const;

function normalizeLangCode(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback;
  const upper = raw.toUpperCase();
  if (upper === "ENGLISH" || upper === "EN" || upper === "EN-US") return "en-US";
  if (upper === "FRENCH" || upper === "FR" || upper === "FR-FR") return "fr-FR";
  if (upper === "SPANISH" || upper === "ES" || upper === "ES-ES") return "es-ES";
  if (upper === "GERMAN" || upper === "DE" || upper === "DE-DE") return "de-DE";
  if (upper === "ITALIAN" || upper === "IT" || upper === "IT-IT") return "it-IT";
  return SUPPORTED_LANGUAGES.some((l) => l.code === raw) ? raw : fallback;
}

export default function FreestyleSetup({
  onStart,
  defaultNative = "en-US",
  defaultTarget = "fr-FR",
}: any) {
  const [step, setStep] = useState<1 | 2>(1);
  const [mode, setMode] = useState("RANDOM");
  const [level, setLevel] = useState<"ZERO" | "EASY" | "MEDIUM" | "FLUENT">(
    "ZERO"
  );
  const [topic, setTopic] = useState("");
  const [voiceGender, setVoiceGender] = useState<"male" | "female">("female");
  const [persona, setPersona] = useState<
    "FRIENDLY" | "COACH" | "LOCAL" | "PRO"
  >("FRIENDLY");
  const [nativeLang, setNativeLang] = useState(() =>
    normalizeLangCode(defaultNative, "en-US")
  );
  const [targetLang, setTargetLang] = useState(() =>
    normalizeLangCode(defaultTarget, "fr-FR")
  );
  const [isStarting, setIsStarting] = useState(false);

  const selectedModeObj = MODES.find((m) => m.id === mode) ?? MODES[1];
  const selectedLevelObj = LEVELS.find((l) => l.id === level) ?? LEVELS[0];
  const selectedPersonaObj =
    PERSONAS.find((p) => p.id === persona) ?? PERSONAS[0];
  const targetLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === targetLang) ??
    SUPPORTED_LANGUAGES[1];
  const nativeLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === nativeLang) ??
    SUPPORTED_LANGUAGES[0];

  const step1Valid = !(mode === "SPECIFIC" && !topic.trim());

  const previewAvatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${
    voiceGender === "female" ? "Sophie" : "Antoine"
  }&backgroundColor=b6e3f4,c0aede,d1d4f9`;

  const handleStart = async () => {
    const silentAudio = new Audio("data:audio/mp3;base64,//MkxAA...");
    silentAudio.play().catch(() => {});

    setIsStarting(true);
    await onStart({
      mode,
      level,
      persona,
      topic: mode === "SPECIFIC" ? topic : undefined,
      nativeLanguage: nativeLang,
      targetLanguage: targetLang,
      voiceGender,
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-100/80 font-sans text-slate-900 selection:bg-indigo-100 lg:h-screen lg:overflow-hidden">
      {/* =====================================================================
          1. HEADER BANNER
          ===================================================================== */}
      <header className="relative shrink-0 overflow-hidden animate-bg pt-6 pb-16 text-white shadow-lg">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/15 to-slate-950/35 backdrop-blur-[2px]" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[850px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-slate-950/35 px-4 py-1 text-xs font-semibold tracking-wide text-white shadow-sm backdrop-blur-md">
              <Globe2 className="h-3.5 w-3.5 text-cyan-300" />
              <span>
                Practicing{" "}
                <strong className="font-extrabold text-white uppercase">
                  {targetLangObj.label}
                </strong>{" "}
                <span className="text-white/75">
                  from{" "}
                  <span className="font-bold text-white">
                    {nativeLangObj.label}
                  </span>
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/35 px-3 py-1 text-xs font-extrabold text-amber-300 shadow-sm backdrop-blur-md">
                <Timer className="h-3.5 w-3.5 text-amber-400" />
                <span>5-Min Unscripted Arena</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/35 px-3 py-1 text-xs font-extrabold text-emerald-300 shadow-sm backdrop-blur-md">
                <Mic className="h-3.5 w-3.5 text-emerald-400" />
                <span>Live AI Speech Feedback</span>
              </div>
            </div>
          </div>

          <div className="max-w-3xl">
            <h1 className="flex items-center gap-3 text-2xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.22)] sm:text-3xl md:text-4xl">
              <span>Freestyle Conversation Arena</span>
              <MessagesSquare className="h-7 w-7 text-white/90 sm:h-9 sm:w-9" />
            </h1>
            <p className="mt-1 text-sm font-medium text-white/90 drop-shadow-[0_1px_4px_rgba(15,23,42,0.18)] sm:text-base">
              No scripts. No safety nets. Customize your AI partner below and
              jump into a live 5-minute speaking session.
            </p>
          </div>
        </div>
      </header>

      {/* =====================================================================
          2. MAIN STAGE GRID
          ===================================================================== */}
      <main className="relative z-20 mx-auto -mt-10 flex min-h-0 w-full max-w-7xl flex-1 px-6 pb-5 lg:px-8">
        <div className="grid h-full min-h-0 w-full grid-cols-1 gap-6 lg:grid-cols-12">
          {/* LEFT COLUMN (8 Cols) */}
          <div className="flex min-h-0 flex-col gap-5 lg:col-span-8">
            {/* ===============================================================
                CARD 1: 3D HERO ARENA CARD (THE SINGLE PRIMARY LAUNCH CTA!)
                =============================================================== */}
            <div className="group relative shrink-0 overflow-hidden rounded-3xl border-2 border-b-[6px] border-indigo-950/90 bg-slate-950 text-white shadow-xl">
              <img
                src="/freestyle-cover.png"
                alt="Freestyle Arena"
                className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-45 transition-transform duration-700 group-hover:scale-105"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-indigo-950/45" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/30" />

              <div className="relative z-10 p-6 sm:px-7">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/35 bg-indigo-500/20 px-3 py-1 text-[11px] font-black tracking-wide text-indigo-200 uppercase backdrop-blur-md">
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                    Freestyle Speaking Mode
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/80 px-3 py-1 text-xs font-extrabold text-slate-200 backdrop-blur-md">
                    <span>
                      {selectedModeObj.icon} {selectedModeObj.label}
                    </span>
                    <span className="text-white/30">•</span>
                    <span className="text-emerald-300">
                      {selectedLevelObj.label} ({selectedLevelObj.badge})
                    </span>
                  </span>
                </div>

                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="relative shrink-0">
                    <div className="h-20 w-20 overflow-hidden rounded-2xl border-2 border-b-4 border-indigo-400/80 bg-slate-900 shadow-lg shadow-indigo-500/25">
                      <img
                        src={previewAvatarUrl}
                        alt="AI Tutor Avatar"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span className="absolute -right-1.5 -bottom-1.5 rounded-full border-b-2 border-emerald-700 bg-emerald-400 px-2 py-0.5 text-[9px] font-black tracking-wider text-slate-950 uppercase shadow">
                      Ready
                    </span>
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <span className="text-[11px] font-black tracking-wider text-sky-300 uppercase">
                      Your AI Conversation Partner
                    </span>
                    <h2 className="truncate text-2xl font-black tracking-tight text-white sm:text-3xl">
                      {voiceGender === "female" ? "Sophie" : "Antoine"} —{" "}
                      {selectedPersonaObj.icon} {selectedPersonaObj.label} Tutor
                    </h2>
                    <p className="line-clamp-1 max-w-xl text-xs sm:text-sm font-medium text-slate-300">
                      {mode === "SPECIFIC" && topic
                        ? `Custom Scenario: "${topic}"`
                        : `${selectedModeObj.tagline}. Adapts dynamically to your ${selectedLevelObj.label.toLowerCase()} level in ${targetLangObj.label}.`}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>
                      Includes full grammar, vocab &amp; pronunciation report
                    </span>
                  </div>

                  {/* THE ONLY LAUNCH BUTTON ON THE PAGE */}
                  <button
                    type="button"
                    onClick={handleStart}
                    disabled={isStarting || !step1Valid}
                    className="inline-flex items-center gap-2.5 rounded-2xl border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 px-7 py-3.5 text-xs sm:text-sm font-black text-white shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:border-b-0 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {isStarting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Preparing Arena...</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 fill-current" />
                        <span>Start 5-Minute Session</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* ===============================================================
                CARD 2: 3D STEPPER CARD (Configuration Only — No Duplicate Launch Button)
                =============================================================== */}
            <div className="flex min-h-0 flex-1 flex-col justify-between overflow-hidden rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white shadow-sm">
              {/* Top 3D Stepper Header */}
              <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-6 py-3.5">
                {STEPS.map((s, i) => {
                  const done = step > s.id;
                  const active = step === s.id;
                  const canGo = s.id === 1 || step1Valid;
                  const Icon = s.icon;
                  return (
                    <Fragment key={s.id}>
                      <button
                        type="button"
                        disabled={!canGo || isStarting}
                        onClick={() => setStep(s.id)}
                        className="flex items-center gap-2.5 text-left disabled:cursor-not-allowed"
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-b-[3px] text-xs font-black transition-all ${
                            done
                              ? "border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white"
                              : active
                                ? "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-xs"
                                : "border-slate-300 bg-slate-100 text-slate-400"
                          }`}
                        >
                          {done ? (
                            <Check className="h-4 w-4 stroke-[3.5]" />
                          ) : (
                            s.id
                          )}
                        </span>
                        <span className="leading-tight">
                          <span
                            className={`flex items-center gap-1.5 text-xs font-black tracking-wider uppercase ${
                              active || done
                                ? "text-slate-800"
                                : "text-slate-400"
                            }`}
                          >
                            <Icon
                              className={`h-3.5 w-3.5 ${
                                s.id === 1
                                  ? "text-blue-600"
                                  : "text-emerald-600"
                              }`}
                            />
                            {s.label}
                          </span>
                        </span>
                      </button>
                      {i < STEPS.length - 1 && (
                        <div
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            step > 1
                              ? "bg-gradient-to-r from-emerald-400 to-sky-500"
                              : "bg-slate-100"
                          }`}
                        />
                      )}
                    </Fragment>
                  );
                })}
              </div>

              {/* Step Body */}
              <div className="flex min-h-0 flex-1 flex-col justify-between px-6 py-4">
                {step === 1 ? (
                  <div className="flex h-full flex-col justify-between gap-3">
                    {/* 4 Tactile 3D Mode Cards */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {MODES.map((m) => {
                        const isSelected = mode === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setMode(m.id)}
                            className={`group relative flex flex-col items-start justify-between rounded-2xl border-2 border-b-[5px] p-3.5 text-left transition-all duration-150 ${
                              isSelected
                                ? `${m.active3D} -translate-y-0.5 shadow-sm`
                                : "border-slate-200/90 border-b-slate-300 bg-white hover:-translate-y-0.5 hover:border-sky-300 active:translate-y-0.5 active:border-b-2"
                            }`}
                          >
                            <div className="flex w-full items-center justify-between">
                              <span
                                className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl shadow-2xs transition-all ${
                                  isSelected
                                    ? m.icon3D
                                    : "border-b-2 border-slate-200 bg-slate-50"
                                }`}
                              >
                                {m.icon}
                              </span>

                              {isSelected && (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xs">
                                  <Check className="h-3 w-3 stroke-[3.5]" />
                                </span>
                              )}
                            </div>

                            <div className="mt-2.5">
                              <span className="block text-xs sm:text-sm font-black text-slate-900">
                                {m.label}
                              </span>
                              <p className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-snug text-slate-500">
                                {m.tagline}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Fixed-Height Scenario Dock (h-[84px]) */}
                    <div className="flex h-[84px] shrink-0 flex-col justify-center rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-2.5">
                      {mode === "SPECIFIC" ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <MessageSquarePlus className="h-4 w-4 shrink-0 text-amber-600" />
                            <input
                              type="text"
                              placeholder="Type custom scenario (e.g., Returning shoes at a store)..."
                              value={topic}
                              onChange={(e) => setTopic(e.target.value)}
                              className="h-8 flex-1 rounded-xl border border-amber-300 bg-white px-3 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none"
                            />
                          </div>

                          <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                            <span className="shrink-0 text-[10px] font-black tracking-wider text-slate-400 uppercase">
                              Ideas:
                            </span>
                            {QUICK_TOPICS.map((suggestion) => (
                              <button
                                key={suggestion}
                                type="button"
                                onClick={() => setTopic(suggestion)}
                                className={`shrink-0 rounded-lg border-b-2 px-2.5 py-0.5 text-[11px] font-extrabold whitespace-nowrap transition ${
                                  topic === suggestion
                                    ? "border-orange-700 bg-amber-400 text-slate-950"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:bg-amber-50"
                                }`}
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-b-2 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-2xs">
                              <Compass className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-black tracking-wider text-blue-600 uppercase">
                                {selectedModeObj.label} Scenario Briefing
                              </p>
                              <p className="truncate text-xs sm:text-sm font-bold text-slate-700">
                                {selectedModeObj.preview}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setMode("SPECIFIC")}
                            className="hidden sm:inline-flex shrink-0 items-center gap-1.5 rounded-xl border-2 border-b-[3px] border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-700 transition hover:border-amber-300 hover:bg-amber-50"
                          >
                            <span>🎯 Or Pick Custom Topic</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* STEP 2: 4 Tactile 3D Difficulty Cards */
                  <div className="my-auto grid grid-cols-2 gap-3.5 sm:grid-cols-4">
                    {LEVELS.map((l) => {
                      const isSelected = level === l.id;
                      return (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => setLevel(l.id)}
                          className={`flex flex-col justify-between rounded-2xl border-2 border-b-[5px] p-4 text-left transition-all duration-150 ${
                            isSelected
                              ? `${l.activeClass} -translate-y-0.5 shadow-sm`
                              : "border-slate-200/90 border-b-slate-300 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-sky-300 active:translate-y-0.5 active:border-b-2"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-black uppercase ${l.badgeClass}`}
                              >
                                {l.badge}
                              </span>
                              {isSelected && (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                                  <Check className="h-3 w-3 stroke-[3.5]" />
                                </span>
                              )}
                            </div>
                            <h3 className="mt-3 text-base font-black">
                              {l.label}
                            </h3>
                          </div>
                          <p className="mt-1.5 text-xs font-medium leading-snug text-slate-500">
                            {l.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step Footer (Only Step Navigation — No Competing Launch Button!) */}
              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-3">
                {step === 1 ? (
                  <span className="text-xs font-extrabold text-slate-400">
                    Step 1 of 2 • Choose Conversation Type
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={isStarting}
                    className="inline-flex items-center gap-1.5 rounded-xl border-2 border-b-[3px] border-slate-200 bg-white px-3.5 py-1.5 text-xs font-black text-slate-700 transition hover:bg-slate-50 active:translate-y-0.5 active:border-b-0 disabled:opacity-50"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to Modes</span>
                  </button>
                )}

                {step === 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={!step1Valid}
                    className="inline-flex items-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-5 py-2 text-xs font-black text-white shadow-sm transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0 disabled:pointer-events-none disabled:border-b-0 disabled:bg-slate-200 disabled:from-transparent disabled:to-transparent disabled:text-slate-400"
                  >
                    <span>Next: Difficulty</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                    <span>Ready — Click Start Above</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* =================================================================
              RIGHT COLUMN (4 Cols): 3D SESSION PREFERENCES CARD (No Duplicate Button!)
              ================================================================= */}
          <div className="flex min-h-0 flex-col lg:col-span-4">
            <div className="flex flex-1 flex-col justify-between overflow-y-auto rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-5 sm:p-6 shadow-sm">
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Session Preferences
                  </h3>
                  <p className="mt-0.5 text-xs font-medium text-slate-500">
                    Customize your AI tutor&apos;s voice, persona, and languages.
                  </p>
                </div>

                {/* 1. 3D Voice Gender Toggle */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
                    AI Tutor Voice
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {(["female", "male"] as const).map((gender) => {
                      const active = voiceGender === gender;
                      return (
                        <button
                          key={gender}
                          type="button"
                          onClick={() => setVoiceGender(gender)}
                          className={`flex items-center justify-center gap-2 rounded-2xl border-2 border-b-4 py-3 text-xs font-black capitalize transition-all duration-150 ${
                            active
                              ? "border-blue-700 bg-gradient-to-b from-sky-50 to-white text-blue-700 shadow-2xs"
                              : "border-slate-200 border-b-slate-300 bg-slate-50/60 text-slate-600 hover:bg-white"
                          }`}
                        >
                          <span className="text-base">
                            {gender === "female" ? "👩" : "👨"}
                          </span>
                          <span>{gender} Voice</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. 3D Tutor Persona Selector */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
                      Tutor Persona
                    </label>
                    <span className="text-[10px] font-bold text-blue-600">
                      {selectedPersonaObj.desc}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {PERSONAS.map((p) => {
                      const active = persona === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPersona(p.id)}
                          title={p.desc}
                          className={`flex flex-col items-center gap-1 rounded-2xl border-2 border-b-4 py-2.5 text-[11px] font-black transition-all duration-150 ${
                            active
                              ? "border-blue-700 bg-gradient-to-b from-sky-50 to-white text-blue-700 shadow-2xs"
                              : "border-slate-200 border-b-slate-300 bg-slate-50/60 text-slate-600 hover:bg-white"
                          }`}
                        >
                          <span className="text-base leading-none">
                            {p.icon}
                          </span>
                          <span>{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. 3D Language Selectors */}
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-[10px] font-black tracking-wider text-slate-400 uppercase">
                      <Globe2 className="h-3 w-3 text-blue-500" /> Practicing
                    </label>
                    <select
                      value={targetLang}
                      onChange={(e) => setTargetLang(e.target.value)}
                      className="w-full cursor-pointer rounded-2xl border-2 border-b-4 border-sky-200 border-b-sky-300 bg-sky-50/40 px-3.5 py-2.5 text-xs font-black text-slate-900 transition focus:border-blue-600 focus:bg-white focus:outline-none"
                    >
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.flag} {lang.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-[10px] font-black tracking-wider text-slate-400 uppercase">
                      <Globe2 className="h-3 w-3 text-slate-400" /> Translations
                    </label>
                    <select
                      value={nativeLang}
                      onChange={(e) => setNativeLang(e.target.value)}
                      className="w-full cursor-pointer rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs font-black text-slate-700 transition focus:border-blue-600 focus:bg-white focus:outline-none"
                    >
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.flag} {lang.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 4. Bottom Live Configuration Summary Card */}
              <div className="mt-5 space-y-2 rounded-2xl border-2 border-slate-200/80 bg-slate-50/80 p-4 text-xs">
                <div className="mb-1 flex items-center justify-between border-b border-slate-200/70 pb-2">
                  <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
                    Active Arena Config
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 uppercase">
                    <span className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-500" />
                    5 Min Live
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-400">Mode</span>
                  <span className="font-black text-slate-800">
                    {selectedModeObj.icon} {selectedModeObj.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-400">Level</span>
                  <span className="font-black text-slate-800">
                    {selectedLevelObj.label} ({selectedLevelObj.badge})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-400">Tutor</span>
                  <span className="font-black text-slate-800">
                    {voiceGender === "female" ? "Sophie" : "Antoine"} (
                    {selectedPersonaObj.icon} {selectedPersonaObj.label})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}