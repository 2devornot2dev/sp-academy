// app/api/stripe/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: Request) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
    if (!secretKey) {
      console.error("[STRIPE_CHECKOUT_ERROR] Missing STRIPE_SECRET_KEY");
      return NextResponse.json(
        { error: "Missing STRIPE_SECRET_KEY" },
        { status: 500 },
      );
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: "2025-02-24.acacia",
    });

    const PRICE_IDS: Record<
      string,
      { monthly: string | undefined; annual: string | undefined }
    > = {
      founder: {
        monthly: (
          process.env.STRIPE_FOUNDER_PRICE_ID ||
          process.env.STRIPE_FOUNDER_MONTHLY_PRICE_ID
        )?.trim(),
        annual: (
          process.env.STRIPE_FOUNDER_YEARLY_PRICE_ID ||
          process.env.STRIPE_FOUNDER_PRICE_ID ||
          process.env.STRIPE_FOUNDER_MONTHLY_PRICE_ID
        )?.trim(),
      },
      unlimited: {
        monthly: (
          process.env.STRIPE_UNLIMITED_PRICE_ID ||
          process.env.STRIPE_PRO_MONTHLY_PRICE_ID
        )?.trim(),
        annual: (
          process.env.STRIPE_UNLIMITED_YEARLY_PRICE_ID ||
          process.env.STRIPE_UNLIMITED_PRICE_ID ||
          process.env.STRIPE_PRO_MONTHLY_PRICE_ID
        )?.trim(),
      },
    };

    const { planId, interval = "monthly" } = await req.json();

    const planPrices = PRICE_IDS[planId];
    const resolvedInterval = interval === "annual" ? "annual" : "monthly";
    const price = planPrices?.[resolvedInterval];

    if (!price) {
      return NextResponse.json(
        { error: `Invalid or unconfigured plan: ${planId} (${resolvedInterval})` },
        { status: 400 },
      );
    }

    const reqOrigin = req.headers.get("origin");
    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      reqOrigin ||
      "https://spoonacademy.com"
    ).replace(/\/+$/, "");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      billing_address_collection: "auto",
      allow_promotion_codes: true,
      metadata: { planId, interval: resolvedInterval },
      subscription_data: { metadata: { planId, interval: resolvedInterval } },
      success_url: `${appUrl}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("[STRIPE_CHECKOUT_ERROR]", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}