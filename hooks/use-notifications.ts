// @/hooks/use-notifications.ts
"use client";

import useSWR from "swr";
import type { Notification } from "@prisma/client";
import { useUserId } from "@/context/user-context";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch notifications");
  return res.json();
};

export function useNotifications() {
  const userId = useUserId();

  // SWR key is null if userId isn't loaded yet (prevents premature fetching)
  const key = userId ? `/api/users/${userId}/notifications` : null;

  const { data, error, isLoading, mutate } = useSWR<Notification[]>(
    key,
    fetcher,
    {
      revalidateOnFocus: true,     // Re-check when user tabs back
      refreshInterval: 30000,      // Poll every 30s for live alerts
      dedupingInterval: 5000,
    }
  );

  const notifications = data || [];

  // Helper to handle both `read` and `isRead` naming
  const isNotificationRead = (n: Notification) =>
    Boolean(
      (n as unknown as { read?: boolean }).read ??
      (n as unknown as { isRead?: boolean }).isRead
    );

  const unreadCount = notifications.filter((n) => !isNotificationRead(n)).length;

  // 1. Mark single notification as read (with Optimistic UI)
  const markAsRead = async (notificationId: string) => {
    if (!key) return;

    // Optimistically update cache immediately
    await mutate(
      notifications.map((n) =>
        n.id === notificationId
          ? ({ ...n, read: true, isRead: true } as Notification)
          : n
      ),
      false // false = don't revalidate immediately, wait for request
    );

    try {
      await fetch(`/api/users/${userId}/notifications/${notificationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true, read: true }),
      });
    } catch (err) {
      console.error("Failed to mark notification as read", err);
      mutate(); // rollback on failure
    }
  };

  // 2. Mark all as read (with Optimistic UI)
  const markAllAsRead = async () => {
    if (!key || notifications.length === 0) return;

    await mutate(
      notifications.map((n) => ({ ...n, read: true, isRead: true } as Notification)),
      false
    );

    try {
      await fetch(`/api/users/${userId}/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
    } catch (err) {
      console.error("Failed to mark all as read", err);
      mutate();
    }
  };

  // 3. Delete notification
  const deleteNotification = async (notificationId: string) => {
    if (!key) return;

    await mutate(
      notifications.filter((n) => n.id !== notificationId),
      false
    );

    try {
      await fetch(`/api/users/${userId}/notifications/${notificationId}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Failed to delete notification", err);
      mutate();
    }
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    isError: error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: () => mutate(),
  };
}