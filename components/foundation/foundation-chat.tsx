// foundation-chat.tsx
"use client";

import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FoundationFreestyleChatBubble } from "./foundation-freestye-chat-bubble";
import { useMatrix } from "@/context/matrix-context";
import { toast } from "sonner";

const normalizeText = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

function LiveKitChatInner({
  session,
  onEnd,
}: {
  session: any;
  onEnd: () => void;
}) {
  const { state: agentState } = useVoiceAssistant();
  const { trackInteraction } = useMatrix();

  const [messages, setMessages] = useState<any[]>([]);
  const [completedChunks, setCompletedChunks] = useState<Set<string>>(
    new Set()
  );
  const [activeReaction, setActiveReaction] = useState<{
    id: number;
    emoji: string;
    mood: string;
    label?: string;
  } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [isEnding, setIsEnding] = useState(false);

  const sessionStartRef = useRef(Date.now());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const freestyleData = session?.freestyleData || {};
  const nativeSentence = freestyleData?.nativeSentence;
  const starterHintTarget = freestyleData?.starterHintTarget;
  const requiredChunks: string[] =
    freestyleData?.requiredChunks || freestyleData?.targetPhrases || [];
  const aiAvatarUrl = session?.aiAvatarUrl;

  const allChunksCompleted =
    requiredChunks.length > 0 &&
    completedChunks.size === requiredChunks.length;

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinishSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            role: "assistant",
            text: payload.text,
            translation: payload.translation,
          },
        ]);
        return;
      }

      if (payload.type === "TURN_META" && payload.role === "user") {
        const spokenText = payload.originalText || "";
        const pron = payload.pronunciation;

        const normSpoken = normalizeText(spokenText);
        if (normSpoken && requiredChunks.length > 0) {
          requiredChunks.forEach((chunk) => {
            const normChunk = normalizeText(chunk);
            if (normChunk && normSpoken.includes(normChunk)) {
              setCompletedChunks((prev) => {
                if (prev.has(chunk)) return prev;
                const next = new Set(prev);
                next.add(chunk);
                return next;
              });
            }
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

  const handleFinishSession = async () => {
    if (isEnding) return;
    setIsEnding(true);

    const duration = Math.round((Date.now() - sessionStartRef.current) / 1000);
    const toastId = toast.loading("Saving session...", {
      description: "Logging your spoken progress.",
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

      toast.success("Session Complete!", { id: toastId });
    } catch (e) {
      toast.dismiss(toastId);
    } finally {
      onEnd();
    }
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="flex flex-1 flex-col justify-between gap-3.5">
      <RoomAudioRenderer />

      {/* 1. TOP BAR: Mission Hint + 3D Sprint Timer */}
      <div className="flex shrink-0 flex-col justify-between gap-3 rounded-2xl bg-sky-50/80 p-3.5 ring-1 ring-sky-200/80 sm:flex-row sm:items-center">
        {nativeSentence || starterHintTarget ? (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-b-2 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white">
              <Lightbulb size={18} />
            </div>
            <div>
              <h4 className="text-[10px] font-black tracking-widest text-blue-600 uppercase">
                Mission Hint
              </h4>
              <p className="text-xs sm:text-sm font-bold text-slate-700">
                Try saying:{" "}
                <span className="font-black text-slate-900">
                  &ldquo;{starterHintTarget || nativeSentence}&rdquo;
                </span>
              </p>
            </div>
          </div>
        ) : (
          <div className="text-sm font-black text-blue-700">
            Speak naturally in {session?.targetLanguage}
          </div>
        )}

        <div className="inline-flex items-center gap-1.5 self-end sm:self-center rounded-xl border-b-2 border-slate-300 bg-white px-3 py-1.5 text-xs font-black text-slate-800 shadow-2xs">
          <Timer size={14} className="text-blue-600" />
          <span>
            {mins}:{secs}
          </span>
        </div>
      </div>

      {/* 2. 3D TARGET PHRASES CHECKLIST */}
      {requiredChunks.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2.5 ring-1 ring-slate-200/80">
          <span className="mr-1 text-[10px] font-black tracking-wider text-slate-400 uppercase">
            Target Phrases ({completedChunks.size}/{requiredChunks.length}):
          </span>
          {requiredChunks.map((chunk) => {
            const hit = completedChunks.has(chunk);
            return (
              <span
                key={chunk}
                className={`inline-flex items-center gap-1.5 rounded-xl border-b-2 px-3 py-1 text-xs font-black transition-all duration-300 ${
                  hit
                    ? "border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white scale-105 shadow-xs"
                    : "border-amber-300 bg-amber-50 text-amber-900"
                }`}
              >
                {hit ? (
                  <Check size={12} strokeWidth={3.5} />
                ) : (
                  <Target size={12} className="text-amber-600" />
                )}
                <span>{chunk}</span>
              </span>
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
                    ? "Connecting to live voice channel..."
                    : "Microphone is live! Start speaking naturally."}
                </p>
              </div>
            )}

            {messages.map((message) => (
              <FoundationFreestyleChatBubble
                key={message.id}
                message={message}
                aiAvatarUrl={aiAvatarUrl}
                ttsStatus="idle"
              />
            ))}

            {agentState === "thinking" && (
              <FoundationFreestyleChatBubble
                message={{ id: "thinking", role: "assistant", text: "" }}
                aiAvatarUrl={aiAvatarUrl}
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
            <span className="text-xs sm:text-sm font-black text-slate-800">
              {agentState === "listening"
                ? "Listening (Speak anytime)..."
                : agentState === "speaking"
                  ? "Partner Speaking..."
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
          className={`inline-flex w-full md:w-auto shrink-0 items-center justify-center gap-2 rounded-2xl border-b-4 px-8 py-4 text-base font-black text-white shadow-lg transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0 disabled:opacity-50 ${
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