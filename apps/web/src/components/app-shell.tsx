"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@acf/ui";
import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "./sidebar";
import { UploadModal } from "./upload-modal";

export function AppShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted/30">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-muted/20">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 bg-white/80 px-8 backdrop-blur-md">
          <div>
            <h1 className="font-serif text-xl font-semibold tracking-tight">{title}</h1>
            <p className="text-xs text-muted-foreground">Welcome back, {user.name?.split(" ")[0] ?? "creator"}</p>
          </div>
          <Button variant="accent" onClick={() => setUploadOpen(true)} className="gap-2 shadow-sm">
            <Upload className="h-4 w-4" />
            Upload Video
          </Button>
        </header>
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}
