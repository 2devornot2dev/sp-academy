// components/onboarding/steps/stripe-step.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Play, Square, Volume2 } from "lucide-react";
import {
  SPRITES,
  SPRITE_VOICES,
  type SpriteSlug,
  type VoiceOption,
} from "../constants";
import { SelectionCard } from "../selection-card";

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

  const nativeLocaleVoices =
    SPRITE_VOICES[nativeLanguage] ?? SPRITE_VOICES["en-US"];
  const nativeVoices = nativeLocaleVoices.filter(
    (v) => v.sprite === selectedSprite,
  );

  const targetLocaleVoices =
    SPRITE_VOICES[targetLanguage] ?? SPRITE_VOICES["fr-FR"];
  const targetVoices = targetLocaleVoices.filter(
    (v) => v.sprite === selectedSprite,
  );

  // Auto-select first matching native & target voice when toggling Vox / Vivi
  useEffect(() => {
    if (
      !nativeVoices.some((v) => v.id === selectedNativeVoiceId) &&
      nativeVoices[0]
    ) {
      setSelectedNativeVoiceId(nativeVoices[0].id);
    }
  }, [
    selectedSprite,
    nativeLanguage,
    nativeVoices,
    selectedNativeVoiceId,
    setSelectedNativeVoiceId,
  ]);

  useEffect(() => {
    if (!targetVoices.some((v) => v.id === selectedVoiceId) && targetVoices[0]) {
      setSelectedVoiceId(targetVoices[0].id);
    }
  }, [
    selectedSprite,
    targetLanguage,
    targetVoices,
    selectedVoiceId,
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

  const handlePlaySample = (
    voice: VoiceOption,
    onSelect: (id: string) => void,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    onSelect(voice.id);

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

  const coachName = selectedSprite === "vox" ? "Vox" : "Vivi";

  return (
    <div className="space-y-7">
      {/* 1. Choose Companion: Vox vs Vivi */}
      <div className="grid gap-4 sm:grid-cols-2">
        {SPRITES.map((s) => {
          const selected = selectedSprite === s.slug;
          return (
            <button
              key={s.slug}
              type="button"
              onClick={() => setSelectedSprite(s.slug)}
              className={`relative flex flex-col items-center rounded-2xl border p-6 text-center transition-all duration-200 ${
                selected
                  ? "border-violet-400 bg-violet-50 shadow-md shadow-violet-500/10"
                  : "border-gray-100 bg-white shadow-xs hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
              }`}
            >
              <div
                className={`absolute top-4 right-4 flex h-6 w-6 items-center justify-center rounded-full transition ${
                  selected
                    ? "bg-violet-600 text-white"
                    : "border-2 border-gray-200"
                }`}
              >
                {selected && <Check className="h-4 w-4 stroke-3" />}
              </div>

              <div className="h-24 w-24 overflow-hidden rounded-2xl bg-gradient-to-b from-violet-100/60 to-white shadow-sm">
                <img
                  src={s.avatarUrl}
                  alt={s.name}
                  className="h-full w-full object-cover object-top"
                />
              </div>

              <h3 className="mt-3 text-xl font-extrabold text-gray-900">
                {s.name}
              </h3>
              <p className="mt-1 text-xs font-medium text-gray-500">
                {s.tagline}
              </p>
            </button>
          );
        })}
      </div>

      {/* 2. Choose Native Coaching Voice */}
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-gray-500 uppercase">
            <Volume2 className="h-4 w-4 text-violet-600" />
            {coachName}&apos;s Native Coaching Voice
          </span>
          <span className="text-xs font-medium text-gray-400">
            For intros &amp; tips
          </span>
        </div>

        <div className="grid gap-3">
          {nativeVoices.map((v) => {
            const isPlaying = playingId === v.id;
            return (
              <SelectionCard
                key={v.id}
                selected={selectedNativeVoiceId === v.id}
                onClick={() => setSelectedNativeVoiceId(v.id)}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) =>
                    handlePlaySample(v, setSelectedNativeVoiceId, e)
                  }
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${
                    isPlaying
                      ? "bg-violet-600 text-white shadow-md shadow-violet-500/30"
                      : "bg-violet-100 text-violet-700 hover:bg-violet-200"
                  }`}
                >
                  {isPlaying ? (
                    <Square className="h-3.5 w-3.5 fill-current" />
                  ) : (
                    <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-900">{v.label}</p>
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-gray-500">
                      {v.id}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs font-medium text-gray-500 italic">
                    &ldquo;{v.sampleText}&rdquo;
                  </p>
                </div>
              </SelectionCard>
            );
          })}
        </div>
      </div>

      {/* 3. Choose Target Language Voice */}
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-gray-500 uppercase">
            <Volume2 className="h-4 w-4 text-sky-600" />
            {coachName}&apos;s Target Language Voice
          </span>
          <span className="text-xs font-medium text-gray-400">
            For lessons &amp; audio drills
          </span>
        </div>

        <div className="grid gap-3">
          {targetVoices.map((v) => {
            const isPlaying = playingId === v.id;
            return (
              <SelectionCard
                key={v.id}
                selected={selectedVoiceId === v.id}
                onClick={() => setSelectedVoiceId(v.id)}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => handlePlaySample(v, setSelectedVoiceId, e)}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${
                    isPlaying
                      ? "bg-sky-600 text-white shadow-md shadow-sky-500/30"
                      : "bg-sky-100 text-sky-700 hover:bg-sky-200"
                  }`}
                >
                  {isPlaying ? (
                    <Square className="h-3.5 w-3.5 fill-current" />
                  ) : (
                    <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-900">{v.label}</p>
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-gray-500">
                      {v.id}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs font-medium text-gray-500 italic">
                    &ldquo;{v.sampleText}&rdquo;
                  </p>
                </div>
              </SelectionCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}