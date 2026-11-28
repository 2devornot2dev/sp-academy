// app/api/stripe/portal/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

    if (!secretKey) {
      return NextResponse.json(
        { error: "Missing STRIPE_SECRET_KEY" },
        { status: 500 },
      );
    }

    const billing = await prisma.billingInformation.findUnique({
      where: { userId: user.id },
      select: { stripeCustomerId: true },
    });

    if (!billing?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No active Stripe customer found" },
        { status: 400 },
      );
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: "2025-02-24.acacia",
    });

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      req.headers.get("origin") ||
      "https://spoonacademy.com";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: billing.stripeCustomerId,
      return_url: `${origin.replace(/\/+$/, "")}/account`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error: any) {
    console.error("[STRIPE_PORTAL_ERROR]", error);
    return NextResponse.json(
      { error: error?.message || "Could not open billing portal" },
      { status: 500 },
    );
  }
}