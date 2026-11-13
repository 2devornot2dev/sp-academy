// app/actions/get-user-reviews.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getPresignedImageUrl } from "@/lib/aws/services/s3-presigned-url";
import type {
  ReviewData,
  SessionData,
  SpriteOutro,
} from "@/components/freestyle/review/freestyle-review-hub";

async function safePresign(key?: string | null): Promise<string | null> {
  if (!key) return null;
  if (key.startsWith("http://") || key.startsWith("https://")) return key;
  try {
    return await getPresignedImageUrl(key);
  } catch {
    return null;
  }
}

export interface UserReviewListItem {
  id: string;
  mode: string;
  topic: string | null;
  level: string;
  targetLanguage: string;
  nativeLanguage: string;
  duration: number;
  status: string;
  createdAt: Date;
  overallScore: number | null;
  grammarScore: number | null;
  vocabScore: number | null;
  pronunciationScore: number | null;
  fluencyScore: number | null;
  topWeakness: string | null;
  mistakesCount: number;
  isReady: boolean;
}

export async function getUserReviews(
  userId: string,
): Promise<UserReviewListItem[]> {
  const sessions = await prisma.freestyleSession.findMany({
    where: {
      userId,
      status: { in: ["REVIEW_PENDING", "REVIEWED"] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      review: true,
    },
  });

  return sessions.map((s) => {
    const rev = s.review;
    const metrics = (rev?.metrics as any) || null;
    const grammar = (rev?.grammarAnalysis as any) || null;
    const mistakes = Array.isArray(rev?.mistakes) ? rev.mistakes : [];
    const isReady = Boolean(rev && rev.lambdaStatus === "SUCCESS");

    return {
      id: s.id,
      mode: s.mode,
      topic: s.topic,
      level: s.level,
      targetLanguage: s.targetLanguage,
      nativeLanguage: s.nativeLanguage,
      duration: s.duration,
      status: s.status,
      createdAt: s.createdAt,
      overallScore: metrics?.overallScore ?? null,
      grammarScore: metrics?.grammarScore ?? null,
      vocabScore: metrics?.vocabScore ?? null,
      pronunciationScore: metrics?.pronunciationScore ?? null,
      fluencyScore: metrics?.fluencyScore ?? null,
      topWeakness: grammar?.topWeakness ?? null,
      mistakesCount: mistakes.length,
      isReady,
    };
  });
}

export async function getConversationReview(
  sessionId: string,
  userId: string,
): Promise<{
  found: boolean;
  isBaking: boolean;
  isFailed: boolean;
  data: { session: SessionData; review: ReviewData } | null;
}> {
  const session = await prisma.freestyleSession.findFirst({
    where: { id: sessionId, userId },
    include: { review: true },
  });

  if (!session) {
    return { found: false, isBaking: false, isFailed: false, data: null };
  }

  if (!session.review || session.review.lambdaStatus === "PENDING") {
    return {
      found: true,
      isBaking: session.status === "REVIEW_PENDING",
      isFailed: false,
      data: null,
    };
  }

  if (session.review.lambdaStatus === "FAILED") {
    return { found: true, isBaking: false, isFailed: true, data: null };
  }

  const rawFeedback = (session.review.overallFeedback as any) || {};
  const rawOutro = rawFeedback.spriteOutro || null;

  let spriteOutro: SpriteOutro | null = null;
  if (rawOutro) {
    const [nativeAudioUrl, targetAudioUrl] = await Promise.all([
      safePresign(rawOutro.nativeAudioKey),
      safePresign(rawOutro.targetAudioKey),
    ]);
    spriteOutro = {
      spriteName: rawOutro.spriteName,
      nativeLine: rawOutro.nativeLine,
      targetLine: rawOutro.targetLine,
      nativeAudioUrl,
      targetAudioUrl,
    };
  }

  const reviewData: ReviewData = {
    metrics: session.review.metrics as unknown as ReviewData["metrics"],
    mistakes: (session.review.mistakes as unknown as ReviewData["mistakes"]) || [],
    overallFeedback: rawFeedback as ReviewData["overallFeedback"],
    grammarAnalysis:
      (session.review.grammarAnalysis as unknown as ReviewData["grammarAnalysis"]) ??
      undefined,
    vocabUpgrades:
      (session.review.vocabUpgrades as unknown as ReviewData["vocabUpgrades"]) ??
      undefined,
    spriteOutro,
  };

  return {
    found: true,
    isBaking: false,
    isFailed: false,
    data: {
      session: {
        id: session.id,
        nativeLanguage: session.nativeLanguage,
        targetLanguage: session.targetLanguage,
        level: session.level,
        mode: session.mode,
        topic: session.topic,
        duration: session.duration,
      },
      review: reviewData,
    },
  };
}