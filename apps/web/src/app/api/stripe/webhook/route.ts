import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import type { UserPlan } from "@acf/types";
import { getStripe, planFromPriceId, applySubscriptionToUser, syncUserFromStripe } from "@/lib/stripe-subscription";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveUserId(
  db: FirebaseFirestore.Firestore,
  opts: { userId?: string; customerId?: string; email?: string }
): Promise<string | null> {
  if (opts.userId) return opts.userId;
  if (opts.customerId) {
    const q = await db.collection("users").where("stripeCustomerId", "==", opts.customerId).limit(1).get();
    if (!q.empty) return q.docs[0].id;
  }
  if (opts.email) {
    const q = await db.collection("users").where("email", "==", opts.email).limit(1).get();
    if (!q.empty) return q.docs[0].id;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    console.error("[stripe/webhook] Missing signature or STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error("[stripe/webhook] Signature verification failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid signature" },
      { status: 400 }
    );
  }

  const db = getAdminDb();
  console.log("[stripe/webhook] Received event:", event.type, event.id);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = await resolveUserId(db, {
          userId: session.metadata?.userId,
          customerId: session.customer as string | undefined,
          email: session.customer_details?.email ?? session.customer_email ?? undefined,
        });
        const planId = (session.metadata?.planId as UserPlan | undefined) ?? "starter";

        if (userId) {
          await applySubscriptionToUser(db, userId, planId, {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
          });
          console.log("[stripe/webhook] checkout.session.completed → user", userId, planId);
        } else {
          console.warn("[stripe/webhook] checkout.session.completed: no userId found");
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await resolveUserId(db, {
          userId: sub.metadata?.userId,
          customerId: sub.customer as string,
        });
        if (userId && sub.status === "active") {
          const priceId = sub.items.data[0]?.price?.id;
          const planId = planFromPriceId(priceId);
          await applySubscriptionToUser(db, userId, planId, {
            stripeCustomerId: sub.customer as string,
            stripeSubscriptionId: sub.id,
          });
          console.log("[stripe/webhook]", event.type, "→ user", userId, planId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await resolveUserId(db, {
          userId: sub.metadata?.userId,
          customerId: sub.customer as string,
        });
        if (userId) {
          await applySubscriptionToUser(db, userId, "free", {
            stripeCustomerId: sub.customer as string,
            stripeSubscriptionId: null,
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.billing_reason === "subscription_create" && invoice.customer) {
          const userId = await resolveUserId(db, {
            customerId: invoice.customer as string,
            email: invoice.customer_email ?? undefined,
          });
          if (userId) {
            await syncUserFromStripe(db, userId);
          }
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("[stripe/webhook] Handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// Stripe CLI health check
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "/api/stripe/webhook" });
}
