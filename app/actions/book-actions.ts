// lib/actions/book-actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";

export async function saveBookProgress(progress: {
  bookId: string;
  targetLanguage: string;
  currentPage: number;
  completedCheckpoints: number[];
  isFinished: boolean;
}) {
  const user = await requireUser();

  // 1. Check if they ALREADY finished this book in the past
  const existingProgress = await prisma.userBookProgress.findUnique({
    where: {
      userId_spoonBookId_targetLanguage: {
        userId: user.id,
        spoonBookId: progress.bookId,
        targetLanguage: progress.targetLanguage,
      },
    },
    select: { completedAt: true },
  });

  const wasAlreadyCompleted = Boolean(existingProgress?.completedAt);

  // 2. Save the actual reading progress
  await prisma.userBookProgress.upsert({
    where: {
      userId_spoonBookId_targetLanguage: {
        userId: user.id,
        spoonBookId: progress.bookId,
        targetLanguage: progress.targetLanguage,
      },
    },
    create: {
      userId: user.id,
      spoonBookId: progress.bookId,
      targetLanguage: progress.targetLanguage,
      currentPage: progress.currentPage,
      completedCheckpoints: progress.completedCheckpoints,
      quizScore: progress.isFinished ? 100 : null,
      completedAt: progress.isFinished ? new Date() : null,
    },
    update: {
      currentPage: progress.currentPage,
      completedCheckpoints: progress.completedCheckpoints,
      // Only stamp completedAt if they are finishing it right now for the first time
      ...(progress.isFinished && !wasAlreadyCompleted
        ? { quizScore: 100, completedAt: new Date() }
        : {}),
    },
  });

  // 3. Revalidate UI (The feed API route will automatically pick up the new completedAt stamp!)
  revalidatePath("/books");
  revalidatePath("/dashboard"); // or wherever your feed lives
}