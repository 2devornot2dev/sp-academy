// lib/sprites/voices.ts

export type SpriteSlug = "vox" | "vivi" | "dex" | "deva";

export type VoiceOption = {
  id: string;          // Clean ID stored in DB: "fr-FR-boy-01", "fr-FR-dex-01", etc.
  fishVoiceId: string; // Real Fish Audio reference_id hash
  sprite: SpriteSlug;
  label: string;
  sampleUrl: string;
  sampleText: string;
};

export const SPRITE_VOICE_SUFFIX: Record<SpriteSlug, string> = {
  vox: "boy-01",
  vivi: "girl-01",
  dex: "dex-01",
  deva: "deva-01",
};

export const SPRITE_VOICES: Record<string, VoiceOption[]> = {
  "fr-FR": [
    {
      id: "fr-FR-boy-01",
      fishVoiceId: "d99596e8405d4651bcd3ebe45df58f97",
      sprite: "vox",
      label: "Vox • Upbeat & Street",
      sampleUrl: "/samples/fr-FR-boy-01.mp3",
      sampleText: "Salut ! Moi c'est Vox, prêt à maîtriser le français ?",
    },
    {
      id: "fr-FR-girl-01",
      fishVoiceId: "5e55054ca1924b81ac69a1590574370e",
      sprite: "vivi",
      label: "Vivi • Bright & Friendly",
      sampleUrl: "/samples/fr-FR-girl-01.mp3",
      sampleText: "Coucou ! C'est Vivi. Mets tes écouteurs, on commence !",
    },
    {
      id: "fr-FR-dex-01",
      fishVoiceId: "f69bca092b674168a8d02d61ca20943c",
      sprite: "dex",
      label: "Dex • Sharp & Chill",
      sampleUrl: "/samples/fr-FR-dex-01.mp3",
      sampleText: "Salut ! Moi c'est Dex. On va rendre ton français super naturel.",
    },
    {
      id: "fr-FR-deva-01",
      fishVoiceId: "723b9112e8bc4422889a13f9146a38c6",
      sprite: "deva",
      label: "Deva • Confident & Playful",
      sampleUrl: "/samples/fr-FR-deva-01.mp3",
      sampleText: "Hey ! C'est Deva. Prêt à parler français avec style ?",
    },
  ],
  "es-ES": [
    {
      id: "es-ES-boy-01",
      fishVoiceId: "37d28ffbfe0b483da35fef6c72ad70a6",
      sprite: "vox",
      label: "Vox • Upbeat & Street",
      sampleUrl: "/samples/es-ES-boy-01.mp3",
      sampleText: "¡Hola! Soy Vox, ¿listo para dominar el español?",
    },
    {
      id: "es-ES-girl-01",
      fishVoiceId: "0118a35dcb604837abe7961a43e13ba8",
      sprite: "vivi",
      label: "Vivi • Bright & Friendly",
      sampleUrl: "/samples/es-ES-girl-01.mp3",
      sampleText: "¡Hola! Soy Vivi. Ponte los auriculares y vamos.",
    },
    {
      id: "es-ES-dex-01",
      fishVoiceId: "30ca8b4d162e463d818bb99101f4857e",
      sprite: "dex",
      label: "Dex • Sharp & Chill",
      sampleUrl: "/samples/es-ES-dex-01.mp3",
      sampleText: "¡Buenas! Soy Dex. Vamos a hacer que suenes súper natural.",
    },
    {
      id: "es-ES-deva-01",
      fishVoiceId: "bfed5c0810a347dbb62e8ccce7f59c48",
      sprite: "deva",
      label: "Deva • Confident & Playful",
      sampleUrl: "/samples/es-ES-deva-01.mp3",
      sampleText: "¡Hey! Soy Deva. ¿Listo para hablar español con estilo?",
    },
  ],
  "en-US": [
    {
      id: "en-US-boy-01",
      fishVoiceId: "4fbed27c40e3465f98bc777fd0cc35ff",
      sprite: "vox",
      label: "Vox • Upbeat & Street",
      sampleUrl: "/samples/en-US-boy-01.mp3",
      sampleText: "Hey! I'm Vox. Ready to level up your speaking skills?",
    },
    {
      id: "en-US-girl-01",
      fishVoiceId: "0a79ef436e91445fb80bd657d3f80ec1",
      sprite: "vivi",
      label: "Vivi • Bright & Friendly",
      sampleUrl: "/samples/en-US-girl-01.mp3",
      sampleText: "Hi there! I'm Vivi. Grab your headphones and let's go!",
    },
    {
      id: "en-US-dex-01",
      fishVoiceId: "75d59e118afa4b589622cd970a34ecea",
      sprite: "dex",
      label: "Dex • Sharp & Chill",
      sampleUrl: "/samples/en-US-dex-01.mp3",
      sampleText: "Yo, I'm Dex. Let's lock in real phrases you'll actually use.",
    },
    {
      id: "en-US-deva-01",
      fishVoiceId: "723c68ed849049db801f2ee885d9f4ff",
      sprite: "deva",
      label: "Deva • Confident & Playful",
      sampleUrl: "/samples/en-US-deva-01.mp3",
      sampleText: "Hey! I'm Deva. Let's get you speaking smoothly from day one!",
    },
  ],
};

// Kept so any older DB rows with man-01 / woman-01 still resolve cleanly
const LEGACY_VOICE_ID_MAP: Record<string, string> = {
  "en-US-man-01": "bf322df2096a46f18c579d0baa36f41d",
  "en-US-woman-01": "933563129e564b19a115bedd57b7406a",
  "fr-FR-man-01": "3bce5f0710f949888abe982ded1ef731",
  "fr-FR-woman-01": "a7a679bc8eb04e09abc7dc8ad3158eb3",
  "es-ES-man-01": "a335d470fff248e8890dce6550a2874b",
  "es-ES-woman-01": "692eb1e1023242219dc8caae8c56fb12",
};

// Auto-generated flat lookup map: { "fr-FR-boy-01": "...", "fr-FR-dex-01": "...", ... }
export const VOICE_ID_MAP: Record<string, string> = {
  ...LEGACY_VOICE_ID_MAP,
  ...Object.fromEntries(
    Object.values(SPRITE_VOICES)
      .flat()
      .map((v) => [v.id, v.fishVoiceId]),
  ),
};

export function normalizeSpriteSlug(slug?: string | null): SpriteSlug {
  const s = (slug || "vox").trim().toLowerCase();
  if (s === "vivi" || s === "dex" || s === "deva") return s;
  return "vox";
}

export function getLockedVoiceId(
  spriteSlug: string | null | undefined,
  languageCode: string,
): string {
  const slug = normalizeSpriteSlug(spriteSlug);
  return `${languageCode}-${SPRITE_VOICE_SUFFIX[slug]}`;
}

export function getLockedSpriteVoices(
  spriteSlug: string | null | undefined,
  nativeLanguage: string,
  targetLanguage: string,
) {
  const slug = normalizeSpriteSlug(spriteSlug);
  const suffix = SPRITE_VOICE_SUFFIX[slug];
  return {
    spriteSlug: slug,
    nativeVoiceId: `${nativeLanguage}-${suffix}`,
    targetVoiceId: `${targetLanguage}-${suffix}`,
  };
}

export function getVoiceOptionForSprite(
  spriteSlug: string | null | undefined,
  languageCode: string,
): VoiceOption | undefined {
  const slug = normalizeSpriteSlug(spriteSlug);
  const langList = SPRITE_VOICES[languageCode] || SPRITE_VOICES["en-US"];
  return langList.find((v) => v.sprite === slug) || langList[0];
}

/**
 * Resolves a clean voice code ("fr-FR-dex-01") OR a raw Fish Audio hash
 * into a guaranteed Fish Audio reference_id.
 */
export function resolveFishVoiceId(
  voiceCodeOrHash?: string | null,
  fallbackCode = "en-US-boy-01",
): string {
  if (!voiceCodeOrHash) {
    return VOICE_ID_MAP[fallbackCode];
  }
  if (VOICE_ID_MAP[voiceCodeOrHash]) {
    return VOICE_ID_MAP[voiceCodeOrHash];
  }
  if (/^[a-f0-9]{32}$/i.test(voiceCodeOrHash)) {
    return voiceCodeOrHash;
  }
  return VOICE_ID_MAP[fallbackCode];
}