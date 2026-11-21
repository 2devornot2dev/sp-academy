// components/billing/tier-gate.tsx
"use client";

import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";

export function UpgradeGateButton({
  locked,
  label = "Upgrade to Unlock",
  href = "/pricing",
  children,
}: {
  locked: boolean;
  label?: string;
  href?: string;
  children: React.ReactNode;
}) {
  if (!locked) return <>{children}</>;

  return (
    <Link
      href={href}
      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-amber-700 bg-gradient-to-b from-amber-300 to-orange-500 px-6 py-3.5 text-sm font-black text-slate-950 shadow-md transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-0"
    >
      <Lock className="h-4 w-4" />
      <span>{label}</span>
      <Sparkles className="h-4 w-4" />
    </Link>
  );
}