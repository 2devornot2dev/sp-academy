import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { BookOpen, LibraryBig } from "lucide-react";

export default async function BookReportsPage() {
  const user = await requireUser();

  const books = await prisma.spoonBook.findMany();

  // console.log("Books data:", books);

  return (
    <div className="overflow-hidden pb-10">
      <header className="relative overflow-hidden animate-bg pt-9 pb-22 text-white shadow-lg">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/15 to-slate-950/35 backdrop-blur-[2px]" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-[850px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-slate-950/35 px-4 py-1.5 text-xs font-extrabold tracking-wide text-white uppercase shadow-sm backdrop-blur-md">
              <BookOpen className="h-4 w-4 text-cyan-300" />
              <span>Bilingual Reading Library</span>
            </div>
          </div>

          <div className="max-w-3xl">
            <h1 className="flex items-center gap-3.5 font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.22)] text-2xl sm:text-3xl md:text-4xl">
              <span>Interactive Books</span>
              <BookOpen
                strokeWidth={2}
                className="size-9 text-white/95 drop-shadow-md sm:size-11"
              />
            </h1>
            <p className="mt-2.5 text-base font-medium text-white/90 drop-shadow-[0_1px_4px_rgba(15,23,42,0.18)] sm:text-lg">
              Immerse yourself in graded stories with tap-to-translate audio and
              vocabulary tracking.
            </p>
          </div>
        </div>
      </header>

      <div className="mt-6 grid max-w-7xl grid-cols-1 gap-6 px-6 sm:grid-cols-2 lg:grid-cols-3">
        {!books || books.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-200/20 bg-slate-950/30 p-6 text-center text-sm text-white/80">
            <LibraryBig className="size-9 text-white/90" />
            <p>No books available at the moment.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
