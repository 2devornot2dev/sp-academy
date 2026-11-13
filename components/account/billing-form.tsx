// components/account/billing-form.tsx
"use client";

import React from "react";
import Link from "next/link";
import {
  CreditCard,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Crown,
  Sparkles,
  ArrowUpRight,
  Check,
} from "lucide-react";
import type { UserDetails } from "@/lib/actions";

interface BillingFormProps {
  billingInfo: UserDetails["BillingInformation"];
  userId: string;
}

const PRO_PERKS = [
  "Unlimited Standard & Hard Mode Spoons",
  "5 Daily 3-Min Live AI Conversations",
  "Full AI Grammar, Vocab & Speech Reports",
  "All Milestone Boss Arenas & Storybooks",
];

export function BillingForm({ billingInfo }: BillingFormProps) {
  const currentPlan = billingInfo?.currentPlan || "FREE";
  const interval = billingInfo?.billingInterval || "MONTHLY";
  const paymentStatus = billingInfo?.paymentStatus || "FREE TIER";
  const isActive = Boolean(billingInfo?.isActive);
  const nextBillingDate = billingInfo?.nextBillingDate
    ? new Date(billingInfo.nextBillingDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-6">
      {/* Main Subscription Card */}
      <div className="rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-b-2 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-xs">
              <CreditCard className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Subscription &amp; Billing
              </h2>
              <p className="text-xs font-semibold text-slate-500">
                View your active plan, billing cycle, and membership status.
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-black tracking-wider uppercase ${
              isActive
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-slate-100 text-slate-600"
            }`}
          >
            <Crown className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
            <span>{currentPlan.replace(/_/g, " ")}</span>
          </span>
        </div>

        {/* 3 Tactile Telemetry Tiles */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-slate-50/70 p-4">
            <p className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
              Billing Cycle
            </p>
            <p className="mt-1.5 text-base font-black text-slate-900">
              {isActive ? interval : "Free Tier"}
            </p>
          </div>

          <div className="rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-slate-50/70 p-4">
            <p className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
              Payment Status
            </p>
            <div className="mt-1.5 flex items-center gap-1.5">
              {isActive ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
              <span className="text-base font-black text-slate-900">
                {paymentStatus}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-slate-50/70 p-4">
            <p className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
              Next Renewal
            </p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span
                suppressHydrationWarning
                className="text-base font-black text-slate-900"
              >
                {nextBillingDate || "No upcoming charge"}
              </span>
            </div>
          </div>
        </div>

        {billingInfo?.cancelAtPeriodEnd && (
          <div className="mt-4 rounded-2xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900">
            Your subscription is scheduled to cancel at the end of the current
            billing period.
          </div>
        )}

        {/* Included Perks Box */}
        <div className="mt-6 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/50 via-white to-sky-50/40 p-5">
          <span className="flex items-center gap-1.5 text-[10px] font-black tracking-widest text-indigo-600 uppercase">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Spoon Pro Membership Perks
          </span>
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {PRO_PERKS.map((perk) => (
              <div
                key={perk}
                className="flex items-center gap-2 text-xs font-bold text-slate-700"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check className="h-3 w-3 stroke-[3.5]" />
                </span>
                <span>{perk}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <span className="text-xs font-semibold text-slate-400">
            Need help with billing? Reach out anytime.
          </span>

          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-7 py-3.5 text-xs font-black text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0 sm:text-sm"
          >
            <span>{isActive ? "Manage or Change Plan" : "Upgrade to Pro"}</span>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}