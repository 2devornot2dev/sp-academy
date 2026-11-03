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
      ...(progress.isFinished
        ? { quizScore: 100, completedAt: new Date() }
        : {}),
    },
  });

  revalidatePath("/books");
}