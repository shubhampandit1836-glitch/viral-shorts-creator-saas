import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { syncUserFromStripe } from "@/lib/stripe-subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Fallback sync after checkout redirect when webhook is delayed or misconfigured */
export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const db = getAdminDb();
    const result = await syncUserFromStripe(db, userId, email);

    if (!result) {
      return NextResponse.json({ error: "No Stripe customer found for user" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[stripe/sync]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
