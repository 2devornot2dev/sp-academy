// components/onboarding/steps/stripe-step.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Play, Square, Volume2 } from "lucide-react";
import {
  SPRITES,
  getLockedSpriteVoices,
  getVoiceOptionForSprite,
  type SpriteSlug,
  type VoiceOption,
} from "../constants";

interface SpriteStepProps {
  nativeLanguage: string;
  targetLanguage: string;
  selectedSprite: SpriteSlug;
  setSelectedSprite: (slug: SpriteSlug) => void;
  selectedNativeVoiceId: string;
  setSelectedNativeVoiceId: (id: string) => void;
  selectedVoiceId: string;
  setSelectedVoiceId: (id: string) => void;
}

export function SpriteStep({
  nativeLanguage,
  targetLanguage,
  selectedSprite,
  setSelectedSprite,
  selectedNativeVoiceId,
  setSelectedNativeVoiceId,
  selectedVoiceId,
  setSelectedVoiceId,
}: SpriteStepProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const activeSpriteMeta =
    SPRITES.find((s) => s.slug === selectedSprite) ?? SPRITES[0];

  const nativeVoice = getVoiceOptionForSprite(
    selectedSprite,
    nativeLanguage || "en-US",
  );
  const targetVoice = getVoiceOptionForSprite(
    selectedSprite,
    targetLanguage || "fr-FR",
  );

  // Automatically lock native + target voice IDs whenever sprite or language changes
  useEffect(() => {
    const locked = getLockedSpriteVoices(
      selectedSprite,
      nativeLanguage || "en-US",
      targetLanguage || "fr-FR",
    );
    if (selectedNativeVoiceId !== locked.nativeVoiceId) {
      setSelectedNativeVoiceId(locked.nativeVoiceId);
    }
    if (selectedVoiceId !== locked.targetVoiceId) {
      setSelectedVoiceId(locked.targetVoiceId);
    }
  }, [
    selectedSprite,
    nativeLanguage,
    targetLanguage,
    selectedNativeVoiceId,
    selectedVoiceId,
    setSelectedNativeVoiceId,
    setSelectedVoiceId,
  ]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  const handlePlaySample = (voice?: VoiceOption) => {
    if (!voice) return;

    if (playingId === voice.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(voice.sampleUrl);
    audioRef.current = audio;
    audio.onended = () => setPlayingId(null);
    audio.play().catch((err) => {
      console.warn("Sample audio missing locally:", err);
      setPlayingId(null);
    });

    setPlayingId(voice.id);
  };

  const handleSelectSprite = (slug: SpriteSlug) => {
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayingId(null);
    }
    setSelectedSprite(slug);
  };

  return (
    <div className="space-y-6">
      {/* 1. Choose Companion (2x2 Grid: Vox, Vivi, Dex, Deva) */}
      <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
        {SPRITES.map((s) => {
          const selected = selectedSprite === s.slug;
          return (
            <button
              key={s.slug}
              type="button"
              onClick={() => handleSelectSprite(s.slug)}
              className={`relative flex flex-col items-center rounded-2xl border-2 p-4 sm:p-5 text-center transition-all duration-200 ${
                selected
                  ? "border-violet-500 bg-violet-50/80 shadow-md shadow-violet-500/10"
                  : "border-gray-100 bg-white shadow-xs hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
              }`}
            >
              <div
                className={`absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full transition ${
                  selected
                    ? "bg-violet-600 text-white"
                    : "border-2 border-gray-200"
                }`}
              >
                {selected && <Check className="h-3.5 w-3.5 stroke-3" />}
              </div>

              <div className="h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-2xl bg-gradient-to-b from-violet-100/60 to-white shadow-sm">
                <img
                  src={s.avatarUrl}
                  alt={s.name}
                  className="h-full w-full object-cover object-top"
                />
              </div>

              <h3 className="mt-3 text-lg sm:text-xl font-extrabold text-gray-900">
                {s.name}
              </h3>
              <span className="mt-1 rounded-full bg-violet-100/80 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-violet-700 uppercase">
                {s.vibe}
              </span>
              <p className="mt-1.5 text-xs font-medium leading-snug text-gray-500">
                {s.tagline}
              </p>
            </button>
          );
        })}
      </div>

      {/* 2. Locked Voice Preview Strip for Selected Companion */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-gray-600 uppercase">
            <Volume2 className="h-4 w-4 text-violet-600" />
            Preview {activeSpriteMeta.name}&apos;s Voice
          </span>
          <span className="text-[11px] font-medium text-gray-400">
            Voice is matched to your guide
          </span>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {nativeVoice && (
            <button
              type="button"
              onClick={() => handlePlaySample(nativeVoice)}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                playingId === nativeVoice.id
                  ? "border-violet-400 bg-violet-50"
                  : "border-gray-100 bg-gray-50/70 hover:border-violet-200 hover:bg-violet-50/40"
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${
                  playingId === nativeVoice.id
                    ? "bg-violet-600 text-white shadow-sm"
                    : "bg-violet-100 text-violet-700"
                }`}
              >
                {playingId === nativeVoice.id ? (
                  <Square className="h-3.5 w-3.5 fill-current" />
                ) : (
                  <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-900">
                  Coaching Voice ({nativeLanguage || "en-US"})
                </p>
                <p className="truncate text-[11px] text-gray-500 italic">
                  &ldquo;{nativeVoice.sampleText}&rdquo;
                </p>
              </div>
            </button>
          )}

          {targetVoice && (
            <button
              type="button"
              onClick={() => handlePlaySample(targetVoice)}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                playingId === targetVoice.id
                  ? "border-sky-400 bg-sky-50"
                  : "border-gray-100 bg-gray-50/70 hover:border-sky-200 hover:bg-sky-50/40"
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${
                  playingId === targetVoice.id
                    ? "bg-sky-600 text-white shadow-sm"
                    : "bg-sky-100 text-sky-700"
                }`}
              >
                {playingId === targetVoice.id ? (
                  <Square className="h-3.5 w-3.5 fill-current" />
                ) : (
                  <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-900">
                  Target Language ({targetLanguage || "fr-FR"})
                </p>
                <p className="truncate text-[11px] text-gray-500 italic">
                  &ldquo;{targetVoice.sampleText}&rdquo;
                </p>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}