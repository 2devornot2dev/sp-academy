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
  Mic,
  Check,
  Target,
  Volume2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FoundationFreestyleChatBubble } from "./foundation-freestye-chat-bubble";
import { useMatrix } from "@/context/matrix-context";
import { useSprite } from "@/context/sprite-context";
import { useSpeak } from "@/hooks/use-speak";
import { toast } from "sonner";

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
  const [completedChunks, setCompletedChunks] = useState<Set<string>>(
    new Set(),
  );
  const [activeReaction, setActiveReaction] = useState<{
    id: number;
    emoji: string;
    mood: string;
    label?: string;
  } | null>(null);

  // 2.5 Minute Sprint Timer (150s)
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

  // Use Vox/Vivi as the Roleplay Partner
  const partnerName = spriteName || "Vox";
  const partnerAvatarUrl = avatarSrc || session?.aiAvatarUrl;

  // Dynamic Reply Lifeline state (updates after every AI turn so user is never stuck)
  const [liveHint, setLiveHint] = useState<{
    starter: string;
    translation?: string;
    coachingTip?: string;
  }>({
    starter:
      starterHintTarget ||
      requiredChunks[0] ||
      "",
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
      partnerName.toLowerCase() === "vivi" ? "female" : "male",
    );
  };

  // Refresh dynamic reply suggestion after each AI turn
  const refreshReplyLifeline = useCallback(
    async (aiText: string, aiTranslation?: string | null) => {
      const nextChunk =
        requiredChunks.find((c) => !completedChunksRef.current.has(c)) || "";

      // Fallback update immediately if userId isn't on session
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

  // 2.5m Countdown Timer
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

  // Auto-complete once all target phrases are hit AND >= 3 user turns spoken!
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

        if (spokenText && requiredChunks.length > 0) {
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
              completedChunksRef.current = next;
              return next;
            }
            return prev;
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
  }, [messages, agentState, activeReaction]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = String(secondsLeft % 60).padStart(2, "0");

  const displaySuggestion =
    liveHint.starter || nextUnmatchedChunk || starterHintTarget || "";

  return (
    <div className="flex flex-1 flex-col justify-between gap-3.5">
      <RoomAudioRenderer />

      {/* 1. TOP BAR: Live Reply Lifeline with Vox/Vivi + 2.5m Sprint Timer */}
      <div className="flex shrink-0 flex-col justify-between gap-3 rounded-2xl border-2 border-b-4 border-sky-200 border-b-sky-300 bg-gradient-to-r from-sky-50/90 via-white to-indigo-50/40 p-3.5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl border-2 border-b-[3px] border-sky-400 bg-slate-900 shadow-2xs">
            <img
              src={partnerAvatarUrl}
              alt={partnerName}
              className="h-full w-full object-cover object-top"
            />
            <span className="absolute right-0.5 bottom-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-black tracking-widest text-blue-600 uppercase">
                <Lightbulb size={12} className="text-amber-500" />
                {liveHint.coachingTip || `Roleplay with ${partnerName}`}
              </span>
              {isHintLoading && (
                <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
              )}
            </div>

            {displaySuggestion ? (
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <p className="text-xs font-bold text-slate-700 sm:text-sm">
                  Try saying:{" "}
                  <span className="font-black text-slate-900">
                    &ldquo;{displaySuggestion}&rdquo;
                  </span>
                </p>
                {liveHint.translation && (
                  <span className="text-xs font-semibold text-slate-400">
                    ({liveHint.translation})
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handlePlayPhraseAudio(displaySuggestion)}
                  className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-black text-blue-600 transition hover:bg-sky-100"
                >
                  <Volume2 size={11} />
                  <span>Hear</span>
                </button>
              </div>
            ) : (
              <p className="text-xs font-bold text-slate-600">
                Speak naturally in {session?.targetLanguage || "your target language"}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
          <div className="inline-flex items-center gap-1.5 rounded-xl border-2 border-b-[3px] border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-700">
            <Sparkles size={13} className="text-indigo-500" />
            <span>Turns: {Math.min(userTurnCount, 3)}/3</span>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-xl border-2 border-b-[3px] border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-800 shadow-2xs">
            <Timer size={14} className="text-blue-600" />
            <span>
              {mins}:{secs}
            </span>
          </div>
        </div>
      </div>

      {/* 2. 3D TARGET PHRASES CHECKLIST (Clickable to hear pronunciation!) */}
      {requiredChunks.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2.5 ring-1 ring-slate-200/80">
          <span className="mr-1 text-[10px] font-black tracking-wider text-slate-400 uppercase">
            Mission Phrases ({completedChunks.size}/{requiredChunks.length}):
          </span>
          {requiredChunks.map((chunk) => {
            const hit = completedChunks.has(chunk);
            return (
              <button
                key={chunk}
                type="button"
                onClick={() => handlePlayPhraseAudio(chunk)}
                title="Tap to hear pronunciation"
                className={`inline-flex items-center gap-1.5 rounded-xl border-b-2 px-3 py-1 text-xs font-black transition-all duration-300 active:translate-y-0.5 ${
                  hit
                    ? "scale-105 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-xs"
                    : "border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-400 hover:bg-amber-100/70"
                }`}
              >
                {hit ? (
                  <Check size={12} strokeWidth={3.5} />
                ) : (
                  <Target size={12} className="text-amber-600" />
                )}
                <span>{chunk}</span>
                <Volume2
                  size={11}
                  className={hit ? "text-emerald-100" : "text-amber-600"}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* 3. CLEAN LIGHT CHAT STREAM */}
      <div className="relative h-[380px] overflow-hidden rounded-3xl border-2 border-slate-200/80 bg-slate-50/60 shadow-inner">
        {activeReaction && (
          <div
            key={activeReaction.id}
            className="absolute top-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2.5 rounded-full border-2 border-b-4 border-indigo-300 bg-white px-5 py-2 shadow-xl animate-in zoom-in-75 fade-in slide-in-from-top-4 duration-300"
          >
            <span className="animate-bounce text-2xl">
              {activeReaction.emoji}
            </span>
            <span className="text-xs font-black tracking-wider text-indigo-700 uppercase">
              {activeReaction.label || activeReaction.mood}
            </span>
          </div>
        )}

        <ScrollArea className="h-full">
          <div className="space-y-5 p-5 sm:p-7">
            {messages.length === 0 && (
              <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
                <p className="text-sm font-bold text-slate-400">
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

            {agentState === "thinking" && (
              <FoundationFreestyleChatBubble
                message={{ id: "thinking", role: "assistant", text: "" }}
                aiAvatarUrl={partnerAvatarUrl}
                ttsStatus="thinking"
              />
            )}

            <div ref={messagesEndRef} className="h-4" />
          </div>
        </ScrollArea>
      </div>

      {/* 4. BOTTOM LIVE STATUS & 3D ACTION BAR */}
      <div className="flex shrink-0 flex-col gap-3 md:flex-row">
        <div className="flex min-w-0 flex-1 items-center justify-between rounded-2xl bg-slate-50 px-5 py-3.5 ring-1 ring-slate-200/80">
          <div className="flex items-center gap-3">
            <span
              className={`h-3 w-3 rounded-full ${
                agentState === "listening"
                  ? "animate-ping bg-emerald-500"
                  : agentState === "speaking"
                    ? "animate-pulse bg-blue-500"
                    : "bg-amber-400"
              }`}
            />
            <span className="text-xs font-black text-slate-800 sm:text-sm">
              {agentState === "listening"
                ? `Listening (Reply to ${partnerName})...`
                : agentState === "speaking"
                  ? `${partnerName} Speaking...`
                  : "Connecting voice..."}
            </span>
          </div>

          <TrackToggle
            source={Track.Source.Microphone}
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-b-[3px] border-slate-200 bg-white px-3.5 py-1.5 text-xs font-black text-slate-700 transition hover:bg-slate-100"
          >
            <Mic size={14} className="text-blue-600" />
            Toggle Mic
          </TrackToggle>
        </div>

        <button
          type="button"
          onClick={handleFinishSession}
          disabled={isEnding}
          className={`inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl border-b-4 px-8 py-4 text-base font-black text-white shadow-lg transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0 disabled:opacity-50 md:w-auto ${
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
          <ArrowRight size={18} />
        </button>
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
    >
      <LiveKitChatInner session={session} onEnd={onEnd} />
    </LiveKitRoom>
  );
}