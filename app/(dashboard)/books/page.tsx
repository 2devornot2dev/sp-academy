// app/books/page.tsx
import { BookOpen } from "lucide-react";
import { BookshelfClient } from "@/components/books/bookshelf-client";
import { getBookshelfData } from "@/lib/actions/get-books";

export default async function BooksPage() {
  const hydratedBooks = await getBookshelfData();

  return (
    <div className="min-h-screen bg-slate-50/60 pb-20">
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

      <BookshelfClient books={hydratedBooks} />
    </div>
  );
}