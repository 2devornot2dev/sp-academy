// context/sprite-context.tsx
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Volume2,
  Square,
  X,
  ArrowRight,
  RotateCcw,
  MessageSquare,
} from "lucide-react";
import { getPresignedUrls } from "@/app/actions/s3";
import { getSpriteNode } from "@/lib/sprites/get-sprite-node";
import type { SpriteAIContext } from "@/lib/schema/sprite-schema";
import type { ActiveTab } from "@/components/sprite/sprite-chat-utils";
import {
  getLiveTaskState,
  retrySystemTask,
  type LiveTaskStatus,
} from "@/app/actions/system-task-actions";
import { pusherClient } from "@/lib/pusher-client";
import {
  getActiveNotifications,
  dismissNotification as dismissDbNotificationAction,
  resolveNotificationByDedupeKey,
} from "@/app/actions/sprite-notifications";

export type SpriteType = "vox" | "vivi";
export type ChatViewMode = "single" | "multi";

export type SpriteAction = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "danger" | "retry";
};

export type SpritePayload = {
  id?: string;
  badge?: string;
  text: string;
  targetText?: string;
  audioUrl?: string | null;
  targetAudioUrl?: string | null;
  autoPlayAudio?: boolean;
  sprite?: SpriteType;
  spriteUrl?: string;
  duration?: number;
  position?: "bottom-left" | "bottom-right" | "top-right";
  action?: SpriteAction;
  createdAt?: number;
  read?: boolean;
};

export type SpriteProfileData = {
  id: string;
  userId: string;
  nativeLanguage: string;
  targetLanguage: string;
  nativeVoiceId: string;
  targetVoiceId: string;
  energy?: number;
  maxEnergy?: number;
  context: SpriteAIContext | null;
  sprite: {
    slug: string;
    name: string;
    avatarUrl: string;
    moodUrls: string[];
    persona: string | null;
  };
} | null;

interface SpriteContextValue {
  activeSprite: SpriteType;
  setActiveSprite: (sprite: SpriteType) => void;
  profile: SpriteProfileData;
  spriteName: string;
  avatarSrc: string;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  openChat: (options?: { tab?: ActiveTab; prompt?: string }) => void;
  closeChat: () => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  viewMode: ChatViewMode;
  setViewMode: (mode: ChatViewMode) => void;
  pendingPrompt: string | null;
  clearPendingPrompt: () => void;

  // Ephemeral Popup Notifications
  current: SpritePayload | null;
  summonSprite: (payload: SpritePayload) => void;
  summonSpriteNode: (options: any) => Promise<void>;
  dismissSprite: () => void;
  isShowing: boolean;

  // DB-Backed Persistent Notifications (For the Briefing Tab)
  dbNotifications: any[];
  dismissDbNotification: (id: string) => Promise<void>;

  isPlaying: boolean;
  playAudioUrl: (urlOrKey: string) => Promise<void>;
  stopAudio: () => void;
  deleteSession: (sessionId: string) => Promise<boolean>;
  liveTask: LiveTaskStatus | null;
  setLiveTask: (task: LiveTaskStatus | null) => void;
  dismissLiveTask: (taskId?: string) => void;
  isRetryingTask: boolean;
  retryLiveTask: (taskId?: string) => Promise<boolean>;
}

const SpriteContext = createContext<SpriteContextValue | null>(null);

export function SpriteProvider({
  children,
  spriteData = null,
}: {
  children: React.ReactNode;
  spriteData?: SpriteProfileData;
}) {
  const dbSprite = spriteData?.sprite ?? null;
  const userId = spriteData?.userId ?? null;

  const [activeSprite, setActiveSprite] = useState<SpriteType>(
    (dbSprite?.slug as SpriteType) ?? "vox",
  );

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("session");
  const [viewMode, setViewMode] = useState<ChatViewMode>("single");
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  const [current, setCurrent] = useState<SpritePayload | null>(null);
  const [notifications, setNotifications] = useState<SpritePayload[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const s3CacheRef = useRef<Record<string, string>>({});
  const summonedKeysRef = useRef<Set<string>>(new Set());
  const [liveTask, setLiveTask] = useState<LiveTaskStatus | null>(null);
  const [isRetryingTask, setIsRetryingTask] = useState(false);

  const [dbNotifications, setDbNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (userId) {
      getActiveNotifications().then(setDbNotifications).catch(console.error);
    }
  }, [userId]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const dismissSprite = useCallback(() => {
    stopAudio();
    if (timerRef.current) clearTimeout(timerRef.current);

    setCurrent((prev) => {
      if (prev?.id && prev.id.startsWith("fail_")) {
        try {
          if (typeof window !== "undefined") {
            localStorage.setItem(`dismissed_${prev.id}`, "1");
          }
        } catch (e) {}
      }
      return null;
    });
  }, [stopAudio]);

  const dismissLiveTask = useCallback(
    (explicitTaskId?: string) => {
      const targetId = explicitTaskId || liveTask?.taskId;
      if (targetId && typeof window !== "undefined") {
        try {
          localStorage.setItem(`dismissed_fail_${targetId}`, "1");
        } catch (e) {}
      }
      setLiveTask(null);
    },
    [liveTask?.taskId],
  );

  const resolvePlayableUrl = useCallback(async (urlOrKey: string) => {
    if (
      urlOrKey.startsWith("http://") ||
      urlOrKey.startsWith("https://") ||
      urlOrKey.startsWith("/") ||
      urlOrKey.startsWith("blob:")
    ) {
      return urlOrKey;
    }

    if (s3CacheRef.current[urlOrKey]) {
      return s3CacheRef.current[urlOrKey];
    }

    try {
      const signed = await getPresignedUrls([urlOrKey]);
      if (signed?.[urlOrKey]) {
        s3CacheRef.current[urlOrKey] = signed[urlOrKey];
        return signed[urlOrKey];
      }
    } catch (err) {
      console.warn("Failed to resolve S3 key for sprite audio:", err);
    }

    return null;
  }, []);

  const playAudioUrl = useCallback(
    async (urlOrKey: string) => {
      stopAudio();
      const playableUrl = await resolvePlayableUrl(urlOrKey);
      if (!playableUrl) return;

      const audio = new Audio(playableUrl);
      audioRef.current = audio;
      setIsPlaying(true);

      audio.onended = () => setIsPlaying(false);
      audio.play().catch((err) => {
        console.warn("Sprite audio autoplay blocked or failed:", err);
        setIsPlaying(false);
      });
    },
    [stopAudio, resolvePlayableUrl],
  );

  const summonSprite = useCallback(
    (payload: SpritePayload) => {
      stopAudio();
      if (timerRef.current) clearTimeout(timerRef.current);

      const nextPayload: SpritePayload = {
        id: payload.id || String(Date.now()),
        duration: payload.duration ?? 8000,
        position: payload.position ?? "bottom-right",
        createdAt: Date.now(),
        read: isChatOpen,
        ...payload,
      };

      setNotifications((prev) => {
        const filtered = prev.filter((item) => item.id !== nextPayload.id);
        return [nextPayload, ...filtered].slice(0, 10);
      });

      if (!isChatOpen) {
        setCurrent(nextPayload);

        if (nextPayload.duration && nextPayload.duration !== Infinity) {
          timerRef.current = setTimeout(() => {
            setCurrent(null);
          }, nextPayload.duration);
        }
      }

      if (nextPayload.audioUrl && nextPayload.autoPlayAudio) {
        playAudioUrl(nextPayload.audioUrl);
      }
    },
    [isChatOpen, playAudioUrl, stopAudio],
  );

  const summonSpriteNode = useCallback(
    async ({
      orderIndex,
      stepType,
      dedupeKey,
      actionLabel,
      onAction,
    }: {
      orderIndex: number;
      stepType?: "SPOON" | "BRIDGE" | "BOSS";
      dedupeKey?: string;
      actionLabel?: string;
      onAction?: () => void;
    }) => {
      if (!spriteData?.sprite) return;

      if (stepType === "BOSS" && orderIndex % 7 !== 0) return;
      if (stepType !== "BOSS" && orderIndex % 7 === 0) return;

      const storageKey = dedupeKey || `sprite_seen_${orderIndex}`;
      if (
        summonedKeysRef.current.has(storageKey) ||
        (typeof window !== "undefined" && sessionStorage.getItem(storageKey))
      ) {
        return;
      }

      const node = await getSpriteNode(
        {
          slug: spriteData.sprite.slug,
          nativeVoiceId: spriteData.nativeVoiceId,
          targetVoiceId: spriteData.targetVoiceId,
        },
        orderIndex,
      );

      if (!node) return;

      const isAccidentalBossNode =
        stepType !== "BOSS" &&
        /boss/i.test(`${node.header ?? ""} ${node.action ?? ""}`);

      if (isAccidentalBossNode) {
        return;
      }

      summonedKeysRef.current.add(storageKey);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(storageKey, "1");
      }

      summonSprite({
        id: node.nodeId,
        badge: node.header ?? actionLabel ?? undefined,
        text: node.nativeBody,
        targetText: node.targetBody ?? undefined,
        audioUrl: node.nativeAudioUrl ?? node.targetAudioUrl,
        targetAudioUrl: node.targetAudioUrl,
        autoPlayAudio: true,
        duration: 9000,
        position: "bottom-right",
        action: onAction
          ? {
              label: actionLabel || node.action || "Continue",
              onClick: onAction,
              variant: "primary",
            }
          : undefined,
      });
    },
    [spriteData, summonSprite],
  );

  const markNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const openChat = useCallback(
    (options?: { tab?: ActiveTab; prompt?: string }) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setCurrent(null);

      if (options?.tab) setActiveTab(options.tab);
      if (options?.prompt) {
        setActiveTab("session");
        setPendingPrompt(options.prompt);
      }

      setIsChatOpen(true);
      markNotificationsRead();
    },
    [markNotificationsRead],
  );

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
  }, []);

  const clearPendingPrompt = useCallback(() => {
    setPendingPrompt(null);
  }, []);

  const deleteSession = useCallback(
    async (sessionId: string): Promise<boolean> => {
      if (!userId) return false;
      try {
        const res = await fetch(
          `/api/users/${userId}/sprite/sessions/${sessionId}`,
          { method: "DELETE" },
        );
        return res.ok || res.status === 404;
      } catch (err) {
        console.error("Failed to delete sprite session:", err);
        return false;
      }
    },
    [userId],
  );

  useEffect(() => {
    return () => {
      stopAudio();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [stopAudio]);

  const resolvedSprite = current?.sprite || activeSprite;
  const isVivi = resolvedSprite === "vivi";
  const spriteName = dbSprite?.name ?? (isVivi ? "Vivi" : "Vox");
  const avatarSrc =
    current?.spriteUrl ||
    dbSprite?.avatarUrl ||
    (isVivi ? "/sprite-f.png" : "/sprite-m.png");

  const positionClasses =
    current?.position === "bottom-right"
      ? "bottom-24 right-6"
      : current?.position === "top-right"
        ? "top-6 right-6"
        : "bottom-6 left-6";

  // Fixed: Calls the imported DB server action (no longer shadowed!)
  const dismissDbNotification = useCallback(async (id: string) => {
    setDbNotifications((prev) => prev.filter((n) => n.id !== id));
    await dismissDbNotificationAction(id).catch(console.error);
  }, []);

  const retryLiveTask = useCallback(
    async (explicitTaskId?: string): Promise<boolean> => {
      const targetId = explicitTaskId || liveTask?.taskId;
      if (!targetId) return false;

      setIsRetryingTask(true);
      const res = await retrySystemTask(targetId);
      setIsRetryingTask(false);

      if (res.ok) {
        setLiveTask((prev) => (prev ? { ...prev, status: "BUILDING" } : null));
        await resolveNotificationByDedupeKey(`task-fail:${targetId}`).catch(
          () => {},
        );
        setDbNotifications((prev) =>
          prev.filter(
            (n) =>
              n.dedupeKey !== `task-fail:${targetId}` &&
              (n.payload as any)?.taskId !== targetId,
          ),
        );

        summonSprite({
          id: `retry_${targetId}`,
          badge: "Rebuilding 🛠️",
          text: `I just restarted the generator. Hang tight while I bake it!`,
          duration: 5000,
        });
        return true;
      } else {
        // If task can't be retried (e.g. already completed/stale), clear the stuck banner
        setLiveTask(null);
      }
      return false;
    },
    [liveTask?.taskId, summonSprite],
  );

  // Refs so Pusher binds once per userId without re-subscribing on state changes
  const summonSpriteRef = useRef(summonSprite);
  const openChatRef = useRef(openChat);
  useEffect(() => {
    summonSpriteRef.current = summonSprite;
    openChatRef.current = openChat;
  }, [summonSprite, openChat]);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;

    getLiveTaskState(userId).then((cached) => {
      if (!mounted || !cached) return;

      // Ignore background sprite notification task failures or previously dismissed failures
      if (
        cached.taskType === "SPRITE_NOTIFICATION_GENERATION" ||
        (cached.status === "FAILED" &&
          typeof window !== "undefined" &&
          (localStorage.getItem(`dismissed_fail_${cached.taskId}`) ||
            localStorage.getItem(`dismissed_${cached.taskId}`)))
      ) {
        return;
      }

      setLiveTask(cached);
    });

    const channelName = `user-${userId}`;
    const channel = pusherClient.subscribe(channelName);

    const handleFailed = (data: LiveTaskStatus) => {
      if (data.taskType === "SPRITE_NOTIFICATION_GENERATION") return;

      const nextState: LiveTaskStatus = {
        ...data,
        status: "FAILED",
        updatedAt: new Date().toISOString(),
      };
      setLiveTask(nextState);
      getActiveNotifications().then(setDbNotifications).catch(console.error);

      summonSpriteRef.current({
        id: `fail_${data.taskId}`,
        badge: `Error ⚠️`,
        text: `My builder hit a snag. Check the Briefing Tab to retry it!`,
        duration: 8000,
        action: {
          label: "View Details",
          variant: "danger",
          onClick: () => openChatRef.current({ tab: "briefing" }),
        },
      });
    };

    const handleBuilding = (data: LiveTaskStatus) =>
      setLiveTask({
        ...data,
        status: "BUILDING",
        updatedAt: new Date().toISOString(),
      });

    const handleCompleted = () => {
      setLiveTask(null);
      getActiveNotifications().then(setDbNotifications).catch(console.error);
    };

    const handleSpriteNodeReady = (node: {
      nodeId: string;
      orderIndex: number;
      stepType?: string | null;
      header?: string | null;
      nativeBody: string;
      targetBody?: string | null;
      nativeAudioUrl?: string | null;
      targetAudioUrl?: string | null;
      action?: string | null;
    }) => {
      // Clear any building state when an exercise or sprite node finishes
      setLiveTask(null);

      summonSpriteRef.current({
        id: `${node.nodeId}_${Date.now()}`,
        badge: node.header ?? undefined,
        text: node.nativeBody,
        targetText: node.targetBody ?? undefined,
        audioUrl: node.nativeAudioUrl ?? node.targetAudioUrl,
        targetAudioUrl: node.targetAudioUrl,
        autoPlayAudio: true,
        duration: 10000,
        position: "bottom-right",
        action:
          node.stepType === "EXERCISE_READY" ||
          node.stepType === "EXERCISE_BUILDING"
            ? {
                label: node.action || "Open Briefing",
                variant: "primary",
                onClick: () => openChatRef.current({ tab: "briefing" }),
              }
            : undefined,
      });
    };

    channel.bind("system-task-failed", handleFailed);
    channel.bind("system-task-building", handleBuilding);
    channel.bind("system-task-completed", handleCompleted);
    channel.bind("sprite-node-ready", handleSpriteNodeReady);

    return () => {
      mounted = false;
      channel.unbind("system-task-failed", handleFailed);
      channel.unbind("system-task-building", handleBuilding);
      channel.unbind("system-task-completed", handleCompleted);
      channel.unbind("sprite-node-ready", handleSpriteNodeReady);
      pusherClient.unsubscribe(channelName);
    };
  }, [userId]);

  return (
    <SpriteContext.Provider
      value={{
        activeSprite,
        setActiveSprite,
        profile: spriteData,
        spriteName,
        avatarSrc,
        isChatOpen,
        setIsChatOpen,
        openChat,
        closeChat,
        activeTab,
        setActiveTab,
        viewMode,
        setViewMode,
        pendingPrompt,
        clearPendingPrompt,
        current,
        summonSprite,
        summonSpriteNode,
        dismissSprite,
        isShowing: !!current,
        isPlaying,
        playAudioUrl,
        stopAudio,
        deleteSession,
        isRetryingTask,
        liveTask,
        retryLiveTask,
        setLiveTask,
        dismissLiveTask,
        dbNotifications,
        dismissDbNotification,
      }}
    >
      {children}

      <AnimatePresence mode="wait">
        {current && !isChatOpen && (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 360, damping: 26 }}
            className={`fixed ${positionClasses} z-50 flex w-[92vw] max-w-sm items-start gap-3.5 rounded-3xl border border-indigo-500/30 bg-slate-950/95 p-4 text-white shadow-2xl shadow-indigo-950/50 backdrop-blur-xl`}
          >
            <div className="relative shrink-0">
              <span
                className={`absolute -inset-1 rounded-2xl bg-gradient-to-tr from-teal-400 via-indigo-500 to-fuchsia-500 blur-xs transition-opacity ${
                  isPlaying ? "animate-pulse opacity-85" : "opacity-50"
                }`}
              />
              <motion.div
                animate={
                  isPlaying
                    ? { y: [0, -3, 0], scale: [1, 1.04, 1] }
                    : { y: 0, scale: 1 }
                }
                transition={{
                  repeat: isPlaying ? Infinity : 0,
                  duration: 1.2,
                  ease: "easeInOut",
                }}
                className="relative h-14 w-14 overflow-hidden rounded-2xl border border-white/20 bg-slate-900"
              >
                <img
                  src={avatarSrc}
                  alt={spriteName}
                  className="h-full w-full object-cover object-top"
                />
              </motion.div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="mb-1 flex items-center gap-1.5">
                <span className="rounded-full bg-teal-400/20 px-2 py-0.5 text-[10px] font-black tracking-wider text-teal-300 uppercase">
                  {spriteName}
                </span>
                {current.badge && (
                  <span className="inline-flex items-center gap-1 truncate text-[10px] font-extrabold tracking-wide text-indigo-300 uppercase">
                    <Sparkles className="h-2.5 w-2.5 shrink-0" />
                    {current.badge}
                  </span>
                )}
              </div>

              <p className="text-xs leading-relaxed font-semibold text-slate-100">
                &ldquo;{current.text}&rdquo;
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {current.audioUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      isPlaying ? stopAudio() : playAudioUrl(current.audioUrl!)
                    }
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold transition ${
                      isPlaying
                        ? "bg-teal-500 text-slate-950"
                        : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <Square className="h-2.5 w-2.5 fill-current" />
                        <span>Stop</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-3 w-3" />
                        <span>Listen</span>
                      </>
                    )}
                  </button>
                )}

                {current.action && (
                  <button
                    type="button"
                    onClick={() => {
                      current.action?.onClick();
                      dismissSprite();
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[11px] font-extrabold transition active:scale-95 ${
                      current.action.variant === "danger" ||
                      current.action.variant === "retry"
                        ? "bg-rose-500 text-white hover:bg-rose-400"
                        : "bg-indigo-500 text-white hover:bg-indigo-400"
                    }`}
                  >
                    {current.action.variant === "retry" && (
                      <RotateCcw className="h-3 w-3" />
                    )}
                    <span>{current.action.label}</span>
                    {current.action.variant !== "retry" && (
                      <ArrowRight className="h-3 w-3" />
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => openChat({ tab: "briefing" })}
                  className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-slate-300 transition hover:bg-white/15 hover:text-white"
                >
                  <MessageSquare className="h-3 w-3 text-teal-400" />
                  <span>Chat</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={dismissSprite}
              className="shrink-0 rounded-full p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </SpriteContext.Provider>
  );
}

export function useSprite() {
  const ctx = useContext(SpriteContext);
  if (!ctx) {
    throw new Error("useSprite must be used within a <SpriteProvider>");
  }
  return ctx;
}