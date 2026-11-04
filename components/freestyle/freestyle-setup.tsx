"use client";

import { Fragment, useState } from "react";
import {
  Settings2,
  Play,
  Sparkles,
  Globe2,
  BarChart3,
  Mic,
  CheckCircle2,
  Check,
  ArrowLeft,
  ArrowRight,
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
  "Ordering coffee & pastries at a Parisian café",
  "Asking a local for directions to the metro",
  "Introducing yourself to a new neighbor",
  "Checking into a boutique hotel",
  "Returning an item at a clothing shop",
];

const STEPS = [
  { id: 1, label: "Conversation type", icon: Settings2 },
  { id: 2, label: "Difficulty", icon: BarChart3 },
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

  // Step 1 is only complete once a custom topic is filled in (when required)
  const step1Valid = !(mode === "SPECIFIC" && !topic.trim());

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
      persona,
      topic: mode === "SPECIFIC" ? topic : undefined,
      nativeLanguage: nativeLang,
      targetLanguage: targetLang,
      voiceGender,
    });
  };

  return (
    // lg+: lock to the viewport so nothing scrolls. Below lg: scroll normally.
    <div className="flex min-h-screen flex-col bg-slate-100/80 font-sans text-slate-900 lg:h-screen lg:overflow-hidden">
      {/* 1. HEADER BANNER (compacted) */}
      <header className="relative shrink-0 overflow-hidden animate-bg pt-4 pb-14 text-white shadow-lg">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/15 to-slate-950/35 backdrop-blur-[2px]" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[850px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
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
              <div className="hidden items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/35 px-3.5 py-1.5 text-xs font-extrabold text-emerald-300 shadow-sm backdrop-blur-md sm:flex">
                <Mic className="h-4 w-4 text-emerald-400" />
                <span>Live AI Speech Feedback</span>
              </div>
            </div>
          </div>

          <h1 className="flex items-center gap-3 text-2xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.22)] sm:text-3xl">
            <span>Freestyle Conversation Arena</span>
            <MessagesSquare className="h-7 w-7 text-white/90 sm:h-8 sm:w-8" />
          </h1>
          <p className="mt-1.5 text-sm font-medium text-white/90 drop-shadow-[0_1px_4px_rgba(15,23,42,0.18)] sm:text-base">
            No scripts. No safety nets. Set up your AI partner and jump into a
            live 5-minute speaking session.
          </p>
        </div>
      </header>

      {/* 2. MAIN CONTENT (fills the remaining height) */}
      <main className="relative z-20 mx-auto -mt-10 w-full max-w-7xl flex-1 px-6 pb-5 lg:min-h-0 lg:px-8">
        <div className="grid grid-cols-1 gap-5 lg:h-full lg:grid-cols-12">
          {/* LEFT COLUMN: Hero summary + single stepper card */}
          <div className="flex flex-col gap-5 lg:col-span-8 lg:min-h-0">
            {/* HERO CARD (summary only) */}
            <div className="group relative shrink-0 overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl shadow-indigo-950/15">
              <img
                src="/freestyle-cover.png"
                alt="Freestyle Arena"
                className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-45 transition-transform duration-700 group-hover:scale-105"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-indigo-950/45" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/30" />

              <div className="relative z-10 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/35 bg-indigo-500/20 px-3 py-1 text-[11px] font-extrabold tracking-wide text-indigo-200 uppercase backdrop-blur-md">
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                    Freestyle Speaking Mode
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/75 px-3 py-1 text-xs font-bold text-slate-200 backdrop-blur-md">
                    <span>
                      {selectedModeObj.icon} {selectedModeObj.label}
                    </span>
                    <span className="text-white/30">•</span>
                    <span className="text-emerald-300">
                      {selectedLevelObj.label} ({selectedLevelObj.badge})
                    </span>
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-4">
                  <div className="relative shrink-0">
                    <div className="h-16 w-16 overflow-hidden rounded-2xl border-2 border-indigo-400/70 bg-slate-900 shadow-lg shadow-indigo-500/25 sm:h-20 sm:w-20">
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

                  <div className="min-w-0 space-y-1">
                    <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">
                      {voiceGender === "female" ? "Sophie" : "Antoine"} —{" "}
                      {selectedPersonaObj.icon} {selectedPersonaObj.label} AI
                      Tutor
                    </h2>
                    <p className="line-clamp-2 max-w-xl text-sm leading-relaxed text-slate-300">
                      {mode === "SPECIFIC" && topic
                        ? `Scenario: "${topic}"`
                        : `${selectedModeObj.tagline}. Adapts to your ${selectedLevelObj.label.toLowerCase()} level in ${targetLangObj.label}.`}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3 text-xs font-semibold text-slate-300">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>
                    Includes full grammar, vocab &amp; pronunciation report
                    after session
                  </span>
                </div>
              </div>
            </div>

            {/* STEPPER CARD: type → difficulty → start */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              {/* Step indicator */}
              <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-5 py-3.5 sm:px-6">
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
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black transition-colors ${
                            done
                              ? "bg-emerald-500 text-white"
                              : active
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {done ? <Check className="h-4 w-4" /> : s.id}
                        </span>
                        <span className="leading-tight">
                          <span
                            className={`flex items-center gap-1.5 text-xs font-extrabold ${
                              active || done
                                ? "text-slate-900"
                                : "text-slate-400"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {s.label}
                          </span>
                          {done && s.id === 1 && (
                            <span className="text-[11px] font-semibold text-emerald-600">
                              {selectedModeObj.icon} {selectedModeObj.label}
                            </span>
                          )}
                        </span>
                      </button>
                      {i < STEPS.length - 1 && (
                        <div
                          className={`h-0.5 flex-1 rounded-full transition-colors ${
                            step > 1 ? "bg-emerald-400" : "bg-slate-100"
                          }`}
                        />
                      )}
                    </Fragment>
                  );
                })}
              </div>

              {/* Step body */}
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
                {step === 1 && (
                  <div>
                    <p className="text-sm font-bold text-slate-700">
                      What kind of conversation do you want?
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {MODES.map((m) => {
                        const isSelected = mode === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setMode(m.id)}
                            className={`relative flex flex-col items-start gap-2 rounded-2xl border-2 p-3.5 text-left transition-all ${
                              isSelected
                                ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/10"
                                : "border-slate-100 bg-slate-50/60 hover:border-slate-200 hover:bg-white"
                            }`}
                          >
                            {isSelected && (
                              <CheckCircle2 className="absolute top-3 right-3 h-4 w-4 text-indigo-600" />
                            )}
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xl shadow-2xs">
                              {m.icon}
                            </span>
                            <div>
                              <span className="text-sm font-black text-slate-900">
                                {m.label}
                              </span>
                              <p className="mt-0.5 text-xs leading-snug text-slate-500">
                                {m.tagline}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {mode === "SPECIFIC" && (
                      <div className="mt-3 space-y-2.5 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3.5">
                        <label className="flex items-center gap-1.5 text-xs font-extrabold tracking-wide text-indigo-900 uppercase">
                          <MessageSquarePlus className="h-3.5 w-3.5 text-indigo-600" />
                          Custom Roleplay Scenario
                        </label>
                        <input
                          type="text"
                          placeholder="What do you want to talk about? (e.g., Returning shoes at a store)"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          className="w-full rounded-xl border border-indigo-200/80 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-hidden"
                        />
                        {/* One scrollable row so the box stays short */}
                        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                          {QUICK_TOPICS.map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => setTopic(suggestion)}
                              className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition ${
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
                )}

                {step === 2 && (
                  <div>
                    <p className="text-sm font-bold text-slate-700">
                      How challenging should it be?
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
                                {isSelected && (
                                  <CheckCircle2 className="h-4 w-4" />
                                )}
                              </div>
                              <h3 className="mt-3 text-base font-black">
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
                )}
              </div>

              {/* Step footer */}
              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-3 sm:px-6">
                {step === 1 ? (
                  <span className="text-xs font-semibold text-slate-400">
                    Step 1 of 2
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={isStarting}
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                )}

                {step === 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={!step1Valid}
                    className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-extrabold text-white shadow-md shadow-indigo-500/20 transition hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span>Continue</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStart}
                    disabled={isStarting || !step1Valid}
                    className="inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-7 py-3 text-sm font-extrabold text-white shadow-lg shadow-indigo-500/30 transition-all hover:from-indigo-400 hover:to-fuchsia-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
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
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Voice, persona & language */}
          <div className="flex flex-col lg:col-span-4 lg:min-h-0">
            <div className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-extrabold tracking-wider text-indigo-700 uppercase">
                  <Volume2 className="h-3.5 w-3.5 text-indigo-600" /> Voice
                  &amp; Language
                </span>
                <span className="text-xs font-extrabold text-emerald-600">
                  ● Ready
                </span>
              </div>

              <h3 className="mt-3 text-lg font-black text-slate-900">
                Session Preferences
              </h3>

              {/* Voice */}
              <div className="mt-3 space-y-1.5">
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
                        className={`flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-xs font-extrabold capitalize transition-all ${
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

              {/* Persona */}
              <div className="mt-3.5 space-y-1.5">
                <label className="text-xs font-extrabold tracking-wider text-slate-400 uppercase">
                  Tutor Persona
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {PERSONAS.map((p) => {
                    const active = persona === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPersona(p.id)}
                        title={p.desc}
                        className={`flex flex-col items-center gap-0.5 rounded-xl border-2 py-2 text-[11px] font-extrabold transition-all ${
                          active
                            ? "border-indigo-600 bg-indigo-50/70 text-indigo-700 shadow-2xs"
                            : "border-slate-100 bg-slate-50/60 text-slate-600 hover:border-slate-200 hover:bg-white"
                        }`}
                      >
                        <span className="text-lg leading-none">{p.icon}</span>
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs leading-snug text-slate-500">
                  {selectedPersonaObj.desc}
                </p>
              </div>

              {/* Languages */}
              <div className="mt-3.5 space-y-3">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-extrabold tracking-wider text-slate-400 uppercase">
                    <Globe2 className="h-3.5 w-3.5 text-indigo-500" /> Target
                    Language (Practicing)
                  </label>
                  <select
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="w-full cursor-pointer rounded-xl border-2 border-indigo-100 bg-indigo-50/30 px-3.5 py-2.5 text-sm font-bold text-slate-900 transition focus:border-indigo-600 focus:bg-white focus:outline-hidden"
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
                    className="w-full cursor-pointer rounded-xl border-2 border-slate-100 bg-slate-50 px-3.5 py-2.5 text-sm font-bold text-slate-700 transition focus:border-indigo-600 focus:bg-white focus:outline-hidden"
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
          </div>
        </div>
      </main>
    </div>
  );
}