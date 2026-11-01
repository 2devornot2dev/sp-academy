// components/sprite/sprite-chat-header.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Target,
  History,
  Plus,
  Moon,
  Zap,
  MessageSquare,
  MessagesSquare,
  RectangleHorizontal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { ActiveTab, ChatViewMode } from "./sprite-chat-utils";

export type { ChatViewMode } from "./sprite-chat-utils";

interface SpriteChatHeaderProps {
  spriteName: string;
  avatarSrc: string;
  currentLessonTitle: string;
  activeTab: ActiveTab;
  viewMode: ChatViewMode;
  sessionsCount: number;
  energyCount?: number;
  maxEnergy?: number;
  isSnoozing?: boolean;
  isSessionActive?: boolean;
  onSelectTab: (tab: ActiveTab) => void;
  onChangeViewMode: (mode: ChatViewMode) => void;
  onStartNewSession: () => void;
  onClose: () => void;
}

export function SpriteChatHeader({
  spriteName,
  avatarSrc,
  currentLessonTitle,
  activeTab,
  viewMode,
  sessionsCount,
  energyCount = 1,
  maxEnergy = 3,
  isSnoozing = false,
  isSessionActive = false,
  onSelectTab,
  onChangeViewMode,
  onStartNewSession,
  onClose,
}: SpriteChatHeaderProps) {
  const [manualExpand, setManualExpand] = useState(false);

  const isCollapsed =
    activeTab === "session" && isSessionActive && !manualExpand;

  return (
    <div className="relative z-20 overflow-hidden border-b border-white/10 bg-gradient-to-r from-teal-950/90 via-indigo-950/90 to-slate-950/95 px-4 py-2.5 shrink-0 transition-all">
      {/* EXPANDED ROW 1 */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            key="expanded-header-row"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 360, damping: 32 }}
            className="overflow-hidden"
          >
            <div className="flex items-start justify-between gap-4 pb-3.5 pt-1 px-1 border-b border-white/10 mb-2.5">
              <div className="flex items-center gap-3.5">
                <div className="relative h-12 w-12 shrink-0">
                  <div
                    className={`h-full w-full overflow-hidden rounded-2xl border-2 bg-slate-900 shadow-lg ${
                      isSnoozing
                        ? "border-indigo-400/50 shadow-indigo-500/20"
                        : "border-teal-400/50 shadow-teal-500/20"
                    }`}
                  >
                    <img
                      src={avatarSrc}
                      alt={spriteName}
                      className="h-full w-full object-cover object-top"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isSnoozing}
                    onClick={onStartNewSession}
                    title={
                      isSnoozing
                        ? `${spriteName} is napping until you finish your lesson!`
                        : "Start New Session"
                    }
                    className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-slate-950 shadow-md transition ${
                      isSnoozing
                        ? "bg-indigo-500 text-white cursor-not-allowed"
                        : "bg-teal-400 text-slate-950 hover:scale-110 hover:bg-teal-300"
                    }`}
                  >
                    {isSnoozing ? (
                      <Moon className="h-3 w-3 fill-current" />
                    ) : (
                      <Plus className="h-3 w-3 stroke-[3]" />
                    )}
                  </button>
                </div>

                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-extrabold text-white tracking-tight">
                      {spriteName}
                    </h3>

                    {/* Status Badge */}
                    {isSnoozing ? (
                      <span className="rounded-full bg-indigo-500/20 border border-indigo-400/40 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-indigo-200">
                        💤 Snoozing
                      </span>
                    ) : (
                      <span className="rounded-full bg-teal-400/15 border border-teal-400/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-teal-300">
                        AI Tutor
                      </span>
                    )}

                    {/* ⚡ 3-Slot Energy Meter (e.g. ⚡ ⚡ ⚪) */}
                    <div
                      className="flex items-center gap-1 rounded-full bg-slate-950/80 border border-amber-300/30 px-2.5 py-0.5"
                      title={`${energyCount} of ${maxEnergy} Energy Charges available`}
                    >
                      <span className="text-[10px] font-black text-amber-300 mr-0.5">
                        {energyCount}/{maxEnergy}
                      </span>
                      {Array.from({ length: maxEnergy }).map((_, idx) => {
                        const slot = idx + 1;
                        const isCharged = slot <= energyCount;
                        return (
                          <Zap
                            key={slot}
                            className={`h-3 w-3 transition-all ${
                              isCharged
                                ? "text-amber-300 fill-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                                : "text-slate-600 fill-slate-800/80"
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-indigo-200/90 mt-0.5">
                    <span className="text-teal-400 font-extrabold">
                      Current:
                    </span>{" "}
                    {currentLessonTitle}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SLEEK SINGLE-LINE COMMAND BAR */}
      <div className="flex flex-nowrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isCollapsed && (
            <button
              type="button"
              disabled={isSnoozing}
              onClick={onStartNewSession}
              title={
                isSnoozing
                  ? `${spriteName} is napping`
                  : "Start New Chalkboard Session"
              }
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition ${
                isSnoozing
                  ? "border-indigo-400/30 bg-indigo-500/20 text-indigo-300 cursor-not-allowed"
                  : "border-teal-400/40 bg-teal-400/15 text-teal-300 hover:bg-teal-400 hover:text-slate-950"
              }`}
            >
              {isSnoozing ? (
                <Moon className="h-3.5 w-3.5 fill-current" />
              ) : (
                <Plus className="h-4 w-4 stroke-[2.5]" />
              )}
            </button>
          )}

          <div className="flex shrink-0 items-center gap-1 rounded-xl bg-slate-950/70 p-1 border border-white/10">
            {(
              [
                { id: "session", label: "Session", Icon: MessageSquare },
                { id: "briefing", label: "Briefing", Icon: Target },
                {
                  id: "history",
                  label: `History (${sessionsCount})`,
                  Icon: History,
                },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => onSelectTab(id)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  activeTab === id
                    ? "bg-gradient-to-r from-indigo-600 to-teal-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Compact Energy Pill in 44px Mode */}
          {isCollapsed && (
            <div
              className="hidden sm:flex items-center gap-1 rounded-xl bg-slate-950/80 border border-amber-300/30 px-2 py-1"
              title={`${energyCount} of ${maxEnergy} Energy Charges`}
            >
              <Zap
                className={`h-3 w-3 ${
                  energyCount > 0
                    ? "text-amber-300 fill-amber-300"
                    : "text-slate-600 fill-slate-800"
                }`}
              />
              <span className="text-[10px] font-black text-amber-300">
                {energyCount}/{maxEnergy}
              </span>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <div className="flex items-center gap-1 rounded-xl bg-slate-950/70 p-1 border border-white/10">
            <button
              type="button"
              onClick={() => onChangeViewMode("single")}
              title="Single Stage View"
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                viewMode === "single"
                  ? "bg-gradient-to-r from-indigo-600 to-teal-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <RectangleHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Single</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeViewMode("multi")}
              title="Multi Thread View"
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                viewMode === "multi"
                  ? "bg-gradient-to-r from-indigo-600 to-teal-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <MessagesSquare className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Multi</span>
            </button>
          </div>

          {activeTab === "session" && isSessionActive && (
            <button
              type="button"
              onClick={() => setManualExpand((prev) => !prev)}
              title={isCollapsed ? "Show Lesson Info" : "Compact Fullscreen"}
              className="rounded-xl border border-white/10 bg-white/5 p-1.5 text-slate-300 hover:bg-white/15 hover:text-white transition"
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </button>
          )}

          <button
            onClick={onClose}
            title="Close Assistant"
            className="rounded-xl border border-white/10 bg-white/5 p-1.5 text-slate-300 hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-200 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}