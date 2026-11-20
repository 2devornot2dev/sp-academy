// lib/actions/get-books.ts
import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { getPresignedImageUrl } from "@/lib/aws/services/s3-presigned-url";
import type { BookshelfItem } from "@/components/books/bookshelf-client";
import type { PagePronResult } from "@/components/spoon-books/book-wrapper";
import type {
  LocalizedBookTranslationSchema,
  SpoonBookWebhookPayload,
} from "@/lib/schema/book-schema";
import type { z } from "zod";

type TranslationsMap = Record<
  string,
  z.infer<typeof LocalizedBookTranslationSchema>
>;

async function resolveS3Url(
  key?: string | null,
  fallback = ""
): Promise<string> {
  if (!key) return fallback;
  if (key.startsWith("http")) return key;
  try {
    const signed = await getPresignedImageUrl(key);
    return signed || fallback;
  } catch {
    return fallback;
  }
}

export async function getBookshelfData(): Promise<BookshelfItem[]> {
  const user = await requireUser();

  const [dbUser, books] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        targetLanguage: true,
        spriteProfile: { select: { targetLanguage: true } },
      },
    }),
    prisma.spoonBook.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
      include: {
        progress: {
          where: { userId: user.id },
          orderBy: { updatedAt: "desc" },
        },
      },
    }),
  ]);

  const userLang =
    dbUser?.spriteProfile?.targetLanguage || dbUser?.targetLanguage || "fr-FR";

  return Promise.all(
    books.map(async (book) => {
      const translations = (book.translations || {}) as TranslationsMap;
      const availableLangs = Object.keys(translations);
      const activeEdition =
        translations[userLang] ||
        translations["fr-FR"] ||
        translations[availableLangs[0]];

      const totalPages =
        activeEdition?.pages?.length || book.pageImageS3Keys?.length || 8;

      const userProgress =
        book.progress.find((p) => p.targetLanguage === userLang) ||
        book.progress[0];

      const completedCheckpoints = Array.isArray(
        userProgress?.completedCheckpoints
      )
        ? (userProgress.completedCheckpoints as number[])
        : [];

      const isCompleted =
        Boolean(userProgress?.hasRead || userProgress?.completedAt) ||
        completedCheckpoints.length >= totalPages;

      const [coverUrl, introVideoUrl] = await Promise.all([
        resolveS3Url(book.coverImageS3Key, book.characterAvatarUrl),
        book.introVideoS3Key
          ? resolveS3Url(book.introVideoS3Key, "")
          : Promise.resolve(""),
      ]);

      return {
        id: book.id,
        slug: book.slug,
        title: activeEdition?.title || book.slug,
        synopsis:
          activeEdition?.synopsis ||
          `Join ${book.characterName} in this interactive ${totalPages}-page story.`,
        characterName: book.characterName,
        characterAvatarUrl: book.characterAvatarUrl,
        levelBand: book.levelBand,
        genre: book.genre,
        coverUrl,
        introVideoUrl: introVideoUrl || null,
        totalPages,
        currentPage: userProgress?.currentPage ?? 0,
        completedCheckpointsCount: completedCheckpoints.length,
        isCompleted,
        lastReadAt: userProgress?.updatedAt
          ? userProgress.updatedAt.toISOString()
          : null,
        availableLanguages: availableLangs,
      };
    })
  );
}

export async function getBookReaderData(identifier: string) {
  const user = await requireUser();

  const [book, dbUser] = await Promise.all([
    prisma.spoonBook.findFirst({
      where: {
        OR: [{ slug: identifier }, { id: identifier }],
      },
      include: {
        progress: {
          where: { userId: user.id },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        BillingInformation: { select: { currentPlan: true } },
        spriteProfile: { select: { targetLanguage: true } },
      },
    }),
  ]);

  if (!book) return null;

  const targetLang = dbUser?.spriteProfile?.targetLanguage || "fr-FR";
  const progress =
    book.progress.find((p) => p.targetLanguage === targetLang) ||
    book.progress[0];

  const completedCheckpoints = Array.isArray(progress?.completedCheckpoints)
    ? (progress.completedCheckpoints as number[])
    : [];

  const rawPron = progress?.pronunciationScores;
  const pronunciationScores: Record<string, PagePronResult> =
    rawPron && typeof rawPron === "object" && !Array.isArray(rawPron)
      ? (rawPron as unknown as Record<string, PagePronResult>)
      : {};

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

  const [coverImageUrl, introVideoUrl, pageImageUrls, signedAudioEntries] =
    await Promise.all([
      resolveS3Url(book.coverImageS3Key),
      resolveS3Url(book.introVideoS3Key),
      Promise.all(
        book.pageImageS3Keys.map(async (k) => (await resolveS3Url(k)) || k)
      ),
      Promise.all(
        Array.from(audioKeysToSign).map(async (key) => {
          const url = await resolveS3Url(key);
          return [key, url] as const;
        })
      ),
    ]);

  const sentenceAudioUrls: Record<string, string> = {};
  for (const [key, url] of signedAudioEntries) {
    if (url) sentenceAudioUrls[key] = url;
  }

  return {
    book: {
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
        coverImageUrl: coverImageUrl || undefined,
        introVideoUrl: introVideoUrl || undefined,
        pageImageUrls,
        sentenceAudioUrls,
      },
    },
    userPlan:
      dbUser?.BillingInformation?.currentPlan?.toLowerCase() || "founder",
    initialPage: progress?.completedAt ? 0 : (progress?.currentPage ?? 0),
    initialCompletedCheckpoints: completedCheckpoints,
    initialPronunciationScores: pronunciationScores,
  };
}

export type BookshelfData = Awaited<ReturnType<typeof getBookshelfData>>;
export type BookReaderData = NonNullable<
  Awaited<ReturnType<typeof getBookReaderData>>
>;