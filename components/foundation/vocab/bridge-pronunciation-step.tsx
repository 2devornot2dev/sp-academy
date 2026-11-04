"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Mic,
  ArrowRight,
  Activity,
  AlertCircle,
  CheckCircle2,
  Ear,
  Volume2,
  Loader2,
  RotateCcw,
  Sparkles,
  Lock,
  X,
} from "lucide-react";
import { usePronunciation } from "@/context/pronunciation-context";
import { useWordAudio } from "@/context/word-audio-context";
import { useMatrix } from "@/context/matrix-context";
import { useSpeakWord, cleanWord } from "@/components/foundation/word-tap";

type WordResult = { score: number; omitted: boolean };
type VoicePhase = "waiting" | "speaking" | "wrapping_up";

const PASSING_SCORE = 65;
const MAX_REQUIRED_ATTEMPTS = 2; // Unlocks after 2 tries even if mic is noisy

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

export function BridgePronunciationStep({
  data,
  onNext,
}: {
  data: any;
  onNext: () => void;
}) {
  const { status, isRecording, score, error, assessSpeech, cancelAssessment } =
    usePronunciation();
  const { stopAudio, activeWord, targetLang } = useWordAudio();
  const { trackInteraction } = useMatrix();
  const speak = useSpeakWord();

  const [voicePhase, setVoicePhase] = useState<VoicePhase>("waiting");
  const [attemptsCount, setAttemptsCount] = useState<number>(0);
  const lastTrackedScore = useRef<unknown>(null);

  const isListening = status === "listening";
  const isAnalyzing = status === "analyzing";
  const isBusy = isListening || isAnalyzing || isRecording;

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
    if (!score || score === lastTrackedScore.current) return;
    lastTrackedScore.current = score;
    setAttemptsCount((prev) => prev + 1);

    (data.referenceText ?? "")
      .split(/\s+/)
      .map(cleanWord)
      .filter(Boolean)
      .forEach((w: string) => {
        const r = wordResults.get(w);
        trackInteraction(w, {
          spokenAttempt: true,
          spokenScore: r ? r.score : score.pronunciationScore,
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  // Works even if previous attempt ended in "error" or "done" state!
  const handleStartRecording = () => {
    if (!isBusy) {
      stopAudio();
      assessSpeech(data.referenceText, targetLang);
    }
  };

  const handleNext = () => {
    stopAudio();
    onNext();
  };

  const focusSound = data.focusSounds?.[0];
  const tokens: string[] = (data.referenceText ?? "")
    .split(/\s+/)
    .filter(Boolean);

  const overallScore = score ? Math.round(score.pronunciationScore) : null;
  const hasPassedScore = overallScore !== null && overallScore >= PASSING_SCORE;
  const canContinue =
    hasPassedScore || attemptsCount >= MAX_REQUIRED_ATTEMPTS;

  return (
    <div className="flex h-full flex-col justify-between overflow-y-auto p-6 sm:p-10 animate-in fade-in duration-500">
      {/* 1. Header */}
      <div className="mb-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
          Final Pronunciation Check
        </h2>
        <p className="mt-1.5 text-sm sm:text-base font-medium text-slate-500">
          Say the phrase out loud—tap any word to hear it or retry as many times
          as you like.
        </p>
      </div>

      {/* 2. Target Phrase Stage Card */}
      <div
        className={`relative mb-6 overflow-hidden rounded-3xl border-2 border-b-[6px] bg-white p-8 sm:p-10 text-center transition-all duration-300 ${
          isListening
            ? "border-indigo-500 ring-4 ring-indigo-500/10"
            : isAnalyzing
              ? "border-amber-400 bg-amber-50/10"
              : hasPassedScore
                ? "border-emerald-500 shadow-lg shadow-emerald-500/10"
                : score
                  ? "border-amber-400"
                  : "border-slate-200 shadow-sm"
        }`}
      >
        <Mic
          size={150}
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-100/70"
        />

        {/* Reference sentence: each word is clickable to hear & colored by score */}
        <p className="relative z-10 mb-6 flex flex-wrap justify-center gap-x-2.5 gap-y-2 text-2xl sm:text-4xl font-black leading-snug text-slate-900">
          {tokens.map((token, i) => {
            const r = resultFor(token);
            return (
              <span
                key={i}
                onClick={() => !isBusy && speak(token)}
                title={
                  r
                    ? r.omitted
                      ? "Skipped — tap to hear"
                      : `${Math.round(r.score)}% — tap to hear`
                    : "Tap to hear word"
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

        <div className="relative z-10 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => speak(data.referenceText, { each: true })}
            disabled={isBusy}
            className={`inline-flex items-center gap-2 rounded-xl border-b-[3px] px-4 py-2 text-xs sm:text-sm font-extrabold transition-all disabled:opacity-50 ${
              activeWord === data.referenceText
                ? "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white"
                : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
            }`}
          >
            <Volume2 size={16} /> Listen to Phrase
          </button>

          {focusSound && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-xs sm:text-sm font-extrabold text-purple-700">
              <Ear size={16} /> Focus Sound: {focusSound.sound}
            </div>
          )}
        </div>
      </div>

      {/* 3. Interactive Recorder & Retry Dock */}
      <div className="mb-6 flex flex-col items-center">
        {/* IDLE / READY TO RECORD OR RETRY */}
        {!isListening && !isAnalyzing && (
          <div className="flex w-full flex-col items-center gap-2.5">
            <button
              type="button"
              onClick={handleStartRecording}
              className={`inline-flex w-full sm:w-80 items-center justify-center gap-2.5 rounded-2xl border-b-4 px-6 py-4 text-base sm:text-lg font-black text-white shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-0 ${
                score && !hasPassedScore
                  ? "border-orange-700 bg-gradient-to-b from-amber-400 to-orange-500 text-slate-950 shadow-amber-500/25"
                  : score
                    ? "border-slate-700 bg-gradient-to-b from-slate-700 to-slate-900"
                    : "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 shadow-blue-500/25"
              }`}
            >
              {score || error ? (
                <>
                  <RotateCcw size={20} />
                  <span>
                    {hasPassedScore
                      ? "Practice Again"
                      : "Try Again to Improve Score"}
                  </span>
                </>
              ) : (
                <>
                  <Mic size={22} />
                  <span>Start Speaking</span>
                </>
              )}
            </button>

            <p className="text-xs font-semibold text-slate-400">
              {score && !hasPassedScore
                ? "Tap any red/orange word above to hear it, then tap Try Again!"
                : "Recording stops and grades automatically when you pause"}
            </p>
          </div>
        )}

        {/* LISTENING STATE */}
        {isListening && (
          <div className="flex w-full max-w-md flex-col items-center rounded-3xl border-2 border-indigo-200 bg-indigo-50/60 px-6 py-5 animate-in fade-in zoom-in-95 duration-200">
            <LiveWaveform onPhaseChange={setVoicePhase} />

            <div className="mt-3 flex items-center gap-2 text-sm font-extrabold">
              {voicePhase === "waiting" && (
                <>
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-indigo-500" />
                  <span className="text-indigo-900">
                    Speak the phrase clearly now...
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

        {/* ANALYZING STATE */}
        {isAnalyzing && (
          <div className="flex w-full max-w-md flex-col items-center rounded-3xl border-2 border-amber-200 bg-amber-50/60 px-6 py-6 text-center animate-in fade-in duration-200">
            <Loader2 size={30} className="mb-2 animate-spin text-amber-600" />
            <p className="text-base font-extrabold text-slate-900">
              Analyzing your pronunciation...
            </p>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              Grading word accuracy and syllable stress
            </p>
          </div>
        )}
      </div>

      {/* 4. Score Breakdown Card */}
      {overallScore !== null && !isBusy && (
        <div className="mb-6 rounded-3xl border border-slate-200/80 bg-slate-50/80 p-5 animate-in slide-in-from-bottom-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-500" />
              <span className="text-sm font-black text-slate-900">
                Accuracy Score:
              </span>
              <span
                className={`text-lg font-black ${
                  overallScore >= 80
                    ? "text-emerald-600"
                    : overallScore >= PASSING_SCORE
                      ? "text-amber-600"
                      : "text-rose-600"
                }`}
              >
                {overallScore}%
              </span>
            </div>

            {hasPassedScore ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                <CheckCircle2 size={14} /> Passed!
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">
                Aim for {PASSING_SCORE}%+ (Attempt {attemptsCount}/
                {MAX_REQUIRED_ATTEMPTS})
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap justify-center gap-4 border-t border-slate-200/70 pt-3 text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> 80%+
              Great
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> 60–79%
              Close
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Under
              60% (Tap word to hear)
            </span>
          </div>
        </div>
      )}

      {error && !isBusy && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="shrink-0" />
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

      {/* 5. Footer CTA (Gated until passed or 2 attempts made) */}
      <div className="mt-auto flex justify-end border-t border-slate-100 pt-5">
        <button
          type="button"
          onClick={handleNext}
          disabled={isBusy || !canContinue}
          className={`inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl px-10 py-4 text-base font-black transition-all ${
            !isBusy && canContinue
              ? "border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:brightness-105 active:translate-y-0.5 active:border-b-0"
              : "cursor-not-allowed bg-slate-200/80 text-slate-400"
          }`}
        >
          {!canContinue && <Lock size={16} />}
          <span>Complete Bridge</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}