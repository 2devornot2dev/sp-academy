// components/pricing/pricing-data.ts

export type PlanAccent = "primary" | "secondary" | "tertiary";
export type BillingIntervalOption = "monthly" | "annual";

export type Plan = {
  id: string;
  name: string;
  label: string;
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
  seatNote?: string;
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
  accent: "secondary",
  featured: false,
  price: "$0",
  originalPrice: "",
  period: "Free trial",
  description: "Test-drive the complete learning engine through Milestone 1.",
  features: [
    "Spoons 1–3 + Vocab Bridges 1–3",
    "Boss Stage 1 with live Azure speech scoring",
    "Interactive Chalkboard prep with Vox or Vivi",
    "Personal Word Matrix tracking",
    "No credit card required",
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
  accent: "primary",
  featured: true,
  price: "$35",
  originalPrice: "$49",
  period: "CAD /month",
  annualPrice: "$29",
  annualTotal: "$348 CAD billed annually",
  annualSavingsLabel: "2 months free (Save $72)",
  seatNote: "First 100 founders only · $35 locked for life",
  description: "15 full learning cycles per month with 1-on-1 AI coaching.",
  features: [
    "45 Spoons + 45 Video Vocab Bridges /mo",
    "15 Boss Stage assessments with live grading",
    "1-on-1 Chalkboard with 3D visuals & accent keys",
    "5 daily 5-min AI Conversation sprints",
    "3-Round Repair Arcades for your mistakes",
    "Private Founder Community access",
    "Lifetime Founder rate lock ($35 CAD/mo)",
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
  accent: "secondary",
  featured: false,
  price: "$125",
  originalPrice: "$159",
  period: "CAD /month",
  annualPrice: "$99",
  annualTotal: "$1,188 CAD billed annually",
  annualSavingsLabel: "Save $312/year",
  description: "Rapid immersion for exams (TEF/DELF) and relocation.",
  features: [
    "180 Spoons + 180 Video Vocab Bridges /mo",
    "60 cinematic video Boss Stage assessments",
    "15 daily AI Conversation sessions (no cooldown)",
    "Unlimited Sprite Energy (⚡) on Chalkboard",
    "Priority high-speed lesson & audio pre-baking",
    "Targeted professional & exam vocabulary",
    "VIP Founder Community + early access to Books",
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
    "Lock in Beta Founder pricing for personalized Spoons, video Vocab Bridges, 1-on-1 Chalkboard coaching, and daily AI conversation practice.",
  footnote:
    "Prices in CAD. Beta founders keep their rate locked in for the lifetime of their active subscription.",
  plans: PRICING_PLANS_WITH_FREE,
};