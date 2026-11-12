// components/freestyle/freestyle-chat.tsx
"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useVoiceAssistant,
  useDataChannel,
  TrackToggle,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import {
  Volume2,
  Loader2,
  Mic,
  Check,
  Lightbulb,
  Flame,
  Target,
  Sparkles,
  Languages,
  ArrowRight,
  Eye,
  EyeOff,
  Compass,
  Zap,
  RectangleHorizontal,
  MessagesSquare,
  PenTool,
  Award,
} from "lucide-react";
import { FreestyleTimer } from "./freestyle-timer";
import { useMatrix } from "@/context/matrix-context";
import { useSpeak } from "@/hooks/use-speak";
import {
  getFreestyleTutor,
  getTutorAvatarByMood,
  CONNECTOR_WORDS_BY_LANG,
  type TutorMood,
} from "@/lib/freestyle/tutors";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
interface FreestyleChatProps {
  session: any;
  livekitToken: string;
  livekitUrl: string;
  onEnd: (result?: {
    valid: boolean;
    sessionId?: string;
    reason?: string;
    cooldownUntil?: number;
  }) => void;
}

interface NotepadNote {
  id: string;
  turnId: string;
  hasCorrection: boolean;
  category: "GRAMMAR" | "GENDER" | "VOCABULARY";
  severity: "MINOR" | "MAJOR";
  userSaid: string;
  nativeWay: string;
  nativeTranslation?: string;
  quickWhy: string;
}

interface SpeechSpark {
  id: string;
  label: string;
  subLabel: string;
  kind: "STREAK" | "STRETCH" | "CONNECTOR" | "GOAL";
}

function normalizeForMatch(str: string): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function doesSpeechMatchPhrase(spoken: string, targetPhrase: string): boolean {
  const normSpoken = normalizeForMatch(spoken);
  const normTarget = normalizeForMatch(targetPhrase);
  if (!normSpoken || !normTarget) return false;
  if (normSpoken.includes(normTarget)) return true;

  const targetWords = normTarget.split(" ").filter((w) => w.length > 2);
  if (targetWords.length === 0) return false;

  const spokenWordSet = new Set(normSpoken.split(" "));
  const hitCount = targetWords.filter((w) => spokenWordSet.has(w)).length;
  return hitCount / targetWords.length >= 0.75;
}

function detectConnectorWord(
  spoken: string,
  targetLang = "fr-FR",
): string | null {
  const langPrefix = targetLang.slice(0, 2).toLowerCase();
  const connectors =
    CONNECTOR_WORDS_BY_LANG[langPrefix] || CONNECTOR_WORDS_BY_LANG.fr;
  const lower = spoken.toLowerCase();
  for (const conn of connectors) {
    const regex = new RegExp(`\\b${conn}\\b`, "i");
    if (regex.test(lower)) return conn;
  }
  return null;
}

function renderScoredWords(pron: any, fallbackText: string) {
  if (!pron?.words?.length) {
    return <span>{fallbackText}</span>;
  }
  return (
    <span className="inline-flex flex-wrap gap-x-1.5 gap-y-1">
      {pron.words.map((w: any, idx: number) => {
        const score = w.accuracyScore ?? 100;
        const underlineColor =
          score >= 80
            ? "decoration-emerald-300"
            : score >= 60
              ? "decoration-amber-300"
              : "decoration-rose-300";
        return (
          <span
            key={idx}
            title={`Accuracy: ${Math.round(score)}%`}
            className={`underline decoration-2 underline-offset-4 ${underlineColor}`}
          >
            {w.word}
          </span>
        );
      })}
    </span>
  );
}

function getMoodMotion(mood: TutorMood) {
  switch (mood) {
    case "happy":
      return {
        scale: [1, 1.14, 1.04],
        y: [0, -10, 0],
        rotate: [0, -3, 3, 0],
      };
    case "mad":
      return {
        scale: [1, 1.08, 1.02],
        x: [0, -8, 8, -6, 6, -3, 3, 0],
      };
    case "sad":
      return {
        scale: [1, 0.95, 0.98],
        y: [0, 6, 3],
        rotate: [0, -4, -2],
      };
    case "thinking":
      return {
        scale: 1,
        rotate: [0, -3, 2, 0],
      };
    default:
      return { scale: 1, x: 0, y: 0, rotate: 0 };
  }
}

const MOOD_OVERLAY: Record<TutorMood, { tint: string; badge: string | null }> =
  {
    default: { tint: "bg-transparent", badge: null },
    happy: { tint: "bg-emerald-400/20", badge: "✨" },
    mad: { tint: "bg-rose-600/30", badge: "💢" },
    sad: { tint: "bg-indigo-900/25", badge: "💧" },
    thinking: { tint: "bg-indigo-500/15", badge: "💭" },
  };

function LiveFreestyleChatInner({
  session,
  onEnd,
}: {
  session: any;
  onEnd: FreestyleChatProps["onEnd"];
}) {
  const { state: agentState } = useVoiceAssistant();
  const { trackInteraction } = useMatrix();
  const { speak, isPlaying: isTtsPlaying } = useSpeak();

  // #3 View Mode Toggle ("single" 1-on-1 stage vs "multi" thread) + Tutor Mood
  const [viewMode, setViewMode] = useState<"single" | "multi">("single");
  const [tutorMood, setTutorMood] = useState<TutorMood>("default");

  const [messages, setMessages] = useState<any[]>([]);
  const [matchedChunks, setMatchedChunks] = useState<Set<string>>(new Set());
  const [showTranslations, setShowTranslations] = useState(true);
  const [isEnding, setIsEnding] = useState(false);

  // #1 Live Tutor Notepad State (Real-time corrections & upgrades + sent to Review!)
  const [notepadNotes, setNotepadNotes] = useState<NotepadNote[]>([]);
  const [isAnalyzingNote, setIsAnalyzingNote] = useState(false);

  // #5 Live Micro-Wins / Speech Sparks State
  const [sparks, setSparks] = useState<SpeechSpark[]>([]);
  const [activeSparkToast, setActiveSparkToast] = useState<SpeechSpark | null>(
    null,
  );
  const flowStreakRef = useRef(0);

  // Dynamic Coaching Hint State
  const [coachingTip, setCoachingTip] = useState<string>(
    session?.openingLine ||
      "Listen to your partner's opening question and work in Goal #1!",
  );
  const [suggestions, setSuggestions] = useState<{
    starter?: string;
    translation?: string;
  }>({
    starter: session?.starterHintTarget,
    translation: session?.starterHintNative,
  });
  const [isHintUpdating, setIsHintUpdating] = useState(false);

  const isZeroLevel = session?.level === "ZERO";
  const [revealReply, setRevealReply] = useState<boolean>(isZeroLevel);

  const sessionStartTime = useRef(Date.now());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const matchedChunksRef = useRef<Set<string>>(new Set());
  const lastAiTextRef = useRef<string>("");

  useEffect(() => {
    matchedChunksRef.current = matchedChunks;
  }, [matchedChunks]);

  const requiredChunks: string[] = useMemo(
    () => session?.requiredChunks || [],
    [session?.requiredChunks],
  );
  const chunkTranslations: string[] = useMemo(
    () => session?.chunkTranslations || [],
    [session?.chunkTranslations],
  );

  const tutorConfig = getFreestyleTutor(session?.voiceGender);
  const tutorName = session?.tutorName || tutorConfig.name;

  // Resolve current Tutor Emote Avatar URL
  const effectiveMood: TutorMood =
    agentState === "thinking" ? "thinking" : tutorMood;
  const currentTutorAvatar = getTutorAvatarByMood(
    session?.voiceGender,
    effectiveMood,
  );

  const userAvatar =
    session?.userAvatarUrl ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${
      session?.userId || "Paul"
    }&backgroundColor=c0aede,b6e3f4`;

  const triggerSpark = useCallback((spark: Omit<SpeechSpark, "id">) => {
    const fullSpark: SpeechSpark = {
      ...spark,
      id: `spark-${Date.now()}-${Math.random()}`,
    };
    setSparks((prev) => [fullSpark, ...prev]);
    setActiveSparkToast(fullSpark);
    setTutorMood("happy");
    setTimeout(() => {
      setActiveSparkToast((cur) => (cur?.id === fullSpark.id ? null : cur));
    }, 3800);
  }, []);

  // #1 Analyze user turn in background for Sophie's Live Notepad
  const analyzeUserTurnForNotepad = useCallback(
    async (userText: string, turnId: string) => {
      if (!userText || !session?.userId) return;
      setIsAnalyzingNote(true);
      try {
        const res = await fetch(
          `/api/users/${session.userId}/freestyle/create`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "ANALYZE_TURN",
              userText,
              aiContext: lastAiTextRef.current,
              nativeLanguage: session?.nativeLanguage || "en-US",
              targetLanguage: session?.targetLanguage || "fr-FR",
            }),
          },
        );

        if (res.ok) {
          const data = await res.json();
          if (data.userTranslation) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === turnId && !m.translation
                  ? { ...m, translation: data.userTranslation }
                  : m,
              ),
            );
          }
          if (
            !data.skip &&
            data.nativeWay &&
            userText.trim().split(/\s+/).length >= 2
          ) {
            const note: NotepadNote = {
              id: `note-${Date.now()}`,
              turnId,
              hasCorrection: Boolean(data.hasCorrection),
              category: data.category || "GRAMMAR",
              severity: data.severity || "MINOR",
              userSaid: userText,
              nativeWay: data.nativeWay,
              nativeTranslation: data.nativeTranslation,
              quickWhy: data.quickWhy,
            };
            setNotepadNotes((prev) => [note, ...prev]);
            if (data.hasCorrection) {
              setTutorMood(data.severity === "MAJOR" ? "mad" : "sad");
            }
          }
        }
      } catch (e) {
        console.warn("[Notepad] analysis skipped:", e);
      } finally {
        setIsAnalyzingNote(false);
      }
    },
    [session?.nativeLanguage, session?.targetLanguage, session?.userId],
  );

  // Refresh next reply coaching hint when AI finishes speaking
  const refreshDynamicHint = useCallback(
    async (aiText: string, aiTranslation?: string | null) => {
      if (!aiText || !session?.userId) return;
      setIsHintUpdating(true);

      const nextUnmatchedChunk =
        requiredChunks.find((c) => !matchedChunksRef.current.has(c)) || "";

      try {
        const res = await fetch(
          `/api/users/${session.userId}/freestyle/create`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "HINT",
              aiText,
              aiTranslation,
              nextTargetChunk: nextUnmatchedChunk,
              level: session?.level || "ZERO",
              nativeLanguage: session?.nativeLanguage || "en-US",
              targetLanguage: session?.targetLanguage || "fr-FR",
            }),
          },
        );

        if (res.ok) {
          const data = await res.json();
          if (data.aiTranslation) {
            setMessages((prev) =>
              prev.map((m) =>
                m.role === "assistant" && m.text === aiText && !m.translation
                  ? { ...m, translation: data.aiTranslation }
                  : m,
              ),
            );
          }
          if (data.coachingTip) setCoachingTip(data.coachingTip);
          if (data.starter) {
            setSuggestions({
              starter: data.starter,
              translation: data.translation,
            });
          }
          if (!isZeroLevel) {
            setRevealReply(false);
          }
        }
      } catch {
        // Ignore
      } finally {
        setIsHintUpdating(false);
      }
    },
    [
      isZeroLevel,
      requiredChunks,
      session?.level,
      session?.nativeLanguage,
      session?.targetLanguage,
      session?.userId,
    ],
  );

  useEffect(() => {
    if (viewMode === "multi") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, agentState, viewMode]);

  // Listen to "spoon-meta" data channel from Python Agent
  useDataChannel("spoon-meta", (msg) => {
    try {
      const payload = JSON.parse(new TextDecoder().decode(msg.payload));

      // 1. Assistant message arrived
      if (payload.type === "AGENT_TURN") {
        const aiText = payload.text || "";
        const aiTrans =
          payload.translation ||
          payload.nativeText ||
          payload.englishTranslation ||
          null;

        lastAiTextRef.current = aiText;

        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: "assistant",
            text: aiText,
            translation: aiTrans,
          },
        ]);

        if (payload.suggestedTarget || payload.suggestedNative) {
          setSuggestions({
            starter: payload.suggestedTarget,
            translation: payload.suggestedNative,
          });
        } else if (aiText) {
          void refreshDynamicHint(aiText, aiTrans);
        }
      }

      // 2. User spoke -> Azure Pronunciation + Micro-Wins (#5) + Notepad (#1)
      if (payload.type === "TURN_META" && payload.role === "user") {
        const text = (payload.originalText || payload.text || "").trim();
        const pron = payload.pronunciation;
        const turnId = `user-${Date.now()}`;

        const overallScore = pron
          ? Math.round(
              pron.pronunciationScore ??
                pron.pronScore ??
                pron.accuracyScore ??
                0,
            )
          : 0;

        // --- #5 MICRO-WIN DETECTOR (Client-Side Instant Sparks!) ---
        let newlyMatchedGoal: string | null = null;
        if (text && requiredChunks.length > 0) {
          const next = new Set(matchedChunksRef.current);
          for (const chunk of requiredChunks) {
            if (!next.has(chunk) && doesSpeechMatchPhrase(text, chunk)) {
              next.add(chunk);
              if (!newlyMatchedGoal) newlyMatchedGoal = chunk;
            }
          }
          if (newlyMatchedGoal) {
            matchedChunksRef.current = next;
            setMatchedChunks(next);
          }
        }

        const wordCount = text.split(/\s+/).filter(Boolean).length;
        const stretchThreshold =
          session?.level === "ZERO" || session?.level === "EASY" ? 6 : 9;
        const connectorUsed = detectConnectorWord(
          text,
          session?.targetLanguage,
        );

        if (overallScore >= 80) {
          flowStreakRef.current += 1;
        } else {
          flowStreakRef.current = 0;
        }

        if (newlyMatchedGoal) {
          triggerSpark({
            kind: "GOAL",
            label: "Target Phrase Nailed!",
            subLabel: `« ${newlyMatchedGoal} »`,
          });
        } else if (flowStreakRef.current >= 2) {
          triggerSpark({
            kind: "STREAK",
            label: `${flowStreakRef.current}x Native Flow Streak!`,
            subLabel: `${overallScore}% Pronunciation Resonance`,
          });
        } else if (connectorUsed) {
          triggerSpark({
            kind: "CONNECTOR",
            label: "Connector Pro!",
            subLabel: `Used « ${connectorUsed} » naturally`,
          });
        } else if (wordCount >= stretchThreshold) {
          triggerSpark({
            kind: "STRETCH",
            label: "Sentence Stretch!",
            subLabel: `${wordCount} words spoken in one breath`,
          });
        } else if (overallScore >= 85) {
          setTutorMood("happy");
        } else if (overallScore > 0 && overallScore < 55) {
          setTutorMood("mad");
        } else if (overallScore > 0 && overallScore < 70) {
          setTutorMood("sad");
        } else {
          setTutorMood("default");
        }

        // Bank words in Word Matrix
        if (pron?.words?.length) {
          pron.words.forEach((w: any) => {
            if (!w.word) return;
            trackInteraction(w.word, {
              spokenAttempt: true,
              spokenScore: w.accuracyScore,
              tappedCorrect: w.accuracyScore >= 70 ? 1 : 0,
              tappedWrong: w.accuracyScore < 70 ? 1 : 0,
            });
          });
        }

        setMessages((prev) => [
          ...prev,
          {
            id: turnId,
            role: "user",
            text,
            translation: payload.translation || payload.nativeText || null,
            pronunciationScore: pron,
          },
        ]);

        // Trigger #1 Sophie's Live Notepad check in background
        if (wordCount >= 2) {
          void analyzeUserTurnForNotepad(text, turnId);
        }
      }
    } catch (e) {
      console.warn("spoon-meta error:", e);
    }
  });

  const handlePlayPhraseAudio = (text?: string) => {
    if (!text || isTtsPlaying) return;
    void speak(
      text,
      session?.targetLanguage || "fr-FR",
      0.95,
      session?.voiceGender,
    );
  };

  const handleEndSession = async () => {
    if (isEnding) return;
    setIsEnding(true);

    const duration = Math.round((Date.now() - sessionStartTime.current) / 1000);
    const toastId = toast.loading("Validating conversation...", {
      description: "Checking your speaking turns with AI.",
    });

    // Convert Live Notepad corrections into the exact mistake schema for the Review Lambda!
    const compiledMistakes = notepadNotes
      .filter((n) => n.hasCorrection)
      .map((n) => ({
        category: n.category,
        severity: n.severity,
        mistake: n.userSaid,
        correction: n.nativeWay,
        explanation: n.quickWhy,
      }));

    try {
      const res = await fetch(`/api/users/${session.userId}/freestyle/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          mode: session.mode,
          topic: session.topic,
          level: session.level,
          nativeLanguage: session.nativeLanguage,
          targetLanguage: session.targetLanguage,
          messages,
          mistakes: compiledMistakes,
          duration,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to submit");

      if (data.valid === false) {
        toast.error("Conversation Incomplete", {
          id: toastId,
          description: data.reason,
        });
        onEnd({
          valid: false,
          reason: data.reason,
        });
        return;
      }

      toast.success("Official Session Complete! Boss Unlocked 🎉", {
        id: toastId,
      });
      onEnd({
        valid: true,
        sessionId: session.id,
        cooldownUntil: data.cooldownUntil || Date.now() + 5 * 60 * 1000,
      });
    } catch (err) {
      console.error("Failed to submit session for review:", err);
      toast.dismiss(toastId);
      onEnd({
        valid: false,
        reason: "Could not save session. Please try again.",
      });
    }
  };

  const allChunksCompleted =
    requiredChunks.length > 0 && matchedChunks.size >= requiredChunks.length;

  const activeGoalIndex = requiredChunks.findIndex(
    (c) => !matchedChunks.has(c),
  );
  const currentGoalChunk =
    activeGoalIndex !== -1 ? requiredChunks[activeGoalIndex] : null;
  const currentGoalTranslation =
    activeGoalIndex !== -1 ? chunkTranslations[activeGoalIndex] : null;

  const latestAiMessage = useMemo(
    () => [...messages].reverse().find((m) => m.role === "assistant") || null,
    [messages],
  );
  const latestUserMessage = useMemo(
    () => [...messages].reverse().find((m) => m.role === "user") || null,
    [messages],
  );
  const latestNote = notepadNotes[0] || null;

  const handleEndSessionRef = useRef(handleEndSession);
  handleEndSessionRef.current = handleEndSession;
  const stableOnTimeUp = useCallback(() => {
    void handleEndSessionRef.current();
  }, []);

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col gap-5 overflow-hidden animate-bg p-4 sm:p-6 lg:flex-row">
      <div className="pointer-events-none absolute inset-0 bg-slate-950/15 backdrop-blur-[1px]" />

      <RoomAudioRenderer />

      {/* =========================================================
          LEFT / MAIN STAGE (SINGLE 1-ON-1 STAGE vs MULTI THREAD)
      ========================================================= */}
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden rounded-[2rem] border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white shadow-2xl">
        {/* 1. Vibrant Arena Header + Single/Multi View Switcher */}
        <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 px-6 py-3.5 text-white">
          <div className="pointer-events-none absolute -top-12 right-10 h-32 w-32 rounded-full bg-sky-500/20 blur-2xl" />

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl border-2 border-b-4 border-sky-400 bg-slate-900 shadow-md">
                <img
                  src={currentTutorAvatar}
                  alt={tutorName}
                  className="h-full w-full object-cover object-top transition-all duration-300"
                />
                <span className="absolute right-0.5 bottom-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                    {session?.topic || "Live Conversation Arena"}
                  </h2>
                  <span className="rounded-lg border border-sky-400/40 bg-sky-500/20 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-sky-300 uppercase">
                    {session?.level || "ZERO"}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-300">
                  Partner: <strong className="text-white">{tutorName}</strong> •{" "}
                  <span className="text-amber-300">{sparks.length} Sparks</span>{" "}
                  • {notepadNotes.length} Notepad Notes
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Single / Multi View Switcher (Matches SpriteChat!) */}
              <div className="flex items-center gap-1 rounded-xl border border-white/15 bg-slate-900/90 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("single")}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black transition ${
                    viewMode === "single"
                      ? "border-b-2 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-2xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <RectangleHorizontal className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">1-on-1 Stage</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("multi")}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black transition ${
                    viewMode === "multi"
                      ? "border-b-2 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-2xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <MessagesSquare className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    Transcript ({messages.length})
                  </span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowTranslations((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-extrabold transition ${
                  showTranslations
                    ? "border-sky-400/40 bg-sky-500/20 text-sky-200"
                    : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                <Languages size={14} />
                <span className="hidden md:inline">
                  {showTranslations ? "Translations On" : "Translations Off"}
                </span>
              </button>
              <FreestyleTimer initialTime={180} onTimeUp={stableOnTimeUp} />.
            </div>
          </div>
        </div>

        {/* 2. Interactive Target Phrases Strip */}
        {requiredChunks.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 bg-gradient-to-r from-sky-50/70 via-indigo-50/40 to-emerald-50/50 px-6 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-black tracking-wider text-indigo-900 uppercase">
                <Target className="h-3.5 w-3.5 text-indigo-600" />
                Phrase Goals ({matchedChunks.size}/{requiredChunks.length}):
              </span>

              {requiredChunks.map((chunk, idx) => {
                const isHit = matchedChunks.has(chunk);
                const isNextGoal = !isHit && chunk === currentGoalChunk;
                const meaning = chunkTranslations[idx];

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePlayPhraseAudio(chunk)}
                    title={
                      meaning
                        ? `${meaning} (Click to hear pronunciation)`
                        : "Click to hear pronunciation"
                    }
                    className={`group inline-flex items-center gap-1.5 rounded-xl border-2 border-b-[3px] px-3 py-1 text-xs font-black transition-all active:translate-y-0.5 ${
                      isHit
                        ? "border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-2xs"
                        : isNextGoal
                          ? "border-blue-700 bg-white text-blue-700 ring-2 ring-sky-300/60 shadow-2xs"
                          : "border-slate-200 bg-white text-slate-700 hover:border-sky-300"
                    }`}
                  >
                    {isHit ? (
                      <Check size={12} strokeWidth={3.5} />
                    ) : (
                      <Volume2
                        size={12}
                        className="text-blue-500 transition-transform group-hover:scale-110"
                      />
                    )}
                    <span>{chunk}</span>
                    {showTranslations && meaning && (
                      <span
                        className={`hidden xl:inline text-[10px] font-semibold ${
                          isHit ? "text-emerald-100" : "text-slate-400"
                        }`}
                      >
                        • {meaning}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Floating #5 Micro-Win Spark Celebration Banner */}
        {activeSparkToast && (
          <div className="pointer-events-none absolute top-28 left-1/2 z-30 -translate-x-1/2 animate-in fade-in zoom-in-95 slide-in-from-top-3 duration-200">
            <div className="inline-flex items-center gap-2.5 rounded-2xl border-2 border-b-4 border-amber-600 bg-gradient-to-r from-amber-300 via-yellow-300 to-orange-400 px-5 py-2 text-slate-950 shadow-xl">
              <Award className="h-5 w-5 fill-amber-600 text-slate-950" />
              <div>
                <span className="block text-xs font-black uppercase tracking-wider">
                  ⚡ {activeSparkToast.label}
                </span>
                <span className="block text-[11px] font-extrabold text-slate-800">
                  {activeSparkToast.subLabel}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================
            3A. SINGLE STAGE VIEW (1-on-1 Face-to-Face Living Tutor + Notepad!)
        ================================================================= */}
        {viewMode === "single" ? (
          <div className="relative flex flex-1 flex-col justify-between overflow-y-auto bg-slate-50/60 p-6">
            {/* Top / Center: Living Tutor Portrait + Active Speech Stage */}
            <div className="my-auto flex flex-col items-center text-center">
              {/* Reactive Tutor Portrait (Framer Motion Emote Engine) */}
              <div className="relative mb-5">
                {/* Ambient Mood Glow */}
                <div
                  className={`pointer-events-none absolute -inset-4 rounded-[2.5rem] blur-xl transition-all duration-500 ${
                    agentState === "speaking"
                      ? "animate-pulse bg-sky-400/45"
                      : effectiveMood === "happy"
                        ? "bg-emerald-400/50"
                        : effectiveMood === "mad"
                          ? "bg-rose-500/55"
                          : effectiveMood === "sad"
                            ? "bg-amber-400/40"
                            : "bg-indigo-400/20"
                  }`}
                />

                {/* Expanding Shockwave Ring whenever Mood Changes */}
                <AnimatePresence>
                  <motion.div
                    key={`ring-${effectiveMood}`}
                    initial={{ scale: 0.9, opacity: 0.85 }}
                    animate={{ scale: 1.4, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.55, ease: "easeOut" }}
                    className={`pointer-events-none absolute inset-0 rounded-[2rem] border-4 ${
                      effectiveMood === "happy"
                        ? "border-emerald-400"
                        : effectiveMood === "mad"
                          ? "border-rose-500"
                          : effectiveMood === "sad"
                            ? "border-amber-400"
                            : effectiveMood === "thinking"
                              ? "border-indigo-400"
                              : "border-sky-400"
                    }`}
                  />
                </AnimatePresence>

                {/* Animated Portrait Box (Bounces when Happy, Shakes + Red Tint when Mad, Droops when Sad) */}
                <motion.div
                  key={`box-${effectiveMood}`}
                  animate={getMoodMotion(effectiveMood)}
                  transition={
                    effectiveMood === "thinking"
                      ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
                      : { duration: 0.45, ease: "easeOut" }
                  }
                  className={`relative h-28 w-28 sm:h-32 sm:w-32 overflow-hidden rounded-[2rem] border-2 border-b-[6px] bg-slate-900 shadow-xl ${
                    effectiveMood === "happy"
                      ? "border-emerald-400 border-b-emerald-700"
                      : effectiveMood === "mad"
                        ? "border-rose-500 border-b-rose-800"
                        : effectiveMood === "sad"
                          ? "border-amber-400 border-b-orange-700"
                          : "border-sky-400 border-b-blue-800"
                  }`}
                >
                  <img
                    src={currentTutorAvatar}
                    alt={tutorName}
                    className="h-full w-full object-cover object-top"
                  />

                  {/* Subtle Color Wash Overlay (Red flush for Mad, Warm glow for Happy, Cool dim for Sad) */}
                  <div
                    className={`pointer-events-none absolute inset-0 transition-colors duration-300 ${MOOD_OVERLAY[effectiveMood].tint}`}
                  />
                </motion.div>

                {/* Popping Top-Right Emoji Burst */}
                <AnimatePresence mode="wait">
                  {MOOD_OVERLAY[effectiveMood].badge && (
                    <motion.div
                      key={`emoji-${effectiveMood}`}
                      initial={{ scale: 0, rotate: -20, y: 8 }}
                      animate={{ scale: 1, rotate: 0, y: 0 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 18,
                      }}
                      className="absolute -top-2.5 -right-2.5 flex h-9 w-9 items-center justify-center rounded-2xl border-2 border-white bg-white text-lg shadow-lg"
                    >
                      {MOOD_OVERLAY[effectiveMood].badge}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Animated Emote Status Pill */}
                <motion.span
                  key={`pill-${effectiveMood}`}
                  initial={{ scale: 0.85, y: 4 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 20 }}
                  className={`absolute -bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-b-2 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-md ${
                    effectiveMood === "happy"
                      ? "border-emerald-800 bg-emerald-400 text-slate-950"
                      : effectiveMood === "thinking"
                        ? "border-indigo-900 bg-indigo-500 text-white"
                        : effectiveMood === "mad"
                          ? "border-rose-950 bg-rose-500 text-white"
                          : effectiveMood === "sad"
                            ? "border-orange-800 bg-amber-300 text-slate-950"
                            : "border-blue-900 bg-sky-400 text-slate-950"
                  }`}
                >
                  {effectiveMood === "happy"
                    ? `🔥 Impressed`
                    : effectiveMood === "thinking"
                      ? `💭 Thinking...`
                      : effectiveMood === "mad"
                        ? `😤 Tough Love`
                        : effectiveMood === "sad"
                          ? `✏️ Almost There`
                          : `🎙️ ${tutorName}`}
                </motion.span>
              </div>

              {/* Tutor's Latest Spoken Line Card */}
              <div className="mt-2 w-full max-w-2xl rounded-3xl border-2 border-b-[6px] border-slate-200 border-b-slate-300 bg-white px-6 py-5 shadow-md">
                {latestAiMessage ? (
                  <>
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-lg sm:text-2xl font-black leading-snug text-slate-900">
                        &ldquo;{latestAiMessage.text}&rdquo;
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          handlePlayPhraseAudio(latestAiMessage.text)
                        }
                        title="Replay tutor audio"
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-b-[3px] border-sky-200 bg-sky-50 text-blue-600 transition hover:bg-sky-100"
                      >
                        <Volume2 size={16} />
                      </button>
                    </div>
                    {showTranslations && latestAiMessage.translation && (
                      <p className="mt-2 text-xs sm:text-sm font-bold text-slate-500">
                        {latestAiMessage.translation}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-base font-extrabold text-slate-600">
                    {agentState === "connecting"
                      ? `Connecting voice room with ${tutorName}...`
                      : `${tutorName} is listening! Greet ${tutorName} to begin.`}
                  </p>
                )}
              </div>

              {/* User's Latest Spoken Turn Pill */}
              {latestUserMessage && (
                <div className="mt-4 flex items-center justify-center gap-3 animate-in fade-in duration-200">
                  <div className="rounded-2xl border-b-4 border-indigo-800 bg-gradient-to-b from-indigo-500 to-indigo-600 px-5 py-2.5 text-sm sm:text-base font-bold text-white shadow-md">
                    {renderScoredWords(
                      latestUserMessage.pronunciationScore,
                      latestUserMessage.text,
                    )}
                  </div>
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-2xl border-2 border-b-[3px] border-indigo-400 bg-indigo-100 shadow-xs">
                    <img
                      src={userAvatar}
                      alt="You"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bottom of Single Stage: #1 SOPHIE'S LIVE NOTEPAD ("Here's how it should have been said!") */}
            <div className="mt-5 w-full">
              <div className="overflow-hidden rounded-3xl border-2 border-b-[5px] border-amber-200 border-b-amber-300 bg-gradient-to-r from-amber-50/90 via-white to-sky-50/50 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl border-b-2 border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950">
                      <PenTool className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-xs font-black tracking-wider text-slate-900 uppercase">
                      {tutorName}&apos;s Live Notepad
                    </span>
                    {latestNote && (
                      <span
                        className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase ${
                          latestNote.hasCorrection
                            ? "border border-rose-200 bg-rose-100 text-rose-800"
                            : "border border-emerald-200 bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {latestNote.hasCorrection
                          ? `${latestNote.category} Polish`
                          : "Native Upgrade"}
                      </span>
                    )}
                  </div>

                  {isAnalyzingNote && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Jotting note...
                    </span>
                  )}
                </div>

                {latestNote ? (
                  <div className="mt-2.5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                        {latestNote.hasCorrection && (
                          <>
                            <span className="font-bold text-rose-500 line-through">
                              &ldquo;{latestNote.userSaid}&rdquo;
                            </span>
                            <span className="font-black text-slate-400">➜</span>
                          </>
                        )}
                        <span className="font-black text-emerald-700">
                          &ldquo;{latestNote.nativeWay}&rdquo;
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-600">
                        💡 {latestNote.quickWhy}
                        {latestNote.nativeTranslation && (
                          <span className="ml-1 text-slate-400">
                            ({latestNote.nativeTranslation})
                          </span>
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handlePlayPhraseAudio(latestNote.nativeWay)
                      }
                      className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl border-2 border-b-[3px] border-emerald-600 bg-emerald-500 px-3.5 py-2 text-xs font-black text-white shadow-2xs transition hover:bg-emerald-600 sm:self-center"
                    >
                      <Volume2 size={14} />
                      <span>Hear Native Way</span>
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    Speak a sentence and {tutorName} will jot down real-time
                    native phrasing tips and grammar upgrades right here!
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* =================================================================
             3B. MULTI-THREAD VIEW (Full Scrollable Transcript + Inline Notes)
          ================================================================= */
          <div className="flex-1 space-y-5 overflow-y-auto bg-slate-50/50 p-6 scroll-smooth">
            {messages.map((message) => {
              const isUser = message.role === "user";
              const pron = message.pronunciationScore;
              const overall = pron
                ? Math.round(
                    pron.pronunciationScore ??
                      pron.pronScore ??
                      pron.accuracyScore ??
                      0,
                  )
                : null;
              const isHighPass = overall !== null && overall >= 80;
              const turnNote = notepadNotes.find(
                (n) => n.turnId === message.id,
              );

              if (!isUser) {
                return (
                  <div
                    key={message.id}
                    className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200"
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-2xl border-2 border-b-[3px] border-sky-400 bg-slate-900 shadow-xs">
                      <img
                        src={currentTutorAvatar}
                        alt={tutorName}
                        className="h-full w-full object-cover object-top"
                      />
                    </div>

                    <div className="max-w-[80%] rounded-2xl rounded-tl-sm border-2 border-b-4 border-slate-200 border-b-slate-300 bg-white px-4 py-3 shadow-xs">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm sm:text-base font-bold leading-relaxed text-slate-900">
                          {message.text}
                        </p>
                        <button
                          type="button"
                          onClick={() => handlePlayPhraseAudio(message.text)}
                          className="mt-0.5 shrink-0 rounded-lg p-1 text-slate-400 hover:bg-sky-50 hover:text-blue-600"
                        >
                          <Volume2 size={15} />
                        </button>
                      </div>
                      {showTranslations && message.translation && (
                        <p className="mt-1.5 border-t border-slate-100 pt-1.5 text-xs font-semibold text-slate-500">
                          {message.translation}
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={message.id}
                  className="flex items-start justify-end gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200"
                >
                  <div className="flex max-w-md flex-col items-end gap-1.5">
                    <div className="rounded-2xl rounded-tr-sm border-b-4 border-indigo-800 bg-gradient-to-b from-indigo-500 to-indigo-600 px-4 py-3 text-sm sm:text-base font-bold leading-relaxed text-white shadow-md">
                      {renderScoredWords(pron, message.text)}
                    </div>

                    {overall !== null && (
                      <div
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-0.5 text-[11px] font-black ${
                          isHighPass
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-800"
                        }`}
                      >
                        <Flame size={12} />
                        <span>{overall}% Flow</span>
                      </div>
                    )}

                    {/* Inline Notepad Correction attached to this turn */}
                    {turnNote && (
                      <div className="mt-1 w-full rounded-2xl border-2 border-amber-200 bg-amber-50/90 px-3.5 py-2.5 text-left text-xs shadow-2xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-black text-amber-900">
                            ✏️ Native Way: « {turnNote.nativeWay} »
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handlePlayPhraseAudio(turnNote.nativeWay)
                            }
                            className="text-blue-600 hover:underline font-black"
                          >
                            🔊 Hear
                          </button>
                        </div>
                        <p className="mt-0.5 font-semibold text-slate-600">
                          {turnNote.quickWhy}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-2xl border-2 border-b-[3px] border-indigo-400 bg-indigo-100 shadow-xs">
                    <img
                      src={userAvatar}
                      alt="You"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} className="h-2" />
          </div>
        )}

        {/* 4. Bottom Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <span
              className={`h-3 w-3 rounded-full ${
                agentState === "listening"
                  ? "animate-ping bg-emerald-500"
                  : agentState === "speaking"
                    ? "animate-pulse bg-indigo-500"
                    : "bg-amber-400"
              }`}
            />
            <span className="text-sm font-extrabold text-slate-700">
              {agentState === "listening"
                ? "Listening (Speak anytime)..."
                : agentState === "speaking"
                  ? `${tutorName} Speaking (Interrupt anytime)`
                  : "Connecting voice..."}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <TrackToggle
              source={Track.Source.Microphone}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-b-[3px] border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-2xs hover:bg-slate-50"
            >
              <Mic size={14} />
              <span>Toggle Mic</span>
            </TrackToggle>

            <button
              onClick={handleEndSession}
              disabled={isEnding}
              className={`inline-flex items-center gap-2 rounded-xl border-b-4 px-6 py-2.5 text-xs font-black text-white shadow-md transition hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-0 disabled:opacity-50 ${
                allChunksCompleted
                  ? "border-emerald-800 bg-gradient-to-b from-emerald-400 to-emerald-600 shadow-emerald-500/25"
                  : "border-slate-950 bg-slate-900 hover:bg-slate-800"
              }`}
            >
              <span>
                {isEnding
                  ? "Validating..."
                  : allChunksCompleted
                    ? "Mission Complete! Finish & Unlock"
                    : "End & Validate Session"}
              </span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================
          RIGHT SIDECAR: DYNAMIC LIVE COACHING DECK + SPARKSFEED
      ========================================================= */}
      <div className="relative z-10 flex w-full flex-col justify-between rounded-[2rem] border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-6 shadow-2xl lg:w-88">
        <div className="space-y-5">
          {/* Deck Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl border-b-2 border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950 shadow-2xs">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-black tracking-wide text-slate-900 uppercase">
                  Live Coaching Deck
                </h3>
                <p className="text-[10px] font-bold text-slate-400">
                  Real-time cues &amp; speech sparks
                </p>
              </div>
            </div>

            {isHintUpdating && (
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            )}
          </div>

          {/* 1. Dynamic Coaching Direction */}
          <div className="rounded-2xl border-2 border-sky-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50/40 p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-blue-600 uppercase">
              <Compass className="h-3.5 w-3.5" />
              <span>Your Next Move</span>
            </div>
            <p className="mt-1.5 text-xs sm:text-sm font-extrabold leading-relaxed text-slate-800">
              {coachingTip}
            </p>

            {currentGoalChunk && (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-indigo-200/80 bg-white px-3 py-2">
                <div className="min-w-0">
                  <span className="block text-[9px] font-black tracking-wider text-indigo-500 uppercase">
                    Active Target Phrase
                  </span>
                  <span className="block truncate text-xs font-black text-slate-900">
                    « {currentGoalChunk} »
                  </span>
                  {currentGoalTranslation && (
                    <span className="block truncate text-[11px] font-semibold text-slate-500">
                      {currentGoalTranslation}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handlePlayPhraseAudio(currentGoalChunk)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-b-2 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-2xs transition hover:brightness-110"
                  title="Listen to phrase"
                >
                  <Volume2 size={14} />
                </button>
              </div>
            )}
          </div>

          {/* 2. Example Reply Lifeline */}
          <div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-[10px] font-black tracking-widest text-amber-600 uppercase">
                <Lightbulb className="h-3.5 w-3.5" />
                <span>Example Reply Lifeline</span>
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    handlePlayPhraseAudio(
                      suggestions?.starter ||
                        session?.starterHintTarget ||
                        currentGoalChunk ||
                        "",
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-black text-blue-600 hover:bg-sky-100"
                >
                  <Volume2 size={11} />
                  <span>Hear It</span>
                </button>

                {!isZeroLevel && (
                  <button
                    type="button"
                    onClick={() => setRevealReply((prev) => !prev)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-black text-slate-600 hover:bg-slate-100"
                  >
                    {revealReply ? <EyeOff size={11} /> : <Eye size={11} />}
                    <span>{revealReply ? "Hide" : "Peek"}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="mt-2 rounded-2xl border-2 border-b-4 border-amber-200 border-b-amber-300 bg-amber-50/50 p-4">
              {revealReply ? (
                <>
                  <p className="text-base font-black leading-snug text-slate-900">
                    &ldquo;
                    {suggestions?.starter ||
                      session?.starterHintTarget ||
                      currentGoalChunk}
                    &rdquo;
                  </p>
                  {(suggestions?.translation || session?.starterHintNative) && (
                    <p className="mt-1.5 text-xs font-semibold text-slate-600">
                      {suggestions?.translation || session?.starterHintNative}
                    </p>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setRevealReply(true)}
                  className="flex w-full flex-col items-center justify-center gap-1 py-2 text-center"
                >
                  <span className="text-xs font-black text-amber-800">
                    Need help phrasing your reply?
                  </span>
                  <span className="text-[11px] font-bold text-amber-600 underline">
                    Tap to reveal suggested French sentence
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* 3. Checklist of Target Phrases */}
          {requiredChunks.length > 0 && (
            <div>
              <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                Session Goals ({matchedChunks.size}/{requiredChunks.length})
              </span>
              <div className="mt-2 space-y-2">
                {requiredChunks.map((chunk, i) => {
                  const done = matchedChunks.has(chunk);
                  const meaning = chunkTranslations[i];
                  return (
                    <div
                      key={i}
                      onClick={() => handlePlayPhraseAudio(chunk)}
                      className={`flex cursor-pointer items-center justify-between rounded-2xl border-2 border-b-4 px-3.5 py-2.5 text-xs font-extrabold transition ${
                        done
                          ? "border-emerald-300 border-b-emerald-400 bg-emerald-50 text-emerald-900"
                          : "border-slate-200 border-b-slate-300 bg-white text-slate-800 hover:border-sky-300"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <span className="block truncate font-black">
                          {chunk}
                        </span>
                        {meaning && (
                          <span className="block truncate text-[11px] font-semibold text-slate-500">
                            {meaning}
                          </span>
                        )}
                      </div>
                      {done ? (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-2xs">
                          <Check size={13} strokeWidth={3.5} />
                        </span>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black text-blue-600">
                          <Volume2 size={11} />
                          Say it
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. #5 Live Micro-Wins / Speech Sparks Feed */}
          {sparks.length > 0 && (
            <div>
              <span className="flex items-center gap-1 text-[10px] font-black tracking-widest text-amber-600 uppercase">
                <Zap className="h-3 w-3 fill-amber-400 text-amber-500" />
                <span>Live Speech Sparks ({sparks.length})</span>
              </span>
              <div className="mt-2 max-h-28 space-y-1.5 overflow-y-auto pr-1">
                {sparks.slice(0, 3).map((sp) => (
                  <div
                    key={sp.id}
                    className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-1.5 text-[11px] font-black text-amber-950"
                  >
                    <span>⚡ {sp.label}</span>
                    <span className="truncate max-w-[120px] font-bold text-amber-700">
                      {sp.subLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50 p-3 text-xs font-medium leading-relaxed text-slate-500">
          <strong className="font-extrabold text-slate-700">Live Glue:</strong>{" "}
          Every note on {tutorName}&apos;s Notepad is automatically saved into
          your post-call AI Review!
        </div>
      </div>
    </div>
  );
}

export default function FreestyleChat({
  session,
  livekitToken,
  livekitUrl,
  onEnd,
}: FreestyleChatProps) {
  return (
    <LiveKitRoom
      serverUrl={livekitUrl}
      token={livekitToken}
      connect={true}
      audio={true}
      video={false}
      className="h-full w-full"
    >
      <LiveFreestyleChatInner session={session} onEnd={onEnd} />
    </LiveKitRoom>
  );
}
