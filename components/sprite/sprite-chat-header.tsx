// components/sprite/sprite-chat-header.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
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

  const isSessionTab = activeTab !== "history";
  const isCollapsed = isSessionTab && isSessionActive && !manualExpand;

  return (
    <div className="relative z-20 shrink-0 overflow-hidden border-b-2 border-slate-200 bg-white px-4 py-3 shadow-xs transition-all">
      {/* EXPANDED ROW 1 (With X Close Button in Top-Right!) */}
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
            <div className="mb-2.5 flex items-start justify-between gap-4 border-b border-slate-100 px-1 pt-0.5 pb-3">
              <div className="flex items-center gap-3.5">
                <div className="relative h-12 w-12 shrink-0">
                  <div
                    className={`h-full w-full overflow-hidden rounded-2xl border-2 border-b-4 bg-slate-100 shadow-xs ${
                      isSnoozing
                        ? "border-indigo-300 border-b-indigo-400"
                        : "border-sky-400 border-b-blue-600"
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
                    className={`absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full shadow-sm ring-2 ring-white transition ${
                      isSnoozing
                        ? "cursor-not-allowed bg-indigo-500 text-white"
                        : "bg-emerald-500 text-white hover:scale-110 hover:bg-emerald-600"
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
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-black tracking-tight text-slate-900">
                      {spriteName}
                    </h3>

                    {isSnoozing ? (
                      <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-indigo-600 uppercase">
                        💤 Snoozing
                      </span>
                    ) : (
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-blue-600 uppercase">
                        AI Tutor
                      </span>
                    )}

                    <div
                      className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5"
                      title={`${energyCount} of ${maxEnergy} Energy Charges available`}
                    >
                      <span className="mr-0.5 text-[10px] font-black text-amber-700">
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
                                ? "fill-amber-400 text-amber-500"
                                : "fill-slate-200 text-slate-300"
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <p className="mt-0.5 text-xs font-bold text-slate-500">
                    <span className="font-black text-blue-600">Current:</span>{" "}
                    <span className="text-slate-700">{currentLessonTitle}</span>
                  </p>
                </div>
              </div>

              {/* TOP-RIGHT CLOSE BUTTON */}
              <button
                onClick={onClose}
                title="Close Assistant"
                className="rounded-xl border-2 border-b-[3px] border-slate-200 bg-white p-1.5 text-slate-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 active:translate-y-0.5 active:border-b-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ROW 2: COMMAND BAR (Session | History + Single | Multi) */}
      <div className="flex flex-nowrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
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
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 border-b-[3px] transition ${
                isSnoozing
                  ? "cursor-not-allowed border-indigo-200 bg-indigo-50 text-indigo-400"
                  : "border-emerald-600 bg-emerald-500 text-white hover:bg-emerald-600"
              }`}
            >
              {isSnoozing ? (
                <Moon className="h-3.5 w-3.5 fill-current" />
              ) : (
                <Plus className="h-4 w-4 stroke-[2.5]" />
              )}
            </button>
          )}

          {/* 2-Tab Switcher: Session | History */}
          <div className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
            {(
              [
                { id: "session", label: "Session", Icon: MessageSquare },
                {
                  id: "history",
                  label: `History (${sessionsCount})`,
                  Icon: History,
                },
              ] as const
            ).map(({ id, label, Icon }) => {
              const active =
                id === "session" ? isSessionTab : activeTab === "history";
              return (
                <button
                  key={id}
                  onClick={() => onSelectTab(id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-black transition ${
                    active
                      ? "border-b-2 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-2xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {isCollapsed && (
            <div
              className="hidden items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1 sm:flex"
              title={`${energyCount} of ${maxEnergy} Energy Charges`}
            >
              <Zap
                className={`h-3 w-3 ${
                  energyCount > 0
                    ? "fill-amber-400 text-amber-500"
                    : "fill-slate-200 text-slate-300"
                }`}
              />
              <span className="text-[10px] font-black text-amber-700">
                {energyCount}/{maxEnergy}
              </span>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {/* Single / Multi View Switcher (Only on Session tab) */}
          {isSessionTab && (
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => onChangeViewMode("single")}
                title="Single Stage View"
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black transition ${
                  viewMode === "single"
                    ? "border-b-2 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <RectangleHorizontal className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Single</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeViewMode("multi")}
                title="Multi Thread View"
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black transition ${
                  viewMode === "multi"
                    ? "border-b-2 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <MessagesSquare className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Multi</span>
              </button>
            </div>
          )}

          {isSessionTab && isSessionActive && (
            <button
              type="button"
              onClick={() => setManualExpand((prev) => !prev)}
              title={isCollapsed ? "Show Lesson Info" : "Compact Fullscreen"}
              className="rounded-xl border-2 border-b-[3px] border-slate-200 bg-white p-1.5 text-slate-600 transition hover:border-sky-300 hover:bg-sky-50 hover:text-blue-600"
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </button>
          )}

          {/* Only show X on Row 2 when Row 1 is collapsed */}
          {isCollapsed && (
            <button
              onClick={onClose}
              title="Close Assistant"
              className="rounded-xl border-2 border-b-[3px] border-slate-200 bg-white p-1.5 text-slate-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}