// app/account/page.tsx
import React from "react";
import { getUserDetailsById, type UserDetails } from "@/lib/actions";
import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { getPresignedImageUrl } from "@/lib/aws/services/s3-presigned-url";
import { getUserEntitlements } from "@/lib/billing/entitlements";
import { toLanguageCode } from "@/lib/languages";
import { Cog, ShieldCheck, Globe2, Crown } from "lucide-react";
import { AccountTabs } from "@/components/account/account-tabs";
import { BillingForm } from "@/components/account/billing-form";
import { SharingSettingsForm } from "@/components/account/sharing-settings-form";
import { NotificationSettingsForm } from "@/components/account/notifications-settings-form";
import { DangerZone } from "@/components/account/dange-zone";
import { GeneralSettings } from "@/components/account/general-settings";

export const dynamic = "force-dynamic";

async function safePresign(key?: string | null): Promise<string | null> {
  if (!key) return null;
  if (
    key.startsWith("http://") ||
    key.startsWith("https://") ||
    key.startsWith("/")
  ) {
    return key;
  }
  try {
    return await getPresignedImageUrl(key);
  } catch {
    return null;
  }
}

export default async function AccountSettings() {
  const user = await requireUser();

  const [userDetails, rawSprites, entitlements]: [UserDetails, any[], any] =
    await Promise.all([
      getUserDetailsById(user.id),
      prisma.sprite.findMany({
        select: {
          id: true,
          slug: true,
          name: true,
          avatarUrl: true,
          persona: true,
        },
      }),
      getUserEntitlements(user.id),
    ]);

  const targetLangCode = toLanguageCode(
    userDetails.targetLanguage ||
      userDetails.spriteProfile?.targetLanguage ||
      "fr-FR",
  );
  const nativeLangCode = toLanguageCode(
    userDetails.nativeLanguage ||
      userDetails.spriteProfile?.nativeLanguage ||
      "en-US",
  );

  const langProfile = await prisma.languageProfile
    .findUnique({
      where: {
        userId_languageCode: {
          userId: user.id,
          languageCode: targetLangCode,
        },
      },
    })
    .catch(() => null);

  const initialLevelBand = ((langProfile as any)?.levelBand || "beginner")
    .toString()
    .toLowerCase();

  const sprites = await Promise.all(
    rawSprites.map(async (s) => ({
      ...s,
      avatarUrl: await safePresign(s.avatarUrl),
    })),
  );

  const planBadge =
    entitlements.plan === "ADMIN"
      ? "Admin"
      : entitlements.plan === "UNLIMITED"
        ? "Unlimited+"
        : entitlements.plan === "FOUNDER"
          ? "Founder Active"
          : "Free Trial";

  return (
    <div className="flex min-h-[calc(100dvh-3rem)] md:min-h-dvh flex-col bg-slate-100 font-sans text-slate-900 selection:bg-indigo-100">
      {/* =====================================================================
          1. GLOBAL APP HEADER BANNER (Compact on mobile)
          ===================================================================== */}
      <header className="relative shrink-0 overflow-hidden animate-bg pt-4 pb-14 text-white shadow-lg sm:pt-6 sm:pb-20">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/15 to-slate-950/35 backdrop-blur-[2px]" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[850px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-5xl px-3.5 sm:px-6 lg:px-8">
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 sm:mb-4 sm:gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/40 px-3 py-1 sm:px-4 text-[11px] sm:text-xs font-black tracking-wide text-white uppercase shadow-sm backdrop-blur-md">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Account</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <div className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-slate-950/40 px-2.5 py-1 sm:px-3.5 text-[11px] sm:text-xs font-extrabold text-sky-200 shadow-sm backdrop-blur-md">
                <Globe2 className="h-3.5 w-3.5 text-cyan-300" />
                <span>
                  {targetLangCode} • {nativeLangCode}
                </span>
              </div>

              <div className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-slate-950/40 px-2.5 py-1 sm:px-3.5 text-[11px] sm:text-xs font-black text-amber-300 shadow-sm backdrop-blur-md">
                <Crown className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span>{planBadge}</span>
              </div>
            </div>
          </div>

          <div className="max-w-3xl">
            <h1 className="flex items-center gap-2.5 text-xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.22)] sm:text-3xl md:text-4xl">
              <span>Account Settings</span>
              <Cog className="h-6 w-6 text-white/90 sm:h-9 sm:w-9" />
            </h1>
            <p className="mt-1 text-xs font-medium text-white/90 drop-shadow-[0_1px_4px_rgba(15,23,42,0.18)] sm:text-base">
              Manage your profile identity, AI companion, level, privacy
              controls, and subscription.
            </p>
          </div>
        </div>
      </header>

      {/* =====================================================================
          2. CENTERED STAGE OVERLAPPING HEADER
          ===================================================================== */}
      <main className="relative z-20 mx-auto -mt-8 sm:-mt-12 w-full max-w-5xl flex-1 px-3 sm:px-6 pb-16 lg:px-8">
        <AccountTabs
          generalContent={
            <div className="space-y-5 sm:space-y-6">
              <GeneralSettings
                initialImageUrl={
                  userDetails.avatarUrl
                    ? userDetails.avatarUrl
                    : userDetails.image
                }
                initialSettings={userDetails}
                initialLevelBand={initialLevelBand}
                sprites={sprites}
                userId={user.id}
              />
              <DangerZone userId={user.id} />
            </div>
          }
          sharingContent={
            <SharingSettingsForm
              initialSettings={userDetails.AccountSettings}
              userId={user.id}
            />
          }
          notificationsContent={
            <NotificationSettingsForm
              initialSettings={userDetails.AccountSettings}
              userId={user.id}
            />
          }
          billingContent={
            <BillingForm
              billingInfo={userDetails.BillingInformation}
              userId={user.id}
            />
          }
        />
      </main>
    </div>
  );
}