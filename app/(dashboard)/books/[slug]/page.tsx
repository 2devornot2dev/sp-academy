// app/books/[slug]/page.tsx
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { BookReaderClient } from "@/components/books/book-reader-client";
import type { SpoonBookWebhookPayload } from "@/lib/schema/book-schema";
import { getPresignedImageUrl } from "@/lib/aws/services/s3-presigned-url";

interface BookReaderPageProps {
  params: Promise<{ slug?: string; bookId?: string }>;
}

async function resolveS3Key(key?: string | null): Promise<string | undefined> {
  if (!key) return undefined;
  if (key.startsWith("http")) return key;
  try {
    const signed = await getPresignedImageUrl(key);
    return signed || undefined;
  } catch (err) {
    console.error("Failed to presign S3 key:", key, err);
    return undefined;
  }
}

export default async function BookReaderPage({ params }: BookReaderPageProps) {
  const resolvedParams = await params;
  const identifier = resolvedParams.slug || resolvedParams.bookId;
  if (!identifier) notFound();

  const user = await requireUser();

  // Supports lookup by either slug OR id depending on your folder route [slug] vs [bookId]
  const book = await prisma.spoonBook.findFirst({
    where: {
      OR: [{ slug: identifier }, { id: identifier }],
    },
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

  // 1. Collect all unique S3 audio keys across all translations
  const translations =
    (book.translations as SpoonBookWebhookPayload["translations"]) || {};
  const audioKeysToSign = new Set<string>();

  for (const trans of Object.values(translations)) {
    for (const page of trans.pages || []) {
      for (const sent of page.sentences || []) {
        if (sent.audioS3Key) audioKeysToSign.add(sent.audioS3Key);
      }
      for (const defn of page.definitions || []) {
        if (defn.audioS3Key) audioKeysToSign.add(defn.audioS3Key);
      }
    }
  }

  // 2. Presign cover, intro video, all page images, and all audio keys in parallel!
  const [coverImageUrl, introVideoUrl, pageImageUrls, signedAudioEntries] =
    await Promise.all([
      resolveS3Key(book.coverImageS3Key),
      resolveS3Key(book.introVideoS3Key),
      Promise.all(
        book.pageImageS3Keys.map(async (k) => (await resolveS3Key(k)) || k)
      ),
      Promise.all(
        Array.from(audioKeysToSign).map(async (key) => {
          const url = await resolveS3Key(key);
          return [key, url] as const;
        })
      ),
    ]);

  const sentenceAudioUrls: Record<string, string> = {};
  for (const [key, url] of signedAudioEntries) {
    if (url) sentenceAudioUrls[key] = url;
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
          coverImageUrl,
          introVideoUrl,
          pageImageUrls,
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