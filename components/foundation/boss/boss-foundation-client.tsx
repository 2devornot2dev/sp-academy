// components/foundation/boss/boss-foundation-client.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { BossFoundationProvider } from "@/context/boss-context";
import BossFoundationFreestyle from "./boss-foundation-freestyle";
import { BossData } from "@/app/(dashboard)/foundation/actions/get-boss-data";
import { BossScenarioData } from "@/lib/boss/schemas";
import { startNextMilestoneDaisyChain } from "@/lib/foundation/advance-build-chain";
import {
  ShieldAlert,
  Play,
  Target,
  Loader2,
  Trophy,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { useS3Media } from "@/context/s3-context";
import { WordAudioProvider } from "@/context/word-audio-context";
import { MatrixProvider } from "@/context/matrix-context";

const FALLBACK_AVATAR =
  "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=boss";

function getBossAvatarKeys(boss: BossScenarioData["boss"] | null) {
  const derivedPrefix = boss?.coverUrl
    ? boss.coverUrl
        .replace(/^boss\/covers\//, "boss/avatars/")
        .replace(/\/cover\.png$/, "")
    : null;

  return {
    default:
      boss?.avatar?.default ??
      boss?.avatarKey ??
      (derivedPrefix ? `${derivedPrefix}/default.png` : undefined),
    happy:
      boss?.avatar?.happy ??
      (derivedPrefix ? `${derivedPrefix}/happy.png` : undefined),
    sad:
      boss?.avatar?.sad ??
      (derivedPrefix ? `${derivedPrefix}/sad.png` : undefined),
    angry:
      boss?.avatar?.angry ??
      (derivedPrefix ? `${derivedPrefix}/angry.png` : undefined),
  };
}

export default function BossFoundationClient({
  session,
}: {
  session: NonNullable<BossData>;
}) {
  const router = useRouter();
  const [hasStarted, setHasStarted] = useState(false);

  const handleEnd = () => router.push("/learning-hub");
  const handleRetry = () => setHasStarted(false);

  const scenarioData =
    session.scenarioData as unknown as BossScenarioData | null;
  const boss = scenarioData?.boss || null;
  const playlist = scenarioData?.exerciseBank || [];
  const totalExercises =
    scenarioData?.rules?.totalExercises || playlist.length || 0;
  const passingScore =
    scenarioData?.rules?.passingScore ||
    Math.max(1, Math.round(totalExercises * 0.8));

  const milestoneIndex = (session as any)?.milestoneIndex ?? 1;
  const courseId =
    (session as any)?.foundationCourseId || (session as any)?.course?.id;
  const attempts = (session as any)?.attempts ?? 0;
  const bestScore = (session as any)?.score ?? null;

  const rawLang =
    session?.course?.targetLanguage ||
    (session as any)?.targetLanguage ||
    "fr-FR";

  const introVideoKey: string | undefined =
    (session as any)?.introVideoS3Key ??
    (boss as any)?.introVideoKey ??
    (boss as any)?.introVideoS3Key ??
    undefined;

  const avatarKeys = useMemo(() => getBossAvatarKeys(boss), [boss]);

  const allKeys = useMemo(() => {
    const keys: (string | undefined)[] = [
      avatarKeys.default,
      boss?.coverUrl ?? undefined,
      avatarKeys.happy,
      avatarKeys.sad,
      avatarKeys.angry,
      introVideoKey,
    ];
    playlist.forEach((item) => {
      keys.push(item.audioKey ?? undefined);
      if (item.imageOptions) {
        item.imageOptions.forEach((opt) =>
          keys.push(opt.imageKey ?? undefined),
        );
      }
    });
    return keys;
  }, [boss, avatarKeys, introVideoKey, playlist]);

  const { urls, isLoading } = useS3Media(allKeys);

  const resolvedDefaultAvatarUrl = urls[0];
  const resolvedCoverUrl = urls[1];
  const bossAvatar = resolvedDefaultAvatarUrl || FALLBACK_AVATAR;
  const resolvedIntroVideoUrl =
    urls[5] ||
    (introVideoKey?.startsWith("http") ? introVideoKey : undefined);

  const handleStartEncounter = () => {
    setHasStarted(true);
    if (courseId) {
      void startNextMilestoneDaisyChain({
        courseId,
        currentMilestoneIndex: milestoneIndex,
      });
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col justify-center overflow-hidden animate-bg p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-slate-950/15 backdrop-blur-[1px]" />

      {!hasStarted ? (
        <div className="relative z-10 flex w-full flex-col items-center justify-center py-6">
          {/* 3D Tactile Pre-Boss Arena Card */}
          <div className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white text-center shadow-2xl">
            {/* Widescreen Cover Banner */}
            <div className="relative h-60 w-full bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 sm:h-72">
              {resolvedCoverUrl ? (
                <img
                  src={resolvedCoverUrl}
                  alt={`${boss?.name || "Boss"} scene`}
                  className="h-full w-full object-cover object-top"
                />
              ) : (
                isLoading && (
                  <div className="flex h-full w-full items-center justify-center">
                    <Loader2 className="animate-spin text-sky-300" size={36} />
                  </div>
                )
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-slate-950/30" />

              {/* Top-left Milestone Badge */}
              <div className="absolute top-5 left-5 inline-flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-slate-950/60 px-3.5 py-1.5 text-xs font-black tracking-wider text-sky-300 uppercase backdrop-blur-md">
                <Sparkles size={14} className="text-amber-300" />
                Milestone {milestoneIndex} Boss Arena
              </div>

              {/* Top-right Attempts / Best Score pill */}
              {attempts > 0 && (
                <div className="absolute top-5 right-5 flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/60 px-3.5 py-1.5 text-xs font-black text-white shadow-sm backdrop-blur-md">
                  <RotateCcw size={13} className="text-sky-300" />
                  Attempt #{attempts + 1}
                  {bestScore !== null &&
                    ` • Last: ${bestScore}/${totalExercises}`}
                </div>
              )}
            </div>

            {/* Card Body */}
            <div className="relative px-6 pt-16 pb-8 sm:px-10">
              {/* Overlapping 3D Squircle Boss Avatar (Matches AI Tutor Portrait) */}
              <div className="absolute -top-14 left-1/2 flex h-28 w-28 -translate-x-1/2 items-center justify-center overflow-hidden rounded-[2rem] border-2 border-b-[6px] border-sky-400 border-b-blue-800 bg-slate-900 shadow-xl">
                {isLoading && !resolvedDefaultAvatarUrl ? (
                  <Loader2 className="animate-spin text-sky-300" size={32} />
                ) : (
                  <img
                    src={bossAvatar}
                    alt={boss?.name || "Boss"}
                    className="h-full w-full object-cover object-top"
                  />
                )}
              </div>

              <h1 className="mb-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                {boss?.name || "Milestone Boss"}
              </h1>

              {/* Persona Bio Card */}
              <div className="mb-6 rounded-2xl border-2 border-sky-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50/40 px-6 py-4 text-center shadow-2xs">
                <p className="text-sm font-bold leading-relaxed text-slate-700 sm:text-[15px]">
                  {boss?.persona ||
                    "Prove your language skills in this final milestone checkpoint."}
                </p>
              </div>

              {/* 3-Column 3D Tactile Stats Row */}
              <div className="mb-7 grid w-full grid-cols-3 gap-3 sm:gap-4">
                <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-b-4 border-sky-200 border-b-sky-300 bg-sky-50/60 py-3.5">
                  <div className="mb-0.5 flex h-9 w-9 items-center justify-center rounded-xl border-b-2 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-2xs">
                    <Target size={18} strokeWidth={2.5} />
                  </div>
                  <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase">
                    Challenges
                  </span>
                  <span className="text-2xl font-black text-slate-900">
                    {totalExercises}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-b-4 border-emerald-200 border-b-emerald-300 bg-emerald-50/60 py-3.5">
                  <div className="mb-0.5 flex h-9 w-9 items-center justify-center rounded-xl border-b-2 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-2xs">
                    <Trophy size={18} strokeWidth={2.5} />
                  </div>
                  <span className="text-[10px] font-black tracking-widest text-emerald-600 uppercase">
                    To Pass
                  </span>
                  <span className="text-2xl font-black text-slate-900">
                    {passingScore}/{totalExercises}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-b-4 border-rose-200 border-b-rose-300 bg-rose-50/60 py-3.5">
                  <div className="mb-0.5 flex h-9 w-9 items-center justify-center rounded-xl border-b-2 border-rose-800 bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-2xs">
                    <ShieldAlert size={18} strokeWidth={2.5} />
                  </div>
                  <span className="text-[10px] font-black tracking-widest text-rose-600 uppercase">
                    Lives
                  </span>
                  <span className="text-2xl font-black text-slate-900">3</span>
                </div>
              </div>

              <button
                onClick={handleStartEncounter}
                disabled={isLoading}
                className={`group relative flex w-full items-center justify-center gap-2.5 rounded-2xl border-b-4 py-4 text-base font-black text-white shadow-xl transition-all ${
                  isLoading
                    ? "cursor-not-allowed border-slate-300 bg-slate-300"
                    : "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 shadow-blue-500/25 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 active:border-b-0"
                }`}
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={22} />
                ) : (
                  <Play
                    className="transition-transform group-hover:scale-110"
                    fill="currentColor"
                    size={20}
                  />
                )}
                <span>{isLoading ? "Loading Media..." : "Start Encounter"}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <BossFoundationProvider
          session={session}
          onEnd={handleEnd}
          preloadedKeys={allKeys}
          preloadedUrls={urls}
        >
          <MatrixProvider>
            <WordAudioProvider targetLang={rawLang}>
              <BossFoundationFreestyle
                onEnd={handleEnd}
                onRetry={handleRetry}
                introVideoUrl={resolvedIntroVideoUrl}
                coverImageUrl={resolvedCoverUrl}
              />
            </WordAudioProvider>
          </MatrixProvider>
        </BossFoundationProvider>
      )}
    </div>
  );
}