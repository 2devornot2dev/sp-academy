// components/freestyle/freestyle-chat.tsx
"use client";

import { useEffect, useRef, useState, useMemo } from "react";
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
} from "lucide-react";
import { FreestyleTimer } from "./freestyle-timer";
import { useMatrix } from "@/context/matrix-context";
import { toast } from "sonner";

interface FreestyleChatProps {
  session: any;
  livekitToken: string;
  livekitUrl: string;
  onEnd: () => void;
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

function LiveFreestyleChatInner({
  session,
  onEnd,
}: {
  session: any;
  onEnd: () => void;
}) {
  const { state: agentState } = useVoiceAssistant();
  const { trackInteraction } = useMatrix();

  const [messages, setMessages] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<{
    starter?: string;
    translation?: string;
  }>({
    starter: session?.starterHintTarget,
    translation: session?.starterHintNative,
  });
  const [matchedChunks, setMatchedChunks] = useState<Set<string>>(new Set());
  const [showTranslations, setShowTranslations] = useState(true);
  const [isEnding, setIsEnding] = useState(false);

  const sessionStartTime = useRef(Date.now());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const requiredChunks: string[] = useMemo(
    () => session?.requiredChunks || [],
    [session?.requiredChunks],
  );

  const aiAvatar =
    session?.aiAvatarUrl && !session.aiAvatarUrl.includes("dicebear")
      ? session.aiAvatarUrl
      : session?.voiceGender === "female"
        ? "/sprite-f.png"
        : "/sprite-m.png";

  const tutorName =
    session?.tutorName ||
    (session?.voiceGender === "female" ? "Sophie" : "Laurent");

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, agentState]);

  // Listen to "spoon-meta" data channel from Python Agent
  useDataChannel("spoon-meta", (msg) => {
    try {
      const payload = JSON.parse(new TextDecoder().decode(msg.payload));

      // 1. Assistant message arrived
      if (payload.type === "AGENT_TURN") {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: "assistant",
            text: payload.text,
            translation:
              payload.translation ||
              payload.nativeText ||
              payload.englishTranslation ||
              null,
          },
        ]);

        if (payload.suggestedTarget || payload.suggestedNative) {
          setSuggestions({
            starter: payload.suggestedTarget,
            translation: payload.suggestedNative,
          });
        }
      }

      // 2. User spoke -> Azure Pronunciation + Chunk Detection + Banked Words
      if (payload.type === "TURN_META" && payload.role === "user") {
        const text = payload.originalText || payload.text || "";
        const pron = payload.pronunciation;

        // Check if user said any of the required target chunks!
        if (text && requiredChunks.length > 0) {
          const normSpoken = normalizeForMatch(text);
          setMatchedChunks((prev) => {
            const next = new Set(prev);
            for (const chunk of requiredChunks) {
              const normChunk = normalizeForMatch(chunk);
              if (normChunk && normSpoken.includes(normChunk)) {
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

  const handleEndSession = async () => {
    if (isEnding) return;
    setIsEnding(true);

    const duration = Math.round((Date.now() - sessionStartTime.current) / 1000);
    const toastId = toast.loading("Saving session...", {
      description: "Generating your AI review.",
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

      if (!res.ok) throw new Error("Failed to submit");
      toast.success("Session Complete!", { id: toastId });
    } catch (err) {
      console.error("Failed to submit session for review:", err);
      toast.dismiss(toastId);
    } finally {
      onEnd();
    }
  };

  const allChunksCompleted =
    requiredChunks.length > 0 && matchedChunks.size >= requiredChunks.length;

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-5 p-4 sm:p-8 lg:flex-row">
      <RoomAudioRenderer />

      {/* =========================================================
          MAIN FOUNDATION-STYLE MISSION STAGE
      ========================================================= */}
      <div className="relative flex flex-1 flex-col overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-xl">
        {/* 1. Top Header: Topic + Level Badge + Translation Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3.5">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl border-2 border-indigo-100 bg-slate-900 shadow-xs">
              <img
                src={aiAvatar}
                alt={tutorName}
                className="h-full w-full object-cover object-top"
              />
              <span className="absolute right-0.5 bottom-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-slate-900">
                  {session?.topic || "Live Conversation Arena"}
                </h2>
                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-indigo-600 uppercase ring-1 ring-indigo-200/60">
                  {session?.level || "EASY"}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500">
                Partner: {tutorName} • {session?.targetLanguage || "fr-FR"} Live
                Voice
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowTranslations((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-extrabold transition ${
                showTranslations
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Languages size={14} />
              <span>
                {showTranslations ? "Translations On" : "Translations Off"}
              </span>
            </button>

            <FreestyleTimer initialTime={300} onTimeUp={handleEndSession} />
          </div>
        </div>

        {/* 2. Mission Hint Banner + Target Phrases Tracker (Matches Foundation Freestyle) */}
        <div className="space-y-2.5 border-b border-slate-100 bg-slate-50/60 px-6 py-3.5">
          {/* Blue Mission Hint Bar */}
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-sky-200/80 bg-sky-50/90 px-4 py-2.5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                <Lightbulb size={16} />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] font-black tracking-widest text-blue-600 uppercase">
                  Mission Hint • Try Saying
                </span>
                <p className="truncate text-sm font-black text-slate-900">
                  &ldquo;
                  {suggestions?.starter ||
                    session?.starterHintTarget ||
                    requiredChunks[0] ||
                    "Bonjour !"}
                  &rdquo;
                </p>
                {showTranslations &&
                  (suggestions?.translation || session?.starterHintNative) && (
                    <p className="truncate text-xs font-semibold text-slate-500">
                      {suggestions?.translation || session?.starterHintNative}
                    </p>
                  )}
              </div>
            </div>
          </div>

          {/* Target Phrases Pill Tracker */}
          {requiredChunks.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2">
              <span className="text-[11px] font-black tracking-wider text-slate-400 uppercase">
                Target Phrases ({matchedChunks.size}/{requiredChunks.length}):
              </span>
              {requiredChunks.map((chunk, idx) => {
                const isHit = matchedChunks.has(chunk);
                return (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-black transition-all ${
                      isHit
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                    }`}
                  >
                    {isHit && <Check size={12} strokeWidth={3.5} />}
                    <span>{chunk}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Conversation Stream Area */}
        <div className="flex-1 space-y-5 overflow-y-auto p-6 scroll-smooth">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Mic size={26} className="animate-pulse" />
              </div>
              <p className="text-base font-extrabold text-slate-800">
                {agentState === "connecting"
                  ? `Connecting to ${tutorName}...`
                  : `${tutorName} is listening! Start speaking anytime.`}
              </p>
              <p className="mt-1 max-w-sm text-xs font-medium text-slate-500">
                Use the Mission Hint above or greet {tutorName} in{" "}
                {session?.targetLanguage || "French"} to kick off the roleplay.
              </p>
            </div>
          )}

          {messages.map((message) => {
            const isUser = message.role === "user";
            const pron = message.pronunciationScore;
            const overall = pron
              ? Math.round(pron.pronunciationScore ?? pron.accuracyScore ?? 0)
              : null;
            const acc = pron
              ? Math.round(pron.accuracyScore ?? overall ?? 0)
              : null;
            const flow = pron
              ? Math.round(pron.fluencyScore ?? overall ?? 0)
              : null;
            const isHighPass = overall !== null && overall >= 80;

            if (!isUser) {
              return (
                <div
                  key={message.id}
                  className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200"
                >
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-900 shadow-xs">
                    <img
                      src={aiAvatar}
                      alt={tutorName}
                      className="h-full w-full object-cover object-top"
                    />
                  </div>

                  <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-slate-200/80 bg-white px-4 py-3 shadow-xs">
                    <p className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed">
                      {message.text}
                    </p>
                    {showTranslations && message.translation && (
                      <p className="mt-1 border-t border-slate-100 pt-1 text-xs font-medium text-slate-500">
                        {message.translation}
                      </p>
                    )}
                  </div>
                </div>
              );
            }

            // USER TURN (With Foundation-style Pronunciation Telemetry Pill + Word Underlines)
            return (
              <div
                key={message.id}
                className="flex flex-col items-end gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200"
              >
                <div className="flex items-end gap-2.5">
                  <div className="max-w-md rounded-2xl rounded-br-sm bg-indigo-600 px-4 py-3 text-white shadow-md">
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
                </div>

                {/* Pronunciation Telemetry Bar (Matches Foundation Freestyle!) */}
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
            );
          })}

          {/* AI Speaking / Thinking Indicator */}
          {agentState === "speaking" && (
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 overflow-hidden rounded-full border border-slate-200 bg-slate-900">
                <img
                  src={aiAvatar}
                  alt={tutorName}
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <div className="flex items-center gap-2.5 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-2.5 text-xs font-bold text-indigo-700">
                <Volume2 className="h-4 w-4 animate-pulse" />
                <span>{tutorName} is speaking...</span>
              </div>
            </div>
          )}

          {agentState === "thinking" && (
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 overflow-hidden rounded-full border border-slate-200 bg-slate-900">
                <img
                  src={aiAvatar}
                  alt={tutorName}
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <div className="flex items-center gap-2.5 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                <span>Thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} className="h-2" />
        </div>

        {/* 4. Bottom Control Bar (Matches Foundation Freestyle) */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
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
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-700 shadow-2xs hover:bg-slate-50"
            >
              <Mic size={14} />
              <span>Toggle Mic</span>
            </TrackToggle>

            <button
              onClick={handleEndSession}
              disabled={isEnding}
              className={`inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-black text-white shadow-md transition active:scale-95 disabled:opacity-50 ${
                allChunksCompleted
                  ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20"
                  : "bg-slate-900 hover:bg-slate-800"
              }`}
            >
              <span>
                {isEnding
                  ? "Analyzing..."
                  : allChunksCompleted
                    ? "Mission Complete! View Report"
                    : "End & Get AI Report"}
              </span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================
          RIGHT SIDECAR: LIVE COACHING & SUGGESTED RESPONSES
      ========================================================= */}
      <div className="flex w-full flex-col justify-between rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-xl lg:w-80">
        <div>
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-black tracking-wide text-slate-900 uppercase">
              Live Coaching Deck
            </h3>
          </div>

          {/* Suggested Response Card */}
          <div className="mt-5">
            <span className="text-[10px] font-black tracking-widest text-indigo-500 uppercase">
              Suggested Next Reply
            </span>
            <div className="mt-2 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/50 p-4 shadow-2xs">
              <p className="text-base font-black text-slate-900 leading-snug">
                &ldquo;
                {suggestions?.starter ||
                  session?.starterHintTarget ||
                  requiredChunks[0]}
                &rdquo;
              </p>
              {(suggestions?.translation || session?.starterHintNative) && (
                <p className="mt-1.5 text-xs font-semibold text-slate-500">
                  {suggestions?.translation || session?.starterHintNative}
                </p>
              )}
            </div>
          </div>

          {/* Checklist of Target Phrases */}
          {requiredChunks.length > 0 && (
            <div className="mt-6">
              <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                Session Goals ({matchedChunks.size}/{requiredChunks.length})
              </span>
              <div className="mt-2.5 space-y-2">
                {requiredChunks.map((chunk, i) => {
                  const done = matchedChunks.has(chunk);
                  return (
                    <div
                      key={i}
                      className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs font-extrabold transition ${
                        done
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 bg-slate-50/60 text-slate-700"
                      }`}
                    >
                      <span>{chunk}</span>
                      {done ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">
                          <Check size={12} strokeWidth={3.5} />
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400">
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

        <div className="mt-6 rounded-2xl bg-slate-50 p-3.5 text-xs font-medium leading-relaxed text-slate-500">
          <strong className="font-extrabold text-slate-700">Pro Tip:</strong>{" "}
          Speak naturally! Every word you say is scored for accuracy and added
          to your Word Matrix automatically.
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
