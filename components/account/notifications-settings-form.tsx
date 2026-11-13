// components/account/notifications-settings-form.tsx
"use client";

import React, { useState } from "react";
import {
  Loader2,
  Bell,
  Save,
  Flame,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { updateAccountSettings, type UserDetails } from "@/lib/actions";

interface NotificationSettingsFormProps {
  initialSettings: UserDetails["AccountSettings"];
  userId: string;
}

export function NotificationSettingsForm({
  initialSettings,
  userId,
}: NotificationSettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState({
    dailyEmails: initialSettings?.dailyEmails ?? true,
    weeklyEmails: initialSettings?.weeklyEmails ?? true,
    promotionEmails: initialSettings?.promotionEmails ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await updateAccountSettings(userId, notifications);
      toast.success("Notification preferences saved!");
    } catch {
      toast.error("Failed to update notification settings.");
    } finally {
      setIsLoading(false);
    }
  };

  const items = [
    {
      key: "dailyEmails" as const,
      title: "Daily Practice Reminders",
      description:
        "Receive a friendly daily nudge so you never lose your speaking streak.",
      icon: Flame,
      iconColor: "text-amber-600 bg-amber-50 border-amber-200",
    },
    {
      key: "weeklyEmails" as const,
      title: "Weekly Word Matrix & Progress Digest",
      description:
        "Get a weekly recap of your new words, Boss Crowns, and pronunciation gains.",
      icon: BarChart3,
      iconColor: "text-blue-600 bg-sky-50 border-sky-200",
    },
    {
      key: "promotionEmails" as const,
      title: "New Features & Storybooks",
      description:
        "Be the first to know when new AI tutors, books, and arcade games drop.",
      icon: Sparkles,
      iconColor: "text-purple-600 bg-purple-50 border-purple-200",
    },
  ];

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="mb-6 flex items-center gap-3.5 border-b border-slate-100 pb-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-b-2 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-xs">
          <Bell className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-black text-slate-900">
            Email Alerts &amp; Digests
          </h2>
          <p className="text-xs font-semibold text-slate-500">
            Choose which reminders and progress reports you want in your inbox.
          </p>
        </div>
      </div>

      <div className="space-y-3.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = notifications[item.key];
          return (
            <div
              key={item.key}
              role="switch"
              aria-checked={active}
              tabIndex={0}
              onClick={() =>
                setNotifications((prev) => ({
                  ...prev,
                  [item.key]: !prev[item.key],
                }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setNotifications((prev) => ({
                    ...prev,
                    [item.key]: !prev[item.key],
                  }));
                }
              }}
              className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl border-2 border-b-4 p-4 transition-all select-none ${
                active
                  ? "border-sky-300 border-b-sky-400 bg-sky-50/40"
                  : "border-slate-200 border-b-slate-300 bg-white hover:bg-slate-50/70"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${item.iconColor}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <span className="block text-sm font-black text-slate-900">
                    {item.title}
                  </span>
                  <p className="mt-0.5 text-xs font-medium text-slate-500">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* High-Contrast 3D Tactile Toggle Switch */}
              <div className="flex shrink-0 items-center gap-2.5">
                <span
                  className={`text-[10px] font-black tracking-wider uppercase ${
                    active ? "text-blue-600" : "text-slate-400"
                  }`}
                >
                  {active ? "ON" : "OFF"}
                </span>
                <div
                  className={`relative h-7 w-12 rounded-full border-2 p-0.5 transition-colors duration-200 ${
                    active
                      ? "border-blue-700 bg-gradient-to-r from-sky-400 to-blue-600"
                      : "border-slate-300 bg-slate-200"
                  }`}
                >
                  <div
                    className={`h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                      active ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-7 py-3.5 text-xs font-black text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0 disabled:opacity-50 sm:text-sm"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>Save Notification Settings</span>
        </button>
      </div>
    </form>
  );
}