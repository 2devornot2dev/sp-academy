// components/sprite/use-sprite-notifications.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getSpriteInbox,
  dismissNotification,
  dismissAllNotifications,
  dismissCard as dismissCardAction,
  type SpriteNotificationDTO,
} from "@/app/actions/sprite-notifications";

export function useSpriteNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<SpriteNotificationDTO[]>(
    [],
  );
  const [dismissedCards, setDismissedCards] = useState<string[]>([]);
  // Don't render dismissible cards until we know what was already dismissed,
  // otherwise they flash on screen every time the drawer opens.
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const inbox = await getSpriteInbox(userId);
      setNotifications(inbox.notifications);
      setDismissedCards(inbox.dismissedCards);
    } catch (err) {
      console.warn("[SpriteNotifications] refresh failed:", err);
    } finally {
      setLoaded(true);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Optimistic: hide immediately, then persist; re-sync if the save fails.
  const dismiss = useCallback(
    async (id: string) => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (!userId) return;
      try {
        await dismissNotification(userId, id);
      } catch {
        void refresh();
      }
    },
    [userId, refresh],
  );

  const dismissAll = useCallback(async () => {
    setNotifications([]);
    if (!userId) return;
    try {
      await dismissAllNotifications(userId);
    } catch {
      void refresh();
    }
  }, [userId, refresh]);

  const isCardDismissed = useCallback(
    (key: string) => dismissedCards.includes(key),
    [dismissedCards],
  );

  const dismissCard = useCallback(
    async (key: string) => {
      setDismissedCards((prev) => (prev.includes(key) ? prev : [...prev, key]));
      if (!userId) return;
      try {
        await dismissCardAction(userId, key);
      } catch {
        void refresh();
      }
    },
    [userId, refresh],
  );

  return {
    notifications,
    loaded,
    refresh,
    dismiss,
    dismissAll,
    isCardDismissed,
    dismissCard,
  };
}