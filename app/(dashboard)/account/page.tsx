// app/account/page.tsx
import React from "react";
import { getUserDetailsById, type UserDetails } from "@/lib/actions";
import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { getPresignedImageUrl } from "@/lib/aws/services/s3-presigned-url";
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

  const [userDetails, rawSprites]: [UserDetails, any[]] = await Promise.all([
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
  ]);

  const sprites = await Promise.all(
    rawSprites.map(async (s) => ({
      ...s,
      avatarUrl: await safePresign(s.avatarUrl),
    })),
  );

  const isPro = Boolean(userDetails.BillingInformation?.isActive);

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 font-sans text-slate-900 selection:bg-indigo-100">
      {/* =====================================================================
          1. GLOBAL APP HEADER BANNER
          ===================================================================== */}
      <header className="relative shrink-0 overflow-hidden animate-bg pt-6 pb-20 text-white shadow-lg">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/15 to-slate-950/35 backdrop-blur-[2px]" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[850px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-5xl px-6 lg:px-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-slate-950/40 px-4 py-1 text-xs font-black tracking-wide text-white uppercase shadow-sm backdrop-blur-md">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Account &amp; Preferences</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/40 px-3.5 py-1 text-xs font-extrabold text-sky-200 shadow-sm backdrop-blur-md">
                <Globe2 className="h-3.5 w-3.5 text-cyan-300" />
                <span>
                  {userDetails.targetLanguage || "fr-FR"} •{" "}
                  {userDetails.nativeLanguage || "en-US"}
                </span>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/40 px-3.5 py-1 text-xs font-black text-amber-300 shadow-sm backdrop-blur-md">
                <Crown className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span>{isPro ? "Spoon Pro Active" : "Free Tier"}</span>
              </div>
            </div>
          </div>

          <div className="max-w-3xl">
            <h1 className="flex items-center gap-3 text-2xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.22)] sm:text-3xl md:text-4xl">
              <span>Account Settings</span>
              <Cog className="h-7 w-7 text-white/90 sm:h-9 sm:w-9" />
            </h1>
            <p className="mt-1 text-sm font-medium text-white/90 drop-shadow-[0_1px_4px_rgba(15,23,42,0.18)] sm:text-base">
              Manage your profile identity, AI companion preferences, privacy
              controls, and subscription.
            </p>
          </div>
        </div>
      </header>

      {/* =====================================================================
          2. CENTERED STAGE OVERLAPPING HEADER (-mt-12, max-w-5xl)
          ===================================================================== */}
      <main className="relative z-20 mx-auto -mt-12 w-full max-w-5xl flex-1 px-6 pb-20 lg:px-8">
        <AccountTabs
          generalContent={
            <div className="space-y-6">
              <GeneralSettings
                initialImageUrl={
                  userDetails.avatarUrl
                    ? userDetails.avatarUrl
                    : userDetails.image
                }
                initialSettings={userDetails}
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