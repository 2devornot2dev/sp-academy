// app/account/page.tsx
import React from "react";
import Link from "next/link";
import { getUserDetailsById, type UserDetails } from "@/lib/actions";
import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import {
  Cog,
  ShieldCheck,
  Sparkles,
  Globe2,
  Crown,
  Mail,
  ArrowUpRight,
} from "lucide-react";
import { AccountTabs } from "@/components/account/account-tabs";
import { BillingForm } from "@/components/account/billing-form";
import { SharingSettingsForm } from "@/components/account/sharing-settings-form";
import { NotificationSettingsForm } from "@/components/account/notifications-settings-form";
import { DangerZone } from "@/components/account/dange-zone";
import { GeneralSettings } from "@/components/account/general-settings";

export const dynamic = "force-dynamic";

export default async function AccountSettings() {
  const user = await requireUser();

  const [userDetails, sprites]: [UserDetails, any[]] = await Promise.all([
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

  const avatarSrc =
    userDetails.avatarUrl ||
    userDetails.image ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${userDetails.id}&backgroundColor=c0aede,b6e3f4`;

  const fullName =
    [userDetails.firstName, userDetails.lastName].filter(Boolean).join(" ") ||
    userDetails.displayUsername ||
    userDetails.username ||
    "Learner";

  const isPro = Boolean(userDetails.BillingInformation?.isActive);
  const spriteName = userDetails.spriteProfile?.sprite?.name || "Vox";
  const spriteAvatar =
    userDetails.spriteProfile?.sprite?.avatarUrl ||
    sprites.find((s) => s.slug === "vox")?.avatarUrl ||
    "/sprite-m.png";

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 font-sans text-slate-900 selection:bg-indigo-100">
      {/* =====================================================================
          1. GLOBAL APP HEADER BANNER
          ===================================================================== */}
      <header className="relative shrink-0 overflow-hidden animate-bg pt-6 pb-20 text-white shadow-lg">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/15 to-slate-950/35 backdrop-blur-[2px]" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[850px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
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
          2. MAIN 12-COLUMN STAGE OVERLAPPING HEADER (-mt-12)
          ===================================================================== */}
      <main className="relative z-20 mx-auto -mt-12 w-full max-w-7xl flex-1 px-6 pb-20 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-12">
          {/* LEFT COLUMN (4 Cols): 3D PLAYER IDENTITY & COMPANION CARD */}
          <div className="flex flex-col gap-6 lg:col-span-4">
            <div className="relative overflow-hidden rounded-3xl border-2 border-b-[6px] border-indigo-950/90 bg-gradient-to-br from-[#0F172A] via-[#131D36] to-[#1E1B4B] p-6 text-white shadow-xl">
              <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />

              <div className="relative z-10 flex items-center gap-4">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-b-4 border-sky-400 bg-slate-800 shadow-lg">
                  <img
                    src={avatarSrc}
                    alt={fullName}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-emerald-300 uppercase">
                    <Sparkles className="h-3 w-3 text-amber-300" />
                    {isPro ? "Pro Member" : "Explorer"}
                  </span>
                  <h2 className="mt-1.5 truncate text-xl font-black text-white">
                    {fullName}
                  </h2>
                  {(userDetails.displayUsername || userDetails.username) && (
                    <p className="truncate text-xs font-bold text-sky-300">
                      @{userDetails.displayUsername || userDetails.username}
                    </p>
                  )}
                </div>
              </div>

              <div className="relative z-10 mt-5 space-y-2.5 border-t border-white/10 pt-4 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="inline-flex items-center gap-1.5 font-bold text-slate-400">
                    <Mail className="h-3.5 w-3.5 text-sky-400" />
                    Email
                  </span>
                  <span className="max-w-[180px] truncate font-extrabold text-white">
                    {userDetails.email}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span className="inline-flex items-center gap-1.5 font-bold text-slate-400">
                    <Globe2 className="h-3.5 w-3.5 text-emerald-400" />
                    Target Track
                  </span>
                  <span className="font-extrabold text-white uppercase">
                    {userDetails.targetLanguage || "fr-FR"}
                  </span>
                </div>
              </div>

              {/* Active AI Sprite Companion Strip */}
              <div className="relative z-10 mt-5 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3.5">
                <div className="flex items-center gap-3">
                  <img
                    src={spriteAvatar}
                    alt={spriteName}
                    className="h-11 w-11 rounded-xl border border-sky-400/50 object-cover object-top"
                  />
                  <div>
                    <span className="block text-[10px] font-black tracking-wider text-sky-300 uppercase">
                      Active Sidekick
                    </span>
                    <span className="text-sm font-black text-white">
                      {spriteName}
                    </span>
                  </div>
                </div>

                <Link
                  href="/learning-hub"
                  className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-black text-white transition hover:bg-white/20"
                >
                  <span>Hub</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (8 Cols): CLEAN 3D TACTILE TABS */}
          <div className="lg:col-span-8">
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
          </div>
        </div>
      </main>
    </div>
  );
}