// app/actions/tutor-exercise-actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getPresignedImageUrl } from "@/lib/aws/services/s3-presigned-url";
import type { TutorExerciseContent } from "@/lib/schema/ai-tutor-exercise-schema";
import { requireUser } from "@/lib/auth-guard";

async function safePresign(key?: string | null): Promise<string | null> {
  if (!key) return null;
  if (key.startsWith("http://") || key.startsWith("https://")) return key;
  try {
    return await getPresignedImageUrl(key);
  } catch {
    return null;
  }
}

export interface HydratedTutorExerciseContent {
  visualMatch: {
    type: string;
    title: string;
    instruction: string;
    cards: Array<{
      id: string;
      word: string;
      translation: string;
      imageUrl: string | null;
      audioUrl: string | null;
    }>;
  };
  sentenceDash: {
    type: string;
    title: string;
    instruction: string;
    items: Array<{
      id: string;
      promptNative: string;
      fullTarget: string;
      audioUrl: string | null;
      forks: Array<{
        correct: string;
        trap: string;
        whyTrap?: string;
      }>;
    }>;
  };
  speechBurst: {
    type: string;
    title: string;
    instruction: string;
    targetPhrase: string;
    translation: string;
    phoneticHint?: string | null;
    requiredReps: number;
    audioUrl: string | null;
  };
}

export interface HydratedTutorExercise {
  id: string;
  userId: string;
  sessionId: string;
  reviewId: string;
  title: string;
  status: string;
  targetLanguage: string;
  tutorName: string;
  content: HydratedTutorExerciseContent | null;
}

export async function getTutorExercise(
  exerciseId: string,
  userId: string,
): Promise<HydratedTutorExercise | null> {
  const ex = await prisma.tutorExercise.findFirst({
    where: { id: exerciseId, userId },
    include: {
      review: {
        include: {
          session: {
            select: {
              id: true,
              targetLanguage: true,
            },
          },
        },
      },
    },
  });

  if (!ex) return null;

  const rawFeedback = (ex.review?.overallFeedback as Record<string, any>) || {};
  const tutorName = rawFeedback.tutorName || "Sophie";
  const targetLanguage = ex.review?.session?.targetLanguage || "fr-FR";

  const rawContent = ex.content as unknown as TutorExerciseContent | null;
  if (!rawContent || ex.status === "BUILDING" || ex.status === "FAILED") {
    return {
      id: ex.id,
      userId: ex.userId,
      sessionId: ex.freestyleSessionId,
      reviewId: ex.freestyleReviewId,
      title: ex.title,
      status: ex.status,
      targetLanguage,
      tutorName,
      content: null,
    };
  }

  // Presign all S3 keys in parallel
  const [hydratedCards, hydratedDashItems, burstAudioUrl] = await Promise.all([
    Promise.all(
      (rawContent.visualMatch?.cards || []).map(async (c) => {
        const [imageUrl, audioUrl] = await Promise.all([
          safePresign(c.imageS3Key),
          safePresign(c.audioS3Key),
        ]);
        return {
          id: c.id,
          word: c.word,
          translation: c.translation,
          imageUrl,
          audioUrl,
        };
      }),
    ),
    Promise.all(
      (rawContent.sentenceDash?.items || []).map(async (it) => {
        const audioUrl = await safePresign(it.audioS3Key);
        return {
          id: it.id,
          promptNative: it.promptNative,
          fullTarget: it.fullTarget,
          audioUrl,
          forks: it.forks || [],
        };
      }),
    ),
    safePresign(rawContent.speechBurst?.audioS3Key),
  ]);

  return {
    id: ex.id,
    userId: ex.userId,
    sessionId: ex.freestyleSessionId,
    reviewId: ex.freestyleReviewId,
    title: ex.title,
    status: ex.status,
    targetLanguage,
    tutorName,
    content: {
      visualMatch: {
        type: "visual_match",
        title: rawContent.visualMatch?.title || "Visual Match",
        instruction:
          rawContent.visualMatch?.instruction ||
          "Match each phrase from your conversation to its scene",
        cards: hydratedCards,
      },
      sentenceDash: {
        type: "binary_sentence_dash",
        title: rawContent.sentenceDash?.title || "Sentence Dash",
        instruction:
          rawContent.sentenceDash?.instruction ||
          "Pick the right block at each step",
        items: hydratedDashItems,
      },
      speechBurst: {
        type: "speech_burst",
        title: rawContent.speechBurst?.title || "3x Voice Drill",
        instruction:
          rawContent.speechBurst?.instruction ||
          "Say the phrase 3 times out loud!",
        targetPhrase: rawContent.speechBurst?.targetPhrase || "",
        translation: rawContent.speechBurst?.translation || "",
        phoneticHint: rawContent.speechBurst?.phoneticHint ?? null,
        requiredReps: rawContent.speechBurst?.requiredReps || 3,
        audioUrl: burstAudioUrl,
      },
    },
  };
}

export async function completeTutorExercise({
  userId,
  exerciseId,
}: {
  userId: string;
  exerciseId: string;
}): Promise<{ ok: boolean }> {
  try {
    await prisma.tutorExercise.updateMany({
      where: { id: exerciseId, userId },
      data: {
        status: "COMPLETED",
        score: 100,
        completedAt: new Date(),
      },
    });
    return { ok: true };
  } catch (err) {
    console.error("❌ [completeTutorExercise] failed:", err);
    return { ok: false };
  }
}

export async function markReviewCompleted(sessionId: string): Promise<{ ok: boolean }> {
  try {
    const user = await requireUser();
    await prisma.freestyleReview.updateMany({
      where: {
        freestyleSessionId: sessionId,
        session: { userId: user.id },
      },
      data: {
        hasUserReviewed: true,
      },
    });
    return { ok: true };
  } catch (err) {
    console.error("❌ [markReviewCompleted] failed:", err);
    return { ok: false };
  }
}