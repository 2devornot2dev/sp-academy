// components/onboarding/constants.ts

import type { SpriteSlug } from "@/lib/sprites/voices";

export {
  type SpriteSlug,
  type VoiceOption,
  SPRITE_VOICES,
  VOICE_ID_MAP,
  resolveFishVoiceId,
  getLockedSpriteVoices,
  getVoiceOptionForSprite,
} from "@/lib/sprites/voices";

export const LANGUAGES = [
  { name: "English", flag: "🇬🇧" },
  { name: "French", flag: "🇫🇷" },
  { name: "Spanish", flag: "🇪🇸" },
];

export const LEVELS = [
  { name: "Beginner", description: "I'm just getting started" },
  { name: "Elementary", description: "I know some basics" },
  { name: "Intermediate", description: "I can hold simple conversations" },
];

export const GOALS = [
  "Speaking",
  "Listening",
  "Reading",
  "Writing",
  "Everything",
];

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export { USERNAME_RE } from "@/lib/username-validation";

export const SPRITES: Array<{
  slug: SpriteSlug;
  name: string;
  avatarUrl: string;
  vibe: string;
  tagline: string;
}> = [
  {
    slug: "vox",
    name: "Vox",
    avatarUrl: "/sprite-m.png",
    vibe: "Playful • Youthful",
    tagline: "High-energy mic master who keeps your pronunciation sharp.",
  },
  {
    slug: "vivi",
    name: "Vivi",
    avatarUrl: "/sprite-f.png",
    vibe: "Warm • Youthful",
    tagline: "Chill audio-obsessed guide who breaks down tricky phrases.",
  },
  {
    slug: "dex",
    name: "Dex",
    avatarUrl: "/sprite-dex.png",
    vibe: "Sharp • Young Adult",
    tagline: "Clever, calm strategist who gets you sounding smooth and natural.",
  },
  {
    slug: "deva",
    name: "Deva",
    avatarUrl: "/sprite-deva.png",
    vibe: "Bold • Young Adult",
    tagline: "Confident, playful hype coach who makes speaking feel effortless.",
  },
];

export const LANGUAGE_LOCALE_MAP: Record<string, string> = {
  English: "en-US",
  French: "fr-FR",
  Spanish: "es-ES",
  German: "de-DE",
  Italian: "it-IT",
  Portuguese: "pt-BR",
  Japanese: "ja-JP",
  Korean: "ko-KR",
  Chinese: "zh-CN",
  Russian: "ru-RU",
  Arabic: "ar-SA",
};