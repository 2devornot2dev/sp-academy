// @/components/account/billing-form.tsx
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import type { UserDetails } from "@/lib/actions";
import Link from "next/link";

interface BillingFormProps {
  billingInfo: UserDetails["BillingInformation"];
  userId: string;
}

export function BillingForm({ billingInfo }: BillingFormProps) {
  const currentPlan = billingInfo?.currentPlan || "FREE";
  const interval = billingInfo?.billingInterval || "MONTHLY";
  const paymentStatus = billingInfo?.paymentStatus || "UNPAID";
  const isActive = billingInfo?.isActive ?? true;
  const nextBillingDate = billingInfo?.nextBillingDate
    ? new Date(billingInfo.nextBillingDate).toLocaleDateString()
    : null;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-blue-600" />
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Subscription & Billing
            </h2>
            <p className="text-xs text-slate-500">
              Manage your subscription tier, billing cycle, and payment status.
            </p>
          </div>
        </div>

        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          {currentPlan} PLAN
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
          <p className="text-xs text-slate-500">Billing Interval</p>
          <p className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100">
            {interval}
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
          <p className="text-xs text-slate-500">Payment Status</p>
          <div className="mt-1 flex items-center gap-1.5">
            {isActive ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-500" />
            )}
            <span className="text-base font-bold text-slate-900 dark:text-slate-100">
              {paymentStatus}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
          <p className="text-xs text-slate-500">Next Billing Date</p>
          <div className="mt-1 flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="text-base font-bold text-slate-900 dark:text-slate-100">
              {nextBillingDate || "N/A (Free Tier)"}
            </span>
          </div>
        </div>
      </div>

      {billingInfo?.cancelAtPeriodEnd && (
        <p className="mt-4 text-xs text-amber-600 dark:text-amber-400">
          Your subscription is scheduled to cancel at the end of the current
          billing period.
        </p>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" render={<Link href="/pricing" />}>
          Change Plan
        </Button>
      </div>
    </div>
  );
}
