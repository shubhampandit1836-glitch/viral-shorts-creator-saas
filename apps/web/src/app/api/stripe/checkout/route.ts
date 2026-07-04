import { NextRequest, NextResponse } from "next/server";
import { getStripe, PLAN_PRICE_IDS } from "@/lib/stripe-subscription";
import { getAdminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { planId, userId, email } = await req.json();
    const priceId = PLAN_PRICE_IDS[planId];
    if (!priceId || !userId || !email) {
      return NextResponse.json({ error: "Invalid plan or user" }, { status: 400 });
    }

    const stripe = getStripe();
    const db = getAdminDb();
    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();
    const userData = userSnap.data();

    let customerId = userData?.stripeCustomerId as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({ email, metadata: { userId } });
      customerId = customer.id;
      await userRef.set({ stripeCustomerId: customerId }, { merge: true });
    }

    const origin = req.headers.get("origin") ?? "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/billing?success=1`,
      cancel_url: `${origin}/billing?canceled=1`,
      metadata: { userId, planId },
      subscription_data: {
        metadata: { userId, planId },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
