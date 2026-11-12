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
} from "lucide-react";
import { FreestyleTimer } from "./freestyle-timer";
import { useMatrix } from "@/context/matrix-context";
import { useSpeak } from "@/hooks/use-speak";
import { toast } from "sonner";

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

function normalizeForMatch(str: string): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Matches either exact substring OR >= 75% of the content words in the phrase
 * so natural beginner variations still get rewarded!
 */
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

  const [messages, setMessages] = useState<any[]>([]);
  const [matchedChunks, setMatchedChunks] = useState<Set<string>>(new Set());
  const [showTranslations, setShowTranslations] = useState(true);
  const [isEnding, setIsEnding] = useState(false);

  // Dynamic Coaching State (updates after every AI turn!)
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

  // Level ZERO sees the French reply immediately; higher levels get a "Peek" toggle so we guide without hand-holding!
  const isZeroLevel = session?.level === "ZERO";
  const [revealReply, setRevealReply] = useState<boolean>(isZeroLevel);

  const sessionStartTime = useRef(Date.now());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const matchedChunksRef = useRef<Set<string>>(new Set());

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

  const aiAvatar =
    session?.aiAvatarUrl && !session.aiAvatarUrl.includes("dicebear")
      ? session.aiAvatarUrl
      : session?.voiceGender === "female"
        ? "/sprite-f.png"
        : "/sprite-m.png";

  const userAvatar =
    session?.userAvatarUrl ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${
      session?.userId || "Paul"
    }&backgroundColor=c0aede,b6e3f4`;

  const tutorName =
    session?.tutorName ||
    (session?.voiceGender === "female" ? "Sophie" : "Antoine");

  // Compute live speaking telemetry (Combo Streak & Avg Score)
  const userTurns = useMemo(
    () => messages.filter((m) => m.role === "user"),
    [messages],
  );
  const sessionAvgScore = useMemo(() => {
    const scored = userTurns
      .map(
        (m) =>
          m.pronunciationScore?.pronunciationScore ??
          m.pronunciationScore?.pronScore ??
          m.pronunciationScore?.accuracyScore,
      )
      .filter((v): v is number => typeof v === "number" && v > 0);
    if (scored.length === 0) return null;
    return Math.round(scored.reduce((a, b) => a + b, 0) / scored.length);
  }, [userTurns]);

  // Fetch a fresh, contextual coaching hint whenever the AI partner speaks!
  const refreshDynamicHint = useCallback(
    async (aiText: string, aiTranslation?: string | null) => {
      if (!aiText || !session?.userId) return;
      setIsHintUpdating(true);

      // Find the next uncompleted target phrase to weave into the hint
      const nextUnmatchedChunk =
        requiredChunks.find((c) => !matchedChunksRef.current.has(c)) ||
        requiredChunks[0] ||
        "";

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
      } catch (e) {
        console.warn("[FreestyleChat] Hint refresh skipped:", e);
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

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, agentState]);

  // Listen to "spoon-meta" data channel from Python Agent
  useDataChannel("spoon-meta", (msg) => {
    try {
      const payload = JSON.parse(new TextDecoder().decode(msg.payload));

      // 1. Assistant message arrived -> Update chat & trigger fresh Coaching Hint!
      if (payload.type === "AGENT_TURN") {
        const aiText = payload.text || "";
        const aiTrans =
          payload.translation ||
          payload.nativeText ||
          payload.englishTranslation ||
          null;

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

      // 2. User spoke -> Azure Pronunciation + Phrase Detection + Banked Words
      if (payload.type === "TURN_META" && payload.role === "user") {
        const text = payload.originalText || payload.text || "";
        const pron = payload.pronunciation;

        if (text && requiredChunks.length > 0) {
          setMatchedChunks((prev) => {
            const next = new Set(prev);
            for (const chunk of requiredChunks) {
              if (doesSpeechMatchPhrase(text, chunk)) {
                next.add(chunk);
              }
            }
            return next;
          });
        }

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
            id: `user-${Date.now()}`,
            role: "user",
            text,
            translation: payload.translation || payload.nativeText || null,
            pronunciationScore: pron,
          },
        ]);
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
          mistakes: [],
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

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col gap-5 overflow-hidden  p-4 sm:p-6 lg:flex-row">
      {/* Subtle dark scrim so the 3D white cards pop off the animated gradient */}
      <div className="pointer-events-none absolute inset-0 bg-slate-950/15 backdrop-blur-[1px]" />

      <RoomAudioRenderer />

      {/* =========================================================
          LEFT / MAIN CONVERSATION ARENA STAGE
      ========================================================= */}
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden rounded-[2rem] border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white shadow-2xl">
        {/* 1. Vibrant Arena Header */}
        <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 px-6 py-4 text-white">
          <div className="pointer-events-none absolute -top-12 right-10 h-32 w-32 rounded-full bg-sky-500/20 blur-2xl" />

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border-2 border-b-4 border-sky-400 bg-slate-900 shadow-md">
                <img
                  src={aiAvatar}
                  alt={tutorName}
                  className="h-full w-full object-cover object-top"
                />
                <span className="absolute right-0.5 bottom-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-black tracking-tight text-white">
                    {session?.topic || "Live Conversation Arena"}
                  </h2>
                  <span className="rounded-lg border border-sky-400/40 bg-sky-500/20 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-sky-300 uppercase">
                    {session?.level || "ZERO"}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-300">
                  Partner: <strong className="text-white">{tutorName}</strong> •{" "}
                  {session?.targetLanguage || "fr-FR"} Live Voice
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Live Combo / Resonance Pill */}
              {userTurns.length > 0 && (
                <div className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-500/20 px-3 py-1.5 text-xs font-black text-emerald-300">
                  <Zap className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span>{userTurns.length} Turns</span>
                  {sessionAvgScore !== null && (
                    <span className="text-white/90">• {sessionAvgScore}%</span>
                  )}
                </div>
              )}

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
                <span>
                  {showTranslations ? "Translations On" : "Translations Off"}
                </span>
              </button>

              <FreestyleTimer initialTime={180} onTimeUp={handleEndSession} />
            </div>
          </div>
        </div>

        {/* 2. Interactive Target Phrases Strip (With Audio Preview + English Meaning) */}
        {requiredChunks.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 bg-gradient-to-r from-sky-50/70 via-indigo-50/40 to-emerald-50/50 px-6 py-3">
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

        {/* 3. Conversation Stream Area */}
        <div className="flex-1 space-y-5 overflow-y-auto bg-slate-50/50 p-6 scroll-smooth">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-3xl border-2 border-b-4 border-sky-300 bg-white text-blue-600 shadow-md">
                <Mic size={28} className="animate-pulse" />
              </div>
              <p className="text-base font-black text-slate-900">
                {agentState === "connecting"
                  ? `Connecting to ${tutorName}...`
                  : `${tutorName} is ready! Speak anytime.`}
              </p>
              <p className="mt-1 max-w-sm text-xs font-semibold text-slate-500">
                Check the{" "}
                <strong className="text-blue-600">Live Coaching Deck</strong> on
                the right for real-time ideas and phrase support on every turn!
              </p>
            </div>
          )}

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
            const acc = pron
              ? Math.round(pron.accuracyScore ?? overall ?? 0)
              : null;
            const flow = pron
              ? Math.round(pron.fluencyScore ?? overall ?? 0)
              : null;
            const isHighPass = overall !== null && overall >= 80;

            // AI ASSISTANT BUBBLE
            if (!isUser) {
              return (
                <div
                  key={message.id}
                  className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200"
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-2xl border-2 border-b-[3px] border-sky-400 bg-slate-900 shadow-xs">
                    <img
                      src={aiAvatar}
                      alt={tutorName}
                      className="h-full w-full object-cover object-top"
                    />
                  </div>

                  <div className="max-w-[80%] rounded-2xl rounded-tl-sm border-2 border-b-4 border-slate-200 border-b-slate-300 bg-white px-4 py-3 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed">
                        {message.text}
                      </p>
                      <button
                        type="button"
                        onClick={() => handlePlayPhraseAudio(message.text)}
                        title="Replay audio"
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

            // USER TURN (With User Avatar + Word Underlines + Telemetry Pill)
            return (
              <div
                key={message.id}
                className="flex items-start justify-end gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200"
              >
                <div className="flex flex-col items-end gap-1.5">
                  <div className="max-w-md rounded-2xl rounded-tr-sm border-b-4 border-indigo-800 bg-gradient-to-b from-indigo-500 to-indigo-600 px-4 py-3 text-white shadow-md">
                    {pron?.words?.length ? (
                      <p className="flex flex-wrap gap-x-1.5 gap-y-1 text-sm sm:text-base font-bold leading-relaxed">
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
                      </p>
                    ) : (
                      <p className="text-sm sm:text-base font-bold leading-relaxed">
                        {message.text}
                      </p>
                    )}

                    {showTranslations && message.translation && (
                      <p className="mt-1 border-t border-white/15 pt-1 text-xs font-medium text-indigo-100">
                        {message.translation}
                      </p>
                    )}
                  </div>

                  {/* Pronunciation Telemetry Bar */}
                  {overall !== null && (
                    <div
                      className={`inline-flex flex-wrap items-center gap-3 rounded-full border px-3.5 py-1 text-[11px] font-black shadow-2xs ${
                        isHighPass
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-800"
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        {isHighPass ? (
                          <Flame size={13} className="text-emerald-600" />
                        ) : (
                          <Target size={13} className="text-amber-600" />
                        )}
                        {overall}%{" "}
                        <span className="text-[9px] tracking-wider uppercase opacity-80">
                          {isHighPass ? "Native Flow" : "Keep Sharpening"}
                        </span>
                      </span>

                      {acc !== null && (
                        <span className="flex items-center gap-1 text-[10px] opacity-85">
                          ACC
                          <span className="h-1.5 w-8 overflow-hidden rounded-full bg-black/10">
                            <span
                              style={{ width: `${acc}%` }}
                              className={`block h-full ${
                                isHighPass ? "bg-emerald-500" : "bg-amber-500"
                              }`}
                            />
                          </span>
                        </span>
                      )}

                      {flow !== null && (
                        <span className="flex items-center gap-1 text-[10px] opacity-85">
                          FLOW
                          <span className="h-1.5 w-8 overflow-hidden rounded-full bg-black/10">
                            <span
                              style={{ width: `${flow}%` }}
                              className={`block h-full ${
                                isHighPass ? "bg-emerald-500" : "bg-amber-500"
                              }`}
                            />
                          </span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* User Avatar */}
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

          {/* AI Speaking / Thinking Indicator */}
          {agentState === "speaking" && (
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 overflow-hidden rounded-2xl border-2 border-sky-300 bg-slate-900">
                <img
                  src={aiAvatar}
                  alt={tutorName}
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <div className="flex items-center gap-2.5 rounded-2xl border border-indigo-200 bg-white px-4 py-2.5 text-xs font-black text-indigo-700 shadow-2xs">
                <Volume2 className="h-4 w-4 animate-pulse text-indigo-600" />
                <span>{tutorName} is speaking...</span>
              </div>
            </div>
          )}

          {agentState === "thinking" && (
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-900">
                <img
                  src={aiAvatar}
                  alt={tutorName}
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 shadow-2xs">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                <span>{tutorName} is thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} className="h-2" />
        </div>

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
          RIGHT SIDECAR: DYNAMIC LIVE COACHING DECK
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
                  Updates dynamically on every turn
                </p>
              </div>
            </div>

            {isHintUpdating && (
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            )}
          </div>

          {/* 1. Dynamic Coaching Direction (Guides without Hand-Holding!) */}
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

          {/* 2. Suggested Reply Lifeline (With Listen + Peek Toggle) */}
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
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-50 p-3.5 text-xs font-medium leading-relaxed text-slate-500">
          <strong className="font-extrabold text-slate-700">Pro Tip:</strong>{" "}
          Click any target phrase to hear its pronunciation, then weave it into
          your reply!
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