"use client";

import { useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@acf/ui";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { PLANS, getPlan, CREDIT_TIERS } from "@acf/utils";
import Link from "next/link";

export default function PricingPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const startCheckout = async (planId: string) => {
    if (!user) {
      window.location.href = "/signup";
      return;
    }
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

  return (
    <AppShell title="Pricing">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold">Simple credit-based pricing</h2>
        <p className="mt-2 text-[#6B6B6B]">
          Starter $9 · Pro $19 · Premium $29 — pay only for what you process.
        </p>
      </div>

      <div className="mb-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => (
          <Card key={plan.id} className={plan.id === "pro" ? "border-[#D97757]" : ""}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <p className="text-3xl font-semibold">
                {plan.priceLabel}
                {plan.price > 0 && <span className="text-sm font-normal text-[#6B6B6B]">/mo</span>}
              </p>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-[#6B6B6B]">{plan.monthlyCredits} credits/month</p>
              <ul className="mb-6 space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="text-[#6B6B6B]">• {f}</li>
                ))}
              </ul>
              {plan.id === "free" ? (
                <Link href="/dashboard">
                  <Button variant="outline" className="w-full">Current tier</Button>
                </Link>
              ) : user?.plan === plan.id ? (
                <Link href="/billing">
                  <Button variant="outline" className="w-full">Manage in billing</Button>
                </Link>
              ) : (
                <Button
                  variant={plan.id === "pro" ? "accent" : "outline"}
                  className="w-full"
                  disabled={loading === plan.id}
                  onClick={() => startCheckout(plan.id)}
                >
                  {loading === plan.id ? "Redirecting…" : `Subscribe ${plan.priceLabel}`}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Credit usage per video</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8E6E1]">
                <th className="py-2 text-left font-medium text-[#6B6B6B]">Duration</th>
                <th className="py-2 text-left font-medium text-[#6B6B6B]">Credits</th>
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
    </AppShell>
  );
}
