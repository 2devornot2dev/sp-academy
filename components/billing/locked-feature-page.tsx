// components/billing/locked-feature-page.tsx
import Link from "next/link";
import { Lock, Sparkles, ArrowRight, Clock } from "lucide-react";

export function LockedFeaturePage({
  badge = "Beta Feature",
  title,
  description,
  ctaLabel = "View Plans & Upgrade",
  ctaHref = "/pricing",
  comingSoon = false,
}: {
  badge?: string;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  comingSoon?: boolean;
}) {
  return (
    <div className="flex min-h-full w-full flex-1 items-center justify-center bg-slate-50 p-4 sm:p-8">
      <div className="w-full max-w-xl rounded-[2rem] border-2 border-b-[6px] border-slate-200 border-b-slate-300 bg-white p-6 text-center shadow-xl sm:p-10">
        <div
          className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border-b-4 shadow-md ${
            comingSoon
              ? "border-indigo-800 bg-gradient-to-b from-indigo-400 to-violet-600 text-white"
              : "border-amber-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950"
          }`}
        >
          {comingSoon ? (
            <Clock className="h-8 w-8" />
          ) : (
            <Lock className="h-8 w-8" />
          )}
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-black tracking-wider text-amber-800 uppercase">
          <Sparkles className="h-3 w-3" />
          {badge}
        </span>

        <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>

        <p className="mx-auto mt-2.5 max-w-md text-sm font-semibold leading-relaxed text-slate-500">
          {description}
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href={ctaHref}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-8 py-4 text-sm font-black text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0 sm:text-base"
          >
            <span>{ctaLabel}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/learning-hub"
            className="inline-flex items-center justify-center rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-white px-6 py-3.5 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            Back to Learning Hub
          </Link>
        </div>
      </div>
    </div>
  );
}