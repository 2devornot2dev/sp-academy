// app/books/page.tsx
import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { getPresignedImageUrl } from "@/lib/aws/services/s3-presigned-url";
import { BookOpen } from "lucide-react";
import {
  BookshelfClient,
  type BookshelfItem,
} from "@/components/books/bookshelf-client";
import type { LocalizedBookTranslationSchema } from "@/lib/schema/book-schema";
import type { z } from "zod";

type TranslationsMap = Record<
  string,
  z.infer<typeof LocalizedBookTranslationSchema>
>;

async function resolveS3Url(
  key?: string | null,
  fallback?: string
): Promise<string> {
  if (!key) return fallback || "";
  if (key.startsWith("http")) return key;
  try {
    const signed = await getPresignedImageUrl(key);
    return signed || fallback || "";
  } catch {
    return fallback || "";
  }
}

export default async function BooksPage() {
  const user = await requireUser();

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      targetLanguage: true,
      spriteProfile: { select: { targetLanguage: true } },
    },
  });

  const userLang = dbUser?.spriteProfile?.targetLanguage || "fr-FR";

  const books = await prisma.spoonBook.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
    include: {
      progress: {
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  // Presign each book's real coverImageS3Key (and introVideoS3Key) in parallel
  const hydratedBooks: BookshelfItem[] = await Promise.all(
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
        Boolean(userProgress?.completedAt) ||
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

  return (
    <div className="min-h-screen bg-slate-50/60 pb-20">
      {/* Keep your signature Spoon gradient header */}
      <header className="relative shrink-0 overflow-hidden animate-bg pt-6 pb-14 text-white shadow-lg">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/15 to-slate-950/35 backdrop-blur-[2px]" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[850px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-slate-950/35 px-4 py-1.5 text-xs font-extrabold tracking-wide text-white uppercase shadow-sm backdrop-blur-md">
              <BookOpen className="h-4 w-4 text-cyan-300" />
              <span>Bilingual Reading Library</span>
            </div>
          </div>

          <div className="max-w-3xl">
            <h1 className="flex items-center gap-3.5 text-2xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.22)] sm:text-3xl md:text-4xl">
              <span>Interactive Books</span>
              <BookOpen
                strokeWidth={2}
                className="size-9 text-white/95 drop-shadow-md sm:size-11"
              />
            </h1>
            <p className="mt-2 text-base font-medium text-white/90 drop-shadow-[0_1px_4px_rgba(15,23,42,0.18)] sm:text-lg">
              Explore Spoon Original series, pick up right where you left off,
              and master new vocabulary in context.
            </p>
          </div>
        </div>
      </header>

      {/* Main Premium Bookshelf Client */}
      <BookshelfClient books={hydratedBooks} />
    </div>
  );
}