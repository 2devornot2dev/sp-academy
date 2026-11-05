// app/actions/sprite-notifications.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guard";

// Fetch all active (undismissed, unresolved) notifications for the user's sprite
export async function getActiveNotifications() {
  const user = await requireUser();

  const profile = await prisma.spriteProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!profile) return [];

  return prisma.spriteNotification.findMany({
    where: {
      spriteProfileId: profile.id,
      dismissedAt: null,
      resolvedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });
}

// User explicitly clicked the "X" to hide the notification
export async function dismissNotification(notificationId: string) {
  const user = await requireUser();

  await prisma.spriteNotification.updateMany({
    where: {
      id: notificationId,
      profile: { userId: user.id },
    },
    data: { dismissedAt: new Date() },
  });

  return { ok: true };
}

// System successfully retried the task, so the error is resolved!
export async function resolveNotificationByDedupeKey(dedupeKey: string) {
  const user = await requireUser();

  await prisma.spriteNotification.updateMany({
    where: {
      dedupeKey,
      profile: { userId: user.id },
      resolvedAt: null,
    },
    data: { resolvedAt: new Date() },
  });

  return { ok: true };
}