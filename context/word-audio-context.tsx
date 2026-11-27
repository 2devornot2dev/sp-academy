// context/word-audio-context.tsx
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getWordAudioUrls } from "@/app/actions/word-audio";

type WordAudioMap = Record<string, { m?: string; f?: string }>;

interface WordAudioContextType {
  playWord: (phrase: string, gender?: "m" | "f") => Promise<void>;
  stopAudio: () => void;
  activeWord: string | null;
  isPlaying: boolean;
  targetLang: string;
}

const WordAudioContext = createContext<WordAudioContextType | null>(null);

const LANG_CODE_MAP: Record<string, string> = {
  french: "fr-FR",
  fr: "fr-FR",
  spanish: "es-ES",
  es: "es-ES",
  english: "en-US",
  en: "en-US",
};

function normalizeLangCode(raw: string): string {
  const clean = (raw || "fr-FR").trim();
  return LANG_CODE_MAP[clean.toLowerCase()] || clean;
}

// Keeps unicode letters (matches NFC keys)
const slugUnicode = (w: string) =>
  w
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^\p{L}\p{N}_\s-]/gu, "")
    .replace(/\s+/g, "_")
    .replace(/^_+|_+$/g, "");

// Strips accents to ASCII (matches Python unicodedata.normalize("NFKD") keys)
const slugAscii = (w: string) =>
  w
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9_\s-]/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/^_+|_+$/g, "");

export function WordAudioProvider({
  children,
  wordAudio,
  targetLang: rawTargetLang,
}: {
  children: React.ReactNode;
  wordAudio?: WordAudioMap;
  targetLang: string;
}) {
  const targetLang = useMemo(
    () => normalizeLangCode(rawTargetLang),
    [rawTargetLang],
  );

  const [urls, setUrls] = useState<Record<string, string>>({});
  const [activeWord, setActiveWord] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playTokenRef = useRef(0);

  // Build a fast lookup index from wordAudio by raw, unicode-slug, and ascii-slug
  const wordKeyLookup = useMemo(() => {
    const index = new Map<string, { m?: string; f?: string }>();
    if (!wordAudio) return index;

    for (const [rawWord, entry] of Object.entries(wordAudio)) {
      if (!entry || typeof entry !== "object") continue;
      const clean = rawWord.trim().toLowerCase();
      index.set(clean, entry);
      const u = slugUnicode(rawWord);
      if (u) index.set(u, entry);
      const a = slugAscii(rawWord);
      if (a) index.set(a, entry);
    }
    return index;
  }, [wordAudio]);

  useEffect(() => {
    if (!wordAudio) return;

    const keys = Object.values(wordAudio)
      .flatMap((v) => [v?.m, v?.f])
      .filter((k): k is string => Boolean(k));

    if (keys.length === 0) return;

    getWordAudioUrls(keys)
      .then((newUrls) => setUrls((prev) => ({ ...prev, ...newUrls })))
      .catch((err) => console.warn("Failed to preload word audio:", err));

    return () => {
      stopAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordAudio]);

  const stopAudio = () => {
    playTokenRef.current++;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setActiveWord(null);
  };

  const playUrl = (url: string) =>
    new Promise<boolean>((resolve) => {
      if (!url) return resolve(false);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => resolve(true);
      audio.onerror = () => resolve(false);
      audio.play().catch(() => resolve(false));
    });

  const fallbackApiTts = async (
    text: string,
    gender: "m" | "f",
    token: number,
  ): Promise<boolean> => {
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          language: targetLang,
          speed: 0.95,
          gender: gender === "f" ? "female" : "male",
        }),
      });
      if (!res.ok || token !== playTokenRef.current) return false;
      const blob = await res.blob();
      if (token !== playTokenRef.current) return false;
      const blobUrl = URL.createObjectURL(blob);
      const ok = await playUrl(blobUrl);
      URL.revokeObjectURL(blobUrl);
      return ok;
    } catch {
      return false;
    }
  };

  const fallbackBrowserTTS = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setIsPlaying(false);
      setActiveWord(null);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = targetLang;
    utterance.onend = () => {
      setIsPlaying(false);
      setActiveWord(null);
    };
    utterance.onerror = () => {
      setIsPlaying(false);
      setActiveWord(null);
    };
    window.speechSynthesis.speak(utterance);
  };

  const resolveTokenCandidateKeys = (
    rawToken: string,
    gender: "m" | "f",
  ): string[] => {
    const candidates: string[] = [];

    // 1. Exact key from lessonHandoff.wordAudio if present
    const fromMap =
      wordKeyLookup.get(rawToken.trim().toLowerCase()) ||
      wordKeyLookup.get(slugUnicode(rawToken)) ||
      wordKeyLookup.get(slugAscii(rawToken));

    if (fromMap) {
      const preferred = gender === "f" ? fromMap.f || fromMap.m : fromMap.m || fromMap.f;
      if (preferred) candidates.push(preferred);
    }

    // 2. Standard S3 paths (both unicode and ASCII-normalized)
    const u = slugUnicode(rawToken);
    const a = slugAscii(rawToken);
    if (u) {
      candidates.push(`foundation/words/${targetLang}/${gender}/${u}.mp3`);
    }
    if (a && a !== u) {
      candidates.push(`foundation/words/${targetLang}/${gender}/${a}.mp3`);
    }

    return Array.from(new Set(candidates));
  };

  const playWord = async (phrase: string, gender: "m" | "f" = "m") => {
    stopAudio();
    const token = playTokenRef.current;

    setActiveWord(phrase);
    setIsPlaying(true);

    // First check if the entire phrase exists as a single entry in wordAudio
    const fullEntry =
      wordKeyLookup.get(phrase.trim().toLowerCase()) ||
      wordKeyLookup.get(slugUnicode(phrase)) ||
      wordKeyLookup.get(slugAscii(phrase));
    const fullPhraseKey = fullEntry
      ? gender === "f"
        ? fullEntry.f || fullEntry.m
        : fullEntry.m || fullEntry.f
      : null;

    const rawTokens = fullPhraseKey
      ? [phrase]
      : phrase.split(/\s+/).filter(Boolean);

    const candidateGroups = rawTokens.map((t) =>
      resolveTokenCandidateKeys(t, gender),
    );
    const allCandidateKeys = candidateGroups.flat();

    let map = urls;
    const missing = allCandidateKeys.filter((k) => !map[k]);
    if (missing.length > 0) {
      try {
        const fetched = await getWordAudioUrls(missing);
        map = { ...map, ...fetched };
        setUrls((prev) => ({ ...prev, ...fetched }));
      } catch (e) {
        console.warn("[wordAudio] on-demand fetch failed", e);
      }
      if (token !== playTokenRef.current) return;
    }

    // Play each token using the first candidate URL that succeeds
    let allSucceeded = candidateGroups.length > 0;
    for (const group of candidateGroups) {
      if (token !== playTokenRef.current) return;
      let tokenPlayed = false;
      for (const key of group) {
        const url = map[key];
        if (!url) continue;
        // If it's already a full http URL or presigned URL, try playing it
        const ok = await playUrl(url);
        if (ok) {
          tokenPlayed = true;
          break;
        }
      }
      if (!tokenPlayed) {
        allSucceeded = false;
        break;
      }
    }

    if (allSucceeded) {
      if (token === playTokenRef.current) {
        setIsPlaying(false);
        setActiveWord(null);
      }
      return;
    }

    // Fallback 1: /api/tts (Fish Audio)
    if (token === playTokenRef.current) {
      const ttsOk = await fallbackApiTts(phrase, gender, token);
      if (ttsOk) {
        if (token === playTokenRef.current) {
          setIsPlaying(false);
          setActiveWord(null);
        }
        return;
      }
    }

    // Fallback 2: Browser speechSynthesis
    if (token === playTokenRef.current) {
      fallbackBrowserTTS(phrase);
    }
  };

  return (
    <WordAudioContext.Provider
      value={{ playWord, stopAudio, activeWord, isPlaying, targetLang }}
    >
      {children}
    </WordAudioContext.Provider>
  );
}

export function useWordAudio() {
  const ctx = useContext(WordAudioContext);
  if (!ctx) {
    throw new Error("useWordAudio must be used within a WordAudioProvider");
  }
  return ctx;
}