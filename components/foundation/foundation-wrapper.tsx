"use client";

import React, { useState } from "react";
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
  Languages,
} from "lucide-react";

import {
  MOCK_FOUNDATION_DATA_EN_FR,
  MOCK_FOUNDATION_DATA_EN_ES,
} from "@/lib/config/mock-foundation";

type FoundationData =
  | typeof MOCK_FOUNDATION_DATA_EN_FR
  | typeof MOCK_FOUNDATION_DATA_EN_ES;

import { LangStep } from "./lang-step";
import { IntroStep } from "./intro-step";
import { VisualStep } from "./visual-step";
import { GrammarStep } from "./grammar-step";
import { PronunciationStep } from "./pronunciation-step";
import { ListeningStep } from "./listening-step";
import { QuizStep } from "./quiz-step";
import { FreestyleStep } from "./freestyle-step";
import { OutroStep } from "./outro-step";
import { WordAudioProvider } from "@/context/word-audio-context";
import { MatrixProvider, useMatrix } from "@/context/matrix-context";
import { useRouter } from "next/navigation";
import { invokeEduBuilder } from "@/app/actions/invoke-edu-builder";
import { completeLesson } from "@/app/actions/complete-lesson";
import { SpriteCoachPop } from "./sprite-step-pop";
import { playSfx, preloadSfx } from "@/lib/sfx";

const STEPS_CONFIG = [
  { id: 0, title: "Language Setup", icon: Languages },
  { id: 1, title: "Mission Briefing", icon: Flag },
  { id: 2, title: "Scene Context", icon: ImageIcon },
  { id: 3, title: "Grammar & Meaning", icon: BookOpen },
  { id: 4, title: "Pronunciation Lab", icon: Mic },
  { id: 5, title: "Listening Focus", icon: Headphones },
  { id: 6, title: "Knowledge Check", icon: PenTool },
  { id: 7, title: "Final Mission", icon: Target },
  { id: 8, title: "Mission Debrief", icon: Award },
];

function FoundationContent() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FoundationData>(MOCK_FOUNDATION_DATA_EN_FR);

  const { syncCart } = useMatrix();
  const router = useRouter();

  const currentDay = data.orderIndex || (data as any).bridgeIndex || 1;
  const nextLessonNumber = currentDay + 1;

  // Extract userId from your webhook mock data structure
  // Handles both root-level userId and meta.userId variations
  const userId =
    (data as any).userId || (data as any).meta?.userId || "usr_Paul";
  // Fallback to "fr-FR" if not explicitly in the mock data root
  const targetLang =
    (data as any).targetLanguage || (data as any).targetLang || "fr-FR";

  const courseId =
    (data as any).foundationCourseId ||
    (data as any).meta?.courseId ||
    "course_test";

  // TEMP test data. Replace with the real user profile later.
  const profileData = {
    userId,
    firstName: "Paul",
    gender: "male",
    nativeLanguage: "en-US",
    targetLanguage: targetLang,
    levelBand: "A1",
    goal: "travel",
    scriptComfort: "latin",
    type: "SPOON_GENERATION",
    spoon: nextLessonNumber,
    isOnboarding: false,
  };

  const handleLanguageSelect = (lang: "FR" | "ES") => {
    setData(
      lang === "FR" ? MOCK_FOUNDATION_DATA_EN_FR : MOCK_FOUNDATION_DATA_EN_ES,
    );
    setStep(1);
  };

  // INTERCEPTOR: Sync the matrix cart to DB, then change step
  const handleNext = (nextStepIndex: number) => {
    playSfx(nextStepIndex === 8 ? "victory" : "round-clear");
    syncCart(userId, targetLang);
    setStep(nextStepIndex);
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return <LangStep onSelect={handleLanguageSelect} />;
      case 1:
        return <IntroStep data={data} onNext={() => handleNext(2)} />;
      case 2:
        return (
          <VisualStep data={data.visualContent} onNext={() => handleNext(3)} />
        );
      case 3:
        return (
          <GrammarStep
            data={data.grammarContent}
            onNext={() => handleNext(4)}
          />
        );
      case 4:
        return (
          <PronunciationStep
            data={data.pronunciationData}
            onNext={() => handleNext(5)}
          />
        );
      case 5:
        return (
          <ListeningStep
            data={data.listeningContent}
            onNext={() => handleNext(6)}
          />
        );
      case 6:
        return (
          <QuizStep
            data={data.quizContent}
            targetLang={targetLang}
            onNext={() => handleNext(7)}
          />
        );
      case 7:
        return <FreestyleStep data={data} onNext={() => handleNext(8)} />;
      case 8:
        return (
          <OutroStep
            data={data}
            targetLang={targetLang}
            userId={userId}
            onFinish={async (feedback) => {
              await syncCart(userId, targetLang);

              // Mark this lesson done and save the Hard/OK/Easy rating
              await completeLesson({
                courseId,
                orderIndex: currentDay,
                feedback,
              });

              // Kick off the next lesson
              const res = await invokeEduBuilder({
                ...profileData,
                foundationCourseId: courseId,
                previous_lessons: [
                  { ...(data.lessonHandoff as any), feedback },
                ],
              });
              if (!res.ok) throw new Error(res.error);

              router.push("/learning-hub");
            }}
          />
        );
      default:
        return <div>Unknown Step</div>;
    }
  };

  return (
    <WordAudioProvider
      wordAudio={data.lessonHandoff?.wordAudio || (data as any).wordAudio}
      targetLang={targetLang}
    >
      <div className="max-w-7xl mx-auto p-4 md:p-8 min-h-screen flex flex-col md:flex-row gap-6 md:gap-8">
        {/* LEFT SIDEBAR: STEPPER CARD */}
        <div className="w-full md:w-72 lg:w-80 shrink-0 bg-white rounded-4xl shadow-xs border border-gray-100 p-6 md:p-8 h-fit">
          <div className="mb-10">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">
              Course • Day {currentDay}
            </p>
            <h2 className="text-2xl font-extrabold text-gray-900 leading-tight">
              {step === 0
                ? "Prototype Setup"
                : data.lessonHandoff?.theme || "Greetings"}
            </h2>
          </div>

          <div className="relative">
            <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-gray-100 rounded-full" />

            <div className="flex flex-col gap-6 relative z-10">
              {STEPS_CONFIG.map((s, index) => {
                const isCompleted = step > index;
                const isActive = step === index;
                const Icon = s.icon;

                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-4 transition-all duration-300"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300 bg-white
                        ${
                          isCompleted
                            ? "border-green-500 text-green-500"
                            : isActive
                              ? "border-blue-600 text-blue-600 shadow-xs ring-4 ring-blue-50"
                              : "border-gray-300 text-gray-500"
                        }
                      `}
                    >
                      {isCompleted ? (
                        <Check size={18} strokeWidth={3} />
                      ) : (
                        <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                      )}
                    </div>

                    <div
                      className={`text-sm transition-colors duration-300 ${
                        isActive
                          ? "font-bold text-gray-900"
                          : isCompleted
                            ? "font-semibold text-gray-700"
                            : "font-semibold text-gray-600"
                      }`}
                    >
                      {s.title}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: MAIN CONTENT "CARD" */}
        <div className="flex-1 bg-white rounded-4xl shadow-xs overflow-hidden min-h-[600px] flex flex-col">
          {renderStep()}
        </div>

        {/* FLOATING SPRITE POPUP ON STEPS 2-7 */}
        <SpriteCoachPop step={step} sprite="vox" />
      </div>
    </WordAudioProvider>
  );
}

// Wrap the entire component tree with the MatrixProvider so the content inside can use the hook
export function FoundationWrapper() {
  return (
    <MatrixProvider>
      <FoundationContent />
    </MatrixProvider>
  );
}
