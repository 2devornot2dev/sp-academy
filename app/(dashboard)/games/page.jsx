import { Dice3, Gamepad2, Sparkles } from "lucide-react";
import GameCard from "@/components/games/game-card";
import { getAllGames } from "@/lib/actions";

export default async function GamesPage() {
  const games = (await getAllGames()) ?? [];

  return (
    <div className="min-h-screen bg-slate-100/80 font-sans text-slate-900">
      {/* SPOON HEADER BANNER (Matches Learning Hub) */}
      <header className="relative overflow-hidden animate-bg pt-9 pb-22 text-white shadow-lg">
        {/* Subtle dark-glass contrast scrim so white text is always razor-sharp */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/15 to-slate-950/35 backdrop-blur-[2px]" />

        {/* Soft ambient highlights */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-[850px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
          {/* Top Frosted Dark-Glass Pill */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-slate-950/35 px-4 py-1.5 text-xs font-extrabold tracking-wide text-white uppercase shadow-sm backdrop-blur-md">
              <Gamepad2 className="h-4 w-4 text-cyan-300" />
              <span>Interactive Language Arcade</span>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/35 px-3.5 py-1.5 text-xs font-extrabold text-amber-300 shadow-sm backdrop-blur-md">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>{games.length} Games Available</span>
            </div>
          </div>

          {/* Main Title & Subtitle */}
          <div className="max-w-3xl">
            <h1 className="flex items-center gap-3.5 text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.22)]">
              <span>Language Games</span>
              <Dice3
                strokeWidth={2}
                className="size-9 text-white/95 drop-shadow-md sm:size-11"
              />
            </h1>
            <p className="mt-2.5 text-base font-medium text-white/90 drop-shadow-[0_1px_4px_rgba(15,23,42,0.18)] sm:text-lg">
              Reinforce your vocabulary, test your reflexes, and build fluency
              through fast-paced interactive challenges.
            </p>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT (Overlaps header with -mt-12 just like Learning Hub) */}
      <main className="relative z-20 mx-auto -mt-12 max-w-7xl px-6 pb-24 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </main>
    </div>
  );
}