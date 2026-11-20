// app/actions/book-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function saveBookProgress(input: {
  bookId: string;
  targetLanguage: string;
  currentPage: number;
  completedCheckpoints: number[];
  isFinished: boolean;
  pronunciationScores?: Record<string, any>;
}) {
  const user = await requireUser();

  const existing = await prisma.userBookProgress.findUnique({
    where: {
      userId_spoonBookId_targetLanguage: {
        userId: user.id,
        spoonBookId: input.bookId,
        targetLanguage: input.targetLanguage,
      },
    },
  });

  const mergedScores = {
    ...((existing?.pronunciationScores as Record<string, any>) || {}),
    ...(input.pronunciationScores || {}),
  };

  // Once hasRead is true, keep it true even when re-reading from page 1
  const hasRead = Boolean(existing?.hasRead || input.isFinished);
  const completedAt = input.isFinished
    ? new Date()
    : (existing?.completedAt ?? null);

  await prisma.userBookProgress.upsert({
    where: {
      userId_spoonBookId_targetLanguage: {
        userId: user.id,
        spoonBookId: input.bookId,
        targetLanguage: input.targetLanguage,
      },
    },
    update: {
      currentPage: input.currentPage,
      completedCheckpoints: input.completedCheckpoints,
      hasRead,
      completedAt,
      pronunciationScores: mergedScores,
      ...(input.isFinished ? { readCount: { increment: 1 } } : {}),
    },
    create: {
      userId: user.id,
      spoonBookId: input.bookId,
      targetLanguage: input.targetLanguage,
      currentPage: input.currentPage,
      completedCheckpoints: input.completedCheckpoints,
      hasRead: input.isFinished,
      readCount: input.isFinished ? 1 : 0,
      completedAt: input.isFinished ? new Date() : null,
      pronunciationScores: mergedScores,
    },
  });

  revalidatePath("/books");
}