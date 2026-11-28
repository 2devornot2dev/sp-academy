// context/word-audio-context.tsx
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
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

// Toggle to false once everything is verified working
const DEBUG_WORD_AUDIO = true;

function logDebug(...args: unknown[]) {
  if (DEBUG_WORD_AUDIO) {
    console.log("%c[WordAudio]", "color:#0284c7;font-weight:bold", ...args);
  }
}

function logWarn(...args: unknown[]) {
  console.warn("%c[WordAudio]", "color:#dc2626;font-weight:bold", ...args);
}

const LANG_CODE_MAP: Record<string, string> = {
  french: "fr-FR",
  fr: "fr-FR",
  spanish: "es-ES",
  es: "es-ES",
  english: "en-US",
  en: "en-US",
  german: "de-DE",
  de: "de-DE",
  italian: "it-IT",
  it: "it-IT",
  portuguese: "pt-BR",
  pt: "pt-BR",
};

function normalizeLangCode(raw: string): string {
  const clean = (raw || "fr-FR").trim();
  return LANG_CODE_MAP[clean.toLowerCase()] || clean;
}

// Strip surrounding punctuation while preserving internal apostrophes/hyphens
const cleanRawWord = (w: string) =>
  w
    .normalize("NFC")
    .trim()
    .replace(/^[.,!?;:«»"“”()[\]{}]+|[.,!?;:«»"“”()[\]{}]+$/g, "")
    .trim()
    .toLowerCase();

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
  const urlsRef = useRef<Record<string, string>>({});

  const [activeWord, setActiveWord] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Persistent single Audio instance (prevents Safari/Chrome async gesture blocks)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeCleanupRef = useRef<(() => void) | null>(null);
  const playTokenRef = useRef(0);

  // Keep urlsRef synchronously in sync with state so clicks never read stale state
  useEffect(() => {
    urlsRef.current = urls;
  }, [urls]);

  // Initialize persistent HTMLAudioElement on client mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    return () => {
      playTokenRef.current++;
      activeCleanupRef.current?.();
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
    };
  }, []);

  // Build a fast lookup index from wordAudio by raw, cleaned, unicode-slug, and ascii-slug
  const wordKeyLookup = useMemo(() => {
    const index = new Map<string, { m?: string; f?: string }>();
    if (!wordAudio) return index;

    for (const [rawWord, entry] of Object.entries(wordAudio)) {
      if (!entry || typeof entry !== "object") continue;

      const lower = rawWord.trim().toLowerCase();
      const cleaned = cleanRawWord(rawWord);
      const u = slugUnicode(rawWord);
      const a = slugAscii(rawWord);

      if (lower) index.set(lower, entry);
      if (cleaned) index.set(cleaned, entry);
      if (u) index.set(u, entry);
      if (a) index.set(a, entry);
    }

    logDebug("Indexed wordAudio entries:", {
      providedCount: Object.keys(wordAudio).length,
      indexedKeys: Array.from(index.keys()),
    });

    return index;
  }, [wordAudio]);

  const stopAudio = useCallback(() => {
    playTokenRef.current++;

    // Resolve any pending playUrl promise cleanly as false
    if (activeCleanupRef.current) {
      activeCleanupRef.current();
      activeCleanupRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    setIsPlaying(false);
    setActiveWord(null);
  }, []);

  // Preload presigned URLs for all known wordAudio keys on mount/change
  useEffect(() => {
    if (!wordAudio) {
      logDebug("No wordAudio map passed to WordAudioProvider.");
      return;
    }

    const keys = Array.from(
      new Set(
        Object.values(wordAudio)
          .flatMap((v) => [v?.m, v?.f])
          .filter((k): k is string => Boolean(k)),
      ),
    );

    if (keys.length === 0) return;

    // Separate already-full http(s) URLs from S3 object keys needing presigning
    const directMap: Record<string, string> = {};
    const keysToSign: string[] = [];

    for (const k of keys) {
      if (k.startsWith("http://") || k.startsWith("https://")) {
        directMap[k] = k;
      } else {
        keysToSign.push(k);
      }
    }

    if (Object.keys(directMap).length > 0) {
      setUrls((prev) => {
        const next = { ...prev, ...directMap };
        urlsRef.current = next;
        return next;
      });
    }

    if (keysToSign.length > 0) {
      logDebug("Preloading presigned S3 URLs for keys:", keysToSign);
      getWordAudioUrls(keysToSign)
        .then((newUrls) => {
          logDebug(
            `Preloaded ${Object.keys(newUrls).length}/${keysToSign.length} word URLs`,
          );
          setUrls((prev) => {
            const next = { ...prev, ...newUrls };
            urlsRef.current = next;
            return next;
          });
        })
        .catch((err) => logWarn("Failed to preload word audio:", err));
    }

    return () => {
      stopAudio();
    };
  }, [wordAudio, stopAudio]);

  /**
   * Plays a URL using the persistent HTMLAudioElement and logs exact failure reasons.
   */
  const playUrl = useCallback((url: string, label: string, token: number) => {
    return new Promise<boolean>((resolve) => {
      if (!url || token !== playTokenRef.current) {
        return resolve(false);
      }

      // Ensure a persistent audio element exists
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      const audio = audioRef.current;

      // Clean up any previous listeners
      activeCleanupRef.current?.();

      let settled = false;
      const finish = (ok: boolean, reason?: string) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (ok) {
          logDebug(`Playback finished [${label}]`);
        } else {
          logWarn(`Playback failed [${label}]:`, reason, { url });
        }
        resolve(ok);
      };

      const onEnded = () => finish(true);
      const onError = () => {
        const mediaErr = audio.error;
        finish(
          false,
          `MediaError code=${mediaErr?.code} message="${mediaErr?.message || "unknown"}"`,
        );
      };

      const cleanup = () => {
        audio.removeEventListener("ended", onEnded);
        audio.removeEventListener("error", onError);
        if (activeCleanupRef.current === abortListener) {
          activeCleanupRef.current = null;
        }
      };

      const abortListener = () => finish(false, "Aborted by newer audio/stop");
      activeCleanupRef.current = abortListener;

      audio.addEventListener("ended", onEnded, { once: true });
      audio.addEventListener("error", onError, { once: true });

      try {
        audio.pause();
        audio.src = url;
        audio.currentTime = 0;
        audio.volume = 1;
        audio.muted = false;

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              logDebug(`Playing started [${label}]`, {
                duration: audio.duration,
                readyState: audio.readyState,
              });
            })
            .catch((err: Error) => {
              finish(false, `play() rejected -> ${err.name}: ${err.message}`);
            });
        }
      } catch (err) {
        finish(false, `Exception calling play() -> ${String(err)}`);
      }
    });
  }, []);

  const fallbackApiTts = async (
    text: string,
    gender: "m" | "f",
    token: number,
  ): Promise<boolean> => {
    try {
      logDebug("Attempting Fallback 1 (/api/tts) for:", text);
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
      if (!res.ok || token !== playTokenRef.current) {
        logWarn("/api/tts returned non-OK or stale token:", res.status);
        return false;
      }
      const blob = await res.blob();
      if (token !== playTokenRef.current) return false;
      const blobUrl = URL.createObjectURL(blob);
      const ok = await playUrl(blobUrl, `api-tts:${text}`, token);
      URL.revokeObjectURL(blobUrl);
      return ok;
    } catch (err) {
      logWarn("/api/tts exception:", err);
      return false;
    }
  };

  const fallbackBrowserTTS = (text: string) => {
    logDebug("Attempting Fallback 2 (speechSynthesis) for:", text);
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
    utterance.onerror = (e) => {
      logWarn("speechSynthesis error:", e);
      setIsPlaying(false);
      setActiveWord(null);
    };
    window.speechSynthesis.speak(utterance);
  };

  const lookupEntry = useCallback(
    (text: string) => {
      return (
        wordKeyLookup.get(text.trim().toLowerCase()) ||
        wordKeyLookup.get(cleanRawWord(text)) ||
        wordKeyLookup.get(slugUnicode(text)) ||
        wordKeyLookup.get(slugAscii(text))
      );
    },
    [wordKeyLookup],
  );

  /**
   * Separates explicit `wordAudio` keys (high confidence, usually preloaded)
   * from guessed S3 fallback paths (which require an async Server Action call).
   */
  const resolveTokenCandidates = useCallback(
    (
      rawToken: string,
      gender: "m" | "f",
    ): { explicitKey: string | null; guessedKeys: string[] } => {
      const fromMap = lookupEntry(rawToken);
      let explicitKey: string | null = null;

      if (fromMap) {
        explicitKey =
          (gender === "f" ? fromMap.f || fromMap.m : fromMap.m || fromMap.f) ||
          null;
      }

      const guessedKeys: string[] = [];
      const u = slugUnicode(rawToken);
      const a = slugAscii(rawToken);

      if (u) {
        guessedKeys.push(`foundation/words/${targetLang}/${gender}/${u}.mp3`);
      }
      if (a && a !== u) {
        guessedKeys.push(`foundation/words/${targetLang}/${gender}/${a}.mp3`);
      }

      return {
        explicitKey,
        guessedKeys: guessedKeys.filter((k) => k !== explicitKey),
      };
    },
    [lookupEntry, targetLang],
  );

  const playWord = async (phrase: string, gender: "m" | "f" = "m") => {
    stopAudio();
    const token = playTokenRef.current;

    logDebug(`playWord("${phrase}", "${gender}") triggered`);

    // Ensure persistent audio element exists right inside user click handler
    if (!audioRef.current && typeof window !== "undefined") {
      audioRef.current = new Audio();
    }

    setActiveWord(phrase);
    setIsPlaying(true);

    // 1. Check if the entire phrase exists as a single entry in wordAudio
    const fullEntry = lookupEntry(phrase);
    const fullPhraseKey = fullEntry
      ? gender === "f"
        ? fullEntry.f || fullEntry.m
        : fullEntry.m || fullEntry.f
      : null;

    const rawTokens = fullPhraseKey
      ? [phrase]
      : phrase
          .split(/\s+/)
          .map((t) => cleanRawWord(t) || t.trim())
          .filter(Boolean);

    const tokenPlans = rawTokens.map((t) => ({
      tokenText: t,
      ...resolveTokenCandidates(t, gender),
    }));

    logDebug("Resolved token plans:", tokenPlans);

    let allSucceeded = tokenPlans.length > 0;

    for (const plan of tokenPlans) {
      if (token !== playTokenRef.current) return;
      let tokenPlayed = false;

      // STEP A: Fast-path! If explicitKey URL is ALREADY preloaded (or is http),
      // play IMMEDIATELY with ZERO `await getWordAudioUrls()` delay!
      if (plan.explicitKey) {
        let explicitUrl =
          urlsRef.current[plan.explicitKey] ||
          (plan.explicitKey.startsWith("http") ? plan.explicitKey : undefined);

        if (!explicitUrl) {
          try {
            logDebug("Fetching presigned URL for explicitKey:", plan.explicitKey);
            const fetched = await getWordAudioUrls([plan.explicitKey]);
            if (token !== playTokenRef.current) return;
            urlsRef.current = { ...urlsRef.current, ...fetched };
            setUrls((prev) => ({ ...prev, ...fetched }));
            explicitUrl = fetched[plan.explicitKey];
          } catch (e) {
            logWarn("getWordAudioUrls failed for explicitKey:", e);
          }
        }

        if (explicitUrl) {
          tokenPlayed = await playUrl(
            explicitUrl,
            `explicit:${plan.explicitKey}`,
            token,
          );
        }
      }

      // STEP B: Only sign & try guessed S3 paths if explicitKey didn't exist or failed!
      if (!tokenPlayed && plan.guessedKeys.length > 0) {
        if (token !== playTokenRef.current) return;

        const missingGuesses = plan.guessedKeys.filter(
          (k) => !urlsRef.current[k],
        );

        if (missingGuesses.length > 0) {
          try {
            logDebug("Fetching presigned URLs for guessed keys:", missingGuesses);
            const fetched = await getWordAudioUrls(missingGuesses);
            if (token !== playTokenRef.current) return;
            urlsRef.current = { ...urlsRef.current, ...fetched };
            setUrls((prev) => ({ ...prev, ...fetched }));
          } catch (e) {
            logWarn("getWordAudioUrls failed for guessedKeys:", e);
          }
        }

        for (const guessKey of plan.guessedKeys) {
          if (token !== playTokenRef.current) return;
          const guessUrl = urlsRef.current[guessKey];
          if (!guessUrl) continue;

          const ok = await playUrl(guessUrl, `guessed:${guessKey}`, token);
          if (ok) {
            tokenPlayed = true;
            break;
          }
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