// components/foundation/graduation/milestone-graduation-view.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Loader2,
  Mic,
  Play,
  Quote,
  Sparkles,
  Trophy,
  Volume2,
} from "lucide-react";
import { useS3Media } from "@/context/s3-context";
import { playSfx, preloadSfx } from "@/lib/sfx";
import type { GraduationData } from "@/lib/graduation/schemas";
import type { GraduationPageData } from "@/app/(dashboard)/foundation/actions/get-graduation-data";

// Flip to true in Phase 0.5 once Voice Cloning is wired
const SHOW_VOICE_CLONE_TEASER = false;

export default function MilestoneGraduationView({
  data,
}: {
  data: GraduationPageData;
}) {
  const router = useRouter();
  const { graduation, bossStage, isTrial } = data;
  const gradData = graduation.graduationData as unknown as GraduationData | null;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [hasCelebrated, setHasCelebrated] = useState(false);

  // Poll while still BUILDING (e.g. user beat the Boss faster than Replicate finished)
  useEffect(() => {
    if (graduation.status !== "BUILDING") return;
    const interval = setInterval(() => {
      router.refresh();
    }, 3500);
    return () => clearInterval(interval);
  }, [graduation.status, router]);

  useEffect(() => {
    preloadSfx();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (graduation.status === "READY" && !hasCelebrated) {
      setHasCelebrated(true);
      playSfx("victory");
      confetti({
        particleCount: 140,
        spread: 80,
        origin: { y: 0.55 },
        colors: ["#6366F1", "#10B981", "#F59E0B", "#EC4899"],
      });
    }
  }, [graduation.status, hasCelebrated]);

  const canDoItems = gradData?.canDoItems || [];

  const s3Keys = useMemo(() => {
    const base: (string | undefined)[] = [
      graduation.videoS3Key ?? gradData?.videoS3Key ?? undefined,
      graduation.coverImageS3Key ?? gradData?.coverImageS3Key ?? undefined,
      graduation.audioNativeS3Key ?? gradData?.audioNativeS3Key ?? undefined,
      graduation.audioTargetS3Key ?? gradData?.audioTargetS3Key ?? undefined,
    ];
    for (const item of canDoItems) {
      base.push(item.audioS3Key ?? undefined);
    }
    return base;
  }, [graduation, gradData, canDoItems]);

  const { urls, isLoading: s3Loading } = useS3Media(s3Keys);
  const videoUrl = urls[0];
  const coverUrl = urls[1];
  const nativeAudioUrl = urls[2];
  const targetAudioUrl = urls[3];
  const canDoAudioUrls = urls.slice(4);

  const playUrl = (id: string, url?: string) => {
    if (!url) return;
    try {
      playSfx("tap");
      if (audioRef.current) audioRef.current.pause();
      const a = new Audio(url);
      audioRef.current = a;
      setPlayingKey(id);
      a.onended = () => setPlayingKey(null);
      void a.play();
    } catch {
      setPlayingKey(null);
    }
  };

  // Compute Boss score pill from BossStage
  const bossRules = (bossStage?.scenarioData as any)?.rules;
  const bossTotal = bossRules?.totalExercises || null;
  const bossScore =
    typeof bossStage?.score === "number" ? Math.round(bossStage.score) : null;

  if (graduation.status === "BUILDING") {
    return (
      <div className="flex min-h-[calc(100dvh-3rem)] md:min-h-dvh w-full items-center justify-center animate-bg p-4">
        <div className="w-full max-w-md rounded-3xl border-2 border-b-[5px] border-slate-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
          <h2 className="text-xl font-black text-slate-900">
            Putting Your Milestone Recap Together...
          </h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Milestone {graduation.milestoneIndex} Boss defeated! Hang tight for
            a few seconds while your coach finishes recording.
          </p>
        </div>
      </div>
    );
  }

  if (graduation.status === "FAILED" || !gradData) {
    return (
      <div className="flex min-h-[calc(100dvh-3rem)] md:min-h-dvh w-full items-center justify-center animate-bg p-4">
        <div className="w-full max-w-md rounded-3xl border-2 border-b-[5px] border-slate-200 bg-white p-8 text-center shadow-xl space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white">
            <Trophy className="h-8 w-8" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-black text-slate-900">
              Milestone {graduation.milestoneIndex} Cleared!
            </h2>
            <p className="text-sm font-semibold text-slate-500">
              You defeated the Boss and unlocked the next stage of your journey.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Link
              href="/books"
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-b-4 border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 hover:bg-slate-50"
            >
              <BookOpen className="h-4 w-4 text-amber-600" />
              <span>Story Books</span>
            </Link>
            <Link
              href="/conversation"
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-b-4 border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 hover:bg-slate-50"
            >
              <Mic className="h-4 w-4 text-purple-600" />
              <span>3-Min AI Chat</span>
            </Link>
          </div>
          <Link
            href="/learning-hub"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 py-3.5 text-sm font-black text-white shadow-md"
          >
            <span>Continue to Learning Hub</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-3rem)] md:min-h-dvh w-full animate-bg px-3 py-4 font-sans text-slate-900 sm:px-6 sm:py-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 sm:gap-5">
        {/* ================= SCENE 1: 10s SPRITE VIDEO & HYPE ================= */}
        <section className="overflow-hidden rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white shadow-xl sm:rounded-[2rem]">
          {/* Top Celebration Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-sky-50 to-indigo-50 px-4 py-3 sm:px-6">
            <div className="inline-flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl border-b-2 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white">
                <Trophy className="h-4 w-4" />
              </span>
              <span className="text-xs sm:text-sm font-black tracking-tight text-slate-900">
                {gradData.badgeTitle}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {bossScore !== null && bossTotal && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black text-emerald-800">
                  Boss Defeated • {bossScore}/{bossTotal}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black tracking-wider text-amber-800 uppercase">
                <Sparkles className="h-3 w-3" />
                Milestone {gradData.milestoneIndex}
              </span>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            {/* 4:3 Video / Cover Stage */}
            <div className="relative mx-auto aspect-[4/3] w-full max-w-xl overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-950 shadow-inner">
              {videoUrl ? (
                <video
                  src={videoUrl}
                  poster={coverUrl}
                  controls
                  autoPlay
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : coverUrl ? (
                <div className="relative h-full w-full">
                  <img
                    src={coverUrl}
                    alt={`${gradData.spriteName} celebration`}
                    className="h-full w-full object-cover"
                  />
                  {nativeAudioUrl && (
                    <button
                      type="button"
                      onClick={() => playUrl("native", nativeAudioUrl)}
                      className="absolute right-3 bottom-3 inline-flex items-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-4 py-2.5 text-xs font-black text-white shadow-lg"
                    >
                      <Play className="h-4 w-4 fill-current" />
                      <span>Hear {gradData.spriteName}</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  {s3Loading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
                  ) : (
                    <Trophy className="h-12 w-12 text-emerald-400" />
                  )}
                </div>
              )}
            </div>

            {/* Coach Quote + Target-Language Toast */}
            <div className="rounded-2xl border-2 border-sky-100 bg-sky-50/60 p-3.5 sm:p-4 space-y-3">
              <p className="flex items-start gap-2 text-xs sm:text-sm font-bold leading-relaxed text-slate-700">
                <Quote className="mt-0.5 h-4 w-4 shrink-0 rotate-180 text-blue-500" />
                <span>{gradData.speechNative}</span>
              </p>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3.5 py-2.5 ring-1 ring-sky-200/80">
                <div className="min-w-0">
                  <p className="text-sm sm:text-base font-black text-slate-900">
                    &ldquo;{gradData.speechTarget}&rdquo;
                  </p>
                  <p className="text-[11px] font-semibold text-slate-500">
                    {gradData.speechTargetGloss}
                  </p>
                </div>

                {targetAudioUrl && (
                  <button
                    type="button"
                    onClick={() => playUrl("target-toast", targetAudioUrl)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border-b-2 px-3 py-2 text-xs font-black text-white transition ${
                      playingKey === "target-toast"
                        ? "border-emerald-700 bg-emerald-500"
                        : "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 hover:brightness-105"
                    }`}
                  >
                    <Volume2 className="h-4 w-4" />
                    <span>Hear Toast</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ================= SCENE 2: LOOK WHAT YOU CAN DO NOW ================= */}
        <section className="rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-4 shadow-lg sm:rounded-[2rem] sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-black tracking-tight text-slate-900 uppercase">
              Look What You Can Actually Do Now
            </h2>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-700 uppercase">
              {canDoItems.length} Spoons Mastered
            </span>
          </div>

          <div className="space-y-2.5">
            {canDoItems.map((item, idx) => {
              const audioUrl = canDoAudioUrls[idx];
              const isPlaying = playingKey === `spoon-${item.spoonNumber}`;

              return (
                <div
                  key={item.spoonNumber}
                  className="flex items-center justify-between gap-3 rounded-2xl border-2 border-emerald-200/80 bg-emerald-50/40 p-3 sm:p-4"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    <div className="min-w-0">
                      <span className="text-[10px] font-black tracking-wider text-emerald-700 uppercase">
                        Spoon {item.spoonNumber} • {item.canDoNative}
                      </span>
                      <p className="mt-0.5 text-sm sm:text-base font-black text-slate-900">
                        &ldquo;{item.targetSentence}&rdquo;
                      </p>
                      <p className="text-xs font-semibold text-slate-500">
                        {item.nativeSentence}
                      </p>
                    </div>
                  </div>

                  {audioUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        playUrl(`spoon-${item.spoonNumber}`, audioUrl)
                      }
                      aria-label={`Play Spoon ${item.spoonNumber} phrase`}
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-b-[3px] text-white transition ${
                        isPlaying
                          ? "border-emerald-700 bg-emerald-500"
                          : "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 hover:brightness-105"
                      }`}
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ================= SCENE 3 (PHASE 0.5): VOICE CLONE SLOT ================= */}
        {SHOW_VOICE_CLONE_TEASER && (
          <section className="rounded-3xl border-2 border-dashed border-indigo-300 bg-indigo-50/60 p-4 sm:p-5">
            <p className="text-xs font-black text-indigo-900">
              Voice Cloning (Phase 0.5)
            </p>
          </section>
        )}

        {/* ================= SCENE 4: USE IT BEFORE YOU LOSE IT ================= */}
        <section className="rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-4 shadow-lg sm:rounded-[2rem] sm:p-6 space-y-4">
          <div>
            <h2 className="text-sm sm:text-base font-black tracking-tight text-slate-900 uppercase">
              Use It Before You Lose It
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm font-semibold text-slate-500">
              Lock in{" "}
              <span className="font-black text-slate-700">
                {gradData.milestoneTheme}
              </span>{" "}
              with a quick story or live 3-minute chat.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/books"
              className="group flex flex-col justify-between gap-3 rounded-2xl border-2 border-b-4 border-amber-200 border-b-amber-300 bg-amber-50/60 p-4 transition hover:-translate-y-0.5 hover:border-amber-400"
            >
              <div className="space-y-1">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border-b-2 border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950">
                  <BookOpen className="h-4 w-4" />
                </div>
                <h3 className="pt-1 text-sm font-black text-slate-900">
                  Read a Story Book
                </h3>
                <p className="text-xs font-semibold text-slate-600">
                  Spot your new phrases inside a real story—even 5 minutes locks
                  them into memory.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-black text-amber-800">
                <span>Open Story Books</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>

            <Link
              href="/conversation"
              className="group flex flex-col justify-between gap-3 rounded-2xl border-2 border-b-4 border-purple-200 border-b-purple-300 bg-purple-50/60 p-4 transition hover:-translate-y-0.5 hover:border-purple-400"
            >
              <div className="space-y-1">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border-b-2 border-purple-900 bg-gradient-to-b from-violet-500 to-purple-700 text-white">
                  <Mic className="h-4 w-4" />
                </div>
                <h3 className="pt-1 text-sm font-black text-slate-900">
                  3-Min AI Conversation
                </h3>
                <p className="text-xs font-semibold text-slate-600">
                  Test yourself in a live 3-minute voice chat on{" "}
                  {gradData.milestoneTheme}—no pressure.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-black text-purple-800">
                <span>Start 3-Min AI Chat</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>

          {/* Up Next + Primary CTA */}
          <div className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-200/80 space-y-3">
            <p className="text-xs font-bold text-slate-600">
              <span className="font-black text-blue-700 uppercase">
                Up Next:
              </span>{" "}
              {gradData.nextMilestoneTeaser}
            </p>

            <Link
              href={isTrial ? "/learning-hub" : "/learning-hub"}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 py-3.5 text-sm font-black text-white shadow-md transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0"
            >
              <span>
                {isTrial && gradData.milestoneIndex === 1
                  ? "Back to Learning Hub (Unlock Milestone 2)"
                  : `Continue to Milestone ${gradData.milestoneIndex + 1}`}
              </span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}