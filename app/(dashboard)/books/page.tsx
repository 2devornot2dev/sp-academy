// app/books/page.tsx
import Link from "next/link";
import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

import {
  BookOpen,
  LibraryBig,
  Sparkles,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import type { LocalizedBookTranslationSchema } from "@/lib/schema/book-schema";
import type { z } from "zod";

type TranslationsMap = Record<
  string,
  z.infer<typeof LocalizedBookTranslationSchema>
>;

// Helper to resolve S3 key to URL (adjust if you use presigned URLs or CloudFront/S3 public bucket)
function resolveMediaUrl(s3Key: string | null | undefined, fallback: string) {
  if (!s3Key) return fallback;
  if (s3Key.startsWith("http")) return s3Key;
  const baseUrl = process.env.NEXT_PUBLIC_S3_BASE_URL || "";
  return baseUrl ? `${baseUrl.replace(/\/$/, "")}/${s3Key}` : fallback;
}

export default async function BookReportsPage() {
  const user = await requireUser();

  // Fetch user's target language from SpriteProfile or User
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
      },
    },
  });

  return (
    <div className="overflow-hidden pb-16">
      <header className="relative shrink-0 overflow-hidden animate-bg pt-6 pb-16 text-white shadow-lg">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/15 to-slate-950/35 backdrop-blur-[2px]" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[850px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
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
            <p className="mt-2.5 text-base font-medium text-white/90 drop-shadow-[0_1px_4px_rgba(15,23,42,0.18)] sm:text-lg">
              Immerse yourself in graded stories with tap-to-translate audio,
              interactive Sprite checkpoints, and vocabulary tracking.
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto mt-8 grid max-w-7xl grid-cols-1 gap-6 px-6 sm:grid-cols-2 lg:grid-cols-3">
        {!books || books.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200/20 bg-slate-950/30 p-10 text-center text-sm text-white/80">
            <LibraryBig className="size-10 text-teal-400" />
            <p className="text-base font-bold text-white">
              No books available at the moment.
            </p>
            <p className="max-w-sm text-xs text-slate-400">
              Once your SpoonBook generator finishes baking stories, they will
              appear right here on your bookshelf.
            </p>
          </div>
        ) : (
          books.map((book) => {
            const translations = (book.translations || {}) as TranslationsMap;
            const availableLangs = Object.keys(translations);
            const activeEdition =
              translations[userLang] ||
              translations["fr-FR"] ||
              translations[availableLangs[0]];

            const totalPages =
              activeEdition?.pages?.length ||
              book.pageImageS3Keys?.length ||
              5;

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

            const coverUrl = resolveMediaUrl(
              book.coverImageS3Key,
              book.characterAvatarUrl
            );

            return (
              <Link
                key={book.id}
                href={`/books/${book.slug}`}
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
              >
                {/* Cover Illustration */}
                <div className="relative aspect-[5/4] w-full overflow-hidden bg-slate-950">
                  <img
                    src={coverUrl}
                    alt={activeEdition?.title || book.slug}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                  {/* Top Left: Level & Genre Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="rounded-full bg-slate-950/80 px-2.5 py-1 text-[10px] font-black tracking-wider text-teal-300 uppercase backdrop-blur-md">
                      {book.levelBand}
                    </span>
                    <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white capitalize backdrop-blur-md">
                      {book.genre}
                    </span>
                  </div>

                  {/* Top Right: Completion Seal */}
                  {isCompleted && (
                    <div className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full border border-amber-300/60 bg-amber-400/95 px-2.5 py-1 text-[10px] font-black text-slate-950 shadow-lg">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>COMPLETED</span>
                    </div>
                  )}

                  {/* Bottom Left: Character Avatar Pill */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/75 py-1 pr-3 pl-1 backdrop-blur-md">
                    <img
                      src={book.characterAvatarUrl}
                      alt={book.characterName}
                      className="h-6 w-6 rounded-full object-cover ring-1 ring-teal-400"
                    />
                    <span className="text-[11px] font-bold text-white">
                      Starring {book.characterName}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="flex flex-1 flex-col justify-between p-5">
                  <div className="space-y-2">
                    <h2 className="line-clamp-1 text-lg font-black text-slate-900 group-hover:text-teal-600 dark:text-white dark:group-hover:text-teal-400">
                      {activeEdition?.title || book.slug}
                    </h2>
                    <p className="line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      {activeEdition?.synopsis ||
                        `Join ${book.characterName} in this interactive ${totalPages}-page story.`}
                    </p>
                  </div>

                  <div className="mt-5 space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                    {/* Checkpoints Progress Bar */}
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        {completedCheckpoints.length} / {totalPages} Checkpoints
                      </span>
                      <span>{totalPages} Pages</span>
                    </div>

                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-teal-400 to-indigo-500 transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(
                              (completedCheckpoints.length / totalPages) * 100
                            )
                          )}%`,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex gap-1">
                        {availableLangs.map((lang) => (
                          <span
                            key={lang}
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-600 uppercase dark:bg-slate-800 dark:text-slate-300"
                          >
                            {lang.split("-")[0]}
                          </span>
                        ))}
                      </div>

                      <span className="inline-flex items-center gap-1 text-xs font-black text-teal-600 group-hover:translate-x-0.5 dark:text-teal-400 transition-transform">
                        {isCompleted
                          ? "Re-read"
                          : userProgress
                            ? "Continue"
                            : "Read Story"}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}