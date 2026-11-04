import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isValid } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// utils/audioUtils.ts
export function convertToWav(audioData: ArrayBuffer): Uint8Array {
  const numChannels = 1;
  const sampleRate = 44100;
  const bitsPerSample = 16;

  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + audioData.byteLength, true);
  writeString(view, 8, "WAVE");

  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
  view.setUint16(32, numChannels * (bitsPerSample / 8), true);
  view.setUint16(34, bitsPerSample, true);

  writeString(view, 36, "data");
  view.setUint32(40, audioData.byteLength, true);

  const wavFile = new Uint8Array(header.byteLength + audioData.byteLength);
  wavFile.set(new Uint8Array(header), 0);
  wavFile.set(new Uint8Array(audioData), header.byteLength);

  return wavFile;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export function getDeepgramLanguageCode(prismaLanguage: string): string {
  const map: Record<string, string> = {
    ENGLISH: "en-US",
    FRENCH: "fr-FR",
    SPANISH: "es-ES",
    GERMAN: "de-DE",
    ITALIAN: "it-IT",
    JAPANESE: "ja-JP",
    CHINESE: "zh-CN",
  };

  return map[prismaLanguage.toUpperCase()] || "en-US";
}

// ---------------------------------------------------------------------------
// Lesson & Curriculum Helpers
// ---------------------------------------------------------------------------
export function toRoman(num: number): string {
  const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  return roman[num - 1] || num.toString();
}

export function generateDisplayTitles(
  lessons: Array<{ id: string; title?: string | null }>
): Map<string, string> {
  const titleCounts = new Map<string, number>();
  const titleCurrent = new Map<string, number>();
  const displayTitles = new Map<string, string>();

  // 1. Count how many times each base title appears
  lessons.forEach((l) => {
    const t = (l.title || "").trim();
    if (t) titleCounts.set(t, (titleCounts.get(t) || 0) + 1);
  });

  // 2. If a title appears more than once, append I, II, III based on order
  lessons.forEach((l) => {
    const t = (l.title || "").trim();
    if (!t) return;

    const total = titleCounts.get(t) || 1;
    if (total > 1) {
      const current = (titleCurrent.get(t) || 0) + 1;
      titleCurrent.set(t, current);
      displayTitles.set(l.id, `${t} ${toRoman(current)}`);
    } else {
      displayTitles.set(l.id, t);
    }
  });

  return displayTitles;
}




export const formatDate = (value: Date | string | null | undefined): string => {
  if (!value) return "N/A";

  const date = typeof value === "string" ? new Date(value) : value;
  if (!isValid(date)) return "N/A";

  return format(date, "MMM d, yyyy"); // e.g. "Oct 8, 2026"
};

export function vocabWordCount(vocabMoment: unknown): number {
  return Array.isArray(vocabMoment) ? vocabMoment.length : 0;
}