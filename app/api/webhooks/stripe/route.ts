// app/api/webhooks/stripe/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { Billing, BillingInterval, PaymentStatus } from "@prisma/client";
import { notifyNewSub } from "@/lib/telegram";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

function getBillingPlan(
  priceId?: string,
  metadataPlanId?: string | null,
  isAnnual = false,
): Billing {
  const founderPrices = [
    process.env.STRIPE_FOUNDER_MONTHLY_PRICE_ID,
    process.env.STRIPE_FOUNDER_PRICE_ID,
    process.env.STRIPE_FOUNDER_YEARLY_PRICE_ID,
  ].filter(Boolean);

  const unlimitedPrices = [
    process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    process.env.STRIPE_UNLIMITED_PRICE_ID,
    process.env.STRIPE_UNLIMITED_YEARLY_PRICE_ID,
  ].filter(Boolean);

  if (priceId && founderPrices.includes(priceId)) {
    return isAnnual ? Billing.FOUNDER_ANNUALLY : Billing.FOUNDER_MONTHLY;
  }
  if (priceId && unlimitedPrices.includes(priceId)) {
    return isAnnual ? Billing.PRO_ANNUALLY : Billing.PRO_MONTHLY;
  }

  // Fallback to checkout metadata ("founder" | "unlimited")
  const meta = (metadataPlanId || "").toLowerCase();
  if (meta === "founder") {
    return isAnnual ? Billing.FOUNDER_ANNUALLY : Billing.FOUNDER_MONTHLY;
  }
  if (meta === "unlimited" || meta === "pro") {
    return isAnnual ? Billing.PRO_ANNUALLY : Billing.PRO_MONTHLY;
  }

  return Billing.FREE;
}

function formatPlanLabel(plan: Billing): string {
  switch (plan) {
    case Billing.FOUNDER_MONTHLY:
      return "Beta Founder (Monthly)";
    case Billing.FOUNDER_ANNUALLY:
      return "Beta Founder (Annual)";
    case Billing.PRO_MONTHLY:
      return "Unlimited+ (Monthly)";
    case Billing.PRO_ANNUALLY:
      return "Unlimited+ (Annual)";
    default:
      return String(plan);
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new NextResponse("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (error) {
    console.error("[STRIPE_WEBHOOK_VERIFY_ERROR]", error);
    return new NextResponse("Invalid webhook signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const email = session.customer_details?.email;
        const name =
          session.customer_details?.name ||
          email?.split("@")[0] ||
          "New Customer";

        if (!email) {
          console.error(
            "[STRIPE_WEBHOOK] No customer email in session",
            session.id,
          );
          return new NextResponse("Customer email missing", { status: 400 });
        }

        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        let interval: BillingInterval = BillingInterval.MONTHLY;
        let nextBillingDate: Date | null = null;
        let cancelAtPeriodEnd = false;
        let currentPlan: Billing = getBillingPlan(
          undefined,
          session.metadata?.planId,
          session.metadata?.interval === "annual",
        );

        if (subscriptionId) {
          const subscription =
            await stripe.subscriptions.retrieve(subscriptionId);
          const subItem = subscription.items.data[0];

          const currentPeriodEnd =
            (subscription as any).current_period_end ??
            (subItem as any)?.current_period_end;

          if (currentPeriodEnd) {
            nextBillingDate = new Date(currentPeriodEnd * 1000);
          }

          const isAnnual = subItem?.price.recurring?.interval === "year";
          interval = isAnnual
            ? BillingInterval.ANNUALLY
            : BillingInterval.MONTHLY;

          cancelAtPeriodEnd = subscription.cancel_at_period_end;
          currentPlan = getBillingPlan(
            subItem?.price.id,
            subscription.metadata?.planId ?? session.metadata?.planId,
            isAnnual,
          );
        }

        const user = await prisma.user.upsert({
          where: { email },
          update: {},
          create: {
            email,
            name,
            emailVerified: false,
          },
        });

        await prisma.billingInformation.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            currentPlan,
            billingInterval: interval,
            isActive: true,
            cancelAtPeriodEnd,
            paymentStatus: PaymentStatus.PAID,
            nextBillingDate,
            lastPaymentDate: new Date(),
          },
          update: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            currentPlan,
            billingInterval: interval,
            isActive: true,
            cancelAtPeriodEnd,
            paymentStatus: PaymentStatus.PAID,
            nextBillingDate,
            lastPaymentDate: new Date(),
          },
        });

        await notifyNewSub(formatPlanLabel(currentPlan));
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const subItem = subscription.items.data[0];

        const currentPeriodEnd =
          (subscription as any).current_period_end ??
          (subItem as any)?.current_period_end;

        const nextBillingDate = currentPeriodEnd
          ? new Date(currentPeriodEnd * 1000)
          : null;

        const isActive =
          subscription.status === "active" ||
          subscription.status === "trialing";

        const isAnnual = subItem?.price.recurring?.interval === "year";
        const currentPlan = isActive
          ? getBillingPlan(
              subItem?.price.id,
              subscription.metadata?.planId,
              isAnnual,
            )
          : Billing.FREE;

        const billingInfo = await prisma.billingInformation.findFirst({
          where: {
            OR: [
              { stripeSubscriptionId: subscription.id },
              { stripeCustomerId: subscription.customer as string },
            ],
          },
        });

        if (billingInfo) {
          await prisma.billingInformation.update({
            where: { id: billingInfo.id },
            data: {
              isActive,
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              currentPlan,
              billingInterval: isAnnual
                ? BillingInterval.ANNUALLY
                : BillingInterval.MONTHLY,
              nextBillingDate,
              paymentStatus: isActive
                ? PaymentStatus.PAID
                : PaymentStatus.UNPAID,
            },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const billingInfo = await prisma.billingInformation.findFirst({
          where: {
            OR: [
              { stripeSubscriptionId: subscription.id },
              { stripeCustomerId: subscription.customer as string },
            ],
          },
        });

        if (billingInfo) {
          await prisma.billingInformation.update({
            where: { id: billingInfo.id },
            data: {
              isActive: false,
              currentPlan: Billing.FREE,
              stripeSubscriptionId: null,
              cancelAtPeriodEnd: false,
              paymentStatus: PaymentStatus.CANCELED,
            },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const billingInfo = await prisma.billingInformation.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (billingInfo) {
          await prisma.billingInformation.update({
            where: { id: billingInfo.id },
            data: {
              paymentStatus: PaymentStatus.PAST_DUE,
            },
          });
        }
        break;
      }

      default:
        console.log(`[STRIPE_WEBHOOK] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[STRIPE_WEBHOOK_HANDLER_ERROR]", error);
    return new NextResponse("Webhook handler failed", { status: 500 });
  }
}