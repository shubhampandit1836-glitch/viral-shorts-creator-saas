"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@acf/ui";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <AppShell title="Profile">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs text-[#6B6B6B]">Name</label>
            <p className="font-medium">{user?.name}</p>
          </div>
          <div>
            <label className="text-xs text-[#6B6B6B]">Email</label>
            <p className="font-medium">{user?.email}</p>
          </div>
          <div>
            <label className="text-xs text-[#6B6B6B]">Plan</label>
            <p className="font-medium capitalize">{user?.plan}</p>
          </div>
          <div>
            <label className="text-xs text-[#6B6B6B]">Credits remaining</label>
            <p className="font-medium">{user?.credits}</p>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
