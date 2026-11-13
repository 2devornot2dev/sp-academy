// components/account/sharing-settings-form.tsx
"use client";

import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Share2,
  Save,
  BookOpen,
  MessagesSquare,
  Trophy,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { updateAccountSettings, type UserDetails } from "@/lib/actions";

interface SharingSettingsFormProps {
  initialSettings: UserDetails["AccountSettings"];
  userId: string;
}

export function SharingSettingsForm({
  initialSettings,
  userId,
}: SharingSettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [sharing, setSharing] = useState({
    shareReadingLogs: initialSettings?.shareReadingLogs ?? false,
    shareConversationActivity:
      initialSettings?.shareConversationActivity ?? false,
    shareAchievements: initialSettings?.shareAchievements ?? false,
    shareLessonsAndCourses: initialSettings?.shareLessonsAndCourses ?? false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await updateAccountSettings(userId, sharing);
      toast.success("Privacy & sharing preferences saved!");
    } catch {
      toast.error("Failed to update sharing settings.");
    } finally {
      setIsLoading(false);
    }
  };

  const items = [
    {
      key: "shareReadingLogs" as const,
      title: "Share Storybook Reading Logs",
      description:
        "Allow community members on the Spoon Feed to see books you complete.",
      icon: BookOpen,
      iconColor: "text-blue-600 bg-sky-50 border-sky-200",
    },
    {
      key: "shareConversationActivity" as const,
      title: "Share Conversation & Sprite Streaks",
      description:
        "Display your 3-minute AI conversation wins and streaks on your public feed.",
      icon: MessagesSquare,
      iconColor: "text-emerald-600 bg-emerald-50 border-emerald-200",
    },
    {
      key: "shareAchievements" as const,
      title: "Share Boss Crowns & Badges",
      description:
        "Showcase your defeated Milestone Bosses and hex badges publicly.",
      icon: Trophy,
      iconColor: "text-amber-600 bg-amber-50 border-amber-200",
    },
    {
      key: "shareLessonsAndCourses" as const,
      title: "Share Completed Spoons & Courses",
      description:
        "Post your completed Spoon lessons and Hard Mode progress to the live feed.",
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
          <Share2 className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-black text-slate-900">
            Privacy &amp; Community Feed Sharing
          </h2>
          <p className="text-xs font-semibold text-slate-500">
            Control which milestones and wins appear on the live Spoon Feed.
          </p>
        </div>
      </div>

      <div className="space-y-3.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = sharing[item.key];
          return (
            <div
              key={item.key}
              onClick={() =>
                setSharing((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
              }
              className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl border-2 border-b-4 p-4 transition-all ${
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
                  <Label
                    htmlFor={item.key}
                    className="cursor-pointer text-sm font-black text-slate-900"
                  >
                    {item.title}
                  </Label>
                  <p className="mt-0.5 text-xs font-medium text-slate-500">
                    {item.description}
                  </p>
                </div>
              </div>

              <div onClick={(e) => e.stopPropagation()}>
                <Switch
                  id={item.key}
                  checked={active}
                  onCheckedChange={(checked) =>
                    setSharing((prev) => ({ ...prev, [item.key]: checked }))
                  }
                />
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
          <span>Save Sharing Preferences</span>
        </button>
      </div>
    </form>
  );
}