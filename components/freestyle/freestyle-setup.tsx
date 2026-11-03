"use client";

import { useState } from "react";
import {
  Settings2,
  Play,
  Sparkles,
  Globe2,
  BarChart3,
  Mic,
  CheckCircle2,
  Volume2,
  MessageSquarePlus,
  Loader2,
  Timer,
  MessagesSquare,
  ShieldCheck,
} from "lucide-react";

const MODES = [
  {
    id: "INTRODUCTION",
    label: "Introduction",
    tagline: "First impressions, greetings & small talk",
    icon: "👋",
  },
  {
    id: "RANDOM",
    label: "Surprise Me",
    tagline: "Spontaneous everyday real-world situations",
    icon: "🎲",
  },
  {
    id: "SPECIFIC",
    label: "Custom Topic",
    tagline: "Roleplay any custom scenario you want",
    icon: "🎯",
  },
  {
    id: "ARGUMENTATIVE",
    label: "Friendly Debate",
    tagline: "Defend your opinion & practice persuading",
    icon: "⚖️",
  },
];

const LEVELS = [
  {
    id: "ZERO",
    label: "Zero",
    badge: "A0 Starter",
    desc: "Ultra-short phrases & patient hints",
    activeClass:
      "border-sky-500 bg-sky-50/70 ring-2 ring-sky-500/15 text-sky-950",
    badgeClass: "bg-sky-100 text-sky-700",
    dotClass: "bg-sky-500",
  },
  {
    id: "EASY",
    label: "Easy",
    badge: "A1–A2",
    desc: "Simple vocabulary, slow & clear pace",
    activeClass:
      "border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/15 text-emerald-950",
    badgeClass: "bg-emerald-100 text-emerald-700",
    dotClass: "bg-emerald-500",
  },
  {
    id: "MEDIUM",
    label: "Medium",
    badge: "B1–B2",
    desc: "Natural cadence & everyday idioms",
    activeClass:
      "border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/15 text-amber-950",
    badgeClass: "bg-amber-100 text-amber-800",
    dotClass: "bg-amber-500",
  },
  {
    id: "FLUENT",
    label: "Fluent",
    badge: "C1+",
    desc: "Native speed & complex topics",
    activeClass:
      "border-rose-500 bg-rose-50/70 ring-2 ring-rose-500/15 text-rose-950",
    badgeClass: "bg-rose-100 text-rose-700",
    dotClass: "bg-rose-500",
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
  "Ordering coffee & pastries at a Parisian café",
  "Asking a local for directions to the metro",
  "Introducing yourself to a new neighbor",
  "Checking into a boutique hotel",
  "Returning an item at a clothing shop",
];

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
  const [mode, setMode] = useState("RANDOM");
  const [level, setLevel] = useState<"ZERO" | "EASY" | "MEDIUM" | "FLUENT">(
    "ZERO"
  );
  const [topic, setTopic] = useState("");
  const [voiceGender, setVoiceGender] = useState<"male" | "female">("female");
  const [nativeLang, setNativeLang] = useState(() =>
    normalizeLangCode(defaultNative, "en-US")
  );
  const [targetLang, setTargetLang] = useState(() =>
    normalizeLangCode(defaultTarget, "fr-FR")
  );
  const [isStarting, setIsStarting] = useState(false);

  const selectedModeObj = MODES.find((m) => m.id === mode) ?? MODES[1];
  const selectedLevelObj = LEVELS.find((l) => l.id === level) ?? LEVELS[0];
  const targetLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === targetLang) ??
    SUPPORTED_LANGUAGES[1];
  const nativeLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === nativeLang) ??
    SUPPORTED_LANGUAGES[0];

  // Valid Dicebear v7 URL that renders a clean character avatar
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
      topic: mode === "SPECIFIC" ? topic : undefined,
      nativeLanguage: nativeLang,
      targetLanguage: targetLang,
      voiceGender,
    });
  };

  return (
    <div className="min-h-screen bg-slate-100/80 font-sans text-slate-900">
      {/* 1. SPOON HEADER BANNER (Matches Learning Hub Header) */}
      <header className="relative shrink-0 overflow-hidden animate-bg pt-6 pb-16 text-white shadow-lg">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/15 to-slate-950/35 backdrop-blur-[2px]" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[850px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
          {/* Top Frosted Glass Pills */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-slate-950/35 px-4 py-1.5 text-xs font-semibold tracking-wide text-white shadow-sm backdrop-blur-md">
              <Globe2 className="h-4 w-4 text-cyan-300" />
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

            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/35 px-3.5 py-1.5 text-xs font-extrabold text-amber-300 shadow-sm backdrop-blur-md">
                <Timer className="h-4 w-4 text-amber-400" />
                <span>5-Min Unscripted Arena</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/35 px-3.5 py-1.5 text-xs font-extrabold text-emerald-300 shadow-sm backdrop-blur-md">
                <Mic className="h-4 w-4 text-emerald-400" />
                <span>Live AI Speech Feedback</span>
              </div>
            </div>
          </div>

          <div className="max-w-3xl">
            <h1 className="flex items-center gap-3 font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.22)] text-2xl sm:text-3xl md:text-4xl">
              <span>Freestyle Conversation Arena</span>
              <MessagesSquare className="h-8 w-8 text-white/90 sm:h-10 sm:w-10" />
            </h1>
            <p className="mt-2.5 text-base font-medium text-white/90 drop-shadow-[0_1px_4px_rgba(15,23,42,0.18)] sm:text-lg">
              No scripts. No safety nets. Customize your AI partner below and
              jump into a live 5-minute speaking session.
            </p>
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTENT CONTAINER (Overlaps Header by -mt-12 just like Learning Hub) */}
      <main className="relative z-20 mx-auto -mt-12 max-w-7xl px-6 pb-24 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          {/* LEFT COLUMN (8 COLS): Hero Banner + Mode & Difficulty Selectors */}
          <div className="flex flex-col gap-7 lg:col-span-8">
            {/* CINEMATIC HERO CARD WITH /freestyle-cover.png + AVATAR */}
            <div className="group relative overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl shadow-indigo-950/15">
              {/* Cover Image Background */}
              <img
                src="/freestyle-cover.png"
                alt="Freestyle Arena"
                className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-45 transition-transform duration-700 group-hover:scale-105"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-indigo-950/45" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/30" />

              <div className="relative z-10 p-7 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/35 bg-indigo-500/20 px-3.5 py-1 text-xs font-extrabold tracking-wide text-indigo-200 uppercase backdrop-blur-md">
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                    Freestyle Speaking Mode
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/75 px-3 py-1 text-xs font-bold text-slate-200 backdrop-blur-md">
                    <span>{selectedModeObj.icon} {selectedModeObj.label}</span>
                    <span className="text-white/30">•</span>
                    <span className="text-emerald-300">
                      {selectedLevelObj.label} ({selectedLevelObj.badge})
                    </span>
                  </span>
                </div>

                {/* Partner Avatar + Hero Info */}
                <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
                  <div className="relative shrink-0">
                    <div className="h-22 w-22 overflow-hidden rounded-2xl border-2 border-indigo-400/70 bg-slate-900 shadow-lg shadow-indigo-500/25 sm:h-24 sm:w-24">
                      <img
                        src={previewAvatarUrl}
                        alt="AI Tutor Avatar"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span className="absolute -right-1.5 -bottom-1.5 rounded-full bg-emerald-400 px-2 py-0.5 text-[10px] font-black tracking-wider text-slate-950 uppercase shadow">
                      Ready
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-extrabold tracking-wider text-indigo-300 uppercase">
                      Your AI Conversation Partner
                    </span>
                    <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                      {voiceGender === "female"
                        ? "Sophie — Friendly AI Tutor"
                        : "Antoine — Friendly AI Tutor"}
                    </h2>
                    <p className="max-w-xl text-sm leading-relaxed text-slate-300">
                      {mode === "SPECIFIC" && topic
                        ? `Scenario: "${topic}"`
                        : `${selectedModeObj.tagline}. Adapts dynamically to your ${selectedLevelObj.label.toLowerCase()} level in ${targetLangObj.label}.`}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>
                      Includes full grammar, vocab &amp; pronunciation report
                      after session
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleStart}
                    disabled={
                      isStarting || (mode === "SPECIFIC" && !topic.trim())
                    }
                    className="inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-7 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-indigo-500/30 transition-all hover:from-indigo-400 hover:to-fuchsia-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isStarting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Preparing Arena...</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 fill-current" />
                        <span>Enter Freestyle Arena</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* MODE & DIFFICULTY SELECTORS */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-7">
              {/* 1. Mode Selector */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-extrabold tracking-wider text-slate-500 uppercase">
                    <Settings2 className="h-4 w-4 text-indigo-600" />
                    1. Choose Conversation Mode
                  </label>
                </div>

                <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {MODES.map((m) => {
                    const isSelected = mode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMode(m.id)}
                        className={`flex items-start gap-3.5 rounded-2xl border-2 p-4 text-left transition-all ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-50/50 shadow-2xs ring-2 ring-indigo-600/10"
                            : "border-slate-100 bg-slate-50/60 hover:border-slate-200 hover:bg-white"
                        }`}
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-2xs">
                          {m.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-black text-slate-900">
                              {m.label}
                            </span>
                            {isSelected && (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-600" />
                            )}
                          </div>
                          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                            {m.tagline}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Topic Box */}
                {mode === "SPECIFIC" && (
                  <div className="mt-4 space-y-3 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
                    <label className="flex items-center gap-1.5 text-xs font-extrabold tracking-wide text-indigo-900 uppercase">
                      <MessageSquarePlus className="h-3.5 w-3.5 text-indigo-600" />
                      Custom Roleplay Scenario
                    </label>
                    <input
                      type="text"
                      placeholder="What do you want to talk about? (e.g., Returning shoes at a store)"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full rounded-xl border border-indigo-200/80 bg-white px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-hidden"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {QUICK_TOPICS.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => setTopic(suggestion)}
                          className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                            topic === suggestion
                              ? "border-indigo-600 bg-indigo-600 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
                          }`}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="my-6 border-t border-slate-100" />

              {/* 2. Difficulty Level Selector */}
              <div>
                <label className="flex items-center gap-2 text-xs font-extrabold tracking-wider text-slate-500 uppercase">
                  <BarChart3 className="h-4 w-4 text-emerald-600" />
                  2. Select Difficulty &amp; AI Pace
                </label>

                <div className="mt-3.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {LEVELS.map((l) => {
                    const isSelected = level === l.id;
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setLevel(l.id)}
                        className={`flex flex-col justify-between rounded-2xl border-2 p-4 text-left transition-all ${
                          isSelected
                            ? l.activeClass
                            : "border-slate-100 bg-slate-50/60 text-slate-800 hover:border-slate-200 hover:bg-white"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${l.badgeClass}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${l.dotClass}`}
                              />
                              {l.badge}
                            </span>
                            {isSelected && <CheckCircle2 className="h-4 w-4" />}
                          </div>
                          <h3 className="mt-2.5 text-base font-black">
                            {l.label}
                          </h3>
                        </div>
                        <p className="mt-1 text-xs leading-snug text-slate-500">
                          {l.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (4 COLS): Voice & Language Settings Card */}
          <div className="flex flex-col gap-6 lg:col-span-4">
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-extrabold tracking-wider text-indigo-700 uppercase">
                  <Volume2 className="h-3.5 w-3.5 text-indigo-600" /> Voice
                  &amp; Language
                </span>
                <span className="text-xs font-extrabold text-emerald-600">
                  ● Ready
                </span>
              </div>

              <h3 className="mt-4 text-xl font-black text-slate-900">
                Session Preferences
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Customize your AI tutor&apos;s voice and language pair before
                entering the arena.
              </p>

              {/* Voice Gender Toggle */}
              <div className="mt-5 space-y-2">
                <label className="text-xs font-extrabold tracking-wider text-slate-400 uppercase">
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
                        className={`flex items-center justify-center gap-2 rounded-2xl border-2 py-3.5 text-xs font-extrabold capitalize transition-all ${
                          active
                            ? "border-indigo-600 bg-indigo-50/70 text-indigo-700 shadow-2xs"
                            : "border-slate-100 bg-slate-50/60 text-slate-600 hover:border-slate-200 hover:bg-white"
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

              {/* Language Selectors (Full-width so text never truncates!) */}
              <div className="mt-5 space-y-3.5">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-extrabold tracking-wider text-slate-400 uppercase">
                    <Globe2 className="h-3.5 w-3.5 text-indigo-500" /> Target
                    Language (Practicing)
                  </label>
                  <select
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="w-full cursor-pointer rounded-2xl border-2 border-indigo-100 bg-indigo-50/30 px-4 py-3 text-sm font-bold text-slate-900 transition focus:border-indigo-600 focus:bg-white focus:outline-hidden"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-extrabold tracking-wider text-slate-400 uppercase">
                    <Globe2 className="h-3.5 w-3.5 text-slate-400" /> Native
                    Language (Translations)
                  </label>
                  <select
                    value={nativeLang}
                    onChange={(e) => setNativeLang(e.target.value)}
                    className="w-full cursor-pointer rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 transition focus:border-indigo-600 focus:bg-white focus:outline-hidden"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Summary Checklist */}
              <div className="mt-5 space-y-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400">Mode</span>
                  <span className="font-extrabold text-slate-800">
                    {selectedModeObj.icon} {selectedModeObj.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400">Level</span>
                  <span className="font-extrabold text-slate-800">
                    {selectedLevelObj.label} ({selectedLevelObj.badge})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400">Duration</span>
                  <span className="font-extrabold text-emerald-600">
                    5 Minutes Live
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStart}
                disabled={isStarting || (mode === "SPECIFIC" && !topic.trim())}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 text-xs font-extrabold text-white shadow-md shadow-indigo-500/20 transition hover:bg-indigo-700 active:scale-98 disabled:opacity-50"
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
      </main>
    </div>
  );
}