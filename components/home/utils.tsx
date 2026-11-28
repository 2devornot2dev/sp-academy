import {
  Flame,
  Globe2,
  Trophy,
  Zap,
  ArrowRight,
  Eye,
  MousePointerClick,
  Mic2,
  Headphones,
  ChevronRight,
} from "lucide-react";
import type { HomeDashboardData } from "@/app/actions/get-home-dashboard";

export function HeroTrophyIllustration({
  milestone = 1,
}: {
  milestone?: number;
}) {
  const TIER_PALETTES = [
    {
      // Gold
      cup: ["#FEF08A", "#FACC15", "#B45309"],
      rim: "#FEF9C3",
      base: "#92400E",
      podiumTop: ["#38BDF8", "#0284C7"],
      glowA: "#38BDF8",
      glowB: "#FACC15",
      gem: "#10B981",
    },
    {
      // Emerald
      cup: ["#A7F3D0", "#10B981", "#047857"],
      rim: "#D1FAE5",
      base: "#065F46",
      podiumTop: ["#34D399", "#059669"],
      glowA: "#10B981",
      glowB: "#38BDF8",
      gem: "#FACC15",
    },
    {
      // Sapphire
      cup: ["#BAE6FD", "#38BDF8", "#1D4ED8"],
      rim: "#E0F2FE",
      base: "#1E3A8A",
      podiumTop: ["#818CF8", "#4F46E5"],
      glowA: "#38BDF8",
      glowB: "#818CF8",
      gem: "#FDE047",
    },
    {
      // Amethyst Royal
      cup: ["#E9D5FF", "#C084FC", "#6D28D9"],
      rim: "#F3E8FF",
      base: "#4C1D95",
      podiumTop: ["#F472B6", "#DB2777"],
      glowA: "#C084FC",
      glowB: "#F472B6",
      gem: "#38BDF8",
    },
    {
      // Crimson Solar
      cup: ["#FECDD3", "#FB7185", "#BE123C"],
      rim: "#FFE4E6",
      base: "#881337",
      podiumTop: ["#FBBF24", "#D97706"],
      glowA: "#FB7185",
      glowB: "#FACC15",
      gem: "#FEF08A",
    },
    {
      // Prismatic Diamond
      cup: ["#FFFFFF", "#67E8F9", "#6366F1"],
      rim: "#ECFEFF",
      base: "#312E81",
      podiumTop: ["#22D3EE", "#4F46E5"],
      glowA: "#22D3EE",
      glowB: "#C084FC",
      gem: "#F43F5E",
    },
  ] as const;

  const palette = TIER_PALETTES[(Math.max(1, milestone) - 1) % TIER_PALETTES.length];
  const hasCrown = milestone >= 3;
  const hasWings = milestone >= 5;

  return (
    <svg
      viewBox="0 0 260 190"
      className="h-28 w-36 sm:h-36 sm:w-48 shrink-0 select-none drop-shadow-[0_12px_20px_rgba(0,0,0,0.38)]"
      fill="none"
    >
      <defs>
        <linearGradient id="goldCup" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={palette.cup[0]} />
          <stop offset="45%" stopColor={palette.cup[1]} />
          <stop offset="100%" stopColor={palette.cup[2]} />
        </linearGradient>
        <linearGradient id="podiumTop" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={palette.podiumTop[0]} />
          <stop offset="100%" stopColor={palette.podiumTop[1]} />
        </linearGradient>
        <linearGradient id="podiumBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
      </defs>

      {/* Ambient Aura */}
      <circle cx="135" cy="85" r="70" fill={palette.glowA} fillOpacity="0.14" />
      <circle cx="135" cy="85" r="48" fill={palette.glowB} fillOpacity="0.18" />

      {hasWings && (
        <circle
          cx="135"
          cy="82"
          r="58"
          stroke={palette.cup[0]}
          strokeOpacity="0.3"
          strokeWidth="1.5"
          strokeDasharray="6 6"
        />
      )}

      {/* Confetti Accents */}
      <circle cx="55" cy="36" r="4" fill="#FDE047" />
      <circle cx="215" cy="44" r="5" fill="#4ADE80" />
      <rect
        x="42"
        y="68"
        width="10"
        height="5"
        rx="2.5"
        transform="rotate(-25 42 68)"
        fill={palette.glowA}
      />
      <rect
        x="200"
        y="95"
        width="12"
        height="5"
        rx="2.5"
        transform="rotate(30 200 95)"
        fill="#FACC15"
      />

      {/* 3D Podium + Engraved Milestone Badge */}
      <ellipse cx="135" cy="172" rx="74" ry="11" fill="#090D16" />
      <rect
        x="75"
        y="146"
        width="120"
        height="24"
        rx="6"
        fill="url(#podiumBody)"
        stroke="#334155"
        strokeWidth="1.5"
      />
      <ellipse cx="135" cy="146" rx="60" ry="9" fill="url(#podiumTop)" />

      {/* Engraved Milestone Plate on Podium */}
      <rect
        x="105"
        y="151"
        width="60"
        height="15"
        rx="4"
        fill="#0F172A"
        stroke={palette.cup[1]}
        strokeWidth="1.2"
      />
      <text
        x="135"
        y="162"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="10"
        fontWeight="900"
        letterSpacing="1"
      >
        M{milestone}
      </text>

      {/* Trophy Base & Stem */}
      <rect x="110" y="128" width="50" height="14" rx="4" fill={palette.base} />
      <rect x="115" y="122" width="40" height="8" rx="3" fill="url(#goldCup)" />
      <rect x="128" y="96" width="14" height="28" rx="5" fill="url(#goldCup)" />

      {/* Handles */}
      <path
        d="M100 46H84C78 46 75 52 77 59C80 71 91 82 106 82"
        stroke="url(#goldCup)"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M170 46H186C192 46 195 52 193 59C190 71 179 82 164 82"
        stroke="url(#goldCup)"
        strokeWidth="8"
        strokeLinecap="round"
      />

      {/* Cup Bowl */}
      <path
        d="M96 32H174V60C174 84 157 100 135 100C113 100 96 84 96 60V32Z"
        fill="url(#goldCup)"
      />
      <ellipse cx="135" cy="32" rx="39" ry="7" fill={palette.rim} />

      {/* Floating Mini Crown for Milestone 3+ */}
      {hasCrown && (
        <path
          d="M119 22L124 11L135 18L146 11L151 22H119Z"
          fill="#FACC15"
          stroke="#FEF08A"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      )}

      {/* Center Star + Gem */}
      <polygon
        points="135,44 140,55 152,56 143,63 145,75 135,69 125,75 127,63 118,56 130,55"
        fill="#FFFBEB"
      />
      <circle cx="135" cy="60" r="4.5" fill={palette.gem} />
    </svg>
  );
}


export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 20 || hour < 5) return "Up late";
  return "Hi";
};



export function getBadges(
  languageCard: HomeDashboardData["languageCard"]
) {
  return [
    {
      id: "first-spoon",
      title: "First Spoon",
      sub: "Consistency",
      unlocked: languageCard.spoonsCompleted >= 1,
      grad: ["#FDBA74", "#EA580C"],
      emoji: "🔥",
    },
    {
      id: "words",
      title: `${Math.max(50, languageCard.totalWordsBanked)} Words`,
      sub: "Vocabulary",
      unlocked: languageCard.totalWordsBanked >= 20,
      grad: ["#93C5FD", "#2563EB"],
      emoji: "💬",
    },
    {
      id: "speaking",
      title: "Clear Speaker",
      sub: "Pronunciation",
      unlocked: languageCard.spokenResonanceAvg >= 60,
      grad: ["#6EE7B7", "#059669"],
      emoji: "🎯",
    },
    {
      id: "boss-1",
      title: "First Crown",
      sub: "Boss Stage",
      unlocked: languageCard.bossesDefeated >= 1,
      grad: ["#C4B5FD", "#7C3AED"],
      emoji: "👑",
    },
    {
      id: "ten-spoons",
      title: "10 Spoons",
      sub: "Momentum",
      unlocked: languageCard.spoonsCompleted >= 10,
      grad: ["#FDE047", "#D97706"],
      emoji: "📖",
    },
    {
      id: "boss-3",
      title: "Boss Slayer",
      sub: "3 Crowns",
      unlocked: languageCard.bossesDefeated >= 3,
      grad: ["#F9A8D4", "#DB2777"],
      emoji: "🌍",
    },
  ];
}

export function getSignatures(
  wordSuperlatives: HomeDashboardData["wordSuperlatives"]
) {
  return [
    {
      id: "seen",
      label: "Most Seen",
      Icon: Eye,
      item: wordSuperlatives.mostSeen,
      fallback: "bonjour",
      cardClass: "bg-blue-600 shadow-blue-600/25",
      statClass: "bg-blue-950/40 text-blue-100",
    },
    {
      id: "tapped",
      label: "Most Tapped",
      Icon: MousePointerClick,
      item: wordSuperlatives.mostTapped,
      fallback: "voudrais",
      cardClass: "bg-amber-500 shadow-amber-500/25",
      statClass: "bg-amber-950/40 text-amber-100",
    },
    {
      id: "spoken",
      label: "Most Spoken",
      Icon: Mic2,
      item: wordSuperlatives.mostSpoken,
      fallback: "fatigué",
      cardClass: "bg-emerald-600 shadow-emerald-600/25",
      statClass: "bg-emerald-950/40 text-emerald-100",
    },
    {
      id: "heard",
      label: "Most Heard",
      Icon: Headphones,
      item: wordSuperlatives.mostHeard,
      fallback: "l'addition",
      cardClass: "bg-purple-600 shadow-purple-600/25",
      statClass: "bg-purple-950/40 text-purple-100",
    },
  ];
}