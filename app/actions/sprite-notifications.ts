// app/actions/sprite-notifications.ts
"use server";

import { prisma } from "@/lib/prisma";

// NOTE: like your other sprite actions, these take userId from the client.
// Verify it matches the signed-in session user before shipping.

export type SpriteNotificationDTO = {
  id: string;
  kind: "BOSS_BUILD_FAILED" | "EXERCISE_BUILD_FAILED" | "INFO";
  title: string | null;
  body: string;
  detail: string | null;
  createdAt: Date;
};

/** Everything the sprite UI needs in one round trip. */
export async function getSpriteInbox(userId: string) {
  const profile = await prisma.spriteProfile.findUnique({
    where: { userId },
    select: {
      dismissedCards: true,
      notifications: {
        where: { dismissedAt: null, resolvedAt: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          kind: true,
          title: true,
          body: true,
          detail: true,
          createdAt: true,
        },
      },
    },
  });

  return {
    notifications: (profile?.notifications ?? []) as SpriteNotificationDTO[],
    dismissedCards: profile?.dismissedCards ?? [],
  };
}

/** The X on a failure card. */
export async function dismissNotification(
  userId: string,
  notificationId: string,
) {
  await prisma.spriteNotification.updateMany({
    where: {
      id: notificationId,
      spriteProfile: { userId },
      dismissedAt: null,
    },
    data: { dismissedAt: new Date() },
  });
}

/** "Clear all" */
export async function dismissAllNotifications(userId: string) {
  await prisma.spriteNotification.updateMany({
    where: { spriteProfile: { userId }, dismissedAt: null, resolvedAt: null },
    data: { dismissedAt: new Date() },
  });
}

/**
 * The X on an info card (Active Lesson Objective, Repair Arcade, ...).
 * cardKey includes the lesson, e.g. "objective:Greetings and Names",
 * so a dismissed card stays gone but the next lesson's card shows again.
 */
export async function dismissCard(userId: string, cardKey: string) {
  const profile = await prisma.spriteProfile.findUnique({
    where: { userId },
    select: { dismissedCards: true },
  });
  if (!profile || profile.dismissedCards.includes(cardKey)) return;

  await prisma.spriteProfile.update({
    where: { userId },
    data: { dismissedCards: { push: cardKey } },
  });
}