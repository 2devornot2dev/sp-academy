// app/(dashboard)/learning-hub/ladder/page.tsx
import Link from "next/link";
import { requireUser } from "@/lib/auth-guard";
import { getUserLanguage } from "@/app/actions/get-user-language";
import { getLadderOverview } from "@/app/actions/ladder-actions";
import { toLanguageCode } from "@/lib/languages";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Lock,
  Sparkles,
  TrendingUp,
} from "lucide-react";

export const dynamic = "force-dynamic";

const TIERS = [
  {
    tier: 1,
    title: "Tier 1 • Foundation Bricks",
    subtitle: "Colors, gender agreement, numbers, prices & daily objects",
    badge: "bg-sky-100 text-blue-700",
    activeBtn:
      "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-blue-500/25",
  },
  {
    tier: 2,
    title: "Tier 2 • Expressive Modifiers",
    subtitle: "Opposites, moods, weather, seasons & body vocabulary",
    badge: "bg-amber-100 text-amber-800",
    activeBtn:
      "border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950 shadow-amber-500/25",
  },
  {
    tier: 3,
    title: "Tier 3 • The Verb Time Machine",
    subtitle: "Core action verbs across Present, Past & Future tenses",
    badge: "bg-purple-100 text-purple-700",
    activeBtn:
      "border-purple-950 bg-gradient-to-b from-violet-500 to-purple-700 text-white shadow-purple-500/25",
  },
] as const;

export default async function VocabLadderMapPage() {
  const user = await requireUser();
  const { lang } = await getUserLanguage(user.id);
  const targetLang = toLanguageCode(lang?.targetLanguage || "FRENCH");
  const overview = await getLadderOverview(user.id, targetLang);

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
      {/* Header */}
      <header className="relative overflow-hidden animate-bg pt-6 pb-20 text-white shadow-lg">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/15 to-slate-950/35 backdrop-blur-[2px]" />
        <div className="relative z-10 mx-auto max-w-5xl px-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/learning-hub"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-slate-950/40 px-4 py-1.5 text-xs font-black text-white backdrop-blur-md transition hover:bg-slate-950/60"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-cyan-300" />
              <span>Back to Learning Hub</span>
            </Link>

            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-slate-950/40 px-4 py-1.5 text-xs font-black text-amber-300 backdrop-blur-md">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>
                {overview.completedCount} / {overview.totalCount || 10} Rungs
                Climbed
              </span>
            </div>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            Vocab Ladder
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm font-medium text-white/90 sm:text-base">
            Climb from concrete foundation bricks to expressive modifiers and
            Past/Future verbs—and power up your Hard Mode Bosses.
          </p>
        </div>
      </header>

      <main className="relative z-20 mx-auto -mt-12 max-w-5xl space-y-6 px-6 pb-16">
        {!overview.isUnlocked && (
          <div className="flex flex-col justify-between gap-4 rounded-[2rem] border-2 border-b-[6px] border-amber-200 border-b-amber-300 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-b-4 border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Unlocks at Spoon {overview.unlockThreshold}
                </h2>
                <p className="text-xs font-semibold text-slate-500 sm:text-sm">
                  You&apos;ve completed{" "}
                  <strong>{overview.completedSpoonsCount}</strong> of{" "}
                  <strong>{overview.unlockThreshold}</strong> Spoons. Keep
                  climbing your main path!
                </p>
              </div>
            </div>

            <Link
              href="/learning-hub"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-6 py-3 text-xs font-black text-white shadow-md"
            >
              <span>Continue Spoons</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {TIERS.map((tierCfg) => {
          const tierRungs = overview.rungs.filter(
            (r) => r.tier === tierCfg.tier,
          );
          if (tierRungs.length === 0) return null;

          return (
            <section
              key={tierCfg.tier}
              className="rounded-[2rem] border-2 border-b-[6px] border-slate-200 border-b-slate-300 bg-white p-6 shadow-sm sm:p-7"
            >
              <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-[10px] font-black tracking-wider uppercase ${tierCfg.badge}`}
                  >
                    {tierCfg.title}
                  </span>
                  <p className="mt-1.5 text-xs font-semibold text-slate-500">
                    {tierCfg.subtitle}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {tierRungs.map((rung) => {
                  const isDone = rung.status === "COMPLETED";
                  const isActive = rung.status === "ACTIVE";
                  const canPlay = isDone || isActive;

                  return (
                    <div
                      key={rung.id}
                      className={`flex flex-col justify-between gap-4 rounded-2xl p-4 transition sm:flex-row sm:items-center ${
                        isActive
                          ? "bg-sky-50/70 ring-2 ring-sky-300"
                          : isDone
                            ? "bg-emerald-50/50 ring-1 ring-emerald-200"
                            : "bg-slate-50/80 opacity-75 ring-1 ring-slate-200/70"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-black ${
                            isDone
                              ? "border-b-4 border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white"
                              : isActive
                                ? `border-b-4 ${tierCfg.activeBtn}`
                                : "border-b-[3px] border-slate-300 bg-slate-100 text-slate-400"
                          }`}
                        >
                          {isDone ? (
                            <Check className="h-5 w-5 stroke-[3.5]" />
                          ) : canPlay ? (
                            <span>{rung.icon}</span>
                          ) : (
                            <Lock className="h-4 w-4" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
                              Rung {rung.rungOrder}
                            </span>
                            {isActive && (
                              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[9px] font-black text-amber-300 uppercase">
                                Active
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-black text-slate-900">
                            {rung.title}
                          </h3>
                          <p className="text-xs font-medium text-slate-500">
                            {rung.subtitle}
                          </p>
                        </div>
                      </div>

                      {canPlay ? (
                        <Link
                          href={`/learning-hub/ladder/${rung.slug}`}
                          className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border-b-4 px-5 py-3 text-xs font-black transition hover:-translate-y-0.5 hover:brightness-105 ${
                            isDone
                              ? "border-slate-300 bg-white text-slate-700 ring-1 ring-slate-200"
                              : tierCfg.activeBtn
                          }`}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>{isDone ? "Replay Rung" : "Climb Rung"}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-black text-slate-400 ring-1 ring-slate-200">
                          <Lock className="h-3.5 w-3.5" />
                          <span>Locked</span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}