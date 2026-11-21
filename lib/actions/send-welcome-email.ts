// lib/actions/send-welcome-email.ts
"use server";

import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/emails/send-email";
import { WelcomeEmailTemplate } from "@/lib/emails/templates/welcome-email-template";
import type { ProgramTier } from "@/lib/emails/email-config";

const LANG_LABELS: Record<string, string> = {
  fr: "French",
  es: "Spanish",
  en: "English",
};

function formatLanguageLabel(codeOrName?: string | null): string {
  if (!codeOrName) return "your new language";
  const prefix = codeOrName.trim().toLowerCase().split("-")[0];
  return LANG_LABELS[prefix] || codeOrName;
}

function mapBillingToProgram(
  currentPlan?: string | null,
  isPaidFallback?: boolean,
): ProgramTier {
  if (currentPlan === "FOUNDER_MONTHLY") return "FOUNDER";
  if (currentPlan === "PRO_MONTHLY") return "UNLIMITED";
  return isPaidFallback ? "FOUNDER" : "TRIAL";
}

const SUBJECT_BY_TIER: Record<ProgramTier, string> = {
  TRIAL: "Your Spoon Academy free trial is live — Spoon 1 is ready",
  FOUNDER: "Welcome to Spoon Academy (Founder Access) — your first Spoon is ready",
  UNLIMITED: "Welcome to Spoon Academy Unlimited — your first Spoon is ready",
};

export async function sendOnboardingWelcomeEmail({
  firstName,
  targetLanguage,
  isPaid = false,
}: {
  firstName?: string | null;
  targetLanguage?: string | null;
  isPaid?: boolean;
}) {
  try {
    const user = await requireUser();
    if (!user?.email) {
      return { ok: false as const, error: "User email missing" };
    }

    const billing = await prisma.billingInformation.findUnique({
      where: { userId: user.id },
      select: { currentPlan: true, isActive: true },
    });

    const program = mapBillingToProgram(
      billing?.isActive ? billing.currentPlan : null,
      isPaid,
    );

    return await sendEmail({
      to: user.email,
      subject: SUBJECT_BY_TIER[program],
      react: WelcomeEmailTemplate({
        name: firstName?.trim() || user.name || "there",
        program,
        targetLanguageLabel: formatLanguageLabel(targetLanguage),
      }),
    });
  } catch (err) {
    // Non-fatal: never block onboarding redirect if email fails
    console.error("[sendOnboardingWelcomeEmail] non-fatal error:", err);
    return { ok: false as const, error: "Failed to send welcome email" };
  }
}