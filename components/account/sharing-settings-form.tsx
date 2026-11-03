// @/components/account/sharing-settings-form.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Share2, Save } from "lucide-react";
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
      toast.success("Sharing preferences updated!");
    } catch (error) {
      toast.error("Failed to update sharing settings.");
    } finally {
      setIsLoading(false);
    }
  };

  const items = [
    {
      key: "shareReadingLogs" as const,
      title: "Share Reading Logs",
      description: "Allow friends and community members to see what you read.",
    },
    {
      key: "shareConversationActivity" as const,
      title: "Share Sprite Conversation Activity",
      description: "Display your AI Sprite practice streaks on your profile.",
    },
    {
      key: "shareAchievements" as const,
      title: "Share Achievements & Badges",
      description: "Showcase your unlocked milestones publicly.",
    },
    {
      key: "shareLessonsAndCourses" as const,
      title: "Share Lessons & Courses",
      description: "Show your active courses and completed lessons.",
    },
  ];

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <Share2 className="h-5 w-5 text-blue-600" />
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Privacy & Sharing Settings
          </h2>
          <p className="text-xs text-slate-500">
            Control what learning activity is visible on your public profile.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between rounded-xl border border-slate-100 p-4 dark:border-slate-800"
          >
            <div className="space-y-0.5">
              <Label htmlFor={item.key} className="text-sm font-semibold">
                {item.title}
              </Label>
              <p className="text-xs text-slate-500">{item.description}</p>
            </div>
            <Switch
              id={item.key}
              checked={sharing[item.key]}
              onCheckedChange={(checked) =>
                setSharing((prev) => ({ ...prev, [item.key]: checked }))
              }
            />
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          type="submit"
          disabled={isLoading}
          className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>Save Sharing Settings</span>
        </Button>
      </div>
    </form>
  );
}