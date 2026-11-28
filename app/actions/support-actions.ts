// app/actions/support-actions.ts
"use server";

import { requireUser } from "@/lib/auth-guard";
import { getUserEntitlements } from "@/lib/billing/entitlements";
import { sendEmail } from "@/lib/emails/send-email";
import { DEFAULT_REPLY_TO } from "@/lib/emails/email-config";
import { SupportEmailTemplate } from "@/lib/emails/templates/support-email-template";

export async function getSupportAccess() {
  try {
    const user = await requireUser();
    const entitlements = await getUserEntitlements(user.id);
    return {
      isPaid: entitlements.isPaid,
      plan: entitlements.plan,
      skoolUrl: entitlements.isPaid
        ? process.env.NEXT_PUBLIC_SKOOL_COMMUNITY_URL || ""
        : "",
    };
  } catch {
    return { isPaid: false, plan: "TRIAL" as const, skoolUrl: "" };
  }
}

export async function sendSupportRequest({
  subject,
  message,
  eyebrow,
}: {
  subject: string;
  message: string;
  eyebrow?: string;
}) {
  try {
    const user = await requireUser();
    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();

    if (!cleanSubject || !cleanMessage) {
      return {
        ok: false as const,
        error: "Please enter a subject and message.",
      };
    }

    return await sendEmail({
      to: DEFAULT_REPLY_TO,
      subject: `[Spoon Support] ${cleanSubject}`,
      react: SupportEmailTemplate({
        userName: user.name || "Learner",
        userEmail: user.email || "unknown",
        userId: user.id,
        subject: cleanSubject,
        message: cleanMessage,
        eyebrow,
      }),
    });
  } catch (err) {
    console.error("[sendSupportRequest] failed:", err);
    return { ok: false as const, error: "Failed to send support request." };
  }
}