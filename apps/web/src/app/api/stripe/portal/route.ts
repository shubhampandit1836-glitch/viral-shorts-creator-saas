import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe-subscription";
import { getAdminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const db = getAdminDb();
    const userSnap = await db.collection("users").doc(userId).get();
    const customerId = userSnap.data()?.stripeCustomerId as string | undefined;
    if (!customerId) {
      return NextResponse.json({ error: "No billing account" }, { status: 400 });
    }

    const stripe = getStripe();
    const origin = req.headers.get("origin") ?? "http://localhost:3000";
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Portal failed" },
      { status: 500 }
    );
  }
}
