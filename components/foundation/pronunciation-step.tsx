"use client";

import { usePronunciation } from "@/context/pronunciation-context";
import { useSpeak } from "@/hooks/use-speak";
import { useWordAudio } from "@/context/word-audio-context";
import { useMatrix } from "@/context/matrix-context";
import { cleanWord } from "@/components/foundation/word-tap";
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Mic,
  Square,
  Volume2,
  ArrowRight,
  Activity,
  AlertCircle,
  CheckCircle2,
  Ear,
  Loader2,
  RotateCcw,
  Sparkles,
  Lock,
  X,
} from "lucide-react";

type WordResult = { score: number; omitted: boolean };
type VoicePhase = "waiting" | "speaking" | "wrapping_up";

const PASSING_SCORE = 60;
const MAX_REQUIRED_ATTEMPTS = 2;

const tone = (score: number, omitted: boolean) => {
  if (omitted || score < 60)
    return "text-rose-700 bg-rose-100/90 ring-1 ring-rose-300";
  if (score < 80)
    return "text-amber-800 bg-amber-100/90 ring-1 ring-amber-300";
  return "text-emerald-800 bg-emerald-100/90 ring-1 ring-emerald-300";
};

function LiveWaveform({
  onPhaseChange,
}: {
  onPhaseChange?: (phase: VoicePhase) => void;
}) {
  const BAR_COUNT = 28;
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hasSpokenRef = useRef(false);
  const phaseRef = useRef<VoicePhase>("waiting");
  const silenceStartRef = useRef<number | null>(null);

  useEffect(() => {
    let audioCtx: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let rafId: number | null = null;
    let isCancelled = false;

    const setPhase = (next: VoicePhase) => {
      if (phaseRef.current !== next) {
        phaseRef.current = next;
        onPhaseChange?.(next);
      }
    };

    async function setupMic() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        audioCtx = new AudioContextClass();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();

        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.75;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const half = Math.floor(BAR_COUNT / 2);

        const updateWaveform = () => {
          analyser.getByteFrequencyData(dataArray);

          let sum = 0;
          const vocalBins = Math.min(20, dataArray.length);
          for (let i = 1; i < vocalBins; i++) {
            sum += dataArray[i];
          }
          const avg = sum / vocalBins;
          const isSpeakingNow = avg > 18;
          const now = performance.now();

          if (isSpeakingNow) {
            hasSpokenRef.current = true;
            silenceStartRef.current = null;
            setPhase("speaking");
          } else if (hasSpokenRef.current) {
            if (!silenceStartRef.current) {
              silenceStartRef.current = now;
            } else if (now - silenceStartRef.current > 400) {
              setPhase("wrapping_up");
            }
          }

          for (let i = 0; i < half; i++) {
            const value = dataArray[i + 1] ?? 0;
            const normalized = Math.min(1, value / 200);
            const heightPx = Math.max(6, Math.round(normalized * 44));

            const leftIdx = half - 1 - i;
            const rightIdx = half + i;

            const leftBar = barRefs.current[leftIdx];
            const rightBar = barRefs.current[rightIdx];

            if (leftBar) {
              leftBar.style.height = `${heightPx}px`;
              leftBar.style.opacity = `${0.35 + normalized * 0.65}`;
            }
            if (rightBar) {
              rightBar.style.height = `${heightPx}px`;
              rightBar.style.opacity = `${0.35 + normalized * 0.65}`;
            }
          }

          rafId = requestAnimationFrame(updateWaveform);
        };

        rafId = requestAnimationFrame(updateWaveform);
      } catch (err) {
        console.warn("Waveform mic access unavailable:", err);
      }
    }

    setupMic();

    return () => {
      isCancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (audioCtx && audioCtx.state !== "closed") {
        audioCtx.close().catch(() => {});
      }
    };
  }, [onPhaseChange]);

  return (
    <div
      className="flex h-12 items-center justify-center gap-1 px-4"
      aria-hidden="true"
    >
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            barRefs.current[i] = el;
          }}
          style={{ height: "6px", opacity: 0.35 }}
          className="w-1.5 rounded-full bg-indigo-600 transition-[height,opacity] duration-75 ease-out"
        />
      ))}
    </div>
  );
}

export function PronunciationStep({
  data,
  onNext,
}: {
  data: any;
  onNext: () => void;
}) {
  const { speak, isPlaying: isPlayingTTS, stop: stopTTS } = useSpeak();
  const {
    playWord,
    isPlaying: isPlayingWord,
    stopAudio: stopWordAudio,
    targetLang: contextLang,
  } = useWordAudio();
  const {
    status,
    isRecording,
    score,
    error,
    assessSpeech,
    cancelAssessment,
    reset,
  } = usePronunciation();

  const { trackInteraction } = useMatrix();
  const trackedSeen = useRef<Set<string>>(new Set());
  const trackedHeard = useRef<Set<string>>(new Set());
  const lastTrackedScore = useRef<unknown>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [assessedText, setAssessedText] = useState<string | null>(null);
  const [voicePhase, setVoicePhase] = useState<VoicePhase>("waiting");
  const [stepAttempts, setStepAttempts] = useState<number>(0);

  const isListening = status === "listening";
  const isAnalyzing = status === "analyzing";
  const isBusy = isListening || isAnalyzing || isRecording;

  const targetLang = contextLang || data.targetLang || "fr-FR";

  const breakdown = data.breakdown || [];
  const totalSteps = breakdown.length + 1;
  const isFullSentenceStep = currentIndex === breakdown.length;

  const currentText = isFullSentenceStep
    ? data.referenceText
    : breakdown[currentIndex]?.text || "";
  const currentPhonetic = isFullSentenceStep
    ? null
    : breakdown[currentIndex]?.phonetic;
  const currentHint = isFullSentenceStep
    ? "Put it all together!"
    : breakdown[currentIndex]?.hint;

  const activeFocusSound = data.focusSounds?.find((fs: any) =>
    fs.positions?.includes(currentIndex)
  );
  const isAudioActive = isFullSentenceStep ? isPlayingTTS : isPlayingWord;

  const tokens: string[] = (currentText ?? "").split(/\s+/).filter(Boolean);
  const scoreIsForThisStep = !!score && assessedText === currentText;

  useEffect(() => {
    if (!isListening) setVoicePhase("waiting");
  }, [isListening]);

  const wordResults = useMemo(() => {
    const map = new Map<string, WordResult>();
    if (!score) return map;
    for (const w of score.words ?? []) {
      const key = cleanWord(w.word);
      if (!key) continue;
      const omitted = w.errorType === "Omission";
      map.set(key, { score: omitted ? 0 : w.accuracyScore, omitted });
    }
    return map;
  }, [score]);

  const resultFor = (token: string): WordResult | null => {
    if (!score) return null;
    const key = cleanWord(token);
    if (!key) return null;
    return (
      wordResults.get(key) ?? {
        score: score.pronunciationScore,
        omitted: false,
      }
    );
  };

  useEffect(() => {
    tokens.forEach((t) => {
      const key = cleanWord(t);
      if (key && !trackedSeen.current.has(key)) {
        trackInteraction(key, { seen: 1 });
        trackedSeen.current.add(key);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentText]);

  useEffect(() => {
    if (!score || score === lastTrackedScore.current) return;
    if (assessedText !== currentText) return;
    lastTrackedScore.current = score;
    setStepAttempts((prev) => prev + 1);

    tokens.forEach((t) => {
      const key = cleanWord(t);
      if (!key) return;
      const r = wordResults.get(key);
      trackInteraction(key, {
        spokenAttempt: true,
        spokenScore: r ? r.score : score.pronunciationScore,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  const stopAllAudio = () => {
    try {
      stopTTS();
      stopWordAudio();
    } catch (e) {
      console.warn("Error stopping audio:", e);
    }
  };

  useEffect(() => {
    reset();
    setAssessedText(null);
    setVoicePhase("waiting");
    setStepAttempts(0);
    stopAllAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  useEffect(() => {
    return () => stopAllAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartRecording = async () => {
    if (isBusy) return;

    stopAllAudio();

    if (!currentText || !targetLang) {
      return;
    }

    setAssessedText(currentText);
    await assessSpeech(currentText, targetLang);
  };

  const handlePlayAudio = async () => {
    if (isBusy) return;

    if (isAudioActive) {
      stopAllAudio();
      return;
    }

    stopAllAudio();

    tokens.forEach((t) => {
      const key = cleanWord(t);
      if (key && !trackedHeard.current.has(key)) {
        trackInteraction(key, { heard: 1 });
        trackedHeard.current.add(key);
      }
    });

    if (isFullSentenceStep) {
      await speak(currentText, targetLang);
    } else {
      await playWord(currentText, "m");
    }
  };

  const handleNextWord = () => {
    stopAllAudio();
    if (currentIndex < totalSteps - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onNext();
    }
  };

  const overallScore =
    scoreIsForThisStep && score ? Math.round(score.pronunciationScore) : null;
  const hasPassedStep =
    overallScore !== null && overallScore >= PASSING_SCORE;
  const canContinue =
    hasPassedStep || stepAttempts >= MAX_REQUIRED_ATTEMPTS;

  const ScoreBar = ({ label, value }: { label: string; value: number }) => (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-xs font-black tracking-wider uppercase">
        <span className="text-slate-500">{label}</span>
        <span
          className={
            value >= 80
              ? "text-emerald-600"
              : value >= 60
                ? "text-amber-600"
                : "text-rose-600"
          }
        >
          {Math.round(value)}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${
            value >= 80
              ? "bg-emerald-500"
              : value >= 60
                ? "bg-amber-400"
                : "bg-rose-500"
          }`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col justify-between overflow-y-auto p-6 sm:p-10 animate-in fade-in duration-500">
      {/* 1. Header & Segmented Progress */}
      <div className="mb-6 flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <span className="text-[11px] font-black tracking-wider text-blue-600 uppercase">
            {isFullSentenceStep
              ? "Final Step • Full Sentence"
              : `Chunk ${currentIndex + 1} of ${totalSteps - 1}`}
          </span>
          <h2 className="mt-0.5 text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Pronunciation Lab
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {Array.from({ length: totalSteps }).map((_, idx) => (
            <div
              key={idx}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? "w-9 bg-gradient-to-r from-sky-400 to-blue-600"
                  : idx < currentIndex
                    ? "w-5 bg-emerald-500"
                    : "w-5 bg-slate-200"
              }`}
            />
          ))}
        </div>
      </div>

      {/* 2. 3D Target Flashcard Stage */}
      <div
        className={`relative mb-6 overflow-hidden rounded-3xl border-2 border-b-[6px] bg-white p-8 sm:p-10 text-center transition-all duration-300 ${
          isListening
            ? "border-indigo-500 ring-4 ring-indigo-500/10"
            : isAnalyzing
              ? "border-amber-400 bg-amber-50/10"
              : hasPassedStep
                ? "border-emerald-500 shadow-lg shadow-emerald-500/10"
                : scoreIsForThisStep
                  ? "border-amber-400"
                  : "border-slate-200 shadow-sm"
        }`}
      >
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-100/70">
          <Mic size={150} />
        </div>

        <p className="relative z-10 mb-3 flex flex-wrap justify-center gap-x-2.5 gap-y-2 text-3xl sm:text-5xl font-black leading-snug tracking-tight text-slate-900">
          {tokens.map((token, i) => {
            const r = scoreIsForThisStep ? resultFor(token) : null;
            return (
              <span
                key={i}
                onClick={() => !isBusy && playWord(token, "m")}
                title={
                  r
                    ? r.omitted
                      ? "Skipped — tap to hear"
                      : `${Math.round(r.score)}% — tap to hear`
                    : "Tap to hear"
                }
                className={`cursor-pointer rounded-xl px-2.5 py-1 transition-all hover:scale-105 ${
                  r
                    ? `${tone(r.score, r.omitted)} ${
                        r.omitted ? "line-through decoration-2" : ""
                      }`
                    : "hover:bg-sky-50 hover:text-blue-600"
                }`}
              >
                {token}
              </span>
            );
          })}
        </p>

        {currentPhonetic && (
          <p className="relative z-10 mb-5 font-mono text-base sm:text-lg font-bold text-slate-400">
            /{currentPhonetic}/
          </p>
        )}

        <div className="relative z-10 flex flex-wrap items-center justify-center gap-2.5">
          {activeFocusSound && (
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-1.5 text-xs sm:text-sm font-black text-purple-700">
              <Ear size={15} /> Focus: {activeFocusSound.sound}
            </div>
          )}
          {currentHint && (
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-blue-800">
              <Activity size={15} /> {currentHint}
            </div>
          )}
        </div>
      </div>

      {/* 3. Interactive 3D Recorder & Listen Controls */}
      <div className="mb-6 flex flex-col items-center">
        {!isListening && !isAnalyzing && (
          <div className="flex w-full max-w-2xl flex-col items-center gap-2.5">
            <div className="flex w-full flex-col gap-3.5 sm:flex-row">
              {/* 3D Listen Button */}
              <button
                type="button"
                onClick={handlePlayAudio}
                disabled={isBusy}
                className={`flex-1 inline-flex items-center justify-center gap-2.5 rounded-2xl border-2 border-b-4 px-6 py-4 text-base font-black transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-2 disabled:opacity-50 ${
                  isAudioActive
                    ? "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-md"
                    : "border-slate-200 border-b-slate-300 bg-white text-slate-800 hover:border-sky-400 hover:bg-sky-50/40"
                }`}
              >
                {isAudioActive ? (
                  <Square size={20} className="fill-current" />
                ) : (
                  <Volume2 size={22} className="text-blue-600" />
                )}
                <span>{isAudioActive ? "Stop Audio" : "1. Listen"}</span>
              </button>

              {/* 3D Speak / Retry Button */}
              <button
                type="button"
                onClick={handleStartRecording}
                className={`flex-1 inline-flex items-center justify-center gap-2.5 rounded-2xl border-b-4 px-6 py-4 text-base font-black text-white shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-0 ${
                  scoreIsForThisStep && !hasPassedStep
                    ? "border-orange-700 bg-gradient-to-b from-amber-400 to-orange-500 text-slate-950 shadow-amber-500/25"
                    : scoreIsForThisStep
                      ? "border-slate-700 bg-gradient-to-b from-slate-700 to-slate-900"
                      : "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 shadow-blue-500/25"
                }`}
              >
                {scoreIsForThisStep || error ? (
                  <>
                    <RotateCcw size={20} />
                    <span>
                      {hasPassedStep ? "Practice Again" : "Try Again"}
                    </span>
                  </>
                ) : (
                  <>
                    <Mic size={22} />
                    <span>2. Start Speaking</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-center text-xs font-semibold text-slate-400">
              Recording stops and scores automatically as soon as you pause
            </p>
          </div>
        )}

        {/* LISTENING WAVEFORM */}
        {isListening && (
          <div className="flex w-full max-w-md flex-col items-center rounded-3xl border-2 border-indigo-200 bg-indigo-50/60 px-6 py-5 animate-in fade-in zoom-in-95 duration-200">
            <LiveWaveform onPhaseChange={setVoicePhase} />

            <div className="mt-3 flex items-center gap-2 text-sm font-extrabold">
              {voicePhase === "waiting" && (
                <>
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-indigo-500" />
                  <span className="text-indigo-900">
                    {isFullSentenceStep
                      ? "Speak the sentence clearly now..."
                      : "Say the chunk clearly now..."}
                  </span>
                </>
              )}

              {voicePhase === "speaking" && (
                <>
                  <span className="h-2.5 w-2.5 animate-ping rounded-full bg-emerald-500" />
                  <span className="text-emerald-700">
                    Hearing you — pause when you&apos;re done
                  </span>
                </>
              )}

              {voicePhase === "wrapping_up" && (
                <>
                  <Sparkles
                    size={16}
                    className="animate-spin text-indigo-600"
                  />
                  <span className="text-indigo-700">
                    Got it! Scoring your pronunciation...
                  </span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={cancelAssessment}
              className="mt-3 inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-bold text-slate-500 hover:bg-slate-200/60 hover:text-slate-800"
            >
              <X size={14} /> Cancel
            </button>
          </div>
        )}

        {/* ANALYZING */}
        {isAnalyzing && (
          <div className="flex w-full max-w-md flex-col items-center rounded-3xl border-2 border-amber-200 bg-amber-50/60 px-6 py-6 text-center animate-in fade-in duration-200">
            <Loader2 size={30} className="mb-2 animate-spin text-amber-600" />
            <p className="text-base font-extrabold text-slate-900">
              Analyzing your pronunciation...
            </p>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              Grading accuracy, fluency, and syllable stress
            </p>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && !isBusy && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="shrink-0" size={18} />
            <p>{error}</p>
          </div>
          <button
            type="button"
            onClick={handleStartRecording}
            className="shrink-0 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-black text-white hover:bg-rose-700"
          >
            Retry Mic
          </button>
        </div>
      )}

      {/* 4. Score Breakdown Card */}
      {scoreIsForThisStep && score && !isBusy && (
        <div className="mb-6 rounded-3xl border border-slate-200/80 bg-slate-50/80 p-5 animate-in slide-in-from-bottom-3">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="text-blue-600" size={20} />
              <h3 className="text-sm font-black text-slate-900 uppercase">
                Voice Telemetry
              </h3>
            </div>
            {hasPassedStep ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                <CheckCircle2 size={14} /> Great job!
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">
                Aim for {PASSING_SCORE}%+ (Attempt {stepAttempts}/
                {MAX_REQUIRED_ATTEMPTS})
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ScoreBar label="Overall" value={score.pronunciationScore} />
            <ScoreBar label="Accuracy" value={score.accuracyScore} />
            <ScoreBar label="Fluency" value={score.fluencyScore} />
          </div>
        </div>
      )}

      {/* 5. Footer Navigation */}
      <div className="mt-auto flex justify-end border-t border-slate-100 pt-5">
        <button
          type="button"
          onClick={handleNextWord}
          disabled={isBusy || !canContinue}
          className={`inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl px-8 py-4 text-base font-black transition-all ${
            !isBusy && canContinue
              ? "border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0"
              : "cursor-not-allowed bg-slate-200/80 text-slate-400"
          }`}
        >
          {!canContinue && <Lock size={16} />}
          <span>
            {isFullSentenceStep ? "Next: Listening Focus" : "Next Chunk"}
          </span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}