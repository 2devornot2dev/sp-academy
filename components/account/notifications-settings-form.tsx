// @/components/account/notifications-settings-form.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Bell, Save } from "lucide-react";
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
      toast.success("Notification preferences updated!");
    } catch (error) {
      toast.error("Failed to update notification settings.");
    } finally {
      setIsLoading(false);
    }
  };

  const items = [
    {
      key: "dailyEmails" as const,
      title: "Daily Practice Reminders",
      description: "Receive a daily nudge to keep your learning streak alive.",
    },
    {
      key: "weeklyEmails" as const,
      title: "Weekly Progress Digest",
      description:
        "Get a summary of your vocabulary growth and Sprite sessions every week.",
    },
    {
      key: "promotionEmails" as const,
      title: "Product Updates & Offers",
      description: "Stay informed about new AI features and special promotions.",
    },
  ];

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <Bell className="h-5 w-5 text-blue-600" />
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Email Notifications
          </h2>
          <p className="text-xs text-slate-500">
            Choose which emails you would like to receive from us.
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
              checked={notifications[item.key]}
              onCheckedChange={(checked) =>
                setNotifications((prev) => ({ ...prev, [item.key]: checked }))
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
          <span>Save Notification Settings</span>
        </Button>
      </div>
    </form>
  );
}