// components/foundation/foundation-chat.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useVoiceAssistant,
  useDataChannel,
  TrackToggle,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import {
  ArrowRight,
  Lightbulb,
  Timer,
  Check,
  Target,
  Volume2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { FoundationFreestyleChatBubble } from "./foundation-freestye-chat-bubble";
import { useMatrix } from "@/context/matrix-context";
import { useSprite } from "@/context/sprite-context";
import { useSpeak } from "@/hooks/use-speak";
import { toast } from "sonner";
import { playSfx } from "@/lib/sfx";

const normalizeText = (s: string) =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

function doesSpeechMatchChunk(spoken: string, targetChunk: string): boolean {
  const normSpoken = normalizeText(spoken);
  const normChunk = normalizeText(targetChunk);
  if (!normSpoken || !normChunk) return false;
  if (normSpoken.includes(normChunk)) return true;

  const targetWords = normChunk.split(" ").filter((w) => w.length > 2);
  if (targetWords.length === 0) return false;

  const spokenSet = new Set(normSpoken.split(" "));
  const hits = targetWords.filter((w) => spokenSet.has(w)).length;
  return hits / targetWords.length >= 0.75;
}

function LiveKitChatInner({
  session,
  onEnd,
}: {
  session: any;
  onEnd: () => void;
}) {
  const { state: agentState } = useVoiceAssistant();
  const { trackInteraction } = useMatrix();
  const { spriteName, avatarSrc } = useSprite();
  const { speak, isPlaying: isTtsPlaying } = useSpeak();

  const [messages, setMessages] = useState<any[]>([]);
  const [streamingUserTurn, setStreamingUserTurn] = useState<{
    text: string;
    isFinal: boolean;
  } | null>(null);

  const [completedChunks, setCompletedChunks] = useState<Set<string>>(
    new Set(),
  );
  const [activeReaction, setActiveReaction] = useState<{
    id: number;
    emoji: string;
    mood: string;
    label?: string;
  } | null>(null);

  const [secondsLeft, setSecondsLeft] = useState(150);
  const [isEnding, setIsEnding] = useState(false);

  const freestyleData = session?.freestyleData || {};
  const nativeSentence = freestyleData?.nativeSentence;
  const starterHintTarget =
    freestyleData?.starterHintTarget || freestyleData?.targetSentence;
  const requiredChunks: string[] = useMemo(
    () => freestyleData?.requiredChunks || freestyleData?.targetPhrases || [],
    [freestyleData?.requiredChunks, freestyleData?.targetPhrases],
  );

  const partnerName = spriteName || "Vox";
  const partnerAvatarUrl = avatarSrc || session?.aiAvatarUrl;
  const isFemalePartner =
    partnerName.toLowerCase() === "vivi" ||
    partnerName.toLowerCase() === "deva";

  const [liveHint, setLiveHint] = useState<{
    starter: string;
    translation?: string;
    coachingTip?: string;
  }>({
    starter: starterHintTarget || requiredChunks[0] || "",
    translation: nativeSentence || "",
    coachingTip: `Roleplay with ${partnerName} and weave in your target phrases!`,
  });
  const [isHintLoading, setIsHintLoading] = useState(false);

  const sessionStartRef = useRef(Date.now());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const completedChunksRef = useRef<Set<string>>(new Set());
  const autoEndedRef = useRef(false);

  useEffect(() => {
    completedChunksRef.current = completedChunks;
  }, [completedChunks]);

  const checkAndMarkChunks = useCallback(
    (spokenText: string) => {
      if (!spokenText || requiredChunks.length === 0) return;
      setCompletedChunks((prev) => {
        const next = new Set(prev);
        let changed = false;
        requiredChunks.forEach((chunk) => {
          if (!next.has(chunk) && doesSpeechMatchChunk(spokenText, chunk)) {
            next.add(chunk);
            changed = true;
          }
        });
        if (changed) {
          playSfx("spark");
          completedChunksRef.current = next;
          return next;
        }
        return prev;
      });
    },
    [requiredChunks],
  );

  const userTurnCount = useMemo(
    () => messages.filter((m) => m.role === "user").length,
    [messages],
  );

  const allChunksCompleted =
    requiredChunks.length > 0 &&
    completedChunks.size >= requiredChunks.length;

  const missionGoalsMet = allChunksCompleted && userTurnCount >= 3;

  const nextUnmatchedChunk = useMemo(
    () => requiredChunks.find((c) => !completedChunks.has(c)) || null,
    [requiredChunks, completedChunks],
  );

  const handlePlayPhraseAudio = (text?: string) => {
    if (!text || isTtsPlaying) return;
    void speak(
      text,
      session?.targetLanguage || "fr-FR",
      0.95,
      isFemalePartner ? "female" : "male",
    );
  };

  const refreshReplyLifeline = useCallback(
    async (aiText: string, aiTranslation?: string | null) => {
      const nextChunk =
        requiredChunks.find((c) => !completedChunksRef.current.has(c)) || "";

      if (!session?.userId) {
        if (nextChunk) {
          setLiveHint((prev) => ({
            ...prev,
            starter: nextChunk,
            coachingTip: `Reply to ${partnerName} using "${nextChunk}"!`,
          }));
        }
        return;
      }

      setIsHintLoading(true);
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
              nextTargetChunk: nextChunk,
              level: freestyleData?.level || "ZERO",
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
          setLiveHint({
            starter: data.starter || nextChunk || starterHintTarget || "",
            translation: data.translation || "",
            coachingTip:
              data.coachingTip ||
              (nextChunk
                ? `Try replying with "${nextChunk}"!`
                : `Great job! Give ${partnerName} one more natural reply.`),
          });
        }
      } catch {
        // Ignore network blips
      } finally {
        setIsHintLoading(false);
      }
    },
    [
      freestyleData?.level,
      partnerName,
      requiredChunks,
      session?.nativeLanguage,
      session?.targetLanguage,
      session?.userId,
      starterHintTarget,
    ],
  );

  const handleFinishSession = useCallback(async () => {
    if (isEnding) return;
    setIsEnding(true);

    const duration = Math.round((Date.now() - sessionStartRef.current) / 1000);
    const toastId = toast.loading("Completing roleplay mission...", {
      description: `Saving your progress with ${partnerName}.`,
    });

    try {
      await fetch("/api/foundation/freestyle/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...session,
          sessionId: session.id,
          messages,
          mistakes: [],
          duration,
        }),
      });

      toast.success("Roleplay Mission Complete! 🎉", { id: toastId });
    } catch {
      toast.dismiss(toastId);
    } finally {
      onEnd();
    }
  }, [isEnding, messages, onEnd, partnerName, session]);

  const handleFinishRef = useRef(handleFinishSession);
  handleFinishRef.current = handleFinishSession;

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          void handleFinishRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (
      !autoEndedRef.current &&
      !isEnding &&
      missionGoalsMet &&
      agentState !== "speaking"
    ) {
      autoEndedRef.current = true;
      const t = setTimeout(() => {
        void handleFinishRef.current();
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [missionGoalsMet, isEnding, agentState]);

  useDataChannel("spoon-meta", (msg) => {
    try {
      const payload = JSON.parse(new TextDecoder().decode(msg.payload));

      if (payload.type === "AI_REACTION") {
        setActiveReaction({
          id: Date.now(),
          emoji: payload.emoji,
          mood: payload.mood,
          label: payload.label,
        });
        setTimeout(() => setActiveReaction(null), 4000);
        return;
      }

      if (payload.type === "USER_TRANSCRIPT_STREAM" && payload.text) {
        const text = String(payload.text).trim();
        const isFinal = Boolean(payload.isFinal);
        setStreamingUserTurn({ text, isFinal });
        checkAndMarkChunks(text);
        return;
      }

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
            id: Date.now() + Math.random(),
            role: "assistant",
            text: aiText,
            translation: aiTrans,
          },
        ]);

        if (payload.suggestedTarget) {
          setLiveHint({
            starter: payload.suggestedTarget,
            translation: payload.suggestedNative || "",
            coachingTip: `Reply to ${partnerName}:`,
          });
        } else if (aiText) {
          void refreshReplyLifeline(aiText, aiTrans);
        }
        return;
      }

      if (payload.type === "TURN_META" && payload.role === "user") {
        const spokenText = payload.originalText || "";
        const pron = payload.pronunciation;

        setStreamingUserTurn(null);
        checkAndMarkChunks(spokenText);

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
            id: Date.now() + Math.random(),
            role: "user",
            text: spokenText,
            isAnalyzingPronunciation: false,
            pronunciationScore: pron
              ? {
                  accuracyScore: pron.accuracyScore,
                  fluencyScore: pron.fluencyScore,
                  score: pron.pronScore ?? pron.accuracyScore,
                  words: pron.words ?? [],
                }
              : undefined,
          },
        ]);
      }
    } catch (err) {
      console.warn("Failed to parse spoon-meta packet:", err);
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingUserTurn, agentState, activeReaction]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = String(secondsLeft % 60).padStart(2, "0");

  const displaySuggestion =
    liveHint.starter || nextUnmatchedChunk || starterHintTarget || "";

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-between gap-2 sm:gap-3">
      <RoomAudioRenderer />

      {/* 1. COMPACT SINGLE-LINE GOAL + TIMER STRIP */}
      <div className="flex shrink-0 items-center justify-between gap-2 rounded-2xl bg-slate-50 px-2.5 py-1.5 sm:px-4 sm:py-2.5 ring-1 ring-slate-200/80">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto sm:flex-wrap [&::-webkit-scrollbar]:hidden">
          {requiredChunks.map((chunk) => {
            const hit = completedChunks.has(chunk);
            return (
              <button
                key={chunk}
                type="button"
                onClick={() => handlePlayPhraseAudio(chunk)}
                title="Tap to hear pronunciation"
                className={`inline-flex shrink-0 items-center gap-1 rounded-lg border-b-2 px-2.5 py-1 text-[11px] font-black whitespace-nowrap transition-all active:translate-y-0.5 ${
                  hit
                    ? "border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-xs"
                    : "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100/70"
                }`}
              >
                {hit ? (
                  <Check size={11} strokeWidth={3.5} />
                ) : (
                  <Target size={11} className="text-amber-600" />
                )}
                <span>{chunk}</span>
                <Volume2
                  size={10}
                  className={hit ? "text-emerald-100" : "text-amber-600"}
                />
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <div className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-black text-indigo-700">
            <Sparkles size={11} className="text-indigo-500" />
            <span>{Math.min(userTurnCount, 3)}/3</span>
          </div>

          <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1 text-[11px] font-black text-slate-800 shadow-2xs">
            <Timer size={12} className="text-blue-600" />
            <span>
              {mins}:{secs}
            </span>
          </div>
        </div>
      </div>

      {/* 2. EXPANSIVE CHAT STREAM + DOCKED BOTTOM SUGGESTION */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-slate-200/80 bg-slate-50/60 shadow-inner">
        {activeReaction && (
          <div
            key={activeReaction.id}
            className="absolute top-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border-2 border-b-4 border-indigo-300 bg-white px-4 py-1.5 shadow-xl animate-in zoom-in-75 fade-in slide-in-from-top-4 duration-300"
          >
            <span className="animate-bounce text-xl">
              {activeReaction.emoji}
            </span>
            <span className="text-[11px] font-black tracking-wider text-indigo-700 uppercase">
              {activeReaction.label || activeReaction.mood}
            </span>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
          <div className="space-y-3 sm:space-y-4">
            {messages.length === 0 && !streamingUserTurn && (
              <div className="flex min-h-[120px] flex-col items-center justify-center text-center">
                <p className="text-xs sm:text-sm font-bold text-slate-400">
                  {agentState === "connecting"
                    ? `Connecting voice roleplay with ${partnerName}...`
                    : `${partnerName} is listening! Start speaking naturally.`}
                </p>
              </div>
            )}

            {messages.map((message) => (
              <FoundationFreestyleChatBubble
                key={message.id}
                message={message}
                aiAvatarUrl={partnerAvatarUrl}
                ttsStatus="idle"
              />
            ))}

            {streamingUserTurn && (
              <FoundationFreestyleChatBubble
                key="streaming-user-turn"
                message={{
                  id: "streaming-user-turn",
                  role: "user",
                  text: streamingUserTurn.text,
                  isAnalyzingPronunciation: streamingUserTurn.isFinal,
                }}
                aiAvatarUrl={partnerAvatarUrl}
                ttsStatus="idle"
              />
            )}

            {agentState === "thinking" && (
              <FoundationFreestyleChatBubble
                message={{ id: "thinking", role: "assistant", text: "" }}
                aiAvatarUrl={partnerAvatarUrl}
                ttsStatus="thinking"
              />
            )}

            <div ref={messagesEndRef} className="h-1" />
          </div>
        </div>

        {/* Docked Bottom Suggestion Strip (Pinned above Mic bar, outside scrolling messages!) */}
        {displaySuggestion && !streamingUserTurn && (
          <div className="flex shrink-0 items-center justify-between gap-2.5 border-t border-sky-200/80 bg-white/95 px-3 py-2 sm:px-4 sm:py-2.5">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <Lightbulb
                size={15}
                className="mt-0.5 shrink-0 text-amber-500"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[10px] font-black tracking-wider text-blue-600 uppercase">
                    {liveHint.coachingTip || "Try saying"}
                  </span>
                  {isHintLoading && (
                    <Loader2 className="h-3 w-3 shrink-0 animate-spin text-blue-500" />
                  )}
                </div>
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <p className="text-xs sm:text-sm font-black text-slate-900">
                    &ldquo;{displaySuggestion}&rdquo;
                  </p>
                  {liveHint.translation && (
                    <span className="truncate text-[11px] font-semibold text-slate-400">
                      ({liveHint.translation})
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handlePlayPhraseAudio(displaySuggestion)}
              className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[11px] font-black text-blue-600 hover:bg-sky-100"
            >
              <Volume2 size={12} />
              <span>Hear</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. SINGLE-ROW BOTTOM LIVE STATUS & 3D ACTION BAR */}
      <div className="flex shrink-0 items-center justify-between gap-2 rounded-2xl bg-slate-50 px-3 py-2 sm:px-4 sm:py-2.5 ring-1 ring-slate-200/80">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
              agentState === "listening"
                ? "animate-ping bg-emerald-500"
                : agentState === "speaking"
                  ? "animate-pulse bg-blue-500"
                  : "bg-amber-400"
            }`}
          />
          <span className="truncate text-xs font-black text-slate-800 sm:text-sm">
            {streamingUserTurn && !streamingUserTurn.isFinal
              ? `Hearing: "${streamingUserTurn.text}"`
              : agentState === "listening"
                ? `Listening (${partnerName})...`
                : agentState === "speaking"
                  ? `${partnerName} Speaking...`
                  : "Connecting..."}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          <TrackToggle
            source={Track.Source.Microphone}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border-2 border-b-[3px] border-slate-200 bg-white px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100"
          >
            <span>Mic</span>
          </TrackToggle>

          <button
            type="button"
            onClick={handleFinishSession}
            disabled={isEnding}
            className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border-b-4 px-3.5 py-2 sm:px-6 sm:py-2.5 text-xs sm:text-sm font-black text-white shadow-md transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0 disabled:opacity-50 ${
              allChunksCompleted
                ? "border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 shadow-emerald-500/25"
                : "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 shadow-blue-500/25"
            }`}
          >
            <span>
              {isEnding
                ? "Saving..."
                : allChunksCompleted
                  ? "Mission Complete!"
                  : "Finish Mission"}
            </span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FoundationChat({
  session,
  onEnd,
}: {
  session: any;
  onEnd: () => void;
}) {
  return (
    <LiveKitRoom
      serverUrl={session.livekitUrl}
      token={session.livekitToken}
      connect={true}
      audio={true}
      video={false}
      className="flex min-h-0 flex-1 flex-col"
    >
      <LiveKitChatInner session={session} onEnd={onEnd} />
    </LiveKitRoom>
  );
}