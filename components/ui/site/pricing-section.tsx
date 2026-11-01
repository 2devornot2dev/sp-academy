"use client";

import { useState } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  Infinity as InfinityIcon,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { Reveal } from "@/components/ui/misc/reveal";
import { Button } from "@/components/ui/button";

import {
  PRICING_DATA as pricingData,
  type Plan,
  type PlanAccent,
  type BillingIntervalOption,
} from "./pricing-data";

const PLANS = pricingData.plans;

const PLAN_ICONS: Record<string, LucideIcon> = {
  free: Zap,
  founder: Sparkles,
  unlimited: InfinityIcon,
  enterprise: Building2,
};

// Plans that get a solid, filled card with white text.
const SOLID_PLANS = ["founder", "unlimited"];

// Full class strings so Tailwind can detect them (no dynamic string building).
const ACCENTS: Record<
  PlanAccent,
  {
    text: string;
    chip: string;
    featured: string;
    focus: string;
    solid: string;
    solidButtonText: string;
  }
> = {
  primary: {
    text: "text-primary",
    chip: "bg-primary/15 text-primary",
    featured:
      "border-primary/40 shadow-[0_0_0_4px_hsl(var(--primary)/0.1),0_1px_2px_hsl(var(--foreground)/0.06),0_24px_60px_hsl(var(--foreground)/0.07)]",
    focus: "focus-visible:outline-primary",
    solid: "bg-primary border-primary shadow-2xl",
    solidButtonText: "text-primary",
  },
  secondary: {
    text: "text-secondary",
    chip: "bg-secondary/15 text-secondary",
    featured:
      "border-secondary/40 shadow-[0_0_0_4px_hsl(var(--secondary)/0.1),0_1px_2px_hsl(var(--foreground)/0.06),0_24px_60px_hsl(var(--foreground)/0.07)]",
    focus: "focus-visible:outline-secondary",
    solid: "bg-secondary border-secondary shadow-2xl",
    solidButtonText: "text-secondary",
  },
  tertiary: {
    text: "text-tertiary",
    chip: "bg-tertiary/15 text-tertiary",
    featured:
      "border-tertiary/40 shadow-[0_0_0_4px_hsl(var(--tertiary)/0.1),0_1px_2px_hsl(var(--foreground)/0.06),0_24px_60px_hsl(var(--foreground)/0.07)]",
    focus: "focus-visible:outline-tertiary",
    solid: "bg-tertiary border-tertiary shadow-2xl",
    solidButtonText: "text-tertiary",
  },
};

const CARD_BASE =
  "relative isolate flex w-full overflow-hidden rounded-[1.25rem] border p-6 md:p-9";
const CARD_DEFAULT =
  "border-border/75 shadow-[0_1px_1px_hsl(var(--foreground)/0.03),0_18px_50px_hsl(var(--foreground)/0.04)]";

const CTA_BASE =
  "h-[2.85rem] w-fit gap-2 rounded-full border px-5 font-semibold shadow-none transition-all duration-200 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-60 motion-reduce:transition-none";

export default function PricingSection() {
  const [billingInterval, setBillingInterval] =
    useState<BillingIntervalOption>("monthly");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAnnual = billingInterval === "annual";

  async function startCheckout(plan: Plan) {
    if (plan.id === "free") {
      window.location.href = plan.cta.href || "/onboarding";
      return;
    }

    setError(null);
    setLoadingId(plan.id);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          interval: billingInterval, // "monthly" | "annual"
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error("Checkout failed");
      }

      window.location.href = data.url;
    } catch {
      setError("We couldn't start checkout. Please try again.");
      setLoadingId(null);
    }
  }

  return (
    <section
      aria-labelledby="pricing-heading"
      className="relative isolate overflow-clip bg-background py-[clamp(4rem,7vh,5.5rem)]"
      id="pricing"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_12%_30%,hsl(var(--primary)/0.08),transparent_32rem),radial-gradient(circle_at_88%_30%,hsl(var(--tertiary)/0.08),transparent_30rem),linear-gradient(180deg,transparent,hsl(var(--muted)/0.22)_50%,transparent)]"
      />

      <div className="mx-auto w-full max-w-6xl px-4">
        <Reveal className="mx-auto max-w-[44rem] text-center" y={18}>
          <span className="inline-flex min-h-8 items-center rounded-full border border-border/80 bg-background/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-foreground/70 backdrop-blur-md">
            {pricingData.eyebrow}
          </span>

          <h2
            id="pricing-heading"
            className="mt-4 text-balance text-[clamp(2.15rem,4vw,3.65rem)] font-bold leading-[1.02] tracking-[-0.045em] text-foreground"
          >
            {pricingData.heading}{" "}
            <span className="text-foreground/55">
              {pricingData.headingAccent}
            </span>
          </h2>

          <p className="mx-auto mt-3.5 max-w-[37rem] text-balance text-[clamp(1rem,1.5vw,1.1rem)] leading-relaxed text-muted-foreground">
            {pricingData.intro}
          </p>

          {/* Monthly / Annual Billing Toggle */}
          <div className="mt-7 inline-flex items-center gap-1 rounded-full border border-border/80 bg-muted/50 p-1.5 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setBillingInterval("monthly")}
              className={`rounded-full px-5 py-2 text-sm font-bold transition-all ${
                !isAnnual
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingInterval("annual")}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition-all ${
                isAnnual
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Annual</span>
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-extrabold tracking-wide text-emerald-600 uppercase">
                2 Months Free
              </span>
            </button>
          </div>
        </Reveal>

        <div className="mx-auto mt-[clamp(2rem,4vh,3rem)] grid max-w-6xl grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
          {PLANS.map((plan, index) => {
            const Icon = PLAN_ICONS[plan.id] ?? Sparkles;
            const accent = ACCENTS[plan.accent];
            const isLoading = loadingId === plan.id;
            const isSolid = SOLID_PLANS.includes(plan.id);

            // Only founder and unlimited launch Stripe checkout
            const usesCheckout =
              plan.id === "founder" || plan.id === "unlimited";

            const displayPrice =
              isAnnual && plan.annualPrice ? plan.annualPrice : plan.price;
            const displayOriginalPrice =
              isAnnual && plan.annualPrice ? plan.price : plan.originalPrice;

            return (
              <Reveal
                key={plan.id}
                className="flex"
                delay={0.08 + index * 0.08}
                y={16}
              >
                <article
                  aria-labelledby={`plan-${plan.id}-name`}
                  className={`${CARD_BASE} ${
                    isSolid
                      ? accent.solid
                      : `bg-card/90 backdrop-blur-xl ${
                          plan.featured ? accent.featured : CARD_DEFAULT
                        }`
                  }`}
                >
                  <Icon
                    aria-hidden="true"
                    strokeWidth={1.15}
                    className={`pointer-events-none absolute -right-12 top-6 -z-10 size-44 -rotate-[7deg] md:-right-8 md:size-52 ${
                      isSolid
                        ? "text-white opacity-[0.15]"
                        : `${accent.text} opacity-[0.055]`
                    }`}
                  />

                  <div className="relative z-10 flex w-full flex-col">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-2.5 text-xs font-bold uppercase tracking-widest before:h-px before:w-7 before:bg-current before:content-[''] ${
                          isSolid ? "text-white" : accent.text
                        }`}
                      >
                        {plan.label}
                      </span>

                      {isAnnual &&
                        plan.annualSavingsLabel &&
                        plan.id !== "free" && (
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold tracking-wide uppercase ${
                              isSolid
                                ? "bg-white/20 text-white"
                                : "bg-emerald-500/15 text-emerald-600"
                            }`}
                          >
                            {plan.annualSavingsLabel}
                          </span>
                        )}
                    </div>

                    <h3
                      id={`plan-${plan.id}-name`}
                      className={`mt-3.5 text-balance text-[clamp(1.75rem,2.6vw,2.25rem)] font-bold leading-[1.03] tracking-[-0.04em] ${
                        isSolid ? "text-white" : "text-foreground"
                      }`}
                    >
                      {plan.name}
                    </h3>

                    {/* Crossed-out original price, on its own line above the real price */}
                    {displayOriginalPrice && (
                      <p
                        className={`mt-5 text-lg font-semibold line-through decoration-2 ${
                          isSolid ? "text-white/70" : "text-muted-foreground"
                        }`}
                      >
                        <span className="sr-only">Regular price </span>
                        {displayOriginalPrice}
                      </p>
                    )}

                    <div
                      className={`${
                        displayOriginalPrice ? "mt-1" : "mt-5"
                      } flex flex-wrap items-baseline gap-x-2 gap-y-1`}
                    >
                      <span
                        className={`text-[clamp(2.5rem,4.5vw,3.5rem)] font-bold leading-none tracking-[-0.05em] ${
                          isSolid ? "text-white" : "text-foreground"
                        }`}
                      >
                        {displayPrice}
                      </span>

                      {plan.period && (
                        <span
                          className={`text-base font-medium ${
                            isSolid
                              ? "text-white/80"
                              : "text-muted-foreground"
                          }`}
                        >
                          {plan.period}
                        </span>
                      )}
                    </div>

                    {/* Optional seat-limit pill, e.g. "First 100 founders only" */}
                    {plan.seatNote && (
                      <p
                        className={`mt-3 w-fit rounded-full px-3 py-1 text-xs font-bold ${
                          isSolid ? "bg-white/20 text-white" : accent.chip
                        }`}
                      >
                        {plan.seatNote}
                      </p>
                    )}

                    {isAnnual && plan.annualTotal && plan.id !== "free" && (
                      <p
                        className={`mt-1.5 text-xs font-semibold ${
                          isSolid ? "text-white/75" : "text-muted-foreground"
                        }`}
                      >
                        {plan.annualTotal}
                      </p>
                    )}

                    <p
                      className={`mt-4 text-[clamp(1rem,1.35vw,1.05rem)] leading-[1.7] ${
                        isSolid ? "text-white/90" : "text-muted-foreground"
                      }`}
                    >
                      {plan.description}
                    </p>

                    <ul
                      className={`mt-6 grid gap-3 border-t pt-6 ${
                        isSolid ? "border-white/20" : "border-border/80"
                      }`}
                    >
                      {plan.features.map((feature) => (
                        <li
                          key={feature}
                          className={`flex items-start gap-3 text-[0.95rem] font-medium leading-snug ${
                            isSolid ? "text-white/90" : "text-foreground/85"
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`mt-0.5 inline-grid size-5 flex-none place-items-center rounded-full ${
                              isSolid
                                ? "bg-white/20 text-white"
                                : accent.chip
                            }`}
                          >
                            <Check className="size-3" strokeWidth={3} />
                          </span>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-auto pt-8">
                      {usesCheckout ? (
                        <Button
                          type="button"
                          disabled={isLoading}
                          onClick={() => startCheckout(plan)}
                          className={
                            isSolid
                              ? `${CTA_BASE} border-white bg-white ${accent.solidButtonText} hover:bg-white/90 focus-visible:outline-white`
                              : `${CTA_BASE} border-purple-600 bg-purple-600 text-white hover:bg-purple-700 ${accent.focus}`
                          }
                        >
                          {isLoading ? "Redirecting…" : plan.cta.label}
                          {!isLoading && (
                            <ArrowRight className="size-4" aria-hidden="true" />
                          )}
                        </Button>
                      ) : (
                        <Button
                          nativeButton={false}
                          render={<Link href={plan.cta.href} />}
                          className={`${CTA_BASE} border-purple-600 bg-purple-600 text-white hover:bg-purple-700 ${accent.focus}`}
                        >
                          {plan.cta.label}
                          <ArrowRight className="size-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>

        {error && (
          <p role="alert" className="mt-5 text-center text-sm text-destructive">
            {error}
          </p>
        )}

        <p className="mx-auto mt-7 max-w-[37rem] text-balance text-center text-sm leading-relaxed text-muted-foreground">
          {pricingData.footnote}
        </p>
      </div>
    </section>
  );
}