// @/components/dashboard/NotificationCard.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { Notification } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import {
  MessageCircle,
  ThumbsUp,
  Bell,
  CheckCheck,
  Heart,
  Sparkles,
} from "lucide-react";

import { useUser } from "@/context/user-context";
import { CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Mapping notification types to icons
const getNotificationIcon = (type: string, isRead: boolean) => {
  const iconClass = cn(
    "h-4 w-4 transition-colors",
    isRead
      ? "text-slate-400"
      : type === "LIKE"
        ? "text-rose-500 fill-rose-500/20"
        : type === "comment"
          ? "text-emerald-500"
          : "text-blue-500",
  );

  switch (type.toUpperCase()) {
    case "LIKE":
      return <ThumbsUp className={iconClass} />;
    case "HEART":
      return <Heart className={iconClass} />;
    case "COMMENT":
    case "MESSAGE":
      return <MessageCircle className={iconClass} />;
    default:
      return <Sparkles className={iconClass} />;
  }
};

/* =========================================================================
   1. Single Notification Item
   ========================================================================= */
interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => Promise<void>;
  onClick?: (notification: Notification) => void;
}

const NotificationItem = ({
  notification,
  onMarkAsRead,
  onClick,
}: NotificationItemProps) => {
  // Accommodates either `read` or `isRead` depending on your Prisma schema field naming
  const isRead = Boolean(
    (notification as unknown as { read?: boolean }).read ??
    (notification as unknown as { isRead?: boolean }).isRead,
  );

  // Accommodates `activityTitle` / `title`
  const title =
    (notification as unknown as { activityTitle?: string }).activityTitle ||
    (notification as unknown as { title?: string }).title ||
    "Notification";

  // Accommodates `description` / `message`
  const description =
    (notification as unknown as { description?: string }).description ||
    (notification as unknown as { message?: string }).message ||
    "";

  const handleClick = async () => {
    if (!isRead) {
      await onMarkAsRead(notification.id);
    }
    onClick?.(notification);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group relative my-1.5 flex cursor-pointer items-start gap-3 rounded-xl p-3 text-left transition-all duration-200 border",
        isRead
          ? "border-transparent bg-slate-50/50 hover:bg-slate-100/70 dark:bg-slate-900/30 dark:hover:bg-slate-900/60"
          : "border-slate-200/80 bg-white shadow-xs hover:border-blue-200 hover:bg-blue-50/30 dark:border-slate-800 dark:bg-slate-900",
      )}
    >
      {/* Icon Badge */}
      <div
        className={cn(
          "shrink-0 rounded-lg p-2.5 transition-colors",
          isRead
            ? "bg-slate-100 dark:bg-slate-800"
            : "bg-blue-100/70 text-blue-600 dark:bg-blue-950/50",
        )}
      >
        {getNotificationIcon(notification.type, isRead)}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col min-w-0 pr-1">
        <div className="flex items-center justify-between gap-2">
          <CardTitle
            className={cn(
              "text-xs truncate transition-colors",
              isRead
                ? "font-medium text-slate-700 dark:text-slate-300"
                : "font-bold text-slate-900 dark:text-white",
            )}
          >
            {title}
          </CardTitle>

          {!isRead && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500 animate-pulse" />
          )}
        </div>

        {description && (
          <CardDescription className="line-clamp-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {description}
          </CardDescription>
        )}

        <span className="mt-2 text-[10px] font-medium text-slate-400">
          {formatDistanceToNow(new Date(notification.createdAt), {
            addSuffix: true,
          })}
        </span>
      </div>
    </div>
  );
};

/* =========================================================================
   2. Skeleton Loader
   ========================================================================= */
const NotificationSkeleton = () => {
  return (
    <div className="my-2 flex items-start gap-3 rounded-xl border border-transparent p-3">
      <Skeleton className="h-9 w-9 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-3/4 rounded-md" />
        <Skeleton className="h-3 w-full rounded-md" />
        <Skeleton className="h-2.5 w-1/4 rounded-md" />
      </div>
    </div>
  );
};

/* =========================================================================
   3. Main NotificationCard Component
   ========================================================================= */
interface NotificationCardProps {
  notifications?: Notification[];
  handleNotificationClick?: (notification?: Notification) => void;
}

export default function NotificationCard({
  notifications: initialNotifications,
  handleNotificationClick,
}: NotificationCardProps) {
  const [notificationsList, setNotificationsList] = useState<Notification[]>(
    initialNotifications || [],
  );
  const [loading, setLoading] = useState<boolean>(!initialNotifications);
  const { userId } = useUser();

  // Fetch from user route: /api/users/[userId]/notifications
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/users/${userId}/notifications`);
      if (!response.ok) throw new Error("Failed to load notifications");

      const data: Notification[] = await response.json();
      setNotificationsList(data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!initialNotifications) {
      fetchNotifications();
    }
  }, [initialNotifications, fetchNotifications]);

  // Mark single as read: PATCH /api/user/[userId]/notifications/[id]
  const markAsRead = async (notificationId: string) => {
    if (!userId) return;

    // Optimistic UI update
    setNotificationsList((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, read: true, isRead: true } : n,
      ),
    );

    try {
      await fetch(`/api/users/${userId}/notifications/${notificationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true, read: true }),
      });
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!userId || notificationsList.length === 0) return;

    // Optimistic clear/read
    setNotificationsList((prev) =>
      prev.map((n) => ({ ...n, read: true, isRead: true })),
    );

    try {
      await fetch(`/api/users/${userId}/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      handleNotificationClick?.();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const unreadCount = notificationsList.filter(
    (n) =>
      !(
        (n as unknown as { read?: boolean }).read ??
        (n as unknown as { isRead?: boolean }).isRead
      ),
  ).length;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-transparent">
 
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              {unreadCount}
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            className="h-8 gap-1 px-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/50"
          >
            <CheckCheck className="size-3.5" />
            <span>Mark all read</span>
          </Button>
        )}
      </div>

      {/* Scrollable list */}
      <ScrollArea className="flex-1 px-3 py-2">
        {loading ? (
          Array(4)
            .fill(0)
            .map((_, i) => <NotificationSkeleton key={i} />)
        ) : notificationsList.length > 0 ? (
          notificationsList.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={markAsRead}
              onClick={handleNotificationClick}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-900">
              <Bell className="size-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              No new notifications
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              You are all caught up for today!
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}