"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Video,
  BookOpen,
  BrainCircuit,
  Mic,
  Award,
  Loader2,
  Zap,
} from "lucide-react";
import type { UserVocabBridge } from "@/app/actions/get-vocab-bridge";
import { completeVocabBridge } from "@/app/actions/complete-vocab-bridge";

import { MatrixProvider, useMatrix } from "@/context/matrix-context";
import { WordAudioProvider } from "@/context/word-audio-context";

import { BridgeSceneStep } from "./bridge-scene-step";
import { VocabMomentStep } from "./vocab-moment-step";
import { CooldownStep } from "./cooldown-step";
import { BridgePronunciationStep } from "./bridge-pronunciation-step";
import { BridgeOutroStep } from "./bridge-outro-step";

const BRIDGE_STEPS = [
  { id: 1, title: "Scene Context", subtitle: "Listen & observe", icon: Video },
  {
    id: 2,
    title: "New Vocabulary",
    subtitle: "Unlock & match",
    icon: BookOpen,
  },
  {
    id: 3,
    title: "Cooldown Drills",
    subtitle: "Context practice",
    icon: BrainCircuit,
  },
  {
    id: 4,
    title: "Pronunciation Check",
    subtitle: "Voice assessment",
    icon: Mic,
  },
  {
    id: 5,
    title: "Bridge Complete",
    subtitle: "Claim rewards",
    icon: Award,
  },
];

interface VocabBridgeWrapperProps {
  bridge: UserVocabBridge | null;
}

function VocabBridgeContent({
  bridge,
}: {
  bridge: NonNullable<UserVocabBridge>;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isFinishing, setIsFinishing] = useState(false);

  const { syncCart } = useMatrix();

  const userId = bridge.userId;
  const targetLang = bridge.course?.targetLanguage || "fr-FR";

  const wordAudio =
    (bridge.wordAudio as any) ||
    (bridge.handoffFragment as any)?.wordAudio ||
    {};

  const handleNext = (nextStepIndex: number) => {
    syncCart(userId, targetLang);
    setStep(nextStepIndex);
  };

  const handleFinishBridge = async () => {
    if (isFinishing) return;
    setIsFinishing(true);

    try {
      if (syncCart && userId && targetLang) {
        await syncCart(userId, targetLang);
      }

      const res = await completeVocabBridge(bridge.id);

      if (!res.ok) {
        throw new Error(res.error);
      }

      router.push("/learning-hub");
      router.refresh();
    } catch (err) {
      console.error("Error finishing vocab bridge:", err);
      setIsFinishing(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <BridgeSceneStep
            data={bridge.bridgeScene as any}
            onNext={() => handleNext(2)}
          />
        );
      case 2:
        return (
          <VocabMomentStep
            data={bridge.vocabMoment as any}
            onNext={() => handleNext(3)}
          />
        );
      case 3:
        return (
          <CooldownStep
            data={bridge.cooldown as any}
            onNext={() => handleNext(4)}
          />
        );
      case 4:
        return (
          <BridgePronunciationStep
            data={bridge.pronunciationCheck as any}
            onNext={() => handleNext(5)}
          />
        );
      case 5:
        return (
          <BridgeOutroStep
            data={bridge as any}
            onFinish={() => handleFinishBridge()}
          />
        );
      default:
        return (
          <div className="p-8 text-center text-slate-500">Unknown Step</div>
        );
    }
  };

  const spoonNum = bridge.bridgeIndex || bridge.lesson?.orderIndex || 1;
  const progressPct = Math.round(((step - 1) / (BRIDGE_STEPS.length - 1)) * 100);

  return (
    <WordAudioProvider wordAudio={wordAudio} targetLang={targetLang}>
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 p-4 md:flex-row md:gap-8 md:p-8">
        {/* =================================================================
            LEFT SIDEBAR: 3D TACTILE STEPPER CARD
            ================================================================= */}
        <div className="flex h-fit w-full shrink-0 flex-col justify-between rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200/80 md:w-72 md:p-7 lg:w-80">
          <div>
            {/* Top Accent Amber Pill */}
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-xl border-b-[3px] border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 px-3 py-1 text-[11px] font-black tracking-wide text-slate-950 uppercase shadow-2xs">
              <Zap className="h-3.5 w-3.5 fill-current" />
              <span>Vocab Bridge • Spoon {spoonNum}</span>
            </div>

            <h2 className="text-2xl font-black tracking-tight text-slate-900">
              Cooldown &amp; Review
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Complete all 5 stages to unlock the next step
            </p>
          </div>

          {/* 3D Stepping-Stone Vertical Track */}
          <div className="relative my-7">
            {/* Background Track Line */}
            <div className="absolute top-5 bottom-5 left-[21px] w-1 rounded-full bg-slate-100">
              <div
                className="w-full rounded-full bg-gradient-to-b from-emerald-400 to-sky-500 transition-all duration-500"
                style={{ height: `${progressPct}%` }}
              />
            </div>

            <div className="relative z-10 flex flex-col gap-4">
              {BRIDGE_STEPS.map((s) => {
                const isCompleted = step > s.id;
                const isActive = step === s.id;
                const Icon = s.icon;

                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-3.5 rounded-2xl p-2 transition-all duration-300 ${
                      isActive
                        ? "bg-sky-50/90 ring-1 ring-sky-200/90 shadow-2xs"
                        : ""
                    }`}
                  >
                    {/* 3D Tactile Node Icon */}
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-black transition-all duration-300 ${
                        isCompleted
                          ? "border-b-[4px] border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-sm shadow-emerald-500/20"
                          : isActive
                            ? "scale-105 border-b-[4px] border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-md shadow-blue-500/25"
                            : "border-b-[3px] border-slate-300 bg-slate-100 text-slate-400"
                      }`}
                    >
                      {isCompleted ? (
                        <Check size={18} strokeWidth={3.5} />
                      ) : (
                        <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm font-black ${
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
                        className={`truncate text-[11px] font-semibold ${
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

          {/* Bottom Progress Footer */}
          <div className="space-y-1.5 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-500">
              <span>Stage {step} of 5</span>
              <span className="text-emerald-600">{progressPct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-500 transition-all duration-500"
                style={{ width: `${Math.max(10, progressPct)}%` }}
              />
            </div>
          </div>
        </div>

        {/* =================================================================
            RIGHT SIDE: MAIN CONTENT STAGE CARD
            ================================================================= */}
        <div className="relative flex min-h-[620px] flex-1 flex-col overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-200/80">
          {isFinishing && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/85 backdrop-blur-xs">
              <Loader2 className="h-9 w-9 animate-spin text-blue-600" />
              <p className="mt-3 text-sm font-black text-slate-800">
                Saving progress &amp; unlocking next step...
              </p>
            </div>
          )}
          {renderStep()}
        </div>
      </div>
    </WordAudioProvider>
  );
}

export function VocabBridgeWrapper({ bridge }: VocabBridgeWrapperProps) {
  if (!bridge) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold text-slate-800">
          Vocab Bridge not found
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          This bridge may not exist or does not belong to your account.
        </p>
      </div>
    );
  }

  return (
    <MatrixProvider>
      <VocabBridgeContent bridge={bridge} />
    </MatrixProvider>
  );
}