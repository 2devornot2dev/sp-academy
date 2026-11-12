// lib/freestyle/tutors.ts

export type TutorGender = "female" | "male";
export type TutorMood = "default" | "happy" | "thinking" | "encouraging";

export interface FreestyleTutorConfig {
  id: string;
  name: string;
  gender: TutorGender;
  tagline: string;
  coverUrl: string;
  avatars: Record<TutorMood, string>;
  voiceIds: Record<string, string>;
}

export const FREESTYLE_TUTORS: Record<TutorGender, FreestyleTutorConfig> = {
  female: {
    id: "sophie",
    name: "Sophie",
    gender: "female",
    tagline: "Warm Parisian café regular & pronunciation coach",
    coverUrl: "/freestyle-cover.png",
    // 👇 Drop your generated S3/CDN emote URLs here
    avatars: {
      default: "/sprite-f.png",
      happy: "/sprite-f.png",
      thinking: "/sprite-f.png",
      encouraging: "/sprite-f.png",
    },
    // 👇 Drop your per-language Voice IDs here
    voiceIds: {
      "fr-FR": "fr-FR-girl-01",
      "es-ES": "es-ES-girl-01",
      "de-DE": "de-DE-girl-01",
      "it-IT": "it-IT-girl-01",
      "en-US": "en-US-girl-01",
    },
  },
  male: {
    id: "antoine",
    name: "Antoine",
    gender: "male",
    tagline: "Charismatic Lyon radio host & street-smart local",
    coverUrl: "/freestyle-cover.png",
    // 👇 Drop your generated S3/CDN emote URLs here
    avatars: {
      default: "/sprite-m.png",
      happy: "/sprite-m.png",
      thinking: "/sprite-m.png",
      encouraging: "/sprite-m.png",
    },
    // 👇 Drop your per-language Voice IDs here
    voiceIds: {
      "fr-FR": "fr-FR-boy-01",
      "es-ES": "es-ES-boy-01",
      "de-DE": "de-DE-boy-01",
      "it-IT": "it-IT-boy-01",
      "en-US": "en-US-boy-01",
    },
  },
};

export function getFreestyleTutor(
  gender?: string | null,
): FreestyleTutorConfig {
  return gender === "male" ? FREESTYLE_TUTORS.male : FREESTYLE_TUTORS.female;
}

export function getTutorAvatarByMood(
  gender?: string | null,
  mood: TutorMood = "default",
): string {
  const tutor = getFreestyleTutor(gender);
  return tutor.avatars[mood] || tutor.avatars.default;
}

export function getTutorVoiceId(
  gender?: string | null,
  targetLanguage = "fr-FR",
): string {
  const tutor = getFreestyleTutor(gender);
  return (
    tutor.voiceIds[targetLanguage] ||
    `${targetLanguage}-${tutor.gender === "female" ? "girl-01" : "boy-01"}`
  );
}

/**
 * Natural connector words by language for the #5 "💎 Connector Pro" Micro-Win detector
 */
export const CONNECTOR_WORDS_BY_LANG: Record<string, string[]> = {
  fr: [
    "parce que",
    "mais",
    "alors",
    "en fait",
    "d'habitude",
    "cependant",
    "pourtant",
    "donc",
    "quand",
    "aussi",
    "surtout",
    "peut-être",
  ],
  es: [
    "porque",
    "pero",
    "entonces",
    "además",
    "sin embargo",
    "normalmente",
    "cuando",
    "también",
    "aunque",
    "por eso",
  ],
  de: [
    "weil",
    "aber",
    "deshalb",
    "außerdem",
    "eigentlich",
    "wenn",
    "obwohl",
    "trotzdem",
  ],
  it: [
    "perché",
    "però",
    "allora",
    "inoltre",
    "comunque",
    "quando",
    "anche",
    "quindi",
  ],
  en: [
    "because",
    "however",
    "actually",
    "usually",
    "although",
    "therefore",
    "especially",
  ],
};