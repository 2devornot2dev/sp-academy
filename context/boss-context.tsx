// context/boss-context.tsx
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useVoiceAssistant,
  useDataChannel,
  useLocalParticipant,
} from "@livekit/components-react";
import { useSpeak } from "@/hooks/use-speak";
import { toast } from "sonner";

export type ExerciseType =
  | "CONVERSATION"
  | "MULTIPLE_CHOICE"
  | "SENTENCE_BUIL"
  | "SENTENCE_BUILDER"
  | "PRONUNCIATION"
  | "LISTEN_SENTENCE_BUILDER"
  | "LISTEN_PICTURE_SELECTOR";

export type BossMood = "default" | "happy" | "sad" | "angry";

export interface BossAvatar {
  default?: string | null;
  happy?: string | null;
  sad?: string | null;
  angry?: string | null;
}

export interface ImageOption {
  label: string;
  imageKey: string;
}

export interface PlaylistItem {
  id: string;
  type: ExerciseType;
  instruction: string;
  sourceLessonId?: string | null;
  question?: string | null;
  options?: string[] | null;
  correctAnswer?: string | string[] | null;
  scrambledWords?: string[] | null;
  targetText?: string | null;
  audioKey?: string | null;
  imageOptions?: ImageOption[] | null;
}

export interface BossPersona {
  name: string;
  persona: string;
  introMessage: string;
  appearance?: string | null;
  sceneDescription?: string | null;
  avatarKey?: string | null;
  coverUrl?: string | null;
  avatar?: BossAvatar | null;
}

export interface BossMessage {
  id: number | string;
  role: "assistant" | "user" | "exercise" | "system";
  text?: string;
  translation?: string;
  exercise?: PlaylistItem;
  status?: "pending" | "correct" | "incorrect";
  mood?: BossMood;
  isAnalyzingPronunciation?: boolean;
  pronunciationScore?: {
    accuracyScore: number;
    fluencyScore: number;
    score: number;
    words?: Array<{ word: string; accuracyScore: number }>;
  };
}

export type StageStatus = "PLAYING" | "PASSED" | "FAILED";

interface BossFoundationContextType {
  session: any;
  boss: BossPersona | null;
  messages: BossMessage[];

  bossMood: BossMood;
  bossAvatarUrl: string;
  bossCoverUrl: string;
  getBossAvatarUrl: (mood?: BossMood) => string;

  chances: number;
  xp: number;
  score: number;
  currentIndex: number;
  totalExercises: number;
  stageStatus: StageStatus;
  hasStartedExercises: boolean;

  isAiProcessing: boolean;
  isProcessing: boolean;
  isRecording: boolean;
  isPlaying: boolean;
  isSpeechLoading: boolean;
  transcript: string;

  startExercises: () => void;
  submitTurn: () => Promise<void>;
  submitExerciseAnswer: (answer: any) => Promise<void>;
  handleTimeOut: () => void;
  handleEndSession: () => Promise<void>;
  startRecording: () => void;
  stopRecording: () => Promise<void>;
  resetRecording: () => void;
  handleReplay: (text: string) => Promise<void>;
  playExerciseAudio: (
    audioKey?: string | null,
    fallbackText?: string | null,
  ) => Promise<void>;
  resolveAssetUrl: (key?: string | null) => string;
}

const BossFoundationContext = createContext<
  BossFoundationContextType | undefined
>(undefined);

const LANGUAGE_CODES: Record<string, string> = {
  FRENCH: "fr-FR",
  SPANISH: "es-ES",
  GERMAN: "de-DE",
  ITALIAN: "it-IT",
  ENGLISH: "en-US",
};

const resolveBcp47Language = (session: any): string => {
  const raw =
    session?.targetLanguage ||
    session?.course?.targetLanguage ||
    "fr-FR";
  if (typeof raw !== "string") return "fr-FR";
  return LANGUAGE_CODES[raw.trim().toUpperCase()] || raw.trim();
};

const resolveNativeBcp47Language = (session: any): string => {
  const raw =
    session?.course?.nativeLanguage ||
    session?.nativeLanguage ||
    "en-US";
  if (typeof raw !== "string") return "en-US";
  return LANGUAGE_CODES[raw.trim().toUpperCase()] || raw.trim();
};

const NEXT_EXERCISE_PAUSE_MS = 900;
const FALLBACK_AVATAR =
  "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=boss";

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });

const forSpeech = (text: string) =>
  text
    .replace(/\*[^*]+\*/g, "")
    .replace(/[«»]/g, "")
    .replace(
      /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu,
      "",
    )
    .replace(/\s{2,}/g, " ")
    .trim();

export const resolveAssetUrl = (key?: string | null): string => {
  if (!key) return "";
  if (
    key.startsWith("http://") ||
    key.startsWith("https://") ||
    key.startsWith("/") ||
    key.startsWith("blob:")
  ) {
    return key;
  }
  const baseUrl = (
    process.env.NEXT_PUBLIC_S3_CDN_URL ||
    process.env.NEXT_PUBLIC_ASSET_URL ||
    ""
  ).replace(/\/$/, "");

  return baseUrl ? `${baseUrl}/${key}` : `/${key}`;
};

function checkDeterministicAnswer(
  item: PlaylistItem,
  userAnswer: any,
): boolean {
  if (
    item.type === "MULTIPLE_CHOICE" ||
    item.type === "LISTEN_PICTURE_SELECTOR"
  ) {
    return String(userAnswer).trim() === String(item.correctAnswer).trim();
  }

  if (
    item.type === "SENTENCE_BUILDER" ||
    item.type === "SENTENCE_BUIL" ||
    item.type === "LISTEN_SENTENCE_BUILDER"
  ) {
    if (!Array.isArray(userAnswer) || !Array.isArray(item.correctAnswer)) {
      return false;
    }

    return (
      userAnswer.length === item.correctAnswer.length &&
      userAnswer.every(
        (word, index) =>
          String(word).trim() === String(item.correctAnswer?.[index]).trim(),
      )
    );
  }

  return false;
}

// ============================================================================
// INNER PROVIDER (Runs inside <LiveKitRoom>)
// ============================================================================
function BossLiveKitInnerProvider({
  session,
  onEnd,
  preloadedKeys,
  preloadedUrls,
  children,
}: {
  session: any;
  onEnd: () => void;
  preloadedKeys: (string | undefined)[];
  preloadedUrls: string[];
  children: ReactNode;
}) {
  const { state: agentState } = useVoiceAssistant();
  const { localParticipant } = useLocalParticipant();
  const { send: sendBossCmd } = useDataChannel("spoon-boss-cmd");

  const [messages, setMessages] = useState<BossMessage[]>([]);
  const [chances, setChances] = useState(3);
  const [xp, setXp] = useState(0);
  const [score, setScore] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stageStatus, setStageStatus] = useState<StageStatus>("PLAYING");
  const [hasStartedExercises, setHasStartedExercises] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [bossMood, setBossMood] = useState<BossMood>("default");

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const latestPronunciationRef = useRef<any>(null);

  const sessionStartTime = useRef(Date.now());
  const resultPipelineRef = useRef(false);
  const startExercisesRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const mountedRef = useRef(true);
  const sequenceRef = useRef(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentIndexRef = useRef(0);
  const chancesRef = useRef(3);
  const xpRef = useRef(0);
  const scoreRef = useRef(0);
  const stageStatusRef = useRef<StageStatus>("PLAYING");

  // Refs to avoid stale closures inside useDataChannel
  const bossMoodRef = useRef<BossMood>("default");
  const lastGradeStatusRef = useRef<"correct" | "incorrect" | undefined>(
    undefined,
  );
  const reactionAppendedRef = useRef(false);
  const reactionResolverRef = useRef<(() => void) | null>(null);
  const transcriptRef = useRef("");

  const updateTranscript = useCallback((val: string) => {
    transcriptRef.current = val;
    setTranscript(val);
  }, []);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);
  useEffect(() => {
    chancesRef.current = chances;
  }, [chances]);
  useEffect(() => {
    xpRef.current = xp;
  }, [xp]);
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);
  useEffect(() => {
    stageStatusRef.current = stageStatus;
  }, [stageStatus]);
  useEffect(() => {
    bossMoodRef.current = bossMood;
  }, [bossMood]);

  const {
    speak,
    isPlaying: isFallbackPlaying,
    isLoading: isSpeechLoading,
    stop: stopAudio,
  } = useSpeak();

  const isPlaying = agentState === "speaking" || isFallbackPlaying;
  const isProcessing = isPlaying || isAiProcessing || isSpeechLoading;

  const bcp47Language = resolveBcp47Language(session);

  const scenarioData = (session?.scenarioData as any) || {};
  const boss: BossPersona | null = scenarioData.boss || session?.boss || null;

  const playlist: PlaylistItem[] =
    scenarioData.exerciseBank ||
    scenarioData.playlist ||
    session?.exerciseBank ||
    session?.playlist ||
    [];

  const introMessage =
    boss?.introMessage ||
    scenarioData.introMessage ||
    session?.introMessage ||
    "Let's begin your milestone challenge.";

  // Global DataChannel logger to catch any topic mismatches or unexpected payloads
  useDataChannel((msg) => {
    try {
      const rawText = new TextDecoder().decode(msg.payload);
      console.log("[BOSS-PRON] Raw DataChannel msg received:", {
        topic: msg.topic,
        from: msg.from?.identity,
        payload: JSON.parse(rawText),
      });
    } catch {
      console.log("[BOSS-PRON] Non-JSON DataChannel msg on topic:", msg.topic);
    }
  });

  // Listen for LiveKit Agent events over "spoon-meta"
  useDataChannel("spoon-meta", (msg) => {
    try {
      const payload = JSON.parse(new TextDecoder().decode(msg.payload));
      console.log("[BOSS-PRON] spoon-meta event:", payload);

      // 1. LiveKit Agent sent the controlled exercise grade reaction
      if (payload.type === "BOSS_REACTION" && startExercisesRef.current) {
        reactionAppendedRef.current = true;
        setMessages((prev) => [
          ...prev,
          {
            id: `lk-reaction-${Date.now()}-${Math.random()}`,
            role: "assistant",
            text: payload.text,
            mood: bossMoodRef.current,
            status: lastGradeStatusRef.current,
          },
        ]);
      }

      // 2. LiveKit Agent finished speaking the exercise reaction
      if (payload.type === "BOSS_REACTION_DONE") {
        if (reactionResolverRef.current) {
          reactionResolverRef.current();
          reactionResolverRef.current = null;
        }
      }

      // 3. User spoke during a Voice Exercise -> LiveKit STT + Azure Pronunciation Assessment
      if (payload.type === "TURN_META" && payload.role === "user") {
        const text =
          payload.originalText || payload.text || payload.transcript || "";
        const pron = payload.pronunciation || payload.pronunciationScore;
        console.log("[BOSS-PRON] User TURN_META received:", {
          text,
          pronunciation: pron,
        });

        if (text) updateTranscript(text);
        if (pron) {
          latestPronunciationRef.current = {
            accuracyScore: pron.accuracyScore ?? 0,
            fluencyScore: pron.fluencyScore ?? 0,
            score: pron.pronScore ?? pron.score ?? pron.accuracyScore ?? 0,
            words: pron.words ?? [],
          };
        }
      }
    } catch (e) {
      console.warn("[BOSS-PRON] Boss spoon-meta parse error:", e);
    }
  });

  const resolveAssetUrl = useCallback(
    (key?: string | null): string => {
      if (!key) return "";
      if (
        key.startsWith("http://") ||
        key.startsWith("https://") ||
        key.startsWith("/") ||
        key.startsWith("blob:")
      ) {
        return key;
      }
      const index = preloadedKeys.indexOf(key);
      if (index !== -1 && preloadedUrls[index]) {
        return preloadedUrls[index];
      }
      const baseUrl = (
        process.env.NEXT_PUBLIC_S3_CDN_URL ||
        process.env.NEXT_PUBLIC_ASSET_URL ||
        ""
      ).replace(/\/$/, "");
      return baseUrl ? `${baseUrl}/${key}` : `/${key}`;
    },
    [preloadedKeys, preloadedUrls],
  );

  const avatarKeyMap = useMemo(() => {
    const derivedPrefix = boss?.coverUrl
      ? boss.coverUrl
          .replace(/^boss\/covers\//, "boss/avatars/")
          .replace(/\/cover\.png$/, "")
      : null;

    return {
      default:
        boss?.avatar?.default ??
        boss?.avatarKey ??
        (derivedPrefix ? `${derivedPrefix}/default.png` : null),
      happy:
        boss?.avatar?.happy ??
        (derivedPrefix ? `${derivedPrefix}/happy.png` : null),
      sad:
        boss?.avatar?.sad ??
        (derivedPrefix ? `${derivedPrefix}/sad.png` : null),
      angry:
        boss?.avatar?.angry ??
        (derivedPrefix ? `${derivedPrefix}/angry.png` : null),
    };
  }, [boss]);

  const getBossAvatarUrl = useCallback(
    (mood: BossMood = "default"): string => {
      const key = avatarKeyMap[mood] || avatarKeyMap.default;
      return key ? resolveAssetUrl(key) || FALLBACK_AVATAR : FALLBACK_AVATAR;
    },
    [avatarKeyMap, resolveAssetUrl],
  );

  const bossAvatarUrl = useMemo(
    () => getBossAvatarUrl(bossMood),
    [getBossAvatarUrl, bossMood],
  );

  const bossCoverUrl = useMemo(
    () => (boss?.coverUrl ? resolveAssetUrl(boss.coverUrl) : ""),
    [boss?.coverUrl, resolveAssetUrl],
  );

  const handleStartRecording = useCallback(async () => {
    if (resultPipelineRef.current || stageStatusRef.current !== "PLAYING") {
      console.warn(
        "[BOSS-PRON] handleStartRecording blocked:",
        resultPipelineRef.current,
        stageStatusRef.current,
      );
      return;
    }

    const currentItem = playlist[currentIndexRef.current];
    const targetPhrase =
      currentItem?.targetText ||
      (typeof currentItem?.correctAnswer === "string"
        ? currentItem.correctAnswer
        : "") ||
      currentItem?.question ||
      "";

    console.log("[BOSS-PRON] Starting recording for item:", {
      index: currentIndexRef.current,
      type: currentItem?.type,
      targetText: currentItem?.targetText,
      resolvedTargetPhrase: targetPhrase,
      localParticipantIdentity: localParticipant?.identity,
    });

    updateTranscript("");
    latestPronunciationRef.current = null;
    setIsRecording(true);

    // Inform LiveKit Agent of the expected pronunciation target phrase
    if (targetPhrase) {
      sendBossCmd(
        new TextEncoder().encode(
          JSON.stringify({
            action: "SET_PRONUNCIATION_TARGET",
            targetText: targetPhrase,
            referenceText: targetPhrase,
            exerciseId: currentItem?.id,
          }),
        ),
        { reliable: true },
      ).catch((err) =>
        console.warn("[BOSS-PRON] Failed to send pronunciation target:", err),
      );
    }

    try {
      await localParticipant?.setMicrophoneEnabled(true);
      console.log(
        "[BOSS-PRON] Microphone enabled successfully:",
        localParticipant?.isMicrophoneEnabled,
      );
    } catch (err) {
      console.error("[BOSS-PRON] Failed to enable microphone:", err);
      toast.error("Could not access microphone. Please check permissions.");
      setIsRecording(false);
    }
  }, [localParticipant, playlist, sendBossCmd, updateTranscript]);

  const handleStopRecording = useCallback(async () => {
    setIsRecording(false);
    try {
      await localParticipant?.setMicrophoneEnabled(false);
      console.log("[BOSS-PRON] Microphone disabled.");
    } catch (err) {
      console.warn("[BOSS-PRON] Error disabling microphone:", err);
    }
  }, [localParticipant]);

  const handleResetRecording = useCallback(() => {
    console.log("[BOSS-PRON] Resetting recording state.");
    updateTranscript("");
    latestPronunciationRef.current = null;
    setIsRecording(false);
    void localParticipant?.setMicrophoneEnabled(false);
  }, [localParticipant, updateTranscript]);

  const playNativeAudioUntilSettled = useCallback(
    async (url: string): Promise<void> => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      const audio = new Audio(url);
      audioRef.current = audio;

      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          if (audioRef.current === audio) audioRef.current = null;
          resolve();
        };
        const fail = () => {
          if (settled) return;
          settled = true;
          if (audioRef.current === audio) audioRef.current = null;
          reject(new Error("Audio playback failed."));
        };
        audio.addEventListener("ended", finish, { once: true });
        audio.addEventListener("error", fail, { once: true });
        audio.addEventListener("pause", () => !audio.ended && finish());
        audio.play().catch(fail);
      });
    },
    [],
  );

  const playExerciseAudio = useCallback(
    async (
      audioKey?: string | null,
      fallbackText?: string | null,
    ): Promise<void> => {
      if (audioKey) {
        try {
          const url = resolveAssetUrl(audioKey);
          await playNativeAudioUntilSettled(url);
          return;
        } catch (error) {
          console.warn(
            "Audio playback failed, falling back to LiveKit TTS:",
            error,
          );
        }
      }

      const speechText = fallbackText ? forSpeech(fallbackText) : "";
      if (!speechText) return;

      try {
        await sendBossCmd(
          new TextEncoder().encode(
            JSON.stringify({ action: "SPEAK", text: speechText }),
          ),
          { reliable: true },
        );
      } catch {
        await speak(speechText, bcp47Language, 1.0, session?.voiceGender);
      }
    },
    [
      bcp47Language,
      playNativeAudioUntilSettled,
      resolveAssetUrl,
      sendBossCmd,
      session?.voiceGender,
      speak,
    ],
  );

  const handleEndSession = useCallback(
    async (passed = false) => {
      if (isSubmittingRef.current) return;

      isSubmittingRef.current = true;
      resultPipelineRef.current = true;
      sequenceRef.current += 1;

      await localParticipant?.setMicrophoneEnabled(false);
      stopAudio();

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }

      const duration = Math.round(
        (Date.now() - sessionStartTime.current) / 1000,
      );

      const toastId = toast.loading("Saving Milestone...", {
        description: "Calculating your final score.",
      });

      try {
        await fetch("/api/foundation/boss/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: session.id,
            passed,
            xp: xpRef.current,
            score: scoreRef.current,
            duration,
            chancesRemaining: chancesRef.current,
          }),
        });

        toast.success(passed ? "Milestone Passed!" : "Milestone Failed", {
          id: toastId,
        });

        onEnd();
      } catch (error) {
        console.error("Failed to submit boss session:", error);
        toast.error("Failed to save progress.", { id: toastId });
        isSubmittingRef.current = false;
        resultPipelineRef.current = false;
      }
    },
    [localParticipant, onEnd, session?.id, stopAudio],
  );

  const presentNextPlaylistItem = useCallback(
    (index: number) => {
      if (!mountedRef.current || stageStatusRef.current !== "PLAYING") {
        return;
      }

      if (index >= playlist.length) {
        stageStatusRef.current = "PASSED";
        setStageStatus("PASSED");
        setBossMood("happy");
        void handleEndSession(true);
        return;
      }

      const currentItem = playlist[index];
      console.log("[BOSS-PRON] Presenting playlist item:", {
        index,
        id: currentItem.id,
        type: currentItem.type,
        targetText: currentItem.targetText,
        question: currentItem.question,
        correctAnswer: currentItem.correctAnswer,
      });

      const exerciseMessage: BossMessage = {
        id: `exercise-${currentItem.id}-${index}`,
        role: "assistant",
        text: currentItem.instruction,
        exercise: currentItem,
        status: "pending",
      };

      setMessages((previous) => [...previous, exerciseMessage]);

      // Pre-notify LiveKit Agent of pronunciation reference text when exercise loads
      if (
        currentItem.type === "PRONUNCIATION" ||
        currentItem.type === "CONVERSATION"
      ) {
        const targetPhrase =
          currentItem.targetText ||
          (typeof currentItem.correctAnswer === "string"
            ? currentItem.correctAnswer
            : "") ||
          currentItem.question ||
          "";

        if (targetPhrase) {
          sendBossCmd(
            new TextEncoder().encode(
              JSON.stringify({
                action: "SET_PRONUNCIATION_TARGET",
                targetText: targetPhrase,
                referenceText: targetPhrase,
                exerciseId: currentItem.id,
              }),
            ),
            { reliable: true },
          ).catch((err) =>
            console.warn(
              "[BOSS-PRON] Failed to pre-send pronunciation target:",
              err,
            ),
          );
        }
      }

      if (
        currentItem.type === "LISTEN_SENTENCE_BUILDER" ||
        currentItem.type === "LISTEN_PICTURE_SELECTOR" ||
        (currentItem.type === "PRONUNCIATION" && currentItem.targetText)
      ) {
        void playExerciseAudio(currentItem.audioKey, currentItem.targetText);
      }
    },
    [handleEndSession, playExerciseAudio, playlist, sendBossCmd],
  );

  // Initial Intro Message
  useEffect(() => {
    mountedRef.current = true;
    const welcomeMessage: BossMessage = {
      id: `intro-${Date.now()}`,
      role: "assistant",
      text: introMessage,
      mood: "default",
    };
    setMessages([welcomeMessage]);

    return () => {
      mountedRef.current = false;
      sequenceRef.current += 1;
      resultPipelineRef.current = true;
      stopAudio();
    };
  }, [introMessage, stopAudio]);

  const startExercises = useCallback(() => {
    if (startExercisesRef.current || stageStatusRef.current !== "PLAYING") {
      return;
    }

    startExercisesRef.current = true;
    sequenceRef.current += 1;
    stopAudio();

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    setHasStartedExercises(true);
    presentNextPlaylistItem(0);
  }, [presentNextPlaylistItem, stopAudio]);

  const processResult = useCallback(
    async (
      isCorrect: boolean,
      userAnswerText: string,
      currentItem: PlaylistItem,
    ) => {
      if (resultPipelineRef.current || stageStatusRef.current !== "PLAYING") {
        return;
      }

      resultPipelineRef.current = true;
      setIsAiProcessing(true);

      const sequence = ++sequenceRef.current;

      const nextMood: BossMood = isCorrect
        ? "happy"
        : chancesRef.current - 1 <= 1
          ? "angry"
          : "sad";
      bossMoodRef.current = nextMood;
      lastGradeStatusRef.current = isCorrect ? "correct" : "incorrect";
      reactionAppendedRef.current = false;
      setBossMood(nextMood);

      try {
        setMessages((previous) =>
          previous.map((message) =>
            message.exercise?.id === currentItem.id
              ? {
                  ...message,
                  status: isCorrect ? "correct" : "incorrect",
                }
              : message,
          ),
        );

        // Trigger LiveKit Boss Agent reaction over WebRTC data channel
        await new Promise<void>((resolve) => {
          reactionResolverRef.current = resolve;
          const timeout = setTimeout(() => {
            if (reactionResolverRef.current === resolve) {
              reactionResolverRef.current = null;
              resolve();
            }
          }, 4500);

          sendBossCmd(
            new TextEncoder().encode(
              JSON.stringify({
                action: "REACT_EXERCISE",
                exerciseId: currentItem.id,
                question:
                  currentItem.question ||
                  currentItem.targetText ||
                  currentItem.instruction,
                userAnswer: userAnswerText,
                isCorrect,
              }),
            ),
            { reliable: true },
          ).catch(() => {
            clearTimeout(timeout);
            resolve();
          });
        });

        // Fallback reaction card if network/LLM timed out
        if (!reactionAppendedRef.current) {
          reactionAppendedRef.current = true;
          setMessages((prev) => [
            ...prev,
            {
              id: `lk-reaction-fallback-${Date.now()}`,
              role: "assistant",
              text: isCorrect ? "Très bien !" : "Pas tout à fait...",
              mood: nextMood,
              status: isCorrect ? "correct" : "incorrect",
            },
          ]);
        }

        if (
          !mountedRef.current ||
          sequence !== sequenceRef.current ||
          stageStatusRef.current !== "PLAYING"
        ) {
          return;
        }

        if (isCorrect) {
          const nextXp = xpRef.current + 50;
          const nextScore = scoreRef.current + 1;
          xpRef.current = nextXp;
          scoreRef.current = nextScore;
          setXp(nextXp);
          setScore(nextScore);
        } else {
          const nextChances = chancesRef.current - 1;
          chancesRef.current = nextChances;
          setChances(nextChances);

          if (nextChances <= 0) {
            stageStatusRef.current = "FAILED";
            setStageStatus("FAILED");
            setBossMood("angry");
            await handleEndSession(false);
            return;
          }
        }

        const nextIndex = currentIndexRef.current + 1;
        currentIndexRef.current = nextIndex;
        setCurrentIndex(nextIndex);

        await wait(NEXT_EXERCISE_PAUSE_MS);

        if (
          mountedRef.current &&
          sequence === sequenceRef.current &&
          stageStatusRef.current === "PLAYING"
        ) {
          presentNextPlaylistItem(nextIndex);
        }
      } finally {
        if (mountedRef.current) {
          setIsAiProcessing(false);
        }
        if (sequence === sequenceRef.current) {
          resultPipelineRef.current = false;
        }
      }
    },
    [handleEndSession, presentNextPlaylistItem, sendBossCmd],
  );

  const submitExerciseAnswer = useCallback(
    async (userAnswer: any) => {
      if (resultPipelineRef.current || stageStatusRef.current !== "PLAYING") {
        return;
      }

      const index = currentIndexRef.current;
      const currentItem = playlist[index];
      if (!currentItem) return;

      if (isRecording) {
        await handleStopRecording();
      }

      const localIsCorrect = checkDeterministicAnswer(currentItem, userAnswer);
      const answerStr = Array.isArray(userAnswer)
        ? userAnswer.join(" ")
        : String(userAnswer);

      await processResult(localIsCorrect, answerStr, currentItem);
    },
    [handleStopRecording, isRecording, playlist, processResult],
  );

  const submitTurn = useCallback(async () => {
    if (resultPipelineRef.current || stageStatusRef.current !== "PLAYING") {
      console.warn(
        "[BOSS-PRON] submitTurn ignored: resultPipeline busy or stage not PLAYING",
      );
      return;
    }

    const currentItem = playlist[currentIndexRef.current];
    if (!currentItem) return;

    console.log(
      "[BOSS-PRON] submitTurn called. Flushing trailing audio for 450ms before disabling mic...",
    );

    // Allow trailing audio packets to reach LiveKit VAD before muting the microphone track
    await wait(450);
    await handleStopRecording();

    // Signal agent that user finished speaking in case server VAD is waiting
    sendBossCmd(
      new TextEncoder().encode(
        JSON.stringify({
          action: "COMMIT_USER_TURN",
          exerciseId: currentItem.id,
        }),
      ),
      { reliable: true },
    ).catch(() => {});

    let attempts = 0;
    while (
      (!transcriptRef.current.trim() || !latestPronunciationRef.current) &&
      attempts < 35
    ) {
      // If we received the transcript and waited at least 1.5s, proceed even if pronunciation object is null
      if (
        transcriptRef.current.trim() &&
        attempts >= 15 &&
        !latestPronunciationRef.current
      ) {
        break;
      }
      await wait(100);
      attempts++;
    }

    const userText = transcriptRef.current.trim();
    const pronData = latestPronunciationRef.current;

    const rawTarget =
      currentItem.targetText ||
      (typeof currentItem.correctAnswer === "string"
        ? currentItem.correctAnswer
        : "") ||
      "";

    console.log("[BOSS-PRON] submitTurn settled after", attempts * 100, "ms:", {
      userText,
      pronData,
      rawTarget,
      exerciseType: currentItem.type,
    });

    setMessages((previous) => [
      ...previous,
      {
        id: `user-${Date.now()}`,
        role: "user",
        text: userText || "(No speech detected)",
        pronunciationScore: pronData ?? undefined,
      },
    ]);

    updateTranscript("");
    latestPronunciationRef.current = null;

    const cleanTarget = rawTarget
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .replace(/\s+/g, " ")
      .trim();
    const cleanUser = userText
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .replace(/\s+/g, " ")
      .trim();

    const azurePassed = pronData ? pronData.score >= 55 : false;
    const textPassed =
      cleanUser.length > 1 &&
      cleanTarget.length > 0 &&
      (cleanUser.includes(cleanTarget) || cleanTarget.includes(cleanUser));

    // Require non-empty user speech if there is no target text (e.g. open CONVERSATION)
    const finalIsCorrect = cleanTarget
      ? azurePassed || textPassed
      : cleanUser.length > 1;

    console.log("[BOSS-PRON] Grading decision:", {
      cleanTarget,
      cleanUser,
      azurePassed,
      textPassed,
      finalIsCorrect,
    });

    await processResult(
      finalIsCorrect,
      userText || "[NO_SPEECH_DETECTED]",
      currentItem,
    );
  }, [
    handleStopRecording,
    playlist,
    processResult,
    sendBossCmd,
    updateTranscript,
  ]);

  const handleTimeOut = useCallback(() => {
    if (resultPipelineRef.current || stageStatusRef.current !== "PLAYING") {
      return;
    }
    const currentItem = playlist[currentIndexRef.current];
    if (!currentItem) return;

    void processResult(false, "[TIMEOUT]", currentItem);
  }, [playlist, processResult]);

  const handleReplay = useCallback(
    async (text: string) => {
      const cleanText = forSpeech(text);
      if (!cleanText) return;
      try {
        await sendBossCmd(
          new TextEncoder().encode(
            JSON.stringify({ action: "SPEAK", text: cleanText }),
          ),
          { reliable: true },
        );
      } catch {
        await speak(cleanText, bcp47Language, 1.0, session?.voiceGender);
      }
    },
    [bcp47Language, sendBossCmd, session?.voiceGender, speak],
  );

  return (
    <BossFoundationContext.Provider
      value={{
        session,
        boss,
        messages,
        bossMood,
        bossAvatarUrl,
        bossCoverUrl,
        getBossAvatarUrl,
        chances,
        xp,
        score,
        currentIndex,
        totalExercises: playlist.length,
        stageStatus,
        hasStartedExercises,
        isAiProcessing,
        isProcessing,
        isRecording,
        isPlaying,
        isSpeechLoading,
        transcript,
        startExercises,
        submitTurn,
        submitExerciseAnswer,
        handleTimeOut,
        handleEndSession: () =>
          handleEndSession(stageStatusRef.current === "PASSED"),
        startRecording: handleStartRecording,
        stopRecording: handleStopRecording,
        resetRecording: handleResetRecording,
        handleReplay,
        playExerciseAudio,
        resolveAssetUrl,
      }}
    >
      <RoomAudioRenderer />
      {children}
    </BossFoundationContext.Provider>
  );
}

// ============================================================================
// OUTER WRAPPER (Mints LiveKit Token & Wraps with <LiveKitRoom>)
// ============================================================================
export function BossFoundationProvider({
  session,
  onEnd,
  preloadedKeys,
  preloadedUrls,
  children,
}: {
  session: any;
  onEnd: () => void;
  preloadedKeys: (string | undefined)[];
  preloadedUrls: string[];
  children: ReactNode;
}) {
  const [lkCredentials, setLkCredentials] = useState<{
    token: string;
    wsUrl: string;
  } | null>(null);

  const scenarioData = (session?.scenarioData as any) || {};
  const boss: BossPersona | null = scenarioData.boss || session?.boss || null;
  const targetLanguage = resolveBcp47Language(session);
  const nativeLanguage = resolveNativeBcp47Language(session);

  useEffect(() => {
    let cancelled = false;
    async function initBossRoom() {
      try {
        console.log("[BOSS-PRON] Minting LiveKit token with languages:", {
          targetLanguage,
          nativeLanguage,
          sessionId: session?.id,
        });

        const res = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonId: `boss-${session?.id || Date.now()}`,
            nativeLanguage,
            targetLanguage,
            freestyleData: {
              topic: `Milestone Boss: ${boss?.name || "Challenge"}`,
              persona: boss?.persona || "Strict milestone examiner",
              openingLine: boss?.sceneDescription || "",
              aiOpeningTarget: boss?.introMessage || "",
            },
          }),
        });
        const data = await res.json();
        if (!cancelled && data.token && data.wsUrl) {
          setLkCredentials({ token: data.token, wsUrl: data.wsUrl });
        }
      } catch (e) {
        console.error("Failed to fetch LiveKit token for Boss:", e);
      }
    }
    initBossRoom();
    return () => {
      cancelled = true;
    };
  }, [boss, nativeLanguage, session?.id, targetLanguage]);

  if (!lkCredentials) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        <p className="text-sm font-bold uppercase tracking-wider text-slate-500">
          Connecting Live Boss Arena...
        </p>
      </div>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={lkCredentials.wsUrl}
      token={lkCredentials.token}
      connect={true}
      audio={false}
      video={false}
    >
      <BossLiveKitInnerProvider
        session={session}
        onEnd={onEnd}
        preloadedKeys={preloadedKeys}
        preloadedUrls={preloadedUrls}
      >
        {children}
      </BossLiveKitInnerProvider>
    </LiveKitRoom>
  );
}

export function useBossFoundation() {
  const context = useContext(BossFoundationContext);
  if (context === undefined) {
    throw new Error(
      "useBossFoundation must be used within a BossFoundationProvider",
    );
  }
  return context;
}