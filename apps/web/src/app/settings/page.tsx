"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@acf/ui";
import { AppShell } from "@/components/app-shell";

export default function SettingsPage() {
  return (
    <AppShell title="Settings">
      <div className="max-w-lg space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {["Email when processing completes", "Weekly digest of top clips", "Credit low warnings"].map(
              (label) => (
                <label key={label} className="flex items-center gap-3 text-sm">
                  <input type="checkbox" defaultChecked className="rounded border-[#E8E6E1]" />
                  {label}
                </label>
              )
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Export preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[#6B6B6B]">
            <p>Default clip format: 1080×1920 (Shorts)</p>
            <p>Caption format: SRT</p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
