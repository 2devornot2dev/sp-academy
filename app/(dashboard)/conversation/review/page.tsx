// app/(dashboard)/conversation/review/page.tsx
import Link from "next/link";
import { requireUser } from "@/lib/auth-guard";
import { getUserReviews } from "@/app/actions/get-user-reviews";
import { ReviewTable } from "@/components/freestyle/review/review-table";
import { ArrowLeft, MessagesSquare, Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ConversationReviewsListPage() {
  const user = await requireUser();
  const reviews = await getUserReviews(user.id);

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 font-sans text-slate-900">
      {/* GLOBAL APP HEADER BANNER */}
      <header className="relative shrink-0 overflow-hidden animate-bg pt-6 pb-16 text-white shadow-lg">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/15 to-slate-950/35 backdrop-blur-[2px]" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[850px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/conversation"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-slate-950/40 px-4 py-1.5 text-xs font-black text-white shadow-sm backdrop-blur-md transition hover:bg-slate-950/60"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Conversation Arena</span>
            </Link>

            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/40 px-4 py-1.5 text-xs font-black text-amber-300 shadow-sm backdrop-blur-md">
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
              <span>{reviews.length} Total Reports</span>
            </div>
          </div>

          <div className="max-w-3xl">
            <h1 className="flex items-center gap-3 text-2xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.22)] sm:text-3xl md:text-4xl">
              <span>Past Conversation Reviews</span>
              <MessagesSquare className="h-7 w-7 text-white/90 sm:h-8 sm:w-8" />
            </h1>
            <p className="mt-1 text-sm font-medium text-white/90 sm:text-base">
              Select any session below to inspect your scores, grammar focus,
              and native upgrades.
            </p>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT OVERLAPPING HEADER */}
      <main className="relative z-20 mx-auto -mt-10 w-full max-w-7xl flex-1 px-6 pb-16 lg:px-8">
        <ReviewTable reviews={reviews} />
      </main>
    </div>
  );
}