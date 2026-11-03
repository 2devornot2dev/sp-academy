// app/books/[bookId]/page.tsx
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { BookReaderClient } from "@/components/books/book-reader-client";
import type { SpoonBookWebhookPayload } from "@/lib/schema/book-schema";

interface BookReaderPageProps {
  params: Promise<{ slug: string }>;
}

function resolveS3Key(key?: string | null) {
  if (!key) return undefined;
  if (key.startsWith("http")) return key;
  const baseUrl = process.env.NEXT_PUBLIC_S3_BASE_URL || "";
  return baseUrl ? `${baseUrl.replace(/\/$/, "")}/${key}` : key;
}

export default async function BookReaderPage({ params }: BookReaderPageProps) {
  const { slug } = await params;
  const user = await requireUser();

  const book = await prisma.spoonBook.findUnique({
    where: { slug },
    include: {
      progress: {
        where: { userId: user.id },
      },
    },
  });

  if (!book) {
    notFound();
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      BillingInformation: { select: { currentPlan: true } },
      spriteProfile: { select: { targetLanguage: true } },
    },
  });

  const targetLang = dbUser?.spriteProfile?.targetLanguage || "fr-FR";
  const progress =
    book.progress.find((p) => p.targetLanguage === targetLang) ||
    book.progress[0];

  const completedCheckpoints = Array.isArray(progress?.completedCheckpoints)
    ? (progress.completedCheckpoints as number[])
    : [];

  // Build mediaUrls map from S3 keys
  const translations =
    (book.translations as SpoonBookWebhookPayload["translations"]) || {};
  const sentenceAudioUrls: Record<string, string> = {};

  for (const trans of Object.values(translations)) {
    for (const page of trans.pages || []) {
      for (const sent of page.sentences || []) {
        if (sent.audioS3Key) {
          const url = resolveS3Key(sent.audioS3Key);
          if (url) sentenceAudioUrls[sent.audioS3Key] = url;
        }
      }
      for (const defn of page.definitions || []) {
        if (defn.audioS3Key) {
          const url = resolveS3Key(defn.audioS3Key);
          if (url) sentenceAudioUrls[defn.audioS3Key] = url;
        }
      }
    }
  }

  return (
    <BookReaderClient
      book={{
        id: book.id,
        slug: book.slug,
        characterName: book.characterName,
        characterAvatarUrl: book.characterAvatarUrl,
        levelBand: book.levelBand,
        genre: book.genre,
        coverImageS3Key: book.coverImageS3Key,
        introVideoS3Key: book.introVideoS3Key,
        pageImageS3Keys: book.pageImageS3Keys,
        translations,
        mediaUrls: {
          coverImageUrl: resolveS3Key(book.coverImageS3Key),
          introVideoUrl: resolveS3Key(book.introVideoS3Key),
          pageImageUrls: book.pageImageS3Keys.map(
            (k) => resolveS3Key(k) || k
          ),
          sentenceAudioUrls,
        },
      }}
      userPlan={
        dbUser?.BillingInformation?.currentPlan?.toLowerCase() || "founder"
      }
      initialPage={progress?.completedAt ? 0 : (progress?.currentPage ?? 0)}
      initialCompletedCheckpoints={completedCheckpoints}
    />
  );
}