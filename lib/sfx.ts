// lib/sfx.ts
export type SfxName =
  | "tap"
  | "correct"
  | "wrong"
  | "spark"
  | "round-clear"
  | "victory"
  | "heart-lost"
  | "notify";

const SFX_CONFIG: Record<SfxName, { src: string; volume: number }> = {
  tap: { src: "/sfx/tap.mp3", volume: 0.25 },
  correct: { src: "/sfx/correct.mp3", volume: 0.4 },
  wrong: { src: "/sfx/wrong.mp3", volume: 0.35 },
  spark: { src: "/sfx/spark.mp3", volume: 0.4 },
  "round-clear": { src: "/sfx/round-clear.mp3", volume: 0.45 },
  victory: { src: "/sfx/victory.mp3", volume: 0.5 },
  "heart-lost": { src: "/sfx/heart-lost.mp3", volume: 0.4 },
  notify: { src: "/sfx/notify.mp3", volume: 0.35 },
};

const MUTE_STORAGE_KEY = "spoon-sfx-muted";
const audioCache = new Map<SfxName, HTMLAudioElement>();
let preloaded = false;

export function isSfxMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(MUTE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSfxMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MUTE_STORAGE_KEY, muted ? "1" : "0");
  } catch {
    // Ignore storage errors
  }
}

function getOrCreateAudio(name: SfxName): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  const existing = audioCache.get(name);
  if (existing) return existing;

  const cfg = SFX_CONFIG[name];
  const audio = new Audio(cfg.src);
  audio.preload = "auto";
  audio.volume = cfg.volume;
  audioCache.set(name, audio);
  return audio;
}

/**
 * Call once on mount in your layout or top-level provider to warm all 8 MP3s in memory.
 */
export function preloadSfx(): void {
  if (typeof window === "undefined" || preloaded) return;
  preloaded = true;
  (Object.keys(SFX_CONFIG) as SfxName[]).forEach((name) => {
    const audio = getOrCreateAudio(name);
    audio?.load();
  });
}

/**
 * Plays a sound effect with 0ms delay. Independent of word/TTS audio.
 */
export function playSfx(name: SfxName): void {
  if (typeof window === "undefined" || isSfxMuted()) return;

  try {
    const base = getOrCreateAudio(name);
    if (!base) return;

    // Allow rapid overlapping pops on fast taps without cutting off previous tap
    if (name === "tap" && !base.paused) {
      const clone = base.cloneNode() as HTMLAudioElement;
      clone.volume = SFX_CONFIG[name].volume;
      void clone.play().catch(() => {});
      return;
    }

    base.currentTime = 0;
    void base.play().catch(() => {});
  } catch {
    // Ignore autoplay/browser blocks
  }
}