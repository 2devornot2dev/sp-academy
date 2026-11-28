// components/pricing/pricing-data.ts

export type PlanAccent = "primary" | "secondary" | "tertiary";
export type BillingIntervalOption = "monthly" | "annual";

export type Plan = {
  id: string;
  name: string;
  label: string;
  badge?: string;
  accent: PlanAccent;
  featured: boolean;
  price: string;
  originalPrice: string;
  period: string;
  annualPrice?: string;
  annualTotal?: string;
  annualSavingsLabel?: string;
  description: string;
  features: string[];
  cta: { label: string; href: string };
};

export type PricingData = {
  eyebrow: string;
  heading: string;
  headingAccent: string;
  intro: string;
  footnote: string;
  plans: Plan[];
};

// ---------------------------------------------------------------------------
// 1. INDIVIDUAL PLANS
// ---------------------------------------------------------------------------

export const PLAN_FREE_MILESTONE: Plan = {
  id: "free",
  name: "Milestone 1 Pass",
  label: "Free Test Drive",
  badge: "No Credit Card Required",
  accent: "secondary",
  featured: false,
  price: "$0",
  originalPrice: "",
  period: "Free trial",
  description:
    "Test-drive the complete 3–3–1 voice engine and a live AI call through Milestone 1.",
  features: [
    "Spoons 1–3 (8 voice & listening stages each)",
    "Vocab Bridges 1–3 with 5s video spotlights",
    "1 Live 3-min AI Conversation + AI Review & Workout",
    "Boss Stage 1 + Personalized Video Graduation",
    "Personal Neural Word Matrix tracking",
  ],
  cta: {
    label: "Start Milestone 1 Free",
    href: "/onboarding",
  },
};

export const PLAN_CORE_FOUNDER: Plan = {
  id: "founder",
  name: "Founder",
  label: "Beta Founder Offer",
  badge: "100 founders only · $35 locked for life",
  accent: "primary",
  featured: true,
  price: "$35",
  originalPrice: "$49",
  period: "CAD /month",
  annualPrice: "$29",
  annualTotal: "$348 CAD billed annually",
  annualSavingsLabel: "2 months free (Save $72)",
  description:
    "15 full learning cycles per month + daily live AI speaking sprints & Story Books.",
  features: [
    "45 Spoons + 45 Video Vocab Bridges /mo",
    "15 lip-synced Boss gauntlets + Video Graduations /mo",
    "5 daily 3-min AI Conversation sprints + Live Notepad",
    "3-Round Repair Arcades & Interactive Story Books",
    "Vocab Ladders (unlocks at Spoon 15) + Hard Mode",
    "Private Skool Founder Community & $35 rate lock",
  ],
  cta: {
    label: "Become a founder",
    href: "/onboarding",
  },
};

export const PLAN_UNLIMITED_PLUS: Plan = {
  id: "unlimited",
  name: "Unlimited+",
  label: "For Intensive Learners",
  badge: "For Pro Learners",
  accent: "secondary",
  featured: false,
  price: "$125",
  originalPrice: "$159",
  period: "CAD /month",
  annualPrice: "$99",
  annualTotal: "$1,188 CAD billed annually",
  annualSavingsLabel: "Save $312/year",
  description:
    "Maximum monthly Spoon volume and zero cooldowns between AI calls.",
  features: [
    "180 Spoons + 180 Video Vocab Bridges /mo",
    "60 cinematic Boss Stage assessments + Graduations /mo",
    "15 daily 3-min AI Conversations (zero cooldown)",
    "Unlimited Sprite Energy (⚡) & All Multi-Lang Books",
    "Full Hard Mode Spiral (Parts IV–IX) + Vocab Ladders",
    "VIP Private Skool Community access",
  ],
  cta: {
    label: "Go Unlimited+",
    href: "/onboarding",
  },
};

export const PLAN_ENTERPRISE: Plan = {
  id: "enterprise",
  name: "Enterprise",
  label: "For organizations",
  accent: "tertiary",
  featured: false,
  price: "Custom",
  originalPrice: "",
  period: "",
  description: "Spoken language training for teams, schools, and companies.",
  features: [
    "Everything in Unlimited+ with custom seats",
    "Team dashboards & Word Matrix analytics",
    "Custom workplace scenarios & Boss Stages",
    "Single Sign-On (SSO) & admin billing",
    "Dedicated onboarding & SLA support",
  ],
  cta: {
    label: "Contact sales",
    href: "/contact",
  },
};

// ---------------------------------------------------------------------------
// 2. ARRAYS
// ---------------------------------------------------------------------------

export const PRICING_PLANS_PAID_ONLY: Plan[] = [
  PLAN_CORE_FOUNDER,
  PLAN_UNLIMITED_PLUS,
  PLAN_ENTERPRISE,
];

export const PRICING_PLANS_WITH_FREE: Plan[] = [
  PLAN_FREE_MILESTONE,
  PLAN_CORE_FOUNDER,
  PLAN_UNLIMITED_PLUS,
];

// ---------------------------------------------------------------------------
// 3. EXPORT
// ---------------------------------------------------------------------------

export const PRICING_DATA: PricingData = {
  eyebrow: "Pricing",
  heading: "Simple pricing.",
  headingAccent: "Real fluency.",
  intro:
    "Lock in Beta Founder pricing for personalized voice Spoons, 5s video Vocab Bridges, Boss gauntlets, and daily AI conversation practice.",
  footnote:
    "Prices in CAD. Beta founders keep their rate locked in for the lifetime of their active subscription.",
  plans: PRICING_PLANS_WITH_FREE,
};