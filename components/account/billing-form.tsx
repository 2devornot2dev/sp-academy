// components/account/billing-form.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CreditCard,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Crown,
  Sparkles,
  ArrowUpRight,
  Check,
  Loader2,
  ExternalLink,
} from "lucide-react";
import type { UserDetails } from "@/lib/actions";

interface BillingFormProps {
  billingInfo: UserDetails["BillingInformation"];
  userId: string;
}

const PRO_PERKS = [
  "45–180 Spoons & Video Vocab Bridges /mo",
  "5–15 Daily 3-Min Live AI Conversations",
  "Interactive Story Books & Vocab Ladders",
  "Private Skool Community & Personalized Graduations",
];

function formatPlanName(plan?: string | null, paymentStatus?: string | null) {
  if (paymentStatus === "TRIAL" || !plan || plan === "FREE") {
    return "FREE TRIAL";
  }
  if (plan === "FOUNDER_MONTHLY" || plan === "FOUNDER_ANNUALLY") {
    return "BETA FOUNDER";
  }
  if (plan === "PRO_MONTHLY" || plan === "PRO_ANNUALLY") {
    return "UNLIMITED+";
  }
  return plan.replace(/_/g, " ");
}

export function BillingForm({ billingInfo }: BillingFormProps) {
  const [openingPortal, setOpeningPortal] = useState(false);

  const currentPlan = billingInfo?.currentPlan || "FREE";
  const interval = billingInfo?.billingInterval || "MONTHLY";
  const paymentStatus = billingInfo?.paymentStatus || "TRIAL";

  const isPaid = Boolean(
    billingInfo?.isActive &&
      billingInfo?.paymentStatus === "PAID" &&
      currentPlan !== "FREE",
  );
  const hasStripeCustomer = Boolean(billingInfo?.stripeCustomerId);

  const nextBillingDate = billingInfo?.nextBillingDate
    ? new Date(billingInfo.nextBillingDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const handleOpenPortal = async () => {
    setOpeningPortal(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Could not open billing portal");
      }
      window.location.href = data.url;
    } catch (err: any) {
      toast.error(err?.message || "Could not open billing portal.");
      setOpeningPortal(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="rounded-3xl border-2 border-b-[6px] border-slate-200/90 border-b-slate-300 bg-white p-4 shadow-sm sm:p-8">
        <div className="mb-5 sm:mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 sm:pb-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl border-b-2 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-xs">
              <CreditCard className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Subscription &amp; Billing
              </h2>
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500">
                View your active plan, billing cycle, and manage invoices.
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] sm:text-xs font-black tracking-wider uppercase ${
              isPaid
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            <Crown className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
            <span>{formatPlanName(currentPlan, paymentStatus)}</span>
          </span>
        </div>

        {/* 3 Tactile Telemetry Tiles */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-slate-50/70 p-3.5 sm:p-4">
            <p className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
              Billing Cycle
            </p>
            <p className="mt-1 text-sm sm:text-base font-black text-slate-900">
              {isPaid ? interval : "Free Trial"}
            </p>
          </div>

          <div className="rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-slate-50/70 p-3.5 sm:p-4">
            <p className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
              Payment Status
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              {isPaid ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
              <span className="text-sm sm:text-base font-black text-slate-900">
                {paymentStatus}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-b-4 border-slate-200 border-b-slate-300 bg-slate-50/70 p-3.5 sm:p-4">
            <p className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
              Next Renewal
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span
                suppressHydrationWarning
                className="text-sm sm:text-base font-black text-slate-900"
              >
                {isPaid && nextBillingDate
                  ? nextBillingDate
                  : "No upcoming charge"}
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
        <div className="mt-5 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/50 via-white to-sky-50/40 p-4 sm:p-5">
          <span className="flex items-center gap-1.5 text-[10px] font-black tracking-widest text-indigo-600 uppercase">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Paid Membership Perks
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

        <div className="mt-5 flex flex-col items-stretch justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
          <span className="text-center text-xs font-semibold text-slate-400 sm:text-left">
            {isPaid
              ? "Update payment method, view invoices, or cancel anytime."
              : "Lock in $35 CAD/mo Beta Founder pricing before 100 spots fill."}
          </span>

          <div className="flex flex-col gap-2.5 sm:flex-row">
            {isPaid && hasStripeCustomer ? (
              <button
                type="button"
                disabled={openingPortal}
                onClick={handleOpenPortal}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-6 py-3.5 text-xs sm:text-sm font-black text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0 disabled:opacity-50"
              >
                {openingPortal ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Opening Portal...</span>
                  </>
                ) : (
                  <>
                    <span>Manage Billing &amp; Plan</span>
                    <ExternalLink className="h-4 w-4" />
                  </>
                )}
              </button>
            ) : (
              <Link
                href="/pricing"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-gradient-to-b from-sky-400 to-blue-600 px-7 py-3.5 text-xs sm:text-sm font-black text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0"
              >
                <span>Upgrade to Founder</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}