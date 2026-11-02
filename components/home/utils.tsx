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

export function HeroTrophyIllustration() {
  return (
    <svg
      viewBox="0 0 260 190"
      className="h-32 w-40 sm:h-36 sm:w-48 shrink-0 select-none drop-shadow-[0_12px_20px_rgba(0,0,0,0.35)]"
      fill="none"
    >
      <defs>
        <linearGradient id="goldCup" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="45%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="podiumTop" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
        <linearGradient id="podiumBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
      </defs>

      <circle cx="135" cy="85" r="68" fill="#38BDF8" fillOpacity="0.12" />
      <circle cx="135" cy="85" r="46" fill="#FACC15" fillOpacity="0.15" />

      <circle cx="55" cy="36" r="4" fill="#FDE047" />
      <circle cx="215" cy="44" r="5" fill="#4ADE80" />
      <rect
        x="42"
        y="68"
        width="10"
        height="5"
        rx="2.5"
        transform="rotate(-25 42 68)"
        fill="#38BDF8"
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

      <ellipse cx="135" cy="172" rx="74" ry="11" fill="#090D16" />
      <rect x="75" y="146" width="120" height="24" rx="6" fill="url(#podiumBody)" />
      <ellipse cx="135" cy="146" rx="60" ry="9" fill="url(#podiumTop)" />

      <rect x="110" y="128" width="50" height="14" rx="4" fill="#B45309" />
      <rect x="115" y="122" width="40" height="8" rx="3" fill="url(#goldCup)" />
      <rect x="128" y="96" width="14" height="28" rx="5" fill="url(#goldCup)" />

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

      <path
        d="M96 32H174V60C174 84 157 100 135 100C113 100 96 84 96 60V32Z"
        fill="url(#goldCup)"
      />
      <ellipse cx="135" cy="32" rx="39" ry="7" fill="#FEF9C3" />

      <polygon
        points="135,46 140,57 152,58 143,65 145,77 135,71 125,77 127,65 118,58 130,57"
        fill="#FFFBEB"
      />
    </svg>
  );
}


export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 20 || hour < 5) return "Up late";
  return "Hi";
};

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
      iconBg: "bg-sky-500 text-white",
      pillClass: "bg-sky-100 text-sky-700",
      cardClass: "border-sky-100 bg-sky-50/50",
    },
    {
      id: "tapped",
      label: "Most Tapped",
      Icon: MousePointerClick,
      item: wordSuperlatives.mostTapped,
      fallback: "voudrais",
      iconBg: "bg-amber-500 text-white",
      pillClass: "bg-amber-100 text-amber-800",
      cardClass: "border-amber-100 bg-amber-50/50",
    },
    {
      id: "spoken",
      label: "Most Spoken",
      Icon: Mic2,
      item: wordSuperlatives.mostSpoken,
      fallback: "fatigué",
      iconBg: "bg-emerald-500 text-white",
      pillClass: "bg-emerald-100 text-emerald-800",
      cardClass: "border-emerald-100 bg-emerald-50/50",
    },
    {
      id: "heard",
      label: "Most Heard",
      Icon: Headphones,
      item: wordSuperlatives.mostHeard,
      fallback: "l'addition",
      iconBg: "bg-purple-500 text-white",
      pillClass: "bg-purple-100 text-purple-800",
      cardClass: "border-purple-100 bg-purple-50/50",
    },
  ];
}

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