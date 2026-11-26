// lib/billing/entitlements.ts
import { prisma } from "@/lib/prisma";

export type PlanTier = "TRIAL" | "FOUNDER" | "UNLIMITED" | "ADMIN";

export interface UserEntitlements {
  plan: PlanTier;
  isTrial: boolean;
  isPaid: boolean;
  maxTrialSpoons: number | null; // 3 for TRIAL, null for paid
  monthlySpoonLimit: number;     // 3 | 45 | 180
  dailyFreestyleMax: number;     // 0 (or 1) | 5 | 15
  freestyleCooldownSeconds: number; // 300 (5m) for Founder, 0 (no cooldown) for Unlimited+
  unlimitedSpriteEnergy: boolean;
  canAccessBooks: boolean;
  canPrebakeNextMilestone: boolean;
}

const PLAN_LIMITS: Record<PlanTier, Omit<UserEntitlements, "plan">> = {
  TRIAL: {
    isTrial: true,
    isPaid: false,
    maxTrialSpoons: 3, // Milestone 1 Pass (Spoons 1-3 + Bridges 1-3 + Boss 1)
    monthlySpoonLimit: 3,
    dailyFreestyleMax: 1, // Flip to 1 if you want Trial users to sample 1 Arena call
    freestyleCooldownSeconds: 300,
    unlimitedSpriteEnergy: false,
    canAccessBooks: false,
    canPrebakeNextMilestone: false,
  },
  FOUNDER: {
    isTrial: false,
    isPaid: true,
    maxTrialSpoons: null,
    monthlySpoonLimit: 45, // 15 cycles/mo
    dailyFreestyleMax: 5,
    freestyleCooldownSeconds: 300, // 5-min cooldown
    unlimitedSpriteEnergy: false,
    canAccessBooks: true,
    canPrebakeNextMilestone: true,
  },
  UNLIMITED: {
    isTrial: false,
    isPaid: true,
    maxTrialSpoons: null,
    monthlySpoonLimit: 180, // 60 cycles/mo
    dailyFreestyleMax: 15,
    freestyleCooldownSeconds: 0, // No cooldown!
    unlimitedSpriteEnergy: true,
    canAccessBooks: true,
    canPrebakeNextMilestone: true,
  },
  ADMIN: {
    isTrial: false,
    isPaid: true,
    maxTrialSpoons: null,
    monthlySpoonLimit: 9999,
    dailyFreestyleMax: 99,
    freestyleCooldownSeconds: 0,
    unlimitedSpriteEnergy: true,
    canAccessBooks: true,
    canPrebakeNextMilestone: true,
  },
};

export async function getUserEntitlements(
  userId: string,
): Promise<UserEntitlements> {
  const [user, billing] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    }),
    prisma.billingInformation.findUnique({
      where: { userId },
      select: { currentPlan: true, isActive: true },
    }),
  ]);

  if (user?.role === "ADMIN") {
    return { plan: "ADMIN", ...PLAN_LIMITS.ADMIN };
  }

  let plan: PlanTier = "TRIAL";
  if (billing?.isActive) {
    if (
      billing.currentPlan === "PRO_MONTHLY" ||
      billing.currentPlan === "PRO_ANNUALLY"
    ) {
      plan = "UNLIMITED";
    } else if (
      billing.currentPlan === "FOUNDER_MONTHLY" ||
      billing.currentPlan === "FOUNDER_ANNUALLY"
    ) {
      plan = "FOUNDER";
    }
  }

  return { plan, ...PLAN_LIMITS[plan] };
}