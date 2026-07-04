"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, LayoutDashboard, Settings, CreditCard, User, LogOut, Receipt, Sparkles } from "lucide-react";
import { cn, getPlan } from "@acf/utils";
import { useAuth } from "@/lib/auth-context";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/videos", label: "Videos", icon: Film },
  { href: "/billing", label: "Billing", icon: Receipt },
  { href: "/pricing", label: "Pricing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/profile", label: "Profile", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const plan = getPlan(user?.plan ?? "free");

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border/60 bg-sidebar">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-hover shadow-sm">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <span className="font-serif text-lg font-semibold tracking-tight">Clip Finder</span>
          <p className="text-[11px] text-muted-foreground">AI video studio</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-white text-foreground shadow-sm ring-1 ring-border/50"
                  : "text-muted-foreground hover:bg-white/50 hover:text-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4", active && "text-accent")} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-xl border border-border/60 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium capitalize text-muted-foreground">{plan.name} plan</span>
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
            {user?.credits ?? 0} cr
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-accent-hover transition-all"
            style={{ width: `${Math.min(100, ((user?.credits ?? 0) / plan.monthlyCredits) * 100)}%` }}
          />
        </div>
        <button
          onClick={() => logout()}
          className="mt-4 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
