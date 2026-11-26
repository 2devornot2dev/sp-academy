//api/stripe/webhooks

import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

// What each plan unlocks. dailyLessons: null = unlimited.
const PLAN_ENTITLEMENTS: Record<string, { dailyLessons: number | null }> = {
  founder: { dailyLessons: 3 },
  unlimited: { dailyLessons: null },
};

export async function POST(req: Request) {
  // Stripe signs the RAW body, so read it as text, not JSON.
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[STRIPE_WEBHOOK_SIGNATURE_ERROR]", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const planId = session.metadata?.planId;

        await savePurchase({
          email: session.customer_details?.email ?? null,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          planId: planId ?? null,
          entitlements: planId ? PLAN_ENTITLEMENTS[planId] : undefined,
          status: "active",
        });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await updateSubscriptionStatus({
          stripeSubscriptionId: sub.id,
          planId: sub.metadata?.planId ?? null,
          status: sub.status, // active, past_due, canceled, etc.
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await updateSubscriptionStatus({
          stripeSubscriptionId: sub.id,
          planId: sub.metadata?.planId ?? null,
          status: "canceled",
        });
        break;
      }

      case "invoice.payment_failed": {
        // Optional: email the user / flag the account.
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("[STRIPE_WEBHOOK_HANDLER_ERROR]", event.type, err);
    // 500 tells Stripe to retry later.
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ---- Replace these with your real database calls ----

async function savePurchase(data: {
  email: string | null;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  planId: string | null;
  entitlements?: { dailyLessons: number | null };
  status: string;
}) {
  // Upsert on stripeSubscriptionId so retried events don't create duplicates.
  console.log("[TODO] savePurchase", data);
}

async function updateSubscriptionStatus(data: {
  stripeSubscriptionId: string;
  planId: string | null;
  status: string;
}) {
  console.log("[TODO] updateSubscriptionStatus", data);
}