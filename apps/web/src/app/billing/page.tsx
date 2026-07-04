"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { CreditCard, Zap, CheckCircle } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Progress } from "@acf/ui";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { getFirebaseDb } from "@/lib/firebase";
import { PLANS, getPlan, CREDIT_TIERS } from "@acf/utils";
import type { Video } from "@acf/types";

function BillingContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);

  const plan = getPlan(user?.plan ?? "free");
  const creditsUsed = videos.reduce((sum, v) => sum + (v.creditsUsed ?? 0), 0);
  const usagePct = plan.monthlyCredits
    ? Math.min(100, Math.round((creditsUsed / plan.monthlyCredits) * 100))
    : 0;

  useEffect(() => {
    if (!user) return;
    const q = query(collection(getFirebaseDb(), "videos"), where("userId", "==", user.uid));
    return onSnapshot(q, (snap) => {
      setVideos(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Video));
    });
  }, [user]);

  useEffect(() => {
    if (!user || !searchParams.get("success") || syncDone) return;
    setSyncing(true);
    fetch("/api/stripe/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.uid, email: user.email }),
    })
      .then((r) => r.json())
      .then(() => setSyncDone(true))
      .catch(() => {})
      .finally(() => setSyncing(false));
  }, [user, searchParams, syncDone]);

  const syncSubscription = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/stripe/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, email: user.email }),
      });
      const data = await res.json();
      if (!res.ok) alert(data.error ?? "Could not sync subscription");
    } finally {
      setSyncing(false);
    }
  };

  const startCheckout = async (planId: string) => {
    if (!user) return;
    setLoading(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, userId: user.uid, email: user.email }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error ?? "Checkout failed");
    } finally {
      setLoading(null);
    }
  };

  const openPortal = async () => {
    if (!user) return;
    setLoading("portal");
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error ?? "Could not open billing portal");
    } finally {
      setLoading(null);
    }
  };

  return (
    <AppShell title="Billing">
      <div className="space-y-6">
        {user?.stripeCustomerId && user.plan === "free" && !searchParams.get("success") && (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span>Paid for a plan but still seeing Free? Sync from Stripe.</span>
            <Button variant="outline" size="sm" disabled={syncing} onClick={syncSubscription}>
              {syncing ? "Syncing…" : "Sync subscription"}
            </Button>
          </div>
        )}

        {searchParams.get("success") && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle className="h-4 w-4" />
            {syncing ? "Syncing your subscription…" : "Subscription updated successfully."}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#6B6B6B]">Current plan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold capitalize">{plan.name}</p>
              <p className="text-sm text-[#6B6B6B]">{plan.priceLabel}/month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#6B6B6B]">Credits remaining</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{user?.credits ?? 0}</p>
              <p className="text-sm text-[#6B6B6B]">of {plan.monthlyCredits}/month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#6B6B6B]">Videos this month</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{videos.length}</p>
              <p className="text-sm text-[#6B6B6B]">
                {plan.maxVideosPerMonth ? `Limit: ${plan.maxVideosPerMonth}` : "Unlimited"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-[#D97757]" />
              Credit usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-2 flex justify-between text-sm">
              <span>{creditsUsed} credits used</span>
              <span>{usagePct}%</span>
            </div>
            <Progress value={usagePct} />
          </CardContent>
        </Card>

        <div>
          <h2 className="mb-4 text-lg font-semibold">Upgrade plan</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((p) => (
              <Card key={p.id} className={user?.plan === p.id ? "border-[#D97757]" : ""}>
                <CardHeader>
                  <CardTitle className="text-base">{p.name}</CardTitle>
                  <p className="text-2xl font-semibold">
                    {p.priceLabel}
                    {p.price > 0 && <span className="text-sm font-normal text-[#6B6B6B]">/mo</span>}
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-sm text-[#6B6B6B]">{p.monthlyCredits} credits/month</p>
                  <ul className="mb-4 space-y-1 text-xs text-[#6B6B6B]">
                    {p.features.slice(0, 3).map((f) => (
                      <li key={f}>• {f}</li>
                    ))}
                  </ul>
                  {p.id === "free" ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current free tier
                    </Button>
                  ) : user?.plan === p.id ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current plan
                    </Button>
                  ) : (
                    <Button
                      variant="accent"
                      className="w-full"
                      disabled={loading === p.id}
                      onClick={() => startCheckout(p.id)}
                    >
                      {loading === p.id ? "Redirecting…" : `Subscribe ${p.priceLabel}`}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {user?.stripeCustomerId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4" />
                Manage subscription
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-[#6B6B6B]">
                Update payment method, view invoices, or cancel your subscription.
              </p>
              <Button variant="outline" onClick={openPortal} disabled={loading === "portal"}>
                Open Stripe billing portal
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Credit usage per video length</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E8E6E1]">
                  <th className="py-2 text-left text-[#6B6B6B]">Duration</th>
                  <th className="py-2 text-left text-[#6B6B6B]">Credits</th>
                </tr>
              </thead>
              <tbody>
                {CREDIT_TIERS.map((tier) => (
                  <tr key={tier.maxMinutes} className="border-b border-[#E8E6E1]">
                    <td className="py-2">Up to {tier.maxMinutes} min</td>
                    <td className="py-2">{tier.credits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[#6B6B6B]">Loading billing…</div>}>
      <BillingContent />
    </Suspense>
  );
}
