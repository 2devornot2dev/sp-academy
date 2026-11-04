// lib/sprite/notifications.ts
//
// SERVER-ONLY helpers. Call these from your webhook route / server code.
// Deliberately NOT a "use server" file, so the client can never call them directly.
import { prisma } from "@/lib/prisma";

type Kind = "BOSS_BUILD_FAILED" | "EXERCISE_BUILD_FAILED" | "INFO";
type Payload = Record<string, string | number | boolean | null>;

export const bossBuildKey = (bossStageId: string) => `boss-build:${bossStageId}`;
export const exerciseBuildKey = (exerciseId: string) =>
  `exercise-build:${exerciseId}`;

async function profileIdFor(userId: string) {
  const profile = await prisma.spriteProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return profile?.id ?? null;
}

/**
 * Create or update a failure card.
 *
 * - Same problem again (same dedupeKey) updates the existing row, so cards never stack.
 * - A NEW failure (different taskId) brings a dismissed/resolved card back.
 * - A re-report of the SAME task (Lambda async retries re-run the handler and
 *   report the same error again) does NOT resurrect a card the user dismissed.
 */
export async function upsertFailureNotification(args: {
  userId: string;
  kind: Kind;
  dedupeKey: string;
  taskId: string;
  body: string;
  title?: string;
  detail?: string;
  payload?: Payload;
}) {
  const spriteProfileId = await profileIdFor(args.userId);
  if (!spriteProfileId) return null;

  const payload: Payload = { ...args.payload, taskId: args.taskId };

  const existing = await prisma.spriteNotification.findUnique({
    where: {
      spriteProfileId_dedupeKey: {
        spriteProfileId,
        dedupeKey: args.dedupeKey,
      },
    },
  });

  if (!existing) {
    return prisma.spriteNotification.create({
      data: {
        spriteProfileId,
        kind: args.kind,
        dedupeKey: args.dedupeKey,
        title: args.title,
        body: args.body,
        detail: args.detail,
        payload,
      },
    });
  }

  const sameTask =
    (existing.payload as { taskId?: string } | null)?.taskId === args.taskId;

  return prisma.spriteNotification.update({
    where: { id: existing.id },
    data: {
      title: args.title,
      body: args.body,
      detail: args.detail,
      payload,
      ...(sameTask
        ? {}
        : { dismissedAt: null, resolvedAt: null, readAt: null }),
    },
  });
}

/**
 * Mark a problem as fixed. Call it:
 *  - when the user hits "Retry Generation" (the card disappears right away), and
 *  - when the build webhook reports COMPLETED.
 * A later failure with a new taskId will bring the card back.
 */
export async function resolveNotification(userId: string, dedupeKey: string) {
  const spriteProfileId = await profileIdFor(userId);
  if (!spriteProfileId) return;

  await prisma.spriteNotification.updateMany({
    where: { spriteProfileId, dedupeKey, resolvedAt: null },
    data: { resolvedAt: new Date() },
  });
}