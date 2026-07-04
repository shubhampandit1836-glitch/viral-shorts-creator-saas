import Stripe from "stripe";
import type { UserPlan } from "@acf/types";

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
}

export const PLAN_PRICE_IDS: Record<string, string | undefined> = {
  starter: process.env.STARTER_STRIPE_PRICE_ID,
  pro: process.env.PRO_STRIPE_PRICE_ID,
  premium: process.env.PREMIUM_STRIPE_PRICE_ID,
};

export const PLAN_CREDITS: Record<string, number> = {
  free: 50,
  starter: 150,
  pro: 400,
  premium: 1000,
};

/** Map Stripe price IDs back to internal plan ids */
export function planFromPriceId(priceId: string | undefined): UserPlan {
  if (!priceId) return "free";
  for (const [planId, id] of Object.entries(PLAN_PRICE_IDS)) {
    if (id === priceId) return planId as UserPlan;
  }
  return "starter";
}

export async function applySubscriptionToUser(
  db: FirebaseFirestore.Firestore,
  userId: string,
  planId: UserPlan,
  extras: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string | Stripe.Subscription | null;
  } = {}
) {
  const subscriptionId =
    typeof extras.stripeSubscriptionId === "string"
      ? extras.stripeSubscriptionId
      : extras.stripeSubscriptionId?.id ?? null;

  await db.collection("users").doc(userId).set(
    {
      plan: planId,
      credits: PLAN_CREDITS[planId] ?? 50,
      ...(extras.stripeCustomerId ? { stripeCustomerId: extras.stripeCustomerId } : {}),
      ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function syncUserFromStripe(
  db: FirebaseFirestore.Firestore,
  userId: string,
  email?: string
): Promise<{ planId: UserPlan; credits: number } | null> {
  const userSnap = await db.collection("users").doc(userId).get();
  const userData = userSnap.data();
  let customerId = userData?.stripeCustomerId as string | undefined;

  const stripe = getStripe();

  if (!customerId && email) {
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      await db.collection("users").doc(userId).set({ stripeCustomerId: customerId }, { merge: true });
    }
  }

  if (!customerId) return null;
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "active",
    limit: 1,
    expand: ["data.items.data.price"],
  });

  if (subs.data.length === 0) {
    await db.collection("users").doc(userId).set(
      { plan: "free", credits: PLAN_CREDITS.free, stripeSubscriptionId: null },
      { merge: true }
    );
    return { planId: "free", credits: PLAN_CREDITS.free };
  }

  const sub = subs.data[0];
  const priceId = sub.items.data[0]?.price?.id;
  const planId = planFromPriceId(priceId);

  await applySubscriptionToUser(db, userId, planId, {
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
  });

  return { planId, credits: PLAN_CREDITS[planId] };
}
