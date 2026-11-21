"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Flag,
  Image as ImageIcon,
  BookOpen,
  Mic,
  Headphones,
  PenTool,
  Target,
  Award,
  Loader2,
  Sparkles,
} from "lucide-react";

import { IntroStep } from "./intro-step";
import { VisualStep } from "./visual-step";
import { GrammarStep } from "./grammar-step";
import { PronunciationStep } from "./pronunciation-step";
import { ListeningStep } from "./listening-step";
import { QuizStep } from "./quiz-step";
import { FreestyleStep } from "./freestyle-step";
import { OutroStep } from "./outro-step";

import { WordAudioProvider, useWordAudio } from "@/context/word-audio-context";
import { MatrixProvider, useMatrix } from "@/context/matrix-context";
import { invokeEduBuilder } from "@/app/actions/invoke-edu-builder";
import { completeLesson } from "@/app/actions/complete-lesson";
import type { UserFoundation } from "@/app/(dashboard)/foundation/actions/get-foundation-user";
import { triggerMilestoneBossAndNextSpoon } from "@/lib/foundation/trigger-milestone-boss";
import { playSfx, preloadSfx } from "@/lib/sfx";

const STEPS_CONFIG = [
  { id: 1, title: "Mission Briefing", subtitle: "Coach intro", icon: Flag },
  {
    id: 2,
    title: "Scene Context",
    subtitle: "Visual dialogue",
    icon: ImageIcon,
  },
  {
    id: 3,
    title: "Grammar & Meaning",
    subtitle: "Pattern breakdown",
    icon: BookOpen,
  },
  {
    id: 4,
    title: "Pronunciation Lab",
    subtitle: "Sound mastery",
    icon: Mic,
  },
  {
    id: 5,
    title: "Listening Focus",
    subtitle: "Audio rebuild",
    icon: Headphones,
  },
  {
    id: 6,
    title: "Knowledge Check",
    subtitle: "4-part quiz",
    icon: PenTool,
  },
  {
    id: 7,
    title: "Final Mission",
    subtitle: "Live roleplay",
    icon: Target,
  },
  {
    id: 8,
    title: "Mission Debrief",
    subtitle: "Complete Spoon",
    icon: Award,
  },
];

function AudioStepGuard({ step }: { step: number }) {
  const { stopAudio } = useWordAudio();
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [step, stopAudio]);
  return null;
}

interface FoundationContentProps {
  foundation: NonNullable<UserFoundation>;
}

function FoundationContent({ foundation }: FoundationContentProps) {
  const [step, setStep] = useState(1);
  const [isFinishing, setIsFinishing] = useState(false);

  const { syncCart } = useMatrix();
  const router = useRouter();

  useEffect(() => {
    preloadSfx();
  }, []);

  const userId = foundation.userId;
  const courseId = foundation.foundationCourseId;
  const currentSpoon = foundation.orderIndex;
  const nextLessonNumber = currentSpoon + 1;
  const milestoneNum = Math.ceil(currentSpoon / 3);

  const targetLang = foundation.course.targetLanguage || "fr-FR";
  const nativeLang = foundation.course.nativeLanguage || "en-US";

  const lessonHandoff = (foundation.lessonHandoff as any) || {};
  const wordAudio =
    lessonHandoff?.wordAudio ||
    (foundation.foundationBridge as any)?.wordAudio ||
    {};

  const userFirstName =
    (foundation as any).user?.firstName ||
    (foundation as any).user?.name?.split(" ")[0] ||
    "Learner";

  const profileData = {
    userId,
    firstName: userFirstName,
    gender: "unspecified",
    nativeLanguage: nativeLang,
    targetLanguage: targetLang,
    levelBand: "beginner",
    goal: "general",
    scriptComfort: "latin",
    type: "lang",
    spoon: nextLessonNumber,
    isOnboarding: false,
  };

  const handleNext = (nextStepIndex: number) => {
    playSfx(nextStepIndex === 8 ? "victory" : "round-clear");
    syncCart(userId, targetLang);
    setStep(nextStepIndex);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <IntroStep data={foundation as any} onNext={() => handleNext(2)} />
        );
      case 2:
        return (
          <VisualStep
            data={foundation.visualContent as any}
            onNext={() => handleNext(3)}
          />
        );
      case 3:
        return (
          <GrammarStep
            data={foundation.grammarContent as any}
            onNext={() => handleNext(4)}
          />
        );
      case 4:
        return (
          <PronunciationStep
            data={foundation.pronunciationData as any}
            onNext={() => handleNext(5)}
          />
        );
      case 5:
        return (
          <ListeningStep
            data={foundation.listeningContent as any}
            onNext={() => handleNext(6)}
          />
        );
      case 6:
        return (
          <QuizStep
            data={foundation.quizContent as any}
            targetLang={targetLang}
            onNext={() => handleNext(7)}
          />
        );
      case 7:
        return (
          <FreestyleStep
            data={foundation as any}
            onNext={() => handleNext(8)}
          />
        );
      case 8:
        return (
          <OutroStep
            data={foundation as any}
            targetLang={targetLang}
            userId={userId}
            onFinish={async (feedback) => {
              if (isFinishing) return;
              setIsFinishing(true);
              try {
                await syncCart(userId, targetLang);

                await completeLesson({
                  courseId,
                  orderIndex: currentSpoon,
                  feedback,
                });

                if (currentSpoon % 3 !== 0) {
                  const res = await invokeEduBuilder({
                    ...profileData,
                    spoon: currentSpoon + 1,
                    isOnboarding: false,
                    foundationCourseId: courseId,
                    previous_lessons: [{ ...lessonHandoff, feedback }],
                  });

                  if (!res.ok) {
                    console.error("Failed to queue next spoon:", res.error);
                  }
                } else {
                  await triggerMilestoneBossAndNextSpoon({
                    userId,
                    courseId,
                    milestoneIndex: currentSpoon / 3,
                    prebakeNextSpoon: true,
                  }).catch((err) =>
                    console.error(
                      "Failed to trigger milestone boss & next spoon:",
                      err
                    )
                  );
                }

                router.push("/learning-hub");
                router.refresh();
              } catch (err) {
                console.error("Error completing Spoon:", err);
                setIsFinishing(false);
              }
            }}
          />
        );
      default:
        return (
          <div className="p-8 text-center text-slate-500">Unknown Step</div>
        );
    }
  };

  const progressPct = Math.round(
    ((step - 1) / (STEPS_CONFIG.length - 1)) * 100
  );

  return (
    <WordAudioProvider wordAudio={wordAudio} targetLang={targetLang}>
      <AudioStepGuard step={step} />

      <div className="mx-auto flex min-h-full max-w-7xl flex-col gap-3 p-3 sm:gap-5 sm:p-5 md:flex-row md:gap-8 md:p-8">
        {/* =================================================================
            MOBILE-ONLY SLIM TOP PROGRESS HEADER (< md)
            ================================================================= */}
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-xs ring-1 ring-slate-200/80 md:hidden">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-gradient-to-b from-sky-400 to-blue-600 px-2 py-0.5 text-[10px] font-black tracking-wide text-white uppercase">
                Spoon {currentSpoon}
              </span>
              <span className="truncate text-xs font-black text-slate-900">
                {STEPS_CONFIG[step - 1]?.title}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600 transition-all duration-500"
                style={{ width: `${Math.max(12, progressPct)}%` }}
              />
            </div>
          </div>
          <span className="shrink-0 text-xs font-black text-blue-600">
            {step}/8
          </span>
        </div>

        {/* =================================================================
            LEFT SIDEBAR: 3D PRIMARY BLUE SPOON STEPPER CARD (md+)
            ================================================================= */}
        <div className="hidden h-fit w-full shrink-0 flex-col justify-between rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200/80 md:flex md:w-72 md:p-7 lg:w-80">
          <div>
            {/* Primary Blue 3D Spoon Badge (Distinct from Vocab Bridge's Amber!) */}
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-xl border-b-[3px] border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-3 py-1 text-[11px] font-black tracking-wide text-white uppercase shadow-2xs">
              <Headphones className="h-3.5 w-3.5" />
              <span>
                Unit {milestoneNum} • Spoon {currentSpoon}
              </span>
            </div>

            <h2 className="text-2xl font-black tracking-tight text-slate-900">
              {lessonHandoff?.theme || foundation.title || "Core Lesson"}
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Master all 8 stages to unlock Vocab Bridge {currentSpoon}
            </p>
          </div>

          {/* 3D 8-Node Vertical Track */}
          <div className="relative my-6">
            {/* Background Connecting Track Line */}
            <div className="absolute top-5 bottom-5 left-[19px] w-1 rounded-full bg-slate-100">
              <div
                className="w-full rounded-full bg-gradient-to-b from-emerald-400 to-blue-500 transition-all duration-500"
                style={{ height: `${progressPct}%` }}
              />
            </div>

            <div className="relative z-10 flex flex-col gap-2.5">
              {STEPS_CONFIG.map((s) => {
                const isCompleted = step > s.id;
                const isActive = step === s.id;
                const Icon = s.icon;

                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-3 rounded-2xl p-1.5 transition-all duration-300 ${
                      isActive
                        ? "bg-sky-50/90 ring-1 ring-sky-200/90 shadow-2xs"
                        : ""
                    }`}
                  >
                    {/* 3D Tactile Squircle Node */}
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black transition-all duration-300 ${
                        isCompleted
                          ? "border-b-[3px] border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-2xs"
                          : isActive
                            ? "scale-105 border-b-[4px] border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-md shadow-blue-500/25"
                            : "border-b-[3px] border-slate-300 bg-slate-100 text-slate-400"
                      }`}
                    >
                      {isCompleted ? (
                        <Check size={16} strokeWidth={3.5} />
                      ) : (
                        <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-xs sm:text-sm font-black ${
                          isActive
                            ? "text-slate-900"
                            : isCompleted
                              ? "text-emerald-700"
                              : "text-slate-400"
                        }`}
                      >
                        {s.title}
                      </p>
                      <p
                        className={`truncate text-[10px] font-semibold ${
                          isActive ? "text-blue-600" : "text-slate-400"
                        }`}
                      >
                        {isCompleted
                          ? "Completed ✓"
                          : isActive
                            ? s.subtitle
                            : "Locked"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Progress Bar */}
          <div className="space-y-1.5 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-500">
              <span>Stage {step} of 8</span>
              <span className="text-blue-600">{progressPct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600 transition-all duration-500"
                style={{ width: `${Math.max(8, progressPct)}%` }}
              />
            </div>
          </div>
        </div>

        {/* =================================================================
            RIGHT SIDE: MAIN INTERACTIVE STAGE CARD
            ================================================================= */}
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80 md:min-h-[620px] md:rounded-[2rem]">
          {isFinishing && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/85 backdrop-blur-xs">
              <Loader2 className="h-9 w-9 animate-spin text-blue-600" />
              <p className="mt-3 text-sm font-black text-slate-800">
                Completing Spoon {currentSpoon} &amp; unlocking Vocab Bridge...
              </p>
            </div>
          )}
          {renderStep()}
        </div>
      </div>
    </WordAudioProvider>
  );
}

export function FoundationWrapperProd({
  foundation,
}: {
  foundation: UserFoundation | null;
}) {
  if (!foundation) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="text-2xl font-bold text-slate-800">Lesson not found</h2>
        <p className="text-sm text-slate-500">
          This lesson might not exist or doesn&apos;t belong to your account.
        </p>
      </div>
    );
  }

  if (foundation.status === "BUILDING") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-lg">
          <Sparkles className="h-7 w-7 animate-spin" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">
          Spoon {foundation.orderIndex} is still baking...
        </h2>
        <p className="max-w-md text-sm font-medium text-slate-500">
          Our language engine is assembling your exercises and audio cues. This
          usually takes a minute or two.
        </p>
      </div>
    );
  }

  return (
    <MatrixProvider>
      <FoundationContent foundation={foundation} />
    </MatrixProvider>
  );
}