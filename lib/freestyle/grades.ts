// lib/freestyle/grades.ts

export interface TrickyWordItem {
  word: string;
  score: number;
}

export function getAlphaGrade(score: number | null | undefined) {
  if (score === null || score === undefined || Number.isNaN(score)) {
    return {
      letter: "—",
      tier: "Pending",
      pill: "border-slate-200 border-b-slate-300 bg-slate-100 text-slate-400",
      tile: "border-white/10 bg-slate-900/70 text-slate-400",
      lightTile: "border-slate-200 border-b-slate-300 bg-slate-50 text-slate-500",
      heroEmblem:
        "border-slate-700 bg-gradient-to-b from-slate-700 to-slate-900 text-slate-300",
    };
  }

  let letter = "D-";
  if (score >= 97) letter = "A+";
  else if (score >= 93) letter = "A";
  else if (score >= 90) letter = "A-";
  else if (score >= 87) letter = "B+";
  else if (score >= 83) letter = "B";
  else if (score >= 80) letter = "B-";
  else if (score >= 77) letter = "C+";
  else if (score >= 73) letter = "C";
  else if (score >= 70) letter = "C-";
  else if (score >= 65) letter = "D+";
  else if (score >= 60) letter = "D";

  if (letter.startsWith("A")) {
    return {
      letter,
      tier: "Native Flow",
      pill: "border-emerald-300 border-b-emerald-500 bg-emerald-100 text-emerald-900",
      tile: "border-emerald-400/40 bg-emerald-500/20 text-emerald-300",
      lightTile: "border-emerald-200 border-b-emerald-300 bg-emerald-50 text-emerald-800",
      heroEmblem:
        "border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950 shadow-emerald-500/35",
    };
  }

  if (letter.startsWith("B")) {
    return {
      letter,
      tier: "Strong Pace",
      pill: "border-sky-300 border-b-sky-500 bg-sky-100 text-sky-900",
      tile: "border-sky-400/40 bg-sky-500/20 text-sky-300",
      lightTile: "border-sky-200 border-b-sky-300 bg-sky-50 text-sky-800",
      heroEmblem:
        "border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-blue-500/35",
    };
  }

  if (letter.startsWith("C")) {
    return {
      letter,
      tier: "Building Up",
      pill: "border-amber-300 border-b-orange-400 bg-amber-100 text-amber-900",
      tile: "border-amber-400/40 bg-amber-500/20 text-amber-300",
      lightTile: "border-amber-200 border-b-amber-300 bg-amber-50 text-amber-800",
      heroEmblem:
        "border-orange-700 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950 shadow-amber-500/35",
    };
  }

  return {
    letter,
    tier: "Needs Polish",
    pill: "border-rose-300 border-b-rose-500 bg-rose-100 text-rose-900",
    tile: "border-rose-400/40 bg-rose-500/20 text-rose-300",
    lightTile: "border-rose-200 border-b-rose-300 bg-rose-50 text-rose-800",
    heroEmblem:
      "border-rose-900 bg-gradient-to-b from-rose-500 to-red-600 text-white shadow-rose-500/35",
  };
}

export function extractTrickyWords(messages: unknown): TrickyWordItem[] {
  if (!Array.isArray(messages)) return [];

  const stats = new Map<string, { display: string; sum: number; count: number }>();

  for (const m of messages) {
    if (!m || typeof m !== "object" || (m as any).role !== "user") continue;
    const words = (m as any)?.pronunciationScore?.words;
    if (!Array.isArray(words)) continue;

    for (const w of words) {
      const rawWord = String(w?.word || "").trim();
      const cleaned = rawWord.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
      if (!cleaned || cleaned.length < 2) continue;

      const score = Number(w?.accuracyScore);
      if (Number.isNaN(score)) continue;

      const key = cleaned.toLowerCase();
      const prev = stats.get(key);
      if (prev) {
        prev.sum += score;
        prev.count += 1;
      } else {
        stats.set(key, { display: cleaned, sum: score, count: 1 });
      }
    }
  }

  const all = Array.from(stats.values())
    .map((entry) => ({
      word: entry.display,
      score: Math.round(entry.sum / entry.count),
    }))
    .sort((a, b) => a.score - b.score);

  const belowThreshold = all.filter((w) => w.score < 85);
  if (belowThreshold.length >= 3) {
    return belowThreshold.slice(0, 8);
  }
  return all.slice(0, 6);
}